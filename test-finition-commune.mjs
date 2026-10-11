/* =====================================================================
   UN PARTENAIRE DE PLUS A EXACTEMENT LA FINITION D'EASYHOTEL (11/10/2026)
   ---------------------------------------------------------------------
   Barbaros : « est-ce que c'est exactement le même résultat qu'auront les
   futurs partenaires qui utilisent la démo, comme pour la réception
   easyHotel ? ». Ce n'était pas le cas : la finition des pages d'hôtel
   (hotel-engine-polish.js/.css) portait le nom, l'adresse, la photo et
   l'orange d'easyHotel écrits en dur ; la démo ne pouvait pas la charger,
   et la recette ne fabriquait que la réception d'easyHotel.

   COMMENT ON LE PROUVE : on ne relit pas le code, on AJOUTE UN HÔTEL. La
   suite copie le dépôt, pose un second partenaire fictif dans HOTELS (ses
   couleurs, aucune photo), construit le site comme Cloudflare, le sert, et
   l'ouvre comme une réception et comme un client. Il doit avoir la même
   finition qu'easyHotel — à ses couleurs, à son nom, à son adresse — sans
   une ligne de code de plus. Et easyHotel ne doit pas avoir bougé.

   Hors ligne, comme toutes les suites : tout ce qui sort est coupé, le
   serveur des réceptions est simulé.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, normalize, extname, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

/* ── 1. Le dépôt copié, un second partenaire ajouté ── */
const DEPOT = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'finition-'));
for (const f of execSync('git ls-files -z', { cwd: DEPOT }).toString().split('\0').filter(Boolean)) {
  mkdirSync(join(tmp, dirname(f)), { recursive: true });
  copyFileSync(join(DEPOT, f), join(tmp, f));
}
/* Les fichiers du dépôt pas encore suivis par git (une session de travail)
   sont ceux qu'on éprouve : on les recopie par-dessus. */
for (const f of execSync('git ls-files -z --others --exclude-standard', { cwd: DEPOT }).toString().split('\0').filter(Boolean)) {
  if (f.startsWith('site/') || f.startsWith('node_modules/')) continue;
  mkdirSync(join(tmp, dirname(f)), { recursive: true });
  copyFileSync(join(DEPOT, f), join(tmp, f));
}
const ESSAI = {
  cle: 'hotel-essai', nom: 'Hôtel Essai Gare', court: 'Hôtel Essai', adresse: '1 place de la Gare, 77000 Melun',
  bouton: '#6B2E8F', vif: '#E9DDF2',
};
const fiche = `    "${ESSAI.cle}": {
      nom:"${ESSAI.nom}", court:"${ESSAI.court}",
      marque: { charbon:"#2B1A33", vif:"${ESSAI.vif}", bouton:"${ESSAI.bouton}", pale:"#F4ECF8", paleEncre:"#4A1F63" },
      photo:"", adresse:"${ESSAI.adresse}", lat:48.527, lon:2.655, alias:["essai"],
      destinations:[
        { cle:"cdg",  nom:"Aéroport CDG", aeroport:"cdg",  forfait:{ berline:95, van:140 } },
        { cle:"orly", nom:"Orly",         aeroport:"orly", forfait:{ berline:70, van:100 } }
      ]
    },
`;
const page = readFileSync(join(tmp, 'index.html'), 'utf8');
if (page.split('var HOTELS = {\n').length !== 2) throw new Error('repère « var HOTELS = { » introuvable ou ambigu');
writeFileSync(join(tmp, 'index.html'), page.replace('var HOTELS = {\n', 'var HOTELS = {\n' + fiche));
let construit = true;
try { execSync('sh construire.sh', { cwd: tmp, stdio: 'pipe' }); }
catch (e) { construit = false; check('le site se construit avec un second partenaire', false, String(e.stdout || '').slice(-300) + String(e.stderr || '').slice(-300)); }
if (construit) check('le site se construit avec un second partenaire (démo vérifiée comprise)', true);
const SITE = join(tmp, 'site');

