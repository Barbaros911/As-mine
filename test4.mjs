// Tests des fonctionnalités ajoutées : numéro de chambre d'hôtel,
// aller-retour, diffusion au groupe de chauffeurs, mode exploitant.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

// Les API d'adresses ne sont pas joignables depuis les tests : on remplace la
// source de suggestions pour que le parcours soit reproductible et instantané.
async function stubSuggestions(page, item) {
  await page.evaluate((it) => { window.fetchAddressSuggestions = async () => [it]; }, item);
}
async function pick(page, field, texte) {
  await page.fill(field, '');
  await page.type(field, texte, { delay: 10 });
  await page.locator('#' + field.slice(1) + 'List [role=option]').first().waitFor({ timeout: 5000 });
  await page.locator('#' + field.slice(1) + 'List [role=option]').first().click();
  await page.waitForTimeout(150);
}
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto(BASE + '/index.html?exploitant=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await page.selectOption('#langSelect', 'fr');
await page.locator('#cookieAccept').click().catch(() => {});
await page.waitForTimeout(200);

// --- Reconnaissance d'un hôtel ---
const reconnu = await page.evaluate(() => [
  estHotel({ label: 'Hôtel Ibis, 75012 Paris' }),
  estHotel({ label: 'Le Comptoir', categorie: 'hotel' }),
  estHotel({ label: 'Mercure Paris Bercy, 75012 Paris' }),
  estHotel({ label: '15 avenue Montaigne, 75008 Paris' }),
  estHotel(null)
]);
check('hôtel reconnu par le libellé', reconnu[0] === true);
check('hôtel reconnu par la catégorie OpenStreetMap', reconnu[1] === true);
check('enseigne hôtelière reconnue sans le mot « hôtel »', reconnu[2] === true);
check('adresse ordinaire non prise pour un hôtel', reconnu[3] === false);
check('absence d\'adresse gérée sans erreur', reconnu[4] === false);

// --- Le champ chambre n'apparaît que pour un hôtel ---
check('champ chambre masqué au départ', !(await page.locator('#roomPickupWrap').isVisible()));
await stubSuggestions(page, HOTEL);
await pick(page, '#pickup', 'ibis');
check('champ chambre affiché après le choix d\'un hôtel', await page.locator('#roomPickupWrap').isVisible());
await page.fill('#roomPickup', '412');

await stubSuggestions(page, BUREAU);
await pick(page, '#dropoff', 'montaigne');
check('champ chambre absent pour une adresse ordinaire', !(await page.locator('#roomDropoffWrap').isVisible()));

// Revenir à une adresse ordinaire au départ doit refermer ET vider le champ
await pick(page, '#pickup', 'montaigne');
check('champ chambre refermé si l\'adresse change', !(await page.locator('#roomPickupWrap').isVisible()));
check('chambre effacée avec le champ', (await page.inputValue('#roomPickup')) === '');

// On repose l'hôtel au départ pour la suite
await stubSuggestions(page, HOTEL);
await pick(page, '#pickup', 'ibis');
await page.fill('#roomPickup', '412');
await stubSuggestions(page, BUREAU);
await pick(page, '#dropoff', 'montaigne');
await page.fill('#dateSimple', dansNJours(3));
await page.waitForTimeout(200);

// --- Aller-retour ---
check('champs de retour masqués tant que la case n\'est pas cochée',
  !(await page.locator('#returnFieldsSimple').isVisible()));
await page.locator('#roundTripSimple').check();
await page.waitForTimeout(200);
check('champs de retour affichés après cochage', await page.locator('#returnFieldsSimple').isVisible());
check('date de retour alignée sur l\'aller', (await page.inputValue('#dateReturnSimple')) === dansNJours(3));
const minRetour = await page.locator('#dateReturnSimple').getAttribute('min');
check('retour impossible avant l\'aller', minRetour === dansNJours(3), minRetour);

// Un retour à la même date mais à une heure antérieure doit être refusé
await page.selectOption('#timeSimple', { index: 100 }).catch(() => {});
await page.selectOption('#timeReturnSimple', { index: 0 });
await page.locator('#btnSearch').click();
await page.waitForTimeout(400);
const err = await page.locator('#formError').textContent();
check('retour antérieur à l\'aller refusé', err.includes('postérieur'), err);
check('on reste sur l\'accueil', await page.locator('#screen-home').isVisible());

// Retour valide : le lendemain
await page.fill('#dateReturnSimple', dansNJours(4));
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
check('écran véhicules atteint en aller-retour', await page.locator('#screen-vehicles').isVisible());
check('mention du tarif aller-retour affichée', await page.locator('#returnNote').isVisible());
const prixAR = await page.evaluate(() => ({
  aller: prixAller(VEHICLES[0]),
  total: priceForVehicle(VEHICLES[0])
}));
check('tarif doublé pour un aller-retour',
  Math.abs(prixAR.total - prixAR.aller * 2) < 0.01, `${prixAR.aller.toFixed(2)} → ${prixAR.total.toFixed(2)}`);

await page.locator('#vehicleCards .veh-card').first().click();
await page.locator('#btnToPayment').click();
await page.waitForTimeout(400);
const recap = await page.locator('#tripSummary').textContent();
check('récapitulatif : chambre reprise au départ', recap.includes('Ch. 412'), recap.slice(0, 120));
check('récapitulatif : retour repris', recap.includes(dansNJours(4)));

// --- Bon de réservation ---
await page.fill('#clientName', 'Claire Fontaine');
await page.fill('#clientPhone', '+33 6 12 34 56 78');
await page.locator('#btnPayOnBoard').click();
await page.waitForTimeout(500);
check('réservation confirmée', await page.locator('#screen-confirmation').isVisible());
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(400);
const bon = await page.locator('#voucherBody').textContent();
check('bon : chambre reprise', bon.includes('Ch. 412'));
check('bon : retour repris', bon.includes('Retour') && bon.includes(dansNJours(4)));
await page.locator('#tabInvoice').click();
await page.waitForTimeout(300);
const fact = await page.locator('#voucherBody').textContent();
check('facture : chambre reprise', fact.includes('Ch. 412'));
check('facture : retour repris', fact.includes(dansNJours(4)));
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);

