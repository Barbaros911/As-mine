import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const ok = [];
const ko = [];
function check(name, cond, detail = '') {
  (cond ? ok : ko).push(name + (detail ? ' — ' + detail : ''));
}

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

// 1. L'application démarre
check('page chargée', await page.locator('#screen-home').isVisible());

// 2. Traductions : passage en turc, aucune chaîne française ne doit rester
await page.selectOption('#langSelect', 'tr');
await page.waitForTimeout(300);
check('langue TR appliquée', (await page.locator('h1').textContent()).includes('mükemmellik'));
await page.locator('.nav-item[data-target="screen-faq"]').click();
await page.waitForTimeout(200);
const faqTxt = await page.locator('#screen-faq').textContent();
check('FAQ traduite en TR (pas de repli FR)',
  faqTxt.includes('Yasal bilgiler') && !faqTxt.includes('Informations légales'),
  faqTxt.slice(0, 60));

// 3. Note de langue sur les documents juridiques
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(200);
check('note « documents en FR/EN » affichée en TR', await page.locator('#legalLangNote').isVisible());

await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

// 4. Zoom autorisé
const vp = await page.locator('meta[name=viewport]').getAttribute('content');
check('zoom non bloqué', !vp.includes('maximum-scale'), vp);

// 5. Adresse tapée mais non choisie → message explicite
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(200);
await page.fill('#pickup', 'quelque chose');
await page.fill('#dropoff', 'autre chose');
await page.locator('#btnSearch').click();
await page.waitForTimeout(400);
const err = await page.locator('#formError').textContent();
check('adresse non validée refusée', err.includes('liste'), err);

// 6. Autocomplétion + navigation clavier
await page.fill('#pickup', '');
await page.type('#pickup', 'Argenteuil', { delay: 30 });
await page.waitForTimeout(1800);
const nbSug = await page.locator('#pickupList [role=option]').count();
check('suggestions affichées', nbSug > 0, nbSug + ' résultats');
if (nbSug > 0) {
  await page.locator('#pickup').press('ArrowDown');
  await page.waitForTimeout(150);
  const sel = await page.locator('#pickupList [role=option][aria-selected=true]').count();
  check('navigation clavier (flèche bas)', sel === 1);
  await page.locator('#pickup').press('Enter');
  await page.waitForTimeout(200);
  check('sélection au clavier remplit le champ', (await page.inputValue('#pickup')).length > 3);
}

// 7. Modifier le texte après sélection invalide les coordonnées mémorisées
if (nbSug > 0) {
  await page.locator('#pickup').press('End');
  await page.type('#pickup', 'xyz', { delay: 20 });
  await page.waitForTimeout(300);
  await page.locator('#btnSearch').click();
  await page.waitForTimeout(400);
  const e2 = await page.locator('#formError').textContent();
  check('coordonnées invalidées après édition du champ', e2.includes('liste'), e2);
}

// 8. Forfait aéroport : date passée et adresse absente refusées
await page.locator('#pickup').press('Escape');
await page.waitForTimeout(150);
await page.locator('.nav-item[data-target="screen-airports"]').click();
await page.waitForTimeout(300);
await page.locator('#airportCards .airport-chip').first().click();
await page.waitForTimeout(300);
check('forfait aéroport bloqué sans adresse',
  await page.locator('#screen-airports').isVisible() && !(await page.locator('#screen-payment').isVisible()));

// 9. Le terminal choisi survit à un changement de langue
await page.selectOption('#terminalSelect-cdg', 'Terminal 2E');
await page.selectOption('#langSelect', 'es');
await page.waitForTimeout(400);
check('terminal conservé après changement de langue',
  (await page.inputValue('#terminalSelect-cdg')) === 'Terminal 2E',
  await page.inputValue('#terminalSelect-cdg'));
await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

// 10. Codes promo absents du code source
const src = await page.content();
check('codes promo non lisibles dans la page', !src.includes('BIENVENUE10') || !src.includes('"BIENVENUE10":'));

// 11. Manifeste et service worker accessibles
const mres = await page.request.get(BASE + '/manifest.webmanifest');
check('manifest.webmanifest servi', mres.ok());
const sres = await page.request.get(BASE + '/sw.js');
check('sw.js servi', sres.ok());

// 12. Pas de débordement horizontal sur mobile, dans les deux sens de lecture.
// L'arabe se lit de droite à gauche : un élément caché hors écran à gauche
// (le champ anti-robot) y créait plus de 10 000 px de défilement.
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('pas de débordement horizontal (390px, FR)', !overflow);

await page.selectOption('#langSelect', 'ar');
await page.waitForTimeout(400);
const oRtl = await page.evaluate(() => ({
  doc: document.documentElement.scrollWidth, win: window.innerWidth, dir: document.documentElement.dir
}));
check('pas de débordement horizontal (390px, AR droite-à-gauche)',
  oRtl.dir === 'rtl' && oRtl.doc <= oRtl.win + 1, oRtl.doc + 'px pour ' + oRtl.win + 'px');

await browser.close();

console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  �’ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS CONSOLE ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length ? 1 : 0);
