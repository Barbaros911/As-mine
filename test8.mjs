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
// Un client n'a jamais déverrouillé : aucun chemin vers l'espace de travail.
check('client : aucun chemin vers l\'espace de travail',
  !(await client.locator('#retourExploitant').isVisible()));

const ctxOp = await browser.newContext({ viewport: { width: 390, height: 844 } });
await preparer(ctxOp);
const op = await ctxOp.newPage();
op.on('pageerror', e => errors.push('PAGEERROR(op): ' + e.message));
await ouvrirEspaceExploitant(op);
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
check('exploitant : l\'onglet mène à la création, pas à « mes réservations »',
  (await op.locator('.nav-item[data-target="screen-bookings"] span').textContent()).includes('Créer'));
check('exploitant : pas de sélecteur de langue dans l\'espace de travail',
  !(await op.locator('#langSelect').isVisible())
  && (await op.getAttribute('html', 'lang')) === 'fr');
check('exploitant : le bouton de sortie est proposé', await op.locator('#navQuitter').isVisible());
check('exploitant : pas de WhatsApp flottant', !(await op.locator('#whatsappFloat').isVisible()));
// La bannière cookies s'adresse aux visiteurs : elle masquait la liste des
// demandes sur l'outil de travail.
check('exploitant : pas de bannière cookies', !(await op.locator('#cookieBanner').isVisible()));
check('exploitant : le site public est à un clic',
  await op.locator('#lienSitePublic').isVisible());
check('exploitant : liste vide au départ',
  await op.locator('#videDemandes').isVisible()
  && (await op.locator('#compteurAttente').textContent()) === '0');

/* ===== SUR LE MÊME TÉLÉPHONE, LE LIEN PUBLIC RESTE PUBLIC ===== */
// Le déverrouillage est retenu pour ne pas redemander le code, mais il ne
// doit pas transformer l'adresse publique en espace de travail : sinon
// l'exploitant ne peut plus voir ce que voient ses clients.
await op.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(600);
check('déverrouillé, l\'adresse publique montre le site client',
  (await op.evaluate(() => MODE_EXPLOITANT)) === false
  && await op.locator('#accrocheClient').isVisible()
  && !(await op.locator('#tableauBord').isVisible()));
check('et sans badge d\'espace de travail',
  !(await op.locator('#badgeExploitant').isVisible()));
// L'aller-retour se fait par un bouton, pas en retapant l'adresse.
check('un chemin de retour vers l\'espace de travail est proposé',
  await op.locator('#retourExploitant').isVisible());
check('ce retour vise bien l\'adresse de l\'espace exploitant',
  (await op.locator('#retourExploitant').getAttribute('href')).includes('admin.html'));
// Retour à l'espace de travail : le code n'est pas redemandé.
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
check('l\'espace de travail se rouvre sans redemander le code',
  (await op.evaluate(() => MODE_EXPLOITANT)) === true
  && !(await op.locator('#deverrouillage').isVisible()));
await op.locator('#cookieAccept').click().catch(() => {});
await op.waitForTimeout(200);

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
check('ce lien vise l\'espace exploitant, pas le site client',
  !!lienDemande && lienDemande.includes('/admin.html?a='),
  lienDemande ? lienDemande.slice(0, 60) : '');
check('le client ne voit aucune étape restante',
  (await client.locator('#screen-confirmation').textContent()).includes('rien d\'autre à faire'));

/* ============ LA DEMANDE ENTRE DANS LE TABLEAU DE BORD ============ */
const paramA = lienDemande ? new URL(lienDemande).searchParams.get('a') : null;
await op.goto(BASE + '/admin.html?a=' + paramA, { waitUntil: 'domcontentloaded' });
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
await op.goto(BASE + '/admin.html?a=' + paramA, { waitUntil: 'domcontentloaded' });
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

// Il saisit le chauffeur trouvé dans le groupe, puis lui envoie la course.
check('un champ libre attend le chauffeur retenu',
  await op.locator('#nomChauffeurRetenu').isVisible());
await op.fill('#nomChauffeurRetenu', 'Mehmet K.');
await op.fill('#telChauffeurRetenu', '06 98 76 54 32');
await op.waitForTimeout(400);
const versChauffeur = await op.locator('#btnEnvoyerChauffeur').getAttribute('href');
check('la course part en privé, sur le numéro du chauffeur',
  versChauffeur.startsWith('https://wa.me/33698765432'), versChauffeur.slice(0, 40));