// --- Diffusion au groupe de chauffeurs ---
check('bloc de diffusion proposé à l\'exploitant', await page.locator('#dispatchBlock').isVisible());
const annonce = await page.locator('#dispatchPreview').textContent();
check('annonce : référence de la course', /ASM-\d{6}/.test(annonce));
check('annonce : trajet et horaire', annonce.includes('Ibis') && annonce.includes(dansNJours(3)));
check('annonce : aller-retour signalé', annonce.includes(dansNJours(4)));
check('annonce : montant pour le chauffeur', annonce.includes('Pour le chauffeur'));
check('annonce : sans le nom du client', !annonce.includes('Claire Fontaine'));
check('annonce : sans le téléphone du client', !annonce.includes('12 34 56 78'));
check('annonce : sans le numéro de chambre', !annonce.includes('412'), annonce.slice(0, 160));
const partAnnonce = await page.evaluate(() => ({
  total: lastVoucher.prix.total,
  net: lastVoucher.prix.total * (1 - COMMISSION_APPORT)
}));
check('annonce : commission retenue sur le montant diffusé',
  annonce.includes(partAnnonce.net.toFixed(2).replace('.', ',')),
  `${partAnnonce.total.toFixed(2)} → ${partAnnonce.net.toFixed(2)}`);
const lienGroupe = await page.locator('#btnDispatchWhatsapp').getAttribute('href');
check('lien de partage WhatsApp sans destinataire imposé',
  lienGroupe.startsWith('https://wa.me/?text='), lienGroupe.slice(0, 40));

// --- Remise à zéro ---
await page.locator('#screen-voucher .btn-back').click();
await page.waitForTimeout(200);
await page.locator('#btnNewBooking').click();
await page.waitForTimeout(400);
check('case aller-retour décochée après remise à zéro', !(await page.locator('#roundTripSimple').isChecked()));
check('champs de retour refermés', !(await page.locator('#returnFieldsSimple').isVisible()));
check('champ chambre refermé', !(await page.locator('#roomPickupWrap').isVisible()));
check('chambre vidée', (await page.inputValue('#roomPickup')) === '');

// --- Forfait aéroport : hôtel et aller-retour ---
await page.locator('.nav-item[data-target="screen-airports"]').click();
await page.waitForTimeout(300);
await page.locator('#airportChoice button').first().click();
await page.waitForTimeout(300);
check('champ chambre masqué sur l\'écran aéroport', !(await page.locator('#roomAirportWrap').isVisible()));
await stubSuggestions(page, HOTEL);
await pick(page, '#addressAirport', 'ibis');
check('champ chambre affiché pour un hôtel en aéroport', await page.locator('#roomAirportWrap').isVisible());
await page.fill('#roomAirport', '318');
await page.fill('#dateAirport', dansNJours(5));
await page.waitForTimeout(300);
await page.locator('#roundTripAirport').check();
await page.waitForTimeout(200);
await page.fill('#dateReturnAirport', dansNJours(7));
await page.waitForTimeout(300);
await page.locator('#btnAirportSearch').click();
await page.waitForTimeout(600);
check('forfait aéroport atteint en aller-retour', await page.locator('#screen-vehicles').isVisible());
const tarifsAp = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('forfait aéroport doublé (56 € → 112 €)', tarifsAp[0].includes('112'), tarifsAp.join(' | '));
await page.locator('#vehicleCards .veh-card').first().click();
await page.locator('#btnToPayment').click();
await page.waitForTimeout(400);
const recapAp = await page.locator('#tripSummary').textContent();
check('forfait aéroport : chambre au départ (Paris → aéroport)', recapAp.includes('Ch. 318'), recapAp.slice(0, 140));
check('forfait aéroport : retour repris', recapAp.includes(dansNJours(7)));

// --- Côté client : les outils internes restent invisibles ---
const clientCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const clientPage = await clientCtx.newPage();
clientPage.on('pageerror', e => errors.push('PAGEERROR(client): ' + e.message));
await clientPage.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await clientPage.waitForTimeout(600);
await clientPage.selectOption('#langSelect', 'fr');
await clientPage.locator('#cookieAccept').click().catch(() => {});
await clientPage.evaluate(() => {
  state.pickup = { label: 'A', lat: 48.85, lon: 2.35 };
  state.dropoff = { label: 'B', lat: 48.86, lon: 2.36 };
  state.date = '2030-01-01'; state.time = '10:00'; state.vehicle = 'berline'; state.price = 60;
  finalizeBooking();
});
await clientPage.waitForTimeout(400);
await clientPage.locator('#btnOpenVoucher').click();
await clientPage.waitForTimeout(400);
check('client : bon de réservation accessible', await clientPage.locator('#voucherBody').isVisible());
check('client : pas de bouton de confirmation', !(await clientPage.locator('#confirmRide').isVisible()));
check('client : pas de diffusion au groupe', !(await clientPage.locator('#dispatchBlock').isVisible()));
await clientPage.locator('#tabInvoice').click();
await clientPage.waitForTimeout(300);
check('client : sa facture reste consultable',
  (await clientPage.locator('#voucherBody').textContent()).includes('Facture') ||
  (await clientPage.locator('#docTitle').textContent()).includes('Facture'));
check('client : pas d\'export du registre', !(await clientPage.locator('#invoiceTools').isVisible()));

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
