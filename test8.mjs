// La boucle de la demande, de bout en bout, sur deux appareils distincts :
// le client réserve → Asmine reçoit le lien sur WhatsApp → la demande entre
// dans son tableau de bord en attente → il diffuse, confirme ou refuse →
// le client voit sa demande aboutir ou non.
import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';
const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
// Cette suite éprouve le circuit WhatsApp — le REPLI, celui qui prend la
// main quand le serveur est absent ou muet. On efface donc les identifiants
// Supabase au vol : avec serveur, la demande partirait seule et WhatsApp ne
// s'ouvrirait plus. Le fichier du dépôt n'est pas modifié.
couperLeReseau(browser, { sansServeur: true });
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
  await page.evaluate((e) => localStorage.setItem('ela_exploitant', e), empreinte);
  await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
}
// Une réservation complète, du premier écran à la confirmation.
async function reserver(page, nom) {
  await stub(page, HOTEL);
  await choisir(page, '#pickup', 'ibis');
  // Départ dans un hôtel : la chambre est obligatoire, sinon le chauffeur
  // attend au comptoir pendant que le client attend dans sa chambre.
  await page.fill('#roomPickup', '412');
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
const ctxClient = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
// La pastille WhatsApp ne s'affiche qu'une fois le formulaire dépassé :
// en haut de page elle recouvrait le bouton « Voir les tarifs ».
check('client : pas de WhatsApp par-dessus le formulaire',
  !(await client.evaluate(() => document.getElementById('whatsappFloat').classList.contains('vue'))));
await client.evaluate(() => window.scrollTo(0, 1200));
await client.waitForTimeout(400);
check('client : la pastille WhatsApp arrive après le formulaire',
  await client.evaluate(() => document.getElementById('whatsappFloat').classList.contains('vue')));
check('client : elle ouvre une conversation déjà amorcée',
  (await client.locator('#whatsappFloat').getAttribute('href')).includes('text='));
await client.evaluate(() => window.scrollTo(0, 0));
await client.waitForTimeout(300);
// Un client n'a jamais déverrouillé : aucun chemin vers l'espace de travail.
check('client : aucun chemin vers l\'espace de travail',
  !(await client.locator('#retourExploitant').isVisible()));

const ctxOp = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
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
const prixReserve = await client.evaluate(() => state.price);
check('la demande du client reçoit une référence', /^ELA-\d{2}-\d{2}-\d{4}$/.test(ref), ref);
const versAsmine = await client.evaluate(() => window.__ouvert[0] || '');
check('le message part vers le numéro d\'Asmine',
  versAsmine.includes('wa.me/33759312433'), versAsmine.slice(0, 45));
const texteClient = decodeURIComponent(versAsmine);
check('le message porte le nom et le téléphone du client',
  texteClient.includes('Claire Fontaine') && texteClient.includes('+33 6 12 34 56 78'));
// Le message doit se lire d'un coup d'œil sur un téléphone, la nuit : plus
// aucun lien encodé de 800 caractères ne vient le noyer.
const corpsClient = decodeURIComponent(versAsmine.replace(/^[^?]*\?text=/, ''));
check('le message reçu ne porte aucun lien',
  !/https?:\/\//.test(corpsClient), corpsClient.slice(0, 120));
// Une information par ligne : le message gagne deux lignes et deux
// respirations, et se lit en diagonale. Il tient toujours sur un écran.
check('le message reçu tient sur un écran',
  corpsClient.trim().split('\n').length <= 12,
  corpsClient.trim().split('\n').length + ' lignes');
check('le message reçu se lit ligne par ligne',
  corpsClient.split('\n').filter(l => /\s:\s/.test(l)).length >= 5,
  corpsClient.split('\n').filter(l => /\s:\s/.test(l)).length + ' lignes étiquetées');
check('le message porte une date complète, année comprise',
  /\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(corpsClient),
  corpsClient.split('\n')[1]);
check('le client ne voit aucune étape restante',
  (await client.locator('#screen-confirmation').textContent()).includes('rien d\'autre à faire'));

/* ============ LA DEMANDE ENTRE DANS LE TABLEAU DE BORD ============ */
// Plus de lien : l'exploitant recopie le message reçu et le colle.
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);
await op.fill('#collerDemande', 'bonjour');
await op.locator('#btnLireDemande').click();
await op.waitForTimeout(200);
check('un message qui n\'en est pas un est refusé',
  (await op.locator('#collerRetour').textContent()).includes('illisible'));
await op.fill('#collerDemande', corpsClient);
await op.locator('#btnLireDemande').click();
await op.waitForTimeout(300);
check('coller le message remplit le formulaire',
  (await op.inputValue('#rapideClient')) === 'Claire Fontaine'
  && (await op.inputValue('#rapideDepart')).length > 3
  && (await op.inputValue('#rapideArrivee')).includes('Montaigne'),
  [await op.inputValue('#rapideClient'), await op.inputValue('#rapideArrivee')].join(' | '));
check('le prix convenu est repris tel quel',
  Math.abs(parseFloat(await op.inputValue('#rapidePrix')) - prixReserve) < 0.01,
  await op.inputValue('#rapidePrix'));
check('la date et l\'heure sont reprises',
  /^\d{4}-\d{2}-\d{2}$/.test(await op.inputValue('#rapideDate'))
  && /^\d{2}:\d{2}$/.test(await op.inputValue('#rapideHeure')),
  [await op.inputValue('#rapideDate'), await op.inputValue('#rapideHeure')].join(' '));
await op.locator('#btnCreerRapide').click();
await op.waitForTimeout(500);
check('la course entre au registre avec la référence du client',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0].ref)) === ref);
// Un client qui attend une réponse ne produit pas une course confirmée.
check('une demande recollée entre EN ATTENTE, pas confirmée',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0].statut)) === 'attente');
// Recoller la même demande ne doit pas fabriquer un doublon.
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);
await op.fill('#collerDemande', corpsClient);
await op.locator('#btnLireDemande').click();
await op.waitForTimeout(300);
check('recoller la même demande est refusé',
  (await op.locator('#collerRetour').textContent()).includes('déjà'),
  await op.locator('#collerRetour').textContent());
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
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

