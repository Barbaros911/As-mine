/* =====================================================================
   TEST-PRIX-PAGES.MJS — le prix d'une page dédiée (14 octobre 2026)
   ---------------------------------------------------------------------
   Barbaros : « pour les pages que l'on crée pour les touristes, afficher un
   prix plus cher », puis « modifier au km n'importe quelle page ». Pour un
   client arrivé d'une page de la liste ORIGINES (?src=…) : le tarif au km
   réglé pour la page, sinon le tarif du site majoré du pourcentage de la
   page, sinon le tarif du site. Rien de réglé par défaut.
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
    if (u.includes('/rest/v1/prix_pages_publics')) {
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

/* ═══ 2 bis. UN PRIX AU KM POUR LA PAGE ═══
   Berline 3,75 €/km : 3,75 × 48 = 180 → 180 € ; Van 6,00 €/km : 6 × 48 = 288
   → 290 €. Et c'est ce prix qui part avec la demande. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', berline_km_centimes: 375, van_km_centimes: 600 }]), envoyer: true });
  check('prix au km de la page : 180 € en berline, 290 € en van', r.berline === 180 && r.van === 290, r.brut);
  check('prix au km de la page : la demande part à 180 €', (r.depots[0] || {}).prix?.total === 180, JSON.stringify((r.depots[0] || {}).prix));
  await r.ctx.close();
}

/* ═══ 2 ter. LE PRIX AU KM PASSE AVANT LE POURCENTAGE, GAMME PAR GAMME ═══
   Page à +20 % avec une berline à 3,20 €/km : 3,20 × 48 = 153,60 → 150 € ; le
   van n'a pas de prix au km, il prend les +20 % : 5,64 × 48 = 270,72 → 270 €. */
{
  const r = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', pourcentage: 20, berline_km_centimes: 320 }]) });
  check('prix au km + pourcentage : berline au km (150 €), van au pourcentage (270 €)', r.berline === 150 && r.van === 270, r.brut);
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
  /* Au km : 3,75 × 5 = 18,75 → 20 → 35 € ; 6 × 5 = 30 → 50 €. */
  const km = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', berline_km_centimes: 375, van_km_centimes: 600 }]), km: 5 });
  check('court trajet : le minimum reste aussi sous un prix au km de page', km.berline === 35 && km.van === 50, km.brut);
  await km.ctx.close();
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
  const horsKm = await parcours(CDG_ORLY, { vue: MAJ([{ page: 'en-cdg-orly', berline_km_centimes: 5000, van_km_centimes: 20 }]) });
  check('un prix au km hors bornes (50 € ou 0,20 €) ne règle rien : 140 € / 230 €', horsKm.berline === 140 && horsKm.van === 230, horsKm.brut);
  await horsKm.ctx.close();
}

