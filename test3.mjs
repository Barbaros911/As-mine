// Tests des fonctionnalités ajoutées : bon de réservation, numéro de vol,
// passager tiers, adresses enregistrées, envoi par email.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(400);
await page.locator('#cookieAccept').click().catch(() => {});

async function pickAddress(field, text) {
  await page.fill(field, '');
  await page.type(field, text, { delay: 20 });
  await page.waitForTimeout(1500);
  await page.locator('#' + field.slice(1) + 'List [role=option]').first().click();
  await page.waitForTimeout(200);
}

// --- Forfait aéroport avec numéro de vol ---
await page.locator('.nav-item[data-target="screen-airports"]').click();
await page.waitForTimeout(300);
await page.locator('#airportChoice button').first().click();
await page.waitForTimeout(300);
check('champ numéro de vol présent', await page.locator('#flightNumber').isVisible());

await pickAddress('#addressAirport', 'Neuilly');
await page.fill('#dateAirport', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
await page.waitForTimeout(300);
await page.fill('#flightNumber', 'af1234');
await page.selectOption('#terminalSelect', 'Terminal 2E');
await page.locator('#btnAirportSearch').click();
await page.waitForTimeout(800);
check('écran véhicules atteint avec tarifs forfaitaires', await page.locator('#screen-vehicles').isVisible());
const tarifs = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('forfait CDG : 56 € pour la berline', tarifs[0].includes('56'), tarifs.join(' | '));
await page.locator('#vehicleCards .veh-card').first().click();
await page.waitForTimeout(200);
await page.locator('#btnToPayment').click();
await page.waitForTimeout(500);

check('écran paiement atteint', await page.locator('#screen-payment').isVisible());
let recap = await page.locator('#tripSummary').textContent();
check('vol repris dans le récapitulatif', recap.includes('AF1234'), recap.includes('AF1234') ? '' : recap.slice(0, 90));
check('terminal repris dans le récapitulatif', recap.includes('Terminal 2E'));

// --- Réservation pour un tiers ---
await page.fill('#clientName', 'Marie Durand');
await page.fill('#clientPhone', '+33 6 11 22 33 44');
check('champs passager masqués par défaut', !(await page.locator('#passengerFields').isVisible()));
await page.locator('#forSomeoneElse').check();
await page.waitForTimeout(200);
check('champs passager affichés après cochage', await page.locator('#passengerFields').isVisible());
await page.fill('#passengerName', 'Paul Martin');
await page.fill('#passengerPhone', '+33 6 55 44 33 22');
await page.waitForTimeout(300);
recap = await page.locator('#tripSummary').textContent();
check('passager repris dans le récapitulatif', recap.includes('Paul Martin'));

// Décocher doit effacer le passager
await page.locator('#forSomeoneElse').uncheck();
await page.waitForTimeout(300);
recap = await page.locator('#tripSummary').textContent();
check('passager effacé après décochage', !recap.includes('Paul Martin'));
await page.locator('#forSomeoneElse').check();
await page.fill('#passengerName', 'Paul Martin');
await page.waitForTimeout(300);

// --- Bon de réservation : on simule une réservation payée ---
await page.evaluate(() => finalizeBooking());
await page.waitForTimeout(500);
check('écran de confirmation atteint', await page.locator('#screen-confirmation').isVisible());
check('bouton email présent', await page.locator('#btnEmailSummary').isVisible());
const mailto = await page.locator('#btnEmailSummary').getAttribute('href');
check('lien email correctement formé', mailto.startsWith('mailto:') && mailto.includes('ASM-'), mailto.slice(0, 60));

await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(400);
check('écran du bon atteint', await page.locator('#screen-voucher').isVisible());
const bon = await page.locator('#voucherBody').textContent();

check('bon : référence', /ASM-\d{6}/.test(bon));
check('bon : identité du client', bon.includes('Marie Durand'));
check('bon : passager distinct', bon.includes('Paul Martin'));
check('bon : trajet', bon.includes('Terminal 2E') && bon.includes('AF1234'));
check('bon : prix TTC et TVA', bon.includes('TVA') && /€/.test(bon));
check('bon : règlement à bord', bon.includes('régler à bord'));
check('bon : transporteur à compléter signalé', bon.includes('Communiqué avant la prise en charge'));
check('bon : mention d\'intermédiaire', bon.includes('met en relation'));
check('bon : avertissement opérateur incomplet',
  await page.locator('#voucherIncomplete').isVisible());

// --- Facture ---
check('onglet facture proposé', await page.locator('#tabInvoice').isVisible());
check('titre de l\'écran : bon', (await page.locator('#docTitle').textContent()).includes('Bon'));
await page.locator('#tabInvoice').click();
await page.waitForTimeout(400);
let fact = await page.locator('#voucherBody').textContent();
check('facture : numéro séquentiel', /AS-\d{4}-\d{4}/.test(fact), (fact.match(/AS-\d{4}-\d{4}/)||[''])[0]);
check('facture : mention TVA 10%', fact.includes('TVA 10%'));
check('titre de l\'écran : facture', (await page.locator('#docTitle').textContent()).includes('Facture'));
check('facture : montants HT et TTC', fact.includes('Prix HT') && fact.includes('Prix total'));
check('facture : émetteur manquant signalé', await page.locator('#voucherIncomplete').isVisible());
const numero1 = (fact.match(/AS-\d{4}-\d{4}/)||[''])[0];
// Rouvrir la facture ne doit pas consommer un nouveau numéro
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);
await page.locator('#tabInvoice').click();
await page.waitForTimeout(300);
fact = await page.locator('#voucherBody').textContent();
check('facture : le numéro ne change pas à la réouverture',
  (fact.match(/AS-\d{4}-\d{4}/)||[''])[0] === numero1, numero1);
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);

