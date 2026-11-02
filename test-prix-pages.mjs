/* =====================================================================
   TEST-PRIX-PAGES — LE FORFAIT AFFICHÉ SUR LES PAGES CDG ET ORLY EST CELUI
   QUE LE FORMULAIRE CALCULE (1er novembre 2026)
   ---------------------------------------------------------------------
   Décision de Barbaros (« Oui », après l'audit produit) : le visiteur des
   pages d'aéroport lit le prix sans remplir le formulaire. Un prix affiché
   engage : ce test refuse toute page qui annoncerait un autre montant que
   celui que le client obtiendra ensuite.

   1. Les montants ÉCRITS dans la page (le repli, ce que lit Google) sont
      ceux de config.js : forfait, plus l'accueil au départ de l'aéroport.
   2. prix-forfaits.js parle au même serveur que le moteur, avec les mêmes
      clés de gammes et de forfaits ; la recette le publie et le nettoie.
   3. Serveur muet : la page garde le repli.
   4. Serveur qui répond une grille VALIDE : la page ET le formulaire,
      nourris par la même réponse, donnent le même montant, au centime.
   5. Grille qui CLOCHE (un forfait manque) : ni la page ni le formulaire
      ne la prennent — la même porte des deux côtés.
   6. Sur téléphone, le prix au départ de l'aéroport est sous le doigt dès
      le premier écran, au-dessus de la barre du bas.

   Éprouvé contre l'ancien code (pages sans bloc) : il tombe dès la partie 1.
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import fs from 'node:fs';
import vm from 'node:vm';
import { extname, join, normalize } from 'node:path';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const errs = [];

// ─── 1. Les montants écrits sont ceux de config.js ─────────────────────
const bac = { window: {} };
vm.runInNewContext(fs.readFileSync('config.js', 'utf8'), bac);
const CONFIG = bac.window.ELA_CONFIG || {};
const GAMMES = (CONFIG.GAMMES || []).map(g => g.cle);
const FORFAITS = CONFIG.FORFAITS_PUBLICS || [];
const ACCUEIL = CONFIG.ACCUEIL_EUR;
check('config.js se lit (gammes, forfaits, accueil)', GAMMES.length > 0 && FORFAITS.length > 0 && typeof ACCUEIL === 'number',
  JSON.stringify({ GAMMES, forfaits: FORFAITS.map(f => f.cle), ACCUEIL }));

const PAGES = [['transfert-cdg-paris.html', 'cdg'], ['transfert-orly-paris.html', 'orly']];
const attendu = (cle, g, accueil) => {
  const f = FORFAITS.find(x => x.cle === cle);
  return f && typeof f.prix[g] === 'number' ? f.prix[g] + (accueil ? ACCUEIL : 0) : NaN;
};
const euros = n => (Math.round(n * 100) % 100 ? n.toFixed(2).replace('.', ',') : String(n)) + ' €';

for (const [page, cle] of PAGES) {
  const html = fs.readFileSync(page, 'utf8');
  const bloc = (html.match(new RegExp(`<div class="forfait" data-forfaits="${cle}">([\\s\\S]*?)</div>`)) || [])[1] || '';
  check(`${page} : un bloc de forfait « ${cle} »`, bloc.length > 0);
  const cases = [...bloc.matchAll(/<td data-gamme="([a-z]+)"( data-accueil)?>([^<]*)<\/td>/g)]
    .map(m => ({ g: m[1], accueil: !!m[2], texte: m[3].replace(/&nbsp;/g, ' ') }));
  for (const g of GAMMES) for (const accueil of [true, false]) {
    const c = cases.filter(x => x.g === g && x.accueil === accueil);
    check(`${page} : ${g} ${accueil ? 'au départ de l’aéroport (accueil compris)' : 'vers l’aéroport'} = config.js`,
      c.length === 1 && c[0].texte === euros(attendu(cle, g, accueil)),
      c.map(x => x.texte).join(' | ') + ' ; attendu ' + euros(attendu(cle, g, accueil)));
  }
  check(`${page} : quatre montants, ni plus ni moins`, cases.length === GAMMES.length * 2, String(cases.length));
  check(`${page} : charge /prix-forfaits.js`, /<script src="\/prix-forfaits\.js" defer><\/script>/.test(html));
  check(`${page} : aucun commentaire HTML (la page n'est pas nettoyée à la construction)`, !/<!--/.test(html));
}

// ─── 2. Le script parle au même serveur, avec les mêmes clés ───────────
let script = ''; try { script = fs.readFileSync('prix-forfaits.js', 'utf8'); } catch {}
check('prix-forfaits.js existe', script.length > 0);
const moteur = fs.readFileSync('index.html', 'utf8');
const valeur = (src, nom) => (src.match(new RegExp(`var ${nom} = "([^"]+)"`)) || [])[1];
check('prix-forfaits.js : même adresse du serveur que le moteur', !!valeur(script, 'SUPABASE_URL') && valeur(script, 'SUPABASE_URL') === valeur(moteur, 'SUPABASE_URL'));
check('prix-forfaits.js : même clé publique que le moteur', !!valeur(script, 'SUPABASE_CLE') && valeur(script, 'SUPABASE_CLE') === valeur(moteur, 'SUPABASE_CLE'));
const liste = nom => JSON.parse((script.match(new RegExp(`var ${nom} = (\\[[^\\]]*\\]);`)) || [, 'null'])[1]);
check('prix-forfaits.js : les gammes de config.js', JSON.stringify((liste('GAMMES') || []).slice().sort()) === JSON.stringify(GAMMES.slice().sort()), JSON.stringify(liste('GAMMES')));
check('prix-forfaits.js : les forfaits de config.js', JSON.stringify((liste('FORFAITS') || []).slice().sort()) === JSON.stringify(FORFAITS.map(f => f.cle).sort()), JSON.stringify(liste('FORFAITS')));
check('prix-forfaits.js lit la vue du moteur (grille_publique)', /\/rest\/v1\/grille_publique\?select=valeur/.test(script) && /\/rest\/v1\/grille_publique\?select=valeur/.test(moteur));
const recette = fs.readFileSync('construire.sh', 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
check('construire.sh copie prix-forfaits.js', /^cp [^\n]*\bprix-forfaits\.js\b[^\n]* site\/?$/m.test(recette));
check('construire.sh le passe au nettoyage des commentaires', /masquer-commentaires\.mjs[\s\S]*?site\/prix-forfaits\.js/.test(recette));

// ─── 3 à 6. Sur le site construit ──────────────────────────────────────
execSync('sh construire.sh', { stdio: 'ignore' });
check('le site construit publie prix-forfaits.js, sans commentaire', fs.existsSync('site/prix-forfaits.js') && !/\/\*/.test(fs.readFileSync('site/prix-forfaits.js', 'utf8')));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { try { await stat(f + '.html'); f += '.html'; } catch { res.writeHead(404).end('non'); return; } }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:' + serveur.address().port + '/';

