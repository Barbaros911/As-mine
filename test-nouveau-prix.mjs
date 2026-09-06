/* =====================================================================
   TEST-NOUVEAU-PRIX.MJS — l'écran des prix de la nouvelle page
   ---------------------------------------------------------------------
   Ce qu'il verrouille : on n'entre pas sur l'écran des prix sans DEUX
   adresses choisies dans la liste — le prix est ferme, il n'existe pas
   sans distance ; la grille de Barbaros au centime ; DEUX gammes et deux
   seulement, sans aucune image de voiture ; et le fait que le nombre de
   passagers n'écarte QUE les véhicules trop petits.

   Les trois services extérieurs — Base Adresse Nationale, Photon et le
   routeur OSRM — sont injoignables depuis la machine de développement :
   on répond à leur place, avec une distance connue (24,3 km). C'est ce
   qui permet de vérifier le prix AU CENTIME plutôt que de vérifier
   « qu'il y a un chiffre ».

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-prix.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

// Photon/BAN et OSRM sont injoignables d'ici : on répond à leur place.
await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}
]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}
]})}));
/* OpenRouteService passe AVANT OSRM depuis qu'une clé est posée dans la
   page. Sans ce refus, la suite dépendrait du fait qu'il soit injoignable
   d'ici — et sur une machine reliée à Internet elle interrogerait le vrai
   service, avec une vraie distance, et les prix vérifiés plus bas ne
   tomberaient plus juste. On le coupe donc explicitement. */
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);

// Sans les deux adresses, on ne va nulle part : le prix est ferme.
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(300);
check('pas de prix sans les deux adresses', await p.locator('#ecran-accueil').isVisible());

await p.type('#depart','vendome',{delay:15});
await p.waitForTimeout(900);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:15});
await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(200);

const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d);
await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1200);

check('écran des prix atteint', await p.locator('#ecran-vehicules').isVisible());
const noms = await p.locator('.veh-nom').allTextContents();
check('deux gammes, et deux seulement', noms.length===2, noms.join(' | '));
check('elles s\'appellent Berline et Van',
  noms[0]==='Berline' && noms[1]==='Van', noms.join(' | '));
check('aucune image de voiture — ni dessin, ni emoji',
  (await p.locator('.veh-carte svg').count())===0
  && !/[\u{1F680}-\u{1F6FF}]/u.test(await p.locator('.veh-liste').innerText()));
const prix = await p.locator('.veh-prix').allTextContents();
check('un prix par gamme', prix.length===2, prix.join(' | '));
// 24,3 km : berline = 2,95 × 24,3 = 71,69 € → arrondi à la dizaine = 70 €.
//           van     = 4,20 × 24,3 = 102,06 € → 100 €.
// Plus de prise en charge : le prix n'est qu'un kilométrage.
check('le prix suit la grille', prix[0].replace(/\s/g,'')==='70,00€', prix[0]);
check('le van suit la sienne', prix[1].replace(/\s/g,'')==='100,00€', prix[1]);
check('un prix rond, jamais de centimes',
  prix.every(x=>/^\d+,00\s*€$/.test(x.trim())), prix.join(' | '));
check('la mesure est affichée', (await p.locator('#resumeMesure').textContent()).includes('24,3'),
      await p.locator('#resumeMesure').textContent());
check('pas de majoration un mardi à 10 h', await p.locator('#noteNuit').isHidden());
check('le bouton attend un choix', await p.locator('#btnContinuer').isDisabled());

await p.locator('.veh-carte').first().click();
await p.waitForTimeout(200);
check('le bouton se nomme après le choix',
  (await p.locator('#libelleContinuer').textContent()).includes('Berline'),
  await p.locator('#libelleContinuer').textContent());
check('le bouton est actif', !(await p.locator('#btnContinuer').isDisabled()));

// Six passagers : seuls les deux vans restent
await p.locator('#btnRetourAccueil').click();
await p.waitForTimeout(300);
await p.fill('#passagers','6');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1000);
const noms6 = await p.locator('.veh-nom').allTextContents();
check('à 6 passagers, il ne reste que le van',
  noms6.length===1 && noms6[0]==='Van', noms6.join(' | '));

/* ---------------------------------------------------------------------
   LE PLANCHER, ÉPROUVÉ SUR UNE VRAIE COURSE COURTE
   Une course de 2 km coûterait 5,90 € au kilométrage seul — arrondie, 10 €.
   Ce n'est pas un prix : le chauffeur traverse Paris pour venir la prendre,
   et ce trajet-là n'est facturé à personne. Le plancher est donc le dernier
   mot du calcul, et il ne s'arrondit pas : c'est déjà une dizaine.
   On refait la course pour de vrai plutôt que de recalculer la formule dans
   le test — un test qui réimplémente ce qu'il vérifie ne vérifie rien.
   --------------------------------------------------------------------- */
await p.unroute('**://router.project-osrm.org/**');
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:2000, duration:420}]})}));
await p.locator('#btnRetourAccueil').click(); await p.waitForTimeout(300);
await p.fill('#passagers','1');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
const court = await p.locator('.veh-prix').allTextContents();
check('2 km en berline : le plancher de 30 €, pas 10 €',
  court[0].replace(/\s/g,'')==='30,00€', court[0]);
check('2 km en van : le plancher de 50 €',
  court[1].replace(/\s/g,'')==='50,00€', court[1]);

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
