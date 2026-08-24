// Délai de réservation de 3 h : le client n'est jamais bloqué, mais une
// course imminente est annoncée comme non ferme tant qu'elle n'a pas été
// confirmée de vive voix — sur l'écran de confirmation et sur le bon.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  window.__ouvert = [];
  window.open = (u) => { window.__ouvert.push(u); return { closed: false }; };
});
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

async function stub(item) {
  await page.evaluate((it) => {
    window.fetchAddressSuggestions = async (q) => {
      const terminaux = getAirportTerminalMatches(q);
      return terminaux.length ? terminaux : [it];
    };
  }, item);
}
async function choisir(champ, texte) {
  await page.fill(champ, '');
  await page.type(champ, texte, { delay: 10 });
  await page.locator('#' + champ.slice(1) + 'List [role=option]').first().waitFor({ timeout: 5000 });
  await page.locator('#' + champ.slice(1) + 'List [role=option]').first().click();
  await page.waitForTimeout(150);
}
// Parcours complet jusqu'à la confirmation, pour une date donnée.
async function reserver(date, heure) {
  await page.locator('.nav-item[data-target="screen-home"]').click();
  await page.waitForTimeout(300);
  await stub(HOTEL);
  await choisir('#pickup', 'ibis');
  await stub(BUREAU);
  await choisir('#dropoff', 'montaigne');
  await page.fill('#dateSimple', date);
  await page.waitForTimeout(250);
  if (heure) await page.selectOption('#timeSimple', heure);
  await page.waitForTimeout(150);
  await page.locator('#btnSearch').click();
  await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#vehicleCards .veh-card').first().click();
  await page.locator('#btnToPayment').click();
  await page.waitForTimeout(300);
  await page.fill('#clientName', 'Client de test');
  await page.fill('#clientPhone', '+33 6 12 34 56 78');
  await page.locator('#btnPayOnBoard').click();
  await page.locator('#screen-confirmation').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(300);
  return (await page.locator('#confRef').textContent()).trim();
}

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await page.selectOption('#langSelect', 'fr');
await page.locator('#cookieAccept').click().catch(() => {});
await page.waitForTimeout(200);

/* ===================== L'AVERTISSEMENT SOUS LE FORMULAIRE ===================== */
const encart = page.locator('#screen-home .rounded-xl', { hasText: 'Réservations à partir de' }).first();
check('l\'encart de délai est affiché sous le formulaire', await encart.isVisible());
const texteEncart = await encart.textContent();
check('le délai de 3 h est annoncé', /3\s*h/.test(texteEncart), texteEncart.slice(0, 90));
check('le recours par téléphone et WhatsApp est proposé',
  texteEncart.includes('WhatsApp') && /appelez/i.test(texteEncart), texteEncart.slice(0, 160));
check('le numéro est affiché en toutes lettres',
  texteEncart.includes('+33 7 59 31 24 33'), texteEncart.slice(0, 160));

const hrefsTel = await page.locator('#screen-home a.lien-tel').evaluateAll(a => a.map(x => x.href));
check('les liens d\'appel composent le bon numéro',
  hrefsTel.length >= 2 && hrefsTel.every(h => h === 'tel:+33759312433'), hrefsTel.join(' | '));
const hrefsWa = await page.locator('#screen-home a.lien-whatsapp').evaluateAll(a => a.map(x => x.href));
check('les liens WhatsApp pointent sur le bon numéro',
  hrefsWa.length >= 1 && hrefsWa.every(h => h.includes('wa.me/33759312433')), hrefsWa.join(' | '));

/* ===================== UNE COURSE À PLUS DE 3 H ===================== */
const refCalme = await reserver(dansNJours(3), null);
check('réservation à J+3 : référence attribuée', /^ASM-\d{6}$/.test(refCalme), refCalme);
check('réservation à J+3 : aucun avertissement d\'urgence',
  !(await page.locator('#blocUrgence').isVisible()));
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(300);
const bonCalme = await page.locator('#voucherBody').textContent();
check('bon à J+3 : pas de mention « à confirmer avec nous »',
  !bonCalme.includes('moins de 3 h'), bonCalme.slice(0, 120));

/* ===================== UNE COURSE À MOINS DE 3 H ===================== */
// Le premier créneau proposé est toujours à 20 minutes d'ici : il tombe donc
// forcément à l'intérieur du délai de 3 h, quelle que soit l'heure du test.
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
await page.fill('#dateSimple', dansNJours(0));
await page.waitForTimeout(300);
const premierCreneau = await page.locator('#timeSimple option').first().getAttribute('value');
const dateRetenue = await page.inputValue('#dateSimple');
const doitEtreUrgent = await page.evaluate(
  ([d, h]) => courseImminente(d, h), [dateRetenue, premierCreneau]);
check('le premier créneau proposé tombe bien dans les 3 h',
  doitEtreUrgent, `${dateRetenue} ${premierCreneau}`);

const refUrgente = await reserver(dateRetenue, premierCreneau);
check('réservation imminente : elle est acceptée quand même',
  /^ASM-\d{6}$/.test(refUrgente), refUrgente);
check('réservation imminente : l\'avertissement s\'affiche',
  await page.locator('#blocUrgence').isVisible());
const texteUrgence = await page.locator('#blocUrgence').textContent();
check('l\'avertissement dit que la course n\'est pas ferme',
  /pas encore ferme/i.test(texteUrgence), texteUrgence.slice(0, 130));
check('l\'avertissement propose d\'appeler le numéro',
  texteUrgence.includes('+33 7 59 31 24 33'), texteUrgence.slice(0, 130));
const waUrgence = await page.locator('#btnUrgenceWhatsapp').getAttribute('href');
check('le message WhatsApp est prêt à partir, avec la référence',
  waUrgence.includes('wa.me/33759312433') && decodeURIComponent(waUrgence).includes(refUrgente),
  decodeURIComponent(waUrgence).slice(0, 110));
const telUrgence = await page.locator('#blocUrgence a.lien-tel').getAttribute('href');
check('le bouton d\'appel compose le numéro', telUrgence === 'tel:+33759312433', telUrgence);

await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(300);
const bonUrgent = await page.locator('#voucherBody').textContent();
check('bon imminent : la course est marquée non ferme',
  bonUrgent.includes('moins de 3 h'), bonUrgent.slice(0, 160));
check('bon imminent : le numéro à joindre y figure',
  bonUrgent.includes('+33 7 59 31 24 33'), bonUrgent.slice(0, 200));
const stocke = await page.evaluate((r) =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]').find(b => b.ref === r), refUrgente);
check('la course est enregistrée comme imminente', stocke && stocke.imminente === true);

/* ===================== ET DANS UNE AUTRE LANGUE ===================== */
await page.selectOption('#langSelect', 'en');
await page.waitForTimeout(400);
const bonAnglais = await page.locator('#voucherBody').textContent();
check('la mention suit la langue choisie',
  /within 3 hours/i.test(bonAnglais), bonAnglais.slice(0, 160));
await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
