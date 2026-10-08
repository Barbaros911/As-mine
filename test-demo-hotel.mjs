/* =====================================================================
   LA DÉMO DES PROFESSIONNELS — /demo/hotel/, SUR LE SITE CONSTRUIT
   ---------------------------------------------------------------------
   Octobre 2026, mission « Démo professionnels », bloc 3. Un prospect qui a
   rempli le formulaire de /professionnels/ ouvre une démo à son nom : il
   réserve comme un client, et voit la course arriver chez sa réception.

   LA RÈGLE ABSOLUE : la démo est INCAPABLE de toucher la production. Trois
   défenses, éprouvées ici SÉPARÉMENT :
     1. la règle CSP de la page (et la même dans _headers) — un appel tapé à
        la main vers Supabase est refusé PAR LE NAVIGATEUR ;
     2. verifier-demo.mjs — on pose un mot interdit dans une copie du site,
        la vérification doit tomber, mot par mot ;
     3. ce que fait la page — aucune requête vers Supabase hors demande-demo,
        même en appelant à la main les fonctions de réservation, et aucun
        paramètre d'adresse n'y change rien.
   Le serveur demande-demo est simulé (route Playwright) : la suite ne
   touche aucun réseau.
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, cpSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';

execSync('sh construire.sh', { cwd: process.cwd(), stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8141, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8141';
setTimeout(() => { console.log('=== ÉCHECS (1) ===\n  ✘ la suite ne répond plus'); process.exit(1); }, 300000).unref();

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const SUPA = 'yyhzutnuhuytokarynaw.supabase.co';
const DEMANDE = `https://${SUPA}/functions/v1/demande-demo`;

const b = await chromium.launch();

/* Une page de démo, avec un faux demande-demo. `reponse` : objet rendu par
   « ouvrir », ou un statut (401, 503), ou « muet » (le réseau tombe). */
async function ouvrir({ w = 390, h = 844, session = 's.test', reponse = {}, chemin = '/demo/hotel/', locale = 'fr-FR' } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale });
  if (session !== null) await ctx.addInitScript((s) => { try { if (!sessionStorage.getItem('__pose')) { localStorage.setItem('ela_demo_session', s); sessionStorage.setItem('__pose', '1'); } } catch (e) {} }, session);
  const p = await ctx.newPage();
  p.errs = []; p.supabase = []; p.appels = []; p.violations = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.exposeFunction('__violation', v => p.violations.push(v));
  await p.addInitScript(() => document.addEventListener('securitypolicyviolation', e => window.__violation(e.blockedURI + ' ' + e.violatedDirective)));
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes(SUPA)) {
      if (u === DEMANDE) {
        let corps = {}; try { corps = JSON.parse(r.request().postData() || '{}'); } catch {}
        p.appels.push(corps);
        if (reponse === 'muet') return r.abort();
        if (typeof reponse === 'number') return r.fulfill({ status: reponse, contentType: 'application/json', body: JSON.stringify({ erreur: 'session' }) });
        return r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, etablissement: 'Hôtel Ibis Roissy', type: 'hotel', expire: new Date(Date.now() + 6048e5).toISOString(), ...reponse }) });
      }
      p.supabase.push(u);
      return r.abort();
    }
    if (u.includes('api-adresse.data.gouv.fr') && decodeURIComponent(u).toLowerCase().includes('stade'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ features: [{ geometry: { coordinates: [2.3601, 48.9245] }, properties: { label: 'Stade de France, 93200 Saint-Denis', type: 'poi', score: 0.9 } }] }) });
    if (u.includes('photon.komoot.io') || u.includes('api-adresse.data.gouv.fr'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ features: [] }) });
    if (u.includes('router.project-osrm.org'))
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ routes: [{ distance: 9000, duration: 900 }] }) });
    return r.abort();
  });
  await p.goto(BASE + chemin);
  await p.waitForTimeout(1200);
  return { ctx, p };
}
const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const texte = (p, sel) => p.evaluate(s => document.querySelector(s)?.textContent || '', sel);

