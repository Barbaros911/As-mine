import { chromium } from 'playwright';
import { couperLeReseau } from './test-hors-ligne.mjs';

const BASE = 'http://127.0.0.1:8099';
const errors = [];
const browser = await chromium.launch();
// Les serveurs extérieurs échouent tout de suite au lieu de faire
// attendre le navigateur : voir test-hors-ligne.mjs.
couperLeReseau(browser);
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });

page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

const ok = [];
const ko = [];
function check(name, cond, detail = '') {
  (cond ? ok : ko).push(name + (detail ? ' — ' + detail : ''));
}

await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

// 1. L'application démarre
check('page chargée', await page.locator('#screen-home').isVisible());

// 2. Traductions : passage en turc, aucune chaîne française ne doit rester
await page.selectOption('#langSelect', 'es');
await page.waitForTimeout(300);
check('langue ES appliquée', (await page.locator('h1').textContent()).includes('chófer'));
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(200);
const qrTxt = await page.locator('#screen-qr').textContent();
check('écran QR traduit en ES (pas de repli FR)',
  qrTxt.includes('Información legal') && !qrTxt.includes('Informations légales'),
  qrTxt.slice(0, 60));

// 3. Note de langue sur les documents juridiques
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(200);
check('note « documents en FR/EN » affichée en ES', await page.locator('#legalLangNote').isVisible());

await page.selectOption('#langSelect', 'fr');
await page.waitForTimeout(300);

// 4. Zoom autorisé
const vp = await page.locator('meta[name=viewport]').getAttribute('content');
check('zoom non bloqué', !vp.includes('maximum-scale'), vp);

// 5. Adresse tapée mais non choisie → message explicite
await page.locator('.nav-item[data-target="screen-home"]').click();
await page.waitForTimeout(200);
await page.fill('#pickup', 'quelque chose');
await page.fill('#dropoff', 'autre chose');
await page.locator('#btnSearch').click();
await page.waitForTimeout(400);
const err = await page.locator('#formError').textContent();
check('adresse non validée refusée', err.includes('liste'), err);

// 6. Autocomplétion + navigation clavier
await page.fill('#pickup', '');
await page.type('#pickup', 'Argenteuil', { delay: 30 });
await page.waitForTimeout(1800);
const nbSug = await page.locator('#pickupList [role=option]').count();
check('suggestions affichées', nbSug > 0, nbSug + ' résultats');
if (nbSug > 0) {
  await page.locator('#pickup').press('ArrowDown');
  await page.waitForTimeout(150);
  const sel = await page.locator('#pickupList [role=option][aria-selected=true]').count();
  check('navigation clavier (flèche bas)', sel === 1);
  await page.locator('#pickup').press('Enter');
  await page.waitForTimeout(200);
  check('sélection au clavier remplit le champ', (await page.inputValue('#pickup')).length > 3);
}

// 7. Modifier le texte après sélection invalide les coordonnées mémorisées
if (nbSug > 0) {
  await page.locator('#pickup').press('End');
  await page.type('#pickup', 'xyz', { delay: 20 });
  await page.waitForTimeout(300);
  // Le bouton s'efface tant que la liste d'adresses est ouverte : sur un
  // téléphone elle passe par-dessus lui, et on appuierait sur une rue en
  // visant « Voir les tarifs ». On referme donc, comme le ferait le client.
  check('le bouton s\'efface sous une liste ouverte',
    !(await page.locator('#btnSearch').isVisible()));
  await page.locator('#pickup').press('Escape');
  await page.waitForTimeout(200);
  check('il revient dès que la liste se ferme', await page.locator('#btnSearch').isVisible());
  await page.locator('#btnSearch').click();
  await page.waitForTimeout(400);
  const e2 = await page.locator('#formError').textContent();
  check('coordonnées invalidées après édition du champ', e2.includes('liste'), e2);
}

/* ============ LE SITE N'EST PLUS UNE NAVETTE D'AÉROPORT ============
   L'enseigne annonçait « Paris · Roissy CDG · Orly » sur CHAQUE écran : deux
   aéroports sur trois mots. Un client qui cherche un chauffeur pour une
   soirée y lisait « navette » et repartait. Les aéroports restent des
   adresses proposées à la saisie ; ils ont quitté la marque. */
