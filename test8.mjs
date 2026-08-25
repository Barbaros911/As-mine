// La boucle de la demande, de bout en bout, sur deux appareils distincts :
// le client réserve → Asmine reçoit le lien sur WhatsApp → la demande entre
// dans son tableau de bord en attente → il diffuse, confirme ou refuse →
// le client voit sa demande aboutir ou non.
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const ARRIVEE = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

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
// Le code d'accès n'a rien à faire dans un dépôt public : on lit l'empreinte
// que la page porte déjà et on la dépose, comme si la saisie avait eu lieu.
async function ouvrirEspaceExploitant(page) {
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const empreinte = await page.evaluate(() => CODE_EXPLOITANT);
  await page.evaluate((e) => localStorage.setItem('asmine_exploitant', e), empreinte);
  await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}
// Une réservation complète, du premier écran à la confirmation.
async function reserver(page, nom) {
  await stub(page, HOTEL);
  await choisir(page, '#pickup', 'ibis');
  await stub(page, ARRIVEE);
  await choisir(page, '#dropoff', 'montaigne');
  await page.fill('#dateSimple', dansNJours(5));
  await page.waitForTimeout(200);
  await page.locator('#btnSearch').click();
  await page.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#vehicleCards .veh-card').first().click();
  await page.locator('#btnToPayment').click();
  await page.waitForTimeout(300);
  await page.fill('#clientName', nom);
  await page.fill('#clientPhone', '+33 6 12 34 56 78');
  await page.locator('#btnPayOnBoard').click();
  await page.locator('#screen-confirmation').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(400);
  return (await page.locator('#confRef').textContent()).trim();
}

/* ================= DEUX ESPACES QUI NE SE RESSEMBLENT PAS ================= */
const ctxClient = await browser.newContext({ viewport: { width: 390, height: 844 } });
await preparer(ctxClient);
const client = await ctxClient.newPage();
client.on('pageerror', e => errors.push('PAGEERROR(client): ' + e.message));
await client.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
await client.selectOption('#langSelect', 'fr');
await client.locator('#cookieAccept').click().catch(() => {});
await client.waitForTimeout(200);

check('client : aucun liseré d\'espace de travail',
  !(await client.evaluate(() => document.body.classList.contains('mode-exploitant'))));
check('client : pas de badge exploitant', !(await client.locator('#badgeExploitant').isVisible()));
check('client : pas de tableau de bord', !(await client.locator('#tableauBord').isVisible()));
check('client : le formulaire de réservation est là', await client.locator('#accrocheClient').isVisible());
check('client : le bouton WhatsApp flottant est là', await client.locator('#whatsappFloat').isVisible());

const ctxOp = await browser.newContext({ viewport: { width: 390, height: 844 } });
await preparer(ctxOp);
const op = await ctxOp.newPage();
op.on('pageerror', e => errors.push('PAGEERROR(op): ' + e.message));
await ouvrirEspaceExploitant(op);
await op.selectOption('#langSelect', 'fr');
await op.locator('#cookieAccept').click().catch(() => {});
await op.waitForTimeout(300);

check('l\'adresse dédiée mène bien à l\'espace exploitant',
  op.url().includes('exploitant=1'), op.url().slice(-40));
check('exploitant : le liseré marque l\'espace de travail',
  await op.evaluate(() => document.body.classList.contains('mode-exploitant')));
check('exploitant : le badge est affiché', await op.locator('#badgeExploitant').isVisible());
check('exploitant : le tableau de bord remplace la vitrine',
  await op.locator('#tableauBord').isVisible()
  && !(await op.locator('#accrocheClient').isVisible()));
check('exploitant : l\'onglet parle de demandes, pas de réservations',
  (await op.locator('.nav-item[data-target="screen-bookings"] span').textContent()).includes('Demandes'));
check('exploitant : le bouton de sortie est proposé', await op.locator('#navQuitter').isVisible());
check('exploitant : pas de WhatsApp flottant', !(await op.locator('#whatsappFloat').isVisible()));
check('exploitant : liste vide au départ',
  await op.locator('#videDemandes').isVisible()
  && (await op.locator('#compteurAttente').textContent()) === '0');

/* ================= LE CLIENT RÉSERVE ================= */
const ref = await reserver(client, 'Claire Fontaine');
check('la demande du client reçoit une référence', /^ASM-\d{2}-\d{2}-\d{4}$/.test(ref), ref);
const versAsmine = await client.evaluate(() => window.__ouvert[0] || '');
check('le message part vers le numéro d\'Asmine',
  versAsmine.includes('wa.me/33759312433'), versAsmine.slice(0, 45));
const texteClient = decodeURIComponent(versAsmine);
check('le message porte le nom et le téléphone du client',
  texteClient.includes('Claire Fontaine') && texteClient.includes('+33 6 12 34 56 78'));
const lienDemande = (texteClient.match(/https?:\/\/\S+\?a=[\w-]+/) || [])[0];
check('un lien de prise en charge accompagne le message', !!lienDemande,
  lienDemande ? lienDemande.slice(0, 50) + '…' : 'absent');
check('le client ne voit aucune étape restante',
  (await client.locator('#screen-confirmation').textContent()).includes('rien d\'autre à faire'));

