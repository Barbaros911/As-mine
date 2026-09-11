/* =====================================================================
   TEST-NOUVEAU-HOTEL.MJS — l'écran d'une réception partenaire
   ---------------------------------------------------------------------
   Ce qu'il verrouille, et pourquoi chacun coûte de l'argent ou un client :

   1. LA GRILLE DU FLYER, AU CENTIME, DANS LES QUATRE COLONNES. Les
      montants écrits ici viennent du PAPIER imprimé, pas de la page :
      c'est le seul cas de ce dépôt où recopier des nombres dans un test
      est juste, parce que le flyer est la référence et l'écran le copiste.
      Le client l'a sous les yeux quand la réception lui annonce un prix ;
      si les deux ne disent pas la même chose, c'est nous qui avons tort,
      et le prix est ferme donc opposable.

   2. LA NUIT DU FLYER N'EST PAS CELLE DU SITE. Le site majore de 20 % de
      21 h à 6 h ET tout le week-end ; le flyer facture +5 € de 21 h à 6 h,
      et ne dit rien du week-end. Un Orly berline de nuit doit sortir à
      105 € et JAMAIS à 120 ; un Orly du samedi midi à 100 € et jamais à
      120. C'est la divergence qui ne se voit pas à la relecture.

   3. LE SITE PUBLIC NE DOIT RIEN EN SAVOIR. Sans « ?h= », pas d'en-tête,
      pas de menu, pas de balise « noindex » — poser celle-ci sur le site
      ordinaire le sortirait de Google en entier.

   4. LA SORTIE « AUTRE DESTINATION » REPASSE AU KILOMÉTRAGE, et le DIT.
      Sans elle, une réception qui envoie un client à Versailles rouvre le
      site public et la provenance est perdue — on ne saurait plus ce que
      l'hôtel rapporte, qui est toute la raison de cette page.

   5. « PARIS » N'EST PAS UNE ADRESSE. Le forfait de 80 € ne tient que si
      l'adresse tapée est bien dans Paris : un « Versailles » saisi là
      vendrait 45 km au prix de 10.

   Les services extérieurs sont injoignables depuis la machine de
   développement ; on répond à leur place, avec une distance connue.
   OpenRouteService est coupé EXPLICITEMENT : sans ça, sur un poste relié
   à Internet, la suite interrogerait le vrai service et les prix vérifiés
   au centime tomberaient à côté.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-hotel.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* LA GRILLE DU FLYER IMPRIMÉ. Berline 4 places, van 7 places, nuit de
   21 h à 6 h, aucune majoration de week-end. */
const FLYER = {
  cdg:        { nom:'Aéroport CDG',           jour:[35,40],   nuit:[40,45]   },
  orly:       { nom:'Orly',                   jour:[100,125], nuit:[105,130] },
  bourget:    { nom:'Le Bourget',             jour:[45,65],   nuit:[50,70]   },
  beauvais:   { nom:'Beauvais',               jour:[180,240], nuit:[185,245] },
  villepinte: { nom:'Expositions Villepinte', jour:[35,50],   nuit:[40,55]   },
  disney:     { nom:'Disney',                 jour:[90,120],  nuit:[95,125]  },
  paris:      { nom:'Paris',                  jour:[80,110],  nuit:[85,115]  }
};

await ctx.route('**://photon.komoot.io/**', r => {
  const q = decodeURIComponent(r.request().url()).toLowerCase();
  const dedans = {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}};
  const dehors = {geometry:{coordinates:[2.1301,48.8014]},properties:{name:"Château de Versailles",osm_key:"tourism",osm_value:"attraction",postcode:"78000",city:"Versailles",countrycode:"FR"}};
  return r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:[q.includes('vendome')?dedans:dehors]})});
});
const BAN_HOTEL = [2.5512, 48.9701];
await ctx.route('**://api-adresse.data.gouv.fr/**', r => {
  const q = decodeURIComponent(r.request().url()).toLowerCase();
  if(q.includes('belle borne'))
    return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
      {geometry:{coordinates:BAN_HOTEL},properties:{label:"10 Rue de la Belle Borne, 93410 Tremblay-en-France"}}]})});
  return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[]})});
});
/* On retient l'itinéraire réellement demandé : c'est lui qui dit quelles
   coordonnées sont sorties de la page. Regarder dans le moteur ne prouve
   pas ce que fait la voiture. */
