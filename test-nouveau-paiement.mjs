/* =====================================================================
   TEST-NOUVEAU-PAIEMENT.MJS — espèces ou carte
   ---------------------------------------------------------------------
   POURQUOI CETTE QUESTION EXISTE. Le prix ne change pas d'un mode à
   l'autre : ce n'est pas un choix commercial, c'est une information de
   PRÉPARATION. Un chauffeur qui apprend en montant que le client règle
   par carte, et qui n'a pas son terminal, se retrouve à chercher un
   distributeur avec un client pressé — et il n'y en a pas dans un
   parking d'aéroport à 5 h du matin.

   Ce qui est verrouillé ici :

   — RIEN N'EST PRÉSÉLECTIONNÉ. Cocher « Espèces » par défaut donnerait
     une réponse que le client n'a pas donnée, et c'est exactement le cas
     où le chauffeur arrive sans terminal devant quelqu'un qui n'a pas un
     billet sur lui.
   — LE CHOIX EST OBLIGATOIRE. Sans lui, « Confirmer » ne confirme pas et
     la page dit pourquoi.
   — UN SEUL DES DEUX À LA FOIS, et il se voit : « aria-pressed » porte
     l'état, pas seulement la couleur.
   — LE LIBELLÉ SUIT LA LANGUE DU CLIENT À L'ÉCRAN, et reste en FRANÇAIS
     partout où c'est Barbaros ou son chauffeur qui lit — le message
     WhatsApp et le bon de l'exploitant.
   — LA PLACE DE LA LIGNE DANS LE MESSAGE : avant le prix, pour que le
     dernier montant en euros reste celui de la course. C'est ce que
     relira « Coller une demande ».
   — UNE COURSE ENREGISTRÉE AVANT que ce choix existe reste lisible : on
     affiche un tiret, on n'invente pas un mode de règlement.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-paiement.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));

await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await p.route('**supabase.co/**', r => r.fulfill({status:201, body:''}));
await ctx.addInitScript(()=>{
  window.__liens = [];
  window.open = (u)=>{ window.__liens.push(u); return null; };
});

await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);

// ---- La question est posée, et elle est visible ----
const especes = p.locator('[data-paiement="especes"]');
const carte   = p.locator('[data-paiement="carte"]');
check('la question est posée sur le récapitulatif',
  await especes.isVisible() && await carte.isVisible());
check('elle dit pourquoi : le chauffeur emporte son terminal',
  (await p.locator('[data-t="paiement_note"]').textContent()).includes('terminal'));
check('rien n\'est présélectionné',
  (await especes.getAttribute('aria-pressed'))==='false'
  && (await carte.getAttribute('aria-pressed'))==='false');

// Deux boutons sur lesquels on appuie une fois : ils doivent être atteignables.
const hauteurs = await p.evaluate(()=>
  [...document.querySelectorAll('[data-paiement]')].map(e=>Math.round(e.getBoundingClientRect().height)));
check('chaque bouton fait au moins 44 px de haut', hauteurs.every(h=>h>=44), hauteurs.join(' / '));

// ---- Sans choix, rien ne part ----
await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(250);
check('sans mode de règlement, la course ne part pas',
  await p.locator('#ecran-recap').isVisible() && !(await p.locator('#ecran-bon').isVisible()));
check('et la page dit pourquoi', await p.locator('#erreurPaiement').isVisible());
check('aucun message n\'est parti non plus',
  (await p.evaluate(()=>window.__liens.length))===0);

// ---- Un seul des deux à la fois ----
await especes.click(); await p.waitForTimeout(120);
check('choisir efface le message d\'erreur', !(await p.locator('#erreurPaiement').isVisible()));
check('« Espèces » est marqué choisi',
  (await especes.getAttribute('aria-pressed'))==='true'
  && (await carte.getAttribute('aria-pressed'))==='false');
await carte.click(); await p.waitForTimeout(120);
check('changer d\'avis déplace la marque, sans en laisser deux',
  (await carte.getAttribute('aria-pressed'))==='true'
  && (await especes.getAttribute('aria-pressed'))==='false');
// L'état ne doit pas tenir qu'à la couleur : mesuré, pas supposé.
const fonds = await p.evaluate(()=>[...document.querySelectorAll('[data-paiement]')]
  .map(e=>getComputedStyle(e).backgroundColor));
check('le bouton choisi se distingue à l\'œil aussi', fonds[0]!==fonds[1], fonds.join(' / '));

// ---- Le bon du client ----
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(800);
check('la course part une fois le mode choisi', await p.locator('#ecran-bon').isVisible());
check('le bon porte le mode de règlement',
  (await p.locator('#bonPaiement').textContent())==='Carte bancaire',
  await p.locator('#bonPaiement').textContent());

// ---- Le message à Barbaros ----
const msg = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
const L = msg.split('\n');
check('le message porte la ligne « Paiement »',
  L.some(x=>x==='Paiement : Carte bancaire'), L.join(' | '));
check('elle est posée AVANT le prix, pour ne pas voler le dernier montant',
  L.findIndex(x=>x.startsWith('Paiement :')) < L.findIndex(x=>x.startsWith('Prix :')));
check('le dernier montant en euros reste le prix de la course',
  (msg.match(/(\d[\d\s ]*[.,]\d{2})\s*€/g)||[]).pop().replace(/\s/g,'')==='48,28€');
check('la dernière ligne reste « nom — téléphone »',
  L[L.length-1]==='Jean Martin — 06 12 34 56 78', L[L.length-1]);

// ---- En anglais : le client lit sa langue, Barbaros lit le français ----
await p.evaluate(()=>localStorage.removeItem('ela_courses'));
await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.locator('.langues button[data-langue="en"]').click(); await p.waitForTimeout(200);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
check('les deux modes sont traduits',
  (await p.locator('[data-paiement="especes"] span').textContent())==='Cash'
  && (await p.locator('[data-paiement="carte"] span').textContent())==='Card',
  await p.locator('[data-paiement="especes"] span').textContent());
await p.fill('#clientNom','John Smith'); await p.fill('#clientTel','+44 7700 900000');
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(250);
check('le refus est traduit lui aussi',
  /pay/i.test(await p.locator('#erreurPaiement').textContent()),
  await p.locator('#erreurPaiement').textContent());
await p.locator('[data-paiement="especes"]').click();
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(800);
check('le bon anglais affiche « Cash »',
  (await p.locator('#bonPaiement').textContent())==='Cash',
  await p.locator('#bonPaiement').textContent());
const msgEn = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
check('mais le message à Barbaros reste en français',
  msgEn.includes('Paiement : Espèces'),
  msgEn.split('\n').find(x=>x.startsWith('Paiement')));

// ---- Côté exploitant ----
const course = (ref, extra) => Object.assign({
  ref, statut:"attente", cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
           date:"2026-09-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" },
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  prix:{ total:48.28, ht:43.89, tva:4.39 }
}, extra);
const ctx2 = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p2 = await ctx2.newPage();
p2.on('pageerror',e=>errs.push(e.message));
await ctx2.addInitScript(([a,c])=>{
  localStorage.setItem('ela_bookings', JSON.stringify([a,c]));
  localStorage.setItem('ela_exploitant', '04b72932f8ccb464');
}, [course("ELA-26-09-0001",{paiement:"carte", paiementNom:"Carte bancaire"}),
    course("ELA-26-09-0002",{})]);
await p2.goto('http://127.0.0.1:8099/nouveau.html?exploitant=1',{waitUntil:'domcontentloaded'});
await p2.waitForTimeout(600);
await p2.locator('.demande, .course-bord').first().click(); await p2.waitForTimeout(300);
check('le bon de l\'exploitant porte le mode de règlement',
  (await p2.locator('#bbPaiement').textContent())==='Carte bancaire',
  await p2.locator('#bbPaiement').textContent());
await p2.locator('#btnRetourBord').click(); await p2.waitForTimeout(300);
await p2.locator('.demande, .course-bord').nth(1).click(); await p2.waitForTimeout(300);
check('une course enregistrée avant ce choix reste lisible : un tiret, pas une invention',
  (await p2.locator('#bbPaiement').textContent())==='—',
  await p2.locator('#bbPaiement').textContent());

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

await ctx2.close(); await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
