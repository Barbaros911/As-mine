// L'orchestrateur ne déduit jamais une panne du seul code de sortie.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function classer(code, rapport, execution, base) {
  if (!rapport || rapport.termine !== true || rapport.execution !== execution || rapport.base !== base ||
      !Array.isArray(rapport.controles) || !rapport.controles.length || !Array.isArray(rapport.echecs) ||
      rapport.controles.some(c => typeof c.ok !== 'boolean' || typeof c.m !== 'string')) return 'technique';
  const echecs = rapport.controles.filter(c => !c.ok).map(c => c.m);
  if (JSON.stringify(echecs) !== JSON.stringify(rapport.echecs)) return 'technique';
  if (code === 0 && echecs.length === 0) return 'ok';
  if (code === 1 && echecs.length > 0) return 'panne';
  return 'technique';
}

export async function surveiller({ executer, attendre = ms => new Promise(r => setTimeout(r, ms)) }) {
  const passages = [await executer(1)];
  if (passages[0].etat === 'panne') {
    console.log('Premier contrôle complet en échec — nouvel essai dans 60 s.');
    await attendre(60000);
    passages.push(await executer(2));
  }
  return { etat: passages.at(-1).etat, passages };
}

async function main() {
  const base = new URL(process.argv[2] || 'https://elatransfer.com/').href.replace(/\/*$/, '/');
  const commit = process.argv[3] || '';
  const dossier = process.env.RUNNER_TEMP;
  const resultat = await surveiller({ executer: async numero => {
    const execution = randomUUID();
    const fichier = join(dossier, `rapport-${numero}.json`);
    const args = ['.github/scripts/verifier-production.mjs', base, `--rapport=${fichier}`];
    if (commit) args.push(`--commit=${commit}`, ...(numero === 1 ? ['--attendre=900'] : []));
    const r = spawnSync(process.execPath, args, {
      env: { ...process.env, ELA_MONITORING_EXECUTION: execution },
      encoding: 'utf8', timeout: (numero === 1 ? 22 : 6) * 60000, maxBuffer: 8 * 1024 * 1024,
    });
    const sortie = `${r.stdout || ''}${r.stderr || ''}${r.error ? '\n' + r.error.message : ''}`;
    writeFileSync(join(dossier, `sortie-${numero}.txt`), sortie);
    writeFileSync(join(dossier, 'sortie.txt'), sortie);
    console.log(sortie);
    let rapport;
    try { rapport = JSON.parse(readFileSync(fichier, 'utf8')); } catch { /* absent/illisible = technique */ }
    const etat = r.error || r.signal ? 'technique' : classer(r.status, rapport, execution, base);
    console.log(`Passage ${numero} : ${etat} (code ${r.status}, signal ${r.signal || 'aucun'})`);
    return { numero, etat, code: r.status, signal: r.signal, rapport: fichier,
      erreur: r.error?.message || (etat === 'technique' ? 'Rapport absent, incomplet ou incohérent : voir sortie du passage.' : null) };
  }});
  writeFileSync(join(dossier, 'rapport.json'), JSON.stringify({ base, ...resultat }, null, 2));
  appendFileSync(process.env.GITHUB_OUTPUT, `etat=${resultat.etat}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Contrôles exécutés\n\n${resultat.passages.map(p => `- Passage ${p.numero} : **${p.etat}**, code ${p.code}${p.erreur ? ' — ' + p.erreur : ''}`).join('\n')}\n\nRapports JSON et journaux de chaque passage dans les artefacts.\n`);
  if (resultat.etat !== 'ok') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('Échec technique du monitoring :', e); process.exitCode = 1; });
}
