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
await page.selectOption('#langSelect','fr');
await page.waitForTimeout(400);

async function pickAddress(field, text) {
  await page.fill(field, '');
  await page.type(field, text, { delay: 25 });
  await page.waitForTimeout(1500);
  const list = '#' + field.slice(1) + 'List';
  await page.locator(list + ' [role=option]').first().click();
  await page.waitForTimeout(200);
}

// --- Parcours trajet simple ---
await pickAddress('#pickup', 'Argenteuil');
await pickAddress('#dropoff', 'Versailles');
const d = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
await page.fill('#dateSimple', d);
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.waitForTimeout(2500);

check('écran véhicules atteint', await page.locator('#screen-vehicles').isVisible());
const nbVeh = await page.locator('#vehicleCards .veh-card').count();
check('les quatre véhicules proposés pour un passager', nbVeh === 4, nbVeh + '');
const sub = await page.locator('#vehiclesSub').textContent();
check('distance calculée', /\d/.test(sub), sub);

// Prix cohérents et croissants
const prix = await page.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('tarifs affichés', prix.length === 4, prix.join(' | '));

await page.locator('#vehicleCards .veh-card').first().click();
await page.waitForTimeout(200);
check('bouton Continuer activé après choix', !(await page.locator('#btnToPayment').isDisabled()));
await page.locator('#btnToPayment').click();
await page.waitForTimeout(500);

check('écran paiement atteint', await page.locator('#screen-payment').isVisible());
const recap = await page.locator('#tripSummary').textContent();
check('récapitulatif rempli', recap.includes('Argenteuil') && recap.includes('TVA'), recap.slice(0, 80));

// Sans paiement en ligne, réserver avec règlement à bord est l'action principale
check('bouton de réservation proposé', await page.locator('#btnPayOnBoard').isVisible());
check('bouton mis en avant faute de paiement en ligne',
  (await page.locator('#btnPayOnBoard').getAttribute('class')).includes('gold-btn'));
check('libellé « Confirmer ma réservation »',
  (await page.locator('#btnPayOnBoard').textContent()).includes('Confirmer'));

// Passagers : le récapitulatif suit
await page.fill('#paxChildren', '2');
await page.waitForTimeout(300);
check('récapitulatif suit les passagers', (await page.locator('#tripSummary').textContent()).includes('2'));

// Code promo appliqué depuis l'écran de paiement
const avant = await page.locator('#tripSummary').textContent();
await page.fill('#promoPayment', 'BIENVENUE10');
await page.locator('#btnApplyPromo').click();
await page.waitForTimeout(300);
const msg = await page.locator('#promoMsg').textContent();
check('code promo valide reconnu (malgré le hachage)', msg.includes('succès'), msg);
const apres = await page.locator('#tripSummary').textContent();
check('prix recalculé après promo', avant !== apres);

await page.fill('#promoPayment', 'NIMPORTEQUOI');
await page.locator('#btnApplyPromo').click();
await page.waitForTimeout(300);
check('code promo invalide rejeté', (await page.locator('#promoMsg').textContent()).includes('invalide'));

// --- Mise à disposition ---
await page.locator('#btnEditTrip').click();
await page.waitForTimeout(300);
await page.locator('#tabDisposal').click();
await pickAddress('#pickupDisp', 'Neuilly');
await page.fill('#dateDisp', d);
await page.waitForTimeout(300);
await page.locator('#btnSearch').click();
await page.waitForTimeout(1200);
check('mise à disposition → écran véhicules', await page.locator('#screen-vehicles').isVisible());
check('durée affichée', (await page.locator('#vehiclesSub').textContent()).includes('3'));

// --- Écran QR et documents légaux ---
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(400);
check('écran QR accessible', await page.locator('#screen-qr').isVisible());
check('code QR généré', (await page.locator('#qrImg').getAttribute('src')).includes('qrserver'));
check('quatre documents légaux présents', (await page.locator('.btn-legal').count()) === 4);
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(300);
const cgv = await page.locator('#legalDocBody').textContent();
check('CGV : 60 minutes d\'attente offertes', cgv.includes('60 minutes'));
check('CGV : annulation sans frais au-delà de 60 minutes', cgv.includes('plus de 60 minutes') && cgv.includes('sans frais'));
check('CGV : règlement au chauffeur, pas en ligne', cgv.includes('directement auprès du chauffeur'));
check('CGV : plus aucune mention de PayPal', !cgv.includes('PayPal'));

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
