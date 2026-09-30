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
  let js=m.stripTypeScriptTypes(fs.readFileSync(R+dir+'/index.ts','utf8'));
  /* La Réception partage désormais la signature de session avec la fonction
     de dépôt. Le test reste autonome : il transpile ce module localement au
     lieu de tenter d'importer un .ts depuis le dossier temporaire. */
  if(js.includes('../_shared/hotel-session.ts')){
    const partage=m.stripTypeScriptTypes(fs.readFileSync(R+'_shared/hotel-session.ts','utf8'));
    fs.writeFileSync(tmp+'/hotel-session.mjs',partage);
    js=js.replace('../_shared/hotel-session.ts','./hotel-session.mjs');
  }
  fs.writeFileSync(tmp+'/index.mjs',js);
  let h; globalThis.Deno={env:{get:k=>env[k]},serve:f=>{h=f}};
  await import(tmp+'/index.mjs?'+Math.random()); return h;
}
let journal=[], tg=[], rows={};
let quotaAppels=0,quotaLimite=60,listeHotel=[],ecritures=[];
globalThis.fetch=async(url,init={})=>{
  url=String(url);
  if(url.includes('api.telegram.org')){tg.push(JSON.parse(init.body).text);return new Response('{}');}
  if(url.includes('/rpc/consommer_quota_reservation')){quotaAppels++;return new Response(JSON.stringify(quotaAppels<=quotaLimite));}
  if(url.includes('/rest/v1/courses?select=ref,statut,cree_le,bon&bon')) return new Response(JSON.stringify(listeHotel));
  if(init.method==='PATCH'||init.method==='POST'&&url.includes('/rest/v1/courses')){ecritures.push(url);return new Response('');}
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

/* LE PRIX NE SORT QUE TANT QUE LA COURSE EST À VENIR (30/09/2026). On cherche
   la VALEUR dans la réponse brute, pas le mot « prix » : c'est ce que lirait
   quelqu'un dans les outils du navigateur. Chaque montant est unique. */
quotaAppels=0;
const bonDe=(ref,total)=>({provenanceCle:'easyhotel-aeroville',course:{date:'2026-09-30',heure:'10:00'},prix:{total}});
listeHotel=[['H1','attente',111],['H2','confirmee',222],['H3','realisee',333],['H4','refusee',444],['H5','annulee',555]]
  .map(([ref,statut,t])=>({ref,statut,cree_le:'2026-09-30',bon:bonDe(ref,t)}));
listeHotel[1].bon.modifieLe='2026-09-30T08:00:00Z';
{
  const t=await (await hp('easyhotel-9F3K2Q')).text();
  ok(t.includes('111')&&t.includes('222'),'réception : le prix d\'une course À VENIR est envoyé (attente, confirmée)');
  ok(!t.includes('333'),'réception : AUCUNE trace du prix d\'une course RÉALISÉE dans la réponse');
  ok(!t.includes('444')&&!t.includes('555'),'réception : ni d\'une course non prise, ni d\'une course annulée');
  const cs=JSON.parse(t).courses;
  ok(cs.filter(c=>'prix' in c).length===2,'réception : le champ « prix » est ABSENT des courses finies, pas mis à zéro');
  ok(cs[1].modifie==='2026-09-30T08:00:00Z','réception : la date de modification par Elatransfer est transmise');
}
/* LA RÉCEPTION NE PEUT PLUS DEMANDER D'ANNULATION (30/09/2026). */
{
  quotaAppels=0; ecritures=[];
  const r=await hc(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},
    body:JSON.stringify({hotel:'easyhotel-aeroville',code:'easyhotel-9F3K2Q',action:'annulation',ref:'H2'})}));
  ok(r.status===403,'réception : l\'action « annulation » est refusée (403)');
  ok(ecritures.length===0,'réception : et rien n\'est écrit sur la course');
}

/* cle-notifications : elle rend la clé PUBLIQUE, bien formée, et rien d'autre. */
{
  const {generateKeyPairSync}=await import('node:crypto');
  const j=generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey.export({format:'jwk'});
  const pub=Buffer.concat([Buffer.from([4]),Buffer.from(j.x,'base64url'),Buffer.from(j.y,'base64url')]).toString('base64url');
  const env={VAPID_PUBLIQUE:pub,VAPID_PRIVEE:j.d};
  const lus=[]; const hk=await charger('cle-notifications',{get VAPID_PUBLIQUE(){lus.push('pub');return env.VAPID_PUBLIQUE;},get VAPID_PRIVEE(){lus.push('PRIVEE');return env.VAPID_PRIVEE;}});
  let r=await hk(new Request('http://x',{method:'POST',body:'{}'})), t=await r.text();
  ok(r.status===200&&JSON.parse(t).cle===pub,'cle-notifications rend la clé publique posée dans les secrets');
  ok(!t.includes(j.d)&&!lus.includes('PRIVEE'),'cle-notifications ne lit ni ne rend JAMAIS la moitié privée');
  env.VAPID_PUBLIQUE=(await import('node:crypto')).randomBytes(32).toString('hex');
  r=await hk(new Request('http://x',{method:'POST',body:'{}'}));
  ok(r.status===503,'une valeur mal collée (une empreinte) est refusée, pas servie aux navigateurs');
}
console.log('=== RÉUSSIS ('+reussis.length+') ===');reussis.forEach(x=>console.log('  ✓ '+x));
if(echecs.length){console.log('=== ÉCHECS ('+echecs.length+') ===');echecs.forEach(x=>console.log('  ✗ '+x));process.exit(1);}
