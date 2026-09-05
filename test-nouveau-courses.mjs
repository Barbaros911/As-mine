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
   — ELLE RESTE « EN ATTENTE ». Le site ne peut pas savoir si Barbaros a
     confirmé — la réponse arrive sur WhatsApp. Afficher autre chose
     serait inventer un état qu'on n'a pas.
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
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await ctx.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });

await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);

// --- Un onglet doit MENER quelque part ---
await p.locator('.onglet[data-onglet="courses"]').click();
await p.waitForTimeout(300);
check('l\'onglet « Mes courses » ouvre un écran', await p.locator('#ecran-courses').isVisible());
check('sans course, on le dit et on propose d\'en réserver une',
  await p.locator('#videCourses').isVisible());
check('l\'onglet allumé suit l\'écran',
  (await p.locator('.onglet.actif [data-t="nav_courses"]').count())===1);

await p.locator('.onglet[data-onglet="contact"]').click();
await p.waitForTimeout(300);
check('l\'onglet « Contact » ouvre un écran', await p.locator('#ecran-contact').isVisible());
const tel = await p.locator('.contact-lien').first().getAttribute('href');
check('il porte un vrai numéro appelable', tel==='tel:+33759312433', tel);

// --- Une réservation, puis on la retrouve ---
await p.locator('.onglet[data-onglet="accueil"]').click();
await p.type('#depart','vendome',{delay:12}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
// Deux onglets mènent à l'accueil : sans identité propre, ils
// s'allumeraient tous les deux.
check('un seul onglet allumé à la fois',
  (await p.locator('.onglet.actif').count())===1,
  String(await p.locator('.onglet.actif').count()));
check('pendant le tunnel, c\'est « Réserver » qui est allumé',
  (await p.locator('.onglet.actif').getAttribute('data-onglet'))==='reserver',
  await p.locator('.onglet.actif').getAttribute('data-onglet'));
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
check('et son prix', (await p.locator('.course-prix').textContent()).replace(/\s/g,'')==='70,00€',
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
  (await p.locator('.course-prix').textContent()).replace(/\s/g,'')==='70.00€',
  await p.locator('.course-prix').textContent());

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