/* ═══ 1. LE NOM VIENT DE LA RÉPONSE, EN TEXTE ═══ */
{
  const { ctx, p } = await ouvrir();
  check('la démo s\'ouvre avec une session valable', await visible(p, '#hotelTete'));
  check('le nom rendu par « ouvrir » est affiché', (await texte(p, '#hotelTeteNom')) === 'Hôtel Ibis Roissy', await texte(p, '#hotelTeteNom'));
  check('un rond porte les initiales, pas un logo', (await texte(p, '.demo-initiales')) === 'HI', await texte(p, '.demo-initiales'));
  check('la zone photo dit « Votre photo ici »', (await texte(p, '#demoPhotoTexte')) === 'Votre photo ici');
  check('la pastille dit que les prix sont ceux du flyer', /Vos prix : ceux de votre flyer/.test(await texte(p, '#demoExemple')));
  check('le bandeau dit « Démonstration — aucune réservation réelle »', (await texte(p, '#demoBandeau')) === 'Démonstration — aucune réservation réelle');
  check('les deux onglets sont là', (await texte(p, '#demoOngletClient')) === 'Ce que voit votre client' && (await texte(p, '#demoOngletReception')) === 'Ce que voit votre réception');
  check('le bandeau reste en haut après défilement', await p.evaluate(() => { scrollTo(0, 900); const r = document.getElementById('demoBandeau').getBoundingClientRect(); return r.top <= 1 && r.bottom > 10; }));
  check('« ouvrir » est appelé avec la session et sans clé Supabase', p.appels.length >= 1 && p.appels[0].action === 'ouvrir' && p.appels[0].session === 's.test' && !JSON.stringify(p.appels).includes('apikey'));
  check('un QR code mène à la page des professionnels', await p.evaluate(() => !!document.querySelector('#demoQr svg')));
  check('les forfaits ne sont pas ceux d\'un partenaire réel', !/easyhotel/i.test(await p.content()));
  check('aucune erreur JavaScript à l\'ouverture', p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: { etablissement: '' } });
  check('nom vide → « Hôtel Démo · Roissy »', (await texte(p, '#hotelTeteNom')) === 'Hôtel Démo · Roissy', await texte(p, '#hotelTeteNom'));
  await ctx.close();
}
{
  const piege = '<img src=x onerror="window.__pirate=1">Hôtel <b>Gras</b>';
  const { ctx, p } = await ouvrir({ reponse: { etablissement: piege } });
  check('un nom à chevrons s\'affiche en texte', (await texte(p, '#hotelTeteNom')) === piege.slice(0, 60), await texte(p, '#hotelTeteNom'));
  check('… et n\'injecte aucun élément', await p.evaluate(() => !window.__pirate && !document.querySelector('#hotelTete img, #hotelTete b')));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: { type: 'agence', etablissement: 'Voyages Martin' } });
  check('agence → « Ce que voit votre équipe »', (await texte(p, '#demoOngletReception')) === 'Ce que voit votre équipe');
  await ctx.close();
}

/* ═══ 2. L'ACCÈS EST FERMÉ PAR DÉFAUT ═══ */
{
  const { ctx, p } = await ouvrir({ session: null });
  check('sans session → retour au formulaire', p.url().endsWith('/professionnels/#demo'), p.url());
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: 401 });
  check('session refusée → retour au formulaire', p.url().endsWith('/professionnels/#demo'), p.url());
  check('… et la session refusée est oubliée', await p.evaluate(() => localStorage.getItem('ela_demo_session') === null));
  await ctx.close();
}
/* 403 « origine » et 413 « taille » (contrat du bloc 2) : un refus, jamais la démo. */
for (const panne of ['muet', 503, 403, 413, 429]) {
  const { ctx, p } = await ouvrir({ reponse: panne });
  check(`serveur ${panne} → « Démonstration momentanément indisponible »`, /Démonstration momentanément indisponible/.test(await texte(p, '#demoIndispo')) && await visible(p, '#demoIndispo'));
  check(`serveur ${panne} → un contact est proposé`, await p.evaluate(() => !!document.querySelector('#demoIndispo a[href="/professionnels/#contact"]')));
  check(`serveur ${panne} → la démo n'est jamais montrée`, !(await visible(p, '#hotelTete')) && !(await visible(p, '#btnVoirPrix')));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir({ reponse: 'muet', chemin: '/demo/hotel/reception/' });
  check('réception, serveur muet → fermée aussi', await visible(p, '#demoIndispo') && !(await visible(p, '#recCorps')));
  await ctx.close();
}

