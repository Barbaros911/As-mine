/* =====================================================================
   TEST-NOUVEAU-GARDES.MJS — les garde-fous et la pancarte d'accueil
   ---------------------------------------------------------------------
   Cette suite est née d'un audit. Chaque contrôle correspond à un trou
   qui a été MESURÉ sur la page en ligne, pas imaginé :

   — QUATRE BOUTONS NE FAISAIENT RIEN, dont la bulle WhatsApp, qui est le
     bouton le plus visible du site.
   — DEUX FOIS LA MÊME ADRESSE donnait « 0 km » et un prix ferme de
     5,75 €. On compare les coordonnées, pas les libellés : deux sources
     écrivent rarement une adresse de la même façon, et 60 mètres est la
     largeur d'un carrefour.
   — UNE HEURE DÉJÀ PASSÉE était acceptée. Le champ ne peut pas se borner
     seul : sa borne dépend de la date choisie et change à minuit.
   — NEUF PASSAGERS ouvraient un écran VIDE, sans un mot. Un groupe de
     neuf est une belle course — deux voitures — pas une impasse.

   LA PANCARTE NE CONCERNE QUE LE CLIENT QUI ARRIVE : on suit le DÉPART,
   pas l'un ou l'autre bout du trajet. Un client qui PART vers Roissy n'a
   personne qui l'attend dans un hall avec son nom à la main. Deux
   contrôles vérifient les deux sens.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-gardes.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

// Photon renvoie un terminal de Roissy pour « cdg » (les terminaux sont
// écrits dans la page), Vendôme et Argenteuil pour le reste.
await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await ctx.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });
await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);

// --- Plus aucun bouton mort ---
const morts = await p.evaluate(()=>[...document.querySelectorAll('a[href="#"], a[href=""]')]
  .filter(a=>!a.dataset.ecran).map(a=>a.className));
check('aucun lien mort ne subsiste', morts.length===0, morts.join(' | '));
const wa = await p.locator('.wa').getAttribute('href');
check('la bulle WhatsApp ouvre une conversation', wa.startsWith('https://wa.me/33759312433'), wa.slice(0,40));
check('avec un premier message déjà écrit', wa.includes('text='));
check('le menu ☰ a été retiré', (await p.locator('.menu').count())===0);
check('« Voir tous » aussi', (await p.locator('.voir-tous').count())===0);

// --- Même adresse au départ et à l'arrivée ---
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
await p.locator('#departList [role=option]').first().click();
await p.fill('#arrivee',''); await p.type('#arrivee','vendome',{delay:10}); await p.waitForTimeout(800);
await p.locator('#arriveeList [role=option]').first().click();
const d3 = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d3); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(600);
check('deux fois la même adresse est refusée', await p.locator('#ecran-accueil').isVisible());
check('et on dit pourquoi',
  (await p.locator('#refus').textContent()).includes('même endroit'),
  await p.locator('#refus').textContent());

// --- Une heure déjà passée ---
await p.fill('#arrivee',''); await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
await p.locator('#arriveeList [role=option]').first().click();
const auj = new Date().toISOString().slice(0,10);
await p.fill('#date', auj); await p.fill('#heure','00:01');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(600);
check('une heure déjà passée est refusée', await p.locator('#ecran-accueil').isVisible());
check('et on dit pourquoi',
  (await p.locator('#refus').textContent()).includes('déjà passée'),
  await p.locator('#refus').textContent());

// --- Plus de passagers que le plus grand véhicule ---
await p.fill('#date', d3); await p.fill('#heure','10:00');
await p.evaluate(()=>{ document.getElementById('passagers').value='9'; });
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(600);
check('9 passagers : plus d\'écran vide', await p.locator('#ecran-accueil').isVisible());
const t9 = await p.locator('#refus').textContent();
check('on propose deux voitures plutôt qu\'une impasse',
  t9.includes('9') && t9.toLowerCase().includes('deux voitures'), t9);

// --- Le tunnel passe toujours ---
await p.evaluate(()=>{ document.getElementById('passagers').value='1'; });
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
check('un trajet valable passe toujours', await p.locator('#ecran-vehicules').isVisible());
check('et l\'écriteau de refus a disparu', await p.locator('#refus').isHidden());
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
check('pas de pancarte pour un départ ordinaire', await p.locator('#blocPancarte').isHidden());

// --- La pancarte : seulement en PROVENANCE d'un aéroport ---
await p.locator('#btnRetourVehicules').click();
await p.locator('#btnRetourAccueil').click(); await p.waitForTimeout(200);
await p.fill('#depart',''); await p.type('#depart','cdg',{delay:20}); await p.waitForTimeout(700);
await p.locator('#departList [role=option]',{hasText:'Terminal 2E'}).first().click();
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
check('départ d\'un terminal : la pancarte apparaît', await p.locator('#blocPancarte').isVisible());
await p.fill('#clientNom','Jean Martin');
await p.waitForTimeout(200);
check('elle porte le nom saisi, en capitales',
  (await p.locator('#pancarteNom').textContent())==='JEAN MARTIN',
  await p.locator('#pancarteNom').textContent());
// Le bouton ne doit RIEN recouvrir : mesuré rectangle contre rectangle.
const recouvre = await p.evaluate(()=>{
  const b = document.querySelector('#ecran-recap .bouton').getBoundingClientRect();
  const q = document.getElementById('blocPancarte').getBoundingClientRect();
  return b.bottom>q.top && b.top<q.bottom && b.right>q.left && b.left<q.right;
});
check('le bouton « Confirmer » ne recouvre pas la pancarte', !recouvre);
await p.locator('#blocPancarte').scrollIntoViewIfNeeded();
await p.waitForTimeout(400);
const surPancarte = await p.evaluate(()=>{
  const w = document.querySelector('.wa');
  if(w.classList.contains('efface')) return false;
  const a = w.getBoundingClientRect(), q = document.querySelector('.pancarte').getBoundingClientRect();
  return a.bottom>q.top && a.top<q.bottom && a.right>q.left && a.left<q.right;
});
check('la pastille WhatsApp ne se pose pas sur la pancarte', !surPancarte);

// --- L'inverse : vers un aéroport, pas de pancarte ---
await p.locator('#btnRetourVehicules').click();
await p.locator('#btnRetourAccueil').click(); await p.waitForTimeout(200);
await p.fill('#depart',''); await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
await p.locator('#departList [role=option]').first().click();
await p.fill('#arrivee',''); await p.type('#arrivee','cdg',{delay:20}); await p.waitForTimeout(700);
await p.locator('#arriveeList [role=option]',{hasText:'Terminal 2E'}).first().click();
await p.waitForTimeout(300);
// Le champ « numéro de vol » vit sur l'accueil : on le vérifie là, pas sur
// le récapitulatif où seule la ligne du résumé existe.
check('vers un terminal, le numéro de vol est demandé', await p.locator('#blocVol').isVisible());
check('et le texte parle du bon terminal, pas du retard',
  (await p.locator('#aideVol').textContent()).includes('terminal'),
  await p.locator('#aideVol').textContent());
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
check('vers un terminal : PAS de pancarte, personne n\'attend le client',
  await p.locator('#blocPancarte').isHidden());

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
