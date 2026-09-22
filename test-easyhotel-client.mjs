/* =====================================================================
   LA PAGE DU QR easyHotel → LE MOTEUR, SUR LE SITE CONSTRUIT (22/09/2026)
   ---------------------------------------------------------------------
   Le tunnel tient en deux fichiers qui ne se voient pas : la page du QR
   (sites/easyhotel-client/) et le moteur (index.html + hotel-engine-polish.js,
   injecté par construire.sh). Seul le site CONSTRUIT les réunit : la suite
   construit et sert elle-même, comme test-nouveau-bascule.

   Ce qu'elle éprouve, pour chacune des sept cartes : la carte, le clic, le
   bon hôtel au départ, la bonne destination, le même prix sur l'écran des
   gammes. Puis « Autre destination » (le calcul à la distance, pas un
   forfait), les liens légaux, la langue, et la mise en page de 375 à 1280 px.

   AUCUN MONTANT N'EST RECOPIÉ : la grille est LUE dans la source serveur.
   Une baisse décidée par Barbaros ne fait pas tomber la suite ; un écart
   entre la carte et le moteur, si.

   ELLE AURAIT ATTRAPÉ LE GEL DU MOTEUR : hotel-engine-polish.js réécrivait un
   texte identique sous un MutationObserver, et la page ne rendait plus
   jamais la main. Aucune suite n'ouvrait le moteur construit en mode hôtel.
   ===================================================================== */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

execSync('sh construire.sh', { cwd: process.cwd(), stdio: 'ignore' });
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8095, '127.0.0.1', r));
const BASE='http://127.0.0.1:8095';

const SRC = readFileSync('supabase/migrations/20260916100000_current_tariff_source.sql','utf8');
const ATT = {};
for (const m of SRC.matchAll(/\('(\w+)','[^']*','(berline|van)',(\d+)\)/g))
  (ATT[m[1]] ||= [])[m[2]==='berline'?0:1] = Number(m[3])/100;
const autre = JSON.parse(SRC.match(/'tarif_easyhotel_autre','(\{[^']*\})'/)[1]);
const KM = 52;
const AUTRE = [Math.max(Math.round(autre.berline_par_km_centimes/100*KM), autre.berline_minimum_centimes/100),
               Math.max(Math.round(autre.van_par_km_centimes/100*KM), autre.van_minimum_centimes/100)];
/* UNE PAGE FIGÉE NE RÉPOND PLUS À « evaluate », QUI N'A PAS DE DÉLAI : sans
   ce garde-fou la suite attendrait pour toujours au lieu d'échouer. */
setTimeout(() => { console.log('=== ÉCHECS (1) ===\n  ✘ le parcours ne répond plus : le moteur est figé (boucle ?)'); process.exit(1); }, 240000).unref();
const b=await chromium.launch();
const ok=[],ko=[];const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
async function nouveau(locale='fr-FR',w=390,h=844){
  const ctx=await b.newContext({viewport:{width:w,height:h},locale});
  await ctx.route('**://api-adresse.data.gouv.fr/**',r=>{const q=decodeURIComponent(r.request().url()).toLowerCase();
    if(q.includes('belle borne'))return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[{geometry:{coordinates:[2.5512,48.9701]},properties:{label:"10 Rue de la Belle Borne, 93410 Tremblay-en-France"}}]})});
    return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[]})});});
  await ctx.route('**://photon.komoot.io/**',r=>{const q=decodeURIComponent(r.request().url()).toLowerCase();
    const vend={geometry:{coordinates:[2.3294,48.8674]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}};
    const vers={geometry:{coordinates:[2.1301,48.8014]},properties:{name:"Château de Versailles",osm_key:"tourism",osm_value:"attraction",postcode:"78000",city:"Versailles",countrycode:"FR"}};
    return r.fulfill({contentType:'application/json',body:JSON.stringify({features:[q.includes('vendome')?vend:vers]})});});
  await ctx.route('**://router.project-osrm.org/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({routes:[{distance:KM*1000,duration:3000}]})}));
  await ctx.route('**://api.openrouteservice.org/**',r=>r.abort());
  await ctx.route(u=>!u.href.startsWith('http://127.0.0.1')&&!/data\.gouv|photon|osrm/.test(u.href),r=>r.abort());
  const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  p.on('response',r=>{if(r.url().startsWith(BASE)&&r.status()>=400)p.errs.push(r.status()+' '+r.url());});
  return {ctx,p};
}
// 1. landing → chaque carte → moteur
for(const cle of Object.keys(ATT)){
  const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  const txt=(await p.locator(`.carte[data-dest="${cle}"] .prix`).innerText()).replace(/\s/g,'');
  check(`landing ${cle} affiche ${ATT[cle].join('/')}`, txt.includes(ATT[cle][0]+'€')&&txt.includes(ATT[cle][1]+'€'), txt);
  await p.locator(`.carte[data-dest="${cle}"]`).click();
  await p.waitForURL(/application\.html/); await p.waitForTimeout(1500);
  const st=await p.evaluate(()=>({sel:hotelDest.value,dep:document.getElementById('depart').value,f:document.getElementById('destForfait').textContent}));
  check(`${cle} : destination présélectionnée`, st.sel===cle, st.sel);
  check(`${cle} : départ = easyHotel`, /Belle Borne/.test(st.dep), st.dep);
  check(`${cle} : forfait moteur ${ATT[cle].join('/')}`, st.f.replace(/\s/g,'')===`Berline${ATT[cle][0]},00€·Van${ATT[cle][1]},00€`, st.f);
  if(cle==='paris'){ await p.fill('#arrivee',''); await p.type('#arrivee','vendome',{delay:10}); await p.waitForTimeout(900); await p.locator('#arriveeList [role=option]').first().click(); await p.waitForTimeout(300);}
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
  const cartes=(await p.locator('.veh-prix').allTextContents()).map(x=>x.replace(/\s/g,''));
  check(`${cle} : écran des prix ${ATT[cle].join('/')}`, cartes[0]===ATT[cle][0]+',00€'&&cartes[1]===ATT[cle][1]+',00€', cartes.join(' | '));
  check(`${cle} : aucune erreur JS / 404`, p.errs.length===0, p.errs.join(' ; '));
  await ctx.close();
}
// 2. Autre destination
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  await p.locator('a.autre').click(); await p.waitForURL(/application/); await p.waitForTimeout(1500);
  const st=await p.evaluate(()=>({sel:hotelDest.value,dep:document.getElementById('depart').value,f:document.getElementById('destForfait').hidden}));
  check('autre : option « Autre destination » choisie', st.sel==='', JSON.stringify(st.sel));
  check('autre : départ easyHotel conservé', /Belle Borne/.test(st.dep), st.dep);
  check('autre : aucun forfait affiché', st.f===true);
  await p.type('#arrivee','versailles',{delay:10}); await p.waitForTimeout(900);
  await p.locator('#arriveeList [role=option]').first().click(); await p.waitForTimeout(300);
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
  const cartes=(await p.locator('.veh-prix').allTextContents()).map(x=>x.replace(/\s/g,''));
  check(`autre : prix à la distance (${KM} km → ${AUTRE.join(' € / ')} €), pas un forfait`, cartes[0]===AUTRE[0]+',00€'&&cartes[1]===AUTRE[1]+',00€', cartes.join(' | '));
  check('autre : aucune erreur', p.errs.length===0, p.errs.join(';'));
  await ctx.close(); }