/* ═══ 3. LE PARCOURS CLIENT → RÉCEPTION ═══ */
{
  const { ctx, p } = await ouvrir();
  /* LA PAGE D'ARRIVÉE : les cartes d'abord, le formulaire ensuite. */
  check('arrivée : « Où souhaitez-vous aller ? » et les cartes à l\'ouverture', /Où souhaitez-vous aller/.test(await texte(p, '#demoCartes')) && await visible(p, '.demo-carte[data-dest="cdg"]'));
  check('arrivée : le formulaire attend qu\'on choisisse', !(await visible(p, '#btnVoirPrix')));
  check('arrivée : une carte par destination, plus « Autre destination »',
    await p.evaluate(() => document.querySelectorAll('.demo-carte').length === document.querySelectorAll('#hotelDest option').length));
  /* AUCUN PRIX PROPOSÉ (8/10/2026) : l'hôtel fixe les siens, ceux de son flyer. */
  check('arrivée : aucun prix proposé, toutes les cartes disent « à fixer »', await p.evaluate(() =>
    [...document.querySelectorAll('.demo-carte:not(.demo-autre)')].every(c => /à fixer[\s\S]*à fixer/.test(c.innerText) && !/\d+,\d\d\s€/.test(c.innerText))));
  check('arrivée : une consigne dit de toucher une destination pour continuer', /Touchez une destination/.test(await texte(p, '#demoCartesAide')) && await visible(p, '#demoCartesAide'));
  check('arrivée : la page dit que ces prix sont ceux du flyer et de son QR code', /ceux de votre flyer[\s\S]*QR code/.test(await texte(p, '#demoCartesFlyer')));
  check('arrivée : aucun prix proposé dans « Vos prix »', await p.evaluate(() => [...document.querySelectorAll('#demoPrixTable input')].every(i => i.value === '')));
  await p.click('.demo-carte[data-dest="orly"]'); await p.waitForTimeout(400);
  check('arrivée : une carte ouvre le formulaire sur SA destination', (await p.inputValue('#hotelDest')) === 'orly' && await visible(p, '#btnVoirPrix'));
  check('arrivée : « Toutes les destinations » est à l\'écran après le choix', await p.evaluate(() => { const r = document.getElementById('demoRetourCartes').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height > 0; }));
  await p.click('#demoRetourCartes'); await p.waitForTimeout(300);
  check('arrivée : « Toutes les destinations » ramène aux cartes', await visible(p, '.demo-carte[data-dest="cdg"]') && !(await visible(p, '#btnVoirPrix')));
  await p.click('.demo-autre'); await p.waitForTimeout(300);
  check('arrivée : « Autre destination » ouvre le formulaire sans forfait', (await p.inputValue('#hotelDest')) === '' && await visible(p, '#btnVoirPrix'));
  await p.click('#demoRetourCartes'); await p.waitForTimeout(200);
  await p.click('.demo-carte[data-dest="cdg"]'); await p.waitForTimeout(300);
  await p.click('#btnVoirPrix');
  await p.waitForSelector('.veh-carte', { timeout: 8000 });
  await p.locator('.veh-carte').first().click();
  await p.locator('#ecran-vehicules .veh-action .bouton').first().click();
  await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.locator('[data-paiement="carte"]').click();
  await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const x = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (x) x.click(); });
  await p.locator('#btnConfirmer').click();
  await p.waitForTimeout(800);
  check('la réservation d\'essai ouvre le bon « Demande reçue »', (await texte(p, '#bonEtat')) === 'Demande reçue', await texte(p, '#bonEtat'));
  check('le suivi de la démo apparaît', await visible(p, '#demoSuivi'));
  const ref = await p.evaluate(() => document.querySelector('.demo-suivi-titre').textContent.split('· ')[1]);
  await p.click('#demoSuivi .demo-suivant');
  check('« Étape suivante » → Chauffeur recherché', (await texte(p, '.demo-etapes li.en-cours')) === 'Chauffeur recherché');
  await p.click('#demoSuivi .demo-suivant');
  await p.waitForTimeout(1600);
  check('… → Chauffeur confirmé, et le bon passe au vert', (await texte(p, '#bonEtat')) === 'Transfert confirmé' && /fictif/.test(await texte(p, '#bonChauffeur')), await texte(p, '#bonEtat'));
  check('aucune application ne s\'ouvre (WhatsApp…)', await p.evaluate(() => window.open('https://example.org') === null));
  check('le vrai stockage du site n\'a reçu aucune course', await p.evaluate(() => localStorage.getItem('ela_courses') === null));

  await p.click('#demoOngletReception');
  await p.waitForURL(/\/demo\/hotel\/reception\/$/); await p.waitForTimeout(1500);
  check('la réception s\'ouvre sans code', await visible(p, '#recCorps') && !(await visible(p, '#recVerrou')));
  check('la course du client apparaît chez la réception', await p.evaluate(r => document.body.innerText.includes('Jean Martin') && document.body.innerText.includes(r), ref));
  check('des courses fictives sont préremplies', await p.evaluate(() => document.body.innerText.includes('Mme Laurent (exemple)')));
  check('les courses d\'exemple ne portent aucun prix proposé', await p.evaluate(() => {
    const t = document.getElementById('ecran-reception').innerText; return !/(45|65|85|125|75|115),00\s€/.test(t); }));
  await p.click('#demoSuivi .demo-suivant');
  await p.waitForTimeout(800);
  check('… → Effectuée, et la fin propose « Mettre ça en place »', (await texte(p, '.demo-etapes li.en-cours')) === 'Effectuée'
    && await visible(p, '#demoMettreEnPlace') && (await p.getAttribute('#demoMettreEnPlace', 'href')) === '/professionnels/#contact');
  await p.click('#demoOngletClient'); await p.waitForURL(/\/demo\/hotel\/$/); await p.waitForTimeout(800);
  check('retour à la vue client par l\'onglet', await visible(p, '#hotelTete'));
  /* EN ANGLAIS */
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(300);
  check('en anglais, les cartes suivent', /Tap a destination/.test(await texte(p, '#demoCartesAide')) && /Where would you like to go/.test(await texte(p, '#demoCartes')) && /Sedan/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  check('en anglais, le cadre de la démo suit', (await texte(p, '#demoBandeau')) === 'Demo — no real booking' && (await texte(p, '#demoOngletClient')) === 'What your guest sees');
  check('aucune erreur JavaScript sur le parcours', p.errs.length === 0, p.errs.join(' ; '));
  check('aucun appel à Supabase hors demande-demo sur le parcours', p.supabase.length === 0, p.supabase.join(' '));
  /* La page ne doit même pas ESSAYER : une tentative bloquée par la CSP
     serait une défense 3 cassée que la défense 1 cache. */
  check('la page ne tente aucune connexion interdite sur le parcours', p.violations.length === 0, p.violations.join(' | '));
  await ctx.close();
}