check('le registre ne contient qu\'une course',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]').length)) === 1);

/* ============ COLLER DEPUIS L'ACCUEIL, EN UN APPUI ============ */
// Le geste de départ de la journée doit tenir sur l'écran d'accueil : une
// demande copiée depuis WhatsApp, un appui, elle est là.
const ctxColle = await browser.newContext({
  viewport: { width: 390, height: 844 },
  permissions: ['clipboard-read', 'clipboard-write']
});
await preparer(ctxColle);
const colle = await ctxColle.newPage();
colle.on('pageerror', e => errors.push('PAGEERROR(colle): ' + e.message));
await ouvrirEspaceExploitant(colle);
await colle.locator('#cookieAccept').click().catch(() => {});
await colle.waitForTimeout(300);
check('le bouton « coller une demande » est sur l\'accueil',
  await colle.locator('#btnCollerAccueil').isVisible());
await colle.evaluate((m) => navigator.clipboard.writeText(m), corpsClient);
await colle.locator('#btnCollerAccueil').click();
await colle.waitForTimeout(600);
const cColle = await colle.evaluate(() =>
  JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0]);
check('un appui suffit à faire entrer la demande', !!cColle && cColle.ref === ref,
  cColle ? cColle.ref : 'aucune');
check('elle entre en attente d\'une décision', cColle.statut === 'attente', cColle.statut);
check('le prix et le client sont repris du message',
  Math.abs(cColle.prix.total - prixReserve) < 0.01
  && cColle.client.nom === 'Claire Fontaine',
  `${cColle.prix.total} / ${cColle.client.nom}`);
check('elle s\'affiche aussitôt en rouge sur le tableau de bord',
  (await colle.locator('#listeDemandes .ligne-demande.en-attente').count()) === 1
  && (await colle.locator('#compteurAttente').textContent()) === '1');
// Rouge plein, texte clair : c'est la seule ligne du site qui prend cette
// couleur, et elle ne veut dire qu'une chose — quelqu'un attend une réponse.
const teinte = await colle.locator('#listeDemandes .ligne-demande.en-attente').first()
  .evaluate(el => {
    const s = getComputedStyle(el);
    return { fond: s.backgroundImage, texte: s.color };
  });
check('la demande non tranchée est bien rouge, pas dorée',
  teinte.fond.includes('229, 72, 77'), teinte.fond.slice(0, 80));
check('son texte reste lisible sur ce rouge',
  teinte.texte.includes('255') , teinte.texte);
check('le compteur « En attente » s\'allume en rouge',
  await colle.locator('.carte-compteur[data-filtre="attente"].alerte').isVisible());
// Une course confirmée ne crie pas : elle est seulement cerclée d'or.
await colle.evaluate(() => {
  const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]');
  l[0].statut = 'confirmee';
  localStorage.setItem('ela_bookings', JSON.stringify(l));
});
await colle.reload({ waitUntil: 'domcontentloaded' });
await colle.waitForTimeout(700);
// Le filtre par défaut ne montre que les demandes en attente : on regarde tout.
await colle.locator('#filtresDemandes .puce-filtre').first().click();
await colle.waitForTimeout(300);
check('une fois tranchée, la course quitte le rouge',
  (await colle.locator('#listeDemandes .ligne-demande.en-attente').count()) === 0
  && (await colle.locator('#listeDemandes .ligne-demande.a-assurer').count()) === 1);
check('et le compteur s\'éteint',
  (await colle.locator('.carte-compteur[data-filtre="attente"].alerte').count()) === 0);
// Recoller la même demande ne doit pas la dédoubler.
await colle.locator('#btnCollerAccueil').click();
await colle.waitForTimeout(500);
check('recoller la même demande ne crée pas de doublon',
  (await colle.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]').length)) === 1
  && (await colle.locator('#collerAccueilRetour').textContent()).includes('déjà'));
