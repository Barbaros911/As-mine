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
  // Les terminaux d'aéroport viennent de la page elle-même, pas d'une API :
  // le doublon les laisse passer pour qu'ils restent testables.
  await page.evaluate((it) => {
    window.__vraieRecherche = window.__vraieRecherche || window.fetchAddressSuggestions;
    window.fetchAddressSuggestions = async (q) => {
      const terminaux = getAirportTerminalMatches(q);
      return terminaux.length ? terminaux : [it];
    };
  }, item);
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

// --- Hôtel → terminal d'aéroport, avec vol et aller-retour ---
await stubSuggestions(page, HOTEL);
await pick(page, '#pickup', 'ibis');
check('champ chambre affiché pour l\'hôtel de départ', await page.locator('#roomPickupWrap').isVisible());
await page.fill('#roomPickup', '318');
// Les terminaux ne viennent d'aucune API : ils sont dans la page.
await page.fill('#dropoff', '');
await page.type('#dropoff', 'orly', { delay: 20 });
await page.locator('#dropoffList [role=option]').first().waitFor({ timeout: 5000 });
const optOrly = await page.locator('#dropoffList [role=option]').count();
check('terminaux Orly proposés', optOrly === 4, optOrly + ' option(s)');
await page.locator('#dropoffList [role=option]').first().click();
await page.waitForTimeout(300);
check('champ vol affiché pour un terminal à l\'arrivée', await page.locator('#flightWrap').isVisible());
check('champ chambre absent pour un terminal', !(await page.locator('#roomDropoffWrap').isVisible()));
await page.fill('#flightNumber', 'tk1802');
await page.fill('#dateSimple', dansNJours(5));
await page.waitForTimeout(300);
await page.locator('#roundTripSimple').check();
await page.waitForTimeout(200);
await page.fill('#dateReturnSimple', dansNJours(7));
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
check('écran véhicules atteint', await page.locator('#screen-vehicles').isVisible());
await page.locator('#vehicleCards .veh-card').first().click();
await page.locator('#btnToPayment').click();
await page.waitForTimeout(400);
const recapAp = await page.locator('#tripSummary').textContent();
check('récapitulatif : chambre de l\'hôtel de départ', recapAp.includes('Ch. 318'), recapAp.slice(0, 150));
check('récapitulatif : terminal repris', recapAp.includes('Orly 1'));
check('récapitulatif : numéro de vol repris', recapAp.includes('TK1802'));
check('récapitulatif : retour repris', recapAp.includes(dansNJours(7)));

// --- Trouver un lieu quelle que soit la façon dont on l'écrit ---
const variantes = await page.evaluate(() => ({
  brut: variantesDeRecherche('easy hotel aeroville'),
  distinctif: motDistinctif('easy hotel aeroville'),
  distinctifResto: motDistinctif('restaurant le bristol'),
  scoreBon: scoreCorrespondance(
    { label: 'easyHotel Paris-Charles de Gaulle, 93290 Tremblay-en-France', isNamedPlace: true },
    ['easy', 'hotel', 'aeroville']),
  scoreMauvais: scoreCorrespondance(
    { label: 'Hotel Ambeille, 66190 Collioure', isNamedPlace: false },
    ['easy', 'hotel', 'aeroville'])
}));
check('les mots passe-partout sont retirés pour une seconde recherche',
  variantes.brut.length === 2 && variantes.brut[1] === 'easy aeroville', JSON.stringify(variantes.brut));
check('le mot distinctif est isolé', variantes.distinctif === 'aeroville', String(variantes.distinctif));
check('« restaurant » n\'est pas pris pour un nom', variantes.distinctifResto === 'bristol', String(variantes.distinctifResto));
check('un lieu qui colle à la saisie passe devant un homonyme lointain',
  variantes.scoreBon > variantes.scoreMauvais, `${variantes.scoreBon} contre ${variantes.scoreMauvais}`);

