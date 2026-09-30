/* =====================================================================
   TEST-ADMIN-ALERTES — une demande qui arrive doit se VOIR et s'ENTENDRE
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « une alerte sonore, visuelle, notification,
   tout ce qui est possible pour être alerté sur mon téléphone ».
   LE DÉFAUT D'ORIGINE : le bip créait un lecteur de son hors de tout geste,
   que les téléphones laissent muet. On éprouve, sur le site construit :
   · le bandeau « son coupé » tant qu'on n'a pas touché l'écran, et qu'un
     appui le débloque ;
   · une demande arrivée lance une ALARME qui se répète, vibre, fait
     clignoter le titre, et s'arrête quand on touche l'écriteau ;
   · la pastille de l'icône compte les demandes en attente ;
   · « Tester mes alertes » sonne et dit ce qui a marché.
   Lancer :  node test-admin-alertes.mjs
   ===================================================================== */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8124, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8124';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));


import { readFileSync } from 'node:fs';
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});
const course = (ref, nom) => ({ ref, statut:"attente", cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
    date:"2026-12-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
    passagers:"2 passagers", vol:"" },
  client:{ nom, telephone:"06 12 34 56 78" }, prix:{ total:70 } });

let sondes = 0, lectures = 0;
let serveurCourses = [course('ELA-26-09-0100','Jean Martin')];
const nav = await chromium.launch();
async function espace(chemin){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'}));
    window.__badges = [];
    navigator.setAppBadge = (n) => { window.__badges.push(n === undefined ? 'point' : n); return Promise.resolve(); };
    navigator.clearAppBadge = () => { window.__badges.push(0); return Promise.resolve(); };
    window.__vibre = 0; navigator.vibrate = () => { window.__vibre++; return true; };
    window.__notes = 0;
    const C = window.AudioContext;
    window.AudioContext = function(){ const c = new C(); const o = c.createOscillator.bind(c);
      c.createOscillator = () => { window.__notes++; return o(); }; return c; };
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      /* La sonde ne demande que la dernière référence : on lui répond comme
         le vrai serveur, UNE ligne, sinon elle lirait « undefined ». */
      if (u.includes('/rest/v1/courses?select=ref&')) { sondes++; return route.fulfill(J(serveurCourses.slice(0,1).map(b => ({ref:b.ref})))); }
      if (u.includes('/rest/v1/courses')) { lectures++; return route.fulfill(J(serveurCourses.map(bon => ({bon, statut:bon.statut})))); }
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });
  await p.goto(BASE + chemin);
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  return {ctx, p, erreurs};
}

try {
  const {ctx, p, erreurs} = await espace('/ela-admin/');
  await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:8000}).catch(() => {});
  check('sans aucun appui, le bandeau « son coupé » est affiché', await p.locator('#sonCoupe').isVisible());
  await p.locator('#sonCoupe').click();
  await p.waitForTimeout(300);
  check('un appui débloque le son et retire le bandeau', await p.locator('#sonCoupe').isHidden());
  const badges0 = await p.evaluate(() => window.__badges.slice());
  check('la pastille de l\'icône compte la demande en attente (1)', badges0.includes(1), JSON.stringify(badges0));

  const notes0 = await p.evaluate(() => window.__notes);
  serveurCourses = [course('ELA-26-09-0200','Sophie Girard'), ...serveurCourses];
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForFunction(() => document.querySelectorAll('.demande').length === 2, null, {timeout:8000}).catch(() => {});
  check('la nouvelle demande est annoncée', await p.locator('#bordArrivee').isVisible());
  check('l\'alarme est lancée', await p.evaluate(() => window.__alarmeActive()));
  check('elle SONNE (notes jouées)', (await p.evaluate(() => window.__notes)) > notes0);
  check('elle vibre', (await p.evaluate(() => window.__vibre)) >= 1);
  await p.waitForTimeout(1200);
  const titres = new Set();
  for (let i = 0; i < 3; i++) { titres.add(await p.title()); await p.waitForTimeout(550); }
  check('le titre de l\'onglet clignote', [...titres].some(t => /NOUVELLE DEMANDE/.test(t)) && titres.size > 1, [...titres].join(' | '));
  const badges1 = await p.evaluate(() => window.__badges.slice());
  check('la pastille passe à 2', badges1.includes(2), JSON.stringify(badges1));

  await p.locator('#bordArrivee').click();
  await p.waitForTimeout(300);
  check('toucher l\'écriteau arrête l\'alarme', !(await p.evaluate(() => window.__alarmeActive())));
  check('et rend son titre à l\'onglet', !/NOUVELLE DEMANDE/.test(await p.title()), await p.title());

  await p.click('#btnReglages');
  const notes1 = await p.evaluate(() => window.__notes);
  await p.locator('#btnTesterAlertes').click();
  await p.waitForTimeout(400);
  check('« Tester mes alertes » fait sonner', (await p.evaluate(() => window.__notes)) > notes1);
  const dit = await p.textContent('#testAlertesEtat');
  check('et dit ce qui a marché (son, vibration, notification)', /Son/.test(dit) && /Vibration/.test(dit) && /Notification/.test(dit), dit);
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
} catch (x) { ko.push('PLANTAGE — ' + x.message.split('\n')[0]); }

await nav.close(); serveur.close();
console.log(`=== RÉUSSIS (${ok.length}) ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
