/* =====================================================================
   TEST-LIENS-SUIVI.MJS — quel partenaire amène des clients (15/10/2026)
   ---------------------------------------------------------------------
   Barbaros : « oui, je veux un suivi ». Un hôtel, un office de tourisme ou
   un annuaire reçoit SON lien (« ?via=<code> »). Ce qu'on éprouve, SUR LE
   SITE CONSTRUIT, en suivant le visiteur de bout en bout :

   1. LA PAGE D'ARRIVÉE compte la visite AVEC le code, l'efface de la barre
      d'adresse (une adresse partagée ensuite n'attribue rien) et le passe
      aux seuls boutons « Book ». Sans code, elle envoie exactement ce
      qu'elle envoyait avant. Un code mal formé ne part pas. Un robot : rien.
   2. LE MOTEUR compte « moteur ouvert », « formulaire commencé », « demande
      envoyée » avec le code, et la DEMANDE part avec « via ». Une affiche
      d'hôtel garde la priorité : pas de « via » avec elle.
   3. L'ADMIN lit ses liens, les chiffres de chacun (le compteur du serveur
      AVANT la demande, le registre pour les demandes et l'argent — jamais
      une course d'essai), copie le lien de la page choisie, et en crée un.
   4. LE RAPPEL D'AVIS : les clients de la semaine sans demande d'avis, et
      rien tant qu'aucun lien d'avis n'est réglé.

   La règle serveur (code reconnu ou ignoré) est éprouvée à part :
   supabase/tests/liens-suivi-apres.sql et test-securite-fonctions.mjs.

   Lancer :  node test-liens-suivi.mjs   (elle construit et sert elle-même)
   ===================================================================== */
/* La mesure brute envoyée et les appels à l'ancienne porte, sur toute la suite. */
const bruts = [], anciens = [];
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp',
  '.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch {
      try { await stat(f + '.html'); f = f + '.html'; }
      catch { res.writeHead(404).end('non'); return; }
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8144, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8144';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, s = 200) => ({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_ROBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const b = await chromium.launch();

/* Le visiteur : un contexte qui ENREGISTRE ce qui part au serveur (mesures
   et dépôts) et coupe tout le reste du monde. */
async function visiteur({ ua = UA_IPHONE, init } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-US',
    timezoneId: 'Europe/Paris', userAgent: ua });
  const mesures = [], depots = [], demos = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  if (init) await ctx.addInitScript(init);
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(SITE)) return route.continue();
    /* 15/10/2026 : la mesure passe par la fonction « mesure ». On la traduit
       dans la forme du compteur (p_page, p_evenement, p_source) : chaque
       contrôle de cette suite garde son sens. L'ancienne porte est comptée
       à part — plus rien ne doit l'appeler — et le corps brut est gardé pour
       vérifier qu'aucun identifiant ne part. */
    if (u.includes('/functions/v1/mesure')) { try { const c = JSON.parse(req.postData()); bruts.push(c); mesures.push(Object.assign({ p_page: c.page, p_evenement: c.evenement }, c.lien ? { p_source: c.lien } : {})); } catch {} return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (u.includes('/rpc/ela_mesurer')) { anciens.push(req.postData()); return route.fulfill({ status: 204, body: '' }); }
    if (d.includes('api-adresse.data.gouv.fr') || d.includes('photon.komoot.io')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: 48000, duration: 3000 }] }));
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill(J({ ok: true }, 201)); }
      if (u.includes('/functions/v1/demande-demo')) {
        demos.push(c);
        return route.fulfill(J({ session: 'S.S', expire: new Date(Date.now() + 36e5).toISOString(), etablissement: c.etablissement || '' }));
      }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  return { ctx, p, mesures, depots, demos, erreurs };
}
const LANDING = '/en/cdg-airport-transfer-paris/';

