/* =====================================================================
   TEST-NOUVEAU-PREAVIS.MJS — il n'y a plus de préavis, seulement l'heure
   passée
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros : « je veux pouvoir recevoir
   une demande même lorsque le client souhaite partir immédiatement ». Le
   préavis de 15 minutes REFUSAIT la course ; elle part maintenant, soumise
   à disponibilité. Ce fichier verrouillait le préavis : il verrouille
   désormais son absence, et ce qui reste vrai.

   CE QUI EST VERROUILLÉ :
   — un départ dans 5 minutes est accepté, et va jusqu'aux prix ;
   — une heure RÉELLEMENT passée reste refusée, avec son propre message ET
     une sortie : « Partir dès que possible » ;
   — le contrôle est refait à la soumission (bouton rallumé de force) ;
   — la date du jour se compose en local, jamais en UTC (le bug de 1 h du
     matin, que seul le déplacement de l'horloge atteint) ;
   — le formulaire s'ouvre sur le prochain créneau de la grille des
     5 minutes, sans délai ajouté, et la borne du champ est ce créneau ;
   — le pas vit à deux endroits (step et PAS_MINUTES) et ils s'accordent ;
   — plus aucune trace du préavis dans la page.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-preavis.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Une heure locale à N minutes d'ici, dans le fuseau du navigateur :
   « toISOString » rendrait de l'UTC, et le test tomberait selon l'heure. */
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
/* Une page dont l'horloge est posée à un instant précis, à Paris. */
async function pageA(instant){
  const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',timezoneId:'Europe/Paris'});
  await ctx.addInitScript(([i]) => {
    const faux = new Date(i).getTime();
    const Vrai = Date; const dec = faux - Vrai.now();
    // eslint-disable-next-line no-global-assign
    Date = class extends Vrai {
      constructor(...a){ if(a.length===0) super(Vrai.now()+dec); else super(...a); }
      static now(){ return Vrai.now()+dec; }
    };
  }, [instant]);
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);
  return { ctx, p };
}

/* --- UN DÉPART DANS 5 MINUTES EST ACCEPTÉ ----------------------------- */
let { ctx, p } = await page();
let t = dansNMinutes(5);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('un départ dans 5 min allume le bouton', !(await p.locator('#btnVoirPrix').isDisabled()));
check('l\'écriteau « trop proche » n\'existe plus', (await p.locator('#tropTot').count()) === 0);
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
check('et il mène jusqu\'aux prix', await p.locator('#ecran-vehicules').isVisible());
await ctx.close();

/* --- UNE HEURE PASSÉE : REFUSÉE, MAIS AVEC UNE SORTIE ----------------- */
({ ctx, p } = await page());
t = dansNMinutes(-120);
await p.fill('#date', t.date); await p.fill('#heure', t.heure);
await p.waitForTimeout(300);
check('une heure passée éteint le bouton', await p.locator('#btnVoirPrix').isDisabled());
check('et le dit', !(await p.locator('#heurePassee').isHidden()));
/* Le contrôle est refait à la soumission : le bouton rallumé de force ne
   fait pas passer la course — le cas d'une page laissée ouverte. */
await p.evaluate(()=>{ document.getElementById('btnVoirPrix').disabled = false; });
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(700);
check('appuyer quand même ne fait pas passer la course',
  await p.locator('#ecran-accueil').isVisible() && !(await p.locator('#ecran-vehicules').isVisible()));
const refus = await p.locator('#heurePassee').innerText().catch(()=> '');
check('avec son message à elle, toujours affiché', /passée/i.test(refus) && await p.locator('#heurePassee').isVisible(), refus);
/* LA SORTIE : un client qui voulait partir maintenant n'a rien à corriger. */
await p.locator('#btnPasseAsap').click(); await p.waitForTimeout(300);
check('« Partir dès que possible » enlève le refus', await p.locator('#heurePassee').isHidden());
check('et rallume le bouton', !(await p.locator('#btnVoirPrix').isDisabled()));
check('en mode « Dès que possible »', (await p.locator('#btnQuandAsap').getAttribute('aria-pressed')) === 'true');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
check('et la demande va jusqu\'aux prix', await p.locator('#ecran-vehicules').isVisible());
await ctx.close();

/* --- « DÈS QUE POSSIBLE » ET « PROGRAMMER » -------------------------- */
({ ctx, p } = await page());
check('par défaut, on programme (la plupart des courses sont réservées à l\'avance)',
  (await p.locator('#btnQuandProg').getAttribute('aria-pressed')) === 'true' && await p.locator('#blocDateHeure').isVisible());
