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
import { readFileSync, readdirSync } from 'node:fs';
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
/* « Autre destination » N'A PLUS SA PROPRE GRILLE (28/09/2026) : le
   transformateur qui l'injectait au moment de construire a été supprimé,
   il n'y a plus qu'UN tarif au kilomètre pour tout le monde. On le lit
   donc dans « tarif_general_* », en rejouant TOUTES les migrations dans
   l'ordre (la seconde ne fait que corriger la première) — même règle que
   « verifier-tarif-hotel.mjs » et « test-doc.mjs ». */
const GENERAL = {};
const fichiers = readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort();
for (const f of fichiers) {
  const texte = readFileSync(join('supabase/migrations', f), 'utf8');
  const trouvailles = [];
  for (const m of texte.matchAll(/\('(tarif_general_\w+)'\s*,\s*'(\{[^']*\})'::jsonb/g))
    trouvailles.push({ gamme: m[1], valeur: m[2], index: m.index });
  for (const m of texte.matchAll(/update\s+public\.parametres_commerciaux\s+set\s+valeur\s*=\s*'(\{[^']*\})'[^;]*where\s+cle\s*=\s*'(tarif_general_\w+)'/gi))
    trouvailles.push({ gamme: m[2], valeur: m[1], index: m.index });
  trouvailles.sort((a,b)=>a.index-b.index);
  for (const t of trouvailles) GENERAL[t.gamme] = JSON.parse(t.valeur);
}
const genB = GENERAL.tarif_general_berline, genV = GENERAL.tarif_general_van;
/* Même arrondi que la page (« arrondiDizaine » d'itineraire-partage.js) :
   à la dizaine, et le 5 pile DESCEND — jamais Math.round. */
function arrondiDizaine(p){ const bas = Math.floor(p/10)*10; return (p-bas>5) ? bas+10 : bas; }
const KM = 52;
const AUTRE = [Math.max(arrondiDizaine(genB.par_km_centimes/100*KM), genB.minimum_centimes/100),
               Math.max(arrondiDizaine(genV.par_km_centimes/100*KM), genV.minimum_centimes/100)];
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
  /* Le client est rempli comme le ferait un vrai client : depuis le 23/09
     « Voir mon prix » refuse de partir sans nom ni téléphone (bloc 7). */
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
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
  /* Le client est rempli comme le ferait un vrai client : depuis le 23/09
     « Voir mon prix » refuse de partir sans nom ni téléphone (bloc 7). */
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
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
for(const [w,h] of [[320,640],[375,812],[390,844],[393,852],[430,932],[768,1024],[1024,768],[1280,800]]){
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
// 6. CLIENT ET RÉCEPTION SONT DEUX DOCUMENTS DISTINCTS. L'ancienne URL
//    ?reception= reste compatible, mais redirige vers l'espace Réception :
//    elle ne transforme plus cette page client en comptoir.
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/?reception=easyhotel-aeroville',{waitUntil:'domcontentloaded'}).catch(()=>{});
  check('ancienne URL comptoir : redirection vers l\'espace Réception', p.url().includes('/easyhotel-reception/'), p.url());
  await ctx.close(); }
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  check('client : aucun bouton des réservations de l\'hôtel dans le DOM', (await p.locator('#ctaResa').count())===0);
  check('client : les liens restent en ?h= (pas de mode réception)', (await p.$$eval('a.carte',a=>a.every(x=>x.getAttribute('href').includes('?h=easyhotel-aeroville')))));
  await ctx.close(); }
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=orly',{waitUntil:'load'});
  await p.waitForFunction(()=>document.getElementById('hotelDest')?.value==='orly',null,{timeout:8000}).catch(()=>{});
  const t=await p.evaluate(()=>{const ids=[...document.querySelectorAll('#blocCoordonnees label')].map(e=>e.id||e.getAttribute('for'));return {ordre:ids.join(','),titre:document.querySelector('#blocChambre .champ-titre').textContent};});
  check('moteur client : la chambre reste SOUS le nom, facultative', t.ordre.indexOf('clientNom')<t.ordre.indexOf('chambre') && /facultatif/i.test(t.titre), t.ordre+' / '+t.titre);
  await ctx.close(); }
