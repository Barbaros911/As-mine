/* =====================================================================
   TEST-ADMIN-SUPPRIMEE-RECEPTION.MJS — une course que l'hôtel a retirée
   de sa liste reste chez Barbaros, marquée, et il sait quoi faire
   ---------------------------------------------------------------------
   20 octobre 2026, Barbaros : « il faut que je puisse supprimer les
   courses, effectuées ou non, sur admin et la réception aussi ».
   La réception supprime de SA liste ; le serveur MARQUE la course
   (« bon.supprimeeReception »), il ne l'efface pas : une course réalisée
   est de l'argent dû par un chauffeur et une preuve ; une course à venir
   a peut-être un chauffeur engagé que lui seul peut rappeler.

   CE QUE L'ADMIN DOIT MONTRER, ÉPROUVÉ SUR LE SITE CONSTRUIT :
   · la carte porte « Supprimée par la réception », à côté de la référence,
     jamais dedans (même règle que « Sans chauffeur ») ;
   · l'écriteau du tableau de bord ne compte que les courses À VENIR (une
     course finie ne demande rien) et emmène à la première ;
   · la fiche dit la date du retrait et le geste suivant ;
   · la marque ARRIVE PAR LA LECTURE DU SERVEUR : une copie locale sans la
     marque est remplacée dès que le serveur, plus récent, la porte.

   Lancer :  node test-admin-supprimee-reception.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8093, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8093';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return [s.slice(0, 10), s.slice(11, 16)]; };
const jour = (n, h) => [paris(n * 1440)[0], h];
const RETRAIT = '2026-10-20T07:30:00+02:00';
const course = (ref, statut, [date, heure], extra = {}) => Object.assign({ ref, statut, version: 1,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  provenanceCle: 'easyhotel-aeroville', provenance: 'easyHotel Aéroville', parReception: true,
  course: { depart: 'easyHotel Aéroville, 10 rue de la Belle Borne', departPublic: 'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee: 'Orly 1 — Aéroport de Paris-Orly', date, heure, vehicule: 'Berline', vehiculeCle: 'berline',
    passagers: '2 passagers', vol: '', chambre: '214' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 90 }, langue: 'fr' }, extra);
const MEHMET = { nom: 'Mehmet Yilmaz', telephone: '06 98 76 54 32' };
const JEU = [
  course('ELA-26-10-SUPCF', 'confirmee', jour(2, '08:00'), { chauffeur: MEHMET, supprimeeReception: RETRAIT, supprimeeReceptionPar: 'easyhotel-aeroville' }),
  course('ELA-26-10-SUPAT', 'attente',   jour(3, '09:00'), { supprimeeReception: RETRAIT, supprimeeReceptionPar: 'easyhotel-aeroville' }),
  course('ELA-26-10-SUPRE', 'realisee',  jour(-2, '10:00'), { chauffeur: MEHMET, supprimeeReception: RETRAIT, supprimeeReceptionPar: 'easyhotel-aeroville' }),
  course('ELA-26-10-VIVE1', 'confirmee', jour(2, '11:00'), { chauffeur: MEHMET }),
  /* Celle-ci arrive SANS la marque sur l'appareil, et AVEC sur le serveur,
     en version 2 : c'est la réconciliation qui doit la poser. */
  course('ELA-26-10-TARD1', 'confirmee', jour(4, '12:00'), { chauffeur: MEHMET }),
];

const erreurs = [];
const nav = await chromium.launch();
async function espace(chemin = '/ela-admin/', { localeSansMarque = false } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const donnees = JSON.parse(JSON.stringify(JEU));
  if (localeSansMarque) {
    const t = donnees.find(c => c.ref === 'ELA-26-10-TARD1');
    t.supprimeeReception = RETRAIT; t.supprimeeReceptionPar = 'easyhotel-aeroville'; t.version = 2;
  }
  await ctx.addInitScript(({ locale }) => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    if (locale) localStorage.setItem('ela_bookings', JSON.stringify(locale));
  }, { locale: localeSansMarque ? JEU.map(c => Object.assign({}, c, { _v: 1 })) : null });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J([]));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token: 'JETON2', refresh_token: 'R2', email: 'test@ela.fr' }));
    if (u.includes('/rest/v1/courses')) {
      if (u.includes('select=ref')) return route.fulfill(J(donnees.slice(0, 1).map(c => ({ ref: c.ref, version: c.version, modifie_le: '2026-10-20T10:00:00Z' }))));
      if (m === 'GET') return route.fulfill(J(donnees.map(c => ({ bon: c, statut: c.statut, version: c.version, modifie_le: '2026-10-20T10:00:00Z', cree_le: c.cree }))));
      return route.fulfill(J([{ version: 2, cree_le: new Date().toISOString() }]));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + chemin);
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForTimeout(900);
  return { ctx, p };
}
const surBon = p => p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 8000 }).catch(() => {});