/* ═══ 3 bis. LA RÉCEPTION RÉSERVE ELLE-MÊME, ET LA COURSE ARRIVE DANS SA LISTE ═══ */
{
  const { ctx, p } = await ouvrir({ chemin: '/demo/hotel/reception/' });
  await p.click('#btnRecReserver'); await p.waitForTimeout(500);
  await p.fill('#chambre', '412');
  await p.waitForSelector('.veh-carte', { timeout: 8000 });
  await p.locator('.veh-carte').first().click();
  await p.locator('[data-paiement="especes"]').click();
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(900);
  check('comptoir : la réservation ouvre le bon', await visible(p, '#ecran-bon'));
  check('comptoir : le suivi de la démo apparaît', await visible(p, '#demoSuivi'));
  await p.click('#demoOngletReception'); await p.waitForTimeout(1500);
  check('comptoir : la course apparaît dans la liste de la réception', await p.evaluate(() => /Chambre 412/.test(document.getElementById('ecran-reception').innerText)));
  check('comptoir : aucune erreur JavaScript', p.errs.length === 0, p.errs.join(' ; '));
  check('comptoir : aucune connexion interdite tentée', p.violations.length === 0 && p.supabase.length === 0, p.violations.concat(p.supabase).join(' | '));
  await ctx.close();
}

