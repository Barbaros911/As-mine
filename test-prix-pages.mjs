/* =====================================================================
   TEST-PRIX-PAGES.MJS — le prix d'une page dédiée (14 octobre 2026)
   ---------------------------------------------------------------------
   Barbaros : « pour les pages que l'on crée pour les touristes, afficher un
   prix plus cher », réglable page par page depuis l'admin. Un pourcentage
   s'ajoute au tarif au kilomètre pour un client arrivé d'une page de la
   liste ORIGINES (?src=…). 0 par défaut.
   On éprouve le SITE CONSTRUIT, servi comme Cloudflare le sert, et on lit
   ce qui s'affiche ET ce qui part au serveur : le prix affiché doit être le
   prix facturé. Les montants attendus sont CALCULÉS À LA MAIN dans les
   commentaires, jamais relus de la page.
   Lancer :  node test-prix-pages.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.txt': 'text/plain' };
/* Comme Cloudflare : un dossier sert son index.html, une adresse sans
   extension sert le fichier .html du même nom. */
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { f = f + '.html'; await stat(f); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8142, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8142';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, s = 200) => ({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
const b = await chromium.launch();

/* Un montant lu à l'écran, quelle que soit la langue : « 170.00 € » ou
   « 170,00 € ». */
const nombre = t => Number(String(t || '').replace(/[^\d.,]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, ''));

/* Le parcours d'un client : de la page d'acquisition jusqu'à la demande
   envoyée. « vue » est la réponse de la vue publique des majorations ;
   « km » la distance rendue par le faux calculateur d'itinéraire. */
async function parcours(adresse, { vue = J([]), km = 48, envoyer = false, delai = 0, tarif = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US', timezoneId: 'Europe/Paris' });
  const depots = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(SITE)) return route.continue();
    if (d.includes('photon.komoot.io') || d.includes('api-adresse.data.gouv.fr')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: km * 1000, duration: 3000 }] }));
    if (u.includes('/rest/v1/majorations_pages_publiques')) {
      if (delai) await new Promise(r => setTimeout(r, delai));
      return route.fulfill(vue);
    }
    if (u.includes('/rest/v1/tarif_public')) return route.fulfill(tarif || J([]));
    if (u.includes('/rpc/ela_mesurer')) return route.fulfill({ status: 204, body: '' });
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' }); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(SITE + adresse, { waitUntil: 'load' });
  await p.waitForTimeout(500);
  /* Terminal 2E au départ, Orly 4 à l'arrivée : deux lieux de la table des
     aéroports, sans réseau. */
  if (!(await p.inputValue('#depart'))) await p.fill('#depart', 'CDG');
  await p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(400);
  if (!/Orly/.test(await p.inputValue('#arrivee'))) { await p.fill('#arrivee', 'Orly'); await p.waitForTimeout(400); }
  if (await p.locator('#arriveeList').isHidden()) { await p.focus('#arrivee'); await p.locator('#arrivee').press('ArrowDown').catch(() => {}); await p.waitForTimeout(300); }
  await p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(300);
  await p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await p.fill('#heure', '10:00');
  await p.locator('#btnVoirPrix').click({ timeout: 5000 }).catch(() => {});
  await p.waitForFunction(() => document.querySelectorAll('.veh-carte .veh-prix').length >= 2, null, { timeout: 8000 }).catch(() => {});
  const prix = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.veh-carte')]
    .map(c => [c.dataset.cle, c.querySelector('.veh-prix')?.textContent.trim()])));
  const r = { ctx, p, erreurs, depots, berline: nombre(prix.berline), van: nombre(prix.van), brut: JSON.stringify(prix) };
  if (envoyer) {
    await p.locator('.veh-carte[data-cle="berline"]').click().catch(() => {});
    await p.locator('#btnContinuer').click().catch(() => {}); await p.waitForTimeout(300);
    r.recap = await p.evaluate(() => {
      const t = [...document.querySelectorAll('#ecran-recap .ligne.total, #ecran-recap .total')].map(e => e.textContent).join(' ');
      return t;
    });
    await p.fill('#clientNom', 'Jane Doe').catch(() => {});
    await p.fill('#clientTel', '+44 7700 900123').catch(() => {});
    await p.evaluate(() => { const x = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (x) x.click(); });
    await p.locator('#btnConfirmer').click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  return r;
}
const CDG_ORLY = '/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly';
const MAJ = (lignes) => J(lignes);

