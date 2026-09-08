/* =====================================================================
   TEST-NOUVEAU-COURSES.MJS — « Mes courses », le contact, les onglets
   ---------------------------------------------------------------------
   Ce que la suite verrouille :

   — UN ONGLET MÈNE QUELQUE PART. Un onglet qui ne fait rien est pire
     qu'un onglet en moins : le client appuie, rien ne bouge, et il en
     conclut que le site est cassé.
   — UN SEUL ONGLET ALLUMÉ À LA FOIS. « Accueil » et « Réserver » ouvrent
     tous deux la page d'accueil, puisque le formulaire y est : sans une
     identité propre à chaque onglet, les deux s'allumeraient ensemble.
   — LA COURSE SURVIT AU RECHARGEMENT. Elle vit dans le navigateur, et
     nulle part ailleurs : c'est tout ce que le site peut promettre sans
     compte client.
   — L'ÉTAT VIENT DU SERVEUR. « Mes réservations » n'affichait que ce qui
     dormait dans le téléphone : une course confirmée à 4 h du matin y
     restait « EN ATTENTE » des jours plus tard — une information FAUSSE.
     La fonction « etat-course » la remet à jour, et une course réalisée
     CHANGE DE LISTE.
   — UN APPEL QUI ÉCHOUE NE FAIT PAS RECULER UN ÉTAT. C'est le contrôle qui
     compte le plus : il ne se voit pas à l'œil, et il coûterait un client
     qui croit sa voiture annulée.
   — LA LISTE SE TRADUIT, prix compris.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-courses.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
/* OpenRouteService passe AVANT OSRM depuis qu'une clé est posée dans la
   page. Sans ce refus, la suite dépendrait du fait qu'il soit injoignable
   d'ici — et sur une machine reliée à Internet elle interrogerait le vrai
   service, avec une vraie distance, et les prix vérifiés plus bas ne
   tomberaient plus juste. On le coupe donc explicitement. */
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await ctx.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);

/* --- LES ONGLETS REMPLISSENT LA BARRE, QUEL QUE SOIT LEUR NOMBRE.
   La barre était figée sur QUATRE colonnes — le compte de l'époque où
   « Réserver » existait. Depuis son retrait, les trois onglets gardaient
   chacun un quart de la largeur et se tassaient à gauche : 0 à 293 px sur
   390, et 97 px de vide à droite. Personne ne l'avait vu pendant des
   semaines, parce qu'un vide n'attire pas l'œil — c'est ce qui n'y est
   pas. Barbaros l'a vu, lui.
   Ce contrôle ne compte donc PAS les onglets : il vérifie qu'ils
   remplissent la barre. Il tiendra le jour où il y en aura deux ou
   quatre. --------------------------------------------------------- */
const barre = await p.evaluate(() => {
  const o = [...document.querySelectorAll('.onglet')].map(e => e.getBoundingClientRect());
  const b = document.querySelector('.barre-int').getBoundingClientRect();
  return { premier:Math.round(o[0].left), dernier:Math.round(o[o.length-1].right),
           gauche:Math.round(b.left), droite:Math.round(b.right),
           largeurs:o.map(r => Math.round(r.width)) };
});
check('les onglets remplissent la barre, sans vide au bout',
  Math.abs(barre.premier - barre.gauche) <= 1 && Math.abs(barre.dernier - barre.droite) <= 1,
  barre.premier+'→'+barre.dernier+' pour une barre de '+barre.gauche+'→'+barre.droite);
check('et ils ont tous la même largeur',
  new Set(barre.largeurs).size === 1, barre.largeurs.join(' / '));

// --- Un onglet doit MENER quelque part ---
await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(300);
check('l\'onglet « Réservations » ouvre un écran', await p.locator('#ecran-courses').isVisible());
check('sans réservation, on le dit et on propose d\'en faire une',
  await p.locator('#videCourses').isVisible());
check('l\'onglet allumé suit l\'écran',
  (await p.locator('.onglet.actif [data-t="nav_courses"]').count())===1);