let derniereRoute = '';
await ctx.route('**://router.project-osrm.org/**', r => {
  derniereRoute = r.request().url();
  return r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})});
});
await ctx.route('**://api.openrouteservice.org/**', r => r.abort());

/* Deux dates fixes et lointaines : le préavis de 15 minutes ne doit
   jamais décider à la place du test. */
const lundi   = (()=>{ const d=new Date(Date.now()+9*864e5); while(d.getDay()!==1) d.setDate(d.getDate()+1);
                       return d.toISOString().slice(0,10); })();
const samedi  = (()=>{ const d=new Date(Date.now()+9*864e5); while(d.getDay()!==6) d.setDate(d.getDate()+1);
                       return d.toISOString().slice(0,10); })();

/* ---------------------------------------------------------------------
   1. LE SITE PUBLIC N'EN SAIT RIEN
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('sans ?h= : pas de mode hôtel',
  !(await p.evaluate(()=>document.body.classList.contains('hotel'))));
check('sans ?h= : l\'en-tête hôtel est absent de l\'écran',
  await p.locator('#hotelTete').isHidden());
check('sans ?h= : le menu des destinations est absent',
  await p.locator('#blocDest').isHidden());
check('sans ?h= : la balise robots dit « index » — la poser à noindex sortirait TOUT le site de Google',
  await p.evaluate(()=>{const m=document.querySelector('meta[name="robots"]');
                        return !!m && m.content.includes('index') && !m.content.includes('noindex');}));
check('sans ?h= : le bandeau d\'accroche est bien là',
  await p.locator('.hero').isVisible());
check('sans ?h= : les deux onglets de listes sont là',
  await p.locator('.onglet[data-onglet="courses"]').isVisible());

/* Un hôtel NON partenaire garde le comportement d'origine : son nom va
   dans le champ de départ, et rien d'autre ne change. */
await p.goto('http://127.0.0.1:8099/index.html?h=Ibis%20CDG',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);
check('un hôtel non partenaire n\'ouvre PAS le mode hôtel',
  !(await p.evaluate(()=>document.body.classList.contains('hotel'))));
check('un hôtel non partenaire pose quand même son nom au départ',
  (await p.locator('#depart').inputValue()).includes('Ibis'));

/* ---------------------------------------------------------------------
   2. L'ÉCRAN DE LA RÉCEPTION
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
check('?h= partenaire : le mode hôtel s\'ouvre',
  await p.evaluate(()=>document.body.classList.contains('hotel')));
check('le libellé est « easyHotel Aéroville », celui que l\'hôtel emploie',
  (await p.locator('#hotelTeteNom').textContent()).trim()==='easyHotel Aéroville');
const dep = await p.locator('#depart').inputValue();
check('le départ figé porte l\'ADRESSE POSTALE, pas seulement la marque',
  dep.includes('Belle Borne') && dep.includes('93410'), dep);
check('le départ ne se modifie pas ici',
  await p.evaluate(()=>document.getElementById('depart').readOnly));
/* ═══ ET « ME LOCALISER » DISPARAÎT AVEC LUI ═══
   Défaut trouvé en regardant une capture, pas en relisant le code : le
   champ était bien en lecture seule, mais le bouton de géolocalisation est
   un élément À CÔTÉ. Un appui dessus remplaçait l'adresse figée de l'hôtel
   par la position de l'appareil — « easyHotel Aéroville » devenait « 1 Rue
   de Rivoli ». Le prix ne bougeait pas, c'est un forfait : rien ne se
   voyait, et seul le chauffeur s'en serait aperçu en allant à la mauvaise
   adresse. « readOnly » protège la saisie, jamais ce qui écrit dans le
   champ depuis l'extérieur. */
check('« me localiser » disparaît : il écraserait l\'adresse figée de l\'hôtel',
  await p.locator('#btnGeoloc').isHidden());
/* Vérifié plus bas, sur l'itinéraire réellement demandé. */
check('les sept destinations du flyer, plus la sortie',
  (await p.locator('#hotelDest option').allTextContents()).length===8);
