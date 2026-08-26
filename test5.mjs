// Boucle complète : réservation à prix fixe → lien envoyé au chauffeur →
// écran chauffeur (accepter, sur place, démarrer, terminer) → confirmation
// renvoyée à l'exploitant, qui voit son bon passer en « réalisée ».
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
const errors = [];
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const dansNJours = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const HOTEL = { label: 'Hôtel Ibis Paris Gare de Lyon, 12 rue Traversière, 75012 Paris', lat: 48.8443, lon: 2.3735, icon: '🏨', categorie: 'hotel', isNamedPlace: true, source: 'photon' };
const BUREAU = { label: '15 avenue Montaigne, 75008 Paris', lat: 48.8661, lon: 2.3045, icon: '📍', categorie: 'adresse', isNamedPlace: false, source: 'ban' };

// Les API d'adresses ne sont pas joignables depuis les tests, et window.open
// ouvrirait WhatsApp : on remplace les deux pour que le parcours soit
// reproductible et que l'on puisse lire les liens produits.
async function prepare(ctx) {
  await ctx.addInitScript(() => {
    window.__ouvert = [];
    window.open = (u) => { window.__ouvert.push(u); return { closed: false }; };
  });
}
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
await prepare(ctxOp);
const op = await ctxOp.newPage();
op.on('pageerror', e => errors.push('PAGEERROR(op): ' + e.message));
await deverrouillerExploitant(op, BASE);
await op.waitForTimeout(600);
await op.locator('#cookieAccept').click().catch(() => {});
await op.waitForTimeout(200);

// --- Départ et arrivée sont tous deux obligatoires ---
await stubAdresses(op, HOTEL);
await choisir(op, '#pickup', 'ibis');
await op.fill('#roomPickup', '512B');
await op.fill('#dateSimple', dansNJours(1));
await op.waitForTimeout(200);
await op.locator('#btnSearch').click();
await op.waitForTimeout(400);
check('réservation refusée sans adresse d\'arrivée',
  await op.locator('#screen-home').isVisible() && await op.locator('#formError').isVisible(),
  await op.locator('#formError').textContent());

await stubAdresses(op, BUREAU);
await choisir(op, '#dropoff', 'montaigne');
await op.waitForTimeout(200);
await op.locator('#btnSearch').click();
await op.locator('#screen-vehicles').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
check('écran véhicules atteint une fois l\'arrivée renseignée',
  await op.locator('#screen-vehicles').isVisible());
const tarifs = await op.locator('#vehicleCards .veh-card p.font-mono').allTextContents();
check('un prix ferme est affiché, pas un tarif au kilomètre',
  tarifs.every(x => /^\d/.test(x.trim()) && !x.includes('/km')), tarifs.join(' | '));

await op.locator('#vehicleCards .veh-card').first().click();
await op.locator('#btnToPayment').click();
await op.waitForTimeout(400);
const recap = await op.locator('#tripSummary').textContent();
check('récapitulatif : arrivée réelle', recap.includes('Montaigne'), recap.slice(0, 130));
check('récapitulatif : chambre du départ', recap.includes('Ch. 512B'));
check('récapitulatif : prix total annoncé', recap.includes('Prix total'));

await op.fill('#clientName', 'Hôtel Ibis — réception');
await op.fill('#clientPhone', '+33 1 44 68 70 00');
await op.locator('#btnPayOnBoard').click();
await op.waitForTimeout(500);
check('réservation enregistrée', await op.locator('#screen-confirmation').isVisible());
const ref = (await op.locator('#confRef').textContent()).trim();
check('référence attribuée', /^ASM-\d{2}-\d{2}-\d{4}$/.test(ref), ref);

