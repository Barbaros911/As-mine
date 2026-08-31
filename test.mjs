import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';
const errors = [];
const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
couperLeReseau(browser);
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });

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
await page.selectOption('#langSelect', 'es');
await page.waitForTimeout(300);
check('langue ES appliquée', (await page.locator('h1').textContent()).includes('chófer'));
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(200);
const qrTxt = await page.locator('#screen-qr').textContent();
check('écran QR traduit en ES (pas de repli FR)',
  qrTxt.includes('Información legal') && !qrTxt.includes('Informations légales'),
  qrTxt.slice(0, 60));

// 3. Note de langue sur les documents juridiques
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(200);
check('note « documents en FR/EN » affichée en ES', await page.locator('#legalLangNote').isVisible());

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
  // Le bouton s'efface tant que la liste d'adresses est ouverte : sur un
  // téléphone elle passe par-dessus lui, et on appuierait sur une rue en
  // visant « Voir les tarifs ». On referme donc, comme le ferait le client.
  check('le bouton s\'efface sous une liste ouverte',
    !(await page.locator('#btnSearch').isVisible()));
  await page.locator('#pickup').press('Escape');
  await page.waitForTimeout(200);
  check('il revient dès que la liste se ferme', await page.locator('#btnSearch').isVisible());
  await page.locator('#btnSearch').click();
  await page.waitForTimeout(400);
  const e2 = await page.locator('#formError').textContent();
  check('coordonnées invalidées après édition du champ', e2.includes('liste'), e2);
}

// 8. Plus de forfait aéroport : les terminaux restent des adresses comme les autres
check('écran des forfaits aéroport supprimé', (await page.locator('#screen-airports').count()) === 0);
check('onglet « Aéroports » retiré de la navigation',
  (await page.locator('.nav-item[data-target="screen-airports"]').count()) === 0);
await page.fill('#pickup', '');
await page.fill('#dropoff', '');
await page.type('#dropoff', 'cdg', { delay: 20 });
await page.waitForTimeout(1500);
const termCount = await page.locator('#dropoffList [role=option]').count();
check('terminaux CDG proposés comme adresses', termCount === 9, termCount + ' option(s)');
const premierTerm = await page.locator('#dropoffList [role=option]').first().textContent();
check('libellé de terminal complet', premierTerm.includes('Roissy') && premierTerm.includes('Terminal'), premierTerm.trim());

// 9. Le numéro de vol n'apparaît qu'avec un terminal
check('champ numéro de vol masqué par défaut', !(await page.locator('#flightWrap').isVisible()));
await page.locator('#dropoffList [role=option]').first().click();
await page.waitForTimeout(300);
check('champ numéro de vol affiché après le choix d\'un terminal',
  await page.locator('#flightWrap').isVisible());

// 10. Plus aucun code promo dans le site — ni le champ, ni les empreintes.
//     Ils annulaient la hausse de tarifs : un client qui avait reçu VIP15 une
//     fois payait l'ancien prix à vie, sans date de fin ni compteur d'usage.
const src = await page.content();
check('plus aucun code promo dans la page',
  !src.includes('BIENVENUE10') && !src.includes('VIP15')
  && !src.includes('promoPayment') && !src.includes('Code promo'));

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

/* ============ LE SITE S'OUVRE DANS LA LANGUE DU VISITEUR ============
   Un client espagnol qui tombe sur du français ne cherche pas le sélecteur :
   il retourne à sa liste de résultats. On éprouve donc la détection sur de
   vraies étiquettes de navigateur, variantes régionales comprises, et le
   repli en français pour une langue qu'on ne parle pas. */
for (const [locale, attendu] of [['es-ES', 'es'], ['es-MX', 'es'], ['en-GB', 'en'],
                                 ['pt-BR', 'pt'], ['ar-SA', 'ar'], ['zh-CN', 'zh'],
                                 ['de-DE', 'fr'], ['ja-JP', 'fr']]) {
  const ctx = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  const vu = await p.evaluate(() => ({
    sel: document.getElementById('langSelect').value, doc: document.documentElement.lang
  }));
  check(`un navigateur en ${locale} ouvre le site en ${attendu}`,
    vu.sel === attendu && vu.doc === attendu, vu.sel + ' / ' + vu.doc);
  await ctx.close();
}
{
  // Le choix explicite du visiteur passe AVANT sa langue système : un
  // Espagnol qui met le site en anglais a ses raisons, on ne le corrige pas.
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  check('sans choix du visiteur, rien n\'est écrit sur son appareil',
    (await p.evaluate(() => localStorage.getItem('ela_langue'))) === null);
  await p.selectOption('#langSelect', 'en');
  await p.waitForTimeout(300);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  check('son choix explicite l\'emporte sur la langue du téléphone',
    (await p.evaluate(() => document.getElementById('langSelect').value)) === 'en');
  await ctx.close();
}

await browser.close();

console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  �’ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS CONSOLE ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length ? 1 : 0);