// 7. VERT = REMPLI, ROUGE = IL MANQUE. Le défaut d'origine : côté client,
//    « Confirmer » contrôlait le nom et le téléphone deux écrans plus loin et
//    affichait son erreur sur une page cachée — le client appuyait, rien ne
//    bougeait. Le contrôle doit se faire AVANT de quitter la page des champs.
const etatsEH = p => p.evaluate(()=>({
  ok:[...document.querySelectorAll('.eh-ok')].map(e=>e.querySelector('input,select,textarea')?.id||e.id),
  manque:[...document.querySelectorAll('.eh-manque')].map(e=>e.querySelector('input,select,textarea')?.id||e.id||'bloc'),
  ecran:[...document.querySelectorAll('.ecran')].find(e=>e.getBoundingClientRect().height>0)?.id }));
{ const {ctx,p}=await nouveau();
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  await p.click('a.carte[data-dest="cdg"]');
  await p.waitForFunction(()=>document.getElementById('hotelDest')?.value==='cdg' && document.querySelector('.eh-ok'),null,{timeout:8000}).catch(()=>{});
  let e=await etatsEH(p);
  check('après le choix d\'une destination, le trajet rempli est VERT', ['depart','hotelDest','hotelTerminal'].every(x=>e.ok.includes(x)), e.ok.join(','));
  check('avant toute validation, rien n\'est rouge', e.manque.length===0, e.manque.join(','));
  check('l\'heure pré-remplie n\'est pas verte d\'office (personne ne l\'a choisie)', !e.ok.includes('heure'), e.ok.join(','));
  await p.click('#btnVoirPrix'); await p.waitForTimeout(700);
  e=await etatsEH(p);
  check('« Voir mon prix » sans nom ni téléphone : on RESTE sur la page', e.ecran==='ecran-accueil', e.ecran);
  check('… et le nom et le téléphone sont en ROUGE', e.manque.includes('clientNom') && e.manque.includes('clientTel'), e.manque.join(','));
  check('… la chambre (facultative côté client) n\'est pas rouge', !e.manque.includes('chambre'));
  /* Si la page est partie quand même, la suite ne peut plus rien éprouver
     ici : on le dit par un contrôle rouge nommé, pas par un délai expiré. */
  if(e.ecran==='ecran-accueil'){
  const vu=await p.evaluate(()=>{const r=document.querySelector('.eh-manque')?.getBoundingClientRect();return !!r&&r.top>=0&&r.bottom<=innerHeight;});
  check('… et l\'écran est descendu jusqu\'au premier champ en rouge', vu);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','0612'); await p.waitForTimeout(200);
  e=await etatsEH(p);
  check('un nom saisi passe du rouge au VERT', e.ok.includes('clientNom') && !e.manque.includes('clientNom'));
  check('un numéro trop court reste ROUGE', e.manque.includes('clientTel'));
  await p.fill('#clientTel','06 12 34 56 78'); await p.waitForTimeout(200);
  await p.click('#btnVoirPrix');
  const passe=await p.waitForFunction(()=>document.getElementById('ecran-vehicules').getBoundingClientRect().height>0,null,{timeout:8000}).then(()=>true).catch(()=>false);
  check('tout rempli : « Voir mon prix » mène bien aux prix', passe);
  }
  check('validation client : aucune erreur', p.errs.length===0, p.errs.join(';'));
  await ctx.close(); }
await b.close();
await new Promise(r => serveur.close(r));
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){console.log('=== ÉCHECS ('+ko.length+') ===');ko.forEach(x=>console.log('  ✘ '+x));process.exit(1);}
