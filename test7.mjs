// Confirmation à distance : l'exploitant reçoit une référence par WhatsApp,
// renvoie un lien, et le bon du client — resté sur SON téléphone — passe au
// vert. Deux contextes de navigateur séparés, comme deux appareils.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';

// Le mode exploitant est protégé par un code d'accès. Le code lui-même n'a
// rien à faire dans un dépôt public : on lit l'empreinte que la page porte
// déjà, on la dépose comme si la saisie avait eu lieu, et on recharge. La
// serrure est bien franchie, pas contournée.
async function deverrouillerExploitant(page, base, suffixe = '') {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const empreinte = await page.evaluate(() => CODE_EXPLOITANT);
  await page.evaluate((e) => localStorage.setItem('asmine_exploitant', e), empreinte);
  await page.goto(base + '/index.html?exploitant=1' + suffixe, { waitUntil: 'domcontentloaded' });
}

const browser = await chromium.launch();
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

async function preparer(ctx) {
  await ctx.addInitScript(() => {
    window.__ouvert = [];
    window.open = (u) => { window.__ouvert.push(u); return { closed: false }; };
  });
}
async function stub(page, item) {
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

/* ======================= LE CLIENT, SUR SON TÉLÉPHONE ======================= */
const ctxClient = await browser.newContext({ viewport: { width: 390, height: 844 } });
await preparer(ctxClient);
const client = await ctxClient.newPage();
client.on('pageerror', e => errors.push('PAGEERROR(client): ' + e.message));
await client.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
await client.selectOption('#langSelect', 'fr');
await client.locator('#cookieAccept').click().catch(() => {});
await client.waitForTimeout(200);

check('le client n\'a pas l\'outil de confirmation',
  !(await client.locator('#outilConfirmation').isVisible()));

// Un client curieux qui devine « ?exploitant=1 » tombe sur le code d'accès.
// On refuse la saisie : rien ne doit s'ouvrir.
client.once('dialog', d => d.dismiss());
await client.goto(BASE + '/index.html?exploitant=1', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
check('« ?exploitant=1 » sans le code n\'ouvre rien',
  (await client.evaluate(() => MODE_EXPLOITANT)) === false);
await client.locator('.nav-item[data-target="screen-bookings"]').click();
await client.waitForTimeout(300);
check('sans le code, pas d\'outil de confirmation',
  !(await client.locator('#outilConfirmation').isVisible()));
client.once('dialog', d => d.accept('mauvais-code'));
await client.goto(BASE + '/index.html?exploitant=1', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
check('un code faux est refusé',
  (await client.evaluate(() => MODE_EXPLOITANT)) === false);
await client.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(400);
await client.locator('#cookieAccept').click().catch(() => {});
await client.waitForTimeout(200);

await stub(client, HOTEL);
await choisir(client, '#pickup', 'ibis');
await stub(client, BUREAU);
await choisir(client, '#dropoff', 'montaigne');
await client.fill('#dateSimple', dansNJours(4));
await client.waitForTimeout(200);
await client.locator('#btnSearch').click();
await client.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 });
await client.locator('#vehicleCards .veh-card').first().click();
await client.locator('#btnToPayment').click();
await client.waitForTimeout(300);
await client.fill('#clientName', 'Claire Fontaine');
await client.fill('#clientPhone', '+33 6 12 34 56 78');
await client.locator('#btnPayOnBoard').click();
await client.locator('#screen-confirmation').waitFor({ state: 'visible', timeout: 10000 });
await client.waitForTimeout(300);
const ref = (await client.locator('#confRef').textContent()).trim();

check('la référence suit le format année-mois-rang',
  /^ASM-\d{2}-\d{2}-\d{4}$/.test(ref), ref);
const attendu = (() => {
  const d = new Date();
  return `ASM-${String(d.getFullYear()).slice(-2)}-${String(d.getMonth() + 1).padStart(2, '0')}-`;
})();
check('le préfixe porte l\'année et le mois en cours', ref.startsWith(attendu), `${ref} vs ${attendu}…`);
check('le rang commence à 0001', ref.endsWith('-0001'), ref);

await client.locator('#btnOpenVoucher').click();
await client.waitForTimeout(300);
const bonAvant = await client.locator('#voucherBody').textContent();
check('le bon du client est en attente', bonAvant.includes('En attente de confirmation'));

/* ==================== L'EXPLOITANT, SUR SON PROPRE TÉLÉPHONE ==================== */
const ctxOp = await browser.newContext({ viewport: { width: 390, height: 844 } });
await preparer(ctxOp);
const op = await ctxOp.newPage();
op.on('pageerror', e => errors.push('PAGEERROR(op): ' + e.message));
await deverrouillerExploitant(op, BASE);
await op.waitForTimeout(600);
await op.selectOption('#langSelect', 'fr');
await op.locator('#cookieAccept').click().catch(() => {});
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);

