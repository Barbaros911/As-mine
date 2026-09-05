/* =====================================================================
   TEST-NOUVEAU-BON.MJS — le récapitulatif et le bon de réservation
   ---------------------------------------------------------------------
   Trois choses y sont verrouillées, et chacune l'est parce qu'elle
   coûterait cher si elle cassait :

   1. LA TVA EST INCLUSE, pas ajoutée. La calculer sur le TTC donnerait
      4,83 € au lieu de 4,39 € sur une course à 48,28 €, et le prix HT
      annoncé serait faux.

   2. RIEN NE PART SANS NOM NI TÉLÉPHONE. Une demande anonyme est une
      course que le chauffeur ne peut pas honorer.

   3. LA FORME DU MESSAGE WHATSAPP EST UN CONTRAT avec le lecteur
      « Coller une demande » de l'espace exploitant. Celui-ci ne devine
      rien aux libellés — un client espagnol écrit « Salida » — il lit la
      PLACE des choses. Six contrôles portent donc sur la structure du
      message, pas sur son texte.

   Les services extérieurs sont injoignables depuis la machine de
   développement : on répond à leur place, et window.open est remplacé
   pour noter l'adresse demandée au lieu de la suivre.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-bon.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}
]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}
]})}));
await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
// WhatsApp ne doit pas s'ouvrir pour de vrai : on note l'adresse demandée
// au lieu de la suivre. Écouter l'onglet ne suffit pas — au moment où il
// apparaît, son adresse est encore « about:blank ».
await ctx.addInitScript(() => {
  window.__liens = [];
  window.open = (url) => { window.__liens.push(url); return null; };
});

await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.type('#depart','vendome',{delay:12}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(400);

check('récapitulatif atteint', await p.locator('#ecran-recap').isVisible());
const ht = await p.locator('#recapHT').textContent();
const tva = await p.locator('#recapTVA').textContent();
const tot = await p.locator('#recapTotal').textContent();
// 48,28 TTC → HT 43,89 et TVA 4,39. La TVA est INCLUSE, pas ajoutée.
check('la TVA est retirée du TTC, pas ajoutée',
  ht.replace(/\s/g,'')==='43,89€' && tva.replace(/\s/g,'')==='4,39€', ht+' / '+tva);
check('le total est celui de l\'écran des prix', tot.replace(/\s/g,'')==='48,28€', tot);

// Sans coordonnées, rien ne part.
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(300);
check('pas d\'envoi sans nom ni téléphone', await p.locator('#ecran-recap').isVisible());
check('et on dit pourquoi', await p.locator('#erreurCoordonnees').isVisible());

await p.fill('#clientNom','Jean Martin');
await p.fill('#clientTel','06 12 34 56 78');
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(600);

check('le bon s\'affiche', await p.locator('#ecran-bon').isVisible());
const ref = await p.locator('#bonRef').textContent();
// « ELA », jamais « ASM » : ASM venait du nom du dépôt, pas de la marque.
check('la référence porte le préfixe de la marque', /^ELA-\d{2}-\d{2}-\d{4}$/.test(ref), ref);
check('plus aucune référence ASM n\'est créée', !ref.startsWith('ASM'), ref);
check('le bon dit « en attente », jamais « confirmé »',
  (await p.locator('.bon-etat').textContent()).toLowerCase().includes('attente'));
check('le bon dit ce qui le rendra ferme',
  (await p.locator('.bon-note').textContent()).includes('ferme'));

// Le message WhatsApp doit rester lisible par « Coller une demande ».
const liens = await p.evaluate(()=>window.__liens);
check('WhatsApp a bien été ouvert', liens.length>0, liens.length+'');
const msg = decodeURIComponent((liens[0]||'').split('text=')[1]||'');
const lignes = msg.split('\n');
check('six lignes, pas une de plus', lignes.length===6, lignes.length+'');
check('la référence y est', lignes[0].includes(ref), lignes[0]);
check('les deux premières lignes « … : … » sont les adresses',
  lignes[1].startsWith('Départ : ') && lignes[2].startsWith('Arrivée : '));
check('la date est au format que relit l\'espace exploitant',
  /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}/.test(lignes[3]), lignes[3]);
check('le dernier montant en euros est le prix',
  (msg.match(/(\d[\d\s ]*[.,]\d{2})\s*€/g)||[]).pop().replace(/\s/g,'')==='48,28€');
check('la dernière ligne est « nom — téléphone », sans deux-points',
  lignes[5].includes(' — ') && !lignes[5].includes(' : '), lignes[5]);
check('aucune donnée du client dans les cinq premières lignes',
  !lignes.slice(0,5).join(' ').includes('Jean Martin'));

check('aucun bouton d\'action doré sur le bon — le client n\'a plus rien à faire',
  (await p.locator('#ecran-bon .bouton').count())===0);
check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
await p.locator('#btnRetourVehicules').count();
await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
