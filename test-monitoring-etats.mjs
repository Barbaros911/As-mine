import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { classer, surveiller } from './.github/scripts/monitoring-production.mjs';
import incident from './.github/scripts/incident-production.cjs';
import { relancerErreurTechnique } from './.github/scripts/sonde-reservation.mjs';
for (const E of [ReferenceError, SyntaxError, RangeError, TypeError]) assert.throws(() => relancerErreurTechnique(new E('défaut du script')), E);
assert.doesNotThrow(() => relancerErreurTechnique(new TypeError('fetch failed')));
const base = 'https://elatransfer.com/';
const rapport = ok => ({ base, execution: 'courant', termine: true,
  controles: [{ ok, m: 'page contrôlée' }], echecs: ok ? [] : ['page contrôlée'] });
assert.equal(classer(0, rapport(true), 'courant', base), 'ok');
assert.equal(classer(1, rapport(false), 'courant', base), 'panne');
for (const [code, r] of [[1, null], [0, null], [1, {}], [1, {...rapport(false), termine: false}],
  [0, rapport(false)], [1, rapport(true)], [2, rapport(false)], [null, rapport(false)],
  [1, {...rapport(false), execution: 'ancien'}], [0, {...rapport(true), base: 'https://autre.test/'}],
  [0, {...rapport(true), controles: []}], [1, {...rapport(false), echecs: []}]]) {
  assert.equal(classer(code, r, 'courant', base), 'technique');
}
for (const [etats, attendu, nombre] of [
  [['ok'], 'ok', 1], [['technique'], 'technique', 1], [['panne','panne'], 'panne', 2],
  [['panne','ok'], 'ok', 2], [['panne','technique'], 'technique', 2],
]) {
  let appels = 0, pauses = [];
  const r = await surveiller({ executer: async () => ({ etat: etats[appels++] }), attendre: async ms => pauses.push(ms) });
  assert.equal(r.etat, attendu); assert.equal(appels, nombre);
  assert.deepEqual(pauses, nombre === 2 ? [60000] : []);
}
const dir = mkdtempSync(join(tmpdir(), 'ela-monitoring-'));
const original = {...process.env};
try {
  process.env.RUNNER_TEMP = dir;
  writeFileSync(join(dir, 'sortie.txt'), 'Résultat mesuré');
  for (const etat of ['ok', 'panne', 'technique', '', 'inconnu']) {
    for (const existant of [false, true]) {
      const appels = [], erreurs = [];
      process.env.ETAT = etat; process.env.ADRESSE = base;
      const issues = Object.fromEntries(['listForRepo','update','createComment','create'].map(k => [k, async p => {
        appels.push({ k, p }); return { data: { number: 458 } };
      }]));
      const github = { rest: { issues }, paginate: async () => existant ? [{number:457, body:'<!-- ela-monitoring-production -->'}] : [] };
      const context = { repo: { owner:'Barbaros911', repo:'As-mine' }, ref:'refs/heads/main', runId:1, serverUrl:'https://github.com', eventName:'schedule' };
      const core = { setFailed: m => erreurs.push(m), notice: () => {} };
      await incident({ github, context, core });
      if (!['ok','panne'].includes(etat)) {
        assert.equal(appels.length, 0, 'installation/contrôleur en panne : aucun incident modifié');
        assert.equal(erreurs.length, 1);
      } else if (etat === 'panne') {
        assert.deepEqual(appels.map(a=>a.k), [existant ? 'update' : 'create']);
        assert.equal(erreurs.length, 1);
        assert.match(appels[0].p.body, /Deux contrôles complets/);
        assert.equal(appels[0].p.state, undefined);
      } else {
        assert.deepEqual(appels.map(a=>a.k), existant ? ['createComment','update'] : []);
        if (existant) assert.equal(appels[1].p.state, 'closed');
        assert.equal(erreurs.length, 0);
      }
      // Une branche/une autre cible ne touche jamais à l'incident officiel.
      for (const preview of ['branche','adresse']) {
        appels.length = 0;
        if (preview === 'branche') context.ref = 'refs/heads/fix/test';
        else { context.ref = 'refs/heads/main'; process.env.ADRESSE = 'https://preview.test/'; }
        await incident({github,context,core});
        assert.equal(appels.length, 0);
      }
    }
  }
  // Exécuter le vrai lanceur : import cassé, rapport absent, puis succès complet.
  mkdirSync(join(dir, '.github/scripts'), {recursive:true});
  const controleur = join(dir, '.github/scripts/verifier-production.mjs');
  const lanceur = resolve('.github/scripts/monitoring-production.mjs');
  for (const [source, attendu, code] of [
    ["throw new Error('navigateur indisponible')", 'technique', 1],
    ['', 'technique', 1],
    ["import {writeFileSync} from 'node:fs'; writeFileSync(process.argv.find(a=>a.startsWith('--rapport=')).slice(10),JSON.stringify({base:process.argv[2],execution:process.env.ELA_MONITORING_EXECUTION,termine:true,controles:[{ok:true,m:'mesure'}],echecs:[]}));", 'ok', 0],
  ]) {
    writeFileSync(controleur, source);
    const sortie = join(dir, 'outputs'); writeFileSync(sortie,'');
    const r = spawnSync(process.execPath, [lanceur,base], {cwd:dir,encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:sortie,GITHUB_STEP_SUMMARY:join(dir,'summary')}});
    assert.equal(r.status, code, r.stderr);
    assert.match(readFileSync(sortie,'utf8'), new RegExp(`etat=${attendu}`));
    const bilan = JSON.parse(readFileSync(join(dir,'rapport.json')));
    assert.equal(bilan.etat, attendu);
    assert.equal(bilan.passages.length, 1);
    assert.ok(readFileSync(join(dir,'summary'),'utf8').includes('Passage 1'));
  }
} finally {
  process.env = original;
  rmSync(dir, {recursive:true,force:true});
}
console.log('=== Monitoring : trois états, relance, rapports, incidents uniques et isolation des aperçus — OK ===');
