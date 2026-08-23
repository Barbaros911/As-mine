// Boucle complète : course à destination ouverte → lien envoyé au chauffeur →
// écran chauffeur (accepter, sur place, démarrer, terminer) → montant renvoyé
// à l'exploitant, qui voit son bon complété.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

// Les API d'adresses ne sont pas joignables depuis les tests, et window.open
// ouvrirait WhatsApp : on remplace les deux pour que le parcours soit
// reproductible et que l'on puisse lire les liens produits.
const prepare = (item) => async (page) => {
  await page.addInitScript((it) => {
    window.__ouvert = [];
    window.open = (u) => { window.__ouvert.push(u); return { closed: false }; };
    window.__stub = it;
  }, item);
};
async function stubAdresses(page, item) {
  await page.evaluate((it) => {
    window.fetchAddressSuggestions = async (q) => {
      const terminaux = getAirportTerminalMatches(q);
      return terminaux.length ? terminaux : [it];
    };
  }, item);
}
async function choisir(page, champ, texte) {
  await page.fill(champ, '');
  await page.type(champ, texte, { delay: 10 });
  await page.locator('#' + champ.slice(1) + 'List [role=option]').first().waitFor({ timeout: 5000 });
  await page.locator('#' + champ.slice(1) + 'List [role=option]').first().click();
  await page.waitForTimeout(150);
}