// Une grille du serveur, au format de « grille_publique », différente du repli
// partout où la page affiche quelque chose : un montant resté au repli se voit.
const GRILLE = {
  tranches_km: [12, 22, 27, 32, 42],
  berline: { tranches_centimes: [3500, 5000, 6000, 7000, 9000], au_dela_km_centimes: 250 },
  van: { tranches_centimes: [5000, 8000, 9500, 11000, 13000], au_dela_km_centimes: 380 },
  forfaits: { orly: { berline: 6000, van: 8500 }, cdg: { berline: 7500, van: 11500 }, disney: { berline: 9500, van: 13500 } },
  accueil_centimes: 1200,
};
const CASSEE = JSON.parse(JSON.stringify(GRILLE)); delete CASSEE.forfaits.disney;
const SERVEUR = { cdg: { berline: [87, 75], van: [127, 115] }, orly: { berline: [72, 60], van: [97, 85] } };

const J = (o, s = 200) => ({ status: s, contentType: 'application/json', body: JSON.stringify(o) });
const BAN = { features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
  properties: { label: '10 Rue de Rivoli 75004 Paris', name: '10 Rue de Rivoli', housenumber: '10', street: 'Rue de Rivoli', postcode: '75004',
    city: 'Paris', citycode: '75104', context: '75, Paris, Île-de-France', type: 'housenumber', score: 0.95 } }] };

