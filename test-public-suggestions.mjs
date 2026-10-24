/* =====================================================================
   TEST-PUBLIC-SUGGESTIONS.MJS — la liste des lieux : une pastille, le nom,
   puis l'adresse
   ---------------------------------------------------------------------
   24 octobre 2026, Barbaros : « améliore mes logos des hôtels, aéroports,
   gares, je trouve que ce n'est pas joli ». Mesuré sur sa capture et sur le
   site construit : un pictogramme de 20 px au trait fin, seul ; le nom et
   l'adresse collés sur une ligne ; et le nom d'un lieu posé sur une adresse
   (un hôtel, une gare) JETÉ — « easyHotel » s'affichait « 10 Rue de la
   Belle Borne ».

   CE QUI EST VERROUILLÉ, SUR LE SITE CONSTRUIT (la façade n'existe que là) :
   — CHAQUE LIEU A SA PASTILLE (38 px) ET SON DESSIN : aéroport, gare et
     hôtel ne se ressemblent pas.
   — LE NOM EN GRAS, L'ADRESSE DESSOUS, plus petite.
   — LE TEXTE DE LA LIGNE RESTE LE LIBELLÉ EXACT, caractère pour caractère :
     c'est lui qu'on écrit dans le champ, sur le bon et dans le message. Le
     séparateur coupé est gardé, invisible.
   — UN LIEU QUI A UNE ADRESSE GARDE SON NOM (Photon le range en « house »).
   — LE DOIGT TOMBE SUR LA LIGNE, et la liste ne déborde pas en largeur.

   Lancer :  node test-public-suggestions.mjs   (construit le site d'abord)
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
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
await new Promise(r => serveur.listen(8186, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8186/';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = o => ({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });

/* Photon range « house » tout objet posé sur une adresse : la gare et
   l'hôtel ci-dessous le sont, comme dans la réalité de sa capture. */
const P = (name, k, v, type, lon, lat, extra = {}) => ({ geometry: { coordinates: [lon, lat] },
  properties: Object.assign({ name, osm_key: k, osm_value: v, type, postcode: '75001', city: 'Paris', countrycode: 'FR' }, extra) });
const PHOTON = { features: [
  P('Aéroport de Paris-Orly', 'aeroway', 'aerodrome', 'house', 2.3652, 48.7262, { postcode: '94390', city: 'Paray-Vieille-Poste' }),
  P('Gare du Nord', 'railway', 'station', 'house', 2.3553, 48.8809, { postcode: '75010', street: 'Rue de Dunkerque', housenumber: '18' }),
  P('Hôtel Terminus Nord', 'tourism', 'hotel', 'house', 2.3561, 48.8795, { postcode: '75010', street: 'Rue de Dunkerque', housenumber: '12' }),
] };
const BAN = { features: [
  { geometry: { coordinates: [2.3315, 48.869] }, properties: { label: '8 Rue de la Paix 75002 Paris', type: 'housenumber', id: 'h', postcode: '75002', city: 'Paris' } },
] };
const GARE = 'Gare du Nord, 18 Rue de Dunkerque, 75010 Paris';
const ADRESSE = '8 Rue de la Paix 75002 Paris';