/* ═══ 1. AUCUN RÉGLAGE : le prix du site ═══
   48 km — berline 2,90 × 48 = 139,20 → 140 € ; van 4,70 × 48 = 225,60 → 230 €. */
{
  const r = await parcours(CDG_ORLY);
  check('sans réglage, la page garde le prix du site (140 € / 230 €)', r.berline === 140 && r.van === 230, r.brut);
  check('aucune erreur JavaScript', r.erreurs.length === 0, r.erreurs.join(' | '));
  await r.ctx.close();
}

/* ═══ 2. +20 % SUR LA PAGE CDG ↔ ORLY ═══
   Tarif de la page : 290 × 120 / 100 = 348 c → 3,48 €/km ; 470 × 1,2 = 5,64.
   3,48 × 48 = 167,04 → 170 € ; 5,64 × 48 = 270,72 → 270 €.
   Le prix affiché, le récapitulatif et la demande disent le même chiffre. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 20 }]), envoyer: true });
  check('+20 % : la page affiche 170 € en berline et 270 € en van', r.berline === 170 && r.van === 270, r.brut);
  check('+20 % : le récapitulatif annonce le même total', /170/.test(r.recap || '') && !/140/.test(r.recap || ''), r.recap);
  const bon = r.depots[0] || {};
  check('+20 % : la demande part à 170 € — le prix affiché est le prix facturé', bon.prix?.total === 170, JSON.stringify(bon.prix));
  check('+20 % : la page d\'origine part avec la demande', bon.provenance === 'Site anglais · CDG ↔ Orly', String(bon.provenance));
  check('+20 % : aucune erreur JavaScript', r.erreurs.length === 0, r.erreurs.join(' | '));
  await r.ctx.close();
}

/* ═══ 3. +15 % ═══
   290 × 115 / 100 = 333,5 → 334 c (3,34 €/km) ; 3,34 × 48 = 160,32 → 160 €.
   Van : 470 × 115 / 100 = 540,5 → 541 c ; 5,41 × 48 = 259,68 → 260 €. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 15 }]) });
  check('+15 % : 160 € en berline, 260 € en van', r.berline === 160 && r.van === 260, r.brut);
  await r.ctx.close();
}

/* ═══ 3 ter. L'ARRONDI AU CENTIME SE FAIT EN ENTIERS ═══
   Tarif du serveur 2,30 €/km, +5 %. 230 × 105 / 100 = 241,5 → 242 c
   (2,42 €/km) ; 2,42 × 60 = 145,20 → 150 € (reste 5,2 : on monte). En
   virgule flottante, 2,3 × 105 vaut 241,4999… → 2,41 €/km → 144,60 → 140 €.
   Sans majoration : 2,30 × 60 = 138 → 140 €. */
{
  const tarif = J([{ gamme: 'berline', par_km_centimes: 230, minimum_centimes: 3500 }]);
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 5 }]), km: 60, tarif });
  check('+5 % sur 2,30 €/km, 60 km : 150 € (tarif arrondi au centime en entiers)', r.berline === 150, r.brut);
  await r.ctx.close();
}