// Un presse-papiers qui ne contient pas une demande renvoie à la saisie.
await colle.evaluate(() => navigator.clipboard.writeText('coucou'));
await colle.locator('#btnCollerAccueil').click();
await colle.waitForTimeout(500);
check('un presse-papiers illisible emmène sur le champ de saisie',
  await colle.locator('#collerDemande').isVisible()
  && (await colle.locator('#collerAccueilRetour').textContent()).includes('illisible'));
await ctxColle.close();

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
check('le chauffeur n\'a aucun lien à ouvrir',
  !/https?%3A|https?:\/\//.test(versChauffeur.replace(/^https:\/\/wa\.me\/\d+\?text=/, '')),
  decodeURIComponent(versChauffeur).slice(0, 140));
check('le chauffeur reçoit le client à contacter',
  decodeURIComponent(versChauffeur).includes('Claire Fontaine'));

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
// « En attente » retombe : plus rien ne réclame de décision.
check('le compteur d\'attente retombe après la décision',
  (await op.locator('#compteurAttente').textContent()) === '0');
// Les deux autres compteurs ne cumulent plus depuis le début des temps : ils
// disent « aujourd'hui » et « cette semaine ». La course du test part dans
// cinq jours — elle ne doit donc apparaître dans ni l'un ni l'autre.
check('les compteurs ne cumulent plus tout l\'historique',
  (await op.locator('#compteurConfirmee').textContent()) === '0'
  && (await op.locator('#compteurRealisee').textContent()) === '0');
check('mais la course confirmée est bien au registre',
  (await op.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')
     .filter(b => b.statut === 'confirmee').length)) === 1);

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
  JSON.parse(localStorage.getItem('ela_bookings') || '[]').find(b => b.ref === r), ref);
check('la course reste dans ses réservations, marquée refusée',
  apresRefus && apresRefus.statut === 'refusee', apresRefus ? apresRefus.statut : 'introuvable');

/* ============ CLORE UNE COURSE DEPUIS LE TABLEAU DE BORD ============ */
// Le geste du soir, fait à la chaîne : il doit tenir en un appui, sans
// ouvrir le bon de chaque course. On remet la course sur ses pieds — elle
// vient de servir au refus — et on repart du tableau de bord.
await op.evaluate((r) => {
  const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]');
  const c = l.find(b => b.ref === r);
  if (c) c.statut = 'confirmee';
  localStorage.setItem('ela_bookings', JSON.stringify(l));
}, ref);
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('.carte-compteur[data-filtre="confirmee"]').click();
await op.waitForTimeout(300);
check('une course confirmée offre un bouton « Terminée » sur la liste',
  await op.locator('#listeDemandes .btn-clore').first().isVisible());
await op.locator('#listeDemandes .btn-clore').first().click();
await op.waitForTimeout(500);
check('un appui suffit à clore la course, sans ouvrir son bon',
  (await op.evaluate((r) => JSON.parse(localStorage.getItem('ela_bookings') || '[]')
    .find(b => b.ref === r).statut, ref)) === 'realisee'
  && !(await op.locator('#screen-voucher').isVisible()));
check('la course close ne propose plus de bouton « Terminée »',
  (await op.locator('#listeDemandes .btn-clore').count()) === 0);
check('les compteurs suivent aussitôt',
  (await op.locator('#compteurRealisee').textContent()) === '1'
  && (await op.locator('#compteurConfirmee').textContent()) === '0');

/* ================= LA PAGE ADMIN : CRÉER, CHAUFFEURS, SEMAINES ================= */
await op.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
// On repart d'un registre vide : ce qui précède a rempli l'appareil.
await op.evaluate(() => localStorage.removeItem('ela_bookings'));
await op.reload({ waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);

check('admin : plus de titre « Mes réservations »',
  !(await op.locator('#blocMesReservations').isVisible()));
check('admin : la liste des courses du client n\'y est plus',
  !(await op.locator('#bookingsList').isVisible()));
check('admin : le bloc de gestion est là', await op.locator('#blocAdmin').isVisible());
// Le code QR sert à imprimer l'affiche d'un comptoir d'hôtel : c'est un outil
// de travail, il n'apparaît donc QUE côté exploitant. L'onglet, lui, reste des
// deux côtés — il porte les documents obligatoires, que la loi impose de
// laisser accessibles au client.
check('admin : le code QR est là, avec le registre',
  await op.locator('#navRegistre').isVisible());
await op.locator('.nav-item[data-target="screen-qr"]').click();
await op.waitForTimeout(400);
check('admin : le bloc du code QR s\'affiche', await op.locator('#blocQr').isVisible());
await op.locator('#navRegistre').click();
await op.waitForTimeout(400);
check('admin : le registre est un écran à part',
  await op.locator('#screen-registre').isVisible()
  && !(await op.locator('#screen-bookings').isVisible()));
check('admin : les tableaux sont vides tant qu\'aucune course n\'est réalisée',
  await op.locator('#videChauffeurs').isVisible()
  && await op.locator('#videSemaines').isVisible());
await op.locator('.nav-item[data-target="screen-bookings"]').click();
await op.waitForTimeout(300);

// Une saisie incomplète ne crée rien : on ne veut pas d'une course sans prix.
await op.fill('#rapideClient', 'Hôtel Ibis CDG');
await op.locator('#btnCreerRapide').click();
await op.waitForTimeout(200);
check('admin : une course sans adresse ni prix est refusée',
  await op.locator('#rapideErreur').isVisible()
  && (await op.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]').length)) === 0);

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
  JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0]);
