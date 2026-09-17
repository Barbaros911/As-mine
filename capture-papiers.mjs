/* Capture de l'écran chauffeurs et de l'avertissement d'attribution.
   Sert à MONTRER avant de fusionner — jamais à vérifier : une image ne
   prouve rien, c'est test-admin-papiers.mjs qui prouve. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
execSync('sh construire.sh', {stdio:'ignore'});

const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const serveur=createServer(async(req,res)=>{try{
  let c=normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/,'');
  let f=join(process.cwd(),'site',c);
  try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});
  res.end(await readFile(f));}catch{res.writeHead(404).end();}});
await new Promise(r=>serveur.listen(8095,'127.0.0.1',r));
const BASE='http://127.0.0.1:8095';
const jour=n=>{const d=new Date(Date.now()+n*864e5),z=x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());};

const CH=[
 {id:'d1',nom_affiche:'Mehmet Y.',telephone_whatsapp:'06 12 34 56 78',entreprise:'MY VTC',statut:'valide',actif:true,
  carte_vtc_fin:jour(300),registre_fin:jour(400),assurance_fin:jour(200),papiers_etat:'valide',papiers_jours:200,etat_effectif:'valide',attribuable:true},
 {id:'d2',nom_affiche:'Ayse K.',telephone_whatsapp:'06 98 76 54 32',entreprise:'AY TRANSPORT',statut:'valide',actif:true,
  carte_vtc_fin:jour(300),registre_fin:jour(400),assurance_fin:jour(-2),papiers_etat:'perime',papiers_jours:-2,etat_effectif:'papiers',attribuable:false},
 {id:'d3',nom_affiche:'Karim B.',telephone_whatsapp:'06 11 22 33 44',entreprise:'KB DRIVE',statut:'valide',actif:true,
  carte_vtc_fin:jour(12),registre_fin:jour(400),assurance_fin:jour(200),papiers_etat:'bientot',papiers_jours:12,etat_effectif:'a_renouveler',attribuable:true},
 {id:'d4',nom_affiche:'Luis F.',telephone_whatsapp:'07 55 66 77 88',entreprise:'',statut:'valide',actif:true,
  carte_vtc_fin:null,registre_fin:null,assurance_fin:null,papiers_etat:'manquant',papiers_jours:null,etat_effectif:'papiers',attribuable:true}];
const COURSES=[{ref:'ELA-26-09-0042',statut:'confirmee',bon:{course:{date:jour(1),heure:'06:00',
  depart:'easyHotel Aéroville',arrivee:'Orly 1 — Aéroport de Paris-Orly',vehicule:'Berline'},
  client:{nom:'M. Dupont',telephone:'0612345678'},prix:{total:100},provenance:'easyHotel Aéroville'}}];
const ACTIONS=[{id:1,course_ref:null,type_action:'papiers_a_regulariser',priorite:85,statut:'ouverte',
  echeance:null,chauffeur_id:'d2',donnees:{libelle:'Ayse K.',etat:'perime'}},
 {id:2,course_ref:null,type_action:'papiers_a_regulariser',priorite:40,statut:'ouverte',
  echeance:null,chauffeur_id:'d3',donnees:{libelle:'Karim B.',etat:'bientot'}}];

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
await ctx.route('**://*/**',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
await ctx.route('**supabase.co/**',r=>{const u=r.request().url(),J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});
  if(u.includes('/rpc/est_exploitant'))return J(true);
  if(u.includes('/rpc/'))return J(0);
  if(u.includes('/chauffeurs_etat'))return J(CH);
  if(u.includes('/actions_requises'))return J(ACTIONS);
  if(u.includes('/rest/v1/courses'))return J(COURSES);
  return J([]);});
await ctx.addInitScript(()=>sessionStorage.setItem('ela_admin_session',
  JSON.stringify({access_token:'t',user:{email:'contact@elatransfer.com'}})));
const p=await ctx.newPage();
await p.goto(BASE+'/admin-v2.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(1200);

await p.evaluate(()=>{document.querySelectorAll('.section').forEach(s=>s.classList.remove('on'));
  document.querySelector('#s-drivers').classList.add('on');});
await p.waitForTimeout(300);
await p.screenshot({path:'capture-1-chauffeurs.png'});

await p.evaluate(()=>openBooking('ELA-26-09-0042'));
await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('[data-act="assign"]').click());
await p.waitForTimeout(400);
await p.evaluate(()=>{const s=document.querySelector('#driverChoice');
  s.value='d3';s.dispatchEvent(new Event('change'));});
await p.waitForTimeout(200);
await p.screenshot({path:'capture-2-attribution.png'});

await p.evaluate(()=>{document.querySelector('#closeSheet').click();
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('on'));
  document.querySelector('#s-dashboard').classList.add('on');});
await p.waitForTimeout(300);
await p.screenshot({path:'capture-3-actions.png'});
await p.evaluate(()=>document.querySelector('#zonePush')?.scrollIntoView({block:'center'}));
await p.waitForTimeout(300);
await p.screenshot({path:'capture-4-reglage.png'});

await b.close(); serveur.close();
console.log('trois captures écrites');