check('ce message-là porte bien le lien de course',
  decodeURIComponent(versChauffeur).includes('?c='));

await op.locator('#btnConfirmRide').click();
await op.waitForTimeout(400);
check('après confirmation, le client peut être prévenu',
  await op.locator('#btnPrevenirClient').isVisible());
const brutOk = await op.locator('#btnPrevenirClient').getAttribute('href');
check('le message au client part droit sur son numéro',
  brutOk.startsWith('https://wa.me/33612345678'), brutOk.slice(0, 40));
const hrefOk = decodeURIComponent(brutOk);
check('le message de prise en charge porte la référence', hrefOk.includes(ref));
check('le message annonce le chauffeur au client',
  hrefOk.includes('Mehmet K.') && hrefOk.includes('06 98 76 54 32'), hrefOk.slice(0, 130));
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
check('le client voit le nom et le numéro de son chauffeur',
  bonPris.includes('Mehmet K.') && bonPris.includes('06 98 76 54 32'));

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

/* ================= LA PAGE ADMIN : CRÉER, CHAUFFEURS, SEMAINES ================= */
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
// On repart d'un registre vide : ce qui précède a rempli l'appareil.
await op.evaluate(() => localStorage.removeItem('asmine_bookings'));
await op.reload({ waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);

check('admin : plus de titre « Mes réservations »',
  !(await op.locator('#blocMesReservations').isVisible()));
check('admin : la liste des courses du client n\'y est plus',
  !(await op.locator('#bookingsList').isVisible()));
check('admin : le bloc de gestion est là', await op.locator('#blocAdmin').isVisible());
check('admin : les tableaux sont vides tant qu\'aucune course n\'est réalisée',
  await op.locator('#videChauffeurs').isVisible()
  && await op.locator('#videSemaines').isVisible());

// Une saisie incomplète ne crée rien : on ne veut pas d'une course sans prix.
await op.fill('#rapideClient', 'Hôtel Ibis CDG');
await op.locator('#btnCreerRapide').click();
await op.waitForTimeout(200);
check('admin : une course sans adresse ni prix est refusée',
  await op.locator('#rapideErreur').isVisible()
  && (await op.evaluate(() => JSON.parse(localStorage.getItem('asmine_bookings') || '[]').length)) === 0);

// Le nom du client, deux adresses, un prix : c'est tout ce qu'il faut.
await op.fill('#rapideDepart', 'Terminal 2E — Roissy CDG');
await op.fill('#rapideArrivee', '15 rue de Rivoli, Paris');
await op.fill('#rapideDate', '2030-03-06');
await op.fill('#rapideHeure', '09:30');
await op.fill('#rapidePrix', '90');
await op.fill('#rapideChauffeur', 'Yusuf D.');
await op.fill('#rapideChauffeurTel', '+33 6 11 22 33 44');
await op.locator('#btnCreerRapide').click();
await op.waitForTimeout(500);

const creee = await op.evaluate(() =>
  JSON.parse(localStorage.getItem('asmine_bookings') || '[]')[0]);
check('admin : la course est enregistrée', !!creee, creee ? creee.ref : 'aucune');
check('admin : elle porte une référence Asmine',
  /^ASM-\d{2}-\d{2}-\d{4}$/.test(creee.ref), creee.ref);
check('admin : saisie par l\'exploitant, elle est ferme d\'entrée',
  creee.statut === 'confirmee', creee.statut);
check('admin : le prix saisi est le prix retenu', creee.prix.total === 90, String(creee.prix.total));
check('admin : le chauffeur saisi est repris',
  creee.course.chauffeurDeclare === 'Yusuf D.'
  && creee.course.chauffeurTelephone === '+33 6 11 22 33 44');
check('admin : le bon s\'ouvre aussitôt', await op.locator('#screen-voucher').isVisible());
check('admin : le formulaire est vidé pour la course suivante',
  (await op.inputValue('#rapideDepart')) === '' && (await op.inputValue('#rapidePrix')) === '');

// Une course confirmée n'est pas une course faite : elle ne compte pas encore.
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);
check('admin : une course confirmée ne gonfle pas le chiffre d\'affaires',
  await op.locator('#videChauffeurs').isVisible());