/* ═══ 6. L'ADMIN RÈGLE LE PRIX DE CHAQUE PAGE ═══ */
/* Égalité profonde, indépendante de l'ordre des clés. */
const canon = v => v && typeof v === 'object'
  ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const egal = (x, y) => canon(x) === canon(y);
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
      if (u.includes('/rest/v1/prix_pages_publics')) return route.fulfill(vue);
      if (u.includes('/rest/v1/parametres_commerciaux?cle=eq.prix_pages')) {
        lectures.push(u);
        return route.fulfill(J([{ valeur: { 'en-cdg': { pourcentage: 20 }, 'fr-cdg': { pourcentage: 10, par_km_centimes: { berline: 350 } } } }]));
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
const effetDe = (p, id) => p.$eval(id, e => e.closest('.page-bloc').querySelector('.page-effet').textContent);
{
  const { ctx, p, erreurs, envois, lectures } = await admin(MAJ([{ page: 'en-cdg', pourcentage: 20 },
    { page: 'fr-cdg', pourcentage: 10, berline_km_centimes: 350 }]));
  try {
    await p.click('#btnReglages');
    await p.waitForSelector('#tarifPages .page-bloc input', { timeout: 5000 });
    const pages = await p.$$eval('#tarifPages .page-bloc', l => l.map(x => x.querySelector('.forfait-nom').textContent));
    check('une carte par page dédiée (les cinq anglaises, les trois françaises)', pages.length === 8
      && pages.includes('Site anglais · CDG ↔ Paris') && pages.includes('Page Chauffeur privé'), pages.join(' | '));
    const cases = await p.$$eval('#tarifPages .page-bloc', l => l.map(x => x.querySelectorAll('input').length));
    check('trois cases par page : %, Berline €/km, Van €/km', cases.every(n => n === 3), cases.join(','));
    check('les réglages du serveur s\'affichent (en-cdg 20 %, fr-cdg 10 % et 3,50 € en berline)',
      await p.inputValue('#pagePct_en-cdg') === '20' && await p.inputValue('#pagePct_fr-cdg') === '10'
      && await p.inputValue('#pageKm_fr-cdg_berline') === '3,50');
    check('une page non réglée : 0 %, cases au km vides avec le prix du site en indication',
      await p.inputValue('#pagePct_en-orly') === '0' && await p.inputValue('#pageKm_en-orly_berline') === ''
      && await p.getAttribute('#pageKm_en-orly_berline', 'placeholder') === '2,90', await p.getAttribute('#pageKm_en-orly_berline', 'placeholder'));
    const e1 = await effetDe(p, '#pagePct_en-cdg');
    check('l\'écran dit ce que donne +20 % au km (3,48 € · 5,64 €)', /3,48/.test(e1) && /5,64/.test(e1), e1);
    /* fr-cdg : berline 3,50 € (le prix au km passe avant les 10 %), van
       470 × 110 / 100 = 517 c → 5,17 €. */
    const e2 = await effetDe(p, '#pagePct_fr-cdg');
    check('prix au km et pourcentage ensemble : Berline 3,50 €, Van 5,17 €', /Berline 3,50/.test(e2) && /Van 5,17/.test(e2), e2);
    const e3 = await effetDe(p, '#pagePct_en-orly');
    check('une page non réglée dit « Prix du site »', /Prix du site/.test(e3) && /2,90/.test(e3), e3);
    await p.click('#btnPagesEnregistrer'); await p.waitForTimeout(300);
    check('sans modification, rien ne part', envois.length === 0 && /Aucun prix modifié/.test(await p.textContent('#pagesEtat')));
    await p.fill('#pagePct_en-orly', '12.5');
    await p.click('#btnPagesEnregistrer'); await p.waitForTimeout(300);
    check('un pourcentage non entier est refusé, la page est nommée', envois.length === 0
      && /Orly/.test(await p.textContent('#pagesEtat')), await p.textContent('#pagesEtat'));
    await p.fill('#pagePct_en-orly', '15');
    for (const faux of ['0.2', '25', '3.456']) {
      await p.fill('#pageKm_en-orly_berline', faux);
      await p.click('#btnPagesEnregistrer'); await p.waitForTimeout(250);
      const t = await p.textContent('#pagesEtat');
      check(`un prix au km faux (${faux}) est refusé, la case est nommée`, envois.length === 0 && /Orly/.test(t) && /Berline/.test(t), t);
    }
    await p.fill('#pageKm_en-orly_berline', '3,75'); // la virgule d'un clavier français
    await p.fill('#pageKm_fr-cdg_berline', '');
    const e4 = await effetDe(p, '#pagePct_en-orly');
    check('+15 % et 3,75 € en berline : Berline 3,75 €, Van 5,41 € (calcul en centimes)', /Berline 3,75/.test(e4) && /Van 5,41/.test(e4), e4);
    check('les cases modifiées sont marquées', await p.$eval('#pageKm_en-orly_berline', e => e.classList.contains('modifie'))
      && await p.$eval('#pageKm_fr-cdg_berline', e => e.classList.contains('modifie')));
    await p.click('#btnPagesEnregistrer');
    await p.waitForFunction(() => /Enregistré/.test(document.getElementById('pagesEtat').textContent), null, { timeout: 5000 }).catch(() => {});
    check('on relit la ligne du serveur avant d\'écrire', lectures.length === 1, String(lectures.length));
    const e = envois[0] || {};
    check('un seul envoi, sur la ligne « prix_pages »', envois.length === 1 && e.cle === 'prix_pages', JSON.stringify(envois));
    const attendu = { 'en-cdg': { pourcentage: 20 }, 'fr-cdg': { pourcentage: 10 },
      'en-orly': { pourcentage: 15, par_km_centimes: { berline: 375 } } };
    check('l\'envoi garde le serveur, n\'y change que les cases modifiées (une case vidée retire son prix)',
      egal(e.valeur, attendu), JSON.stringify(e.valeur));
    check('après l\'enregistrement, plus rien n\'est marqué', !(await p.$eval('#pageKm_en-orly_berline', x => x.classList.contains('modifie'))));
    await p.click('#btnControle'); await p.waitForTimeout(400);
    const cc = await p.textContent('#ccTarifs');
    check('le centre de contrôle montre le prix au km de chaque page réglée', /Prix des pages/.test(cc) && /3,48/.test(cc) && /3,75/.test(cc), cc.slice(0, 400));
    check('admin : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) { ko.push('PLANTAGE (admin) — ' + x.message.split('\n')[0]); }
  await ctx.close();
}
{
  const { ctx, p, erreurs } = await admin({ status: 404, contentType: 'application/json', body: '{}' });
  try {
    await p.click('#btnReglages');
    await p.waitForSelector('#tarifPages .page-bloc input', { timeout: 5000 });
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
  /* La date a suivi de nouveau le 19/10/2026 (B2 : prix à toutes les
     distances, péages non compris) : un contrôle de date garde la PLUS
     RÉCENTE modification des CGV, pas la sienne. */
  check('CGV : la date de mise à jour a suivi', /Dernière mise à jour : 19 octobre 2026/.test(T.fr.legal_cgv_body)
    && /Last updated: 19 October 2026/.test(T.en.legal_cgv_body));
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