/* ═══ 3 ter. LA PERSONNALISATION — nom, couleur, photo, message, destination ═══ */
{
  const { ctx, p } = await ouvrir();
  await p.click('#demoPerso summary');
  const piege = 'Le Relais <img src=x onerror="window.__pirate=1">';
  await p.fill('#demoPersoNom', piege);
  check('perso : le nom saisi remplace celui de l\'en-tête, en texte', (await texte(p, '#hotelTeteNom')) === piege && await p.evaluate(() => !window.__pirate && !document.querySelector('#hotelTete img')));
  check('perso : les initiales sautent les articles', (await texte(p, '.demo-initiales')) === 'RI', await texte(p, '.demo-initiales'));
  check('perso : le départ du formulaire porte le nouveau nom', (await p.inputValue('#depart')).startsWith(piege));
  /* Un jaune pâle : le bouton doit rester lisible (blanc à 4,5:1 au moins). */
  await p.evaluate(() => { const c = document.getElementById('demoPersoCouleur'); c.value = '#ffe14d'; c.dispatchEvent(new Event('input', { bubbles: true })); });
  const ratio = await p.evaluate(() => {
    const rvb = getComputedStyle(document.getElementById('btnVoirPrix')).backgroundColor.match(/\d+/g).map(Number);
    const l = c => { const t = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * t[0] + .7152 * t[1] + .0722 * t[2]; };
    return 1.05 / (l(rvb) + .05);
  });
  check('perso : un jaune pâle donne un bouton lisible (≥ 4,5:1 avec le blanc)', ratio >= 4.5, ratio.toFixed(2));
  await p.click('.demo-pastille[data-couleur="#8B1E3F"]');
  check('perso : une pastille du nuancier repeint le bouton', (await p.evaluate(() => getComputedStyle(document.getElementById('btnVoirPrix')).backgroundColor)) === 'rgb(139, 30, 63)');
  check('perso : le cadre de la démo garde le bleu Elatransfer', (await p.evaluate(() => getComputedStyle(document.querySelector('.demo-cadre')).backgroundColor)) === 'rgb(6, 47, 85)');
  /* Une photo : générée dans la page, déposée dans le champ. */
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1400; c.height = 900; const g = c.getContext('2d'); g.fillStyle = '#7799bb'; g.fillRect(0, 0, 1400, 900); return c.toDataURL('image/png').split(',')[1]; });
  await p.setInputFiles('#demoPersoPhoto', { name: 'hotel.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await p.waitForTimeout(800);
  check('perso : la photo s\'affiche dans le cadre', await p.evaluate(() => /url\("data:image\/jpeg/.test(document.querySelector('.demo-photo').style.backgroundImage)));
  check('perso : … réduite à 1000 px au plus', await p.evaluate(() => new Promise(ok => { const i = new Image(); i.onload = () => ok(Math.max(i.width, i.height) <= 1000); i.src = document.querySelector('.demo-photo').style.backgroundImage.slice(5, -2); })));
  await p.fill('#demoPersoMessage', 'Bienvenue <b>chez nous</b>');
  check('perso : le message d\'accueil s\'affiche, en texte', (await texte(p, '#demoMessage')) === 'Bienvenue <b>chez nous</b>' && await visible(p, '#demoMessage'));
  await p.fill('#demoDestNom', 'Stade de France'); await p.fill('#demoDestBerline', '60'); await p.fill('#demoDestVan', '90');
  await p.click('#demoDestAjouter'); await p.waitForTimeout(900);
  check('perso : la destination ajoutée entre dans le menu', await p.evaluate(() => [...document.querySelectorAll('#hotelDest option')].some(o => o.textContent === 'Stade de France')));
  await p.fill('#demoDestNom', 'Gare du Nord'); await p.fill('#demoDestBerline', '0'); await p.fill('#demoDestVan', '50'); await p.click('#demoDestAjouter');
  check('perso : un prix à 0 € est refusé, et on dit pourquoi', /entre 1 et 2 000/.test(await texte(p, '#demoPersoEtat')));
  await p.click('#demoPersoVoir');
  check('perso : « Voir ma page » referme le panneau', !(await p.evaluate(() => document.getElementById('demoPerso').open)));
  check('perso : la destination ajoutée a sa carte, avec ses prix', /Stade de France[\s\S]*60,00\s€[\s\S]*90,00\s€/.test(await texte(p, '.demo-carte[data-dest^="perso-"]')));
  /* Le prix fixé dans « Vos prix » passe sur la carte, puis au formulaire. */
  await p.click('#demoPerso summary');
  await p.fill('#demoPrixTable input[data-cle="cdg"][data-gamme="berline"]', '52'); await p.press('#demoPrixTable input[data-cle="cdg"][data-gamme="berline"]', 'Tab');
  await p.waitForTimeout(200);
  check('perso : un prix fixé dans « Vos prix » passe sur la carte', /52,00\s€[\s\S]*à fixer/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  await p.fill('#demoPrixTable input[data-cle="cdg"][data-gamme="van"]', '0'); await p.press('#demoPrixTable input[data-cle="cdg"][data-gamme="van"]', 'Tab');
  check('perso : « Vos prix » refuse un prix à 0 €', /entre 1 et 2 000/.test(await texte(p, '#demoPersoEtat')) && /à fixer/.test(await texte(p, '.demo-carte[data-dest="cdg"]')));
  await p.click('#demoPersoVoir');
  await p.click('.demo-carte[data-dest^="perso-"]'); await p.waitForTimeout(400);
  check('perso : son forfait s\'affiche avec la destination', (await p.inputValue('#hotelDest')).startsWith('perso-') && /60,00\s€.*90,00\s€/.test(await p.evaluate(() => document.body.innerText)));
  check('perso : le vrai stockage du site n\'a rien reçu', await p.evaluate(() => Object.keys(localStorage).every(k => k === 'ela_demo_session' || k.startsWith('ela_demo__'))));
  check('perso : aucune connexion interdite tentée', p.violations.length === 0 && p.supabase.length === 0, p.violations.concat(p.supabase).join(' | '));
  await p.click('#demoOngletReception'); await p.waitForURL(/reception\/$/); await p.waitForTimeout(1200);
  check('perso : la réception porte le même nom', (await texte(p, '#recHotel')) === piege);
  check('perso : … et la même couleur', (await p.evaluate(() => getComputedStyle(document.getElementById('btnRecReserver')).backgroundColor)) === 'rgb(139, 30, 63)');
  await p.click('#demoPerso summary'); await p.click('#demoPersoRaz'); await p.waitForTimeout(300);
  check('perso : « Revenir à la page d\'origine » rend le nom d\'origine', (await texte(p, '#recHotel')) === 'Hôtel Ibis Roissy');
  check('perso : … et le bleu d\'origine', (await p.evaluate(() => getComputedStyle(document.getElementById('btnRecReserver')).backgroundColor)) === 'rgb(14, 111, 199)');
  /* En anglais, le panneau suit. */
  await p.click('.langues [data-langue="en"]'); await p.waitForTimeout(300);
  check('perso : en anglais, le panneau suit', (await texte(p, '#demoPerso summary')) === 'Customise my page' && (await texte(p, '.demo-perso-fichier')) === 'Choose a photo');
  check('perso : aucune erreur JavaScript', p.errs.length === 0, p.errs.join(' ; '));
  await ctx.close();
}
for (const w of [320, 390, 768, 1366]) {
  const { ctx, p } = await ouvrir({ w, h: w < 900 ? 844 : 800 });
  await p.click('#demoPerso summary'); await p.waitForTimeout(200);
  const d = await p.evaluate(() => ({ large: document.documentElement.scrollWidth, W: document.documentElement.clientWidth }));
  check(`perso ${w} px : panneau ouvert sans débordement`, d.large <= d.W, JSON.stringify(d));
  check(`perso ${w} px : « Ajouter » cliquable`, await p.evaluate(() => { const b = document.getElementById('demoDestAjouter'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && !!e.closest('#demoDestAjouter'); }));
  await ctx.close();
}

/* ═══ 4. ISOLATION — DÉFENSES 1 ET 3, À LA MAIN DEPUIS LA CONSOLE ═══ */
for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
  const { ctx, p } = await ouvrir({ chemin });
  const res = await p.evaluate(async (supa) => {
    const r = {};
    const essai = async (nom, f) => { try { await f(); r[nom] = 'passé'; } catch (e) { r[nom] = 'refusé'; } };
    await essai('rest', () => fetch(`https://${supa}/rest/v1/courses`, { method: 'POST', body: '{}' }));
    await essai('deposer', () => fetch(`https://${supa}/functions/v1/deposer-course`, { method: 'POST', body: '{}' }));
    await essai('telegram', () => fetch('https://api.telegram.org/bot0/sendMessage'));
    await essai('xhr', () => new Promise((ok, ko) => { const x = new XMLHttpRequest(); x.open('POST', `https://${supa}/functions/v1/nouvelle-demande`); x.onload = ok; x.onerror = ko; x.send('{}'); }));
    r.beacon = navigator.sendBeacon ? String(navigator.sendBeacon(`https://${supa}/functions/v1/prevenir-client`, '{}')) : 'absent';
    /* Les fonctions du moteur, appelées à la main : elles passent par le simulateur. */
    await window.ELA_NUAGE.deposer({ ref: 'ELA-MAIN-00001', statut: 'confirmee', client: { nom: 'x' } });
    await window.ELA_NUAGE.etat('ELA-MAIN-00001', '0612345678');
    await window.ELA_NUAGE.coursesHotel('easyhotel-aeroville', { code: 'x' });
    await (window.ELA_NUAGE.appel ? window.ELA_NUAGE.appel('/rest/v1/courses').catch(() => {}) : null);
    return r;
  }, SUPA);
  await p.waitForTimeout(400);
  const vue = chemin.includes('reception') ? 'réception' : 'client';
  check(`${vue} : un fetch vers Supabase tapé à la main est refusé`, res.rest === 'refusé' && res.deposer === 'refusé', JSON.stringify(res));
  check(`${vue} : Telegram et XHR sont refusés`, res.telegram === 'refusé' && res.xhr === 'refusé', JSON.stringify(res));
  check(`${vue} : … et c'est la CSP qui refuse (défense 1)`, p.violations.some(v => v.includes(SUPA) && v.includes('connect-src')), p.violations.join(' | '));
  check(`${vue} : aucune requête n'a atteint Supabase hors demande-demo (défense 3)`, p.supabase.length === 0, p.supabase.join(' '));
  check(`${vue} : la session réelle n'a reçu aucune course`, await p.evaluate(() => localStorage.getItem('ela_courses') === null && localStorage.getItem('ela_bookings') === null));
  await ctx.close();
}

/* ═══ 5. AUCUN PARAMÈTRE NE CHANGE RIEN ═══ */
for (const q of ['?mode=production', '?h=easyhotel-aeroville', '?reception=easyhotel-aeroville', '?exploitant=1',
                 '?h=easyhotel-aeroville&reception=easyhotel-aeroville&exploitant=1&mode=production&ok=eyJyIjoiWCJ9']) {
  for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
    const { ctx, p } = await ouvrir({ chemin: chemin + q });
    const vue = chemin.includes('reception') ? 'réception' : 'client';
    check(`${vue} ${q} : on reste dans la démo`, new URL(p.url()).pathname === chemin, p.url());
    check(`${vue} ${q} : même hôtel fictif, aucun partenaire réel`, (await texte(p, '#hotelTeteNom')) === 'Hôtel Ibis Roissy' && !/easyhotel/i.test(await p.evaluate(() => document.body.innerText)));
    check(`${vue} ${q} : aucun appel à Supabase`, p.supabase.length === 0, p.supabase.join(' '));
    check(`${vue} ${q} : aucune connexion interdite tentée`, p.violations.length === 0, p.violations.join(' | '));
    await ctx.close();
  }
}

/* ═══ 6. MISE EN PAGE — NEUF LARGEURS, DEUX VUES ═══ */
for (const w of [320, 375, 390, 430, 768, 820, 1280, 1366, 1440]) {
  for (const chemin of ['/demo/hotel/', '/demo/hotel/reception/']) {
    const { ctx, p } = await ouvrir({ w, h: w < 900 ? 844 : 800, chemin });
    const deborde = await p.evaluate(() => {
      const W = document.documentElement.clientWidth, fautifs = [];
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect();
        if (!r.width || getComputedStyle(e).position === 'fixed') continue;
        let x = e.parentElement, defile = false;
        while (x) { const o = getComputedStyle(x).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { defile = true; break; } x = x.parentElement; }
        if (!defile && (r.right > W + 1 || r.left < -1)) fautifs.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
      }
      return { large: document.documentElement.scrollWidth, W, fautifs: fautifs.slice(0, 4) };
    });
    const vue = chemin.includes('reception') ? 'réception' : 'client';
    check(`${w} px ${vue} : aucun débordement`, deborde.large <= deborde.W && !deborde.fautifs.length, JSON.stringify(deborde));
    check(`${w} px ${vue} : bandeau et onglets visibles`, await visible(p, '#demoBandeau') && await visible(p, '#demoOngletReception'));
    check(`${w} px ${vue} : onglets cliquables (rien ne les recouvre)`, await p.evaluate(() => ['demoOngletClient', 'demoOngletReception'].every(id => {
      const r = document.getElementById(id).getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && e.closest('#' + id); })));
    check(`${w} px ${vue} : aucune erreur JavaScript`, p.errs.length === 0, p.errs.join(' ; '));
    await ctx.close();
  }
}

/* ═══ 7. INDEXATION ET RÈGLE CSP ÉCRITE DEUX FOIS ═══ */
{
  const pages = ['site/demo/hotel/index.html', 'site/demo/hotel/reception/index.html'].map(f => readFileSync(f, 'utf8'));
  const headers = readFileSync('site/_headers', 'utf8');
  const bloc = /^\/demo\/\*\n((?:[ \t]+.*\n?)+)/m.exec(headers)?.[1] || '';
  const cspEntete = (/Content-Security-Policy:\s*(.+)/.exec(bloc)?.[1] || '').replace(/;\s*frame-ancestors[^;]*$/, '').trim();
  for (const [i, h] of pages.entries()) {
    const cspMeta = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(h)?.[1] || '';
    check(`page ${i + 1} : la CSP de la page et celle de _headers sont identiques`, cspMeta && cspMeta === cspEntete, cspEntete.slice(0, 60));
    check(`page ${i + 1} : connect-src ne laisse passer que demande-demo chez Supabase`,
      [...cspMeta.matchAll(/https:\/\/[^\s;]*supabase\.co[^\s;]*/g)].map(m => m[0]).join() === DEMANDE);
    check(`page ${i + 1} : noindex,nofollow`, /<meta name="robots" content="noindex,nofollow">/.test(h) && (h.match(/<meta name="robots"/g) || []).length === 1);
    check(`page ${i + 1} : pas de canonique`, !/rel="canonical"/.test(h));
  }
  check('_headers : X-Robots-Tag noindex sur /demo/*', /X-Robots-Tag:\s*noindex, nofollow/.test(bloc));
  check('robots.txt écarte /demo/', /^Disallow: \/demo\/$/m.test(readFileSync('site/robots.txt', 'utf8')));
  check('le sitemap ne cite pas la démo', !/\/demo\//.test(readFileSync('site/sitemap.xml', 'utf8')));
  check('le dépôt (index.html) ne contient pas l\'hôtel fictif', !readFileSync('index.html', 'utf8').includes('demo-hotel'));
}

/* ═══ 8. DÉFENSE 2 — LA CONSTRUCTION TOMBE SUR CHAQUE MOT INTERDIT ═══
   Copie du site, un mot posé à la fois dans le simulateur, et la
   vérification doit sortir en erreur en nommant le mot. */
{
  const tmp = mkdtempSync(join(tmpdir(), 'demo-'));
  cpSync('site', join(tmp, 'site'), { recursive: true });
  const cible = join(tmp, 'site', 'demo', 'demo-simulateur.js');
  const sain = readFileSync(cible, 'utf8');
  const lancer = () => spawnSync('node', ['.github/scripts/verifier-demo.mjs', join(tmp, 'site'), 'index.html'], { encoding: 'utf8' });
  check('défense 2 : la copie saine passe', lancer().status === 0);
  const cleSupa = /var SUPABASE_CLE = "([^"]+)"/.exec(readFileSync('index.html', 'utf8'))[1];
  for (const mot of ['/rest/v1', 'deposer-course', 'courses-hotel', 'etat-course', 'nouvelle-demande',
                     'prevenir-client', 'wa.me', 'api.telegram.org', cleSupa, 'easyHotel', 'cdn.easyhotel.com',
                     'forfait:{ berline:35, van:50 }']) {
    writeFileSync(cible, sain + `\n// "${mot}"\n`);
    const r = lancer();
    check(`défense 2 : « ${mot.slice(0, 24)} » fait tomber la construction`, r.status !== 0, (r.stdout + r.stderr).slice(-120));
  }
  writeFileSync(cible, sain);
  /* Un script local chargé par la page est vérifié aussi. */
  const partage = join(tmp, 'site', 'telephone.js');
  writeFileSync(partage, readFileSync(partage, 'utf8') + '\n// wa.me\n');
  check('défense 2 : un script partagé chargé par la démo est vérifié aussi', lancer().status !== 0);
  rmSync(tmp, { recursive: true, force: true });
}

await b.close(); serveur.close();
console.log(`=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