/* ============ LA DEMANDE ENTRE DANS LE TABLEAU DE BORD ============ */
const paramA = lienDemande ? new URL(lienDemande).searchParams.get('a') : null;
await op.goto(BASE + '/index.html?a=' + paramA, { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
check('le lien ouvre directement le bon de la demande',
  await op.locator('#screen-voucher').isVisible());
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(400);
check('la demande est comptée en attente',
  (await op.locator('#compteurAttente').textContent()) === '1');
check('une pastille signale la demande à trancher',
  await op.locator('#listeDemandes .pastille.attente').first().isVisible());
const ligne = await op.locator('#listeDemandes .ligne-demande').first().textContent();
check('la ligne porte la référence, le client et le trajet',
  ligne.includes(ref) && ligne.includes('Claire Fontaine') && ligne.includes('Montaigne'),
  ligne.replace(/\s+/g, ' ').trim().slice(0, 110));

// Rouvrir le même lien ne doit pas créer de doublon
await op.goto(BASE + '/index.html?a=' + paramA, { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(600);
check('rouvrir le lien ne crée pas de doublon',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('asmine_bookings') || '[]').length)) === 1);

/* ================= IL DIFFUSE, PUIS CONFIRME ================= */
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(300);
await op.locator('#listeDemandes .ligne-demande').first().click();
await op.waitForTimeout(400);
check('le bon donne accès à la diffusion au groupe',
  await op.locator('#dispatchBlock').isVisible());
const annonce = await op.locator('#dispatchPreview').textContent();
check('l\'annonce au groupe reste anonyme',
  !annonce.includes('Claire Fontaine') && !annonce.includes('12 34 56 78'), annonce.slice(0, 90));
check('les trois décisions sont proposées',
  await op.locator('#btnConfirmRide').isVisible()
  && await op.locator('#btnRefuseRide').isVisible());
check('rien à annoncer tant qu\'aucune décision n\'est prise',
  !(await op.locator('#btnPrevenirClient').isVisible()));

await op.locator('#btnConfirmRide').click();
await op.waitForTimeout(400);
check('après confirmation, le client peut être prévenu',
  await op.locator('#btnPrevenirClient').isVisible());
const hrefOk = decodeURIComponent(await op.locator('#btnPrevenirClient').getAttribute('href'));
check('le message de prise en charge porte la référence', hrefOk.includes(ref));
const paramOk = (hrefOk.match(/\?ok=([\w-]+)/) || [])[1];
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(400);
check('les compteurs suivent la décision',
  (await op.locator('#compteurAttente').textContent()) === '0'
  && (await op.locator('#compteurConfirmee').textContent()) === '1');

/* ================= LE CLIENT VOIT SA DEMANDE ABOUTIR ================= */
await client.goto(BASE + '/index.html?ok=' + paramOk, { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(800);
const bonPris = await client.locator('#voucherBody').textContent();
check('le client lit que sa demande est prise en charge',
  bonPris.includes('prise en charge'), bonPris.slice(0, 110));

/* ================= ET LE CAS OÙ ELLE N'ABOUTIT PAS ================= */
// La liste montre les demandes en attente : une fois confirmée, la course
// se retrouve derrière le compteur « Confirmées ».
await op.locator('.carte-compteur[data-filtre="confirmee"]').click();
await op.waitForTimeout(300);
check('le compteur « Confirmées » filtre la liste',
  (await op.locator('#listeDemandes .ligne-demande').count()) === 1);
await op.locator('#listeDemandes .ligne-demande').first().click();
await op.waitForTimeout(400);
await op.locator('#btnRefuseRide').click();
await op.waitForTimeout(400);
const bonRefus = await op.locator('#voucherBody').textContent();
check('l\'exploitant peut refuser une demande',
  bonRefus.includes('n\'a pas pu aboutir'), bonRefus.slice(0, 110));
const hrefNon = decodeURIComponent(await op.locator('#btnPrevenirClient').getAttribute('href'));
const paramNon = (hrefNon.match(/\?no=([\w-]+)/) || [])[1];
check('le message de refus est prêt à partir', !!paramNon && hrefNon.includes(ref));

await client.goto(BASE + '/index.html?no=' + paramNon, { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(800);
const bonNon = await client.locator('#voucherBody').textContent();
check('le client lit que sa demande n\'a pas abouti',
  bonNon.includes('n\'a pas pu aboutir'), bonNon.slice(0, 110));
check('le refus lui donne un numéro à appeler',
  bonNon.includes('+33 7 59 31 24 33'), bonNon.slice(0, 220));
const apresRefus = await client.evaluate((r) =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]').find(b => b.ref === r), ref);
check('la course reste dans ses réservations, marquée refusée',
  apresRefus && apresRefus.statut === 'refusee', apresRefus ? apresRefus.statut : 'introuvable');

/* ================= LES TERMINAUX D'AÉROPORT ================= */
await client.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
await client.type('#dropoff', 'cdg', { delay: 20 });
await client.locator('#dropoffList [role=option]').first().waitFor({ timeout: 5000 });
const terminaux = await client.locator('#dropoffList [role=option]').allTextContents();
check('taper « cdg » propose les terminaux', terminaux.length >= 9, terminaux.length + ' résultats');
const debuts = terminaux.map(x => x.replace(/\s+/g, ' ').trim().slice(0, 16));
check('chaque terminal se distingue dès le début de la ligne',
  new Set(debuts).size === terminaux.length, debuts.slice(0, 3).join(' | '));

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