/* ── 2. Ce que la recette a fabriqué ── */
const lire = (f) => { try { return readFileSync(join(SITE, f), 'utf8'); } catch { return ''; } };
const recEssai = lire('reception/hotel-essai/index.html');
check('la recette fabrique sa page de comptoir, /reception/hotel-essai/', !!recEssai);
check('… qui dit quel hôtel elle sert (data-ela-hotel), sans paramètre', /data-ela-space="hotel-reception" data-ela-hotel="hotel-essai"/.test(recEssai));
check('… sous son nom', /<title>Réception Hôtel Essai Gare — Elatransfer<\/title>/.test(recEssai));
check('… avec SON manifeste', recEssai.includes('href="/reception/hotel-essai/manifest.webmanifest"'));
const man = (() => { try { return JSON.parse(lire('reception/hotel-essai/manifest.webmanifest')); } catch { return {}; } })();
check('… dont l\'icône rouvre CETTE page', man.start_url === '/reception/hotel-essai/' && man.id === '/reception/hotel-essai/', JSON.stringify(man.start_url));
check('easyHotel garde ses deux adresses de comptoir',
  /data-ela-hotel="easyhotel-aeroville"/.test(lire('reception/easyhotel-aeroville/index.html'))
  && /data-ela-hotel="easyhotel-aeroville"/.test(lire('easyhotel-reception/index.html'))
  && lire('easyhotel-reception/index.html').includes('href="/easyhotel-reception/manifest.webmanifest"'));
check('aucune ancienne adresse inventée pour le nouveau partenaire', !lire('hotel-essai-reception/index.html'));
/* La finition publiée (commentaires retirés) ne nomme plus aucun partenaire. */
for (const f of ['hotel-engine-polish.js', 'hotel-engine-polish.css']) {
  const t = lire(f);
  const trouve = /easy\s*hotel|a[ée]roville|belle borne|tremblay|ff5a0a|ff761b/i.exec(t);
  check(`${f} publié ne nomme aucun partenaire (ni nom, ni adresse, ni couleur)`, !!t && !trouve, trouve ? trouve[0] : '');
}
const demoClient = lire('demo/hotel/index.html'), demoRec = lire('demo/hotel/reception/index.html');
check('la démo charge la finition commune (vue client)', /hotel-engine-polish\.js/.test(demoClient) && /hotel-engine-polish\.css/.test(demoClient));
check('la démo charge la finition commune (vue réception)', /hotel-engine-polish\.js/.test(demoRec) && /hotel-engine-polish\.css/.test(demoRec));

