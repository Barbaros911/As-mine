import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh',{stdio:'inherit'});
await mkdir('captures',{recursive:true});
const ROOT=join(process.cwd(),'site');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent((req.url||'/').split('?')[0]);if(p==='/')p='/admin-v2.html';p=normalize(p).replace(/^([.][.][/\\])+/, '');const f=join(ROOT,p);const s=await stat(f);if(!s.isFile())throw 0;res.writeHead(200,{'content-type':TYPES[extname(f)]||'application/octet-stream'});res.end(await readFile(f));}catch{res.writeHead(404);res.end('404')}});
await new Promise(r=>server.listen(8097,'127.0.0.1',r));
const BASE='http://127.0.0.1:8097';
const browser=await chromium.launch({headless:true});
const today=new Date();const iso=d=>{const x=new Date(today);x.setDate(x.getDate()+d);return x.toISOString().slice(0,10)};
const courses=[
 {ref:'ELA-260917-001',statut:'confirmee',bon:{course:{date:iso(0),heure:'18:40',depart:'easyHotel Aéroville',arrivee:'CDG Terminal 2F',vehicule:'Berline'},client:{nom:'Client démo',telephone:'0600000000'},prix:{total:35},provenance:'Réception easyHotel'}},
 {ref:'ELA-260917-002',statut:'attribuee',bon:{course:{date:iso(0),heure:'20:15',depart:'CDG Terminal 2E',arrivee:'Paris centre',vehicule:'Van'},client:{nom:'Client démo 2',telephone:'0600000001'},prix:{total:80},provenance:'Public ELA'}}
];
const drivers=[{id:'d1',nom:'Mehmet',telephone:'0600000010',statut:'valide',etat_papiers:'valide'},{id:'d2',nom:'Karim',telephone:'0600000011',statut:'valide',etat_papiers:'a_renouveler'}];
async function shot(width,height,name){const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});const p=await ctx.newPage();await p.route('**/*',async route=>{const u=route.request().url();if(u.startsWith(BASE))return route.continue();if(!u.includes('supabase.co'))return route.abort();let body=[];if(u.includes('/rpc/est_exploitant'))body=true;else if(u.includes('/rpc/ela_rafraichir_actions'))body=0;else if(u.includes('chauffeurs_etat')||u.includes('/rest/v1/chauffeurs'))body=drivers;else if(u.includes('/rest/v1/courses'))body=courses;else if(u.includes('actions_requises'))body=[];else if(u.includes('evenements_reservation'))body=[];return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});await p.addInitScript(()=>sessionStorage.setItem('ela_admin_session',JSON.stringify({access_token:'preview',refresh_token:'preview',user:{email:'admin@elatransfer.test'}})));await p.goto(BASE+'/admin-v2.html',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.querySelector('#app')&&!document.querySelector('#app').classList.contains('hidden'),null,{timeout:15000});await p.waitForTimeout(1200);await p.screenshot({path:`captures/${name}.png`,fullPage:true});await ctx.close();}
await shot(390,844,'admin-mobile-390');
await shot(1280,800,'admin-ordinateur-1280');
await browser.close();await new Promise(r=>server.close(r));
console.log('OK — captures Admin #165 générées depuis le build réel');