// --- Adresses enregistrées ---
// Retour depuis le bon vers l'écran de confirmation
await page.locator('#screen-voucher .btn-back').click();
await page.waitForTimeout(300);
check('retour du bon vers la confirmation', await page.locator('#screen-confirmation').isVisible());
await page.locator('#btnNewBooking').click();
await page.waitForTimeout(400);
check('formulaire vidé après nouvelle réservation', (await page.inputValue('#clientName')) === '');
check('case « pour quelqu\'un d\'autre » décochée', !(await page.locator('#forSomeoneElse').isChecked()));
const nbFav = await page.locator('#pickupFavourites button').count();
check('adresses enregistrées proposées', nbFav > 0, nbFav + ' raccourci(s)');
if (nbFav > 0) {
  await page.locator('#pickupFavourites button').first().click();
  await page.waitForTimeout(300);
  check('raccourci remplit le champ départ', (await page.inputValue('#pickup')).length > 3);
  // et l'adresse doit compter comme validée : la recherche ne doit pas la refuser
  await pickAddress('#dropoff', 'Versailles');
  await page.fill('#dateSimple', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  await page.waitForTimeout(300);
  await page.locator('#btnSearch').click();
  // Le calcul d'itinéraire attend jusqu'à 4 s avant de basculer sur l'estimation
  await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  check('raccourci accepté comme adresse valide', await page.locator('#screen-vehicles').isVisible(),
    await page.locator('#formError').textContent());
}

// --- Forfait détecté automatiquement depuis l'accueil ---
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
await page.fill('#pickup', '');
await page.type('#pickup', 'Argenteuil', { delay: 20 });
await page.waitForTimeout(1500);
await page.locator('#pickupList [role=option]').first().click();
await page.fill('#dropoff', '');
await page.type('#dropoff', 'cdg', { delay: 20 });
await page.waitForTimeout(1800);
const optCdg = await page.locator('#dropoffList [role=option]').count();
check('terminaux CDG proposés à la saisie', optCdg > 0, optCdg + ' option(s)');
await page.locator('#dropoffList [role=option]').first().click();
await page.waitForTimeout(200);
await page.fill('#dateSimple', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
await page.waitForTimeout(200);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
const sousTitre = await page.locator('#vehiclesSub').textContent();
check('adresse aéroport bascule sur le forfait', sousTitre.includes('Forfait'), sousTitre);
const tarifsAuto = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('prix forfaitaire appliqué, pas le kilométrique', tarifsAuto[0].includes('56'), tarifsAuto.join(' | '));

// --- Trace des courses ---
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(400);
check('raccourci « Mes réservations » affiché', await page.locator('#btnMyBookings').isVisible());
await page.locator('#btnMyBookings').click();
await page.waitForTimeout(400);
check('écran des réservations atteint', await page.locator('#screen-bookings').isVisible());
const nbCourses = await page.locator('#bookingsList button').count();
check('course passée listée', nbCourses > 0, nbCourses + ' course(s)');
await page.locator('#bookingsList button').first().click();
await page.waitForTimeout(400);
check('le bon se rouvre depuis la liste',
  (await page.locator('#screen-voucher').isVisible()) &&
  (await page.locator('#voucherBody').textContent()).includes('ASM-'));

// --- Réservation réglée au chauffeur ---
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
await pickAddress('#pickup', 'Neuilly');
await pickAddress('#dropoff', 'Versailles');
await page.fill('#dateSimple', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
await page.waitForTimeout(200);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
await page.locator('#vehicleCards .veh-card').first().click();
await page.locator('#btnToPayment').click();
await page.waitForTimeout(500);
await page.locator('#btnPayOnBoard').click();
await page.waitForTimeout(400);
check('réservation refusée sans coordonnées', !(await page.locator('#screen-confirmation').isVisible()));
await page.fill('#clientName', 'Sophie Bernard');
await page.fill('#clientPhone', '+33 6 98 76 54 32');
await page.locator('#btnPayOnBoard').click();
await page.waitForTimeout(600);
check('réservation confirmée', await page.locator('#screen-confirmation').isVisible());
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(400);
const bonBord = await page.locator('#voucherBody').textContent();
check('bon : mention « à régler à bord »', bonBord.includes('régler à bord'), bonBord.slice(-100));

// --- Référencement ---
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
check('contenu de référencement présent', await page.locator('#seoContent').isVisible());
const seoTxt = await page.locator('#seoContent').textContent();
check('mots-clés visés présents', seoTxt.includes('VTC') && seoTxt.includes('Roissy') && seoTxt.includes('Orly'));
const ld = await page.locator('script[type="application/ld+json"]').count();
check('données structurées présentes', ld === 1, ld + ' bloc(s)');
check('plus de FAQ déclarée sans contenu visible',
  !(await page.content()).includes('FAQPage'));
const titre = await page.title();
check('titre orienté recherche locale', titre.includes('Roissy') && titre.includes('VTC'), titre);
const canon = await page.locator('link[rel=canonical]').getAttribute('href');
check('adresse canonique déclarée', canon.startsWith('https://'), canon);
await page.selectOption('#langSelect', 'es');
await page.waitForTimeout(400);
check('bloc français masqué dans les autres langues', !(await page.locator('#seoContent').isVisible()));
await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