check('l\'exploitant n\'a pas la course du client sur son appareil',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('asmine_bookings') || '[]').length)) === 0);
check('l\'outil de confirmation à distance lui est proposé',
  await op.locator('#outilConfirmation').isVisible());

// Une référence mal recopiée ne doit pas produire de lien mort
await op.fill('#refAConfirmer', 'ASM-123');
await op.locator('#btnEnvoyerConfirmation').click();
await op.waitForTimeout(200);
check('une référence mal formée est refusée',
  await op.locator('#erreurConfirmation').isVisible(),
  await op.locator('#erreurConfirmation').textContent());

await op.fill('#refAConfirmer', ref);
await op.fill('#nomChauffeurConfirme', 'Mehmet K.');
await op.fill('#telChauffeurConfirme', '+33 6 98 76 54 32');
await op.waitForTimeout(200);
const hrefConfirm = await op.locator('#btnEnvoyerConfirmation').getAttribute('href');
const message = decodeURIComponent(hrefConfirm.replace('https://wa.me/?text=', ''));
check('le message de confirmation est prêt à partir',
  hrefConfirm.startsWith('https://wa.me/?text='), hrefConfirm.slice(0, 55) + '…');
check('le message porte la référence de la course', message.includes(ref), message.slice(0, 90));
check('le message annonce le chauffeur et son téléphone',
  message.includes('Mehmet K.') && message.includes('+33 6 98 76 54 32'), message.slice(0, 140));
const lienOk = (message.match(/https?:\/\/\S+\?ok=[\w-]+/) || [])[0];
check('un lien de confirmation accompagne le message', !!lienOk, lienOk ? lienOk.slice(0, 55) + '…' : 'absent');
const paramOk = lienOk ? new URL(lienOk).searchParams.get('ok') : null;

/* ================== LE CLIENT OUVRE LE LIEN DE CONFIRMATION ================== */
await client.goto(BASE + '/index.html?ok=' + paramOk, { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(800);
check('le lien ouvre directement le bon du client',
  await client.locator('#screen-voucher').isVisible());
const bonApres = await client.locator('#voucherBody').textContent();
check('le bon est passé en « Course confirmée »',
  bonApres.includes('Course confirmée') && !bonApres.includes('En attente de confirmation'),
  bonApres.slice(0, 120));
check('le bon annonce le chauffeur au client',
  bonApres.includes('Mehmet K.') && bonApres.includes('+33 6 98 76 54 32'), bonApres.slice(0, 400));
const enregistre = await client.evaluate((r) =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]').find(b => b.ref === r), ref);
check('la course est enregistrée comme confirmée',
  enregistre && enregistre.statut === 'confirmee', enregistre ? enregistre.statut : 'introuvable');

// Un lien pour une course inconnue ne doit rien casser ni rien inventer
await op.goto(BASE + '/index.html?ok=' + paramOk, { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(700);
check('chez l\'exploitant, le lien ne fabrique pas de course',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('asmine_bookings') || '[]').length)) === 0);
check('chez l\'exploitant, aucun bon ne s\'ouvre',
  !(await op.locator('#screen-voucher').isVisible()));

/* ====================== LE RANG SUIT D'UNE COURSE À L'AUTRE ====================== */
const refSuivante = await client.evaluate(() => referenceSuivante());
check('la course suivante prend le rang d\'après',
  refSuivante === ref.slice(0, -4) + '0002', `${refSuivante} après ${ref}`);
const refMoisProchain = await client.evaluate(() => {
  const d = new Date(); d.setMonth(d.getMonth() + 1, 1);
  return referenceSuivante(d);
});
check('le rang repart à 0001 le mois suivant',
  refMoisProchain.endsWith('-0001'), refMoisProchain);

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