check('l\'accroche, les services et le pied de page sont masqués',
  await p.locator('.hero').isHidden() && await p.locator('.pied').isHidden());
/* LES ONGLETS DE LISTES RESTENT, et c'est un arbitrage assumé : le QR du
   flyer est scanné par les CLIENTS sur leur propre téléphone, et les
   masquer leur retirerait l'accès à leur réservation. Voir le commentaire
   du CSS. */
check('les onglets de listes restent : un client scanne le QR sur SON téléphone',
  await p.locator('.onglet[data-onglet="courses"]').isVisible()
  && await p.locator('.onglet[data-onglet="trajets"]').isVisible());
check('la page porte noindex : la grille négociée ne sort pas dans Google',
  await p.evaluate(()=>{const m=document.querySelectorAll('meta[name="robots"]');
                        /* UNE SEULE balise, réécrite — deux consignes
                           contradictoires dans la même en-tête ne se
                           découvrent qu'en voyant la page rester dans les
                           résultats des semaines plus tard. */
                        return m.length===1 && m[0].content.includes('noindex');}));
check('la provenance est retenue — c\'est ce qui dit ce que l\'hôtel rapporte',
  (await p.evaluate(()=>sessionStorage.getItem('ela_provenance')))==='easyHotel Aéroville');
check('le numéro de chambre est demandé au départ de l\'hôtel',
  await p.locator('#blocChambre').isVisible());
check('l\'adresse de la réception reste dans la barre — c\'est son signet',
  (await p.evaluate(()=>location.search)).includes('h='));

/* ---------------------------------------------------------------------
   3. LA GRILLE, AU CENTIME, DANS LES QUATRE COLONNES
   --------------------------------------------------------------------- */
const montants = async () => {
  const t = await p.locator('#destForfait').textContent();
  return (t.match(/(\d+),00/g)||[]).map(x=>parseInt(x,10));
};
const poser = async (cle, date, heure) => {
  await p.selectOption('#hotelDest', cle);
  await p.waitForTimeout(120);
  await p.fill('#date', date);
  await p.fill('#heure', heure);
  await p.waitForTimeout(150);
};
for(const cle of Object.keys(FLYER)){
  const f = FLYER[cle];
  await poser(cle, lundi, '10:00');
  const j = await montants();
  check('jour · '+f.nom+' : '+f.jour[0]+' € / '+f.jour[1]+' €',
    j[0]===f.jour[0] && j[1]===f.jour[1], j.join('/'));
  await poser(cle, lundi, '22:30');
  const n = await montants();
  check('nuit · '+f.nom+' : '+f.nuit[0]+' € / '+f.nuit[1]+' €',
    n[0]===f.nuit[0] && n[1]===f.nuit[1], n.join('/'));
}

/* LES DEUX BORNES DE LA NUIT. Le flyer dit 21 h – 6 h : 20 h 59 est du
   jour, 21 h 00 de la nuit, 5 h 59 de la nuit, 6 h 00 du jour. */
await poser('orly', lundi, '20:59'); check('20 h 59 est encore du jour', (await montants())[0]===100);
await poser('orly', lundi, '21:00'); check('21 h 00 bascule en nuit',   (await montants())[0]===105);
await poser('orly', lundi, '05:59'); check('5 h 59 est encore de la nuit',(await montants())[0]===105);
await poser('orly', lundi, '06:00'); check('6 h 00 revient au jour',    (await montants())[0]===100);

/* LE CONTRÔLE QUI COMPTE LE PLUS : le week-end du SITE ne s'applique pas
   au flyer. Sans lui, un samedi midi sortirait à 120 € au lieu de 100. */
await poser('orly', samedi, '12:00');
const sam = await montants();
check('SAMEDI MIDI reste au tarif de jour : 100 €, pas les 120 € du site',
  sam[0]===100 && sam[1]===125, sam.join('/'));
await poser('orly', samedi, '22:00');
check('samedi soir : le tarif nuit du flyer, pas le cumul avec le week-end',
  (await montants())[0]===105);

/* ---------------------------------------------------------------------
   4. LE PRIX ANNONCÉ EST CELUI QUE LE CLIENT PAIE — TUNNEL COMPLET
   --------------------------------------------------------------------- */