check('admin : la course est enregistrée', !!creee, creee ? creee.ref : 'aucune');
check('admin : elle porte une référence Asmine',
  /^ELA-\d{2}-\d{2}-\d{4}$/.test(creee.ref), creee.ref);
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
await op.locator('#navRegistre').click();
await op.waitForTimeout(400);
check('admin : une course confirmée ne gonfle pas le chiffre d\'affaires',
  await op.locator('#videChauffeurs').isVisible());

// On la marque réalisée : elle rejoint alors les deux tableaux.
await op.evaluate(() => {
  const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]');
  l[0].statut = 'realisee';
  localStorage.setItem('ela_bookings', JSON.stringify(l));
});
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(200);
await op.locator('#navRegistre').click();
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
  const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]');
  l.push(JSON.parse(JSON.stringify(Object.assign({}, l[0], {
    ref: 'ASM-99-99-9999',
    course: Object.assign({}, l[0].course, { date: new Date().toISOString().slice(0, 10) })
  }))));
  localStorage.setItem('ela_bookings', JSON.stringify(l));
});
await op.reload({ waitUntil: 'domcontentloaded' });
await op.waitForTimeout(800);
await op.locator('#navRegistre').click();
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
  tele.suggestedFilename().startsWith('elatransfer-registre-')
  && tele.suggestedFilename().endsWith('.json'), tele.suggestedFilename());

/* ============ L'ÉCRITEAU DE SAUVEGARDE ============
   Le bouton ci-dessus existait déjà, au fond de cet onglet, et rien ne
   disait jamais de s'en servir : une protection qu'il faut penser à
   utiliser n'en est pas une. L'écriteau vit sur le tableau de bord et
   compte les courses qui n'existent nulle part ailleurs.
   Trois choses à vérifier, et la troisième compte autant que les autres :
   il doit aussi savoir SE TAIRE. */
await op.locator('.nav-item[data-target="screen-home"]').click();
await op.waitForTimeout(500);
const etatSauv = () => op.locator('#alerteSauvegarde').getAttribute('class');
check('sauvegarde : à jour, l\'écriteau ne réclame rien',
  (await etatSauv()).includes('sauv-ok'), await etatSauv());
// Cinq courses de plus : le fichier qu'on vient d'écrire ne les contient pas.
await op.evaluate(() => {
  const l = JSON.parse(localStorage.getItem('ela_bookings') || '[]');
  for (let i = 1; i <= 5; i++) l.push({ ref: 'ASM-30-01-900' + i, statut: 'attente',
    client: { nom: 'Témoin ' + i },
    course: { depart: 'Paris', arrivee: 'Orly', date: '2030-01-10', heure: '08:00' },
    prix: { total: 60 } });
  localStorage.setItem('ela_bookings', JSON.stringify(l));
  renderTableauDeBord();
});
await op.waitForTimeout(400);
check('sauvegarde : cinq courses de plus et il réclame',
  (await etatSauv()).includes('sauv-retard'), await etatSauv());
const texteSauv = (await op.locator('#alerteSauvegarde').textContent()).replace(/\s+/g, ' ');
check('sauvegarde : il dit combien de courses sont en jeu',
  /5 courses/.test(texteSauv), texteSauv.slice(0, 70));
check('sauvegarde : il dit où ranger le fichier',
  /iCloud|Drive/.test(texteSauv), texteSauv.slice(0, 120));
/* LE ROUGE EST RÉSERVÉ AUX DEMANDES NON TRANCHÉES. Un premier essai avait
   donné à cet écriteau le même rouge plein : à l'écran, on ne distinguait
   plus une sauvegarde en retard d'un client qui attend une réponse. */
