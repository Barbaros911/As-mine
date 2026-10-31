/* =====================================================================
   TEST-PUBLIC-HORAIRES.MJS — réservation 24 h/24, assistance humaine 7 h–22 h
   ---------------------------------------------------------------------
   22 octobre 2026, Barbaros : « réservation 24/24, assistance humaine 7/22,
   écrit partout comme un expert ». Trois règles, éprouvées sur le site
   CONSTRUIT (la recette publie des pages que le dépôt ne montre pas seul) :

   1. PARTOUT OÙ LE NUMÉRO EST ÉCRIT, LES HORAIRES L'ACCOMPAGNENT. Un client
      qui lit le numéro doit savoir quand quelqu'un décroche. Une page qui
      donne le numéro sans les heures est un oubli, et c'est exactement ce que
      la relecture du 22/10 a trouvé (404, page du QR, pied des pages EN).
   2. UNE HEURE NE SE COUPE JAMAIS EN FIN DE LIGNE (« 7 h– » / « 22 h »), ni
      le numéro. Mesuré SANS la police du site : c'est le pire cas (réseau
      lent, police pas encore arrivée), et c'est là que la coupure se voyait.
   3. GOOGLE LIT LA MÊME CHOSE : le service client de 07:00 à 22:00, les
      réservations de 00:00 à 23:59, les sept jours.
   La phrase de nuit (22 h–7 h, heure de Paris) est éprouvée dans
   test-nouveau-preavis ; la ligne du comptoir et le bon, dans
   test-reception-bon.
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

execSync('sh construire.sh', { cwd: process.cwd(), stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { try { await stat(f + '.html'); f += '.html'; } catch { res.writeHead(404).end('non'); return; } }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8153, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8153';

const ok = [], ko = [], errs = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
/* Le U+2060 (après le tiret) et les insécables sont invisibles : on les
   ramène à une espace ordinaire avant de lire. */
const plat = t => (t || '').replace(/⁠/g, '').replace(/\s+/g, ' ');
const HEURES_FR = /7 h ?– ?22 h|de 7 h à 22 h/;
const HEURES_EN = /7 am ?– ?10 pm|from 7 am to 10 pm/;

const b = await chromium.launch();
async function ouvrir(w, chemin, police = true) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    return (u.startsWith(BASE) || (police && u.includes('fonts.g'))) ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(chemin + ' : ' + e.message.split('\n')[0]));
  await p.goto(BASE + chemin, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  return p;
}

/* ---- 1. Le numéro n'est jamais seul ---------------------------------- */
const PAGES = [
  ['/', 'fr'], ['/?lang=en', 'en'], ['/transfert-cdg-paris', 'fr'], ['/transfert-orly-paris', 'fr'],
  ['/chauffeur-prive-paris', 'fr'], ['/professionnels/', 'fr'], ['/404.html', 'fr'], ['/en/404.html', 'en'],
  ['/en/', 'en'], ['/en/cdg-airport-transfer-paris/', 'en'], ['/en/orly-airport-transfer-paris/', 'en'],
  ['/en/cdg-orly-transfer/', 'en'], ['/en/disneyland-paris-airport-transfer/', 'en'], ['/easyhotel-client/', 'fr'],
];
for (const [chemin, langue] of PAGES) {
  const p = await ouvrir(390, chemin);
  const lu = await p.evaluate(() => ({
    tel: [...document.querySelectorAll('a[href^="tel:"]')].some(a => a.offsetParent !== null),
    texte: document.body.innerText,
  }));
  const texte = plat(lu.texte);
  if (lu.tel) check(`${chemin} : le numéro proposé s'accompagne des horaires d'assistance`,
    (langue === 'fr' ? HEURES_FR : HEURES_EN).test(texte), langue);
  check(`${chemin} : aucun ancien horaire (5 h, 5 am)`, !/\b5 ?h ?– ?22|22 h à 5 h|\b5 am|to 5 am/.test(texte));
  check(`${chemin} : aucune assistance humaine promise 24 h/24`,
    !/(assistance humaine|live support|human support)[^.·]{0,12}24 ?(h ?\/ ?24|\/7)/i.test(texte));
  await p.context().close();
}

/* LA PAGE PRO NE MET EN SCÈNE AUCUNE HEURE OÙ PERSONNE NE RÉPOND (#426,
   25/10/2026). Son premier défi disait « Il le demande à 5 h » sous
   « Assistance humaine de 7 h à 22 h » : le directeur lisait que sa demande
   tomberait dans le vide. Toute heure citée sur la page, en français comme en
   anglais, tombe dans la plage d'assistance qu'elle annonce. */
{
  const p = await ouvrir(390, '/professionnels/');
  const lire = () => p.evaluate(() => document.body.innerText);
  const heures = (t, l) => l === 'fr'
    ? [...plat(t).matchAll(/\b(\d{1,2}) ?h\b/g)].map(m => +m[1])
    : [...plat(t).matchAll(/\b(\d{1,2}) ?(am|pm)\b/g)].map(m => (+m[1] % 12) + (m[2] === 'pm' ? 12 : 0));
  const fr = heures(await lire(), 'fr');
  await p.click('#langue'); await p.waitForTimeout(300);
  const en = heures(await lire(), 'en');
  const hors = [...fr, ...en].filter(h => h < 7 || h > 22);
  check('/professionnels/ : toute heure citée (FR et EN) tombe entre 7 h et 22 h, la plage d\'assistance annoncée',
    fr.length > 0 && en.length > 0 && hors.length === 0, JSON.stringify({ fr, en }));
  await p.context().close();
}

