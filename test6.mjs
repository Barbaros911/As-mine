// LE DÉLAI DE 3 H A ÉTÉ RETIRÉ (septembre 2026, à la demande de Barbaros).
// Cette suite vérifie deux choses : qu'il n'en reste aucune trace nulle
// part, et que ce qui l'accompagnait sur l'accueil — le numéro, l'appel et
// WhatsApp — est resté. C'est en retirant la règle qu'on a failli emporter
// le seul endroit de la page d'accueil où figurait le téléphone.
import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
couperLeReseau(browser);
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
  // Départ dans un hôtel : le numéro de chambre est obligatoire depuis
  // que le site refuse une course sans lui. Sans cette ligne, le
  // formulaire s'arrête ici et l'écran des véhicules ne s'ouvre jamais.
  await page.fill('#roomPickup', '412');
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

/* ===================== LE MOYEN DE NOUS JOINDRE ===================== */
// Il vivait dans l'encadré du délai de 3 h. En retirant la règle, on a
// retiré le bloc — et avec lui le seul numéro visible sur l'accueil.
// « :visible » n'est pas un détail : le premier a.lien-tel de l'accueil est
// désormais celui de l'écriteau « hors zone », qui est masqué tant que le
// trajet est dans la zone.
const contact = page.locator('#screen-home a.lien-tel:visible').first();
check('le numéro est affiché sur l\'accueil', await contact.isVisible());
check('il est écrit en toutes lettres',
  (await page.locator('#screen-home').textContent()).includes('+33 7 59 31 24 33'));
const hrefsTel = await page.locator('#screen-home a.lien-tel:visible').evaluateAll(a => a.map(x => x.href));
check('les liens d\'appel composent le bon numéro',
  hrefsTel.length >= 1 && hrefsTel.every(h => h === 'tel:+33759312433'), hrefsTel.join(' | '));
const hrefsWa = await page.locator('#screen-home a.lien-whatsapp:visible').evaluateAll(a => a.map(x => x.href));
check('les liens WhatsApp pointent sur le bon numéro',
  hrefsWa.length >= 1 && hrefsWa.every(h => h.includes('wa.me/33759312433')), hrefsWa.join(' | '));

/* ===================== PLUS AUCUNE TRACE DU DÉLAI ===================== */
const accueil = await page.locator('#screen-home').textContent();
check('l\'accueil n\'annonce plus de délai minimum',
  !/3\s*h à l'avance|à partir de 3\s*h/i.test(accueil));
check('la fonction du délai a disparu du code',
  (await page.evaluate(() => typeof window.courseImminente)) === 'undefined');
check('l\'encadré d\'urgence n\'existe plus',
  (await page.locator('#blocUrgence').count()) === 0);

/* ===================== UNE COURSE LOINTAINE ===================== */
const refCalme = await reserver(dansNJours(3), null);
check('réservation à J+3 : référence attribuée', /^ELA-\d{2}-\d{2}-\d{4}$/.test(refCalme), refCalme);
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(300);
const bonCalme = await page.locator('#voucherBody').textContent();
check('bon à J+3 : aucune mention de délai', !/moins de 3\s*h/i.test(bonCalme));

/* ===================== UNE COURSE POUR TOUT DE SUITE ===================== */
// Le premier créneau proposé est à vingt minutes d'ici. Avant, il déclenchait
// un avertissement rouge ; il doit désormais passer comme n'importe quel autre.
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(300);
await page.fill('#dateSimple', dansNJours(0));
await page.waitForTimeout(300);
const premierCreneau = await page.locator('#timeSimple option').first().getAttribute('value');
const dateRetenue = await page.inputValue('#dateSimple');
const refProche = await reserver(dateRetenue, premierCreneau);
check('une course pour dans 20 minutes est acceptée sans avertissement',
  /^ELA-\d{2}-\d{2}-\d{4}$/.test(refProche), refProche);
await page.locator('#btnOpenVoucher').click();
await page.waitForTimeout(300);
const bonProche = await page.locator('#voucherBody').textContent();
check('son bon ne porte aucune mention de délai', !/moins de 3\s*h/i.test(bonProche));
// Le bon doit malgré tout rester honnête : la course est en attente tant
// qu'Elatransfer ne l'a pas confirmée. C'est ce qui remplace l'avertissement.
check('le bon dit que la course est encore en attente',
  /attente|en cours/i.test(bonProche), bonProche.slice(0, 140));
const stocke = await page.evaluate((r) =>
  JSON.parse(localStorage.getItem('ela_bookings') || '[]').find(b => b.ref === r), refProche);
check('la course enregistrée ne porte plus de marque d\'urgence',
  stocke && stocke.imminente === undefined);

/* ===================== ET DANS UNE AUTRE LANGUE ===================== */
await page.selectOption('#langSelect', 'en');
await page.waitForTimeout(400);
const bonAnglais = await page.locator('#voucherBody').textContent();
check('aucune trace du délai dans une autre langue',
  !/within 3 hours|3 hours/i.test(bonAnglais), bonAnglais.slice(0, 160));
await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