check('l\'enseigne annonce la zone, pas deux aéroports',
  (await page.locator('.marque-villes').textContent()).includes('Île-de-France')
  && !/Roissy|Orly/.test(await page.locator('.marque-villes').textContent()),
  await page.locator('.marque-villes').textContent());
/* Le bouton disait « Voir les tarifs » : une grille ? un devis ? un paiement ?
   « Voir mon prix » dit ce que le clic donne, et à qui il appartient. */
check('le bouton annonce le prix du client',
  (await page.locator('#btnSearch').textContent()).includes('mon prix'));
/* L'emplacement de réassurance le plus lu de la page. Il portait l'attente
   aéroport — vraie pour un client sur trois, muette pour les autres. */
check('la promesse sous le bouton vaut pour tout le monde',
  /prix ferme/i.test(await page.locator('#noteReassurance').textContent()));
check('le nombre d\'étapes est annoncé',
  (await page.locator('[data-i18n="tunnel_etapes"]').textContent()).includes('3'));
// Le formulaire entier doit rester dans le premier écran d'un téléphone :
// c'est la seule chose que le site fait déjà très bien, rien ne doit la casser.
const posBtn = await page.evaluate(() => {
  const r = document.getElementById('btnSearch').getBoundingClientRect();
  return { bas: Math.round(r.bottom), ecran: window.innerHeight };
});
check('« Voir mon prix » tient dans le premier écran (390 × 844)',
  posBtn.bas <= posBtn.ecran, posBtn.bas + 'px sur ' + posBtn.ecran);

/* ============ LA ZONE DESSERVIE ============
   Avant cette règle, Lille → Marseille passait sans un mot : 1 084 km,
   1 902,91 € annoncés en Ela One, réservation acceptée. Et le prix est
   FERME — il aurait fallu assurer la course à perte, ou se dédire sur un
   prix annoncé, ce qui est une pratique commerciale trompeuse. */
async function poserAdresse(champ, texte) {
  await page.fill(champ, '');
  await page.type(champ, texte, { delay: 20 });
  await page.waitForTimeout(1400);
  const liste = '#' + champ.slice(1) + 'List';
  if ((await page.locator(liste + ' [role=option]').count()) === 0) return false;
  await page.locator(liste + ' [role=option]').first().click();
  await page.waitForTimeout(300);
  return true;
}
await poserAdresse('#pickup', 'Argenteuil');
await poserAdresse('#dropoff', 'Versailles');
check('une course en Île-de-France passe',
  !(await page.locator('#horsZone').isVisible())
  && !(await page.locator('#btnSearch').isDisabled()));
await poserAdresse('#pickup', 'Lille');
await poserAdresse('#dropoff', 'Marseille');
check('Lille → Marseille est refusé', await page.locator('#horsZone').isVisible());
check('et le bouton ne peut plus être appuyé', await page.locator('#btnSearch').isDisabled());
check('l\'adresse fautive est nommée',
  (await page.locator('#horsZoneLieu').textContent()).toLowerCase().includes('lille'));
// On ne renvoie pas le client sans rien : un Paris → Deauville est une
// belle course, elle se négocie de vive voix.
check('un moyen de nous joindre est proposé',
  (await page.locator('#horsZone a.lien-tel').count()) === 1
  && (await page.locator('#horsZone a.lien-whatsapp').count()) === 1);
// L'écriteau doit être AU-DESSUS des champs : posé sous le bouton, il
// tombait derrière le bandeau de cookies et le client voyait un bouton
// gris sans la moindre raison.
const placeZone = await page.evaluate(() => ({
  ecriteau: document.getElementById('horsZone').getBoundingClientRect().top,
  champ: document.getElementById('pickup').getBoundingClientRect().top
}));
check('l\'écriteau se lit avant les champs qu\'il concerne',
  placeZone.ecriteau < placeZone.champ);
/* Beauvais-Tillé est dans l'Oise, PAS en Île-de-France — et c'est pourtant
   l'un des trois aéroports que le site propose lui-même. Une règle
   strictement départementale l'aurait refusé. */
await poserAdresse('#pickup', 'Argenteuil');
await poserAdresse('#dropoff', 'beauvais');
check('Beauvais-Tillé reste desservi malgré l\'Oise',
  !(await page.locator('#horsZone').isVisible()));
await poserAdresse('#dropoff', 'Versailles');