check('sauvegarde : il ne prend pas le rouge des demandes en attente',
  await op.evaluate(() => {
    const f = getComputedStyle(document.getElementById('alerteSauvegarde')).backgroundColor;
    return !/rgba?\(\s*201/.test(f);
  }));
// Et il sauvegarde sans quitter le tableau de bord.
const [teleVite] = await Promise.all([
  op.waitForEvent('download', { timeout: 8000 }),
  op.locator('#btnSauvegardeVite').click()
]);
check('sauvegarde : le bouton de l\'écriteau produit le fichier',
  teleVite.suggestedFilename().startsWith('elatransfer-registre-'), teleVite.suggestedFilename());
await op.waitForTimeout(400);
check('sauvegarde : une fois faite, il se tait',
  (await etatSauv()).includes('sauv-ok'), await etatSauv());
await op.locator('.nav-item[data-target="screen-registre"]').click();
await op.waitForTimeout(500);
const [csv] = await Promise.all([
  op.waitForEvent('download', { timeout: 8000 }),
  op.locator('#btnExportCourses').click()
]);
check('admin : l\'export comptable produit un CSV',
  csv.suggestedFilename().endsWith('.csv'), csv.suggestedFilename());
check('admin : le CSV porte les colonnes utiles au comptable',
  (await op.evaluate(() => coursesCsv().split('\r\n')[0]))
    .includes('Commission'), await op.evaluate(() => coursesCsv().split('\r\n')[0]));

// Rien ne se perd : la même course se retrouve à la semaine, au mois et à
// l'année, et par une recherche libre.
await op.locator('#choixPeriode [data-periode="mois"]').click();
await op.waitForTimeout(300);
const parMois = await op.locator('#blocSemaines').textContent();
check('registre : le résultat se lit aussi par mois',
  /\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i.test(parMois),
  parMois.replace(/\s+/g, ' ').slice(0, 90));
await op.locator('#choixPeriode [data-periode="annee"]').click();
await op.waitForTimeout(300);
const parAn = await op.locator('#blocSemaines').textContent();
check('registre : et par année', /20\d\d/.test(parAn), parAn.replace(/\s+/g, ' ').slice(0, 90));
check('registre : les deux courses sont toutes deux comptées',
  parAn.includes('2030') && parAn.includes('2026'), parAn.replace(/\s+/g, ' ').slice(0, 120));

check('registre : rien ne s\'affiche tant qu\'on ne cherche rien',
  (await op.locator('#resultatsRecherche .ligne-demande').count()) === 0);
await op.fill('#rechercheCourse', 'Yusuf');
await op.waitForTimeout(400);
check('registre : chercher un chauffeur retrouve ses courses',
  (await op.locator('#resultatsRecherche .ligne-demande').count()) === 2,
  String(await op.locator('#resultatsRecherche .ligne-demande').count()));
await op.fill('#rechercheCourse', '2030-03');
await op.waitForTimeout(400);
check('registre : chercher un mois retrouve la course de ce mois',
  (await op.locator('#resultatsRecherche .ligne-demande').count()) === 1);
await op.fill('#rechercheCourse', 'zzzz');
await op.waitForTimeout(400);
check('registre : une recherche sans résultat le dit',
  await op.locator('#videRecherche').isVisible());
await op.fill('#rechercheCourse', '');
await op.waitForTimeout(300);

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
await client.waitForTimeout(900);
// Ce client a déjà réservé plus haut : le site le ramène sur sa demande
// plutôt que sur un formulaire vide. C'est voulu — on repart de zéro.
check('un client qui a déjà réservé retrouve sa demande',
  await client.locator('#screen-confirmation').isVisible());
if (await client.locator('#screen-confirmation').isVisible()) {
  await client.locator('#btnNewBooking').click();
  await client.waitForTimeout(500);
}
await client.type('#dropoff', 'cdg', { delay: 20 });
await client.locator('#dropoffList [role=option]').first().waitFor({ timeout: 5000 });
const terminaux = await client.locator('#dropoffList [role=option]').allTextContents();
check('taper « cdg » propose les terminaux', terminaux.length >= 9, terminaux.length + ' résultats');
const debuts = terminaux.map(x => x.replace(/\s+/g, ' ').trim().slice(0, 16));
check('chaque terminal se distingue dès le début de la ligne',
  new Set(debuts).size === terminaux.length, debuts.slice(0, 3).join(' | '));

/* ============ LE REGISTRE SURVIT AU CHANGEMENT DE NOM ============
   Le registre de l'exploitant ne vit que dans son navigateur. Le site a
   changé de nom, donc de clés de stockage : si la reprise ne marchait
   pas, il perdrait des mois de courses sans s'en rendre compte tout de
   suite. C'est le test le plus important du fichier. */
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(reprise): ' + e.message));

  // Un appareil qui n'a connu que l'ancien nom.
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    const vieille = (ref, total) => ({
      ref, statut: 'realisee', emisLe: '2026-07-15T09:00:00.000Z',
      course: { type: 'Trajet simple', depart: 'Terminal 2E', arrivee: 'Gare de Lyon',
                date: '2026-07-15', heure: '09:00', vehicule: 'Berline',
                passagers: '2 adultes', terminal: null, vol: '', duree: null },
      client: { nom: 'Client', telephone: '' },
      prix: { total, ht: total / 1.1, tva: total - total / 1.1, paiement: 'À bord' }
    });
    localStorage.setItem('asmine_bookings', JSON.stringify([
      vieille('ASM-26-07-0031', 88), vieille('ASM-26-07-0030', 62)
    ]));
    localStorage.setItem('asmine_langue', 'es');
    localStorage.setItem('asmine_course_ASM-26-07-0031', '{"etat":"terminee"}');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const repris = await page.evaluate(() => ({
    courses: JSON.parse(localStorage.getItem('ela_bookings') || '[]').length,
    langue: localStorage.getItem('ela_langue'),
    bon: localStorage.getItem('ela_course_ASM-26-07-0031'),
    ancienIntact: localStorage.getItem('asmine_bookings') !== null
  }));
  check('reprise : les courses de l\'ancien nom sont là', repris.courses === 2, repris.courses + '');
  check('reprise : la langue choisie est gardée', repris.langue === 'es', repris.langue);
  check('reprise : les bons de course suivent', !!repris.bon);
  check('reprise : l\'ancien registre n\'est pas effacé', repris.ancienIntact);

  // Une reprise ne doit JAMAIS écraser un travail plus récent.
  await page.evaluate(() => {
    const recente = { ref: 'ELA-26-08-0001', statut: 'confirmee',
      course: { type: 'Trajet simple', depart: 'Orly 4', arrivee: 'La Défense',
                date: '2026-08-30', heure: '18:00', vehicule: 'Berline', passagers: '2 adultes' },
      client: { nom: 'Client', telephone: '' },
      prix: { total: 60, ht: 54.5, tva: 5.5, paiement: 'À bord' } };
    localStorage.setItem('ela_bookings', JSON.stringify([recente]));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const apres = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ela_bookings') || '[]'));
  check('reprise : le registre récent n\'est pas écrasé',
    apres.length === 1 && apres[0].ref === 'ELA-26-08-0001', JSON.stringify(apres).slice(0, 60));

  // Et le rang du mois ne repart pas à 1 le jour du changement de nom.
  const suite = await page.evaluate(() => {
    localStorage.setItem('ela_bookings', JSON.stringify([
      { ref: 'ASM-' + referenceSuivante().slice(4, 10) + '0007' }
    ]));
    return referenceSuivante();
  });
  check('reprise : le rang continue après l\'ancien préfixe',
    suite.endsWith('0008') && suite.startsWith('ELA-'), suite);

  await ctx.close();
}

/* ============ LE CARNET DE CHAUFFEURS ============
   Avant, la liste des chauffeurs était une constante vide : il fallait
   retaper « Mehmet — 06 12… » à chaque course. Le carnet se remplit
   maintenant tout seul, au fil des attributions. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await preparer(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(carnet): ' + e.message));
  await ouvrirEspaceExploitant(page);
  await page.evaluate(() => { localStorage.removeItem('ela_chauffeurs'); });

  const poser = async (ref, nom) => {
    await page.evaluate(([r, n]) => enregistrerDemande(lireDemandeCollee(
      `DEMANDE DE RÉSERVATION — ${r}\n29/08/2026 09:00\nDépart : Terminal 2E\n`
      + `Arrivée : Gare de Lyon\n2 adultes · Berline · 98,00 €\n${n} — +33 6 11 22 33 44`)),
      [ref, nom]);
    await page.waitForTimeout(250);
  };
  await poser('ELA-26-08-0901', 'Premier Client');
  await poser('ELA-26-08-0902', 'Second Client');

  await page.locator('#listeDemandes .ligne-demande').first().click();
  await page.waitForTimeout(400);
  check('carnet : vide au premier usage',
    (await page.locator('#chauffeursRecents .puce-chauffeur').count()) === 0);

  await page.fill('#nomChauffeurRetenu', 'Mehmet A.');
  await page.fill('#telChauffeurRetenu', '+33 6 98 76 54 32');
  await page.locator('#telChauffeurRetenu').dispatchEvent('change');
  await page.waitForTimeout(300);
  check('carnet : le chauffeur s\'inscrit tout seul en attribuant',
    (await page.evaluate(() => chargerCarnet().length)) === 1);

  // Course suivante : il doit être proposé, et un appui doit suffire.
  await page.locator('.nav-item[data-target="screen-home"]').click();
  await page.waitForTimeout(400);
  await page.locator('#listeDemandes .ligne-demande').first().click();
  await page.waitForTimeout(400);
  check('carnet : il est proposé sur la course suivante',
    (await page.locator('#chauffeursRecents .puce-chauffeur').count()) === 1);
  await page.locator('#chauffeursRecents .puce-chauffeur').first().click();
  await page.waitForTimeout(300);
  check('carnet : un appui remplit le nom ET le téléphone',
    (await page.inputValue('#nomChauffeurRetenu')) === 'Mehmet A.'
    && (await page.inputValue('#telChauffeurRetenu')).includes('98 76 54 32'));

  // Le même chauffeur ne doit pas créer une deuxième fiche.
  await page.locator('#nomChauffeurRetenu').dispatchEvent('change');
  await page.waitForTimeout(300);
  check('carnet : pas de doublon pour le même chauffeur',
    (await page.evaluate(() => chargerCarnet().length)) === 1);

  await ctx.close();
}

/* ============ LA SERRURE, PAR LE VRAI CHEMIN ============
   Les autres tests déposent l'empreinte directement pour aller vite. Ici on
   passe par où passe l'exploitant : l'adresse de son espace, la saisie du
   code, et le va-et-vient avec le site public. C'est le seul endroit qui
   vérifie que le code lui-même fonctionne. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(serrure): ' + e.message));

  await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  check('serrure : un visiteur qui devine l\'adresse tombe sur le code',
    await page.locator('#deverrouillage').isVisible()
    && !(await page.locator('#tableauBord').isVisible()));

  await page.fill('#codeExploitant', 'PasLeBonCode');
  await page.locator('#btnDeverrouiller').click();
  await page.waitForTimeout(400);
  check('serrure : un mauvais code ne passe pas',
    await page.locator('#erreurCode').isVisible()
    && await page.locator('#deverrouillage').isVisible());

  await page.fill('#codeExploitant', 'Ela1234');
  await Promise.all([
    page.waitForURL(/exploitant=1/, { timeout: 15000 }),
    page.locator('#btnDeverrouiller').click()
  ]);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1400);
  check('serrure : le bon code ouvre l\'espace de travail',
    await page.locator('#tableauBord').isVisible()
    && await page.locator('#badgeExploitant').isVisible());

  // Il doit pouvoir aller voir son propre site public, et en revenir.
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.locator('#lienSitePublic').click()
  ]);
  await page.waitForTimeout(1100);
  check('serrure : il voit ce que voient ses clients',
    await page.locator('#accrocheClient').isVisible()
    && !(await page.locator('#tableauBord').isVisible()));

  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.locator('#retourExploitant').click()
  ]);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1400);
  check('serrure : il revient sans retaper le code',
    await page.locator('#tableauBord').isVisible()
    && !(await page.locator('#deverrouillage').isVisible()));

  // Un autre appareil ne sait rien du déverrouillage.
  const autre = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const ailleurs = await autre.newPage();
  await ailleurs.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await ailleurs.waitForTimeout(900);
  check('serrure : un autre téléphone redemande le code',
    await ailleurs.locator('#deverrouillage').isVisible());
  await autre.close();
  await ctx.close();
}

/* ============ LE CLIENT NE PERD PAS SA DEMANDE ============
   Ouvrir WhatsApp fait passer le navigateur en arrière-plan ; un téléphone
   chargé le décharge. En revenant, le client retombait sur un formulaire
   vide et croyait avoir tout perdu — sa référence comprise. Et s'il n'a
   pas WhatsApp, il lui faut un autre chemin. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await preparer(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(retour): ' + e.message));
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.locator('#cookieAccept').click().catch(() => {});
  const reference = await reserver(page, 'Mme Retour');

  const msg = decodeURIComponent(
    (await page.evaluate(() => window.__ouvert[0] || '')).replace(/^[^?]*\?text=/, ''));
  // Une information par ligne, chacune annoncée : on lit en diagonale.
  check('la demande se lit ligne par ligne',
    msg.split('\n').filter(l => /\s:\s/.test(l)).length >= 5,
    msg.split('\n').filter(l => /\s:\s/.test(l)).length + ' lignes étiquetées');
  check('la demande porte le prix, la date et le véhicule',
    /€/.test(msg) && /\d{2}\/\d{2}\/\d{4}/.test(msg), msg.split('\n')[0]);

  // Sans WhatsApp : deux autres chemins, visibles, pas cachés dans un repli.
  check('un envoi par SMS est proposé',
    (await page.locator('#btnSmsSummary').isVisible())
    && (await page.locator('#btnSmsSummary').getAttribute('href')).startsWith('sms:'));
  check('un envoi par e-mail est proposé',
    (await page.locator('#btnEmailSummary').isVisible())
    && (await page.locator('#btnEmailSummary').getAttribute('href')).startsWith('mailto:'));

  // Le retour sur le site : on retrouve sa demande, pas un formulaire vide.
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('en revenant, le client retrouve sa demande',
    await page.locator('#screen-confirmation').isVisible()
    && (await page.locator('#confRef').textContent()).trim() === reference);

  // « Nouvelle réservation » repart de zéro, et n'y ramène plus.
  // La bannière cookies revient après le rechargement : elle recouvre le bas
  // de l'écran, donc le bouton.
  await page.locator('#cookieAccept').click().catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('#btnNewBooking').click();
  await page.waitForTimeout(400);
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  check('après « nouvelle réservation », on repart du formulaire',
    await page.locator('#accrocheClient').isVisible()
    && !(await page.locator('#screen-confirmation').isVisible()));

  await ctx.close();
}

/* ============ LA CONFIRMATION SE COMPREND SANS RIEN OUVRIR ============
   Le message disait « c'est confirmé » et renvoyait à un lien. Le client
   qui ne cliquait pas — et beaucoup ne cliquent pas — gardait un bon
   orange « en attente » alors que son chauffeur était trouvé. Il
   rappelait à 5 h du matin. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  await preparer(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(confirm): ' + e.message));
  await ouvrirEspaceExploitant(page);
  await page.evaluate(() => { localStorage.removeItem('ela_bookings'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);

  await page.evaluate(() => enregistrerDemande(lireDemandeCollee(
    `DEMANDE DE RÉSERVATION — ELA-26-08-0777\n\n`
    + `Départ : Hôtel Ibis, 12 rue Traversière, 75012 Paris (Ch. 412)\n`
    + `Arrivée : Terminal 2E — Aéroport Roissy-Charles de Gaulle\n`
    + `Date : 30/08/2026 07:15\nPassagers & bagages : 2 adultes\n`
    + `Véhicule : Berline\nPrix total TTC : 98,00 €\n\n`
    + `M. Nakamura — +33 7 55 21 09 44`)));
  await page.waitForTimeout(400);
  await page.locator('#listeDemandes .ligne-demande').first().click();
  await page.waitForTimeout(400);
  await page.fill('#nomChauffeurRetenu', 'Mehmet A.');
  await page.fill('#telChauffeurRetenu', '+33 6 98 76 54 32');
  await page.locator('#telChauffeurRetenu').dispatchEvent('change');
  await page.waitForTimeout(300);
  await page.locator('#btnConfirmRide').click();
  await page.waitForTimeout(500);

  const texte = decodeURIComponent(
    (await page.locator('#btnPrevenirClient').getAttribute('href')).replace(/^[^?]*\?text=/, ''));
  check('la confirmation porte le chauffeur et son numéro',
    texte.includes('Mehmet A.') && texte.includes('98 76 54 32'));
  check('la confirmation porte l\'heure, le lieu et le prix',
    /\d{2}\/\d{2}\/\d{4}/.test(texte) && texte.includes('Ibis') && texte.includes('98,00'),
    texte.split('\n').slice(0, 4).join(' | '));
  check('le lien ne sert plus qu\'à mettre l\'écran à jour',
    texte.indexOf('http') > texte.indexOf('Mehmet A.'));

  // Une course confirmée dont le client n'a pas été prévenu est un piège :
  // l'exploitant la croit réglée, le client croit sa demande en suspens.
  await page.locator('.nav-item[data-target="screen-home"]').click();
  await page.waitForTimeout(500);
  check('le tableau de bord signale un client pas encore prévenu',
    (await page.locator('#listeDemandes').textContent()).includes('pas encore prévenu'));
  // Et la course confirmée ne disparaît pas de l'écran : filtrer par défaut
  // sur « attente » la faisait s'évaporer au moment de la confirmer.
  check('la course reste visible après confirmation',
    (await page.locator('#listeDemandes').textContent()).includes('ELA-26-08-0777'));

  await page.locator('#listeDemandes .ligne-demande').first().click();
  await page.waitForTimeout(300);
  await page.locator('#btnPrevenirClient').click();
  await page.waitForTimeout(800);
  check('la date d\'envoi de la confirmation est retenue',
    await page.evaluate(() => {
      const c = loadBookings().find(b => b.ref === 'ELA-26-08-0777');
      return !!(c && c.course && c.course.prevenuLe);
    }));
  await page.locator('.nav-item[data-target="screen-home"]').click();
  await page.waitForTimeout(500);
  check('l\'alerte disparaît une fois le client prévenu',
    !(await page.locator('#listeDemandes').textContent()).includes('pas encore prévenu'));

  await ctx.close();
}

/* L'invitation à installer l'application était proposée aux clients et
   cachée à l'exploitant : exactement l'inverse de l'utile. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  check('client : aucune invitation à installer l\'application',
    await page.evaluate(() =>
      getComputedStyle(document.getElementById('installBtn')).display === 'none'));
  await ctx.close();
}

/* ============ LE CODE QR PORTE TOUJOURS LE DOMAINE ============
   Un code QR se colle sur une carte de visite ou un comptoir d'hôtel : il
   doit porter l'adresse définitive, pas celle par laquelle on est arrivé
   ce jour-là. Le site répond aussi sur github.io — un vieux favori, un
   lien reçu il y a trois mois — et on imprimait deux cents cartes vers
   l'ancienne adresse sans le voir. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(qr): ' + e.message));
  // Le code QR est un outil de l'exploitant : c'est lui qui imprime l'affiche.
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const empreinteQr = await page.evaluate(() => CODE_EXPLOITANT);
  await page.evaluate((e) => localStorage.setItem('ela_exploitant', e), empreinteQr);
  // On ouvre depuis une adresse quelconque, avec un paramètre parasite.
  await page.goto(BASE + '/index.html?exploitant=1&ok=nimportequoi', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  await page.locator('#cookieAccept').click().catch(() => {});
  await page.locator('.nav-item[data-target="screen-qr"]').click().catch(() => {});
  await page.waitForTimeout(500);

  const affiche = (await page.locator('#qrUrlText').textContent()).trim();
  const encode = decodeURIComponent(
    ((await page.locator('#qrImg').getAttribute('src')) || '').split('data=')[1] || '');
  check('le code QR porte le domaine, pas l\'adresse d\'origine',
    affiche === 'https://elatransfer.com/' && encode === 'https://elatransfer.com/',
    affiche);
  check('le code QR n\'emporte aucun paramètre d\'adresse',
    !encode.includes('?'), encode);
  await ctx.close();
}

await browser.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS JS ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length || errors.length ? 1 : 0);