await op.locator('#btnOpenVoucher').click();
await op.waitForTimeout(400);
const bon = await op.locator('#voucherBody').textContent();
check('bon : montant ferme', bon.includes('Prix total') && bon.includes('TVA'), bon.slice(-140));
check('bon : en attente de confirmation', bon.includes('En attente de confirmation'));
const prixReserve = await op.evaluate(() => lastVoucher.prix.total);
const eurTexte = (n) => n.toLocaleString('fr', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// --- L'annonce au groupe, puis le lien au seul chauffeur retenu ---
const hrefDispatch = await op.locator('#btnDispatchWhatsapp').getAttribute('href');
const texteEnvoye = decodeURIComponent(hrefDispatch.replace('https://wa.me/?text=', ''));
const apercu = await op.locator('#dispatchPreview').textContent();
check('l\'annonce au groupe ne porte aucun lien encodé',
  !texteEnvoye.includes('?c=') && !apercu.includes('?c='));
check('l\'aperçu montre exactement ce qui part', apercu.trim() === texteEnvoye.trim());
check('l\'annonce tient en peu de lignes',
  texteEnvoye.trim().split('\n').length <= 9, texteEnvoye.trim().split('\n').length + ' lignes');
check('annonce : sans le nom du client', !texteEnvoye.includes('réception'));
check('annonce : sans la chambre du client', !apercu.includes('512B'));

// Le lien de course part en privé, au chauffeur que l'exploitant a retenu.
check('pas de lien de course tant qu\'aucun chauffeur n\'est retenu',
  !(await op.locator('#btnEnvoyerChauffeur').isVisible()));
await op.fill('#nomChauffeurRetenu', 'Mehmet K.');
await op.fill('#telChauffeurRetenu', '06 98 76 54 32');
await op.waitForTimeout(400);
check('le bouton d\'envoi apparaît une fois le chauffeur saisi',
  await op.locator('#btnEnvoyerChauffeur').isVisible());
const hrefChauffeur = await op.locator('#btnEnvoyerChauffeur').getAttribute('href');
check('le message part droit sur le numéro du chauffeur',
  hrefChauffeur.startsWith('https://wa.me/33698765432'), hrefChauffeur.slice(0, 40));
const texteChauffeur = decodeURIComponent(hrefChauffeur);
const lien = (texteChauffeur.match(/https?:\/\/\S+\?c=[\w-]+/) || [])[0];
check('le lien de course accompagne ce message privé', !!lien,
  lien ? lien.slice(0, 58) + '…' : 'absent');

const paramC = lien ? new URL(lien).searchParams.get('c') : null;

/* ============================= CÔTÉ CHAUFFEUR ============================= */
const ctxCh = await browser.newContext({ viewport: { width: 390, height: 844 } });
await prepare(ctxCh);
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
check('chauffeur : arrivée visible', vueCh.includes('Montaigne'));
check('chauffeur : sans le numéro de chambre', !vueCh.includes('512B'), vueCh.slice(0, 140));
check('chauffeur : montant à encaisser affiché', vueCh.includes('À encaisser'));
// Sa part vaut le prix client moins la commission d'apport.
// On demande le montant à la page elle-même : c'est son formateur qui fait foi,
// un arrondi recalculé ici tomberait à côté d'un centime près.
const partCh = await ch.evaluate(() => eur(courseChauffeur.m * (1 - courseChauffeur.c)));
check('chauffeur : sa part est nette de commission', vueCh.includes(partCh), partCh);

// Nom obligatoire
await ch.locator('#btnDriverPrendre').click();
await ch.waitForTimeout(200);
check('refus tant que le chauffeur n\'a pas donné son nom',
  await ch.locator('#driverErreur').isVisible());
await ch.fill('#driverNom', 'Mehmet K.');
await ch.locator('#btnDriverPrendre').click();
await ch.waitForTimeout(300);
check('course acceptée', (await ch.locator('#driverTitle').textContent()).includes('acceptée'));
// Les étapes ne servent qu'au chauffeur : Asmine lui a attribué la course,
// il n'a rien à apprendre de trois messages automatiques.
check('accepter la course n\'envoie aucun message',
  (await ch.evaluate(() => window.__ouvert.length)) === 0);

// Sur place, puis départ, puis fin
await ch.locator('#btnDriverSurPlace').click();
await ch.waitForTimeout(300);
check('arrivée sur place enregistrée', (await ch.locator('#driverTitle').textContent()).includes('Sur place'));
check('« sur place » n\'envoie aucun message non plus',
  (await ch.evaluate(() => window.__ouvert.length)) === 0);
check('le compteur d\'attente tourne', await ch.locator('#driverChrono').isVisible());
await ch.locator('#btnDriverDemarrer').click();
await ch.waitForTimeout(300);
check('course démarrée', (await ch.locator('#driverTitle').textContent()).includes('en cours'));
check('plus de saisie d\'adresse en fin de course',
  (await ch.locator('#driverArrivee').count()) === 0);
await ch.locator('#btnDriverTerminer').click();
await ch.waitForTimeout(400);
check('course terminée', (await ch.locator('#driverTitle').textContent()).includes('terminée'));
const montant = await ch.evaluate(() => montantCourse(courseChauffeur).total);
check('le montant est celui convenu à la réservation',
  Math.abs(montant - prixReserve) < 0.01, `${montant} contre ${prixReserve}`);

// Seul geste qui envoie encore quelque chose, et sur décision du chauffeur :
// un message court de fin de course, sans lien encodé.
await ch.locator('#btnDriverEnvoyer').click();
await ch.waitForTimeout(300);
const msgFin = decodeURIComponent(await ch.evaluate(() => window.__ouvert[window.__ouvert.length - 1]));
check('le message de fin est court et porte la référence',
  msgFin.includes(ref) && msgFin.split('\n').length <= 2, msgFin.slice(0, 110));
check('le message de fin ne porte plus de lien encodé', !/\?f=|\?c=/.test(msgFin));
check('le montant encaissé y figure', msgFin.includes(eurTexte(prixReserve)),
  `${msgFin.slice(-40)} / attendu ${eurTexte(prixReserve)}`);

/* ================= L'EXPLOITANT CLÔT LA COURSE LUI-MÊME ================= */
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(400);
await op.locator('#listeDemandes .ligne-demande').first().click();
await op.waitForTimeout(400);
check('clore la course n\'est possible qu\'après confirmation',
  !(await op.locator('#btnDoneRide').isVisible()));
await op.locator('#btnConfirmRide').click();
await op.waitForTimeout(400);
check('une fois confirmée, la course peut être marquée réalisée',
  await op.locator('#btnDoneRide').isVisible());
await op.locator('#btnDoneRide').click();
await op.waitForTimeout(400);
const bonFinal = await op.locator('#voucherBody').textContent();
check('bon : la course est marquée réalisée', bonFinal.includes('Course réalisée'), bonFinal.slice(0, 160));
const enregistre = await op.evaluate((r) =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]').find(b => b.ref === r), ref);
check('course enregistrée comme réalisée', enregistre && enregistre.statut === 'realisee',
  enregistre ? enregistre.statut : 'introuvable');
check('montant inchangé de bout en bout',
  enregistre && Math.abs(enregistre.prix.total - prixReserve) < 0.01,
  enregistre ? `${enregistre.prix.total} contre ${prixReserve}` : '');
// Le chauffeur est celui que l'exploitant a saisi lui-même, pas une
// déclaration renvoyée par l'écran chauffeur : c'est lui qui attribue.
check('le chauffeur attribué reste sur la course',
  enregistre && enregistre.course.chauffeurDeclare === 'Mehmet K.',
  enregistre ? String(enregistre.course.chauffeurDeclare) : 'introuvable');
check('son téléphone aussi',
  enregistre && enregistre.course.chauffeurTelephone === '06 98 76 54 32',
  enregistre ? String(enregistre.course.chauffeurTelephone) : 'introuvable');

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
