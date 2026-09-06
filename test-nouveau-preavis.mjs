/* =====================================================================
   TEST-NOUVEAU-PREAVIS.MJS — les 20 minutes de préavis
   ---------------------------------------------------------------------
   Il faut trouver un chauffeur, le prévenir, et qu'il roule jusqu'au
   client. Accepter un départ dans cinq minutes, c'est promettre ce qu'on
   ne peut pas tenir — et chez Elatransfer l'heure est ferme comme le prix.

   CE QUI EST VERROUILLÉ :

   — LE SEUIL EST UN REFUS, PAS UN AVERTISSEMENT. On éprouve les deux côtés
     de la frontière : 10 minutes est refusé, 40 minutes passe. Un test qui
     ne vérifierait que le refus laisserait passer un code qui refuse tout.
   — LE TEXTE ANNONCE LE MÊME DÉLAI QUE LE CODE. C'est le vrai piège de ce
     genre de règle : la constante bouge, la phrase reste, et le site
     annonce vingt minutes en en exigeant quarante. Le contrôle lit la
     constante DANS LA PAGE et la cherche dans la phrase, en français comme
     en anglais.
   — ON NE RENVOIE PAS LE CLIENT SANS RIEN. Quelqu'un qui veut une voiture
     tout de suite est un client, pas une erreur de saisie : téléphone et
     WhatsApp sont dans l'écriteau, comme pour une adresse hors zone.
   — UNE HEURE PASSÉE GARDE SON PROPRE MESSAGE. « Trop proche » ne veut
     rien dire pour hier.
   — LE CONTRÔLE EST REFAIT À LA SOUMISSION. Entre le moment où le client
     choisit son heure et celui où il appuie, le temps passe : une
     réservation laissée ouverte devient trop proche toute seule.
   — LA ZONE ET LE PRÉAVIS NE SE CONTREDISENT PAS. Ils éteignent le même
     bouton ; sans point de rendez-vous, le second à s'exécuter rallumerait
     ce que le premier vient d'éteindre.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-preavis.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Une heure locale à N minutes d'ici, au format des deux champs. Il faut
   la calculer dans le fuseau du navigateur : « toISOString » rendrait de
   l'UTC, et le test tomberait juste ou faux selon l'heure du jour. */
function dansNMinutes(n){
  const d = new Date(Date.now() + n*60000);
  const p = x => String(x).padStart(2,'0');
  return { date:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,
           heure:`${p(d.getHours())}:${p(d.getMinutes())}` };
}

async function page(){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.route('**supabase.co/**', r => r.abort());
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
  await p.locator('#arriveeList [role=option]').first().click();
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  return { ctx, p };
}

/* --- LE SEUIL, DES DEUX CÔTÉS ---------------------------------------- */
let { ctx, p } = await page();

let t = dansNMinutes(10);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 10 min est refusé', !(await p.locator('#tropTot').isHidden()));
check('et le bouton du prix est éteint', await p.locator('#btnVoirPrix').isDisabled());

t = dansNMinutes(40);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 40 min passe', await p.locator('#tropTot').isHidden());
check('et le bouton se rallume', !(await p.locator('#btnVoirPrix').isDisabled()));

/* Le seuil lui-même : 25 minutes doit passer, sinon la règle mord plus
   loin que ce qu'elle annonce. */
t = dansNMinutes(25);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('25 min passe : la règle ne mord pas plus loin qu\'annoncé',
  await p.locator('#tropTot').isHidden());

/* --- L'ÉCRITEAU DIT QUOI FAIRE --------------------------------------- */
t = dansNMinutes(5);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
const txt = await p.locator('#tropTot').innerText();
check('il annonce 20 minutes', /20\s*minutes/.test(txt), txt.replace(/\n/g,' | '));
check('et il donne un téléphone à appeler',
  (await p.locator('#tropTot a[href^="tel:"]').count())===1);
check('et WhatsApp',
  (await p.locator('#tropTot a[href*="wa.me"]').count())===1);

/* --- LE CONTRÔLE EST REFAIT À LA SOUMISSION -------------------------- */
/* On force le bouton à redevenir cliquable, comme si l'heure était encore
   bonne au moment du choix, et on appuie. Le site doit refuser QUAND MÊME :
   c'est le cas réel d'une page laissée ouverte. */
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1000);
check('appuyer quand même ne fait pas passer la course',
  await p.locator('#ecran-accueil').isVisible()
  && !(await p.locator('#ecran-vehicules').isVisible()));
check('et l\'écriteau reste affiché', !(await p.locator('#tropTot').isHidden()));

/* --- UNE HEURE PASSÉE GARDE SON PROPRE MESSAGE ----------------------- */
t = dansNMinutes(-120);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('une heure passée n\'est pas dite « trop proche »',
  await p.locator('#tropTot').isHidden());
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(600);
const refus = await p.locator('#refus').textContent();
check('elle a son message à elle', /déjà passée/i.test(refus), refus);

/* --- LA ZONE ET LE PRÉAVIS NE SE CONTREDISENT PAS -------------------- */
/* Une adresse hors zone éteint le bouton. Corriger ensuite l'heure ne doit
   PAS le rallumer : le second juge rallumerait ce que le premier a éteint
   s'ils ne se parlaient pas. */
await ctx.close();
({ ctx, p } = await page());
await p.evaluate(()=>{
  /* On déplace l'arrivée à Lille sans toucher au reste du formulaire. */
  const evt = new Event('input', {bubbles:true});
  document.getElementById('arrivee').value = "Lille";
  document.getElementById('arrivee').dispatchEvent(evt);
});
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({features:[{geometry:{coordinates:[3.0573,50.6292]},
    properties:{label:"Place du Général de Gaulle, 59000 Lille"}}]})}));
await p.fill('#arrivee','lille'); await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(300);
check('une arrivée hors zone éteint le bouton', await p.locator('#btnVoirPrix').isDisabled());
t = dansNMinutes(240);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('et corriger l\'heure ne le rallume PAS tant que la zone est mauvaise',
  await p.locator('#btnVoirPrix').isDisabled());
check('l\'écriteau « hors zone » est toujours là', !(await p.locator('#horsZone').isHidden()));
await ctx.close();

/* --- LE TEXTE ET LE CODE ANNONCENT LE MÊME DÉLAI ---------------------
   Le vrai piège de cette règle : la constante bouge, la phrase reste, et
   le site annonce vingt minutes en en exigeant quarante. On lit donc la
   constante DANS LA PAGE, et on la cherche dans les deux langues. ----- */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
const m = source.match(/var DELAI_MINIMUM_MIN\s*=\s*(\d+)/);
check('la constante du préavis existe', !!m, m ? m[1]+' minutes' : 'introuvable');
if(m){
  const n = m[1];
  const fr = source.match(/tot_note:"([^"]*)"/);
  const en = source.match(/tot_note:"([^"]*)"[\s\S]*?tot_note:"([^"]*)"/);
  check('la phrase française annonce le même nombre',
    fr && fr[1].includes(n+' minutes'), fr ? fr[1].slice(0,60)+'…' : '');
  check('la phrase anglaise aussi',
    en && en[2].includes(n+' minutes'), en ? en[2].slice(0,60)+'…' : '');
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
