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
/* 4 bis. AUCUN PARTENARIAT ANNONCÉ SANS ACCORD ÉCRIT (24/10/2026). easyHotel
   refuse d'être cité pour l'instant : ni pastille « easyHotel × », ni
   « partenaire », ni « opéré par » (Elatransfer n'exécute pas le transport),
   ni co-marquage dans le nom de l'onglet ou de l'icône. Son nom reste : c'est
   le lieu d'où l'on part. */
const SIGNES=/partenai|partner|×|opéré|operated|officiel|official/i;
const trouve=(t)=>(String(t).match(SIGNES)||[''])[0];
for(const langue of ['fr-FR','en-US']){
  { const {ctx,p}=await nouveau(langue);
    await p.goto(BASE+'/easyhotel-client/',{waitUntil:'load'});
    const s=await p.evaluate(async()=>{const l=document.querySelector('link[rel="manifest"]');
      const m=l?await (await fetch(l.href)).json():{};
      return {texte:document.body.innerText,titre:document.title,
        pomme:document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content||'',nom:m.name||'',court:m.short_name||''};});
    check(`${langue} page du QR : aucun signe de partenariat à l'écran`, !SIGNES.test(s.texte), trouve(s.texte));
    check(`${langue} page du QR : ni dans le titre, ni dans le nom de l'icône`, ![s.titre,s.pomme,s.nom,s.court].some(x=>SIGNES.test(x)), [s.titre,s.nom].join(' | '));
    check(`${langue} page du QR : l'icône ne s'appelle pas comme l'hôtel`, !/easy\s*hotel/i.test(s.pomme+' '+s.court), s.pomme+' / '+s.court);
    check(`${langue} page du QR : le nom de l'hôtel reste, comme lieu de départ`, /easyHotel Aéroville/.test(s.texte));
    await ctx.close(); }
  { const {ctx,p}=await nouveau(langue);
    await p.goto(BASE+'/application.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
    const s=await p.evaluate(()=>({texte:document.body.innerText,pastille:!!document.querySelector('.hotel-partner-chip')}));
    check(`${langue} moteur easyHotel : aucun signe de partenariat à l'écran`, !SIGNES.test(s.texte), trouve(s.texte));
    check(`${langue} moteur easyHotel : pas de pastille à son nom dans l'en-tête`, !s.pastille);
    await ctx.close(); }
}
// 4 bis. LA PHOTO DU BÂTIMENT (25/10/2026, prise par Barbaros) : servie par
// NOTRE site — jamais une image d'un autre (la précédente venait de celui
// d'easyHotel, sans accord, retirée le 20/10) — et chaque texte du bandeau se
// lit dessus. Mesuré au pixel : on cache le texte, on photographie ce qu'il y
// a derrière lui, et on prend le pixel le PLUS CLAIR (le pire cas), comme
// test-reception-bon pour la photo du comptoir.
for(const [w,h] of [[390,844],[820,1180],[1280,800]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  const images=[]; p.on('request',r=>{if(r.resourceType()==='image')images.push(r.url());});
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'load'}); await p.waitForTimeout(400);
  const fond=await p.evaluate(()=>getComputedStyle(document.querySelector('.hero')).backgroundImage);
  check(`${w}px : le bandeau porte la photo du bâtiment, servie par notre site`, new RegExp('url\\("'+BASE.replace(/[.]/g,'\\.')+'/photos/[^"]+\\.webp"\\)').test(fond), fond.slice(0,140));
  check(`${w}px : aucune image d'un autre site`, images.every(u=>u.startsWith(BASE)), images.filter(u=>!u.startsWith(BASE)).join(', '));
  const TEXTES=[['.hero h1',3],['.hero h1 span',3],['.hero .adresse b',4.5],['.hero .adresse span',4.5],['.hero .fixe',4.5],['.hero .note',4.5]];
  const boites=await p.evaluate(t=>{const out=t.map(([s,seuil])=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();
    return {s,seuil,couleur:getComputedStyle(e).color,x:r.left,y:r.top+scrollY,w:r.width,h:r.height};});
    document.querySelector('.hero .wrap').style.visibility='hidden';return out;},TEXTES);
  const faibles=[];
  for(const bx of boites){
    const png=(await p.screenshot({clip:{x:bx.x,y:bx.y,width:bx.w,height:bx.h},fullPage:true})).toString('base64');
    const q=await p.evaluate(async([b64,couleur])=>{const i=new Image();i.src='data:image/png;base64,'+b64;await i.decode();
      const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);
      const d=g.getImageData(0,0,c.width,c.height).data;const lin=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};
      let max=0;for(let k=0;k<d.length;k+=4)max=Math.max(max,.2126*lin(d[k])+.7152*lin(d[k+1])+.0722*lin(d[k+2]));
      const t=couleur.match(/\d+/g).slice(0,3).map(Number);const lt=.2126*lin(t[0])+.7152*lin(t[1])+.0722*lin(t[2]);
      return (Math.max(lt,max)+.05)/(Math.min(lt,max)+.05);},[png,bx.couleur]);
    if(q<bx.seuil)faibles.push(`${bx.s} ${q.toFixed(2)}:1`);
  }
  check(`${w}px : chaque texte du bandeau se lit sur la photo (au pixel le plus clair)`, faibles.length===0, faibles.join(' ; '));
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
// 5 bis. SUR ORDINATEUR, RIEN DE LA PAGE DU FLYER NE PASSE SOUS LA BARRE DU BAS
// (recette du 8/10/2026). La façade retirait à TOUTES les pages, au-delà de
// 900 px, la place réservée à la barre ; la page d'un hôtel la garde, et
// « Prix annoncé à l'avance · Réglé au chauffeur » finissait dessous.
for(const [w,h] of [[1024,768],[1280,800],[1366,768]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(1500);
  const r=await p.evaluate(()=>{
    document.documentElement.style.scrollBehavior='auto'; window.scrollTo(0,document.documentElement.scrollHeight);
    /* La barre DU BAS : au-delà de 1100 px elle monte dans l'en-tête (5 ter),
       il n'y a plus rien en bas sous quoi passer. */
    const barre=[...document.querySelectorAll('nav.barre, .barre')].find(x=>getComputedStyle(x).display!=='none'&&getComputedStyle(x).position==='fixed'&&x.getBoundingClientRect().height>0);
    if(!barre) return {barre:false,dessous:[]};
    const haut=barre.getBoundingClientRect().top;
    const dessous=[...document.body.querySelectorAll('p, a, button, h2, h3, li, label')].filter(e=>{const q=e.getBoundingClientRect();
      return q.height>0&&e.offsetParent&&!e.closest('nav.barre, .barre')&&getComputedStyle(e).position!=='fixed'&&q.bottom>haut+1&&q.top<innerHeight;})
      .map(e=>e.tagName+' « '+e.textContent.trim().slice(0,30)+' »');
    return {barre:true,dessous:dessous.slice(0,3)};});
  check(`${w}×${h} : en bas de la page du flyer, rien ne passe sous la barre`, r.dessous.length===0, JSON.stringify(r));
  await ctx.close();
}
// 5 ter. SUR ORDINATEUR (≥ 1100 px), LA PAGE CLIENT PREND L'ÉCRAN (29/10/2026,
// validé sur capture par Barbaros : « beaucoup trop blanche et vide »). Le
// trajet à gauche, le client et « Voir mon prix » à droite, dans le premier
// écran ; les onglets dans l'en-tête, plus de barre en bas. Et le défaut
// trouvé en mesurant : au-delà de 760 px, le formulaire restait affiché
// AU-DESSUS de l'écran demandé (« Voir mon prix », « Réservations ») et la
// page remontait en haut — le client voyait le même formulaire.
const mesureOrdi=()=>{const q=id=>document.getElementById(id).getBoundingClientRect();
  const dep=q('blocDepart'), coord=q('blocCoordonnees'), prix=q('btnVoirPrix'), tete=document.querySelector('.entete').getBoundingClientRect();
  const onglets=[...document.querySelectorAll('.onglet')].filter(o=>o.offsetParent).map(o=>{const b=o.getBoundingClientRect();
    const c=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    return {o:o.dataset.onglet||'wa',enHaut:b.top>=tete.top&&b.bottom<=tete.bottom,touche:!!c&&o.contains(c)};});
  const fixe=[...document.querySelectorAll('.barre')].some(x=>getComputedStyle(x).position==='fixed'&&x.getBoundingClientRect().height>0);
  return {deuxCol:coord.left>=dep.right&&Math.abs(coord.top-dep.top)<40, uneCol:coord.top>dep.bottom&&coord.left<dep.left+dep.width/2,
    prixBas:Math.round(prix.bottom), onglets, fixe, sw:document.documentElement.scrollWidth};};
for(const [w,h] of [[1920,1080],[1440,900],[1280,800],[1100,800]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=orly',{waitUntil:'load'}); await p.waitForTimeout(1500);
  const r=await p.evaluate(mesureOrdi);
  check(`${w}×${h} : le trajet à gauche, le client à droite`, r.deuxCol, JSON.stringify(r));
  if(h>=900) check(`${w}×${h} : « Voir mon prix » entier dans le premier écran (bas à ${r.prixBas} px)`, r.prixBas<=h, r.prixBas);
  check(`${w}×${h} : les quatre onglets dans l'en-tête, chacun reçoit le doigt`, r.onglets.length===4&&r.onglets.every(o=>o.enHaut&&o.touche), JSON.stringify(r.onglets));
  check(`${w}×${h} : plus de barre fixée en bas`, !r.fixe);
  check(`${w}×${h} : pas de débordement`, r.sw===w, r.sw);
  check(`${w}×${h} : aucune erreur`, p.errs.length===0, p.errs.join(';'));
  await ctx.close();
}
for(const [w,h] of [[390,844],[820,1180]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=orly',{waitUntil:'load'}); await p.waitForTimeout(1500);
  const r=await p.evaluate(mesureOrdi);
  check(`${w}×${h} : une seule colonne, le client sous le trajet (inchangé)`, r.uneCol, JSON.stringify(r));
  check(`${w}×${h} : la barre reste en bas (inchangé)`, r.fixe&&r.onglets.every(o=>!o.enHaut));
  await ctx.close();
}
for(const [w,h] of [[1440,900],[820,1180],[390,844]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  const voit=()=>p.evaluate(()=>{const a=document.querySelector('.ecran.actif');
    return {actif:a&&a.id, haut:a&&Math.round(a.getBoundingClientRect().top), formulaire:getComputedStyle(document.getElementById('ecran-accueil')).display};});
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=orly',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.click('#btnVoirPrix'); await p.waitForSelector('.veh-carte',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(500);
  let v=await voit();
  check(`${w}×${h} : après « Voir mon prix », les prix s'affichent en haut, sans le formulaire`, v.actif==='ecran-vehicules'&&v.formulaire==='none'&&v.haut<h/3, JSON.stringify(v));
  await p.locator('.onglet[data-onglet="courses"]').click(); await p.waitForTimeout(500);
  v=await voit();
  check(`${w}×${h} : « Réservations » s'affiche en haut, sans le formulaire`, v.actif==='ecran-courses'&&v.formulaire==='none'&&v.haut<h/3, JSON.stringify(v));
  await p.locator('.onglet[data-onglet="accueil"]').click(); await p.waitForTimeout(500);
  v=await voit();
  check(`${w}×${h} : « Accueil » ramène au formulaire`, v.actif==='ecran-accueil'&&v.formulaire!=='none', JSON.stringify(v));
  check(`${w}×${h} : parcours des onglets sans erreur`, p.errs.length===0, p.errs.join(';'));
  await ctx.close();
}
// « Voir mon prix » montre LA CARTE DU TRAJET, comme le site public, et dans
// la même colonne de 720 px (30/10/2026, Barbaros : « il faut afficher la
// carte avec le trajet comme pour le site public »). Sur 1 180 px, elle
// devenait une bande de 1 140 × 220 ; et avant la correction de l'écran
// actif, elle tombait 1 500 px plus bas, hors de vue.
for(const [w,h] of [[1440,900],[390,844]]){
  const {ctx,p}=await nouveau('fr-FR',w,h);
  await ctx.route('**://router.project-osrm.org/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({routes:[{distance:KM*1000,duration:3000,
    geometry:{type:'LineString',coordinates:[[2.5512,48.9701],[2.47,48.91],[2.40,48.84],[2.3652,48.7262]]}}]})}));
  await ctx.route('**://tile.openstreetmap.org/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eae6df"/></svg>'}));
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=orly',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.click('#btnVoirPrix'); await p.waitForSelector('#carteTrajet .leaflet-tile',{timeout:8000}).catch(()=>{}); await p.waitForTimeout(600);
  const c=await p.evaluate(()=>{const e=document.getElementById('carteTrajet'),r=e.getBoundingClientRect();
    return {visible:!e.hidden&&r.height>0, haut:Math.round(r.top), large:Math.round(r.width), centre:Math.round(r.left+r.width/2), milieu:Math.round(document.documentElement.clientWidth/2), traits:e.querySelectorAll('path').length};});
  check(`${w}×${h} : « Voir mon prix » montre la carte et le tracé, à l'écran`, c.visible&&c.traits===2&&c.haut<h/2, JSON.stringify(c));
  if(w>=1100) check(`${w}×${h} : l'écran des prix dans une colonne de 720 px au plus, centrée, comme le site public`, c.large<=720&&Math.abs(c.centre-c.milieu)<30, JSON.stringify(c));
  check(`${w}×${h} : carte sans erreur`, p.errs.length===0, p.errs.join(';'));
  await ctx.close();
}
// La liste d'adresses, ouverte dans la colonne de gauche, se lit en entier :
// chaque ligne visible reçoit le doigt (rien ne la coupe ni ne la recouvre).
{ const {ctx,p}=await nouveau('fr-FR',1440,900);
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville&dest=autre',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.click('#arrivee'); await p.keyboard.type('Versailles',{delay:30}); await p.waitForTimeout(1500);
  const l=await p.evaluate(()=>{const liste=[...document.querySelectorAll('.suggest-list')].find(x=>x.offsetParent); if(!liste) return null;
    const lb=liste.getBoundingClientRect();
    return [...liste.querySelectorAll('.suggest-item')].filter(i=>{const b=i.getBoundingClientRect();return b.bottom<=lb.bottom&&b.bottom<=innerHeight;})
      .map(i=>{const b=i.getBoundingClientRect();const c=document.elementFromPoint(b.left+30,b.top+b.height/2);return !!c&&i.contains(c);});});
  check('1440 px, « Autre destination » : la liste d\'adresses s\'ouvre et chaque ligne reçoit le doigt', !!l&&l.length>0&&l.every(Boolean), JSON.stringify(l));
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
/* « ENVOYER MA DEMANDE » PART VRAIMENT, SUR LE SITE CONSTRUIT (29/09/2026).
   Le cloisonnement retirait de la page publique le bloc qui définissait
   telValide : le clic levait « telValide is not defined » et rien ne
   partait, pour TOUT client qui donnait son numéro. Aucune suite n'allait
   jusqu'au bout du tunnel sur le site construit. */
{ const {ctx,p}=await nouveau();
  const depots=[];
  await ctx.route('**/functions/v1/deposer-course',r=>{depots.push(1);r.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'});});
  await p.goto(BASE+'/easyhotel-client/',{waitUntil:'domcontentloaded'});
  await p.click('a.carte[data-dest="cdg"]'); await p.waitForURL(/application/); await p.waitForTimeout(1200);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.click('#btnVoirPrix');
  await p.waitForSelector('.veh-carte',{timeout:8000}).catch(()=>{});
  await p.locator('.veh-carte').first().click();
  await p.locator('#ecran-vehicules .veh-action .bouton').first().click();
  await p.waitForSelector('#ecran-recap:not([hidden])',{timeout:5000}).catch(()=>{});
  /* Plus de choix carte / espèces côté client (10/10/2026) : il paie par lien. */
  /* « Où recevoir votre confirmation ? » est obligatoire depuis le 4/10/2026 (masquée au comptoir). */
  await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
  await p.locator('#btnConfirmer').click();
  const bon=await p.waitForFunction(()=>document.getElementById('ecran-bon').getBoundingClientRect().height>0,null,{timeout:8000}).then(()=>true).catch(()=>false);
  check('« Envoyer ma demande » ouvre le bon', bon);
  check('… et la demande part au serveur', depots.length===1, depots.length+' dépôt(s)');
  check('… sans aucune erreur JavaScript', p.errs.length===0, p.errs.join(' ; '));
  await ctx.close(); }
/* Toute fonction APPELÉE par une page publique doit y être DÉFINIE. Le
   cloisonnement retire des blocs entiers : c'est la seule façon de voir
   qu'il emporte une fonction dont le client a encore besoin. */
{ const src=readFileSync('index.html','utf8');
  const defs=[...new Set([...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]))];
  for(const page of ['application.html','easyhotel-reception/index.html']){
    const brut=readFileSync(join('site',page),'utf8');
    /* Seul le CODE compte : ni le texte de la page, ni les commentaires, ni
       les chaînes (« chauffeurs (VTC) » n'est pas un appel). */
    const h=[...brut.matchAll(/<script(?![^>]*(?:src=|ld\+json))[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n')
      .replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g,'""');
    const ici=new Set([...h.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]));
    /* codeRetenu n'est appelé que derrière « recHotel ? … » : null sur la
       page publique, l'appel n'a jamais lieu. */
    const manque=defs.filter(n=>n!=='codeRetenu'&&!ici.has(n)&&new RegExp('(^|[^.\\w$])'+n+'\\s*\\(').test(h));
    check(`${page} : aucune fonction appelée sans être définie`, manque.length===0, manque.join(', '));
  }
}
/* LE PREMIER DESSIN EST LE BON (19/10/2026, audit). Mesuré avant : la
   page d'un partenaire s'affichait d'abord comme l'accueil public, puis le
   mode hôtel la remplaçait en deux temps — CLS 0,56 en 4G lente. Le site
   construit pose maintenant les classes du corps dès sa première ligne et
   voile l'écran (html.hotel-avance) jusqu'au script. ON RALENTIT LE RÉSEAU
   ET LE PROCESSEUR : sur un serveur local, la page arrive d'un bloc et le
   défaut n'existe pas — un contrôle sans ralentissement passerait au vert
   sur l'ancien code. Et on vérifie le voile levé : une page qui ne
   bougerait plus parce qu'elle reste invisible ne vaut rien. */
{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  await ctx.route(/photon|data\.gouv|openrouteservice|osrm|supabase\.co|openstreetmap|easyhotel\.com|\/cdn\./,r=>r.abort());
  const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.addInitScript(()=>{ window.__cls=0; window.__sauts=[];
    new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput){window.__cls+=e.value;window.__sauts.push(Math.round(e.value*1000)/1000);}}).observe({type:'layout-shift',buffered:true}); });
  await p.goto(BASE+'/application.html?h=easyhotel-aeroville',{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>({cls:Math.round(window.__cls*1000)/1000, sauts:window.__sauts,
    voile:document.documentElement.classList.contains('hotel-avance'),
    hotel:document.body.classList.contains('hotel'), fini:document.body.classList.contains('hotel-enhanced'),
    visible:getComputedStyle(document.getElementById('ecran-accueil')).visibility,
    tete:document.getElementById('hotelTete')&&!document.getElementById('hotelTete').hidden}));
  check('partenaire : la page ne saute pas en se chargeant (CLS < 0,1)', m.cls<0.1, 'CLS '+m.cls+' ('+m.sauts.join(', ')+')');
  check('partenaire : le voile est levé, l’écran est visible', !m.voile && m.visible==='visible', JSON.stringify(m));
  check('partenaire : mode hôtel et finition posés', m.hotel && m.fini && m.tete, JSON.stringify(m));
  check('partenaire : aucune erreur JavaScript', p.errs.length===0, p.errs.join(' ; '));
  /* Un hôtel inconnu garde l'accueil public : aucune classe posée d'office. */
  await p.goto(BASE+'/application.html?h=Hotel%20Inconnu%20CDG',{waitUntil:'load'});
  await p.waitForTimeout(800);
  const inconnu=await p.evaluate(()=>({hotel:document.body.classList.contains('hotel'), voile:document.documentElement.classList.contains('hotel-avance'),
    hero:document.querySelector('.hero')?getComputedStyle(document.querySelector('.hero')).display:'absent', depart:(document.getElementById('depart')||{}).value}));
  check('hôtel inconnu : l’accueil public, sans voile ni mode hôtel', !inconnu.hotel && !inconnu.voile && inconnu.hero!=='none', JSON.stringify(inconnu));
  await ctx.close(); }
await b.close();
await new Promise(r => serveur.close(r));
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){console.log('=== ÉCHECS ('+ko.length+') ===');ko.forEach(x=>console.log('  ✘ '+x));process.exit(1);}
