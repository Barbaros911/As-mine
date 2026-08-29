// Tests des fonctionnalités ajoutées : bon de réservation, numéro de vol,
// passager tiers, adresses enregistrées, envoi par email.
import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';

// Le mode exploitant est protégé par un code d'accès. Le code lui-même n'a
// rien à faire dans un dépôt public : on lit l'empreinte que la page porte
// déjà, on la dépose comme si la saisie avait eu lieu, et on recharge. La
// serrure est bien franchie, pas contournée.
async function deverrouillerExploitant(page, base, suffixe = '') {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const empreinte = await page.evaluate(() => CODE_EXPLOITANT);
  await page.evaluate((e) => localStorage.setItem('ela_exploitant', e), empreinte);
  await page.goto(base + '/index.html?exploitant=1' + suffixe, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  // L'accueil de l'exploitant est son tableau de bord : le formulaire de
  // réservation s'ouvre par « Nouvelle réservation », comme il le ferait
  // quand un hôtel l'appelle.
  const form = page.locator('#accrocheClient');
  if (!(await form.isVisible())) {
    await page.locator('#btnNouvelleDemande').click();
    await page.waitForTimeout(300);
  }
}

const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
couperLeReseau(browser);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

// « ?exploitant=1 » : les outils internes (attribution, confirmation, registre,
// diffusion) ne s'affichent que sur l'appareil de l'exploitant.
await deverrouillerExploitant(page, BASE);
await page.waitForTimeout(800);
// L'espace exploitant est en français d'office : pas de sélecteur à régler.
await page.waitForTimeout(400);
await page.locator('#cookieAccept').click().catch(() => {});

async function pickAddress(field, text) {
  await page.fill(field, '');
  await page.type(field, text, { delay: 20 });
  await page.waitForTimeout(1500);
  await page.locator('#' + field.slice(1) + 'List [role=option]').first().click();
  await page.waitForTimeout(200);
}

// --- Trajet vers un terminal d'aéroport, avec numéro de vol ---
await pickAddress('#pickup', 'Neuilly');
check('champ numéro de vol masqué sans terminal', !(await page.locator('#flightWrap').isVisible()));
await page.fill('#dropoff', '');
await page.type('#dropoff', 'cdg', { delay: 20 });
await page.waitForTimeout(1500);
// Terminal 1, 2A, 2B, 2C, 2D, 2E → le sixième
await page.locator('#dropoffList [role=option]').nth(5).click();
await page.waitForTimeout(300);
check('terminal 2E retenu comme adresse d\'arrivée',
  (await page.inputValue('#dropoff')).includes('Terminal 2E'), await page.inputValue('#dropoff'));
check('champ numéro de vol présent dès qu\'un terminal est choisi',
  await page.locator('#flightWrap').isVisible());
await page.fill('#flightNumber', 'af1234');
await page.fill('#dateSimple', new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
check('écran véhicules atteint', await page.locator('#screen-vehicles').isVisible());
const tarifs = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('tarifs calculés à la distance', tarifs.length === 2, tarifs.join(' | '));
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
check('le client voit « Demande envoyée », pas une réservation ferme',
  (await page.locator('#screen-confirmation h2').textContent()).includes('Demande'));
check('le client est invité à attendre notre réponse',
  (await page.locator('#screen-confirmation').textContent()).includes('rien d\'autre à faire'));
// L'envoi n'est plus caché derrière un repli : tant que le client n'a pas
// appuyé, la demande n'est arrivée nulle part. C'est la seule chose qui lui
// reste à faire, elle doit donc être la plus visible de l'écran.
check('les trois moyens d\'envoi sont visibles d\'emblée',
  await page.locator('#btnResendWhatsapp').isVisible()
  && await page.locator('#btnSmsSummary').isVisible()
  && await page.locator('#btnEmailSummary').isVisible());
check('l\'envoi n\'est plus replié',
  (await page.locator('#screen-confirmation details').count()) === 0);
const mailto = await page.locator('#btnEmailSummary').getAttribute('href');
check('lien email correctement formé', mailto.startsWith('mailto:') && mailto.includes('ELA-'), mailto.slice(0, 60));

await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(400);
check('écran du bon atteint', await page.locator('#screen-voucher').isVisible());
const bon = await page.locator('#voucherBody').textContent();

check('bon : référence', /ELA-\d{2}-\d{2}-\d{4}/.test(bon));
check('bon : identité du client', bon.includes('Marie Durand'));
check('bon : passager distinct', bon.includes('Paul Martin'));
check('bon : trajet', bon.includes('Terminal 2E') && bon.includes('AF1234'));
check('bon : prix TTC et TVA', bon.includes('TVA') && /€/.test(bon));
check('bon : règlement à bord', bon.includes('régler à bord'));
check('bon : mention d\'intermédiaire', bon.includes('met en relation'));
check('bon : aucune information chauffeur', !bon.includes('N° carte pro.'));
check('bon : en attente de confirmation', bon.includes('En attente de confirmation'));

// L'exploitant confirme la course
check('bouton de confirmation proposé', await page.locator('#btnConfirmRide').isVisible());
await page.locator('#btnConfirmRide').click();
await page.waitForTimeout(400);
const bonConf = await page.locator('#voucherBody').textContent();
check('bon : demande prise en charge après validation',
  bonConf.includes('prise en charge'), bonConf.slice(0, 110));
check('bouton bascule sur annulation',
  (await page.locator('#btnConfirmRide').textContent()).includes('Annuler'));
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
check('facture : le chauffeur y figure, contrairement au bon',
  fact.includes('Émetteur') || fact.includes('émetteur'));
const numero1 = (fact.match(/AS-\d{4}-\d{4}/)||[''])[0];
// Rouvrir la facture ne doit pas consommer un nouveau numéro
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);
await page.locator('#tabInvoice').click();
await page.waitForTimeout(300);
fact = await page.locator('#voucherBody').textContent();
check('facture : le numéro ne change pas à la réouverture',
  (fact.match(/AS-\d{4}-\d{4}/)||[''])[0] === numero1, numero1);
check('outils de facturation affichés', await page.locator('#invoiceTools').isVisible());
check('rappel du poste unique', (await page.locator('#invoiceTools').textContent()).includes('depuis cet appareil'));
const csv = await page.evaluate(() => registreFacturesCsv());
check('registre CSV : en-tête', csv.startsWith('"Numero";"Date facture"'), csv.split('\r\n')[0].slice(0,40));
check('registre CSV : la facture émise y figure', csv.includes(numero1));
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);

