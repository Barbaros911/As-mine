import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

async function chargerJsQR(){
  const bases = [process.cwd() + '/'];
  const bac = '/tmp/claude-0/-home-user-As-mine/';
  try { for(const d of await readdir(bac)) bases.push(join(bac, d, 'scratchpad') + '/'); } catch {}
  for(const b of bases){ try { const m = createRequire(b)('jsqr'); return m.default || m; } catch {} }
  console.error('jsqr est introuvable — installer avec npm install --no-save jsqr');
  process.exit(1);
}
const jsQR = await chargerJsQR();

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.txt':'text/plain','.xml':'application/xml'};
const serveur=createServer(async(req,res)=>{try{let chemin=decodeURIComponent(req.url.split('?')[0]);chemin=normalize(chemin).replace(/^(\.\.[/\\])+/,'');let f=join(process.cwd(),'site',chemin);try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{res.writeHead(404).end('non');return;}res.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});res.end(await readFile(f));}catch{res.writeHead(404).end('non');}});
await new Promise(r=>serveur.listen(8100,'127.0.0.1',r));
const BASE='http://127.0.0.1:8100';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const PARTENAIRES=[{id:'p1',nom:'easyHotel Aéroville',adresse_depart:'10 rue de la Belle Borne, Tremblay',actif:true},{id:'p2',nom:'Ibis CDG',adresse_depart:'Roissypôle',actif:true}];

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(BASE))return r.continue();if(!u.includes('supabase.co'))return r.abort();const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});if(u.includes('/rpc/est_exploitant'))return J(true);if(u.includes('/rest/v1/partenaires'))return J(PARTENAIRES);if(u.includes('/chauffeurs_etat'))return J([]);if(u.includes('/rest/v1/chauffeurs'))return J([]);if(u.includes('/actions_requises'))return J([]);if(u.includes('/rest/v1/courses'))return J([]);return J([]);});
await ctx.addInitScript(()=>sessionStorage.setItem('ela_admin_session',JSON.stringify({access_token:'jeton-de-test',refresh_token:'r',user:{email:'exploitant@test'}})));
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(BASE+'/admin-v2.html',{waitUntil:'domcontentloaded'});
await p.waitForFunction(()=>document.getElementById('affNom')&&(state.partners||[]).length>=2,null,{timeout:20000});

// La maquette #165 utilise un vrai tiroir mobile : on l'ouvre comme un utilisateur
// avant de choisir Hôtels, au lieu de forcer un clic sur un élément masqué.
const menu=p.locator('.mobile-menu');
if(await menu.count()){
  const nav=p.locator('#nav');
  if(!(await nav.evaluate(e=>e.classList.contains('mobile-open')))){
    await menu.click();
    await p.waitForFunction(()=>document.querySelector('#nav')?.classList.contains('mobile-open'));
  }
}
await p.click('nav button[data-tab="partners"]');
await p.waitForTimeout(150);