/* ═══ 3 bis. UN SERVEUR LENT N'AFFICHE PAS LE PRIX DE BASE ═══
   « Voir mon prix » attend la lecture des tarifs (4 s au plus) : la
   majoration en fait partie. Sans ça, un client rapide verrait 140 € puis
   paierait 170 €. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 20 }]), delai: 2500 });
  check('réponse lente (2,5 s) : le prix affiché attend la majoration (170 €)', r.berline === 170, r.brut);
  await r.ctx.close();
}

/* ═══ 4. LE MINIMUM NE BOUGE PAS ═══
   5 km à +20 % : 3,48 × 5 = 17,40 → 20 → plancher 35 € ; 5,64 × 5 = 28,20
   → 30 → plancher 50 €. Exactement le prix du site. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 20 }]), km: 5 });
  check('court trajet : le minimum reste 35 € / 50 €, majoration ou pas', r.berline === 35 && r.van === 50, r.brut);
  await r.ctx.close();
}

/* ═══ 5. CE QUI NE DOIT JAMAIS MAJORER ═══ */
{
  const sansSrc = await parcours('/?lang=en&aeroport=cdg&sens=depart&vers=orly', { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 20 }]) });
  check('sans page d\'origine (src), pas de majoration : 140 €', sansSrc.berline === 140, sansSrc.brut);
  await sansSrc.ctx.close();
  const autre = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg', pourcentage: 20 }]) });
  check('la majoration d\'une autre page ne s\'applique pas : 140 €', autre.berline === 140, autre.brut);
  await autre.ctx.close();
  const panne = await parcours(CDG_ORLY, { vue: { status: 404, contentType: 'application/json', body: '{}' } });
  check('vue absente (migration pas appliquée) : le prix du site, 140 €', panne.berline === 140, panne.brut);
  check('vue absente : aucune erreur JavaScript', panne.erreurs.length === 0, panne.erreurs.join(' | '));
  await panne.ctx.close();
  const exces = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 500 }, { page: 'en-cdg-orly', pourcentage: 'abc' }]) });
  check('un pourcentage hors bornes ne majore rien : 140 €', exces.berline === 140, exces.brut);
  await exces.ctx.close();
}