await p.locator('#btnQuandAsap').click(); await p.waitForTimeout(200);
const note = await p.locator('#noteAsap').innerText();
check('« Dès que possible » ne promet aucun délai', /disponibilit/i.test(note) && !/\d+\s*min/.test(note), note);
await p.locator('#btnQuandProg').click(); await p.waitForTimeout(200);
check('« Programmer » rend la date et l\'heure', await p.locator('#blocDateHeure').isVisible());
await ctx.close();

/* --- LA DATE DU JOUR, VUE À 1 H DU MATIN -----------------------------
   La date proposée venait de « toISOString » (UTC) : à 1 h à Paris il est
   encore la veille en UTC, et le site proposait hier. Ne se voit jamais en
   journée : on déplace l'horloge pour aller le chercher. -------------- */
{
  const { ctx:c1, p:pn } = await pageA('2026-09-07T01:12:00+02:00');
  const j = await pn.evaluate(()=>{ const d=document.getElementById('date'); return { valeur:d.value, borne:d.min }; });
  check('à 1 h du matin, la date proposée est CELLE DU JOUR', j.valeur==='2026-09-07', j.valeur);
  check('et la borne du champ interdit la veille', j.borne==='2026-09-07', j.borne);
  await pn.fill('#date','2026-09-06'); await pn.fill('#heure','10:00'); await pn.waitForTimeout(300);
  check('choisir hier 10 h éteint le bouton', await pn.locator('#btnVoirPrix').isDisabled());
  check('et le dit', !(await pn.locator('#heurePassee').isHidden()));
  await c1.close();
}

/* --- LA BORNE ET LE DÉFAUT : LE PROCHAIN CRÉNEAU, SANS DÉLAI ---------- */
for (const [instant, attendu] of [['2026-09-07T09:55:00+02:00', '09:55'],
                                  ['2026-09-07T01:41:00+02:00', '01:45'],
                                  ['2026-09-07T03:27:00+02:00', '03:30']]) {
  const { ctx:cd, p:pd } = await pageA(instant);
  const h = await pd.locator('#heure').inputValue();
  check('à '+instant.slice(11,16)+', le formulaire s\'ouvre sur '+attendu, h===attendu, h);
  check('à '+instant.slice(11,16)+', la valeur proposée est la borne du champ',
    h===await pd.locator('#heure').getAttribute('min'), h+' contre '+await pd.locator('#heure').getAttribute('min'));
  check('à '+instant.slice(11,16)+', le bouton est allumé', !(await pd.locator('#btnVoirPrix').isDisabled()));
  await cd.close();
}
/* 1 h 40 à 1 h 41 est passé d'une minute ; 1 h 42 ne l'est pas. */
{
  const { ctx:ch, p:ph } = await pageA('2026-09-07T01:41:00+02:00');
  await ph.fill('#heure','01:40'); await ph.waitForTimeout(300);
  check('1 h 40 à 1 h 41 : « déjà passée »', !(await ph.locator('#heurePassee').isHidden()) && await ph.locator('#btnVoirPrix').isDisabled());
  await ph.fill('#heure','01:41'); await ph.waitForTimeout(300);
  check('1 h 41 à 1 h 41 : la minute en cours n\'est pas passée', await ph.locator('#heurePassee').isHidden() && !(await ph.locator('#btnVoirPrix').isDisabled()));
  await ph.fill('#date','2026-09-08'); await ph.fill('#heure','01:40'); await ph.waitForTimeout(300);
  check('demain 1 h 40 est accepté : la borne a été retirée',
    (await ph.locator('#heure').getAttribute('min'))===null && !(await ph.locator('#btnVoirPrix').isDisabled()),
    'min='+await ph.locator('#heure').getAttribute('min'));
  await ch.close();
}

/* --- LE PAS DES CRÉNEAUX, ET PLUS AUCUNE TRACE DU PRÉAVIS ------------- */
const src = await (await fetch('http://127.0.0.1:8099/index.html')).text();
const step = src.match(/id="heure"[^>]*step="(\d+)"/);
const pas = src.match(/var PAS_MINUTES\s*=\s*(\d+)/);
check('le champ d\'heure et le script ont le même pas',
  step && pas && Number(step[1]) === Number(pas[1]) * 60, step && pas ? step[1]+' s contre '+pas[1]+' min' : '');
check('le pas est bien de 5 minutes', pas && pas[1] === '5', pas ? pas[1] : '');
check('plus de constante de préavis dans la page', !/var DELAI_MINIMUM_MIN/.test(src));
check('plus de phrase de préavis (tot_note) dans la page', !/tot_note:/.test(src));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