/* ============ REVENIR EN ARRIÈRE, DEPUIS N'IMPORTE OÙ ============
   Le bouton portait une destination FIXE écrite dans le HTML : ça ment dès
   qu'un écran a deux portes d'entrée — le bon de réservation s'ouvre depuis
   la confirmation ET depuis « Mes réservations », et ramenait toujours à la
   confirmation. On empile désormais l'écran quitté, et le retour dépile. */
const ecranActif = () => page.evaluate(() => document.querySelector('.screen.active').id);
const revenir = async () => {
  await page.locator('.screen.active .btn-back').click();
  await page.waitForTimeout(350);
};
const sansRetour = await page.evaluate(() => [...document.querySelectorAll('.screen')]
  .filter(s => s.id !== 'screen-home' && !s.querySelector('.btn-back'))
  .map(s => s.id));
check('chaque écran a un bouton retour, sauf l\'accueil',
  sansRetour.length === 0, sansRetour.join(', '));
// Un vrai chemin : accueil → Infos → CGV, puis retour deux fois.
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(300);
await page.locator('.btn-legal[data-doc="cgv"]').click();
await page.waitForTimeout(300);
check('les CGV s\'ouvrent depuis Infos', (await ecranActif()) === 'screen-legal');
await revenir();
check('le retour ramène à Infos, d\'où l\'on venait', (await ecranActif()) === 'screen-qr');
await revenir();
check('un second retour ramène à l\'accueil', (await ecranActif()) === 'screen-home');
/* Le rayon d'offres a été retiré (septembre 2026) : le chemin qui avait
   motivé cette pile — la fiche d'une offre, qui ramenait toujours au même
   écran — n'existe plus. La règle, elle, reste éprouvée ci-dessus (Infos →
   CGV → retour → retour) et par le contrôle « chaque écran a un bouton
   retour » qui couvre d'office tout écran ajouté plus tard. */
// Le bouton doit se voir : c'était un texte gris de 16 px, introuvable.
await page.locator('.nav-item[data-target="screen-qr"]').click();
await page.waitForTimeout(300);
const tailleRetour = await page.evaluate(() => {
  const r = document.querySelector('.screen.active .btn-back').getBoundingClientRect();
  return { h: Math.round(r.height), w: Math.round(r.width) };
});
check('le bouton retour fait au moins 44 px de haut',
  tailleRetour.h >= 44, tailleRetour.h + '×' + tailleRetour.w);
await revenir();

// 8. Plus de forfait aéroport : les terminaux restent des adresses comme les autres
check('écran des forfaits aéroport supprimé', (await page.locator('#screen-airports').count()) === 0);
check('onglet « Aéroports » retiré de la navigation',
  (await page.locator('.nav-item[data-target="screen-airports"]').count()) === 0);
await page.fill('#pickup', '');
await page.fill('#dropoff', '');
await page.type('#dropoff', 'cdg', { delay: 20 });
await page.waitForTimeout(1500);
const termCount = await page.locator('#dropoffList [role=option]').count();
check('terminaux CDG proposés comme adresses', termCount === 9, termCount + ' option(s)');
const premierTerm = await page.locator('#dropoffList [role=option]').first().textContent();
check('libellé de terminal complet', premierTerm.includes('Roissy') && premierTerm.includes('Terminal'), premierTerm.trim());

// 9. Le numéro de vol n'apparaît qu'avec un terminal
check('champ numéro de vol masqué par défaut', !(await page.locator('#flightWrap').isVisible()));
await page.locator('#dropoffList [role=option]').first().click();
await page.waitForTimeout(300);
check('champ numéro de vol affiché après le choix d\'un terminal',
  await page.locator('#flightWrap').isVisible());

// 10. Plus aucun code promo dans le site — ni le champ, ni les empreintes.
//     Ils annulaient la hausse de tarifs : un client qui avait reçu VIP15 une
//     fois payait l'ancien prix à vie, sans date de fin ni compteur d'usage.
const src = await page.content();
check('plus aucun code promo dans la page',
  !src.includes('BIENVENUE10') && !src.includes('VIP15')
  && !src.includes('promoPayment') && !src.includes('Code promo'));

// 11. Manifeste et service worker accessibles
const mres = await page.request.get(BASE + '/manifest.webmanifest');
check('manifest.webmanifest servi', mres.ok());
const sres = await page.request.get(BASE + '/sw.js');
check('sw.js servi', sres.ok());

