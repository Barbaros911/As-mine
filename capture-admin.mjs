import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
execSync('sh construire.sh',{stdio:'inherit'});
await mkdir('captures-admin',{recursive:true});
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let p=normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/,'');let f=join(process.cwd(),'site',p);try{if((await stat(f)).isDirectory())f=join(f,'index.html')}catch{res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':TYPES[extname(f)]||'application/octet-stream'});res.end(await readFile(f))}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(8097,'127.0.0.1',r));
const BASE='http://127.0.0.1:8097';
const drivers=[{id:'d1',nom_affiche:'Mehmet',telephone_whatsapp:'0612345678',entreprise:'MY VTC',statut:'valide',actif:true,papiers_etat:'valide',papiers_jours:200,etat_effectif:'valide',attribuable:true}];
const dateDuJour=new Date().toISOString().slice(0,10);
const dateDemain=new Date(Date.now()+864e5).toISOString().slice(0,10);
const courses=[
 {ref:'ELA-DEMO-001',statut:'confirmee',bon:{course:{date:dateDuJour,heure:'18:40',depart:'easyHotel Aéroville',arrivee:'CDG Terminal 2F',vehicule:'Berline'},client:{nom:'Client',telephone:'0600000000'},prix:{total:35},provenance:'Réception easyHotel Aéroville'}},
 {ref:'ELA-DEMO-002',statut:'attribuee',bon:{course:{date:dateDemain,heure:'08:15',depart:'CDG Terminal 2E',arrivee:'Paris centre',vehicule:'Van'},client:{nom:'Client 2',telephone:'0600000001'},prix:{total:80},provenance:'Public ELA'}}
];
const browser=await chromium.launch();
for(const [name,width,height] of [['mobile-390',390,844],['ordinateur-1280',1280,800]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:name.startsWith('mobile')?2:1,locale:'fr-FR'});
 await ctx.route('**/*',async r=>{const u=r.request().url();if(u.startsWith(BASE))return r.continue();if(!u.includes('supabase.co'))return r.abort();const J=o=>r.fulfill({contentType:'application/json',body:JSON.stringify(o)});if(u.includes('/rpc/est_exploitant'))return J(true);if(u.includes('/rpc/'))return J(0);if(u.includes('/chauffeurs_etat'))return J(drivers);if(u.includes('/rest/v1/chauffeurs'))return J(drivers);if(u.includes('/rest/v1/courses'))return J(courses);return J([])});
 await ctx.addInitScript(()=>sessionStorage.setItem('ela_admin_session',JSON.stringify({access_token:'capture',refresh_token:'r',user:{email:'contact@elatransfer.com'}})));
 const page=await ctx.newPage();
 await page.goto(BASE+'/admin-v2.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof state!=='undefined' && !document.querySelector('#app').classList.contains('hidden'),null,{timeout:20000});
 await page.waitForFunction(()=>document.querySelectorAll('[data-derived="today"] .derived-row').length===1&&document.querySelectorAll('[data-derived="departures"] .derived-row').length===2,null,{timeout:20000});
 const filtre=name.startsWith('mobile')?'.mobile-bottom-nav [data-filter="today"]':'[data-go="bookings"][data-filter="today"]';
 await page.click(filtre);
 await page.waitForFunction(d=>document.querySelector('#s-bookings')?.classList.contains('on')&&document.querySelector('#qBooking')?.value===d,dateDuJour,{timeout:10000});
 if(name.startsWith('mobile'))await page.click('.mobile-bottom-nav [data-mgo="dashboard"]');else await page.click('#nav [data-tab="dashboard"]');
 await page.screenshot({path:`captures-admin/admin-${name}.png`,fullPage:true});
 await ctx.close();
}
await browser.close();server.close();
console.log('Captures Admin générées.');