try {
  /* 1. LE TABLEAU DE BORD : l'écriteau compte les courses À VENIR, et la
        carte porte la pastille, à côté de la référence. */
  {
    const { ctx, p } = await espace();
    const ec = p.locator('#bordSupprRec');
    const texte = (await ec.textContent().catch(() => '')) || '';
    check('un écriteau compte les courses À VENIR supprimées par la réception (2, pas la réalisée)',
      await ec.isVisible() && /^2 courses à venir/.test(texte), texte);
    await ec.click().catch(() => {}); await p.waitForTimeout(300);
    const premiere = await p.locator('#listeBord .demande.supprimee-rec').first().getAttribute('data-ref').catch(() => '');
    check('il emmène à une course marquée, dans son filtre', !!premiere && await p.locator('.compteur.actif').count() === 1, premiere);
    const carte = ref => { return p.locator('#listeBord .demande').filter({ hasText: ref }).first(); };
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(250);
    check('la carte confirmée porte « Supprimée par la réception »',
      (await carte('ELA-26-10-SUPCF').locator('.d-suppr-rec').count()) === 1);
    check('une course vivante du même hôtel ne la porte pas',
      (await carte('ELA-26-10-VIVE1').locator('.d-suppr-rec').count()) === 0);
    const refLue = await carte('ELA-26-10-SUPCF').locator('.d-ref').textContent({ timeout: 3000 }).catch(() => '');
    check('la référence reste seule dans son champ', refLue === 'ELA-26-10-SUPCF', refLue);
    /* La pastille et le prix tiennent dans la carte : rien ne déborde à 390 px. */
    const deb = await carte('ELA-26-10-SUPCF').evaluate(el => {
      const r = el.getBoundingClientRect(); let pire = 0;
      el.querySelectorAll('*').forEach(x => { const b = x.getBoundingClientRect(); if (b.width) pire = Math.max(pire, b.right - r.right); });
      return Math.round(pire);
    });
    check('rien ne déborde de la carte à 390 px', deb <= 0, deb + ' px');
    await p.click('.compteur[data-filtre="realisee"]'); await p.waitForTimeout(250);
    check('une course RÉALISÉE supprimée par la réception porte la pastille aussi',
      (await carte('ELA-26-10-SUPRE').locator('.d-suppr-rec').count()) === 1);
    await ctx.close();
  }
  /* 2. LA FICHE : la date du retrait et le geste suivant. */
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-SUPCF'); await surBon(p);
    const note = (await p.textContent('#bbSupprRec', { timeout: 3000 }).catch(() => '')) || '';
    check('la fiche d\'une course à venir dit le retrait et la date', await p.locator('#bbSupprRec').isVisible() && /20\/10 à 07:30/.test(note), note);
    check('et le geste : prévenir le chauffeur, puis annuler ou supprimer', /chauffeur/.test(note) && /Annuler/.test(note) && /Supprimer/.test(note), note);
    check('« Supprimer cette course » reste proposé', await p.locator('#btnSupprimerCourse').isVisible());
    await ctx.close();
  }
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-SUPRE'); await surBon(p);
    const note = (await p.textContent('#bbSupprRec', { timeout: 3000 }).catch(() => '')) || '';
    check('sur une course réalisée, la fiche dit qu\'il n\'y a rien à faire', /rien à faire/.test(note), note);
    await ctx.close();
  }
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-VIVE1'); await surBon(p);
    check('une course non retirée n\'affiche pas la note', await p.locator('#bbSupprRec').isHidden());
    await ctx.close();
  }
  /* 3. LA MARQUE ARRIVE PAR LE SERVEUR : la copie locale, sans elle, est
        remplacée par la version plus récente du serveur. */
  {
    const { ctx, p } = await espace('/ela-admin/', { localeSansMarque: true });
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(400);
    const carte = p.locator('#listeBord .demande').filter({ hasText: 'ELA-26-10-TARD1' }).first();
    check('une marque posée sur le serveur après la lecture locale apparaît sur la carte',
      (await carte.locator('.d-suppr-rec').count()) === 1);
    const texte = (await p.locator('#bordSupprRec').textContent().catch(() => '')) || '';
    check('et l\'écriteau la compte (3 à venir)', /^3 courses à venir/.test(texte), texte);
    await ctx.close();
  }
  check('aucune erreur JavaScript', !erreurs.length, erreurs.slice(0, 3).join(' | '));
} catch (e) {
  ko.push('PLANTAGE — ' + e.message.split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
for (const x of ok) console.log('  ok  ' + x);
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); for (const x of ko) console.log('  KO  ' + x); }
console.log('\n=== ' + ok.length + ' contrôles au vert, ' + ko.length + ' en échec ===');
process.exit(ko.length ? 1 : 0);