// 12. Pas de débordement horizontal sur mobile, dans les deux sens de lecture.
// L'arabe se lit de droite à gauche : un élément caché hors écran à gauche
// (le champ anti-robot) y créait plus de 10 000 px de défilement.
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('pas de débordement horizontal (390px, FR)', !overflow);

await page.selectOption('#langSelect', 'ar');
await page.waitForTimeout(400);
const oRtl = await page.evaluate(() => ({
  doc: document.documentElement.scrollWidth, win: window.innerWidth, dir: document.documentElement.dir
}));
check('pas de débordement horizontal (390px, AR droite-à-gauche)',
  oRtl.dir === 'rtl' && oRtl.doc <= oRtl.win + 1, oRtl.doc + 'px pour ' + oRtl.win + 'px');

/* ============ LE SITE S'OUVRE DANS LA LANGUE DU VISITEUR ============
   Un client espagnol qui tombe sur du français ne cherche pas le sélecteur :
   il retourne à sa liste de résultats. On éprouve donc la détection sur de
   vraies étiquettes de navigateur, variantes régionales comprises, et le
   repli en français pour une langue qu'on ne parle pas. */
// Une langue qu'on ne parle pas retombe sur l'ANGLAIS, et non le français :
// un Allemand ou un Japonais qui arrive ici lit bien plus probablement
// l'anglais. Le français reste servi à qui le demande.
for (const [locale, attendu] of [['es-ES', 'es'], ['es-MX', 'es'], ['en-GB', 'en'],
                                 ['pt-BR', 'pt'], ['ar-SA', 'ar'], ['zh-CN', 'zh'],
                                 ['fr-CA', 'fr'], ['de-DE', 'en'], ['ja-JP', 'en'],
                                 ['it-IT', 'en'], ['ru-RU', 'en']]) {
  const ctx = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  const vu = await p.evaluate(() => ({
    sel: document.getElementById('langSelect').value, doc: document.documentElement.lang
  }));
  check(`un navigateur en ${locale} ouvre le site en ${attendu}`,
    vu.sel === attendu && vu.doc === attendu, vu.sel + ' / ' + vu.doc);
  // Le bloc de référencement n'est plus masqué selon la langue : il est
  // traduit. Le masquer revenait à le retirer de l'index dès que
  // l'explorateur de Google arrivait en anglais — ce qu'il fait.
  const seoVu = await p.evaluate(() => {
    const s = document.getElementById('seoContent');
    return { visible: !s.classList.contains('hidden'), titre: s.querySelector('h2').textContent.trim() };
  });
  check(`le texte de référencement reste lisible en ${attendu}`,
    seoVu.visible && seoVu.titre.length > 10, seoVu.titre.slice(0, 40));
  await ctx.close();
}
{
  /* ============ L'ACCUEIL NE TÉLÉCHARGE PLUS AUCUNE PHOTO ============
     Le rayon d'offres portait treize vignettes — 1,8 Mo qui partaient avant
     même l'affichage du formulaire, en 4G. Un observateur les retenait
     jusqu'à l'approche ; depuis le retrait des offres il n'y a plus rien à
     retenir. Ce contrôle garde la garantie sous sa forme la plus forte :
     on descend toute la page, et rien du dossier photos ne part. */
  const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const vues = [];
  p.on('response', r => { if (r.url().includes('/photos/')) vues.push(r.url()); });
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1800);
  check('aucune photo chargée à l\'ouverture', vues.length === 0, vues.join(', '));
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await p.waitForTimeout(1500);
  check('aucune photo chargée même en bas de page', vues.length === 0, vues.join(', '));
  await ctx.close();
}
{
  // Le choix explicite du visiteur passe AVANT sa langue système : un
  // Espagnol qui met le site en anglais a ses raisons, on ne le corrige pas.
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  check('sans choix du visiteur, rien n\'est écrit sur son appareil',
    (await p.evaluate(() => localStorage.getItem('ela_langue'))) === null);
  await p.selectOption('#langSelect', 'en');
  await p.waitForTimeout(300);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  check('son choix explicite l\'emporte sur la langue du téléphone',
    (await p.evaluate(() => document.getElementById('langSelect').value)) === 'en');
  await ctx.close();
}

await browser.close();

console.log('\n=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  �’ ' + t)); }
if (errors.length) { console.log('\n=== ERREURS CONSOLE ==='); [...new Set(errors)].forEach(e => console.log('  ! ' + e)); }
process.exit(ko.length ? 1 : 0);
