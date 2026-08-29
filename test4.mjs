// Tests des fonctionnalités ajoutées : numéro de chambre d'hôtel,
// capacité des véhicules, diffusion au groupe de chauffeurs, mode exploitant.
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
await deverrouillerExploitant(page, BASE);
await page.waitForTimeout(600);
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
await page.fill('#roomPickup', '412B');

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
await page.fill('#roomPickup', '412B');
await stubSuggestions(page, BUREAU);
await pick(page, '#dropoff', 'montaigne');
await page.fill('#dateSimple', dansNJours(3));
await page.waitForTimeout(200);

// --- Le nombre de passagers n'écarte que les véhicules trop petits ---
check('l\'aller-retour a été retiré', (await page.locator('#roundTripSimple').count()) === 0);
check('la destination ouverte a été retirée', (await page.locator('#destinationOuverte').count()) === 0);
const vehUn = await page.locator('#vehicleHome option').allTextContents();
// Quatre gammes : Ela One (4 places), Ela First (3), Van (7), Van Premium
// (6). Un client seul garde le droit de vouloir un van : seul le véhicule
// trop petit pour son groupe est écarté.
check('un passager : les quatre gammes restent proposées',
  vehUn.length === 4, vehUn.join(' | '));
check('plus d\'option « peu importe »', !vehUn.join(' ').includes('Peu importe'));
// Les silhouettes sont des SVG dessinés dans la page. Les EMOJIS restent
// bannis : ils changent de dessin d'un téléphone à l'autre et grossissent mal.
check('aucun emoji de voiture dans la liste',
  !/[\u{1F680}-\u{1F6FF}]/u.test(vehUn.join(' ')), vehUn.join(' | '));
// Le nombre de places n'est plus accolé au nom : le client vient de dire
// combien ils sont, le lui répéter n'aide pas et allonge la liste.
check('le nom du véhicule est seul, sans nombre de places',
  vehUn.every(x => !/\d/.test(x)), vehUn.join(' | '));
check('une berline est retenue d\'office', (await page.inputValue('#vehicleHome')) === 'berline');
await page.selectOption('#paxHome', '4');
await page.waitForTimeout(200);
const vehQuatre = await page.locator('#vehicleHome option').allTextContents();
// À quatre, Ela First (3 places) sort ; les trois autres tiennent.
check('quatre passagers : Ela One tient encore',
  vehQuatre.length === 3 && vehQuatre.join(' ').includes('Ela One'), vehQuatre.join(' | '));
await page.selectOption('#paxHome', '5');
await page.waitForTimeout(200);
const vehCinq = await page.locator('#vehicleHome option').allTextContents();
check('cinq passagers : les deux berlines disparaissent',
  vehCinq.length === 2 && !vehCinq.join(' ').includes('Ela'), vehCinq.join(' | '));
await page.selectOption('#paxHome', '7');
await page.waitForTimeout(200);
const vehSept = await page.locator('#vehicleHome option').allTextContents();
check('sept passagers : seul le van les emmène',
  vehSept.length === 1 && vehSept[0].includes('Van'), vehSept.join(' | '));
await page.selectOption('#paxHome', '1');
await page.waitForTimeout(200);

await page.locator('#btnSearch').click();
await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
check('écran véhicules atteint', await page.locator('#screen-vehicles').isVisible());
const cartes = await page.locator('#vehicleCards .veh-card').count();
check('l\'écran des tarifs applique la même règle', cartes === 4, cartes + ' véhicule(s)');
const cartesTexte = await page.locator('#vehicleCards .veh-card').allTextContents();
check('aucun emoji de voiture sur les cartes',
  !/[\u{1F680}-\u{1F6FF}]/u.test(cartesTexte.join(' ')), cartesTexte.join(' | ').slice(0, 120));
await page.locator('#vehicleCards .veh-card').first().click();
await page.locator('#btnToPayment').click();
await page.waitForTimeout(400);
const recap = await page.locator('#tripSummary').textContent();
check('récapitulatif : chambre reprise au départ', recap.includes('Ch. 412B'), recap.slice(0, 120));

// --- Bon de réservation ---
await page.fill('#clientName', 'Claire Fontaine');
await page.fill('#clientPhone', '+33 6 12 34 56 78');
await page.locator('#btnPayOnBoard').click();
await page.waitForTimeout(500);
check('réservation confirmée', await page.locator('#screen-confirmation').isVisible());
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(400);
const bon = await page.locator('#voucherBody').textContent();
check('bon : chambre reprise', bon.includes('Ch. 412B'));
await page.locator('#tabInvoice').click();
await page.waitForTimeout(300);
const fact = await page.locator('#voucherBody').textContent();
check('facture : chambre reprise', fact.includes('Ch. 412B'));
await page.locator('#tabVoucher').click();
await page.waitForTimeout(200);

// --- Diffusion au groupe de chauffeurs ---
check('bloc de diffusion proposé à l\'exploitant', await page.locator('#dispatchBlock').isVisible());
const annonce = await page.locator('#dispatchPreview').textContent();
check('annonce : référence de la course', /ELA-\d{2}-\d{2}-\d{4}/.test(annonce));
// La date est écrite courte — « jeu. 27/08 — 14:00 » — parce qu'une annonce
// se lit dans un fil de groupe qui défile.
const jourCourt = (() => {
  const d = new Date(dansNJours(3) + 'T00:00:00');
  return d.toLocaleDateString('fr', { weekday: 'short', day: '2-digit', month: '2-digit' });
})();
check('annonce : trajet et horaire lisibles',
  annonce.includes('Ibis') && annonce.includes(jourCourt), annonce.slice(0, 130));
check('annonce : montant net annoncé au chauffeur', annonce.includes('Pour vous'));
check('annonce : le terminal n\'est pas répété',
  (annonce.match(/Terminal/g) || []).length <= 1, annonce.slice(0, 160));
check('annonce : tient en peu de lignes',
  annonce.trim().split('\n').length <= 9, annonce.trim().split('\n').length + ' lignes');
check('annonce : sans le nom du client', !annonce.includes('Claire Fontaine'));
check('annonce : sans le téléphone du client', !annonce.includes('12 34 56 78'));
check('annonce : sans le numéro de chambre', !annonce.includes('412B'), annonce.slice(0, 160));
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
check('champ chambre refermé', !(await page.locator('#roomPickupWrap').isVisible()));
check('chambre vidée', (await page.inputValue('#roomPickup')) === '');

// --- Hôtel → terminal d'aéroport, avec numéro de vol ---
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
check('les quatre gammes proposées pour un passager', vehStandard.length === 4, vehStandard.join(' | '));
await page.selectOption('#paxHome', '6');
await page.waitForTimeout(200);
const vehSix = await page.locator('#vehicleHome option').allTextContents();
check('à six passagers, seuls les deux vans restent proposés',
  vehSix.length === 2 && vehSix.join(' ').includes('Van') && !vehSix.join(' ').includes('Ela'),
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
// Van (7 places) et Van Premium (6) emmènent six personnes ; les deux
// berlines, non. L'écran des tarifs applique la même règle que l'accueil.
check('l\'écran véhicules ne propose que ce qui peut emmener six personnes',
  cartesVeh.length === 2 && !cartesVeh.join(' ').includes('Ela'),
  cartesVeh.length + ' véhicule(s) : ' + cartesVeh.join(' | ').slice(0, 90));
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