/* ═══ 6. L'ADMIN RÈGLE LE PRIX DE CHAQUE PAGE ═══ */
async function admin(vue) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' })));
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const envois = [], lectures = [];
  await p.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(SITE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
      if (u.includes('/rest/v1/majorations_pages_publiques')) return route.fulfill(vue);
      if (u.includes('/rest/v1/parametres_commerciaux?cle=eq.majoration_pages')) {
        lectures.push(u);
        return route.fulfill(J([{ valeur: { 'en-cdg': 20, 'fr-cdg': 10 } }]));
      }
      if (u.includes('/rest/v1/parametres_commerciaux?on_conflict=cle') && req.method() === 'POST') {
        envois.push(JSON.parse(req.postData() || '{}'));
        return route.fulfill({ status: 201, body: '' });
      }
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });
  await p.goto(SITE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 10000 });
  return { ctx, p, erreurs, envois, lectures };
}
{
  const { ctx, p, erreurs, envois, lectures } = await admin(MAJ([{ page: 'en-cdg', pourcentage: 20 }, { page: 'fr-cdg', pourcentage: 10 }]));
  try {
    await p.click('#btnReglages');
    await p.waitForSelector('#tarifPages .page-ligne input', { timeout: 5000 });
    const lignes = await p.$$eval('#tarifPages .page-ligne:not(.forfait-tete)', l => l.map(x => x.querySelector('.forfait-nom').textContent));
    check('une ligne par page dédiée (les cinq anglaises, les trois françaises)', lignes.length === 8
      && lignes.includes('Site anglais · CDG ↔ Paris') && lignes.includes('Page Chauffeur privé'), lignes.join(' | '));
    check('la valeur réglée sur le serveur s\'affiche (en-cdg : 20)', await p.inputValue('#majoration_en-cdg') === '20');
    check('… et une page non réglée est à 0', await p.inputValue('#majoration_en-orly') === '0');
    const effet = await p.$eval('#majoration_en-cdg', e => e.closest('.page-ligne').querySelector('.page-effet').textContent);
    check('l\'écran dit ce que donne +20 % au kilomètre (3,48 € · 5,64 €)', /3,48/.test(effet) && /5,64/.test(effet), effet);
    await p.click('#btnPagesEnregistrer'); await p.waitForTimeout(300);
    check('sans modification, rien ne part', envois.length === 0 && /Aucun prix modifié/.test(await p.textContent('#pagesEtat')));
    await p.fill('#majoration_en-orly', '12.5');
    await p.click('#btnPagesEnregistrer'); await p.waitForTimeout(300);
    check('un pourcentage non entier est refusé, la page est nommée', envois.length === 0
      && /Orly/.test(await p.textContent('#pagesEtat')), await p.textContent('#pagesEtat'));
    await p.fill('#majoration_en-orly', '15');
    const effet15 = await p.$eval('#majoration_en-orly', e => e.closest('.page-ligne').querySelector('.page-effet').textContent);
    check('+15 % : 3,34 € au km en berline (calcul en centimes)', /3,34/.test(effet15), effet15);
    check('la valeur modifiée est marquée', await p.$eval('#majoration_en-orly', e => e.classList.contains('modifie')));
    await p.click('#btnPagesEnregistrer');
    await p.waitForFunction(() => /Enregistré/.test(document.getElementById('pagesEtat').textContent), null, { timeout: 5000 }).catch(() => {});
    check('on relit la ligne du serveur avant d\'écrire', lectures.length === 1, String(lectures.length));
    const e = envois[0] || {};
    check('un seul envoi, sur la ligne « majoration_pages »', envois.length === 1 && e.cle === 'majoration_pages', JSON.stringify(envois));
    check('l\'envoi garde les réglages du serveur et n\'ajoute que la page modifiée',
      JSON.stringify(e.valeur) === JSON.stringify({ 'en-cdg': 20, 'fr-cdg': 10, 'en-orly': 15 }), JSON.stringify(e.valeur));
    check('après l\'enregistrement, plus rien n\'est marqué', !(await p.$eval('#majoration_en-orly', x => x.classList.contains('modifie'))));
    await p.click('#btnControle'); await p.waitForTimeout(400);
    const cc = await p.textContent('#ccTarifs');
    check('le centre de contrôle montre les pages qui vendent plus cher', /Prix des pages/.test(cc) && /\+20 %/.test(cc) && /\+15 %/.test(cc), cc.slice(0, 300));
    check('admin : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) { ko.push('PLANTAGE (admin) — ' + x.message.split('\n')[0]); }
  await ctx.close();
}
{
  const { ctx, p, erreurs } = await admin({ status: 404, contentType: 'application/json', body: '{}' });
  try {
    await p.click('#btnReglages');
    await p.waitForSelector('#tarifPages .page-ligne input', { timeout: 5000 });
    const t = await p.textContent('#pagesEtat');
    check('vue absente : l\'admin dit qu\'une migration reste à appliquer', /20261014010000/.test(t), t);
    check('vue absente : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) { ko.push('PLANTAGE (admin, vue absente) — ' + x.message.split('\n')[0]); }
  await ctx.close();
}

/* ═══ 7. LES CGV LE DISENT, DANS LES DEUX LANGUES, SANS CHIFFRE ═══ */
{
  const p = await b.newPage(); await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  const T = await p.evaluate(() => window.ELA_TEXTES); await p.close();
  const fr = (T.fr.legal_cgv_body.match(/[^.]*depuis laquelle la demande est commencée[^.]*\./) || [''])[0];
  const en = (T.en.legal_cgv_body.match(/[^.]*from which the request is started[^.]*\./) || [''])[0];
  check('CGV FR : le tarif peut différer selon la page, le prix affiché s\'applique', /page du Service/.test(fr) && /prix total affiché/.test(fr), fr);
  check('CGV EN : même phrase en anglais', /page of the Service/.test(en) && /total price shown/.test(en), en);
  check('CGV : aucun chiffre dans ces phrases (pas de tarif écrit au contrat)', fr && en && !/\d/.test(fr + en), fr + ' / ' + en);
  check('CGV : la date de mise à jour a suivi', /Dernière mise à jour : 14 octobre 2026/.test(T.fr.legal_cgv_body)
    && /Last updated: 14 October 2026/.test(T.en.legal_cgv_body));
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