/* ═══ 1. LA PAGE D'ARRIVÉE ═══ */
{
  const v = await visiteur();
  await v.p.goto(SITE + LANDING + '?via=hotel-exemple', { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  const etat = await v.p.evaluate(() => ({ adresse: location.search,
    books: [...document.querySelectorAll('a[data-mesure="reserver"]')].map(a => a.getAttribute('href')),
    internes: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^\/en\//.test(h)),
    ancres: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^#/.test(h)),
    memePage: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => {
      try { const u = new URL(h, location.href); return u.origin === location.origin && u.pathname === location.pathname && !!u.hash && /via=/.test(h); } catch { return false; } }),
    externes: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /^(tel:|mailto:|https:\/\/wa\.me)/.test(h)) }));
  const vue = v.mesures.find(m => m.p_evenement === 'page_vue') || {};
  check('arrivée : la visite est comptée avec le code du partenaire', vue.p_page === 'en-cdg' && vue.p_source === 'hotel-exemple', JSON.stringify(vue));
  check('arrivée : le code est effacé de la barre d\'adresse', etat.adresse === '', etat.adresse);
  check('arrivée : chaque « Book » emmène le code', etat.books.length >= 3 && etat.books.every(h => /[?&]via=hotel-exemple(&|$|#)/.test(h)), etat.books.join(' | '));
  check('arrivée : « Book » garde sa page d\'origine et son aéroport', etat.books.every(h => /src=en-cdg/.test(h) && /aeroport=cdg/.test(h)), etat.books.join(' | '));
  /* Perdu au premier clic vers /en/ ou une autre page, le code ne verrait
     jamais la demande qui part de là (relecture du 15/10/2026). */
  check('arrivée : les autres liens du site (accueil anglais, autres pages) emmènent le code aussi', etat.internes.length >= 2 && etat.internes.every(h => /[?&]via=hotel-exemple(&|$|#)/.test(h)), etat.internes.join(' | '));
  /* « #faq » reste « #faq » ; « /en/#transfers », lui, est une autre page et
     part avec le code — le test distingue les deux. */
  check('arrivée : une ancre de la même page reste une ancre (réécrite, elle rechargerait la page)', etat.ancres.length >= 2 && etat.memePage.length === 0, JSON.stringify({ ancres: etat.ancres, memePage: etat.memePage }));
  check('arrivée : tel:, mailto: et WhatsApp ne sont pas touchés', etat.externes.length >= 3 && etat.externes.every(h => !/via=/.test(h)), etat.externes.join(' | '));
  /* On appuie vraiment : le moteur s'ouvre, compte avec le code, l'efface. */
  await v.p.locator('a[data-mesure="reserver"]').first().click();
  await v.p.waitForURL(u => u.pathname === '/', { timeout: 8000 }).catch(() => {});
  await v.p.waitForTimeout(800);
  const clic = v.mesures.find(m => m.p_evenement === 'clic_reserver') || {};
  check('arrivée : l\'appui sur « Book » est compté avec le code', clic.p_source === 'hotel-exemple', JSON.stringify(clic));
  const ouvert = v.mesures.find(m => m.p_evenement === 'moteur_ouvert') || {};
  check('moteur : « ouvert » est compté pour la page ET le partenaire', ouvert.p_page === 'en-cdg' && ouvert.p_source === 'hotel-exemple', JSON.stringify(ouvert));
  const adr = await v.p.evaluate(() => location.search);
  check('moteur : le code est effacé de la barre d\'adresse', !/via=/.test(adr), adr);
  check('arrivée et moteur : aucune erreur JavaScript', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}
{
  const v = await visiteur();
  await v.p.goto(SITE + LANDING, { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  const vue = v.mesures.find(m => m.p_evenement === 'page_vue') || {};
  check('sans lien : aucun code de partenaire ne part', JSON.stringify(Object.keys(vue).sort()) === '["p_evenement","p_page"]', JSON.stringify(vue));
  const books = await v.p.$$eval('a[data-mesure="reserver"]', l => l.map(a => a.getAttribute('href')));
  check('sans lien : « Book » ne porte aucun code', books.every(h => !/via=/.test(h)), books.join(' | '));
  await v.ctx.close();
}
{
  const v = await visiteur();
  await v.p.goto(SITE + LANDING + '?via=' + encodeURIComponent('Hôtel Exemple<script>'), { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  const vue = v.mesures.find(m => m.p_evenement === 'page_vue') || {};
  const etat = await v.p.evaluate(() => ({ adresse: location.search, books: [...document.querySelectorAll('a[data-mesure="reserver"]')].map(a => a.getAttribute('href')) }));
  check('code mal formé : la visite compte, sans source', vue.p_page === 'en-cdg' && !('p_source' in vue), JSON.stringify(vue));
  check('code mal formé : effacé de l\'adresse, jamais recopié dans « Book »', etat.adresse === '' && etat.books.every(h => !/via=/.test(h)), JSON.stringify(etat));
  await v.ctx.close();
}
{
  const v = await visiteur({ ua: UA_ROBOT });
  await v.p.goto(SITE + LANDING + '?via=hotel-exemple', { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  const books = await v.p.$$eval('a[data-mesure="reserver"]', l => l.map(a => a.getAttribute('href')));
  check('robot : rien n\'est compté', v.mesures.length === 0, JSON.stringify(v.mesures));
  check('robot : les liens restent propres (Google ne découvre pas d\'adresses à code)', books.every(h => !/via=/.test(h)), books.join(' | '));
  await v.ctx.close();
}

{
  /* La page des professionnels : celle que visent un office de tourisme, une
     CCI, un média hôtelier, et le QR code de la fiche papier des hôtels. */
  const v = await visiteur();
  await v.p.goto(SITE + '/professionnels/?via=fiche-hotels', { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  const vue = v.mesures.find(m => m.p_evenement === 'page_vue') || {};
  check('professionnels : la visite est comptée, page « pro », avec le code de la fiche', vue.p_page === 'pro' && vue.p_source === 'fiche-hotels', JSON.stringify(vue));
  check('professionnels : le code est effacé de la barre d\'adresse', await v.p.evaluate(() => location.search) === '');
  /* La seule conversion de cette page est une demande de démo : sans le
     code dessus, la fiche papier ne pourrait jamais montrer une demande
     (relecture du 15/10/2026). */
  await v.p.click('.types label:nth-child(1)');
  await v.p.fill('#fEtablissement', 'Hôtel Exemple Roissy'); await v.p.fill('#fPrenom', 'Marie'); await v.p.fill('#fNom', 'Dupont');
  await v.p.fill('#fEmail', 'direction@exemple.fr'); await v.p.fill('#fTelephone', '06 12 34 56 78');
  await v.p.click('#fEnvoyer');
  await v.p.waitForFunction(() => false, null, { timeout: 3500 }).catch(() => {});
  const demo = v.demos[0] || {};
  check('professionnels : la demande de démo part avec le code de la fiche', demo.action === 'demander' && demo.via === 'fiche-hotels', JSON.stringify({ via: demo.via, action: demo.action }));
  check('professionnels : aucune erreur JavaScript', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}
{
  const v = await visiteur();
  await v.p.goto(SITE + '/professionnels/', { waitUntil: 'load' });
  await v.p.waitForTimeout(300);
  await v.p.click('.types label:nth-child(1)');
  await v.p.fill('#fEtablissement', 'Hôtel Exemple Roissy'); await v.p.fill('#fPrenom', 'Marie'); await v.p.fill('#fNom', 'Dupont');
  await v.p.fill('#fEmail', 'direction@exemple.fr'); await v.p.fill('#fTelephone', '06 12 34 56 78');
  await v.p.click('#fEnvoyer');
  await v.p.waitForFunction(() => false, null, { timeout: 3500 }).catch(() => {});
  const demo = v.demos[0] || {};
  check('professionnels sans lien : la demande de démo part sans « via », exactement comme avant', demo.action === 'demander' && !('via' in demo), JSON.stringify(Object.keys(demo)));
  await v.ctx.close();
}

/* ═══ 2. LE MOTEUR : LA DEMANDE PART AVEC LE CODE ═══ */
async function reserver(p) {
  await p.locator('#departList [role=option]', { hasText: 'Terminal 2E' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(500);
  await p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(300);
  await p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await p.fill('#heure', '10:00');
  await p.locator('#btnVoirPrix').click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(1200);
  await p.locator('.veh-carte').first().click().catch(() => {});
  await p.locator('#btnContinuer').click().catch(() => {}); await p.waitForTimeout(300);
  await p.fill('#clientNom', 'Jane Doe').catch(() => {});
  await p.fill('#clientTel', '+44 7700 900123').catch(() => {});
  await p.evaluate(() => { const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  await p.locator('#btnConfirmer').click().catch(() => {});
  await p.waitForTimeout(1500);
}
{
  const v = await visiteur();
  await v.p.goto(SITE + '/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly&via=hotel-exemple', { waitUntil: 'load' });
  await v.p.waitForTimeout(700);
  await reserver(v.p);
  const bon = v.depots[0] || {};
  check('demande : elle part avec le code du partenaire', bon.via === 'hotel-exemple', JSON.stringify({ via: bon.via, ref: bon.ref }));
  check('demande : la page d\'origine reste dans « provenance » (le serveur écrit le partenaire devant s\'il reconnaît le code)', bon.provenance === 'Site anglais · CDG ↔ Orly', String(bon.provenance));
  const gestes = v.mesures.filter(m => m.p_source === 'hotel-exemple').map(m => m.p_evenement);
  check('mesure : ouvert, commencé et envoyé — chacun avec le code',
    ['moteur_ouvert', 'formulaire_commence', 'demande_envoyee'].every(e => gestes.includes(e)), gestes.join(', '));
  check('demande : aucune erreur JavaScript', v.erreurs.length === 0, v.erreurs.join(' | '));
  await v.ctx.close();
}
{
  /* LE CODE SURVIT À UN RECHARGEMENT (20/10/2026) : il est effacé de
     l'adresse dès l'arrivée ; sans « sessionStorage », un client qui
     revenait sur le moteur réservait sans lui, et le partenaire perdait la
     course. Seconde page SANS « via » dans l'adresse, même onglet. */
  const v = await visiteur();
  await v.p.goto(SITE + '/?lang=en&src=en-cdg-orly&via=hotel-exemple', { waitUntil: 'load' });
  await v.p.waitForTimeout(500);
  check('rechargement : le code a bien quitté la barre d\'adresse', !/via=/.test(v.p.url()), v.p.url());
  await v.p.goto(SITE + '/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly', { waitUntil: 'load' });
  await v.p.waitForTimeout(700);
  await reserver(v.p);
  const bon = v.depots[0] || {};
  check('rechargement : la demande part ENCORE avec le code du partenaire', bon.via === 'hotel-exemple', JSON.stringify({ via: bon.via }));
  await v.ctx.close();
}
{
  /* Une affiche d'hôtel (provenance de la visite) garde la priorité. */
  const v = await visiteur({ init: () => { try { sessionStorage.setItem('ela_provenance', 'Affiche · Hôtel du Parc'); } catch (e) {} } });
  await v.p.goto(SITE + '/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly&via=hotel-exemple', { waitUntil: 'load' });
  await v.p.waitForTimeout(700);
  await reserver(v.p);
  const bon = v.depots[0] || {};
  check('affiche d\'hôtel : sa provenance gagne, aucun code ne part avec elle', bon.provenance === 'Affiche · Hôtel du Parc' && !bon.via, JSON.stringify({ p: bon.provenance, via: bon.via }));
  await v.ctx.close();
}
{
  const v = await visiteur();
  await v.p.goto(SITE + '/?lang=en&src=en-cdg-orly&aeroport=cdg&sens=depart&vers=orly', { waitUntil: 'load' });
  await v.p.waitForTimeout(700);
  await reserver(v.p);
  const bon = v.depots[0] || {};
  check('sans lien : la demande ne porte pas de code', !bon.via && bon.provenance === 'Site anglais · CDG ↔ Orly', JSON.stringify({ via: bon.via, p: bon.provenance }));
  check('sans lien : aucune mesure ne porte de source', v.mesures.every(m => !('p_source' in m)), JSON.stringify(v.mesures));
  await v.ctx.close();
}

/* ═══ 3. L'ADMIN ═══ */
const auj = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const ilYa = j => new Date(Date.now() - j * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const course = (ref, statut, prix, extra = {}) => Object.assign({ ref, statut, cree: new Date().toISOString(),
  course: { depart: 'Terminal 2E', arrivee: 'Paris 8e', date: auj, heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers' },
  client: { nom: 'Client ' + ref.slice(-2), telephone: '06 12 34 56 78' }, prix: { total: prix },
  chauffeur: { nom: 'Ali', telephone: '0600000002' } }, extra);
const COURSES = [
  course('ELA-26-10-LA1AA', 'realisee', 80, { via: 'hotel-exemple', viaNom: 'Hôtel Exemple Roissy', provenance: 'Lien · Hôtel Exemple Roissy' }),
  course('ELA-26-10-LB2BB', 'attente', 120, { via: 'hotel-exemple', viaNom: 'Hôtel Exemple Roissy', provenance: 'Lien · Hôtel Exemple Roissy', chauffeur: undefined }),
  course('ELA-26-10-LC3CC', 'realisee', 999, { via: 'hotel-exemple', essai: true }),
  course('ELA-26-10-LD4DD', 'realisee', 60),
  course('ELA-26-10-LE5EE', 'realisee', 70, { avisDemande: new Date().toISOString() }),
  course('ELA-26-10-LF6FF', 'realisee', 50, { course: { depart: 'Orly', arrivee: 'Paris', date: ilYa(10), heure: '10:00', vehicule: 'Berline' } }),
  /* Venue par le lien il y a 40 jours : hors des « 30 derniers jours », elle
     ne compte ni dans les demandes, ni dans l'argent de la ligne. */
  course('ELA-26-10-LG7GG', 'realisee', 300, { via: 'hotel-exemple', viaNom: 'Hôtel Exemple Roissy', provenance: 'Lien · Hôtel Exemple Roissy',
    course: { depart: 'Terminal 2E', arrivee: 'Paris 8e', date: ilYa(40), heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers' } }),
];
let LIENS = [{ code: 'fiche-hotels', nom: 'Fiche papier remise aux hôtels', cree_le: '2026-10-15T00:00:00Z' },
             { code: 'hotel-exemple', nom: 'Hôtel Exemple Roissy', cree_le: '2026-10-15T01:00:00Z' }];
const MESURE = [{ source: 'hotel-exemple', evenement: 'page_vue', nombre: 12 },
                { source: 'hotel-exemple', evenement: 'clic_reserver', nombre: 3 },
                { source: 'hotel-exemple', evenement: 'clic_appel', nombre: 1 }];
const crees = [];
async function admin({ lienAvis = 'https://g.page/r/exemple/review', mesureEnPanne = false, liensServeur = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: SITE });
  await ctx.addInitScript(([lien]) => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    if (lien) localStorage.setItem('ela_lien_avis', lien); else localStorage.removeItem('ela_lien_avis');
    window.__ouverts = []; window.open = (u) => { window.__ouverts.push(String(u)); return null; };
  }, [lienAvis]);
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(SITE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/ela_mesures_liens')) return mesureEnPanne ? route.fulfill(J({ message: 'absente' }, 404)) : route.fulfill(J(MESURE));
    /* La vérité serveur des liens (20/10/2026) : absente par défaut (migration
       pas appliquée → l'appareil compte), posée par le bloc qui l'éprouve. */
    if (u.includes('/rpc/ela_liens_resultats')) return liensServeur ? route.fulfill(J(liensServeur)) : route.fulfill(J({ message: 'absente' }, 404));
    if (u.includes('/rest/v1/liens_suivi') && m === 'POST') {
      const c = JSON.parse(req.postData() || '{}'); crees.push(c);
      if (LIENS.some(l => l.code === c.code)) return route.fulfill(J({ code: '23505' }, 409));
      const l = { code: c.code, nom: c.nom, cree_le: new Date().toISOString() }; LIENS.push(l);
      return route.fulfill(J([l], 201));
    }
    if (u.includes('/rest/v1/liens_suivi')) return route.fulfill(J(LIENS));
    if (u.includes('/rest/v1/prospects')) return route.fulfill(J([{ via: 'fiche-hotels' }, { via: 'fiche-hotels' }]));
    if (u.includes('/rest/v1/courses?select=ref&') || u.includes('/rest/v1/courses?select=ref,version&')) return route.fulfill(J([{ ref: COURSES[0].ref }]));
    if (u.includes('/rest/v1/courses')) return route.fulfill(J(COURSES.map(bon => ({ bon, statut: bon.statut }))));
    if (u.includes('/rest/v1/')) return route.fulfill(J([]));
    return route.fulfill(J({}));
  });
  await p.goto(SITE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 10000 });
  await p.waitForFunction(() => document.querySelectorAll('.demande').length >= 1, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(300);
  return { ctx, p, erreurs };
}
const lignesLiens = p => p.$$eval('#regLiens .reg-lien', ls => ls.map(l => ({
  nom: l.querySelector('.reg-nom')?.firstChild?.textContent.trim(),
  sous: [...l.querySelectorAll('.reg-sous')].map(s => s.textContent.trim()),
  val: l.querySelector('.reg-val')?.firstChild?.textContent.trim() })));

try {
  /* 4. LE RAPPEL D'AVIS — sur le tableau de bord, avant d'ouvrir le registre. */
  {
    const { ctx, p } = await admin();
    const avis = await p.evaluate(() => ({ vu: !document.getElementById('bordAvis').hidden, texte: document.getElementById('bordAvisTexte').textContent }));
    /* Cette semaine, réalisées, avec numéro, sans demande, hors essai :
       LA1AA et LD4DD. LE5EE a déjà sa demande, LF6FF date de 10 jours,
       LC3CC est une course d'essai, LB2BB n'est pas réalisée. */
    check('avis : le rappel compte les 2 clients de la semaine sans demande', avis.vu && /^2 clients de la semaine sans demande d'avis/.test(avis.texte), JSON.stringify(avis));
    check('avis : il dit la règle — demander à tous, et le « : » ne part jamais seul en début de ligne', /\u00a0: demandez à tous\.$/.test(avis.texte), avis.texte);
    /* LE BUDGET DE L'ÉCRAN (relecture du 15/10/2026, mesuré : 878 px sur 844
       quand il s'ajoutait à trois écriteaux). Avec le son coupé et le rappel
       de sauvegarde affichés, la première demande en attente finit dans
       l'écran ; dès qu'un écriteau urgent apparaît, le rappel s'efface. */
    const budget = await p.evaluate(() => {
      const montre = id => { const e = document.getElementById(id); e.hidden = false; if (!e.textContent.trim()) e.textContent = 'écriteau'; };
      montre('sonCoupe'); montre('bordSauvegarde');
      const avis = document.getElementById('bordAvis');
      const visible = () => getComputedStyle(avis).display !== 'none' && avis.getClientRects().length > 0;
      const carte = document.querySelector('#listeBord .demande.attente');
      const r = carte && carte.getBoundingClientRect();
      const avant = { visible: visible(), bas: r ? Math.round(r.bottom) : null, vue: innerHeight };
      montre('bordSansChauffeur');
      const pendant = visible();
      document.getElementById('bordSansChauffeur').hidden = true;
      return { avant, pendant, apres: visible() };
    });
    check('avis : avec le son coupé et le rappel de sauvegarde, il reste affiché et la première demande en attente finit dans l\'écran', budget.avant.visible && budget.avant.bas !== null && budget.avant.bas <= budget.avant.vue, JSON.stringify(budget.avant));
    check('avis : dès qu\'un écriteau urgent s\'affiche (« sans chauffeur »), le rappel s\'efface — et revient quand il disparaît', budget.pendant === false && budget.apres === true, JSON.stringify(budget));
    await p.evaluate(() => { document.getElementById('sonCoupe').hidden = true; document.getElementById('bordSauvegarde').hidden = true; });
    await p.click('#btnBordAvis');
    await p.waitForTimeout(400);
    const filtre = await p.evaluate(() => [...document.querySelectorAll('#listeBord .demande')].length);
    check('avis : « Voir » emmène aux courses réalisées, où se trouve le bouton', filtre >= 2 && await p.locator('#listeBord .d-avis').count() >= 2, String(filtre));
    /* On appuie sur celle d'une course QUI COMPTE (LA1AA, « Client AA ») :
       la première venue pourrait être la course d'essai ou celle d'il y a
       dix jours, qui ne sont pas dans le rappel. */
    const carte = p.locator('#listeBord .demande', { hasText: 'Client AA' });
    check('avis : la course de la semaine porte le bouton', await carte.locator('.d-avis:not(.fait)').count() === 1);
    await carte.locator('.d-avis:not(.fait)').click();
    await p.waitForTimeout(400);
    const apres = await p.evaluate(() => document.getElementById('bordAvisTexte').textContent);
    check('avis : une demande envoyée fait baisser le compte', /^1 client de la semaine sans demande d'avis/.test(apres), apres);
    await ctx.close();
  }
  {
    const { ctx, p } = await admin({ lienAvis: '' });
    check('avis : sans lien d\'avis réglé, aucun rappel (il ne mènerait nulle part)', await p.evaluate(() => document.getElementById('bordAvis').hidden));
    await ctx.close();
  }

  /* 3. LES LIENS DES PARTENAIRES */
  {
    const { ctx, p, erreurs } = await admin();
    await p.click('#btnRegistre');
    await p.waitForFunction(() => document.querySelectorAll('#regLiens .reg-lien').length >= 2, null, { timeout: 8000 }).catch(() => {});
    const ls = await lignesLiens(p);
    const exemple = ls.find(l => l.nom === 'Hôtel Exemple Roissy') || { sous: [] };
    check('liens : les deux liens du serveur s\'affichent, le plus utile en tête', ls.length === 2 && ls[0].nom === 'Hôtel Exemple Roissy', JSON.stringify(ls));
    check('liens : le compteur AVANT la demande (12 vues, 3 « Book », 1 appel)', /12 vues/.test(exemple.sous[0]) && /3 « Book »/.test(exemple.sous[0]) && /1 appel/.test(exemple.sous[0]), exemple.sous[0]);
    check('liens : 2 demandes, 1 réalisée — ni la course d\'essai, ni celle d\'il y a 40 jours', /2 demandes/.test(exemple.sous[0]) && /1 réalisée/.test(exemple.sous[0]), exemple.sous[0]);
    check('liens : sans la fonction du serveur, l\'écran dit que l\'appareil a compté', /calculés sur cet appareil/.test(await p.textContent('#regLiensEtat')));
    check('liens : l\'argent ne compte que la réalisée des 30 jours (80 €, ni 999, ni 300)', /^80\s?€$/.test(exemple.val || ''), exemple.val);
    check('liens : le code est écrit sous le nom', exemple.sous[1] === 'Code : hotel-exemple', exemple.sous[1]);
    const fiche = ls.find(l => l.nom === 'Fiche papier remise aux hôtels') || { sous: [] };
    check('liens : la fiche papier compte ses demandes de démo, et ne s\'invente pas de vues', fiche.sous[0] === '2 demandes de démo · 0 demande · 0 confirmée · 0 réalisée', fiche.sous[0]);

    /* LA VÉRITÉ SERVEUR (20/10/2026) : le serveur compte 5 demandes, 3
       confirmées, 2 réalisées pour 170 € — l'appareil n'en connaît que 2 et 80 €.
       L'écran doit dire ce que dit le serveur. */
    {
      const s2 = await admin({ liensServeur: [{ code: 'hotel-exemple', demandes: 5, confirmees: 3, realisees: 2, chiffre: 170 }] });
      await s2.p.click('#btnRegistre');
      await s2.p.waitForFunction(() => /comptés sur le serveur/.test(document.getElementById('regLiensEtat').textContent), null, { timeout: 8000 }).catch(() => {});
      const ls2 = await lignesLiens(s2.p);
      const ex2 = ls2.find(l => l.nom === 'Hôtel Exemple Roissy') || { sous: [] };
      check('liens (serveur) : 5 demandes · 3 confirmées · 2 réalisées, pas les 2 demandes de l\'appareil',
        /5 demandes · 3 confirmées · 2 réalisées/.test(ex2.sous[0] || ''), ex2.sous[0]);
      check('liens (serveur) : l\'argent est celui du serveur (170 €)', /^170\s?€$/.test(ex2.val || ''), ex2.val);
      check('liens (serveur) : un lien que le serveur ne cite pas vaut zéro, pas le chiffre de l\'appareil',
        /0 demande · 0 confirmée · 0 réalisée/.test((ls2.find(l => l.nom === 'Fiche papier remise aux hôtels') || { sous: [''] }).sous[0]));
      check('liens (serveur) : la note distingue estimations et vérité serveur',
        /Vues et clics : estimations/.test(await s2.p.textContent('#regLiensEtat')));
      check('liens (serveur) : aucune erreur JavaScript', s2.erreurs.length === 0, s2.erreurs.join(' | '));
      await s2.ctx.close();
    }

    /* Copier le lien de la page choisie. */
    await p.selectOption('#lienPage', '/en/cdg-airport-transfer-paris/');
    await p.locator('#regLiens .reg-lien', { hasText: 'Exemple' }).locator('button').click();
    await p.waitForTimeout(300);
    const attendu = 'https://elatransfer.com/en/cdg-airport-transfer-paris/?via=hotel-exemple';
    const note = await p.textContent('#lienCopie');
    const presse = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    check('copier : le lien de la page choisie est écrit en clair', note.includes(attendu), note);
    check('copier : … et il est dans le presse-papiers', presse === attendu, presse);

    /* Le bouton « Copier » se presse au pouce : 44 px, et c'est bien lui qui reçoit le doigt. */
    const geste = await p.evaluate(() => {
      const btn = document.querySelector('#regLiens .reg-lien button');
      btn.scrollIntoView({ block: 'center' });
      const r = btn.getBoundingClientRect();
      const sous = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { h: Math.round(r.height), recoit: sous === btn || btn.contains(sous),
               deborde: document.documentElement.scrollWidth > window.innerWidth };
    });
    check('copier : 44 px de haut, et rien ne le recouvre', geste.h >= 44 && geste.recoit, JSON.stringify(geste));
    check('registre : aucun débordement horizontal à 390 px', !geste.deborde, JSON.stringify(geste));

    /* Créer un lien : le code se propose depuis le nom, sans accent ni espace. */
    await p.fill('#lienNom', 'Office de tourisme Grand Roissy — Pays de France');
    const propose = await p.inputValue('#lienCode');
    check('créer : le code se propose depuis le nom (minuscules, tirets, 40 au plus)', propose === 'office-de-tourisme-grand-roissy-pays-de' && propose.length <= 40, propose);
    await p.fill('#lienCode', 'grand-roissy-tourisme');
    await p.click('#btnLienCreer');
    await p.waitForFunction(() => [...document.querySelectorAll('#regLiens .reg-lien')].some(l => /Grand Roissy/.test(l.textContent)), null, { timeout: 5000 }).catch(() => {});
    const dernier = crees[crees.length - 1] || {};
    check('créer : le lien part au serveur avec le code choisi et le nom', dernier.code === 'grand-roissy-tourisme' && /^Office de tourisme Grand Roissy/.test(dernier.nom), JSON.stringify(dernier));
    check('créer : il apparaît dans la liste', (await lignesLiens(p)).some(l => /Grand Roissy/.test(l.nom)));
    check('créer : les champs sont vidés pour le suivant', await p.inputValue('#lienNom') === '' && await p.inputValue('#lienCode') === '');

    const n0 = crees.length;
    await p.fill('#lienNom', 'Agence X'); await p.fill('#lienCode', 'Agence X');
    await p.click('#btnLienCreer'); await p.waitForTimeout(300);
    check('créer : un code avec espace ou majuscule est refusé AVANT le serveur', crees.length === n0 && /minuscules/.test(await p.textContent('#lienEtat')), await p.textContent('#lienEtat'));
    await p.fill('#lienCode', 'hotel-exemple');
    await p.click('#btnLienCreer'); await p.waitForTimeout(500);
    check('créer : un code déjà pris est dit tel quel', /existe déjà/.test(await p.textContent('#lienEtat')), await p.textContent('#lienEtat'));
    check('admin : aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  }
  {
    /* Le compteur absent (migration pas encore appliquée) : la liste
       s'affiche quand même, avec les seules demandes — jamais un zéro inventé. */
    const { ctx, p } = await admin({ mesureEnPanne: true });
    await p.click('#btnRegistre');
    await p.waitForFunction(() => document.querySelectorAll('#regLiens .reg-lien').length >= 1, null, { timeout: 8000 }).catch(() => {});
    const ls = await lignesLiens(p);
    const exemple = ls.find(l => l.nom === 'Hôtel Exemple Roissy') || { sous: [] };
    const etat = await p.textContent('#regLiensEtat');
    check('compteur muet : la liste reste, sans vues inventées', ls.length >= 2 && !/vue/.test(exemple.sous[0]) && /2 demandes/.test(exemple.sous[0]), JSON.stringify(exemple));
    check('compteur muet : la note le dit', /pas lisibles pour l'instant/.test(etat), etat);
    await ctx.close();
  }
} finally {
  await b.close();
  serveur.close();
}

/* 15/10/2026 — LA MESURE N'A QU'UNE PORTE, ET RIEN NE LA DÉSIGNE QUI. */
check('mesure : plus aucun appel à l\'ancienne porte (rpc/ela_mesurer)', anciens.length === 0, String(anciens.length));
check('mesure : des gestes ont bien été envoyés (sinon rien ne serait éprouvé)', bruts.length > 0, String(bruts.length));
check('mesure : aucun identifiant, cookie ni donnée personnelle dans ce qui part',
  bruts.every(c => !['session', 'visiteur', 'id', 'nom', 'telephone', 'email', 'ip'].some(k => k in c)),
  JSON.stringify(bruts.find(c => ['session', 'visiteur', 'id', 'nom', 'telephone', 'email', 'ip'].some(k => k in c)) || {}));
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✓ ' + t));
if (ko.length) {
  console.log('\n=== ÉCHECS (' + ko.length + ') ===');
  ko.forEach(t => console.log('  ✗ ' + t));
  process.exit(1);
}