await poser('orly', lundi, '10:00');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1400);
const cartes = await p.locator('.veh-prix').allTextContents();
check('sur l\'écran des gammes, la berline sort à 100 €',
  cartes[0].replace(/\s/g,'')==='100,00€', cartes[0]);
check('sur l\'écran des gammes, le van sort à 125 €',
  cartes[1].replace(/\s/g,'')==='125,00€', cartes[1]);
check('aucune note de majoration « nuit et week-end » sur un forfait de jour',
  await p.locator('#noteNuit').isHidden());
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click();
await p.waitForTimeout(600);
const total = await p.locator('#recapTotal').textContent();
check('le récapitulatif porte le MÊME prix : 100 €',
  total.replace(/\s/g,'').includes('100,00€'), total);

/* La note de nuit doit dire la règle du flyer, pas celle du site. */
await p.locator('#btnRetourVehicules').click();
await p.waitForTimeout(300);
await p.locator('#btnRetourAccueil').click();
await p.waitForTimeout(300);
await poser('orly', lundi, '22:30');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1400);
const nuitCartes = await p.locator('.veh-prix').allTextContents();
check('de nuit, la berline sort à 105 € et JAMAIS à 120 €',
  nuitCartes[0].replace(/\s/g,'')==='105,00€', nuitCartes[0]);
const noteN = (await p.locator('#noteNuit').textContent()).toLowerCase();
check('la note de nuit ne parle pas de week-end sur un forfait',
  !(await p.locator('#noteNuit').isHidden()) && !noteN.includes('week'), noteN);

/* ---------------------------------------------------------------------
   5. LA SORTIE, ET LE PIÈGE DE « PARIS »
   --------------------------------------------------------------------- */
await p.locator('#btnRetourAccueil').click();
await p.waitForTimeout(300);
await p.selectOption('#hotelDest','');
await p.waitForTimeout(250);
check('« autre destination » rouvre le champ d\'adresse',
  await p.locator('#blocArrivee').isVisible());
check('« autre destination » le DIT : on repasse à la distance',
  !(await p.locator('#destLibre').isHidden()));
check('« autre destination » n\'affiche plus de forfait',
  await p.locator('#destForfait').isHidden());
await p.type('#arrivee','versailles',{delay:12});
await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.fill('#date', lundi); await p.fill('#heure','10:00');
await p.waitForTimeout(200);
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1400);
const km = await p.locator('.veh-prix').allTextContents();
/* 24,3 km × 2,35 = 57,11 → arrondi à la dizaine → 60 €. C'est la grille
   ordinaire du site, exactement comme sur test-nouveau-prix. */
check('hors grille : le prix repasse au kilométrage du site (60 €)',
  km[0].replace(/\s/g,'')==='60,00€', km[0]);

/* ON REPART D'UNE PAGE NEUVE. Le bloc précédent a laissé une adresse
   RETENUE (Versailles) dans le champ, et c'est voulu : changer de
   destination ne doit pas effacer ce que la réception a tapé. Mais pour
   éprouver ce que voit quelqu'un qui choisit « Paris » d'emblée, il faut
   justement qu'aucune adresse ne soit encore choisie. */
await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
await p.selectOption('#hotelDest','paris');
/* La page rechargée a reposé l'heure sur « maintenant + 15 minutes » : il
   faut la refixer, sinon le test lit la colonne du flyer qui correspond à
   l'heure qu'il est sur la machine — et il passerait au vert la nuit et
   au rouge le jour. */
await p.fill('#date', lundi); await p.fill('#heure','10:00');
await p.waitForTimeout(250);
check('« Paris » ouvre le champ d\'adresse : ce n\'est pas une adresse',
  await p.locator('#blocArrivee').isVisible());
check('« Paris » : le forfait s\'affiche AVANT la saisie — c\'est ce que la réception annonce',
  !(await p.locator('#destForfait').isHidden()));
await p.fill('#arrivee','');
await p.type('#arrivee','vendome',{delay:12});
await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(250);
check('« Paris » + une adresse DANS Paris : le forfait tient (80 € / 110 €)',
  (await montants()).join('/')==='80/110', await p.locator('#destForfait').textContent());
await p.fill('#arrivee','');
await p.type('#arrivee','versailles',{delay:12});
await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(250);
check('« Paris » + une adresse HORS de Paris : le forfait tombe',
  await p.locator('#destForfait').isHidden());