// --- Remise à zéro ---
// Retour depuis le bon vers l'écran de confirmation
await page.locator('#screen-voucher .btn-back').click();
await page.waitForTimeout(300);
check('retour du bon vers la confirmation', await page.locator('#screen-confirmation').isVisible());
await page.locator('#btnNewBooking').click();
await page.waitForTimeout(400);
check('formulaire vidé après nouvelle réservation', (await page.inputValue('#clientName')) === '');
check('case « pour quelqu\'un d\'autre » décochée', !(await page.locator('#forSomeoneElse').isChecked()));
check('plus de raccourcis d\'adresses sous les champs',
  (await page.locator('#pickupFavourites').count()) === 0 &&
  (await page.locator('#dropoffFavourites').count()) === 0);
check('aucune adresse laissée sur l\'appareil',
  await page.evaluate(() => localStorage.getItem('ela_addresses') === null));
check('passagers remis à 1', (await page.inputValue('#paxHome')) === '1');
check('véhicule remis sur la berline', (await page.inputValue('#vehicleHome')) === 'berline');

// --- Une adresse d'aéroport se tarife à la distance, comme les autres ---
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
check('plus de bascule vers un forfait : tarif à la distance',
  !sousTitre.includes('Forfait') && /km/.test(sousTitre), sousTitre);
const tarifsAuto = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('véhicules tarifés', tarifsAuto.length === 2, tarifsAuto.join(' | '));

// --- Trace des courses ---
// « Mes réservations » est un écran de client : côté exploitant, cet onglet
// est devenu sa page de gestion. On repasse donc par le site public, où les
// courses de cet appareil sont bien celles du client.
await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);
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
  (await page.locator('#voucherBody').textContent()).includes('ELA-'));

// --- Réservation réglée au chauffeur ---
// Retour à l'espace de travail, formulaire ouvert.
await page.goto(BASE + '/index.html?exploitant=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
if (!(await page.locator('#accrocheClient').isVisible())) {
  await page.locator('#btnNouvelleDemande').click();
  await page.waitForTimeout(300);
}
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
check('contenu de référencement masqué à l\'exploitant',
  !(await page.locator('#seoContent').isVisible()));
// Il reste dans la page : Google l'explore, et un client le voit.
const seoTxt = await page.locator('#seoContent').textContent();
check('contenu de référencement toujours présent dans la page', seoTxt.length > 200);
check('mots-clés visés présents', seoTxt.includes('VTC') && seoTxt.includes('Roissy') && seoTxt.includes('Orly'));
const ld = await page.locator('script[type="application/ld+json"]').count();
check('données structurées présentes', ld === 1, ld + ' bloc(s)');
check('plus de FAQ déclarée sans contenu visible',
  !(await page.content()).includes('FAQPage'));
const titre = await page.title();
check('titre orienté recherche locale', titre.includes('Roissy') && titre.includes('VTC'), titre);
const canon = await page.locator('link[rel=canonical]').getAttribute('href');
check('adresse canonique déclarée', canon.startsWith('https://'), canon);
// Le sélecteur de langue n'existe que côté client : on repasse sur le site
// public pour vérifier que le bloc de référencement suit bien la langue.
await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
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