// On la marque réalisée : elle rejoint alors les deux tableaux.
await op.evaluate(() => {
  const l = JSON.parse(localStorage.getItem('asmine_bookings') || '[]');
  l[0].statut = 'realisee';
  localStorage.setItem('asmine_bookings', JSON.stringify(l));
});
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(200);
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(400);
const tblCh = await op.locator('#blocChauffeurs').textContent();
check('admin : le chauffeur apparaît avec sa course',
  tblCh.includes('Yusuf D.') && tblCh.includes('90,00'), tblCh.replace(/\s+/g, ' ').slice(0, 120));
check('admin : la commission d\'apport est calculée',
  tblCh.includes(await op.evaluate(() => eur(90 * COMMISSION_APPORT))),
  await op.evaluate(() => eur(90 * COMMISSION_APPORT)));
const tblSem = await op.locator('#blocSemaines').textContent();
check('admin : la semaine du 04/03 au 10/03 porte la course',
  tblSem.includes('04/03') && tblSem.includes('10/03'),
  tblSem.replace(/\s+/g, ' ').slice(0, 120));
check('admin : le total de la semaine est juste',
  tblSem.includes('90,00'), tblSem.replace(/\s+/g, ' ').slice(0, 160));

// Les indicateurs de la semaine : la course créée est datée de 2030, donc
// hors semaine en cours — les compteurs doivent rester à zéro sans mentir.
check('admin : les indicateurs de la semaine sont affichés',
  await op.locator('#kpiCourses').isVisible()
  && (await op.locator('#periodeSemaine').textContent()).includes('/'));
check('admin : une course d\'une autre semaine ne compte pas dans celle-ci',
  (await op.locator('#kpiCourses').textContent()) === '0');
check('admin : la semaine passée sert de comparaison',
  (await op.locator('#kpiCoursesAvant').textContent()).includes('sem. dernière'));

// Une course datée d'aujourd'hui doit, elle, apparaître dans la semaine.
await op.evaluate(() => {
  const l = JSON.parse(localStorage.getItem('asmine_bookings') || '[]');
  l.push(JSON.parse(JSON.stringify(Object.assign({}, l[0], {
    ref: 'ASM-99-99-9999',
    course: Object.assign({}, l[0].course, { date: new Date().toISOString().slice(0, 10) })
  }))));
  localStorage.setItem('asmine_bookings', JSON.stringify(l));
});
await op.reload({ waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(400);
check('admin : une course du jour entre dans la semaine en cours',
  (await op.locator('#kpiCourses').textContent()) === '1'
  && (await op.locator('#kpiEncaisse').textContent()).includes('90'),
  await op.locator('#kpiEncaisse').textContent());

// Le registre ne vit que sur cet appareil : la sauvegarde est proposée.
check('admin : la sauvegarde du registre est offerte',
  await op.locator('#btnSauvegarde').isVisible()
  && await op.locator('#btnRestaurer').isVisible()
  && await op.locator('#btnExportCourses').isVisible());
const [tele] = await Promise.all([
  op.waitForEvent('download', { timeout: 8000 }),
  op.locator('#btnSauvegarde').click()
]);
check('admin : la sauvegarde produit bien un fichier',
  tele.suggestedFilename().startsWith('asmine-registre-')
  && tele.suggestedFilename().endsWith('.json'), tele.suggestedFilename());
const [csv] = await Promise.all([
  op.waitForEvent('download', { timeout: 8000 }),
  op.locator('#btnExportCourses').click()
]);
check('admin : l\'export comptable produit un CSV',
  csv.suggestedFilename().endsWith('.csv'), csv.suggestedFilename());
check('admin : le CSV porte les colonnes utiles au comptable',
  (await op.evaluate(() => coursesCsv().split('\r\n')[0]))
    .includes('Commission'), await op.evaluate(() => coursesCsv().split('\r\n')[0]));

// Cliquer un indicateur ne doit pas dérégler le filtre du tableau de bord.
await op.locator('#kpiCourses').click();
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(300);
check('admin : les indicateurs ne pilotent pas le filtre des demandes',
  await op.locator('#listeDemandes').isVisible()
  || await op.locator('#videDemandes').isVisible());

// Côté client, rien de tout cela n'existe.
await client.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await client.waitForTimeout(600);
await client.locator('.nav-item[data-target="screen-bookings"]').click();
await client.waitForTimeout(300);
check('client : pas de page de gestion chez lui',
  !(await client.locator('#blocAdmin').isVisible())
  && await client.locator('#blocMesReservations').isVisible());

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