check('et on le dit, plutôt que de changer le prix en silence',
  !(await p.locator('#destLibre').isHidden()));

/* ---------------------------------------------------------------------
   6. LES DEUX SENS, AU MÊME PRIX
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
await p.locator('.hotel-sens-btn[data-sens="vers"]').click();
await p.waitForTimeout(300);
await poser('orly', lundi, '10:00');
const retour = await montants();
check('sens « arrivée à l\'hôtel » : le même forfait, 100 € / 125 €',
  retour[0]===100 && retour[1]===125, retour.join('/'));
const dep2 = await p.locator('#depart').inputValue();
const arr2 = await p.locator('#arrivee').inputValue();
check('au retour, le DÉPART est le terminal', dep2.includes('Orly'), dep2);
check('au retour, l\'ARRIVÉE est l\'hôtel avec son adresse',
  arr2.includes('Belle Borne'), arr2);
check('au retour, pas de numéro de chambre : le client n\'a pas encore la sienne',
  await p.locator('#blocChambre').isHidden());
/* LA PANCARTE SUIT LE DÉPART, ET C'EST L'ÉCHANGE DES DEUX CHAMPS QUI LA
   REND POSSIBLE. Au retour, la prise en charge est en aéroport : l'option
   d'accueil au nom du client a un sens. Elle n'en avait aucun à l'aller,
   au départ d'un hôtel. */
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1400);
check('au retour, la pancarte est proposée — la prise en charge est en aéroport',
  await p.locator('.veh-option').first().isVisible());
check('l\'itinéraire part bien des coordonnées rendues par la BAN, pas du secours écrit dans la page',
  derniereRoute.includes(String(BAN_HOTEL[0])), derniereRoute.slice(0,120));
await p.locator('#btnRetourAccueil').click();
await p.waitForTimeout(300);

/* =====================================================================
   LA CASE DE PRÉCISION — CE QUE LA RÉCEPTION SAIT ET QUE LE FORMULAIRE
   NE DEMANDE PAS
   ---------------------------------------------------------------------
   À sa demande. Un comptoir sait qu'un client est en fauteuil, qu'il a
   deux bagages de plus, qu'il descendra en retard. Sans endroit où
   l'écrire, ces précisions n'arrivent jamais au chauffeur.

   LE CONTRÔLE QUI COMPTE EST LE DERNIER, ET IL NE SE VOIT PAS À L'ŒIL :
   le message WhatsApp se lit par la PLACE de ses lignes — les deux
   premières valeurs « … : … » sont les adresses, le DERNIER montant en
   euros est le prix. Une précision posée après la ligne Prix, ou portant
   un deux-points avant les adresses, ferait recréer la course avec un
   prix ou une adresse faux. On l'éprouve donc avec le pire cas possible :
   une précision qui contient LES DEUX.
   ===================================================================== */
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);
check('la case de précision n\'existe PAS sur le site public',
  await p.locator('#blocNote').isHidden());

await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
check('elle est là sur la page du partenaire',
  await p.locator('#blocNote').isVisible());
check('elle est bornée à 200 caractères — la ligne part dans un message lu la nuit',
  await p.locator('#noteCourse').getAttribute('maxlength') === '200');

/* LA PRÉCISION VOYAGE : de la case au bon, en passant par la course. On
   fait une VRAIE réservation, on ne relit pas le code. */
const PRECISION = "Bagages : 4 grosses valises, prévoir 50 € de péage";
await poser('orly', lundi, '10:00');
await p.fill('#chambre', '214');
await p.fill('#noteCourse', PRECISION);
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1500);
await p.locator('.veh-carte').first().click();
await p.waitForTimeout(300);
await p.locator('#btnContinuer').click();
await p.waitForTimeout(600);
check('elle est rappelée sur le récapitulatif, avant de confirmer',
  await p.locator('#ligneNoteRecap').isVisible()
  && (await p.locator('#recapNote').textContent()) === PRECISION);