/* ── 3. Le site servi ── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(SITE, chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8161, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8161';
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const jourParis = (j) => new Date(Date.now() + j * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const demain = jourParis(1), dansQuatre = jourParis(4);

const nav = await chromium.launch();
const erreurs = [];
async function ouvrir(chemin, { w = 390, h = 844 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const p = await ctx.newPage();
  p.photos = []; p.hotelsDemandes = [];
  p.on('pageerror', e => erreurs.push(chemin + ' : ' + e.message.split('\n')[0]));
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (/easyhotel\.com/.test(u)) { p.photos.push(u); return r.abort(); }
    if (u.includes('/functions/v1/courses-hotel')) {
      let hotel = ''; try { hotel = JSON.parse(r.request().postData() || '{}').hotel || ''; } catch {}
      p.hotelsDemandes.push(hotel);
      return r.fulfill(J({ hotel, session: 's.sig', expire: Date.now() + 864e5, courses: [
        { ref: 'ELA-26-10-ESSAI', numero: 1101, statut: 'attente', date: demain, heure: '09:00', depart: ESSAI.adresse,
          arrivee: 'Orly 1 — Aéroport de Paris-Orly', vehicule: 'Berline', prix: 70, client: 'M. Essai', tel: '06 12 34 56 78',
          chambre: '12', paiement: 'Espèces' },
        { ref: 'ELA-26-10-ESSA2', numero: 1102, statut: 'confirmee', date: dansQuatre, heure: '14:00', depart: ESSAI.adresse,
          arrivee: 'Aéroport CDG', vehicule: 'Van', prix: 140, client: 'Mme Essai', tel: '06 98 76 54 32',
          chambre: '14', paiement: 'Carte bancaire', chauffeur: { nom: 'Karim', telephone: '06 11 22 33 44' } }] }));
    }
    return r.abort();
  });
  await p.goto(BASE + chemin, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  return { ctx, p };
}
const fond = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return ''; const c = getComputedStyle(e); return c.backgroundImage + ' ' + c.backgroundColor; }, sel);
const VIOLET = 'rgb(107, 46, 143)', ORANGE = 'rgb(255, 90, 10)';

try {
  /* ── Le client du nouveau partenaire ── */
  {
    const { ctx, p } = await ouvrir('/application.html?h=hotel-essai&dest=orly');
    const etat = await p.evaluate(() => ({ fini: document.body.classList.contains('hotel-enhanced'),
      sansPhoto: document.body.classList.contains('eh-sans-photo'),
      court: document.querySelector('.hotel-partner-chip b')?.textContent, reste: document.querySelector('.hotel-partner-chip span')?.textContent,
      nom: document.getElementById('hotelTeteNom')?.textContent, tot: document.querySelector('#blocCoordonnees.hotel-guest-early') !== null,
      texte: document.body.innerText }));
    check('client : la finition habille le nouveau partenaire', etat.fini);
    check('client : sa pastille dit SON nom (court, puis le reste)', etat.court === 'Hôtel Essai' && etat.reste === 'Gare', `${etat.court} / ${etat.reste}`);
    check('client : son nom en tête', etat.nom === ESSAI.nom, etat.nom);
    check('client : le nom et le téléphone sont sur la première page, comme chez easyHotel', etat.tot);
    check('client : le mot « easyHotel » n\'apparaît nulle part sur sa page', !/easy\s*hotel/i.test(etat.texte));
    check('client : aucune photo d\'easyHotel demandée', p.photos.length === 0, p.photos.join(' '));
    check('client : sans photo, le bandeau passe en aplat (pas un grand vide)', etat.sansPhoto
      && !/url\(/.test(await fond(p, '#hotelTete')), await fond(p, '#hotelTete'));
    const bouton = await fond(p, '#btnVoirPrix');
    check('client : « Voir mon prix » prend SA couleur, pas l\'orange', bouton.includes(VIOLET) && !bouton.includes(ORANGE), bouton);
    const pastille = await fond(p, '.hotel-tete .hotel-sur');
    check('client : la pastille du bandeau aussi', pastille.includes(VIOLET), pastille);
    await p.click('#btnVoirPrix', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(500);
    check('client : ce qui manque s\'encadre de rouge avant de quitter la page (nom, téléphone)',
      await p.evaluate(() => !!document.querySelector('#blocCoordonnees .champ.eh-manque')));
    const logo = await p.evaluate(() => document.querySelector('.entete .logo')?.getAttribute('href'));
    check('client : sans page du QR déclarée, le logo garde son lien vers l\'accueil', logo === '/', logo);
    await ctx.close();
  }
  /* ── Son comptoir ── */
  {
    const { ctx, p } = await ouvrir('/reception/hotel-essai/', { w: 1366, h: 768 });
    const avant = await p.evaluate(() => ({ prem: document.body.classList.contains('reception-premium'),
      logo: document.querySelector('.entete .logo')?.getAttribute('href'), titre: document.querySelector('#ecran-reception .rec-titre')?.textContent }));
    check('comptoir : la finition de comptoir s\'applique (reception-premium)', avant.prem);
    check('comptoir : son logo ramène à SA page de comptoir', avant.logo === '/reception/hotel-essai/', avant.logo);
    check('comptoir : « ESPACE RÉCEPTION » en titre', avant.titre === 'ESPACE RÉCEPTION', avant.titre);
    await p.fill('#recCode', 'code-essai', { timeout: 3000 }).catch(() => {});
    await p.click('#btnRecEntrer', { timeout: 3000 }).catch(() => {});
    await p.waitForSelector('#recListe .rec-course', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(600);
    check('comptoir : le serveur est interrogé pour CET hôtel', p.hotelsDemandes.length > 0 && p.hotelsDemandes.every(h => h === 'hotel-essai'), p.hotelsDemandes.join(','));
    const apres = await p.evaluate(() => ({ adresse: document.getElementById('recAdresseHotel')?.textContent,
      tuile: document.querySelector('#btnRecReserver .reception-action-copy b')?.textContent, texte: document.body.innerText }));
    check('comptoir : SON adresse sous le titre, pas celle d\'easyHotel', apres.adresse === ESSAI.adresse, apres.adresse);
    check('comptoir : la tuile « NOUVELLE COURSE »', apres.tuile === 'NOUVELLE COURSE', apres.tuile);
    check('comptoir : le mot « easyHotel » n\'apparaît nulle part', !/easy\s*hotel/i.test(apres.texte));
    const tuile = await fond(p, '#btnRecReserver');
    check('comptoir : la tuile prend SA couleur', tuile.includes(VIOLET) && !tuile.includes(ORANGE), tuile);
    /* En anglais, les jours aussi — « lundi 13 octobre » restait en français
       au comptoir ; la démo le traduisait de son côté. */
    await p.click('.langues [data-langue="en"]', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    const jours = await p.evaluate(() => [...document.querySelectorAll('.rec-jour')].map(e => e.textContent.trim()));
    check('comptoir EN : les jours passent en anglais, dates comprises',
      jours.length >= 2 && jours.some(j => /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2} [A-Z][a-z]+$/.test(j))
      && !jours.some(j => /lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|Demain/i.test(j)), jours.join(' | '));
    await p.click('.langues [data-langue="fr"]', { timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(600);
    const joursFr = await p.evaluate(() => [...document.querySelectorAll('.rec-jour')].map(e => e.textContent.trim()));
    check('comptoir : retour en français, dates comprises', joursFr.some(j => /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d{1,2} /.test(j)), joursFr.join(' | '));
    await ctx.close();
  }
  /* ── L'ancienne entrée par paramètre mène au bon comptoir ── */
  {
    const { ctx, p } = await ouvrir('/?reception=essai');
    await p.waitForURL(/\/reception\/hotel-essai\//, { timeout: 4000 }).catch(() => {});
    check('« ?reception= » avec un alias mène à SON comptoir', /\/reception\/hotel-essai\/$/.test(new URL(p.url()).pathname), p.url());
    await ctx.close();
  }
  {
    const { ctx, p } = await ouvrir('/?reception=easyhotel-aeroville');
    await p.waitForURL(/\/reception\/easyhotel-aeroville\//, { timeout: 4000 }).catch(() => {});
    check('« ?reception=easyhotel-aeroville » mène toujours au comptoir d\'easyHotel', /\/reception\/easyhotel-aeroville\/$/.test(new URL(p.url()).pathname), p.url());
    await ctx.close();
  }
  {
    const { ctx, p } = await ouvrir('/?reception=hotel-qui-nexiste-pas');
    check('un hôtel inconnu ne mène à aucun comptoir (ni à celui d\'easyHotel)', !/\/reception\//.test(p.url()), p.url());
    await ctx.close();
  }
  /* ── easyHotel n'a pas bougé ── */
  {
    const { ctx, p } = await ouvrir('/application.html?h=easyhotel-aeroville&dest=orly');
    const e = await p.evaluate(() => ({ court: document.querySelector('.hotel-partner-chip b')?.textContent, reste: document.querySelector('.hotel-partner-chip span')?.textContent,
      logo: document.querySelector('.entete .logo')?.getAttribute('href'), sansPhoto: document.body.classList.contains('eh-sans-photo'),
      photo: getComputedStyle(document.getElementById('hotelTete')).backgroundImage }));
    check('easyHotel : sa pastille « easyHotel / Aéroville »', e.court === 'easyHotel' && e.reste === 'Aéroville', `${e.court} / ${e.reste}`);
    check('easyHotel : son logo ramène à la page du QR', e.logo === '/easyhotel-client/', e.logo);
    check('easyHotel : sa photo de bandeau est toujours posée', !e.sansPhoto && /easyhotel\.com/.test(e.photo) && p.photos.length > 0, e.photo.slice(0, 80));
    check('easyHotel : « Voir mon prix » garde son dégradé orange', (await fond(p, '#btnVoirPrix')).includes(ORANGE));
    await ctx.close();
  }
  {
    const { ctx, p } = await ouvrir('/reception/easyhotel-aeroville/', { w: 1366, h: 768 });
    await p.fill('#recCode', 'code', { timeout: 3000 }).catch(() => {});
    await p.click('#btnRecEntrer', { timeout: 3000 }).catch(() => {});
    await p.waitForSelector('#recListe .rec-course', { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
    check('easyHotel : son comptoir garde son adresse', (await p.evaluate(() => document.getElementById('recAdresseHotel')?.textContent)) === '10 rue de la Belle Borne, 93410 Tremblay-en-France');
    check('easyHotel : sa tuile garde son orange', (await fond(p, '#btnRecReserver')).includes(ORANGE));
    check('easyHotel : son logo ramène à son comptoir', (await p.evaluate(() => document.querySelector('.entete .logo')?.getAttribute('href'))) === '/reception/easyhotel-aeroville/');
    await ctx.close();
  }
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
} finally {
  await nav.close();
  serveur.close();
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) {
  console.log(`\n=== ÉCHECS (${ko.length}) ===`);
  ko.forEach(x => console.log('  ✘ ' + x));
  process.exit(1);
}
