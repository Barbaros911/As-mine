import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
/* ON CONSTRUIT AVANT DE MONTRER. Un script de capture qui sert un
   « site/ » périmé montre une image fausse — c'est arrivé dans ce
   projet. Ce qu'on montre doit être fabriqué au moment où on le
   montre.
   MAIS JAMAIS PENDANT UNE SÉRIE DE TESTS. « construire.sh » commence
   par « rm -rf site » : deux constructions en même temps se marchent
   dessus, et la suite qui lisait le dossier tombe sur un défaut qui
   n'existe pas. Mesuré — c'est ce qui a fait rougir
   « test-unified-facade » une fois, sans rien de cassé dans le code. */
if(existsSync('/tmp/asmine-tests.verrou')){
  console.error("UNE SÉRIE DE TESTS TOURNE. Attendre sa fin : construire pendant\n"
    +"qu'elle tourne efface le dossier « site » sous ses pieds.");
  process.exit(1);
}
execSync('sh construire.sh', {stdio:'ignore'});
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
 '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const srv=createServer(async(rq,rs)=>{try{let c=decodeURIComponent(rq.url.split('?')[0]);
 c=normalize(c).replace(/^(\.\.[/\\])+/,'');let f=join(process.cwd(),'site',c);
 try{if((await stat(f)).isDirectory())f=join(f,'index.html')}catch{rs.writeHead(404).end('non');return}
 rs.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});rs.end(await readFile(f));
}catch{rs.writeHead(404).end('non')}});
await new Promise(r=>srv.listen(8111,'127.0.0.1',r));
const B='http://127.0.0.1:8111';
/* LA VRAIE FORME DU BON EST IMBRIQUÉE : « bon.course », « bon.client »,
   « bon.prix ». Mon premier jeu la posait à plat, et la carte s'affichait
   avec une flèche vide — j'ai failli « corriger » un affichage qui
   marchait. Un faux serveur qui ment autrement que le vrai ne prouve rien. */
const c=(ref,statut,date,heure,dep,arr,nom,tel,prix,veh,src)=>({ref,statut,
  bon:{course:{date,heure,depart:dep,arrivee:arr,vehicule:veh},
       client:{nom,telephone:tel},prix:{total:prix},provenance:src}});
const COURSES=[
 c('ELA-26-09-0041','attente','2026-09-18','14:00','CDG Terminal 2F','Paris 8e — Avenue Montaigne','John Smith','+33612345678',80,'Berline','Public ELA'),
 c('ELA-26-09-0040','attente','2026-09-18','11:30','Hôtel Ibis CDG','Orly Terminal 4','Sophie Martin','+33698765432',65,'Van','easyHotel Aéroville'),
 c('ELA-26-09-0039','confirmee','2026-09-18','16:30','Gare du Nord','easyHotel Aéroville','Emma Wilson','+33655667788',50,'Berline','Public ELA'),
 c('ELA-26-09-0038','realisee','2026-09-17','22:30','Beauvais','Paris 15e','Daniel Lee','+33644556677',180,'Van','Public ELA')];
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
 await p.waitForTimeout(500);
 await p.screenshot({path:`/tmp/claude-0/admin-${nom}-1-traiter.png`});
 if(w<900){
   const bar=await p.evaluate(()=>{const n=document.querySelector('nav');const bs=[...n.querySelectorAll('button')];
     return {hauteur:Math.round(n.getBoundingClientRect().height),
             boutons:bs.map(x=>({t:x.textContent.trim().slice(0,12),x:Math.round(x.getBoundingClientRect().x),w:Math.round(x.getBoundingClientRect().width)}))};});
   console.log('BARRE', w+'px :', bar.hauteur+'px de haut |', bar.boutons.map(x=>`${x.t}@${x.x}(${x.w})`).join('  '));
   const deb=await p.evaluate(()=>({s:document.documentElement.scrollWidth,v:window.innerWidth}));
   console.log('  débordement horizontal :', deb.s>deb.v?('OUI '+deb.s+' > '+deb.v):'non');
 }
 await p.click('nav button[data-tab="gestion"]'); await p.waitForTimeout(250);
 await p.screenshot({path:`/tmp/claude-0/admin-${nom}-3-gestion.png`});
 await p.click('[data-tab="partners"]'); await p.waitForTimeout(250);
 const allume=await p.evaluate(()=>document.querySelector('nav button.on')?.textContent.trim());
 console.log('  depuis Gestion → Hôtels, onglet allumé :', allume);
 await p.click('nav button[data-tab="bookings"]'); await p.waitForTimeout(250);
 await p.screenshot({path:`/tmp/claude-0/admin-${nom}-2-courses.png`});
 if(errs.length) console.log('  ERREURS DE PAGE :', errs.join(' | '));
 await ctx.close();
}
await b.close(); srv.close();