// 3. liens légaux
for(const doc of ['mentions','privacy']){ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  await p.locator(`.pied a[href*="doc=${doc}"]`).click(); await p.waitForURL(/application/); await p.waitForTimeout(1200);
  const s=await p.evaluate(()=>({actif:document.querySelector('.ecran.actif')?.id,t:document.getElementById('legalTitre').textContent,n:document.getElementById('legalCorps').textContent.length}));
  check(`lien ${doc} ouvre le document`, s.actif==='ecran-legal'&&s.n>200, JSON.stringify(s));
  await ctx.close(); }
// 4. langue
{ const {ctx,p}=await nouveau('en-US');
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  check('EN auto : titre anglais', /Where would you like to go/.test(await p.locator('#destinations > h2').innerText()));
  await p.locator('.lang[data-lang="fr"]').click();
  check('bascule FR', /Où souhaitez-vous/.test(await p.locator('#destinations > h2').innerText()));
  await ctx.close(); }
// 5. largeurs : débordement, zones tactiles, recouvrements, liens contact
for(const [w,h] of [[375,812],[390,844],[393,852],[430,932],[768,1024],[1024,768],[1280,800]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'load'});
  const r=await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';const sw=document.documentElement.scrollWidth;
    const petits=[...document.querySelectorAll('a,button')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&(b.height<44||b.width<44);}).map(e=>e.className||e.textContent.trim());
    const couverts=[...document.querySelectorAll('a,button')].filter(e=>{const b=e.getBoundingClientRect();if(!b.width)return false;e.scrollIntoView({block:'center'});const c=e.getBoundingClientRect();const t=document.elementFromPoint(c.x+c.width/2,c.y+c.height/2);return !(t&&(t===e||e.contains(t)));}).map(e=>e.className);
    const coupes=[...document.querySelectorAll('.px b,.nom b')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent);
    const hero=document.querySelector('.carte').getBoundingClientRect().top+scrollY;
    return {sw,petits,couverts,coupes,premiere:Math.round(hero)};});
  check(`${w}px : pas de débordement`, r.sw===w, r.sw);
  check(`${w}px : zones tactiles ≥ 44 px`, r.petits.length===0, r.petits.join(','));
  check(`${w}px : aucun bouton recouvert`, r.couverts.length===0, r.couverts.join(','));
  check(`${w}px : aucun prix/nom coupé`, r.coupes.length===0, r.coupes.join(','));
  check(`${w}px : première carte visible sans défiler (y=${r.premiere})`, r.premiere < h, r.premiere);
  check(`${w}px : aucune erreur`, p.errs.length===0, p.errs.join(';'));
  await ctx.close(); }
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  check('WhatsApp → wa.me/33759312433', (await p.locator('.btns a.wa').getAttribute('href'))==='https://wa.me/33759312433');
  check('Appeler → tel:+33759312433', (await p.locator('.btns a[href^="tel:"]').getAttribute('href'))==='tel:+33759312433');
  check('aucune seconde grille : deux prix par carte, pas un de plus', (await p.locator('[data-g]').count())===2*Object.keys(ATT).length);
  check('une carte par forfait de la source serveur', (await p.locator('.carte').count())===Object.keys(ATT).length);
  await ctx.close(); }
await b.close();
await new Promise(r => serveur.close(r));
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){console.log('=== ÉCHECS ('+ko.length+') ===');ko.forEach(x=>console.log('  ✘ '+x));process.exit(1);}