await p.locator('.onglet[data-onglet="trajets"]').click();
await p.waitForTimeout(300);
check('l\'onglet « Trajets » ouvre son propre écran',
  await p.locator('#ecran-trajets').isVisible());
check('sans trajet fait, on le dit', await p.locator('#videTrajets').isVisible());

/* ═══ LE QUATRIÈME ONGLET N'OUVRE PAS UN ÉCRAN, ET C'EST VOULU ═══
   Il ouvre un CHOIX (septembre 2026, à sa demande) : « il doit avoir des
   choix, il ne doit pas y avoir un message pré-empli ». Il ne porte donc
   plus de « href » — il ne mène plus directement chez WhatsApp — et
   toujours aucun « data-ecran » : un onglet qui prétendrait mener quelque
   part sans y mener est exactement ce qu'on a retiré avec « Réserver ».
   ON ÉPROUVE CE QU'IL FAIT, pas ce qu'il porte : le client appuie, et une
   feuille de choix doit s'ouvrir. */
const ongletWa = p.locator('.onglet[data-onglet="whatsapp"]');
check('l\'onglet WhatsApp n\'ouvre pas un écran',
  (await ongletWa.getAttribute('data-ecran')) === null);
check('et il ne part plus droit sur un message tout écrit',
  (await ongletWa.getAttribute('href')) === null);
await ongletWa.click(); await p.waitForTimeout(250);
check('il ouvre une feuille de choix', await p.locator('#feuilleWa').isVisible());
const choixWa = await p.locator('.feuille-choix').count();
check('avec plusieurs portes, pas une seule', choixWa >= 3, choixWa + ' choix');
await p.locator('.feuille-annuler').click(); await p.waitForTimeout(200);
check('et « Annuler » la referme', await p.locator('#feuilleWa').isHidden());

/* ═══ LES DOCUMENTS LÉGAUX ONT SURVÉCU AU RETRAIT DE « CONTACT » ═══
   Ils vivaient derrière cet onglet. La LCEN exige qu'ils restent
   accessibles sans compte — pas qu'ils aient un onglet. Ce contrôle
   éprouve le CHEMIN RÉEL depuis l'accueil, pas la présence de l'écran :
   un écran qu'aucun lien n'ouvre n'est pas accessible. */
await p.locator('.onglet[data-onglet="accueil"]').click();
await p.waitForTimeout(200);
await p.locator('.pied-lien').click();
await p.waitForTimeout(300);
check('le pied de l\'accueil mène aux informations légales',
  await p.locator('#ecran-contact').isVisible());
check('les trois documents y sont',
  (await p.locator('.legal-lien').count())===3,
  String(await p.locator('.legal-lien').count()));
const tel = await p.locator('.pied-tel').getAttribute('href');
check('et le numéro est appelable depuis l\'accueil', tel==='tel:+33759312433', tel);