const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(SITE)) return route.continue();
    if (u.includes('api-adresse.data.gouv.fr')) return route.fulfill(J(BAN));
    if (u.includes('photon.komoot.io')) return route.fulfill(J(PHOTON));
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  await p.goto(SITE); await p.waitForTimeout(600);
  await p.click('#arrivee');
  await p.type('#arrivee', 'paris', { delay: 40 });
  await p.waitForFunction(() => document.querySelectorAll('#arriveeList .suggest-item:not(.suggest-manuel)').length >= 4, null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(400);

  const lignes = await p.$$eval('#arriveeList .suggest-item:not(.suggest-manuel)', l => l.map(o => {
    const ico = o.querySelector('.ico'), t = o.querySelector('.suggest-titre'), s = o.querySelector('.suggest-sous'),
          sep = o.querySelector('.suggest-sep'), r = ico.getBoundingClientRect();
    const tr = t && t.getBoundingClientRect(), sr = s && s.getBoundingClientRect();
    return { cat: ico.dataset.cat, texte: o.textContent.replace(ico.textContent, ''), titre: t ? t.textContent : null,
      sous: s ? s.textContent : null, icoW: Math.round(r.width), icoH: Math.round(r.height),
      dessin: getComputedStyle(ico, '::before').webkitMaskImage || getComputedStyle(ico, '::before').maskImage,
      poids: t ? +getComputedStyle(t).fontWeight : 0, tailleT: t ? parseFloat(getComputedStyle(t).fontSize) : 0,
      tailleS: s ? parseFloat(getComputedStyle(s).fontSize) : 0,
      dessous: !!(tr && sr && sr.top >= tr.bottom - 1), sepW: sep ? Math.round(sep.getBoundingClientRect().width) : 0 };
  }));
  const parCat = c => lignes.find(l => l.cat === c) || {};

  /* 1. Les pastilles et leurs dessins. */
  check('chaque lieu a sa pastille de 38 px', lignes.length >= 4 && lignes.every(l => l.icoW === 38 && l.icoH === 38),
    lignes.map(l => l.cat + ' ' + l.icoW + '×' + l.icoH).join(', '));
  const dessins = ['aeroport', 'gare', 'hotel', 'adresse'].map(c => parCat(c).dessin);
  check('aéroport, gare, hôtel et adresse ont chacun leur dessin',
    dessins.every(d => d && d.startsWith('url(')) && new Set(dessins).size === 4, dessins.map(d => (d || '').slice(0, 30)).join(' | '));

  /* 2. Le nom, puis l'adresse. */
  const gare = parCat('gare');
  check('un lieu posé sur une adresse garde son nom : « Gare du Nord » en titre', gare.titre === 'Gare du Nord', JSON.stringify(gare));
  check('et son adresse dessous', gare.sous === '18 Rue de Dunkerque, 75010 Paris', gare.sous);
  check('l\'hôtel aussi garde son nom', parCat('hotel').titre === 'Hôtel Terminus Nord', parCat('hotel').titre);
  const adr = parCat('adresse');
  check('une adresse de la BAN : la rue en titre, le code postal et la ville dessous',
    adr.titre === '8 Rue de la Paix' && adr.sous === '75002 Paris', JSON.stringify(adr));
  check('le titre est en gras, l\'adresse plus petite et en dessous',
    lignes.every(l => l.poids >= 600 && (!l.sous || (l.tailleS < l.tailleT && l.dessous))),
    lignes.map(l => l.poids + '/' + l.tailleT + '/' + l.tailleS + '/' + l.dessous).join(' '));

  /* 3. Le texte de la ligne reste le libellé exact. */
  check('le texte de la ligne est le libellé, caractère pour caractère (gare)', gare.texte === GARE, gare.texte);
  check('… et pour une adresse de la BAN', adr.texte === ADRESSE, adr.texte);
  check('le séparateur coupé est invisible', lignes.every(l => l.sepW <= 1), lignes.map(l => l.sepW).join(','));

  /* 4. Le doigt et la largeur. */
  const doigt = await p.evaluate(() => {
    const t = [...document.querySelectorAll('#arriveeList .suggest-titre')].find(e => e.textContent === 'Gare du Nord');
    if (!t) return false;
    t.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = t.getBoundingClientRect(), au = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return au && au.closest('.suggest-item') === t.closest('.suggest-item');
  });
  check('le doigt posé sur « Gare du Nord » tombe sur sa ligne', doigt);
  const deborde = await p.evaluate(() => { const l = document.getElementById('arriveeList'); return l.scrollWidth - l.clientWidth; });
  check('la liste ne déborde pas en largeur à 390 px', deborde <= 0, deborde + ' px');

  /* 5. Le choix écrit le libellé entier. */
  await p.locator('#arriveeList .suggest-item', { hasText: 'Dunkerque' }).first().click({ timeout: 3000 }).catch(() => {});
  check('choisir la gare écrit son libellé entier dans le champ', (await p.inputValue('#arrivee')) === GARE, await p.inputValue('#arrivee'));
  check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  await ctx.close();
} finally {
  await b.close(); serveur.close();
}
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); console.log(''); }
process.exit(ko.length ? 1 : 0);
