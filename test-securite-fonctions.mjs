/* =====================================================================
   TEST-SECURITE-FONCTIONS — deux fonctions Supabase joignables avec la clé
   publique du site (audit du 28/09/2026). Sans Deno ni réseau : on charge
   le code TypeScript dépouillé de ses types, avec un faux serveur.
   · nouvelle-demande ne doit croire QUE la course relue sur le serveur ;
   · prevenir-client ne doit répondre qu'à un exploitant ;
   · courses-hotel plafonne les essais du code de la réception.
   Éprouvée contre l'ancien code : les contrôles de chaque fonction tombent
   (six sur sept pour les deux premières, le plafond pour courses-hotel).
   ===================================================================== */
import m from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const R=path.join(path.dirname(fileURLToPath(import.meta.url)),'supabase/functions')+'/';
async function charger(dir, env){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ela-fn-'));
  for(const f of fs.readdirSync(R+dir)){ if(f.endsWith('.js')) fs.copyFileSync(R+dir+'/'+f,tmp+'/'+f); }
  const js=m.stripTypeScriptTypes(fs.readFileSync(R+dir+'/index.ts','utf8'));
  fs.writeFileSync(tmp+'/index.mjs',js);
  let h; globalThis.Deno={env:{get:k=>env[k]},serve:f=>{h=f}};
  await import(tmp+'/index.mjs?'+Math.random()); return h;
}
let journal=[], tg=[], rows={};
let quotaAppels=0,quotaLimite=60;
globalThis.fetch=async(url,init={})=>{
  url=String(url);
  if(url.includes('api.telegram.org')){tg.push(JSON.parse(init.body).text);return new Response('{}');}
  if(url.includes('/rpc/consommer_quota_reservation')){quotaAppels++;return new Response(JSON.stringify(quotaAppels<=quotaLimite));}
  if(url.includes('/rest/v1/courses?select=ref,statut,cree_le,bon&bon')) return new Response('[]');
  if(url.includes('/rpc/est_exploitant')) return new Response(JSON.stringify(init.headers.Authorization==='Bearer ADMIN'));
  if(url.includes('/rest/v1/courses?')){const ref=decodeURIComponent(url.match(/ref=eq\.([^&]+)/)[1]);return new Response(JSON.stringify(rows[ref]?[rows[ref]]:[]));}
  if(url.includes('journal_notifications_admin?select')){const ref=decodeURIComponent(url.match(/course_ref=eq\.([^&]+)/)[1]);return new Response(JSON.stringify(journal.filter(j=>j.course_ref===ref)));}
  if(url.includes('journal_notifications_admin')){journal.push(JSON.parse(init.body));return new Response('');}
  if(url.includes('abonnements_admin')) return new Response('[]');
  if(url.includes('/rest/v1/abonnements?')) return new Response('[]');
  return new Response('?',{status:404});
};
const reussis=[],echecs=[];const ok=(c,msg)=>(c?reussis:echecs).push(msg);
const h=await charger('nouvelle-demande',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',TELEGRAM_TOKEN:'t',TELEGRAM_CHAT:'c'});
const post=(b)=>h(new Request('http://x',{method:'POST',body:JSON.stringify(b)}));
rows['ELA-26-09-0007']={ref:'ELA-26-09-0007',cree_le:new Date().toISOString(),bon:{ref:'ELA-26-09-0007',course:{departPublic:'Orly',arrivee:'Paris',date:'2026-09-28',heure:'10:00'},prix:{total:60}}};
rows['ELA-26-01-0001']={ref:'ELA-26-01-0001',cree_le:'2026-01-01T00:00:00Z',bon:{ref:'ELA-26-01-0001',course:{}}};
let r=await post({type:'INSERT',table:'courses',record:{ref:'ELA-99-99-9999',bon:{course:{depart:'CLIQUEZ http://pirate'}}}});
ok(tg.length===0,'faux INSERT (course inconnue) : aucune alerte');
r=await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-09-0007',bon:{course:{departPublic:'CLIQUEZ http://pirate'}}}});
ok(tg.length===1 && !tg[0].includes('pirate') && tg[0].includes('Orly'),'vraie course : alerte avec le contenu du SERVEUR, pas celui reçu');
await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-09-0007'}});
ok(tg.length===1,'rejeu : pas de seconde alerte');
await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-01-0001'}});
ok(tg.length===1,'course ancienne : pas d\'alerte');
const p=await charger('prevenir-client',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',SUPABASE_ANON_KEY:'A',VAPID_PUBLIQUE:'x',VAPID_PRIVEE:'y'});
const pp=(auth)=>p(new Request('http://x',{method:'POST',headers:auth?{authorization:auth}:{},body:JSON.stringify({ref:'ELA-26-09-0007',url:'https://pirate.example'})}));
ok((await pp()).status===403,'prevenir-client sans jeton : 403');
ok((await pp('Bearer sb_publishable_xxx')).status===403,'prevenir-client avec la clé publique : 403');
ok((await pp('Bearer ADMIN')).status===200,'prevenir-client exploitant : accepté');

// courses-hotel : le code de la réception est plafonné en nombre d'essais,
// et le plafond est vérifié AVANT la comparaison du code.
const hc=await charger('courses-hotel',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',HOTEL_EASYHOTEL_AEROVILLE_CODE:'easyhotel-9F3K2Q'});
const hp=(code)=>hc(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},body:JSON.stringify({hotel:'easyhotel-aeroville',code})}));
quotaAppels=0;quotaLimite=60;
ok((await hp('easyhotel-9F3K2Q')).status===200,'réception : bon code accepté sous le plafond');
ok((await hp('mauvais')).status===401,'réception : mauvais code refusé');
quotaAppels=60;
ok((await hp('easyhotel-9F3K2Q')).status===429,'réception : plafond atteint → refus MÊME avec le bon code');

console.log('=== RÉUSSIS ('+reussis.length+') ===');reussis.forEach(x=>console.log('  ✓ '+x));
if(echecs.length){console.log('=== ÉCHECS ('+echecs.length+') ===');echecs.forEach(x=>console.log('  ✗ '+x));process.exit(1);}
