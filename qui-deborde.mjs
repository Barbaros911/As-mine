import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const srv=createServer(async(rq,rs)=>{try{let c=decodeURIComponent(rq.url.split('?')[0]);c=normalize(c).replace(/^(\.\.[/\\])+/,'');let f=join(process.cwd(),'site',c);
 try{if((await stat(f)).isDirectory())f=join(f,'index.html')}catch{rs.writeHead(404).end('non');return}
 rs.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'});rs.end(await readFile(f));}catch{rs.writeHead(404).end('non')}});
await new Promise(r=>srv.listen(8113,'127.0.0.1',r));const B='http://127.0.0.1:8113';
const c=(ref,statut,date,heure,dep,arr,nom,tel,prix,veh,src)=>({ref,statut,bon:{course:{date,heure,depart:dep,arrivee:arr,vehicule:veh},client:{nom,telephone:tel},prix:{total:prix},provenance:src}});
const COURSES=[
 c('ELA-26-09-0041','attente','2026-09-18','14:00','CDG Terminal 2F','Paris 8e — Avenue Montaigne','John Smith','+33612345678',80,'Berline','Public ELA'),
 c('ELA-26-09-0040','attente','2026-09-18','11:30','Hôtel Ibis CDG','Orly Terminal 4','Sophie Martin','+33698765432',65,'Van','easyHotel Aéroville'),
 c('ELA-26-09-0039','confirmee','2026-09-18','16:30','Gare du Nord','easyHotel Aéroville','Emma Wilson','+33655667788',50,'Berline','Public ELA'),
 c('ELA-26-09-0038','realisee','2026-09-17','22:30','Beauvais','Paris 15e','Daniel Lee','+33644556677',180,'Van','Public ELA')];
const b=await chromium.launch();
for(const w of [1280,1440]){
const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:2,locale:'fr-FR'});
await ctx.route('**/*',r=>{const u=r.request().url();if(u.startsWith(B))return r.continue();
 const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});if(!u.includes('supabase.co'))return r.abort();
 if(u.includes('/rpc/est_exploitant'))return J(true);if(u.includes('/rest/v1/courses'))return J(COURSES);
 if(u.includes('/actions_requises'))return J([{id:1,type_action:'nouvelle_demande',course_ref:'ELA-26-09-0041',priorite:90,echeance:null}]);
 if(u.includes('/chauffeurs_etat'))return J([{id:'d1',nom_affiche:'Ahmed K.',telephone:'+33612345678',etat_effectif:'a_jour',attribuable:true}]);
 return J([]);});
await ctx.addInitScript(()=>sessionStorage.setItem('ela_admin_session',JSON.stringify({access_token:'t',refresh_token:'r',user:{email:'exploitant@ela'}})));
const p=await ctx.newPage();await p.goto(B+'/admin-v2.html',{waitUntil:'domcontentloaded'});await p.waitForTimeout(900);
const r=await p.evaluate(()=>{const out=[];for(const e of document.querySelectorAll('*')){const b=e.getBoundingClientRect();
  if(b.right>innerWidth+1&&b.width>0)out.push({q:e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className?'.'+e.className.trim().split(/\s+/).join('.'):''),d:Math.round(b.right-innerWidth),l:Math.round(b.left),w:Math.round(b.width)});}
  return {vue:innerWidth,doc:document.documentElement.scrollWidth,liste:out.slice(0,10)};});
console.log(`── ${w}px : document ${r.doc} pour ${r.vue}`);
for(const x of r.liste) console.log(`   +${x.d}px  ${x.q}  (gauche ${x.l}, large ${x.w})`);
await ctx.close();}
await b.close();srv.close();
