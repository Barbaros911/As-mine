/* =====================================================================
   TEST-NOUVEAU-LANGUES.MJS — français et anglais
   ---------------------------------------------------------------------
   Deux langues, et deux seulement. Ce que la suite verrouille :

   — LE REPLI EST L'ANGLAIS, pas le français. Un visiteur allemand,
     italien ou japonais qui atterrit à Roissy lit bien plus probablement
     l'anglais qu'un site en français. Un contrôle ouvre la page avec un
     navigateur allemand et exige de l'anglais.
   — LE CHOIX EXPLICITE l'emporte et survit au rechargement.
   — AUCUNE CLÉ NE MANQUE : chaque texte français a son équivalent
     anglais. C'est le contrôle qui attrape l'oubli d'une traduction.
   — LES FORMATS SUIVENT LA LANGUE : « 48,28 € » en français, « 48.28 € »
     en anglais. Une virgule décimale lue comme un séparateur de milliers,
     c'est un prix cent fois trop grand.
   — LE MESSAGE À L'EXPLOITANT RESTE FRANÇAIS quoi qu'il arrive, avec sa
     virgule décimale et sa date en JJ/MM/AAAA : Barbaros lit du français,
     et son lecteur de demandes attend ce format.
   — LA BARRE DU BAS porte ses libellés à côté d'une icône : c'est
     l'endroit qu'on oublie en traduisant, et celui où remplacer le texte
     de l'élément entier effacerait le dessin.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-langues.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

async function page(ctx){
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });
  return p;
}

// --- Un visiteur français ---
let ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
let p = await page(ctx);
await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('un navigateur français ouvre en français',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');

// --- Un visiteur allemand : ni français ni anglais → anglais ---
await ctx.close();
ctx = await b.newContext({viewport:{width:390,height:844},locale:'de-DE'});
p = await page(ctx);
await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('un navigateur allemand ouvre en anglais, pas en français',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Book a ride',
  await p.locator('[data-t="reserver_titre"]').textContent());

// --- Il n'existe que deux langues ---
const boutons = await p.locator('.langues button').allTextContents();
check('deux langues et deux seulement', boutons.join('/')==='FR/EN', boutons.join('/'));

// --- Le choix explicite l'emporte et se mémorise ---
await p.locator('.langues button[data-langue="fr"]').click();
await p.waitForTimeout(200);
check('le choix explicite bascule la page',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('et il survit au rechargement, malgré un navigateur allemand',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');

// --- Aucune clé ne manque : rien ne doit rester en français en anglais ---
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(250);
const oublis = await p.evaluate(()=>{
  const fr = window.ELA_TEXTES.fr, en = window.ELA_TEXTES.en;
  return Object.keys(fr).filter(k => !(k in en));
});
check('chaque texte français a son équivalent anglais', oublis.length===0, oublis.join(', '));

// Le site ne sait réserver qu'un trajet : il ne doit rien annoncer d'autre.
const vitrine = (await p.locator('#ecran-accueil').innerText()).toLowerCase();
check('la page ne vend plus de mise à disposition',
  !vitrine.includes('mise à disposition') && !vitrine.includes('hourly hire')
  && !vitrine.includes('by the hour'));
check('les cartes de services ne montrent que des trajets',
  (await p.locator('.service').count())===2,
  String(await p.locator('.service').count()));

// --- Un tunnel complet en anglais ---
await p.type('#depart','vendome',{delay:12}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
check('l\'écran des prix parle anglais',
  (await p.locator('.veh-detail').first().textContent()).startsWith('Up to'),
  await p.locator('.veh-detail').first().textContent());
const prixEn = await p.locator('.veh-prix').first().textContent();
check('le prix suit le format anglais', prixEn.replace(/\s/g,'')==='48.28€', prixEn);

await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(400);
// La barre du bas porte son libellé À CÔTÉ d'une icône : remplacer le texte
// de tout l'élément effacerait le dessin. Ces quatre-là sont donc les plus
// faciles à oublier en traduisant.
check('la barre du bas parle anglais elle aussi',
  (await p.locator('[data-t="nav_accueil"]').textContent())==='Home'
  && (await p.locator('[data-t="nav_courses"]').textContent())==='My rides',
  await p.locator('[data-t="nav_accueil"]').textContent());
check('et ses icônes sont toujours là',
  (await p.locator('.onglet svg').count())===4,
  String(await p.locator('.onglet svg').count()));
check('le récapitulatif parle anglais',
  (await p.locator('[data-t="total"]').textContent())==='Total to pay');

// --- Basculer en français réécrit ce qui est déjà affiché ---
await p.locator('.langues button[data-langue="fr"]').click();
await p.waitForTimeout(300);
check('basculer réécrit le récapitulatif déjà rempli',
  (await p.locator('[data-t="total"]').textContent())==='Total à régler');
check('et le prix repasse au format français',
  (await p.locator('#recapTotal').textContent()).replace(/\s/g,'')==='48,28€',
  await p.locator('#recapTotal').textContent());

// --- Le message à l'exploitant reste français quoi qu'il arrive ---
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(200);
await p.fill('#clientNom','John Smith'); await p.fill('#clientTel','+44 7700 900000');
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(500);
const msg = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
check('le message à l\'exploitant reste en français', msg.includes('Départ :') && msg.includes('Véhicule :'),
  msg.split('\n')[1]);
check('et son prix garde la virgule décimale française',
  /48,28\s*€/.test(msg), (msg.match(/[\d.,]+\s*€/g)||[]).join(' '));
check('et sa date reste JJ/MM/AAAA', /Date : \d{2}\/\d{2}\/\d{4}/.test(msg),
  msg.split('\n')[3]);

await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
