/* =====================================================================
   TEST-ADMIN-ARRIVEE.MJS — une réservation client arrive dans l'admin
   ---------------------------------------------------------------------
   23 septembre 2026, Barbaros : « il faut absolument que je puisse recevoir
   les réservations des clients sur la page admin, et Telegram, même si le
   client ne m'envoie pas par WhatsApp ». L'admin retenu est l'espace
   historique (admin.html), plus Admin v2.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT (la connexion par e-mail n'existe
   que là) :
   - une demande déposée sur le serveur APPARAÎT et est ANNONCÉE pendant
     qu'il regarde — sans que rien ne passe par WhatsApp ;
   - arrivé par une alerte (« ?ref= »), l'espace OUVRE cette course ;
   - le lien de l'alerte Telegram vise admin.html, plus admin-v2.html.
   Le déclenchement de Telegram lui-même est côté serveur (webhook INSERT) :
   il ne s'éprouve pas d'ici, il a été vu marcher le 11 septembre 2026.

   Lancer :  node test-admin-arrivee.mjs
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
await new Promise(r => serveur.listen(8098, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8098';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));


import { readFileSync } from 'node:fs';
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});
const course = (ref, nom) => ({ ref, statut:"attente", cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
    date:"2026-12-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
    passagers:"2 passagers", vol:"" },
  client:{ nom, telephone:"06 12 34 56 78" }, prix:{ total:70 } });

let serveurCourses = [course('ELA-26-09-0100','Jean Martin')];
const nav = await chromium.launch();
async function espace(chemin){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session',
    JSON.stringify({access_token:'JETON', refresh_token:'R'})));
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      if (u.includes('/rest/v1/courses')) return route.fulfill(J(serveurCourses.map(bon => ({bon, statut:bon.statut}))));
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
  /* 1. Une demande arrive pendant qu'il regarde. */
  {
    const {ctx, p, erreurs} = await espace('/admin.html');
    await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:8000})
      .catch(() => {});
    check('à l\'ouverture, la course du serveur est là', (await p.locator('.demande').count()) === 1,
      String(await p.locator('.demande').count()));
    check('le rattrapage n\'est pas annoncé comme une arrivée', await p.locator('#bordArrivee').isHidden());
    serveurCourses = [course('ELA-26-09-0101','Sophie Girard'), ...serveurCourses];
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await p.waitForFunction(() => document.querySelectorAll('.demande').length === 2, null, {timeout:8000})
      .catch(() => {});
    check('la nouvelle demande client entre dans la liste', (await p.locator('.demande').count()) === 2,
      String(await p.locator('.demande').count()));
    check('et elle est ANNONCÉE', await p.locator('#bordArrivee').isVisible());
    check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  }
  /* 2. Arrivé par l'alerte : la course s'ouvre. */
  {
    serveurCourses = [course('ELA-26-09-0102','Paul Durand'), ...serveurCourses];
    const {ctx, p} = await espace('/admin.html?ref=ELA-26-09-0102');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon')
      && document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
    const actif = await p.evaluate(() => (document.querySelector('.ecran.actif')||{}).id);
    check('le lien de l\'alerte ouvre le bon de CETTE course', actif === 'ecran-bord-bon', actif);
    check('et c\'est la bonne', (await p.locator('#ecran-bord-bon').textContent()).includes('ELA-26-09-0102'));
    check('« ref » est retiré de l\'adresse (un rafraîchissement ne la rouvre pas)',
      !(await p.evaluate(() => location.search)).includes('ref='));
    await ctx.close();
  }
  /* 2 bis. Sur le bon, un seul geste principal : celui de l'étape suivante. */
  {
    const conf = course('ELA-26-09-0103','Confirmé'); conf.statut = 'confirmee';
    const fait = course('ELA-26-09-0104','Réalisé'); fait.statut = 'realisee';
    serveurCourses = [course('ELA-26-09-0105','Attente'), conf, fait];
    const vis = async (p, id) => p.evaluate(i => { const e = document.getElementById(i);
      return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, id);
    for (const [ref, attendu] of [['ELA-26-09-0105','attente'],['ELA-26-09-0103','confirmee'],['ELA-26-09-0104','realisee']]) {
      const {ctx, p} = await espace('/admin.html?ref=' + ref);
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      const c = await vis(p,'btnConfirmerCourse'), r = await vis(p,'btnRealisee'), f = await vis(p,'btnRefuser');
      if (attendu === 'attente') check('en attente : « Confirmer » seul, pas « Marquer comme réalisée »', c && !r && f, `c=${c} r=${r} f=${f}`);
      if (attendu === 'confirmee') check('confirmée : « Marquer comme réalisée » seul, plus « Confirmer »', !c && r && f, `c=${c} r=${r} f=${f}`);
      if (attendu === 'realisee') check('réalisée : ni confirmer, ni réaliser, ni refuser', !c && !r && !f, `c=${c} r=${r} f=${f}`);
      await ctx.close();
    }
  }
  /* 3. L'alerte Telegram vise l'admin retenu. */
  for (const f of ['supabase/functions/nouvelle-demande/index.ts', 'supabase/functions/nouvelle-demande/a-coller.ts']) {
    const t = readFileSync(f, 'utf8');
    check(f.split('/').pop() + ' : l\'alerte ouvre admin.html', /"https:\/\/elatransfer\.com\/admin\.html"/.test(t)
      && !/elatransfer\.com\/admin-v2\.html/.test(t));
  }
} catch (e) {
  ko.push('PLANTAGE — ' + e.message.split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
for (const x of ok) console.log('  ok  ' + x);
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); for (const x of ko) console.log('  KO  ' + x); }
console.log('\n=== ' + ok.length + ' contrôles au vert, ' + ko.length + ' en échec ===');
process.exit(ko.length ? 1 : 0);