/* L'accueil : la même phrase dans le bandeau et au pied, en français et en
   anglais (une seule clé, hero_notes). */
for (const [chemin, langue] of [['/', 'fr'], ['/?lang=en', 'en']]) {
  const p = await ouvrir(390, chemin);
  const l = await p.evaluate(() => [document.querySelector('.hero-notes'), document.querySelector('.pied-horaires')]
    .map(e => e ? e.textContent : ''));
  check(`${chemin} : le bandeau et le pied disent la même phrase`, !!l[0] && l[0] === l[1], JSON.stringify(l.map(plat)));
  check(`${chemin} : réservation en ligne à toute heure, assistance aux heures dites`,
    langue === 'fr' ? /^Réservation 24 h\/24 · Assistance humaine 7 h–22 h$/.test(plat(l[0]))
                    : /^Book 24\/7 · Live support 7 am–10 pm \(Paris time\)$/.test(plat(l[0])), plat(l[0]));
  await p.context().close();
}

/* ---- 2. Rien ne se coupe en fin de ligne ------------------------------ */
const CIBLES = [['/', ['.hero-notes', '.pied-horaires']], ['/?lang=en', ['.hero-notes', '.pied-horaires']],
  ['/transfert-cdg-paris', ['footer']], ['/en/', ['.notes', 'footer > p']], ['/en/cdg-orly-transfer/', ['.notes', 'footer > p']],
  ['/professionnels/', ['.contact-in > p', '.demo-autres span']], ['/404.html', ['footer > p']], ['/en/404.html', ['footer > p']],
  ['/easyhotel-client/', ['.aide-horaires']]];
const coupures = []; let blocs = 0;
for (const w of [320, 360, 390, 768, 1024, 1366]) {
  for (const [chemin, sels] of CIBLES) {
    const p = await ouvrir(w, chemin, false);
    for (const sel of sels) {
      const lignes = await p.evaluate(sel => {
        const el = document.querySelector(sel); if (!el || !el.offsetHeight) return null;
        const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const car = []; let n;
        while ((n = tw.nextNode())) for (let i = 0; i < n.data.length; i++) {
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
          const rc = r.getClientRects()[0]; if (rc) car.push([n.data[i], Math.round(rc.top)]);
        }
        const out = []; let cur = '', haut = null;
        for (const [c, t] of car) {
          if (haut !== null && t > haut + 3 && c.trim() !== '') { out.push(cur); cur = ''; }
          if (haut === null || t > haut + 3) haut = t;
          cur += c;
        }
        out.push(cur); return out;
      }, sel);
      if (!lignes) continue; blocs++;
      for (let i = 0; i < lignes.length - 1; i++) {
        const fin = lignes[i].replace(/[\s⁠]+$/, ''), deb = lignes[i + 1].replace(/^[\s⁠]+/, '');
        if (/–$/.test(fin) || (/\d$/.test(fin) && /^\d/.test(deb)) || (/\b\d{1,2}$/.test(fin) && /^(h|am|pm)\b/.test(deb)))
          coupures.push(`${w} px ${chemin} ${sel} : « …${fin.slice(-16)} » | « ${deb.slice(0, 16)}… »`);
      }
    }
    await p.context().close();
  }
}
check(`aucune heure ni aucun numéro coupé en fin de ligne (${blocs} blocs, 320 à 1366 px, sans la police)`,
  blocs >= 60 && coupures.length === 0, coupures.slice(0, 4).join(' ; ') || `${blocs} blocs`);

/* ---- 3. Ce que lit Google --------------------------------------------- */
{
  const p = await ouvrir(390, '/');
  const blocsLd = await p.$$eval('script[type="application/ld+json"]', l => l.map(s => s.textContent));
  let ld = {}; try { ld = JSON.parse(blocsLd[0] || '{}'); } catch (e) { check('les données pour Google se lisent', false, e.message); }
  const org = (ld['@graph'] || []).find(n => n['@type'] === 'Organization') || {};
  const cps = [].concat(org.contactPoint || []);
  const jours = c => [].concat((c.hoursAvailable || {}).dayOfWeek || []).length;
  const service = cps.find(c => c.contactType === 'customer service') || {};
  const resa = cps.find(c => c.contactType === 'reservations') || {};
  check('Google : le service client (téléphone) répond de 07:00 à 22:00, les sept jours',
    service.telephone === '+33759312433' && (service.hoursAvailable || {}).opens === '07:00'
      && service.hoursAvailable.closes === '22:00' && jours(service) === 7, JSON.stringify(service.hoursAvailable));
  check('Google : les réservations en ligne sont ouvertes de 00:00 à 23:59, les sept jours',
    resa.url === 'https://elatransfer.com/' && (resa.hoursAvailable || {}).opens === '00:00'
      && resa.hoursAvailable.closes === '23:59' && jours(resa) === 7, JSON.stringify(resa.hoursAvailable));
  check('Google : aucun point de contact téléphonique annoncé 24 h/24',
    !cps.some(c => c.telephone && (c.hoursAvailable || {}).opens === '00:00'));
  await p.context().close();
}

await b.close(); serveur.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errs.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errs.length ? 1 : 0);