check("l'écran des hôtels porte l'affiche",await p.locator('#zoneAffiche').isVisible());
check("rien n'est dessiné tant qu'aucun hôtel n'est nommé",await p.locator('#affiche').isHidden());
check("et aucun bouton d'impression ne traîne",await p.locator('#affActions').isHidden());
const options=await p.$$eval('#affPartenaire option',n=>n.map(x=>x.textContent));
check("le menu des hôtels vient du serveur, pas d'une liste écrite en dur",options.includes('easyHotel Aéroville')&&options.includes('Ibis CDG'),options.join(' | '));
await p.selectOption('#affPartenaire','Ibis CDG');await p.waitForTimeout(250);
check("choisir un partenaire recopie son nom dans le champ imprimé",(await p.inputValue('#affNom'))==='Ibis CDG',await p.inputValue('#affNom'));
check("saisir un nom fait apparaître l'affiche",await p.locator('#affiche').isVisible());
check("l'affiche porte le nom de l'hôtel",(await p.textContent('#affHotel'))==='Ibis CDG');
check("et la marque, pour qu'on sache qui envoie la voiture",(await p.textContent('.affiche-marque')).replace(/\s/g,'')==='ELATRANSFER');
check("avec un numéro à appeler : tout le monde ne scanne pas",/\+33\s?7\s?59\s?31\s?24\s?33/.test(await p.textContent('.affiche-tel')));
const lien=(await p.textContent('#affLien')).trim();
check("LE LIEN VISE LE SITE CLIENT, jamais « admin-v2.html »",!/admin/i.test(lien),lien);
check("il part de la RACINE du site",lien===BASE+'/?h=Ibis%20CDG',lien);
check("le nom voyage EN CLAIR dans l'adresse, pas en identifiant",decodeURIComponent(new URL(lien).searchParams.get('h'))==='Ibis CDG');
check("le QR est dessiné en SVG : une affiche s'imprime, un canvas sort en bouillie",(await p.locator('#affQr svg').count())===1&&(await p.locator('#affQr canvas').count())===0);
check("le SVG porte son « xmlns » : sans lui il ne peut plus être chargé comme image",/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(await p.innerHTML('#affQr')));
async function decoderAffiche(){const svg=await p.innerHTML('#affQr');return await p.evaluate(async html=>{const img=new Image();const url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(html);await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url;});const c=document.createElement('canvas');c.width=c.height=400;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,400,400);g.imageSmoothingEnabled=false;g.drawImage(img,0,0,400,400);const d=g.getImageData(0,0,400,400);return{data:Array.from(d.data),w:d.width,h:d.height};},svg);}
async function lireQR(){const im=await decoderAffiche();const res=jsQR(Uint8ClampedArray.from(im.data),im.w,im.h);return res?res.data:null;}
const lu=await lireQR();check("LE QR SE DÉCODE, et rend exactement l'adresse imprimée sous lui",lu===lien,String(lu));
await p.fill('#affNom','Hôtel Mercure Roissy Charles de Gaulle');await p.waitForTimeout(300);const lien2=(await p.textContent('#affLien')).trim();
check("un hôtel pas encore partenaire se saisit à la main",await p.locator('#affiche').isVisible()&&/Mercure/.test(await p.textContent('#affHotel')));
check("son QR se décode aussi, nom long compris",(await lireQR())===lien2,lien2);check("et lui non plus ne vise pas le back-office",!/admin/i.test(lien2),lien2);
await p.fill('#affNom','');await p.waitForTimeout(250);check("vider le nom retire l'affiche et son bouton d'impression",await p.locator('#affiche').isHidden()&&await p.locator('#affActions').isHidden());
await p.fill('#affNom','Ibis CDG');await p.waitForTimeout(300);await p.emulateMedia({media:'print'});
const vu=await p.evaluate(()=>{const v=s=>{const n=document.querySelector(s);return n?getComputedStyle(n).visibility==='visible':null;};return{affiche:v('#affiche'),qr:v('#affQr svg'),hotel:v('#affHotel'),entete:v('header.top'),nav:v('#nav'),bord:v('#s-dashboard')};});
await p.emulateMedia({media:'screen'});
check("à l'impression, l'affiche et son QR sortent",vu.affiche===true&&vu.qr===true&&vu.hotel===true,JSON.stringify(vu));
check("et RIEN du back-office : il porte des noms et des téléphones de clients",vu.entete===false&&vu.nav===false&&vu.bord===false,JSON.stringify(vu));
const srcAdmin=await readFile('admin-v2-affiche.js','utf8');const srcClient=await readFile('index.html','utf8');const srcPartage=await readFile('qr-affiche.js','utf8');
check("le module Admin v2 ne réimplémente pas l'encodeur, il l'appelle",!/0x11D|polyGen|Reed|function qrMatrice/.test(srcAdmin)&&/ELA_QR/.test(srcAdmin));
check("le site client non plus : il a déménagé, il n'a pas été recopié",!/0x11D|function qrMatrice/.test(srcClient)&&/ELA_QR/.test(srcClient));
check("et le fichier partagé le porte bien, une seule fois",(srcPartage.match(/function qrMatrice/g)||[]).length===1);
check("le fichier partagé REFUSE une base absente au lieu d'en inventer une",await p.evaluate(()=>{try{window.ELA_QR.lien('','Ibis');return false;}catch(e){return /obligatoire/.test(e.message);}}));
check("les deux espaces servent le MÊME fichier, depuis le site et jamais un CDN",!/cdn|unpkg|jsdelivr/i.test(await p.evaluate(()=>[...document.scripts].map(s=>s.src).join(' '))));
check('aucune erreur JavaScript sur toute la traversée',errs.length===0,errs.join(' | '));
await b.close();serveur.close();
if(ok.length)console.log('=== RÉUSSIS ('+ok.length+') ===\n'+ok.map(x=>'  ✔ '+x).join('\n'));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ===\n'+ko.map(x=>'  ✘ '+x).join('\n'));process.exit(1);}
console.log('\nAffiche hôtel Admin v2 : '+ok.length+' contrôles au vert.');