await p.fill('#clientNom','M. Dupont');
await p.fill('#clientTel','06 12 34 56 78');
await p.locator('[data-paiement="especes"]').click();
await p.evaluate(()=>{ window.__wa=[]; window.open=(u)=>{ window.__wa.push(u); return null; }; });
await p.locator('#btnConfirmer').click();
await p.waitForTimeout(900);
check('et sur le bon du client, qui est le seul endroit où il peut la relire',
  await p.locator('#lignePrecision').isVisible()
  && (await p.locator('#bonPrecision').textContent()) === PRECISION);

const msg = decodeURIComponent((await p.evaluate(()=>window.__wa||[]))[0] || '');
check('elle est dans le message, AVANT la ligne du prix',
  msg.indexOf('Précision') > 0 && msg.indexOf('Précision') < msg.indexOf('Prix :'),
  msg.replace(/\n/g,' | '));
const garde = await p.evaluate(()=>{
  const c = (JSON.parse(localStorage.getItem('ela_courses')||'[]'))[0] || {};
  return { note:(c.course||{}).note, chambre:(c.course||{}).chambre };
});
check('la course la garde', garde.note === PRECISION, String(garde.note));
/* LA CHAMBRE N'ÉTAIT RANGÉE NULLE PART — elle n'existait que fondue dans
   le libellé de départ, et la fonction qui rend ses courses à la réception
   lisait « course.chambre », un champ que personne n'écrivait. Le comptoir
   ne voyait donc jamais le numéro qu'il venait de saisir. Le banc ne
   pouvait pas l'attraper : il FABRIQUE les réponses du serveur. */
check('la course garde AUSSI la chambre, à part du libellé de départ',
  garde.chambre === '214', String(garde.chambre));

/* ═══ LE PIRE CAS : DEUX-POINTS ET MONTANT DANS LA PRÉCISION ═══
   Éprouvé contre la ligne posée APRÈS le prix : le lecteur rend alors
   50 € au lieu de 100, et Barbaros recrée la course au prix du péage. */
await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(700);
await p.fill('#codeExploitant','12345678');
await p.locator('#btnDeverrouiller').click();
await p.waitForTimeout(700);
await p.locator('#btnCollerDemande').click();
await p.waitForTimeout(1500);
await p.fill('#collerTexte', msg);
await p.locator('#btnLireColle').click();
await p.waitForTimeout(700);
const relu = await p.evaluate(()=>{
  const c = (JSON.parse(localStorage.getItem('ela_bookings')||'[]'))
              .filter(x=>x.course && /Belle Borne/.test(x.course.depart))[0] || {};
  return { depart:(c.course||{}).depart, arrivee:(c.course||{}).arrivee,
           prix:(c.prix||{}).total, note:(c.course||{}).note, chambre:(c.course||{}).chambre };
});
check('collée, la demande garde le PRIX de la course — pas le montant de la précision',
  relu.prix === 100, String(relu.prix));
check('et les deux adresses, malgré le deux-points de la précision',
  /Belle Borne/.test(relu.depart||'') && /Orly/.test(relu.arrivee||''),
  relu.depart + ' → ' + relu.arrivee);
check('la précision est relue, elle aussi', relu.note === PRECISION, String(relu.note));
check('et la chambre est retrouvée dans le libellé de départ',
  relu.chambre === '214', String(relu.chambre));

/* =====================================================================
   « DESTINATION : PARIS » PUIS « LIEU D'ARRIVÉE » — DEUX FOIS LA MÊME
   QUESTION
   ---------------------------------------------------------------------
   Signalé par Barbaros sur une capture du site en ligne. Le champ était
   pourtant utile — « Paris » fait dix kilomètres de large et le forfait
   tombe au-delà de 7 km du centre — c'est son LIBELLÉ qui mentait : il
   annonçait une destination alors qu'il demande une PRÉCISION sur celle
   du dessus.

   LE CONTRÔLE VÉRIFIE LES QUATRE CAS, et le quatrième compte autant que
   les autres : sur « autre destination » il n'y a rien au-dessus, le
   champ EST la destination, et le libellé d'origine y est juste. Un test
   qui n'aurait vérifié que « Paris » aurait laissé passer un code qui
   renomme le champ partout.
   ===================================================================== */
await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
const titreArr = async () => (await p.locator('#blocArrivee .champ-titre').textContent()).trim();