// Bout en bout : un annuaire qui n'accepte que les mots exacts du nom.
// « easy hotel aeroville » n'y correspond pas ; le site doit quand même trouver.
const trouve = await page.evaluate(async () => {
  const CATALOGUE = [
    { label: 'easyHotel Paris-Charles de Gaulle, 4 rue de Rome, 93290 Tremblay-en-France',
      mots: ['easyhotel', 'paris', 'charles', 'gaulle', 'aeroville'], lat: 48.9612, lon: 2.5548 },
    { label: 'Hotel Ambeille, 66190 Collioure', mots: ['hotel', 'ambeille', 'collioure'], lat: 42.52, lon: 3.08 }
  ];
  window.fetchBANSuggestions = async () => [];
  window.fetchPhotonSuggestions = async (q) => {
    const tokens = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/).filter(Boolean);
    return CATALOGUE
      .filter(c => tokens.length && tokens.every(tok => c.mots.includes(tok)))
      .map(c => ({ label: c.label, lat: c.lat, lon: c.lon, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' }));
  };
  addressCache.clear();
  const recherche = window.__vraieRecherche || fetchAddressSuggestions;
  const r = await recherche('easy hotel aeroville');
  return r.map(x => x.label);
});
check('« easy hotel aeroville » retrouve bien l\'easyHotel',
  trouve.length > 0 && trouve[0].startsWith('easyHotel'), trouve.join(' | ') || 'aucun résultat');

// --- Passagers et véhicule choisis dès l'accueil ---
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
const optionsPax = await page.locator('#paxHome option').count();
check('de 1 à 7 passagers proposés', optionsPax === 7, optionsPax + ' option(s)');
const vehStandard = await page.locator('#vehicleHome option').allTextContents();
check('quatre véhicules proposés pour un passager', vehStandard.length === 5, vehStandard.join(' | '));
await page.selectOption('#paxHome', '6');
await page.waitForTimeout(200);
const vehSix = await page.locator('#vehicleHome option').allTextContents();
check('à six passagers, seuls les vans restent proposés',
  vehSix.length === 3 && vehSix.join(' ').includes('Van') && !vehSix.join(' ').includes('Berline'),
  vehSix.join(' | '));
await page.selectOption('#vehicleHome', 'van');

await stubSuggestions(page, HOTEL);
await pick(page, '#pickup', 'ibis');
await page.fill('#roomPickup', '204');
await stubSuggestions(page, BUREAU);
await pick(page, '#dropoff', 'montaigne');
await page.fill('#dateSimple', dansNJours(2));
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
const cartesVeh = await page.locator('#vehicleCards .veh-card').allTextContents();
check('l\'écran véhicules ne propose que ce qui peut emmener six personnes',
  cartesVeh.length === 2, cartesVeh.length + ' véhicule(s)');
check('le véhicule choisi sur l\'accueil est déjà sélectionné',
  (await page.locator('#vehicleCards .veh-card.selected').count()) === 1);
check('bouton Continuer déjà actif', !(await page.locator('#btnToPayment').isDisabled()));
await page.locator('#btnToPayment').click();
await page.waitForTimeout(400);
check('récapitulatif : six passagers', (await page.locator('#tripSummary').textContent()).includes('6 '));

// Ajouter des enfants au-delà de la capacité doit bloquer, pas passer en silence
await page.fill('#paxChildren', '4');
await page.dispatchEvent('#paxChildren', 'input');
await page.waitForTimeout(300);
check('dépassement de capacité signalé',
  (await page.locator('#tripSummary').textContent()).includes('plus grand'));
await page.fill('#clientName', 'Test Capacité');
await page.fill('#clientPhone', '+33 6 00 00 00 00');
await page.locator('#btnPayOnBoard').click();
await page.waitForTimeout(400);
check('réservation bloquée tant que le véhicule est trop petit',
  !(await page.locator('#screen-confirmation').isVisible()));
await page.fill('#paxChildren', '0');
await page.dispatchEvent('#paxChildren', 'input');
await page.waitForTimeout(300);
check('message levé une fois la capacité respectée',
  !(await page.locator('#tripSummary').textContent()).includes('plus grand'));

// --- Carte : crédit sans drapeau, tracé routier réel ---
// Leaflet vient d'un CDN inaccessible depuis les tests : on le remplace par un
// double qui enregistre ce que la page lui demande de dessiner.
const carte = await page.evaluate(() => {
  window.__carte = { prefix: null, marqueurs: [], traces: [], cadre: null };
  window.L = {
    map: () => ({
      attributionControl: { setPrefix: (p) => { window.__carte.prefix = p; } },
      removeLayer() {}, invalidateSize() {}, setView(c) { window.__carte.cadre = [c]; },
      fitBounds: (b) => { window.__carte.cadre = b; }
    }),
    tileLayer: () => ({ addTo() { return this; } }),
    divIcon: (o) => o,
    marker: (p) => ({ addTo() { window.__carte.marqueurs.push(p); return this; } }),
    polyline: (pts, o) => ({ addTo() { window.__carte.traces.push({ n: pts.length, o }); return this; } })
  };
  tripMapInstance = null;
  state.pickup = { label: 'A', lat: 48.85, lon: 2.35 };
  state.dropoff = { label: 'B', lat: 48.72, lon: 2.36 };
  state.routeGeometry = [[48.85, 2.35], [48.82, 2.35], [48.78, 2.36], [48.75, 2.36], [48.72, 2.36]];
  renderTripMap();
  return new Promise(r => setTimeout(() => r(window.__carte), 400));
});
check('crédit de la carte sans drapeau ukrainien',
  carte.prefix === 'Leaflet' && !/[\u{1F1E6}-\u{1F1FF}]/u.test(carte.prefix || ''), String(carte.prefix));
check('deux repères posés', carte.marqueurs.length === 2, carte.marqueurs.length + ' repère(s)');
check('itinéraire routier réel tracé, pas une ligne droite',
  carte.traces.length === 1 && carte.traces[0].n === 5 && !carte.traces[0].o.dashArray,
  JSON.stringify(carte.traces[0]));
check('cadrage sur le tracé', Array.isArray(carte.cadre) && carte.cadre.length === 5);

const carteSansTrace = await page.evaluate(() => {
  window.__carte = { prefix: null, marqueurs: [], traces: [], cadre: null };
  tripMapInstance = null;
  state.routeGeometry = null;
  renderTripMap();
  return new Promise(r => setTimeout(() => r(window.__carte), 400));
});
check('sans itinéraire, ligne directe en pointillé (annoncée comme indicative)',
  carteSansTrace.traces.length === 1 && carteSansTrace.traces[0].o.dashArray,
  JSON.stringify(carteSansTrace.traces[0]));

// --- Le site s'ouvre en français quelle que soit la langue du téléphone ---
const esCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
const esPage = await esCtx.newPage();
esPage.on('pageerror', e => errors.push('PAGEERROR(es): ' + e.message));
await esPage.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await esPage.waitForTimeout(600);
check('navigateur espagnol : le site s\'ouvre quand même en français',
  (await esPage.inputValue('#langSelect')) === 'fr' &&
  (await esPage.getAttribute('html', 'lang')) === 'fr');
await esPage.selectOption('#langSelect', 'es');
await esPage.waitForTimeout(300);
check('le visiteur peut toujours choisir sa langue',
  (await esPage.getAttribute('html', 'lang')) === 'es');
await esPage.reload({ waitUntil: 'domcontentloaded' });
await esPage.waitForTimeout(600);
check('son choix est mémorisé sur son appareil',
  (await esPage.inputValue('#langSelect')) === 'es');
await esCtx.close();

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