const b = await chromium.launch();
async function ouvrir(chemin, grille, { w = 390, h = 844 } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris', serviceWorkers: 'block' });
  await ctx.route('**/*', r => {
    const u = r.request().url(); const hote = new URL(u).hostname;
    if (hote === '127.0.0.1') return r.continue();
    if (u.includes('/rest/v1/grille_publique')) return grille === 'muet' ? r.abort() : r.fulfill(J([{ valeur: grille }]));
    if (hote.includes('supabase.co')) return r.fulfill(J([]));
    if (hote.includes('api-adresse')) return r.fulfill(J(/rivoli/i.test(u) ? BAN : { features: [] }));
    if (hote.includes('photon')) return r.fulfill(J({ features: [] }));
    if (hote.includes('openrouteservice')) return r.fulfill(J({}, 500));
    if (hote.includes('osrm')) return r.fulfill(J({ code: 'Ok', routes: [{ distance: 31500, duration: 2700, geometry: { type: 'LineString', coordinates: [[2.55, 49.0], [2.35, 48.86]] } }] }));
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(chemin + ' : ' + String(e).slice(0, 160)));
  await p.goto(SITE + chemin, { waitUntil: 'load' });
  await p.waitForTimeout(900);
  return p;
}
const lire = p => p.evaluate(() => [...document.querySelectorAll('.forfait td[data-gamme]')]
  .map(td => ({ g: td.getAttribute('data-gamme'), accueil: td.hasAttribute('data-accueil'), texte: td.textContent })));
const montant = (cases, g, accueil) => (cases.find(c => c.g === g && c.accueil === accueil) || {}).texte;

// Le formulaire, nourri par la même réponse : CDG → Paris, et Paris → Orly.
async function prixFormulaire(grille, sens) {
  const p = await ouvrir('', grille);
  if (sens === 'cdg-paris') {
    await p.click('#depart'); await p.fill('#depart', 'CDG'); await p.waitForTimeout(500);
    await p.locator('#departList [role=option]', { hasText: '2E' }).first().click({ timeout: 4000 });
    await p.click('#arrivee'); await p.fill('#arrivee', '10 rue de Rivoli'); await p.waitForTimeout(900);
    await p.locator('#arriveeList [role=option]').first().click({ timeout: 4000 });
  } else {
    await p.click('#depart'); await p.fill('#depart', '10 rue de Rivoli'); await p.waitForTimeout(900);
    await p.locator('#departList [role=option]').first().click({ timeout: 4000 });
    await p.click('#arrivee'); await p.fill('#arrivee', 'Orly'); await p.waitForTimeout(500);
    await p.locator('#arriveeList [role=option]', { hasText: 'Orly 4' }).first().click({ timeout: 4000 });
  }
  await p.fill('#date', new Date(Date.now() + 2 * 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10));
  await p.fill('#heure', '10:00');
  await p.click('#btnVoirPrix'); await p.waitForTimeout(1800);
  // Le montant se lit dans SON élément (.veh-prix) : le texte de la carte porte
  // aussi l'heure d'arrivée, qu'une lecture du texte entier collait au prix.
  const cartes = await p.evaluate(() => [...document.querySelectorAll('#listeVehicules .veh-carte')]
    .map(e => ({ cle: e.getAttribute('data-cle'), prix: (e.querySelector('.veh-prix') || {}).textContent || '' })));
  await p.context().close();
  const de = cle => { const c = cartes.find(x => x.cle === cle); return c ? Number(c.prix.replace(/[^\d,]/g, '').replace(',', '.')) : NaN; };
  return { berline: de('berline'), van: de('van'), cartes };
}

// 3. Serveur muet : le repli.
for (const [page, cle] of PAGES) {
  const p = await ouvrir(page, 'muet');
  const cases = await lire(p);
  check(`${page}, serveur muet : la page garde le repli de config.js`,
    GAMMES.every(g => [true, false].every(a => montant(cases, g, a) === euros(attendu(cle, g, a)))), JSON.stringify(cases.map(c => c.texte)));
  await p.context().close();
}

// 4. Grille valide : la page prend le serveur, et le formulaire dit pareil.
for (const [page, cle] of PAGES) {
  const p = await ouvrir(page, GRILLE);
  const cases = await lire(p);
  check(`${page}, serveur qui répond : les montants du serveur (forfait + accueil au départ)`,
    GAMMES.every(g => montant(cases, g, true) === euros(SERVEUR[cle][g][0]) && montant(cases, g, false) === euros(SERVEUR[cle][g][1])),
    JSON.stringify(cases.map(c => c.texte)));
  await p.context().close();
}
const f1 = await prixFormulaire(GRILLE, 'cdg-paris');
check('même grille : le formulaire CDG → Paris donne le montant de la page (berline, van)',
  f1.berline === SERVEUR.cdg.berline[0] && f1.van === SERVEUR.cdg.van[0], JSON.stringify(f1.cartes));
const f2 = await prixFormulaire(GRILLE, 'paris-orly');
check('même grille : le formulaire Paris → Orly donne le montant de la page (berline, van)',
  f2.berline === SERVEUR.orly.berline[1] && f2.van === SERVEUR.orly.van[1], JSON.stringify(f2.cartes));

// 5. Grille qui cloche : refusée des deux côtés.
{
  const p = await ouvrir('transfert-cdg-paris.html', CASSEE);
  const cases = await lire(p);
  check('grille sans forfait Disneyland : la page la refuse et garde le repli',
    GAMMES.every(g => [true, false].every(a => montant(cases, g, a) === euros(attendu('cdg', g, a)))), JSON.stringify(cases.map(c => c.texte)));
  await p.context().close();
  const f3 = await prixFormulaire(CASSEE, 'cdg-paris');
  check('la même grille : le formulaire la refuse aussi (même montant que la page)',
    f3.berline === attendu('cdg', 'berline', true) && f3.van === attendu('cdg', 'van', true), JSON.stringify(f3.cartes));
}

// 6. Sur téléphone, le prix au départ de l'aéroport se voit au premier écran.
for (const [page] of PAGES) for (const w of [320, 390]) {
  const p = await ouvrir(page, 'muet', { w, h: 844 });
  const m = await p.evaluate(() => {
    const td = document.querySelector('.forfait td[data-accueil]');
    if (!td) return { vu: false, bas: null, debord: document.documentElement.scrollWidth - innerWidth };
    const r = td.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { vu: !!el && (el === td || td.contains(el)), bas: Math.round(r.bottom), debord: document.documentElement.scrollWidth - innerWidth };
  });
  check(`${page} à ${w}×844 : le prix au départ de l'aéroport est sous le doigt dès le premier écran`, m.vu && m.bas <= 844, JSON.stringify(m));
  check(`${page} à ${w} px : rien ne déborde`, m.debord <= 0, String(m.debord));
  await p.context().close();
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errs.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errs.length ? 1 : 0);