await p.selectOption('#hotelDest','cdg'); await p.waitForTimeout(350);
check('sur un forfait fermé, aucun champ d\'adresse n\'est demandé',
  await p.locator('#blocArrivee').isHidden());

await p.selectOption('#hotelDest','paris'); await p.waitForTimeout(350);
check('sur « Paris », le champ demande une PRÉCISION, pas une destination',
  (await titreArr()) === 'Adresse précise', await titreArr());
check('et il est bien là — « Paris » fait dix kilomètres de large',
  !(await p.locator('#blocArrivee').isHidden()));

await p.selectOption('#hotelDest',''); await p.waitForTimeout(350);
check('sur « autre destination », le libellé d\'origine reste : le champ EST la destination',
  (await titreArr()) === 'Lieu d\'arrivée', await titreArr());

/* LE SENS INVERSE : le champ libre devient le DÉPART. */
await p.selectOption('#hotelDest','paris'); await p.waitForTimeout(250);
await p.locator('.hotel-sens-btn[data-sens="vers"]').click(); await p.waitForTimeout(450);
check('vers l\'hôtel, la précision suit le champ de départ',
  (await p.locator('#blocDepart .champ-titre').textContent()).trim() === 'Adresse précise');
await p.selectOption('#hotelDest',''); await p.waitForTimeout(350);
check('et « autre destination » y redevient « Lieu de départ »',
  (await p.locator('#blocDepart .champ-titre').textContent()).trim() === 'Lieu de départ');

/* ON RÉÉCRIT L'ATTRIBUT « data-t », PAS SEULEMENT LE TEXTE. Sans ça, un
   changement de langue ramène « Lieu d'arrivée » sur une course vers
   Paris — le texte est réécrit par « appliquerLangue » depuis la clé. */
await p.locator('.hotel-sens-btn[data-sens="depuis"]').click(); await p.waitForTimeout(300);
await p.selectOption('#hotelDest','paris'); await p.waitForTimeout(300);
await p.locator('[data-langue="en"]').click(); await p.waitForTimeout(450);
check('le libellé survit au changement de langue',
  (await titreArr()) === 'Exact address', await titreArr());
await p.locator('[data-langue="fr"]').click(); await p.waitForTimeout(450);

/* =====================================================================
   LE REPÈRE DU PARTENAIRE SUR LE TABLEAU DE BORD
   ---------------------------------------------------------------------
   À sa demande : « l'adresse easyHotel, tu peux mettre un code couleur
   visuel orange, une façon pour moi de savoir que c'est easyHotel la
   réception ».

   DEUX CONTRÔLES COMPTENT PLUS QUE LES AUTRES :
   — la carte NE GRANDIT PAS. Premier jet : la pastille était entre la
     référence et le prix, elle poussait le prix sur deux lignes et la
     carte repassait de 103 à 120 px. C'est exactement la densité qu'il
     avait fait corriger (« ça prend beaucoup de place »). Un repère qui
     coûte une ligne par course n'est pas un repère, c'est un recul.
   — la couleur vient de la FICHE DE L'HÔTEL, pas du CSS. Écrite en dur,
     elle serait orange pour le partenaire suivant, qui sera peut-être
     bleu — même leçon que sa grille de forfaits, qui est par hôtel.
   ===================================================================== */
const jourP = n => { const d=new Date(Date.now()+n*864e5); const z=x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); };
const faux = (ref, extra) => Object.assign({
  ref, statut:'attente', cree:new Date().toISOString(),
  course:{type:'Trajet simple', depart:'easyHotel Aéroville, 10 rue de la Belle Borne (ch. 214)',
          arrivee:'Orly 1 — Aéroport de Paris-Orly', date:jourP(1), heure:'06:00',
          vehicule:'Berline', vehiculeCle:'berline', passagers:'2 passagers', note:''},
  client:{nom:'M. Dupont', telephone:'0612345678'},
  paiement:'especes', paiementNom:'Espèces',
  prix:{total:100, ht:90.9, tva:9.1, majoration:false}}, extra);
