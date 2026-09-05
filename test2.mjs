import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
couperLeReseau(browser);
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
// Deux véhicules depuis la suppression des versions VIP : un client seul
// garde le droit de vouloir un van, seul le trop petit est écarté.
check('les quatre gammes proposées pour un passager', nbVeh === 4, nbVeh + '');
const sub = await page.locator('#vehiclesSub').textContent();
check('distance calculée', /\d/.test(sub), sub);

// Prix cohérents et croissants
const prix = await page.locator('#vehicleCards .veh-card .veh-prix').allTextContents();
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

// Plus de code promo nulle part : ni sur l'accueil, ni sur le paiement.
check('aucun champ de code promo sur le paiement',
  await page.locator('#promoPayment').count() === 0
  && await page.locator('#btnApplyPromo').count() === 0);

// --- Il ne reste qu'un seul type de course ---
await page.locator('#btnEditTrip').click();
await page.waitForTimeout(300);
/* ============ LES PACKS ET LA MISE À DISPOSITION ONT ÉTÉ RETIRÉS ============
   Les six offres d'abord — Paris Essentiel, Paris Illuminé, Paris en Famille,
   Paris Vision, Ela Prestige et la mise à disposition — puis la mise à
   disposition elle-même, à la demande de Barbaros : « on garde que la
   réservation ». Le site ne vend plus qu'un trajet d'une adresse à une autre.
   Il ne doit rien rester d'accessible : ni rayon, ni fiche, ni second
   formulaire, ni onglet pour y entrer. */
check('le rayon d\'offres a disparu', (await page.locator('#blocTours').count()) === 0);
check('l\'écran des fiches a disparu', (await page.locator('#screen-tour').count()) === 0);
check('plus aucune carte d\'offre', (await page.locator('.tour-carte').count()) === 0);
check('les onglets ont disparu',
  (await page.locator('#tabDisposal').count()) === 0
  && (await page.locator('#tabSimple').count()) === 0);
check('le formulaire de mise à disposition a disparu',
  (await page.locator('#formDisposal').count()) === 0);
check('et ses six champs avec lui',
  (await page.locator('#pickupDisp').count()) === 0
  && (await page.locator('#dateDisp').count()) === 0
  && (await page.locator('#durationRange').count()) === 0);
/* Le formulaire du trajet simple, lui, reste ouvert d'emblée : il n'y a plus
   rien à choisir avant de saisir ses adresses. */
check('le formulaire de trajet simple est ouvert d\'emblée',
  await page.locator('#formSimple').isVisible());
check('la page ne vend plus la mise à disposition dans son texte',
  (await page.locator('#seoContent').textContent()).indexOf('Mise à disposition') === -1);

// --- Écran « Infos » et documents légaux ---
// L'onglet ne s'appelle plus « QR code » : le code QR sert à imprimer une
// affiche pour un hôtel, c'est un outil de l'exploitant. Ce que le client
// vient chercher ici, ce sont les documents obligatoires et un numéro.
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(400);
check('écran d\'informations accessible', await page.locator('#screen-qr').isVisible());
/* LE CODE QR EST REVENU CÔTÉ CLIENT (septembre 2026, à la demande de
   Barbaros). Il était réservé au mode exploitant, vu comme un outil
   d'impression d'affiche. Sa valeur est ailleurs : un client content à qui
   on demande le nom de son chauffeur a maintenant quelque chose à montrer.
   On vérifie le bloc ET le lien écrit en clair — c'est lui qui reste utile
   si le service extérieur qui dessine le code ne répond pas. */
check('le bloc « Partager » s\'affiche au client', await page.locator('#blocQr').isVisible());
check('il porte le lien du site en clair',
  (await page.locator('#qrUrlText').textContent()).includes('elatransfer.com'),
  await page.locator('#qrUrlText').textContent());
check('et le bouton qui le copie', await page.locator('#btnCopyLink').isVisible());
check('le client trouve comment nous joindre', await page.locator('#blocContact').isVisible());
check('quatre documents légaux présents', (await page.locator('.btn-legal').count()) === 4);
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(300);
const cgv = await page.locator('#legalDocBody').textContent();
check('CGV : 60 minutes d\'attente offertes', cgv.includes('60 minutes'));
// Le barème d'annulation a remplacé la gratuité générale (art. 7, août 2026).
// On vérifie que les trois paliers ET l'absence du client y sont : un barème
// à trous laisse le chauffeur sans recours et le client sans repère.
check('CGV : le barème d\'annulation porte ses trois paliers',
  cgv.includes('24 heures') && cgv.includes('30 %') && cgv.includes('50 %'),
  cgv.includes('24 heures') + '/' + cgv.includes('30 %') + '/' + cgv.includes('50 %'));
check('CGV : une fenêtre gratuite subsiste — sans elle la clause est attaquable',
  cgv.includes('aucun frais'));
check('CGV : l\'absence du client au rendez-vous est couverte',
  cgv.includes('absence du Client') && cgv.includes('totalité du prix'));
check('CGV : règlement au chauffeur, pas en ligne', cgv.includes('directement auprès du chauffeur'));
check('CGV : plus aucune mention de PayPal', !cgv.includes('PayPal'));

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