// --- Une réservation, puis on la retrouve ---
await p.locator('.onglet[data-onglet="accueil"]').click();
await p.type('#depart','vendome',{delay:12}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
// La barre du bas doit toujours dire où l'on se trouve, y compris sur un
// écran où l'on est arrivé par un bouton et non par elle.
check('un seul onglet allumé à la fois',
  (await p.locator('.onglet.actif').count())===1,
  String(await p.locator('.onglet.actif').count()));
/* « Réserver » a été retiré : il ouvrait le même écran qu'« Accueil ».
   Le tunnel se rattache donc à « Accueil », d'où l'on part. Sans ce
   rattachement, plus aucun onglet ne s'allumerait pendant la réservation. */
check('pendant le tunnel, c\'est « Accueil » qui reste allumé',
  (await p.locator('.onglet.actif').getAttribute('data-onglet'))==='accueil',
  await p.locator('.onglet.actif').getAttribute('data-onglet'));
// Deux onglets qui ouvrent le même écran, c'est un client qui appuie sur le
// second, ne voit rien bouger, et en conclut que le site est cassé.
/* On ne compte QUE les onglets qui ouvrent un écran : depuis que WhatsApp
   est le quatrième, tous n'en ouvrent pas. Deux onglets sur le même écran
   resteraient un client qui appuie sur le second, ne voit rien bouger, et
   en conclut que le site est cassé. */
const cibles = (await p.$$eval('.onglet', a=>a.map(x=>x.dataset.ecran || '')))
  .filter(Boolean);
check('chaque onglet qui ouvre un écran en ouvre un DIFFÉRENT',
  new Set(cibles).size===cibles.length, cibles.join(', '));
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
await p.locator('[data-paiement="especes"]').click();
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(500);

await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(400);
check('la course réservée apparaît dans la liste',
  (await p.locator('.course').count())===1, String(await p.locator('.course').count()));
check('l\'écriteau « aucune course » a disparu', await p.locator('#videCourses').isHidden());
const ref = await p.locator('.course-ref').textContent();
check('elle porte sa référence', /^ELA-\d{2}-\d{2}-\d{4}$/.test(ref), ref);
/* 24,3 km × 2,35 € = 57,11 → le reste 7,11 dépasse 5, on MONTE à 60. */
check('et son prix', (await p.locator('.course-prix').textContent()).replace(/\s/g,'')==='60,00€',
  await p.locator('.course-prix').textContent());
check('elle est « en attente » — le site ne sait pas si elle est confirmée',
  (await p.locator('.course-etat').textContent()).toLowerCase().includes('attente')
  && !(await p.locator('.course-etat').textContent()).includes('confirmation'),
  await p.locator('.course-etat').textContent());

// --- Elle rouvre son bon ---
await p.locator('.course').first().click();
await p.waitForTimeout(300);
check('appuyer sur une course rouvre son bon', await p.locator('#ecran-bon').isVisible());
check('c\'est bien le bon de cette course-là',
  (await p.locator('#bonRef').textContent())===ref);

// --- Elle survit au rechargement ---
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(300);
check('la course survit au rechargement de la page',
  (await p.locator('.course').count())===1);

// --- Et elle se traduit ---
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(300);
check('la liste se réécrit en anglais',
  (await p.locator('.course-etat').textContent())==='Awaiting',
  await p.locator('.course-etat').textContent());
check('et son prix repasse au format anglais',
  (await p.locator('.course-prix').textContent()).replace(/\s/g,'')==='60.00€',
  await p.locator('.course-prix').textContent());


/* ═══════════════════════════════════════════════════════════════════════
   LA RÉPONSE D'ELATRANSFER ARRIVE SUR LE SITE
   -----------------------------------------------------------------------
   Barbaros : « il faut que je puisse répondre aussi via le site ». Avant,
   « Mes réservations » n'affichait que ce qui dormait dans le téléphone,
   figé à l'instant de la réservation : une course confirmée à 4 h du matin
   restait « EN ATTENTE » des jours plus tard. Ce n'était pas une
   information manquante, c'était une information FAUSSE.

   ON ÉPROUVE CE QUE LE CLIENT VOIT, pas la mécanique : la pastille change,
   et la course CHANGE DE LISTE quand elle est réalisée. Un contrôle qui
   dirait seulement « la fonction a été appelée » ne prouverait rien.
   ═══════════════════════════════════════════════════════════════════════ */
await p.locator('.langues button[data-langue="fr"]').click();
await p.waitForTimeout(300);

let vus = [];
let reponse = { statut:'confirmee', chauffeur:{nom:'Mehmet', telephone:'0612345678'},
                vehicule:'Berline', date:'2026-09-11', heure:'10:00' };
let coupee = false;
/* ═══ LE FAUX SERVEUR DOIT RÉPONDRE COMME LE VRAI ═══
   La fonction vit sur un autre domaine que la page : le navigateur envoie
   donc d'abord une requête OPTIONS de vérification, et si elle ne revient
   pas avec les en-têtes d'autorisation il BLOQUE l'appel réel — sans
   erreur visible. Un faux serveur qui répond du JSON à l'OPTIONS fait
   échouer le test alors que le site est juste, et l'inverse serait pire :
   oublier ces en-têtes dans la vraie fonction ne se verrait nulle part.
   On ne compte donc que les POST, et on répond à l'OPTIONS comme il faut. */
const CORS = { 'Access-Control-Allow-Origin':'*',
               'Access-Control-Allow-Headers':'authorization, apikey, content-type',
               'Access-Control-Allow-Methods':'POST, OPTIONS' };
await p.route('**/functions/v1/etat-course', async route => {
  if(route.request().method() === 'OPTIONS'){
    return route.fulfill({ status:200, headers:CORS, body:'ok' });
  }
  vus.push(JSON.parse(route.request().postData() || '{}'));
  if(coupee) return route.abort();
  await route.fulfill({ contentType:'application/json', headers:CORS,
    body: JSON.stringify(Object.assign({ ref:'' }, reponse)) });
});

await p.locator('.onglet[data-onglet="accueil"]').click(); await p.waitForTimeout(200);
await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(900);
check('la course confirmée sur le serveur passe au vert SUR LE SITE',
  (await p.locator('#ecran-courses .course-etat').textContent()).toLowerCase().includes('confirm'),
  await p.locator('#ecran-courses .course-etat').textContent());
/* LA RÉFÉRENCE SEULE NE PROTÉGERAIT RIEN : elle est séquentielle, donc
   devinable. C'est le couple référence + téléphone qui fait office de clé,
   et le téléphone ne sort jamais du téléphone du client. */
check('on demande la course par sa référence ET le téléphone du client',
  vus.length > 0 && /^ELA-\d{2}-\d{2}-\d{4}$/.test(vus[0].ref || '')
  && String(vus[0].tel || '').replace(/\D/g,'').endsWith('612345678'),
  JSON.stringify(vus[0] || {}));

/* ═══ UNE COURSE RÉALISÉE CHANGE DE LISTE ═══
   Elle n'attend plus rien : la laisser dans « Réservations » ferait
   chercher au client un transfert à venir qui n'existe plus. */
reponse = { statut:'realisee', chauffeur:{nom:'Mehmet', telephone:'0612345678'},
            vehicule:'Berline', date:'2026-09-11', heure:'10:00' };
await p.locator('.onglet[data-onglet="accueil"]').click(); await p.waitForTimeout(200);
await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(900);
check('une fois réalisée, elle quitte « Réservations »',
  (await p.locator('#ecran-courses .course').count())===0,
  String(await p.locator('#ecran-courses .course').count()));
check('et l\'écriteau « aucune réservation » revient',
  await p.locator('#videCourses').isVisible());
await p.locator('.onglet[data-onglet="trajets"]').click();
await p.waitForTimeout(500);
check('elle apparaît dans « Mes trajets effectués »',
  (await p.locator('#ecran-trajets .course').count())===1,
  String(await p.locator('#ecran-trajets .course').count()));
check('et elle y est marquée comme terminée',
  (await p.locator('#ecran-trajets .course-etat').textContent()).toLowerCase().includes('termin'),
  await p.locator('#ecran-trajets .course-etat').textContent());

/* ═══ UN APPEL QUI ÉCHOUE NE FAIT JAMAIS RECULER UN ÉTAT ═══
   Réseau coupé, fonction pas déployée, serveur muet : on garde ce qu'on a.
   Réécrire « en attente » sur un échec repasserait au rouge une course
   confirmée — exactement le défaut qu'on répare. C'est le contrôle qui
   compte le plus de ce bloc : il ne se voit pas à l'œil, et il coûterait
   un client qui croit sa voiture annulée. */
coupee = true;
const avant = await p.locator('#ecran-trajets .course-etat').textContent();
await p.locator('.onglet[data-onglet="accueil"]').click(); await p.waitForTimeout(200);
await p.locator('.onglet[data-onglet="trajets"]').click();
await p.waitForTimeout(900);
check('serveur muet : l\'état déjà connu ne recule pas',
  (await p.locator('#ecran-trajets .course-etat').textContent())===avant,
  await p.locator('#ecran-trajets .course-etat').textContent());
/* Une course finie ne bougera plus : la redemander à chaque ouverture
   brûlerait du réseau sur le téléphone du client pour rien. */
check('et une course terminée n\'est plus redemandée au serveur',
  vus.length === 2, vus.length + ' appels');

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