await ctx.addInitScript(([x,y,z]) => localStorage.setItem('ela_bookings', JSON.stringify([x,y,z])),
 [ faux('ELA-26-09-0050',{provenanceCle:'easyhotel-aeroville', provenance:'easyHotel Aéroville', parReception:true}),
   faux('ELA-26-09-0051',{provenanceCle:'easyhotel-aeroville', provenance:'easyHotel Aéroville', parReception:false}),
   faux('ELA-26-09-0052',{course:{type:'Trajet simple', depart:'12 rue de Rivoli, Paris',
       arrivee:'Gare du Nord', date:jourP(1), heure:'08:00', vehicule:'Van', vehiculeCle:'van',
       passagers:'4 passagers', note:''}}) ]);
await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(700);
/* LE CODE N'EST REDEMANDÉ QU'UNE FOIS PAR CONTEXTE : le bloc précédent est
   déjà entré dans l'espace, et « fill » sur un champ invisible attend
   trente secondes avant d'échouer. On regarde l'écran plutôt que de
   supposer. */
if(await p.locator('#ecran-verrou').isVisible()){
  await p.fill('#codeExploitant','12345678');
  await p.locator('#btnDeverrouiller').click();
  await p.waitForTimeout(900);
}

check('les deux courses du partenaire sont marquées, la course directe ne l\'est pas',
  (await p.locator('.demande.partenaire').count()) === 2
  && (await p.locator('.demande:not(.partenaire)').count()) === 1);
const pastilles = await p.locator('.d-prov').allTextContents();
check('le comptoir se distingue du client qui a scanné le flyer',
  pastilles[0] === 'easyHotel · comptoir' && pastilles[1] === 'easyHotel',
  pastilles.join(' / '));
/* LA COULEUR CALCULÉE, pas la feuille de style : une règle trop large ou
   une variable non posée se voit à l'écran, jamais dans le CSS. */
const filet = await p.locator('.demande.partenaire').first()
  .evaluate(el => getComputedStyle(el).borderLeftColor);
check('le filet porte l\'orange rangé sur la fiche de l\'hôtel',
  filet.replace(/\s/g,'') === 'rgb(255,102,0)', filet);
const hauteurs = await p.locator('.demande').evaluateAll(
  els => els.map(e => Math.round(e.getBoundingClientRect().height)));
check('LA CARTE NE GRANDIT PAS : marquée ou non, même hauteur',
  hauteurs[0] === hauteurs[2] && hauteurs[1] === hauteurs[2], hauteurs.join('/'));
/* ═══ L'ARRIVÉE EST LISIBLE, ET C'EST TOUT LE POINT ═══
   À sa demande. Les deux adresses tenaient sur UNE ligne qui tronque : sur
   une course d'hôtel le départ est toujours le même et toujours long, donc
   c'était l'arrivée — la seule moitié qu'il ne connaît pas d'avance — qui
   disparaissait à chaque fois. Le contrôle MESURE qu'elle tient en entier
   plutôt que de vérifier sa présence : un texte présent mais coupé passe
   tous les contrôles de présence. */
check('l\'arrivée est sur sa propre ligne, sous le départ',
  (await p.locator('.demande').first().evaluate(el => {
     const d = el.querySelector('.d-trajet').getBoundingClientRect();
     const a = el.querySelector('.d-vers').getBoundingClientRect();
     return a.top >= d.bottom - 1;
   })));
check('et elle tient en entier, sans être tronquée',
  await p.locator('.d-vers').first().evaluate(e => e.scrollWidth <= e.clientWidth + 1),
  await p.locator('.d-vers').first().textContent());
check('le sens reste écrit — sans lui, on ne sait pas qui va où',
  (await p.locator('.d-vers').first().textContent()).trim().indexOf('→') === 0);
check('et le prix reste sur UNE ligne',
  await p.locator('.demande').first()
    .evaluate(e => Math.round(e.querySelector('.d-prix').getBoundingClientRect().height) < 30));
/* LE ROUGE RESTE LE SEUL QUI CRIE. L'orange est à 24° de teinte du rouge
   de l'attente : en aplat sur la ligne, les deux se disputeraient
   l'attention et plus rien ne dirait « quelqu'un attend une réponse ». */
check('la ligne garde son fond rouge : l\'orange ne tient que le filet et la pastille',
  (await p.locator('.demande.partenaire').first()
     .evaluate(el => getComputedStyle(el).backgroundColor)).replace(/\s/g,'') !== 'rgb(255,102,0)');

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