/* ============================ CÔTÉ EXPLOITANT ============================ */
const ctxOp = await browser.newContext({ viewport: { width: 390, height: 844 } });
await prepare(HOTEL)(ctxOp);
const op = await ctxOp.newPage();
op.on('pageerror', e => errors.push('PAGEERROR(op): ' + e.message));
await op.goto(BASE + '/index.html?exploitant=1', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(600);
await op.selectOption('#langSelect', 'fr');
await op.locator('#cookieAccept').click().catch(() => {});
await op.waitForTimeout(200);

// --- La case « destination inconnue » ---
check('bloc d\'arrivée visible par défaut', await op.locator('#blocArrivee').isVisible());
await op.locator('#destinationOuverte').check();
await op.waitForTimeout(200);
check('bloc d\'arrivée masqué', !(await op.locator('#blocArrivee').isVisible()));
check('aller-retour masqué : on ne revient pas d\'un lieu inconnu',
  !(await op.locator('#blocAllerRetour').isVisible()));
check('la règle du tarif au kilomètre est annoncée',
  await op.locator('#noteDestinationOuverte').isVisible());

await stubAdresses(op, HOTEL);
await choisir(op, '#pickup', 'ibis');
await op.fill('#roomPickup', '512');
await op.fill('#dateSimple', dansNJours(1));
await op.waitForTimeout(300);
await op.locator('#btnSearch').click();
await op.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
check('écran véhicules atteint sans adresse d\'arrivée', await op.locator('#screen-vehicles').isVisible());
const sousTitre = await op.locator('#vehiclesSub').textContent();
check('l\'écran annonce une course à destination ouverte', sousTitre.includes('destination ouverte'), sousTitre);
const tarifs = await op.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('un tarif au kilomètre remplace le prix', /\+.*\/km/.test(tarifs[0]), tarifs[0]);

await op.locator('#vehicleCards .veh-card').first().click();
await op.locator('#btnToPayment').click();
await op.waitForTimeout(400);
const recap = await op.locator('#tripSummary').textContent();
check('récapitulatif : arrivée à préciser', recap.includes('À préciser'), recap.slice(0, 120));
check('récapitulatif : tarif au kilomètre', /\d+,\d{2}\s*€\s*\+\s*\d+,\d{2}\s*€\/km/.test(recap), recap.slice(-160));
check('récapitulatif : règle d\'attente affichée', recap.includes('minutes offertes'));

await op.fill('#clientName', 'Hôtel Ibis — réception');
await op.fill('#clientPhone', '+33 1 44 68 70 00');
await op.locator('#btnPayOnBoard').click();
await op.waitForTimeout(500);
check('réservation enregistrée', await op.locator('#screen-confirmation').isVisible());
const ref = (await op.locator('#confRef').textContent()).trim();
check('référence attribuée', /^ASM-\d{6}$/.test(ref), ref);

await op.locator('#btnOpenVoucher').click();
await op.waitForTimeout(400);
const bon = await op.locator('#voucherBody').textContent();
check('bon : la grille remplace le montant',
  bon.includes('Prise en charge') && bon.includes('Par kilomètre') && !bon.includes('Prix total'),
  bon.slice(-200));
check('bon : mention légale du tarif annoncé d\'avance', bon.includes('avant le départ'));

// --- Le lien de course ---
const hrefDispatch = await op.locator('#btnDispatchWhatsapp').getAttribute('href');
const texteEnvoye = decodeURIComponent(hrefDispatch.replace('https://wa.me/?text=', ''));
const lien = (texteEnvoye.match(/https?:\/\/\S+\?c=[\w-]+/) || [])[0];
check('un lien de course part avec l\'annonce', !!lien, lien ? lien.slice(0, 60) + '…' : 'absent');
const apercu = await op.locator('#dispatchPreview').textContent();
check('l\'aperçu reste lisible, sans le lien encodé', !apercu.includes('?c='));
check('annonce : sans le nom du client', !texteEnvoye.includes('réception'));
check('annonce : sans la chambre du client', !apercu.includes('512'));

const paramC = lien ? new URL(lien).searchParams.get('c') : null;

/* ============================= CÔTÉ CHAUFFEUR ============================= */
const ctxCh = await browser.newContext({ viewport: { width: 390, height: 844 } });
await prepare(BUREAU)(ctxCh);
const ch = await ctxCh.newPage();
ch.on('pageerror', e => errors.push('PAGEERROR(ch): ' + e.message));
await ch.goto(BASE + '/index.html?c=' + paramC, { waitUntil: 'domcontentloaded' });
await ch.waitForTimeout(700);

check('le lien ouvre l\'espace chauffeur', await ch.locator('#screen-driver').isVisible());
check('la barre de navigation du client est masquée', !(await ch.locator('nav').isVisible()));
check('la course affichée porte la bonne référence',
  (await ch.locator('#driverRef').textContent()).trim() === ref);
const vueCh = await ch.locator('#driverBody').textContent();
check('chauffeur : départ visible', vueCh.includes('Ibis'));
check('chauffeur : sans le numéro de chambre', !vueCh.includes('512'), vueCh.slice(0, 140));
check('chauffeur : arrivée annoncée à préciser', vueCh.includes('À préciser'));
// La part du chauffeur vaut la grille du client moins la commission d'apport.
const partCh = await ch.evaluate(() => {
  const c = courseChauffeur, p = 1 - c.c;
  return { base: (c.g[0]*p).toFixed(2).replace('.', ','), km: (c.g[1]*p).toFixed(2).replace('.', ',') };
});
check('chauffeur : sa part est nette de commission',
  vueCh.includes(partCh.base) && vueCh.includes(partCh.km),
  `${partCh.base} + ${partCh.km}/km`);

// Nom obligatoire
await ch.locator('#btnDriverPrendre').click();
await ch.waitForTimeout(200);
check('refus tant que le chauffeur n\'a pas donné son nom',
  await ch.locator('#driverErreur').isVisible());
await ch.fill('#driverNom', 'Mehmet K.');
await ch.locator('#btnDriverPrendre').click();
await ch.waitForTimeout(300);
check('course acceptée', (await ch.locator('#driverTitle').textContent()).includes('acceptée'));
const msgPris = await ch.evaluate(() => window.__ouvert[window.__ouvert.length - 1]);
check('un message part vers As-mine avec le nom du chauffeur',
  msgPris.includes('wa.me/33759312433') && decodeURIComponent(msgPris).includes('Mehmet K.'));

// Sur place, puis départ
await ch.locator('#btnDriverSurPlace').click();
await ch.waitForTimeout(300);
check('arrivée sur place enregistrée', (await ch.locator('#driverTitle').textContent()).includes('Sur place'));
check('le compteur d\'attente tourne', await ch.locator('#driverChrono').isVisible());
await ch.locator('#btnDriverDemarrer').click();
await ch.waitForTimeout(300);
check('course démarrée', (await ch.locator('#driverTitle').textContent()).includes('en cours'));
check('champ d\'adresse d\'arrivée proposé', await ch.locator('#driverArriveeWrap').isVisible());

// Terminer sans adresse : refusé
await ch.locator('#btnDriverTerminer').click();
await ch.waitForTimeout(300);
check('refus de terminer sans adresse d\'arrivée', await ch.locator('#driverErreur').isVisible());

await stubAdresses(ch, BUREAU);
await choisir(ch, '#driverArrivee', 'montaigne');
await ch.locator('#btnDriverTerminer').click();
await ch.waitForTimeout(2500);
check('course terminée', (await ch.locator('#driverTitle').textContent()).includes('terminée'));
const bilan = await ch.locator('#driverBody').textContent();
check('distance calculée', /\d+,?\.?\d*\s*km/.test(bilan), bilan.slice(-160));
check('montant à encaisser affiché', bilan.includes('À encaisser'));
const montant = await ch.evaluate(() => montantCourse(courseChauffeur, etatChauffeur).total);
check('montant cohérent avec la grille', montant > 5 && montant < 40, montant + ' €');

await ch.locator('#btnDriverEnvoyer').click();
await ch.waitForTimeout(300);
const msgFin = decodeURIComponent(await ch.evaluate(() => window.__ouvert[window.__ouvert.length - 1]));
check('le récapitulatif de fin part vers As-mine', msgFin.includes(ref) && msgFin.includes('Montaigne'));
const lienRetour = (msgFin.match(/https?:\/\/\S+\?f=[\w-]+/) || [])[0];
check('un lien de retour accompagne le message', !!lienRetour);
const paramF = lienRetour ? new URL(lienRetour).searchParams.get('f') : null;

/* ======================== RETOUR CHEZ L'EXPLOITANT ======================== */
await op.goto(BASE + '/index.html?f=' + paramF, { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
check('le retour ouvre le bon de réservation', await op.locator('#screen-voucher').isVisible());
const bonFinal = await op.locator('#voucherBody').textContent();
check('bon complété : adresse réellement desservie', bonFinal.includes('Montaigne'), bonFinal.slice(0, 200));
check('bon complété : montant encaissé', bonFinal.includes('Prix total'), bonFinal.slice(-200));
check('bon complété : la grille a laissé place au montant', !bonFinal.includes('Par kilomètre'));
const enregistre = await op.evaluate((r) =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]').find(b => b.ref === r), ref);
check('course enregistrée comme réalisée', enregistre && enregistre.statut === 'realisee',
  enregistre ? enregistre.statut : 'introuvable');
check('montant identique des deux côtés',
  enregistre && Math.abs(enregistre.prix.total - montant) < 0.01,
  enregistre ? `${enregistre.prix.total} contre ${montant}` : '');
check('chauffeur déclaré sur la course',
  enregistre && enregistre.course.chauffeurDeclare === 'Mehmet K.');

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
