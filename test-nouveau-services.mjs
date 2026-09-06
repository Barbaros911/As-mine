/* =====================================================================
   TEST-NOUVEAU-SERVICES.MJS — les trois cartes de services
   ---------------------------------------------------------------------
   « Mise à disposition » est revenue à la demande de Barbaros, après
   avoir été retirée quelques jours plus tôt.

   ELLE NE MÈNE PAS AU FORMULAIRE, et c'est la seule des trois dans ce
   cas : le site ne sait réserver qu'un trajet d'une adresse à une autre.
   L'envoyer vers un formulaire qui ne peut pas la prendre, ce serait
   promettre puis se dédire au dernier écran. Elle ouvre « Contact » — un
   chauffeur à l'heure se négocie de vive voix, et c'est de toute façon ce
   qui se passerait. Deux contrôles vérifient les deux comportements.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-services.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'networkidle'});
await p.waitForTimeout(500);
const noms = await p.locator('.service b').allTextContents();
check('trois cartes de services', noms.length===3, noms.join(' | '));
check('la mise à disposition est au milieu', noms[1]==='Mise à disposition', noms[1]);
const img = await p.locator('.service').nth(1).locator('.service-image').getAttribute('style');
check('avec sa photo', img.includes('service-chauffeur.jpg'), img);
const charge = await p.evaluate(()=>new Promise(r=>{
  const i=new Image(); i.onload=()=>r(i.naturalWidth); i.onerror=()=>r(0);
  i.src='./photos/service-chauffeur.jpg';
}));
check('la photo se charge vraiment', charge>0, charge+' px');
// Elle ne doit pas mener au formulaire : le site ne sait pas la réserver.
await p.locator('.service').nth(1).click(); await p.waitForTimeout(300);
check('elle ouvre « Contact », pas le formulaire',
  await p.locator('#ecran-contact').isVisible() && !(await p.locator('#ecran-accueil').isVisible()));
await p.locator('.onglet[data-onglet="accueil"]').click(); await p.waitForTimeout(200);
await p.locator('.service').nth(0).click(); await p.waitForTimeout(300);
check('les deux autres mènent bien au formulaire', await p.locator('#ecran-accueil').isVisible());
// Traduite dans les deux langues.
await p.locator('.langues button[data-langue="en"]').click(); await p.waitForTimeout(300);
check('la carte est traduite en anglais',
  (await p.locator('.service b').allTextContents())[1]==='Hourly hire',
  (await p.locator('.service b').allTextContents()).join(' | '));
check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await p.locator('.langues button[data-langue="fr"]').click(); await p.waitForTimeout(200);
await p.locator('.services').scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
