/* Montre l'Admin tel qu'il est CONSTRUIT, dans le dossier où on le lance.
   Il ne clique aucun onglet : les deux versions n'ont pas la même
   navigation, et c'est justement ce qu'on veut comparer sans le supposer. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
const ETIQ = process.argv[2], SORTIE = process.argv[3], PORT = Number(process.argv[4]||8111);
execSync('sh construire.sh', {stdio:'ignore'});
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const srv=createServer(async(rq,rs)=>{try{let c=decodeURIComponent(rq.url.split('?')[0]);
 c=normalize(c).replace(/^(\.\.[/\\])+/,'');let f=join(process.cwd(),'site',c);
 try{if((await stat(f)).isDirectory())f=join(f,'index.html')}catch{rs.writeHead(404).end('non');return}
 rs.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'});rs.end(await readFile(f));
}catch{rs.writeHead(404).end('non')}});
await new Promise(r=>srv.listen(PORT,'127.0.0.1',r));
const B='http://127.0.0.1:'+PORT;
const c=(ref,statut,date,heure,dep,arr,nom,tel,prix,veh,src)=>({ref,statut,
  bon:{course:{date,heure,depart:dep,arrivee:arr,vehicule:veh},client:{nom,telephone:tel},prix:{total:prix},provenance:src}});
const COURSES=[
 c('ELA-26-09-0041','attente','2026-09-18','14:00','CDG Terminal 2F','Paris 8e — Avenue Montaigne','John Smith','+33612345678',80,'Berline','Public ELA'),
 c('ELA-26-09-0040','attente','2026-09-18','11:30','Hôtel Ibis CDG','Orly Terminal 4','Sophie Martin','+33698765432',65,'Van','easyHotel Aéroville'),
 c('ELA-26-09-0039','confirmee','2026-09-18','16:30','Gare du Nord','easyHotel Aéroville','Emma Wilson','+33655667788',50,'Berline','Public ELA'),
 c('ELA-26-09-0038','realisee','2026-09-17','22:30','Beauvais','Paris 15e','Daniel Lee','+33644556677',180,'Van','Public ELA')];
await mkdir(SORTIE,{recursive:true});
const b=await chromium.launch();
for(const [nom,w,h] of [['telephone',390,844],['ordinateur',1280,900]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,locale:'fr-FR'});
 await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.startsWith(B))return r.continue();
  const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});
  if(!u.includes('supabase.co'))return r.abort();
  if(u.includes('/rpc/est_exploitant'))return J(true);
  if(u.includes('/rest/v1/courses'))return J(COURSES);
  if(u.includes('/actions_requises'))return J([{id:1,type_action:'nouvelle_demande',course_ref:'ELA-26-09-0041',priorite:90,echeance:null}]);
  if(u.includes('/chauffeurs_etat'))return J([{id:'d1',nom_affiche:'Ahmed K.',telephone:'+33612345678',etat_effectif:'a_jour',attribuable:true}]);
  return J([]);});
 await ctx.addInitScript(()=>sessionStorage.setItem('ela_admin_session',JSON.stringify({access_token:'t',refresh_token:'r',user:{email:'exploitant@ela'}})));
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto(B+'/admin-v2.html',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelectorAll('#metrics *').length>0,null,{timeout:15000}).catch(()=>{});
 await p.waitForTimeout(700);
 await p.screenshot({path:`${SORTIE}/${ETIQ}-${nom}.png`});
 const m=await p.evaluate(()=>{
   const nav=document.querySelector('nav'), r=nav?.getBoundingClientRect();
   const cible=document.elementFromPoint(innerWidth/2, innerHeight-40);
   return {deb:document.documentElement.scrollWidth, vue:innerWidth,
     nav: r?`${Math.round(r.width)}×${Math.round(r.height)} @x=${Math.round(r.x)}`:'—',
     barreBasse: !!document.querySelector('.mobile-bottom-nav'),
     hamburger: !!document.querySelector('.mobile-menu'),
     basDeEcran: cible? (cible.className||cible.tagName) : '—'};
 });
 console.log(`${ETIQ} ${nom} ${w}px : débordement ${m.deb>m.vue?'OUI '+m.deb+'>'+m.vue:'non'} | nav ${m.nav} | barre basse ${m.barreBasse?'oui':'non'} | hamburger ${m.hamburger?'oui':'non'}`);
 if(errs.length) console.log('   ERREURS DE PAGE :', errs.join(' | '));
 await ctx.close();
}
await b.close(); srv.close();
