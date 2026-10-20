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
function partages(tmp,js){
  for(const f of fs.readdirSync(R+'_shared')){
    if(!f.endsWith('.ts'))continue;
    const nom=f.replace(/\.ts$/,'.mjs');
    let src=m.stripTypeScriptTypes(fs.readFileSync(R+'_shared/'+f,'utf8'));
    src=src.replace(/from "\.\/([a-z-]+)\.ts"/g,'from "./$1.mjs"');
    fs.writeFileSync(tmp+'/'+nom,src);
  }
  return js.replace(/from "\.\.\/_shared\/([a-z-]+)\.ts"/g,'from "./$1.mjs"');
}
async function charger(dir, env){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ela-fn-'));
  for(const f of fs.readdirSync(R+dir)){ if(f.endsWith('.js')) fs.copyFileSync(R+dir+'/'+f,tmp+'/'+f); }
  let js=m.stripTypeScriptTypes(fs.readFileSync(R+dir+'/index.ts','utf8'));
  /* L'import de types « jsr: » de deposer-course n'existe pas pour Node. */
  js=js.replace(/^import "jsr:[^"]+";\s*$/m,'');
  /* Les modules partagés (_shared/*.ts : la session de la réception, la
     session signée commune à la démo) sont transpilés localement à côté de
     la fonction : Node n'importe pas un .ts depuis le dossier temporaire. */
  js=partages(tmp,js);
  fs.writeFileSync(tmp+'/index.mjs',js);
  let h; globalThis.Deno={env:{get:k=>env[k]},serve:f=>{h=f}};
  await import(tmp+'/index.mjs?'+Math.random()); return h;
}
let journal=[], tg=[], rows={}, secretRelance=null;
let quotaAppels=0,quotaLimite=60,listeHotel=[],ecritures=[];
globalThis.fetch=async(url,init={})=>{
  url=String(url);
  if(url.includes('api.telegram.org')){tg.push(JSON.parse(init.body).text);return new Response('{}');}
  if(url.includes('/rpc/consommer_quota_reservation')){quotaAppels++;return new Response(JSON.stringify(quotaAppels<=quotaLimite));}
  if(url.includes('/rest/v1/courses?select=ref,statut,cree_le,bon&bon')) return new Response(JSON.stringify(listeHotel));
  if(init.method==='PATCH'||init.method==='POST'&&url.includes('/rest/v1/courses')){ecritures.push(url);return new Response('');}
  if(url.includes('/rpc/est_exploitant')) return new Response(JSON.stringify(init.headers.Authorization==='Bearer ADMIN'));
  /* Le secret de la relance, lu dans la base par la clé de service (19/10/2026) : null = pas de verrou. */
  if(url.includes('/rpc/ela_relance_secret')) return new Response(JSON.stringify(secretRelance));
  /* La relance relit les demandes en attente : ici il n'y en a aucune. */
  if(url.includes('/rest/v1/courses?select=ref,bon,cree_le&statut=eq.attente')) return new Response('[]');
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
rows['ELA-26-09-0007']={ref:'ELA-26-09-0007',cree_le:new Date().toISOString(),bon:{ref:'ELA-26-09-0007',securite:{empreinteDepot:'e'},course:{departPublic:'Orly',arrivee:'Paris',date:'2026-09-28',heure:'10:00'},prix:{total:60}}};
/* Une course SANS empreinte de dépôt n'est pas passée par deposer-course : c'est une saisie de l'exploitant, jamais annoncée (2/10/2026). */
rows['ELA-26-09-0008']={ref:'ELA-26-09-0008',cree_le:new Date().toISOString(),bon:{ref:'ELA-26-09-0008',course:{departPublic:'Orly',arrivee:'Paris',date:'2026-09-28',heure:'10:00'},prix:{total:60}}};
rows['ELA-26-01-0001']={ref:'ELA-26-01-0001',cree_le:'2026-01-01T00:00:00Z',bon:{ref:'ELA-26-01-0001',course:{}}};
let r=await post({type:'INSERT',table:'courses',record:{ref:'ELA-99-99-9999',bon:{course:{depart:'CLIQUEZ http://pirate'}}}});
ok(tg.length===0,'faux INSERT (course inconnue) : aucune alerte');
r=await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-09-0007',bon:{course:{departPublic:'CLIQUEZ http://pirate'}}}});
ok(tg.length===1 && !tg[0].includes('pirate') && tg[0].includes('Orly'),'vraie course : alerte avec le contenu du SERVEUR, pas celui reçu');
await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-09-0007'}});
ok(tg.length===1,'rejeu : pas de seconde alerte');
await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-01-0001'}});
ok(tg.length===1,'course ancienne : pas d\'alerte');
await post({type:'INSERT',table:'courses',record:{ref:'ELA-26-09-0008'}});
ok(tg.length===1,'saisie de l\'exploitant (sans empreinte de dépôt) : aucune alerte');
/* LE SECRET DE LA RELANCE (19/10/2026, P2). La fonction lit le secret attendu
   dans la base (RPC ela_relance_secret, clé de service) : null = pas de verrou,
   RELANCE et INSTALLER_TELEGRAM passent comme avant (la relance est l'alerte).
   Posé, l'en-tête « x-ela-relance » est exigé à l'octet près ; le webhook
   INSERT, lui, n'en a jamais besoin. RELANCE_SECRET (secret de fonction) reste
   un repli manuel qui l'emporte. */
{
  let r=await post({type:'RELANCE'});
  ok(r.status===200,'relance SANS secret dans la base : passe comme avant (HTTP '+r.status+')');
  secretRelance='relance-test-aaaa-bbbb-cccc';
  const hs=await charger('nouvelle-demande',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',TELEGRAM_TOKEN:'t',TELEGRAM_CHAT:'c'});
  const postS=(b,hdr)=>hs(new Request('http://x',{method:'POST',headers:hdr||{},body:JSON.stringify(b)}));
  const avantTg=tg.length;
  r=await postS({type:'RELANCE'});
  ok(r.status===401,'relance avec secret dans la base, sans en-tête : 401 (HTTP '+r.status+')');
  r=await postS({type:'RELANCE'},{'x-ela-relance':'relance-test-aaaa-bbbb-cccC'});
  ok(r.status===401,'relance : en-tête faux d\'un seul signe : 401 (HTTP '+r.status+')');
  r=await postS({type:'INSTALLER_TELEGRAM'});
  ok(r.status===401&&tg.length===avantTg,'INSTALLER_TELEGRAM sans en-tête : 401, aucun appel à Telegram');
  r=await postS({type:'RELANCE'},{'x-ela-relance':'relance-test-aaaa-bbbb-cccc'});
  ok(r.status===200&&(await r.text()).startsWith('relance'),'relance avec le bon en-tête : passe (HTTP '+r.status+')');
  r=await postS({type:'INSTALLER_TELEGRAM'},{'x-ela-relance':'relance-test-aaaa-bbbb-cccc'});
  ok(r.status===200&&tg.length===avantTg+1,'INSTALLER_TELEGRAM avec le bon en-tête : le webhook est posé');
  tg.length=avantTg;
  r=await postS({type:'INSERT',table:'courses',record:{ref:'ELA-26-01-0001'}});
  ok(r.status===200,'le webhook INSERT n\'a pas besoin de l\'en-tête (HTTP '+r.status+')');
  /* Le secret a tourné dans la base : la fonction relit sur un désaccord, sans attendre les 5 min. */
  secretRelance='tourne-test-dddd-eeee-ffff';
  r=await postS({type:'RELANCE'},{'x-ela-relance':'tourne-test-dddd-eeee-ffff'});
  ok(r.status===200,'secret tourné dans la base : la fonction relit et accepte la nouvelle valeur (HTTP '+r.status+')');
  r=await postS({type:'RELANCE'},{'x-ela-relance':'relance-test-aaaa-bbbb-cccc'});
  ok(r.status===401,'secret tourné : l\'ancienne valeur est refusée (HTTP '+r.status+')');
  /* Le repli manuel : RELANCE_SECRET posé l'emporte sur la base. */
  const he=await charger('nouvelle-demande',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',TELEGRAM_TOKEN:'t',TELEGRAM_CHAT:'c',RELANCE_SECRET:'repli-manuel'});
  r=await he(new Request('http://x',{method:'POST',headers:{'x-ela-relance':'repli-manuel'},body:JSON.stringify({type:'RELANCE'})}));
  ok(r.status===200,'RELANCE_SECRET posé : il l\'emporte sur la base (HTTP '+r.status+')');
  secretRelance=null;
}
const p=await charger('prevenir-client',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',SUPABASE_ANON_KEY:'A',VAPID_PUBLIQUE:'x',VAPID_PRIVEE:'y'});
const pp=(auth)=>p(new Request('http://x',{method:'POST',headers:auth?{authorization:auth}:{},body:JSON.stringify({ref:'ELA-26-09-0007',url:'https://pirate.example'})}));
ok((await pp()).status===403,'prevenir-client sans jeton : 403');
ok((await pp('Bearer sb_publishable_xxx')).status===403,'prevenir-client avec la clé publique : 403');
ok((await pp('Bearer ADMIN')).status===200,'prevenir-client exploitant : accepté');
/* LE PRÉFLIGHT CORS (audit du 9 octobre 2026, P2). L'admin envoie
   Authorization + apikey + JSON depuis elatransfer.com vers *.supabase.co :
   le navigateur demande d'abord OPTIONS, et n'envoie le POST que si la
   réponse porte les en-têtes Access-Control-*. La fonction répondait 405 nu :
   le POST ne partait JAMAIS, en silence — la notification « Transfert
   confirmé » n'arrivait à aucun client. Un faux serveur Playwright répond
   lui-même au préflight : seule la fonction chargée telle quelle le montre.
   Contre l'ancien code, les trois premiers contrôles tombent. */
{
  const opt=(origin)=>p(new Request('http://x',{method:'OPTIONS',headers:{origin,'access-control-request-method':'POST','access-control-request-headers':'authorization, apikey, content-type'}}));
  const r=await opt('https://elatransfer.com');
  ok(r.status===204&&r.headers.get('access-control-allow-origin')==='https://elatransfer.com','prevenir-client : préflight CORS depuis le site → 204 avec l\'origine autorisée ('+r.status+')');
  const permis=(r.headers.get('access-control-allow-headers')||'').toLowerCase();
  ok(permis.includes('authorization')&&permis.includes('apikey')&&permis.includes('content-type'),'prevenir-client : le préflight autorise Authorization, apikey et Content-Type — ce que l\'admin envoie');
  const r2=await p(new Request('http://x',{method:'POST',headers:{authorization:'Bearer ADMIN',origin:'https://elatransfer.com'},body:JSON.stringify({ref:'ELA-26-09-0007'})}));
  ok(r2.status===200&&r2.headers.get('access-control-allow-origin')==='https://elatransfer.com','prevenir-client : la réponse au POST porte l\'origine autorisée, sinon le navigateur la jette');
  ok((await opt('https://pirate.example')).status===403,'prevenir-client : préflight depuis une origine étrangère → 403');
  const r3=await p(new Request('http://x',{method:'POST',headers:{authorization:'Bearer ADMIN',origin:'https://pirate.example'},body:JSON.stringify({ref:'ELA-26-09-0007'})}));
  ok(!r3.headers.get('access-control-allow-origin'),'prevenir-client : aucune origine étrangère n\'est jamais autorisée en retour');
}

// courses-hotel : le code de la réception est plafonné en nombre d'essais,
// et le plafond est vérifié AVANT la comparaison du code.
const hc=await charger('courses-hotel',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',HOTEL_EASYHOTEL_AEROVILLE_CODE:'easyhotel-9F3K2Q'});
const hp=(code)=>hc(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},body:JSON.stringify({hotel:'easyhotel-aeroville',code})}));
quotaAppels=0;quotaLimite=60;
ok((await hp('easyhotel-9F3K2Q')).status===200,'réception : bon code accepté sous le plafond');
ok((await hp('mauvais')).status===401,'réception : mauvais code refusé');
quotaAppels=60;
ok((await hp('easyhotel-9F3K2Q')).status===429,'réception : plafond atteint → refus MÊME avec le bon code');
/* UNE SESSION VALIDE NE CONSOMME PAS LE QUOTA (audit du 02/10/2026). La
   liste se relit toutes les 30 s : comptée, elle épuisait seule les 60
   essais en une demi-heure et la tablette du comptoir se bloquait. Le
   plafond protège le CODE, pas la lecture d'une réception déjà entrée. */
{
  quotaAppels=0;
  const sessionRec=(await (await hp('easyhotel-9F3K2Q')).json()).session;
  ok(typeof sessionRec==='string'&&sessionRec.length>20,'réception : le bon code rend une session signée');
  const hs=(session)=>hc(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},body:JSON.stringify({hotel:'easyhotel-aeroville',session})}));
  quotaAppels=60;
  ok((await hs(sessionRec)).status===200,'réception : plafond atteint, mais une session VALIDE lit encore sa liste');
  ok(quotaAppels===60,'réception : la lecture par session n\'a consommé AUCUN essai du quota');
  ok((await hs(sessionRec+'x')).status===429,'réception : une session FAUSSE compte comme un essai et tombe sur le plafond');
}

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

/* LA RÉCEPTION SUPPRIME DE SA LISTE, LE SERVEUR MARQUE SANS EFFACER
   (20/10/2026). On lit ce qui PART à la base : une écriture PATCH sous
   condition de version qui pose « supprimeeReception », jamais un DELETE ;
   un hôtel ne marque que SA course ; Telegram n'est prévenu que sur une
   course encore à venir, sans nom, téléphone ni chambre du client. */
{
  const table={
    'ELA-R1':{ref:'ELA-R1',statut:'confirmee',version:7,bon:{provenanceCle:'easyhotel-aeroville',numero:1042,course:{date:'2026-10-21',heure:'08:00',departPublic:'easyHotel Aéroville',depart:'easyHotel Aéroville (ch. 214)',arrivee:'Orly 1',chambre:'214'},client:{nom:'Mme Durand',telephone:'0655443322'},chauffeur:{nom:'Mehmet',telephone:'0612345678'},prix:{total:90}}},
    'ELA-R2':{ref:'ELA-R2',statut:'realisee',version:3,bon:{provenanceCle:'easyhotel-aeroville',course:{date:'2026-10-18',heure:'10:00',arrivee:'CDG'},client:{nom:'M. Petit',telephone:'0611223344'},prix:{total:35}}},
    'ELA-R3':{ref:'ELA-R3',statut:'attente',version:1,bon:{provenanceCle:'autre-hotel',course:{date:'2026-10-22',heure:'09:00'},client:{nom:'X'},prix:{total:50}}},
  };
  const patchs=[],dels=[];let versionBougee=false;
  const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('api.telegram.org')){tg.push(JSON.parse(init.body).text);return new Response('{}');}
    if(init.method==='DELETE'){dels.push(url);return new Response('[]');}
    if(init.method==='PATCH'){
      const ref=decodeURIComponent(url.match(/ref=eq\.([^&]+)/)[1]);
      const v=Number((url.match(/version=eq\.(\d+)/)||[])[1]);
      patchs.push({ref,version:v,bon:JSON.parse(init.body).bon});
      if(versionBougee){versionBougee=false;table[ref].version++;return new Response('[]');}
      if(!table[ref]||table[ref].version!==v)return new Response('[]');
      table[ref].bon=JSON.parse(init.body).bon;table[ref].version++;
      return new Response(JSON.stringify([{ref}]));
    }
    if(url.includes('/rest/v1/courses?select=ref,statut,version,bon&ref=eq.')){
      const ref=decodeURIComponent(url.match(/ref=eq\.([^&]+)/)[1]);
      const cle=decodeURIComponent(url.match(/provenanceCle=eq\.([^&]+)/)[1]);
      const l=table[ref];return new Response(JSON.stringify(l&&l.bon.provenanceCle===cle?[l]:[]));
    }
    if(url.includes('/rest/v1/courses?select=ref,statut,cree_le,bon&bon'))
      return new Response(JSON.stringify(Object.values(table).filter(l=>l.bon.provenanceCle==='easyhotel-aeroville'&&(url.includes('supprimeeReception=is.null')?!l.bon.supprimeeReception:true))));
    return fetchAvant(url,init);
  };
  const hcT=await charger('courses-hotel',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',HOTEL_EASYHOTEL_AEROVILLE_CODE:'easyhotel-9F3K2Q',TELEGRAM_TOKEN:'t',TELEGRAM_CHAT:'c'});
  const sup=(ref)=>hcT(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},
    body:JSON.stringify({hotel:'easyhotel-aeroville',code:'easyhotel-9F3K2Q',action:'supprimer',ref})}));
  quotaAppels=0;tg.length=0;
  let r=await sup('ELA-R3');
  ok(r.status===404&&patchs.length===0,'réception : la course d\'un AUTRE hôtel est « introuvable », rien n\'est écrit');
  r=await sup('ELA-R1');
  ok(r.status===200&&(await r.json()).ok===true,'réception : « supprimer » sur sa course à venir rend ok');
  ok(dels.length===0,'réception : AUCUN DELETE ne part — la ligne reste');
  ok(patchs.length===1&&patchs[0].ref==='ELA-R1'&&patchs[0].version===7,'réception : une écriture PATCH, sous condition de la version lue');
  ok(typeof patchs[0].bon.supprimeeReception==='string'&&patchs[0].bon.supprimeeReceptionPar==='easyhotel-aeroville'&&patchs[0].bon.chauffeur.nom==='Mehmet',
    'réception : le bon est MARQUÉ (supprimeeReception, par qui), le reste du bon intact');
  ok(tg.length===1&&/1042/.test(tg[0])&&/Mehmet/.test(tg[0])&&/Orly/.test(tg[0]),'réception : Barbaros est prévenu sur Telegram (N°, chauffeur, trajet) pour une course à venir',tg[0]);
  ok(tg.length===1&&!/Durand|0655|214/.test(tg[0]),'réception : le message ne porte ni le nom, ni le téléphone, ni la chambre du client',tg[0]);
  r=await sup('ELA-R1');
  ok(r.status===200&&patchs.length===1,'réception : rejouée, la suppression constate et n\'écrit plus');
  tg.length=0;
  r=await sup('ELA-R2');
  ok(r.status===200&&patchs.length===2&&patchs[1].ref==='ELA-R2','réception : une course RÉALISÉE se supprime aussi (marquée, pas effacée)');
  ok(tg.length===0,'réception : une course finie ne prévient personne — rien à rappeler');
  const liste=await (await hcT(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},
    body:JSON.stringify({hotel:'easyhotel-aeroville',code:'easyhotel-9F3K2Q'})}))).json();
  ok(Array.isArray(liste.courses)&&liste.courses.length===0,'réception : les courses marquées ne reviennent plus dans sa liste');
  /* Un conflit de version : la base a bougé entre la lecture et l'écriture.
     On relit et on réécrit UNE fois ; jamais d'écrasement sans condition. */
  table['ELA-R4']={ref:'ELA-R4',statut:'attente',version:2,bon:{provenanceCle:'easyhotel-aeroville',course:{date:'2026-10-23',heure:'11:00'},prix:{total:40}}};
  versionBougee=true;tg.length=0;const avant=patchs.length;
  r=await sup('ELA-R4');
  ok(r.status===200&&patchs.length===avant+2&&patchs[avant].version===2&&patchs[avant+1].version===3&&table['ELA-R4'].bon.supprimeeReception,
    'réception : la version a bougé → on relit et on réécrit une fois, sous la nouvelle version');
  ok(dels.length===0,'réception : toujours aucun DELETE, sur toute la séquence');
  r=await hcT(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.4'},
    body:JSON.stringify({hotel:'easyhotel-aeroville',code:'easyhotel-9F3K2Q',action:'supprimer',ref:'../x'})}));
  ok(r.status===400,'réception : une référence mal formée est refusée avant toute lecture');
  globalThis.fetch=fetchAvant;
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
/* deposer-course : LE QUOTA D'UNE RÉCEPTION IDENTIFIÉE EST LE SIEN, PAS CELUI
   DU WIFI (2/10/2026). Douze dépôts par heure et par IP : la tablette du
   comptoir et les clients sur le wifi de l'hôtel partagent la même adresse.
   On lit la CLÉ de quota envoyée au serveur : deux dépôts depuis la même IP,
   l'un anonyme, l'autre par la réception, ne doivent pas se compter ensemble. */
{
  const clesQuota=[];
  const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')){clesQuota.push(JSON.parse(init.body));return new Response('true');}
    /* Un seul partenaire existe pour le faux serveur : easyHotel. Toute autre clé est inconnue. */
    if(url.includes('/rest/v1/partenaires')) return new Response(url.includes('cle=eq.easyhotel-aeroville')?'[{"id":"p1"}]':'[]');
    if(url.includes('/rest/v1/courses?ref=eq.')) return new Response('[]');
    if(url.includes('/rpc/ela_deposer_course_serveur')) return new Response('"ok"');
    return fetchAvant(url,init);
  };
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',HOTEL_EASYHOTEL_AEROVILLE_CODE:'easyhotel-9F3K2Q'});
  const tmpS=fs.mkdtempSync(path.join(os.tmpdir(),'ela-sess-'));
  partages(tmpS,'');
  const {creerSessionHotel}=await import(tmpS+'/hotel-session.mjs');
  const session=await creerSessionHotel('easyhotel-aeroville','easyhotel-9F3K2Q');
  const bon=(ref,reception,prov)=>({ref,course:{depart:'easyHotel Aéroville',arrivee:'Orly',date:'2026-10-12',heure:'06:30',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:30,chambre:reception?'214':''},
    client:{nom:'Client',telephone:'0612345678'},prix:{total:90},paiement:'carte',provenanceCle:prov!==undefined?prov:(reception?'easyhotel-aeroville':''),parReception:!!reception});
  const depot=(ref,reception,prov)=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.9','content-type':'application/json'},
    body:JSON.stringify({bon:bon(ref,reception,prov),sessionReception:reception?session:''})}));
  const r1=await depot('ELA-26-10-QA1AA',false), r2=await depot('ELA-26-10-QB2BB',true);
  ok(r1.status===201&&r2.status===201,'deposer-course : un dépôt anonyme et un dépôt de réception passent ('+r1.status+'/'+r2.status+')');
  ok(clesQuota.length===2&&clesQuota[0].p_cle!==clesQuota[1].p_cle,'deposer-course : la réception identifiée a SA clé de quota, pas celle du wifi');
  ok(clesQuota[0]?.p_limite===12&&clesQuota[1]?.p_limite===60,'deposer-course : 12 par heure et par IP pour un anonyme, 60 pour une réception');
  const {createHash}=await import('node:crypto');
  const heure=new Date().toISOString().slice(0,13);
  ok(clesQuota[1]?.p_cle===createHash('sha256').update('reception|easyhotel-aeroville|'+heure).digest('hex'),'deposer-course : la clé de la réception est celle de l\'hôtel et de l\'heure, jamais l\'adresse IP');
  const r3=await depot('ELA-26-10-QC3CC',true);
  ok(r3.status===201&&clesQuota[2]?.p_cle===clesQuota[1]?.p_cle,'deposer-course : deux dépôts de la même réception comptent sur la même clé');
  /* LES CLIENTS DU QR (3/10/2026, « la 2 ») : pas de session, mais la clé d'un
     partenaire RÉEL → compteur propre « hôtel + adresse + heure », plafond 30.
     Une clé d'hôtel inventée ne donne RIEN de plus que l'anonyme ordinaire :
     sinon chaque clé inventée serait un compteur neuf. */
  const r4=await depot('ELA-26-10-QD4DD',false,'easyhotel-aeroville');
  ok(r4.status===201&&clesQuota[3]?.p_limite===30,'deposer-course : un client du QR d\'un hôtel partenaire a un plafond de 30, pas 12 ('+clesQuota[3]?.p_limite+')');
  ok(clesQuota[3]?.p_cle===createHash('sha256').update('hotel|easyhotel-aeroville|10.0.0.9|'+heure).digest('hex'),'deposer-course : sa clé mêle l\'hôtel, l\'adresse et l\'heure — distincte de l\'anonyme et de la réception');
  ok(clesQuota[3]?.p_cle!==clesQuota[0]?.p_cle&&clesQuota[3]?.p_cle!==clesQuota[1]?.p_cle,'deposer-course : les trois compteurs (anonyme, QR hôtel, réception) ne se mélangent pas');
  const r5=await depot('ELA-26-10-QE5EE',false,'hotel-invente');
  globalThis.fetch=fetchAvant;
  ok(r5.status===201&&clesQuota[4]?.p_limite===12&&clesQuota[4]?.p_cle===clesQuota[0]?.p_cle,'deposer-course : une clé d\'hôtel inconnue reste comptée comme un anonyme ordinaire (12, même compteur)');
}
/* deposer-course : LE N° COURT REVIENT AU CLIENT (5 octobre 2026). La base
   l'attribue à l'écriture et le recopie dans le bon ; la fonction le relit
   et le rend. AVANT la migration le bon n'en porte pas : le dépôt passe
   comme avant — la demande est enregistrée, seul le N° manque. */
{
  let apres=false, colonne=true;
  const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')) return new Response('true');
    if(url.includes('/rest/v1/partenaires')) return new Response('[]');
    if(url.includes('/rest/v1/courses?ref=eq.')){
      if(!apres) return new Response('[]');
      if(!colonne) return new Response(JSON.stringify([{bon:{ref:'x'}}]));
      return new Response(JSON.stringify([{bon:{ref:'x',numero:1042}}]));
    }
    if(url.includes('parametres_commerciaux?cle=eq.tarif_general_berline')) return new Response(JSON.stringify([{valeur:{par_km_centimes:290,minimum_centimes:3500}}]));
    if(url.includes('/rpc/ela_deposer_course_serveur')){apres=true;return new Response('"ok"');}
    return fetchAvant(url,init);
  };
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const bonN=ref=>({ref,course:{depart:'10 rue de Rivoli, Paris',arrivee:'Orly',date:'2026-10-12',heure:'06:30',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:20},
    client:{nom:'Client',telephone:'0612345678'},prix:{total:60},paiement:'carte'});
  const depotN=ref=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.7','content-type':'application/json'},body:JSON.stringify({bon:bonN(ref)})}));
  const a=await depotN('ELA-26-10-NA1AA'); const ja=await a.json().catch(()=>({}));
  ok(a.status===201&&ja.numero===1042,'deposer-course : le N° court attribué par la base revient au client ('+a.status+', '+ja.numero+')');
  apres=false; colonne=false;
  const b=await depotN('ELA-26-10-NB2BB'); const jb=await b.json().catch(()=>({}));
  ok(b.status===201&&!('numero' in jb),'deposer-course : sans la colonne (migration pas encore appliquée), le dépôt passe sans N° ('+b.status+')');
  globalThis.fetch=fetchAvant;
}
/* deposer-course : LE LIEU STRUCTURÉ EST GARDÉ, ET LE PRIX AU KILOMÈTRE EST
   CONTRÔLÉ (4 octobre 2026). Avant, le serveur jetait les coordonnées et
   acceptait « Paris → Roissy, 5 € » envoyé depuis la console. Aucune route
   n'est plus courte que la ligne droite : en dessous de ce minimum, la
   course est SIGNALÉE — jamais refusée, un ancien tarif gardé en mémoire
   par un téléphone n'est pas une fraude. On lit le bon tel qu'il part en
   base, pas la réponse HTTP. */
{
  const deposes=[];
  const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')) return new Response('true');
    if(url.includes('/rest/v1/partenaires')) return new Response('[]');
    if(url.includes('/rest/v1/courses?ref=eq.')) return new Response('[]');
    if(url.includes('parametres_commerciaux?cle=eq.tarif_general_berline')) return new Response(JSON.stringify([{valeur:{par_km_centimes:290,minimum_centimes:3000}}]));
    if(url.includes('/rpc/ela_deposer_course_serveur')){deposes.push(JSON.parse(init.body).p_bon);return new Response('"ok"');}
    return fetchAvant(url,init);
  };
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  /* Place Vendôme → Terminal 2E de Roissy : 23,2 km en ligne droite, donc
     au moins 2,90 × 23,2 = 67,3 → 60 € (dizaine INFÉRIEURE) avant même de
     prendre la route. Calculé à la main, pas relu dans la sortie. */
  const vendome={nom:'Place Vendôme',adresse:'Place Vendôme, 75001 Paris',latitude:48.8675,longitude:2.3292,provider:'photon',providerId:'N1',categorie:'culture'};
  const cdg={nom:'Terminal 2E',adresse:'Terminal 2E — Aéroport Roissy-Charles de Gaulle',latitude:48.9998,longitude:2.5740,provider:'elatransfer',providerId:'aeroport:cdg:Terminal 2E',categorie:'aeroport'};
  const bonKm=(ref,total,extra={})=>({ref,course:Object.assign({depart:'Place Vendôme',arrivee:'Terminal 2E',date:'2026-10-12',heure:'06:30',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:31,departLieu:vendome,arriveeLieu:cdg,itineraireSource:'ors'},extra),
    client:{nom:'Client',telephone:'0612345678'},prix:{total},paiement:'carte'});
  const dep=(bon)=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.7','content-type':'application/json'},body:JSON.stringify({bon})}));
  const a=await dep(bonKm('ELA-26-10-LA1AA',90));
  const ba=deposes[0]||{};
  ok(a.status===201,'deposer-course : une course au kilomètre honnête passe ('+a.status+')');
  ok(ba.course?.departLieu?.latitude===48.8675&&ba.course?.arriveeLieu?.provider==='elatransfer','deposer-course : les lieux structurés sont GARDÉS en base (avant : jetés)');
  ok(ba.course?.itineraireSource==='ors','deposer-course : la source de l\'itinéraire est gardée');
  ok(!ba.securite?.prixSousLigneDroite,'deposer-course : un prix honnête n\'est pas signalé');
  const b2=await dep(bonKm('ELA-26-10-LB2BB',5));
  const bb=deposes[1]||{};
  ok(b2.status===201,'deposer-course : un prix trop bas est SIGNALÉ, pas refusé ('+b2.status+')');
  ok(bb.securite?.prixSousLigneDroite?.minimum===60&&bb.securite.prixSousLigneDroite.ligneDroiteKm===23.2,
     'deposer-course : « Vendôme → Roissy à 5 € » porte le signalement, minimum 60 € sur 23,2 km ('+JSON.stringify(bb.securite?.prixSousLigneDroite)+')');
  const c3=await dep(bonKm('ELA-26-10-LC3CC',5,{destinationCle:'cdg'}));
  ok(c3.status===201&&!(deposes[2]||{}).securite?.prixSousLigneDroite,'deposer-course : un forfait partenaire n\'est pas jugé au kilomètre (prix d\'appel voulu)');
  const d4=await dep(bonKm('ELA-26-10-LD4DD',90,{departLieu:{latitude:200,longitude:2,adresse:'x'},arriveeLieu:{latitude:'48.9',longitude:2.5,adresse:'<b>'.repeat(200),provider:'pirate'},itineraireSource:'google'}));
  const bd=deposes[3]||{};
  ok(d4.status===201&&bd.course?.departLieu===null,'deposer-course : des coordonnées hors du globe sont écartées, la course passe');
  ok(bd.course?.arriveeLieu?.provider==='inconnu'&&bd.course.arriveeLieu.adresse.length<=300&&bd.course.itineraireSource==='','deposer-course : source inconnue, texte borné, itinéraire inconnu vidé');
  const e5=await dep(bonKm('ELA-26-10-LE5EE',90,{departLieu:undefined,arriveeLieu:undefined,itineraireSource:undefined}));
  ok(e5.status===201&&(deposes[4]||{}).course?.departLieu===null,'deposer-course : une page ancienne sans lieux structurés passe comme avant');
  /* PAR OÙ JOINDRE LE CLIENT (4 octobre 2026) : le choix du site est GARDÉ
     en base — sans lui l'admin ne le voit jamais — et seules deux listes
     fermées passent. Une page ancienne sans ce champ dépose comme avant. */
  const nc=deposes.length;
  const avecContact=(ref,contact)=>{const x=bonKm(ref,90);x.contact=contact;return x;};
  const k1=await dep(avecContact('ELA-26-10-LK1KK',{envoi:'site',prefere:'telegram'}));
  ok(k1.status===201&&deposes[nc]?.contact?.envoi==='site'&&deposes[nc]?.contact?.prefere==='telegram',
     'deposer-course : le canal du client est gardé en base ('+JSON.stringify(deposes[nc]?.contact)+')');
  const k2=await dep(avecContact('ELA-26-10-LK2KK',{envoi:'pigeon',prefere:'telegram'}));
  ok(k2.status===201&&deposes[nc+1]?.contact===null,'deposer-course : un canal d\'envoi inconnu est écarté, la course passe');
  const k3=await dep(avecContact('ELA-26-10-LK3KK',{envoi:'whatsapp',prefere:'<script>'}));
  ok(k3.status===201&&deposes[nc+2]?.contact?.prefere==='','deposer-course : une préférence inconnue est vidée');
  ok((deposes[4]||{}).contact===null,'deposer-course : une page sans ce champ dépose comme avant (contact nul)');
  /* LES DEMANDES HORS CAS STANDARD (4 octobre 2026) : elles passent, mais
     leur prix est FORCÉ À ZÉRO — un client ne peut pas y glisser un montant
     — et ailleurs un prix positif est EXIGÉ : le 0 € passait sans un mot. */
  const n0=deposes.length;
  const f6=await dep(bonKm('ELA-26-10-LF6FF',5,{tarifAConfirmer:true,motifsTarif:['longue','pirate'],immediat:true,distanceKm:4200}));
  const bf=deposes[n0]||{};
  ok(f6.status===201,'deposer-course : une longue distance (4 200 km) « tarif à confirmer » passe ('+f6.status+')');
  ok(bf.prix?.total===0&&bf.course?.tarifAConfirmer===true,'deposer-course : le prix d\'une demande « à confirmer » est forcé à 0 (envoyé : 5 €, gardé : '+bf.prix?.total+')');
  ok(JSON.stringify(bf.course?.motifsTarif)==='["longue"]'&&bf.course?.immediat===true,'deposer-course : motifs filtrés (« pirate » écarté), « immédiat » gardé');
  ok(!bf.securite?.prixSousLigneDroite,'deposer-course : une demande « à confirmer » n\'est pas jugée au kilomètre');
  const g7=await dep(bonKm('ELA-26-10-LG7GG',0));
  ok(g7.status===400&&deposes.length===n0+1,'deposer-course : un prix à 0 € sans « tarif à confirmer » est REFUSÉ ('+g7.status+')');
  const h8=await dep(bonKm('ELA-26-10-LH8HH',0,{tarifAConfirmer:true,motifsTarif:[]}));
  ok(h8.status===400,'deposer-course : « à confirmer » sans motif reconnu ne contourne pas la règle du prix ('+h8.status+')');
  const i9=await dep(bonKm('ELA-26-10-LI9II',0,{tarifAConfirmer:true,motifsTarif:['groupe'],passagers:'12 passagers · 14 bagages'}));
  const bi=deposes[deposes.length-1]||{};
  ok(i9.status===201&&bi.course?.passagersNombre===12&&bi.course?.multiVehicules===true,'deposer-course : un groupe de 12 passe, marqué « plusieurs véhicules » ('+i9.status+')');
  /* LES PÉAGES NON COMPRIS (19 octobre 2026, B2) : la demande garde ce que
     le client a LU à côté du prix (« oui », « possible »), pour que l'admin
     l'ajoute au lien de paiement. Une valeur inconnue est vidée, et une
     demande sans prix n'a rien à en dire. */
  const p1=await dep(bonKm('ELA-26-10-LP1PP',70,{peages:'oui'}));
  ok(p1.status===201&&(deposes[deposes.length-1]||{}).course?.peages==='oui','deposer-course : « péages : oui » est gardé ('+p1.status+')');
  const p2=await dep(bonKm('ELA-26-10-LP2PP',70,{peages:'<b>tout</b>'}));
  ok(p2.status===201&&(deposes[deposes.length-1]||{}).course?.peages==='','deposer-course : une mention de péages inconnue est vidée');
  const p3=await dep(bonKm('ELA-26-10-LP3PP',0,{tarifAConfirmer:true,motifsTarif:['longue'],peages:'possible'}));
  ok(p3.status===201&&(deposes[deposes.length-1]||{}).course?.peages==='','deposer-course : une demande « à confirmer » ne porte pas de mention de péages');
  globalThis.fetch=fetchAvant;
}
/* deposer-course : LE LIEN DE SUIVI D'UN PARTENAIRE (15 octobre 2026). Le
   code n'est retenu que si la base le connaît ; il pose alors la provenance
   « Lien · <nom> ». Un code inventé, mal formé ou une base muette ne
   bloquent rien : la course part sans source. On lit le bon tel qu'il part
   en base, et on COMPTE les lectures de « liens_suivi » : un code mal formé
   ne doit même pas interroger la base. */
{
  const deposes=[]; let lectures=0, panne=false;
  const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')) return new Response('true');
    if(url.includes('/rest/v1/partenaires')) return new Response('[]');
    if(url.includes('/rest/v1/courses?ref=eq.')) return new Response('[]');
    if(url.includes('/rest/v1/liens_suivi')){
      lectures++;
      if(panne) return new Response('boom',{status:500});
      return new Response(url.includes('code=eq.hotel-exemple')?JSON.stringify([{code:'hotel-exemple',nom:'Hôtel Exemple Roissy'}]):'[]');
    }
    if(url.includes('parametres_commerciaux')) return new Response('[]');
    if(url.includes('/rpc/ela_deposer_course_serveur')){deposes.push(JSON.parse(init.body).p_bon);return new Response('"ok"');}
    return fetchAvant(url,init);
  };
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const bonVia=(ref,via,extra={})=>Object.assign({ref,course:{depart:'Terminal 2E',arrivee:'Paris',date:'2026-10-20',heure:'10:00',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:30},
    client:{nom:'Client',telephone:'0612345678'},prix:{total:90},paiement:'lien',provenance:'Site anglais · CDG ↔ Paris'},via===undefined?{}:{via},extra);
  const dep=(bon)=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.8','content-type':'application/json'},body:JSON.stringify({bon})}));
  const r1=await dep(bonVia('ELA-26-10-LV1AA','hotel-exemple'));
  const b1=deposes[0]||{};
  ok(r1.status===201&&b1.via==='hotel-exemple'&&b1.viaNom==='Hôtel Exemple Roissy','deposer-course : un lien connu est retenu, avec le nom du partenaire ('+r1.status+', '+b1.via+')');
  ok(b1.provenance==='Lien · Hôtel Exemple Roissy · Site anglais · CDG ↔ Paris','deposer-course : la provenance dit le partenaire ET garde la page d\'origine ('+b1.provenance+')');
  const r2=await dep(bonVia('ELA-26-10-LV2BB','inconnu'));
  const b2=deposes[1]||{};
  ok(r2.status===201&&!('via' in b2)&&b2.provenance==='Site anglais · CDG ↔ Paris','deposer-course : un code inventé est ignoré, la provenance de la page reste');
  const avant=lectures;
  const r3=await dep(bonVia('ELA-26-10-LV3CC','<script>alert(1)</script>'));
  ok(r3.status===201&&!('via' in (deposes[2]||{}))&&lectures===avant,'deposer-course : un code mal formé n\'interroge même pas la base ('+(lectures-avant)+' lecture)');
  const r4=await dep(bonVia('ELA-26-10-LV4DD','hotel-exemple',{provenance:'easyHotel Aéroville',provenanceCle:'easyhotel-aeroville'}));
  const b4=deposes[3]||{};
  ok(r4.status===201&&b4.via==='hotel-exemple'&&b4.provenance==='easyHotel Aéroville','deposer-course : la provenance d\'un hôtel partenaire gagne toujours ('+b4.provenance+')');
  const avant5=lectures;
  const r5=await dep(bonVia('ELA-26-10-LV5EE',undefined));
  ok(r5.status===201&&lectures===avant5&&!('via' in (deposes[4]||{})),'deposer-course : sans lien, aucune lecture de plus — une page ancienne dépose comme avant');
  panne=true;
  const r6=await dep(bonVia('ELA-26-10-LV6FF','hotel-exemple'));
  ok(r6.status===201&&!('via' in (deposes[5]||{})),'deposer-course : base des liens muette, la course part quand même, sans source ('+r6.status+')');
  globalThis.fetch=fetchAvant;
}
/* =====================================================================
   DEMANDE-DEMO (8 octobre 2026, démo professionnels, bloc 2). Déployée
   SANS vérification de JWT : tout ce qui protège est dans la fonction. On
   éprouve chaque garde contre ce qu'elle surveille, avec un faux serveur
   qui ENREGISTRE ce qui part (base, Turnstile, Telegram, Resend) : un refus
   n'est prouvé que si rien n'a été écrit ni envoyé.
   ===================================================================== */
{
  const {createHash,createHmac,randomUUID,randomBytes}=await import('node:crypto');
  const sha=v=>createHash('sha256').update(v).digest('hex');
  const fetchAvant=globalThis.fetch;
  const F={quota:true,turnstile:0,crees:[],ouverts:[],tg:[],mails:[],tgPanne:false,
           prospects:new Set(),jetons:new Map()};
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')){F.quotaCles=(F.quotaCles||[]);F.quotaCles.push(JSON.parse(init.body));
      if(F.quota===null)return new Response('panne',{status:503});return new Response(JSON.stringify(F.quota));}
    if(url.includes('challenges.cloudflare.com/turnstile')){F.turnstile++;const j=new URLSearchParams(String(init.body)).get('response');
      if(j==='panne')return new Response('x',{status:500});return new Response(JSON.stringify({success:j==='humain'}));}
    if(url.includes('/rpc/ela_prospect_creer')){const a=JSON.parse(init.body);F.appelsCreer=(F.appelsCreer||0)+1;
      if(F.sansPrenom&&'p_prenom' in a)return new Response(JSON.stringify({code:'PGRST202',message:'Could not find the function public.ela_prospect_creer(...p_prenom...) in the schema cache'}),{status:404});
      if(a.p_email.startsWith('quota@'))return new Response('{"message":"quota_email"}',{status:400});
      if(a.p_email.startsWith('refus@'))return new Response(JSON.stringify({code:'23514',message:'new row violates check constraint',details:'Failing row contains ('+a.p_nom+', '+a.p_email+', '+a.p_telephone+')'}),{status:400});
      const id=randomUUID();F.crees.push(a);F.prospects.add(id);F.jetons.set(a.p_jeton_empreinte,id);
      return new Response(JSON.stringify([{id,domaine_pro:!a.p_email.endsWith('@gmail.com')}]));}
    if(url.includes('/rpc/ela_prospect_ouvrir')){const a=JSON.parse(init.body);F.ouverts.push(a.p_id);return new Response(JSON.stringify(F.prospects.has(a.p_id)));}
    if(url.includes('/rpc/ela_prospect_confirmer')){const a=JSON.parse(init.body);const ok=F.jetons.has(a.p_empreinte);F.jetons.delete(a.p_empreinte);return new Response(JSON.stringify(ok));}
    if(url.includes('api.telegram.org')){if(F.tgPanne)throw new Error('réseau');F.tg.push(JSON.parse(init.body));return new Response('{}');}
    if(url.includes('api.resend.com')){F.mails.push(JSON.parse(init.body));return new Response('{}');}
    if(url.includes('/rest/v1/liens_suivi')){F.liens=(F.liens||0)+1;return new Response(url.includes('code=eq.fiche-hotels')?JSON.stringify([{code:'fiche-hotels',nom:'Fiche papier remise aux hôtels'}]):'[]');}
    if(url.includes('/rest/v1/prospects?id=eq.')&&init.method==='PATCH'){F.vias=(F.vias||[]);F.vias.push({url,corps:JSON.parse(init.body)});return new Response('',{status:204});}
    return new Response('?',{status:404});
  };
  const ENV={SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',DEMO_SESSION_SECRET:randomBytes(24).toString('hex'),
    TURNSTILE_SECRET:'ts',TELEGRAM_TOKEN:'t',TELEGRAM_CHAT:'c',RESEND_CLE:'re_x',EMAIL_EXPEDITEUR:'Elatransfer <demo@elatransfer.com>'};
  const dd=await charger('demande-demo',ENV);
  const appel=(fn,corps,o={})=>fn(new Request('http://x',{method:'POST',headers:Object.assign({origin:'https://elatransfer.com','x-forwarded-for':'10.9.9.9','content-type':'application/json'},o.headers||{}),body:JSON.stringify(corps)}));
  const base={action:'demander',type:'hotel',etablissement:'Hôtel des Lilas',nom:'Marie Dupont',fonction:'Directrice',
    email:'Direction@HotelDesLilas.fr',telephone:'06 12 34 56 78',langue:'fr',turnstile:'humain',site:'',duree:6000};
  const demande=(extra={},fn=dd,o)=>appel(fn,Object.assign({},base,extra),o);
  const rien=()=>F.crees.length===0&&F.tg.length===0&&F.mails.length===0;
  const raz=()=>{F.quota=true;F.turnstile=0;F.crees=[];F.tg=[];F.mails=[];F.ouverts=[];F.tgPanne=false;F.quotaCles=[];F.sansPrenom=false;F.appelsCreer=0;F.liens=0;F.vias=[];};

  // Aucun secret possible (ni posé, ni clé service_role à dériver) : rien ne passe.
  {raz();const fn=await charger('demande-demo',Object.assign({},ENV,{DEMO_SESSION_SECRET:'',SUPABASE_SERVICE_ROLE_KEY:''}));
   const r=await demande({},fn);const j=await r.json();
   ok(r.status===503&&j.erreur==='indisponible'&&rien()&&F.turnstile===0,'demande-demo : sans secret ni clé service_role → 503, rien d\'écrit ('+r.status+')');}
  /* LE SECRET SE FABRIQUE TOUT SEUL (8/10/2026) : sans DEMO_SESSION_SECRET,
     il est dérivé de la clé service_role, avec un libellé propre. On le
     recalcule ici indépendamment (node:crypto) : une session signée ainsi
     s'ouvre, une session signée avec la clé service_role BRUTE non. */
  {raz();const fn=await charger('demande-demo',Object.assign({},ENV,{DEMO_SESSION_SECRET:''}));
   const r=await demande({},fn);const j=await r.json();
   const derive=createHash('sha256').update('elatransfer:demo-session:v1:'+ENV.SUPABASE_SERVICE_ROLE_KEY).digest('hex');
   const [c]=String(j.session||'').split('.');
   ok(r.status===200&&j.session===c+'.'+createHmac('sha256',derive).update(c).digest('base64url'),'demande-demo : sans DEMO_SESSION_SECRET, la session est signée avec le secret dérivé de la clé service_role ('+r.status+')');
   raz();const o=await appel(fn,{action:'ouvrir',session:j.session});
   ok(o.status===200,'demande-demo : … et elle s\'ouvre ('+o.status+')');
   raz();const brute=c+'.'+createHmac('sha256',ENV.SUPABASE_SERVICE_ROLE_KEY).update(c).digest('base64url');
   const o2=await appel(fn,{action:'ouvrir',session:brute});
   ok(o2.status===401,'demande-demo : une session signée avec la clé service_role brute → 401 ('+o2.status+')');
   raz();const o3=await appel(dd,{action:'ouvrir',session:j.session});
   ok(o3.status===401,'demande-demo : un secret posé l\'emporte sur le dérivé → l\'ancienne session est refusée ('+o3.status+')');}
  /* TURNSTILE FACULTATIF (bloc 4, option B de Barbaros) : sans secret, la
     vérification est sautée — Cloudflare n'est jamais appelé, la demande
     passe sans jeton. Avec le secret, elle est exigée (plus bas). */
  {raz();const fn=await charger('demande-demo',Object.assign({},ENV,{TURNSTILE_SECRET:''}));
   const r=await demande({turnstile:undefined},fn);const j=await r.json();
   ok(r.status===200&&typeof j.session==='string'&&F.crees.length===1&&F.turnstile===0,'demande-demo : sans TURNSTILE_SECRET → la demande passe sans jeton, Cloudflare jamais appelé ('+r.status+')');
   raz();const r2=await demande({turnstile:'robot'},fn);
   ok(r2.status===200&&F.turnstile===0,'demande-demo : sans TURNSTILE_SECRET → un jeton envoyé quand même est ignoré, pas vérifié');
   raz();F.quota=false;
   ok((await demande({turnstile:undefined},fn)).status===429&&rien(),'demande-demo : sans TURNSTILE_SECRET → le quota par IP tient toujours (429)');
   raz();
   ok((await demande({turnstile:undefined,site:'x'},fn)).status===200&&rien(),'demande-demo : sans TURNSTILE_SECRET → le champ piège tient toujours (factice, rien écrit)');
   raz();
   ok((await demande({turnstile:undefined,duree:500},fn)).status===200&&rien(),'demande-demo : sans TURNSTILE_SECRET → le délai minimum tient toujours (factice, rien écrit)');}
  /* LE DÉLAI MINIMUM : moins de 2,5 s entre l'affichage et l'envoi, ou une
     durée absente / illisible = traité comme le champ piège. */
  for(const [lib,val] of [['1 ms',1],['2 499 ms',2499],['absente',undefined],['en texte','6000'],['négative',-6000],['infinie (null en JSON)',Infinity]]){
    raz();const r=await demande({duree:val});const j=await r.json();
    ok(r.status===200&&typeof j.session==='string'&&rien()&&F.turnstile===0&&F.quotaCles.length===0,'demande-demo : durée '+lib+' → réponse factice, rien écrit ni compté');
  }
  raz();
  ok((await demande({duree:2500})).status===200&&F.crees.length===1,'demande-demo : durée de 2 500 ms tout juste → la demande passe');
  // Origine.
  raz();
  ok((await demande({},dd,{headers:{origin:''}})).status===403&&rien(),'demande-demo : sans origine → 403');
  ok((await demande({},dd,{headers:{origin:'https://pirate.example'}})).status===403&&rien(),'demande-demo : origine étrangère → 403');
  // Le champ piège.
  raz();
  {const r=await demande({site:'http://spam.example'});const j=await r.json();
   ok(r.status===200&&typeof j.session==='string'&&j.session.includes('.'),'demande-demo : champ piège rempli → 200 qui a l\'air normal');
   ok(rien()&&F.turnstile===0&&F.quotaCles.length===0,'demande-demo : champ piège → rien écrit, rien envoyé, ni Turnstile ni quota appelés');
   const o=await appel(dd,{action:'ouvrir',session:j.session});
   ok(o.status===401,'demande-demo : la session factice du piège n\'ouvre pas la démo ('+o.status+')');}
  raz();
  ok((await demande({site:undefined})).status===200&&rien(),'demande-demo : champ piège ABSENT (robot qui ne l\'envoie pas) → réponse factice, rien écrit');
  // Les champs invalides : 400 qui NOMME le champ, rien d'écrit, Turnstile jamais appelé.
  for(const [champ,val] of [['type','taxi'],['etablissement','<b>Hôtel</b>'],['etablissement','A'],['nom',''],['nom','x'.repeat(81)],
      ['email','pas-une-adresse'],['email','a@b'],['telephone','87654321'],['telephone','0000000000'],['telephone','08 12 34 56 78'],['fonction','x'.repeat(61)]]){
    raz();const r=await demande({[champ]:val});const j=await r.json();
    ok(r.status===400&&j.erreur==='champ'&&j.champ===champ&&rien()&&F.turnstile===0,'demande-demo : '+champ+' = « '+String(val).slice(0,20)+' » → 400 champ '+champ+' ('+r.status+' '+j.champ+')');
  }
  raz();
  ok((await demande({action:'supprimer'})).status===400&&rien(),'demande-demo : action inconnue → 400');
  // Le lien d'un partenaire (15/10/2026) : la fiche papier des hôtels mène ici avec « ?via=fiche-hotels ».
  raz();
  {const r=await demande({via:'fiche-hotels'});
   ok(r.status===200&&F.crees.length===1&&F.vias.length===1&&F.vias[0].corps.via==='fiche-hotels'&&F.vias[0].url.includes('prospects?id=eq.')&&Object.keys(F.vias[0].corps).join()==='via','demande-demo : un lien connu est posé sur le prospect, après sa création, et rien d\'autre ('+JSON.stringify(F.vias)+')');
   ok(F.tg.length===1&&/\nVenu par : Fiche papier remise aux hôtels$/.test(F.tg[0].text),'demande-demo : l\'alerte Telegram nomme le lien');
   ok(!('via' in F.crees[0])&&!Object.keys(F.crees[0]).some(k=>/via/.test(k)),'demande-demo : le lien ne passe jamais par la porte de création');}
  raz();
  {const r=await demande({via:'inconnu'});
   ok(r.status===200&&F.crees.length===1&&F.vias.length===0&&!/Venu par/.test(F.tg[0]?.text||''),'demande-demo : un code inconnu ne pose rien et ne se nomme pas');}
  raz();
  {const r=await demande({via:'Fiche Hotels<'});
   ok(r.status===200&&F.crees.length===1&&F.liens===0&&F.vias.length===0,'demande-demo : un code mal formé ne fait aucune lecture');}
  raz();
  ok((await demande({})).status===200&&F.liens===0&&F.crees.length===1,'demande-demo : sans lien, aucune lecture de plus — une page ancienne demande comme avant');
  // Turnstile.
  raz();
  {const r=await demande({turnstile:''});ok(r.status===403&&(await r.json()).erreur==='robot'&&rien()&&F.turnstile===0,'demande-demo : Turnstile absent → 403 robot');}
  raz();
  {const r=await demande({turnstile:'robot'});ok(r.status===403&&(await r.json()).erreur==='robot'&&rien()&&F.turnstile===1,'demande-demo : Turnstile refusé par Cloudflare → 403 robot, rien écrit');}
  raz();
  {const r=await demande({turnstile:'panne'});ok(r.status===503&&rien(),'demande-demo : Cloudflare injoignable → 503 (une panne n\'est pas un robot), rien écrit');}
  // Quotas.
  raz();F.quota=false;
  {const r=await demande();ok(r.status===429&&(await r.json()).erreur==='quota'&&rien()&&F.turnstile===0,'demande-demo : quota par IP atteint → 429, Turnstile même pas appelé');}
  raz();F.quota=null;
  ok((await demande()).status===503&&rien(),'demande-demo : compteur de quota en panne → 503, rien ne passe');
  raz();
  ok(F.quota===true&&(await demande({email:'quota@hoteldeslilas.fr'})).status===429&&F.tg.length===0,'demande-demo : quota par e-mail (compté en base) → 429, aucune alerte');
  /* LES JOURNAUX NE RECOPIENT AUCUNE DONNÉE DU PROSPECT : une contrainte
     refusée par PostgreSQL renvoie la ligne entière dans son message. */
  raz();
  {const journalise=[];const w=console.warn;console.warn=(...x)=>journalise.push(x.join(' '));
   const r=await demande({email:'refus@hoteldeslilas.fr'});console.warn=w;const t=journalise.join('|');
   ok(r.status===503&&rien(),'demande-demo : écriture refusée par la base → 503, rien envoyé');
   ok(t.includes('23514')&&!t.includes('Marie')&&!t.includes('hoteldeslilas')&&!t.includes('612345678'),'demande-demo : le journal garde le code d\'erreur, jamais le nom, l\'e-mail ni le téléphone ('+t.slice(0,80)+')');}
  raz();
  {await demande();const k=F.quotaCles[0];
   ok(k&&k.p_limite===5&&/^[0-9a-f]{64}$/.test(k.p_cle)&&!JSON.stringify(F.quotaCles).includes('10.9.9.9'),'demande-demo : 5 demandes/heure/IP, sous une empreinte — jamais l\'IP en clair');
   ok(F.crees[0]?.p_par_jour===3,'demande-demo : 3 demandes par jour et par e-mail');}
  // Le succès, et ce qui sort — ou pas.
  raz();
  let sessionOk='',jetonOk='';
  {const r=await demande();const t=await r.text();const j=JSON.parse(t);const a=F.crees[0]||{};
   ok(r.status===200&&j.etablissement==='Hôtel des Lilas'&&typeof j.session==='string','demande-demo : demande valide → 200 avec session et établissement');
   const exp=Date.parse(j.expire);
   ok(Math.abs(exp-Date.now()-7*864e5)<60e3&&/Z$/.test(j.expire),'demande-demo : « expire » = dans 7 jours, en ISO 8601 ('+j.expire+')');
   ok(a.p_telephone==='+33612345678'&&a.p_email==='direction@hoteldeslilas.fr'&&a.p_type==='hotel'&&a.p_langue==='fr','demande-demo : téléphone normalisé (+33…), e-mail en minuscules');
   ok(!/domaine|pro"/.test(t)&&!t.includes('hoteldeslilas')&&!t.includes(a.p_jeton_empreinte),'demande-demo : la réponse ne porte ni domaine_pro, ni l\'e-mail, ni le jeton');
   const lien=(F.mails[0]?.text||'').match(/https:\/\/elatransfer\.com\/professionnels\/\?confirmer=([A-Za-z0-9_-]{43})/);
   jetonOk=lien?lien[1]:'';
   ok(!!lien&&sha(jetonOk)===a.p_jeton_empreinte,'demande-demo : l\'e-mail porte le lien /professionnels/?confirmer=, et la base n\'a que l\'EMPREINTE du jeton');
   ok(F.mails[0]?.to?.[0]==='direction@hoteldeslilas.fr'&&/Confirmez/.test(F.mails[0]?.subject),'demande-demo : l\'e-mail part au prospect, en français');
   const m=F.tg[0]||{};
   ok(m.text?.includes('Hôtel des Lilas')&&m.text.includes('Marie Dupont')&&m.text.includes('+33612345678')&&m.text.includes('Directrice')&&m.text.includes('Hôtel'),'demande-demo : l\'alerte Telegram dit établissement, type, nom, fonction, téléphone');
   ok(!m.text?.toLowerCase().includes('hoteldeslilas')&&!('parse_mode' in m),'demande-demo : l\'alerte ne porte PAS l\'e-mail, et aucun parse_mode');
   ok(/professionnelle/.test(m.text||''),'demande-demo : l\'alerte dit si l\'adresse est professionnelle');
   sessionOk=j.session;}
  raz();
  {const r=await demande({langue:'en',email:'x.y@gmail.com',fonction:undefined});
   ok(r.status===200&&/Confirm/.test(F.mails[0]?.subject||'')&&/grand public/.test(F.tg[0]?.text||''),'demande-demo : en anglais → e-mail anglais ; @gmail → « grand public » dans l\'alerte');
   ok(F.crees[0]?.p_fonction==='','demande-demo : fonction facultative');}
  /* LE PRÉNOM (9 octobre 2026) : stocké à part quand la page l'envoie ;
     une page ancienne (sans « prenom ») passe comme avant ; une base pas
     encore migrée reçoit le nom complet, jamais un 503. */
  raz();
  {const r=await demande({prenom:' Marie ',nom:'Dupont'});const a=F.crees[0]||{};
   ok(r.status===200&&a.p_prenom==='Marie'&&a.p_nom==='Dupont'&&F.appelsCreer===1,'demande-demo : prénom et nom partent SÉPARÉMENT ('+a.p_prenom+' / '+a.p_nom+')');
   ok(/Nom : Marie Dupont\n/.test((F.tg[0]?.text||'')+'\n'),'demande-demo : Telegram dit « Nom : Prénom Nom »');}
  raz();
  {const r=await demande({nom:'Marie Dupont'});const a=F.crees[0]||{};
   ok(r.status===200&&!('p_prenom' in a)&&a.p_nom==='Marie Dupont','demande-demo : page ancienne (sans prénom) → nom complet, comme avant');}
  for(const [lib,val] of [['vide',''],['espaces','   '],['chevron','<b>'],['61 caractères','x'.repeat(61)]]){
    raz();const r=await demande({prenom:val,nom:'Dupont'});const j=await r.json();
    ok(r.status===400&&j.champ==='prenom'&&rien(),'demande-demo : prénom '+lib+' → 400 champ prenom, rien écrit');
  }
  raz();F.sansPrenom=true;
  {const r=await demande({prenom:'Marie',nom:'Dupont'});const a=F.crees[0]||{};
   ok(r.status===200&&F.appelsCreer===2&&!('p_prenom' in a)&&a.p_nom==='Marie Dupont','demande-demo : base pas encore migrée → second appel sans p_prenom, nom complet dans « nom » ('+r.status+', '+F.appelsCreer+' appels)');
   ok(/Nom : Marie Dupont/.test(F.tg[0]?.text||''),'demande-demo : base pas encore migrée → l\'alerte part quand même');}
  raz();F.sansPrenom=true;
  {const r=await demande({prenom:'P'.repeat(60),nom:'N'.repeat(80)});const a=F.crees[0]||{};
   ok(r.status===200&&a.p_nom.length<=80,'demande-demo : base pas encore migrée, noms longs → le nom complet tient dans 80 caractères');}
  raz();F.sansPrenom=true;
  ok((await demande({prenom:'Marie',nom:'Dupont',email:'quota@hoteldeslilas.fr'})).status===429,'demande-demo : base pas encore migrée → le quota par e-mail tient toujours');
  raz();
  {const r=await demande({prenom:'Marie',nom:'Dupont',email:'refus@hoteldeslilas.fr'});
   ok(r.status===503&&F.appelsCreer===1,'demande-demo : un autre refus de la base n\'est PAS rejoué sans prénom (503, un seul appel)');}
  raz();F.tgPanne=true;
  ok((await demande()).status===200,'demande-demo : Telegram en panne → la demande passe quand même');
  raz();
  {const fn=await charger('demande-demo',Object.assign({},ENV,{RESEND_CLE:'',EMAIL_EXPEDITEUR:''}));
   const r=await demande({},fn);ok(r.status===200&&F.mails.length===0&&F.crees.length===1,'demande-demo : Resend non configuré → aucun e-mail, la demande passe');}
  // OUVRIR.
  raz();
  {const r=await appel(dd,{action:'ouvrir',session:sessionOk,etablissement:'Ritz Paris',type:'agence'});const j=await r.json();
   ok(r.status===200&&j.ok===true&&j.etablissement==='Hôtel des Lilas'&&j.type==='hotel'&&Date.parse(j.expire)>Date.now(),'demande-demo : ouvrir une session valide → 200, établissement et type DE LA SESSION (jamais ceux envoyés avec elle)');
   ok(F.ouverts.length===1&&F.quotaCles.length===0,'demande-demo : ouvrir met à jour le prospect, sans consommer de quota');}
  const [contenu,signature]=sessionOk.split('.');
  const donnees=JSON.parse(Buffer.from(contenu,'base64url').toString());
  const forge=(d,secret)=>{const c=Buffer.from(JSON.stringify(d)).toString('base64url');return c+'.'+createHmac('sha256',secret).update(c).digest('base64url');};
  const S=ENV.DEMO_SESSION_SECRET;
  ok(forge(donnees,S)===sessionOk,'demande-demo : la session est un HMAC-SHA256 standard (recalculé indépendamment avec node:crypto)');
  for(const [lib,sess] of [
    ['établissement réécrit, signature d\'origine',Buffer.from(JSON.stringify({...donnees,e:'Ritz Paris'})).toString('base64url')+'.'+signature],
    ['signée avec un AUTRE secret',forge(donnees,'un-autre-secret')],
    ['expirée',forge({...donnees,exp:Date.now()-1000},S)],
    ['valable un an',forge({...donnees,exp:Date.now()+365*864e5},S)],
    ['version inconnue',forge({...donnees,v:2},S)],
    ['type inconnu',forge({...donnees,t:'admin'},S)],
    ['session de RÉCEPTION d\'hôtel',forge({v:1,hotel:'easyhotel-aeroville',iat:Date.now(),exp:Date.now()+864e5},S)],
    ['charabia','abc'],['vide',''],['un objet',{p:donnees.p}]]){
    raz();const r=await appel(dd,{action:'ouvrir',session:sess});const j=await r.json();
    ok(r.status===401&&j.erreur==='session'&&F.ouverts.length===0,'demande-demo : session '+lib+' → 401, rien mis à jour ('+r.status+')');
  }
  raz();F.prospects.clear();
  ok((await appel(dd,{action:'ouvrir',session:sessionOk})).status===401,'demande-demo : session valide d\'un prospect effacé → 401');
  raz();F.quota=false;
  ok((await appel(dd,{action:'ouvrir',session:'faux.faux'})).status===429,'demande-demo : trop de sessions fausses depuis une adresse → 429');
  // CONFIRMER.
  raz();
  {const r=await appel(dd,{action:'confirmer',jeton:jetonOk});ok(r.status===200&&(await r.json()).ok===true,'demande-demo : confirmer avec le jeton de l\'e-mail → 200');}
  raz();
  {const r=await appel(dd,{action:'confirmer',jeton:jetonOk});ok(r.status===410&&(await r.json()).erreur==='jeton','demande-demo : jeton RÉUTILISÉ → 410');}
  raz();
  ok((await appel(dd,{action:'confirmer',jeton:'x'.repeat(43)})).status===410,'demande-demo : jeton inconnu ou expiré (refusé par la base) → 410');
  ok((await appel(dd,{action:'confirmer',jeton:'<script>'})).status===410,'demande-demo : jeton mal formé → 410');
  raz();F.quota=false;
  ok((await appel(dd,{action:'confirmer',jeton:jetonOk})).status===429,'demande-demo : confirmer est plafonné par adresse → 429');
  // Taille.
  raz();
  ok((await demande({nom:'x'.repeat(5000)})).status===413&&rien(),'demande-demo : corps de plus de 4 Ko → 413');
  globalThis.fetch=fetchAvant;
}
/* LA SESSION DE RÉCEPTION N'EST PLUS SIGNÉE AVEC LE CODE LUI-MÊME (audit du
   9 octobre 2026, P1). Le jeton vit 30 jours dans la tablette et part dans
   chaque requête : signé avec le code brut, il permettait de deviner le code
   HORS LIGNE, sans plafond d'essais. La clé est désormais dérivée du code ET
   d'un secret serveur. Le contrôle d'avant (« signée exactement comme
   avant ») figeait ce défaut : il est inversé. Conséquence assumée : une
   session de l'ancien format est refusée, la tablette retape son code. */
{
  const {createHmac}=await import('node:crypto');
  const tmpH=fs.mkdtempSync(path.join(os.tmpdir(),'ela-hs-'));partages(tmpH,'');
  globalThis.Deno={env:{get:k=>({SUPABASE_SERVICE_ROLE_KEY:'S'})[k]}};
  const {validerSessionHotel,creerSessionHotel}=await import(tmpH+'/hotel-session.mjs');
  const c=Buffer.from(JSON.stringify({v:1,hotel:'easyhotel-aeroville',iat:Date.now()-864e5,exp:Date.now()+20*864e5})).toString('base64url');
  const ancienne=c+'.'+createHmac('sha256','easyhotel-9F3K2Q').update(c).digest('base64url');
  ok(!(await validerSessionHotel(ancienne,'easyhotel-aeroville','easyhotel-9F3K2Q')),'réception : une session signée avec le code BRUT (ancien format) est refusée — elle était un oracle hors ligne du code');
  const neuve=await creerSessionHotel('easyhotel-aeroville','easyhotel-9F3K2Q');
  const [nc,ns]=neuve.split('.');
  ok(nc&&ns&&createHmac('sha256','easyhotel-9F3K2Q').update(nc).digest('base64url')!==ns,'réception : une session neuve n\'est PAS signée avec le code — un jeton qui fuit ne permet plus de le deviner');
  ok(await validerSessionHotel(neuve,'easyhotel-aeroville','easyhotel-9F3K2Q'),'réception : la session neuve est acceptée par SON hôtel');
  ok(!(await validerSessionHotel(neuve,'autre-hotel','easyhotel-9F3K2Q')),'réception : elle ne vaut que pour SON hôtel');
  ok(!(await validerSessionHotel(neuve,'easyhotel-aeroville','autre-code')),'réception : changer le code dans les secrets coupe la session');
  /* Sans le secret du serveur, rien n'est signé ni validé : un secret absent
     ne vaut jamais « tout est signé ». */
  globalThis.Deno={env:{get:()=>undefined}};
  ok((await creerSessionHotel('easyhotel-aeroville','easyhotel-9F3K2Q'))===''&&!(await validerSessionHotel(neuve,'easyhotel-aeroville','easyhotel-9F3K2Q')),'réception : sans le secret du serveur, aucune session n\'est créée ni acceptée');
  globalThis.Deno={env:{get:k=>({SUPABASE_SERVICE_ROLE_KEY:'S'})[k]}};
}
/* deposer-course : UNE COURSE DE DÉMONSTRATION N'EST JAMAIS ENREGISTRÉE
   (8 octobre 2026). Refusée AVANT le quota et avant toute lecture en base. */
{
  const appels=[];const fetchAvant=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{url=String(url);appels.push(url);
    if(url.includes('/rpc/consommer_quota_reservation'))return new Response('true');
    if(url.includes('/rest/v1/partenaires'))return new Response('[]');
    if(url.includes('/rest/v1/courses?ref=eq.'))return new Response('[]');
    if(url.includes('/rpc/ela_deposer_course_serveur'))return new Response('"ok"');
    return new Response('[]');};
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const bonD=(ref,extra)=>Object.assign({ref,course:{depart:'Hôtel Démo · Roissy',arrivee:'Orly',date:'2026-10-12',heure:'06:30',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:30},
    client:{nom:'Client',telephone:'0612345678'},prix:{total:90},paiement:'carte'},extra);
  const dep=b=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.5','content-type':'application/json'},body:JSON.stringify({bon:b})}));
  for(const [lib,extra] of [['provenance « demo-hotel »',{provenance:'demo-hotel'}],['clé partenaire « demo »',{provenanceCle:'demo'}],
      ['provenance « Démo hôtel » (accent, majuscule)',{provenance:' Démo hôtel'}],['clé « DEMO-hotel »',{provenanceCle:'DEMO-hotel'}]]){
    appels.length=0;const r=await dep(bonD('ELA-26-10-DM1AA',extra));
    ok(r.status===403&&appels.length===0,'deposer-course : '+lib+' → 403, sans quota ni écriture ('+r.status+', '+appels.length+' appel(s))');
  }
  appels.length=0;
  const r=await dep(bonD('ELA-26-10-DM2BB',{provenance:'easyHotel Aéroville'}));
  ok(r.status===201&&appels.some(u=>u.includes('ela_deposer_course_serveur')),'deposer-course : une provenance ordinaire passe toujours ('+r.status+')');
  globalThis.fetch=fetchAvant;
}
/* deposer-course : UN DÉPÔT REFUSÉ EST ÉCRIT DANS journal_depots (audit du
   9 octobre 2026, P1). Le client lisait « demande non transmise » et personne
   d'autre ne l'apprenait. Chaque refus écrit code + motif + référence — jamais
   le nom, le téléphone ni l'adresse IP — ; un dépôt réussi n'écrit rien ; la
   démo (refus voulu) n'écrit rien ; un journal injoignable ne change pas la
   réponse au client. Contre l'ancien code, les six « est écrit » tombent. */
{
  const journalDepots=[];const fetchAvant=globalThis.fetch;let quotaOk=true,quotaPanne=false,insertionPanne=false;
  globalThis.fetch=async(url,init={})=>{url=String(url);
    if(url.includes('/rest/v1/journal_depots')){journalDepots.push(JSON.parse(init.body));return new Response('',{status:201});}
    if(url.includes('/rpc/consommer_quota_reservation'))return quotaPanne?new Response('x',{status:500}):new Response(JSON.stringify(quotaOk));
    if(url.includes('/rest/v1/partenaires'))return new Response('[]');
    if(url.includes('/rest/v1/courses?ref=eq.'))return new Response('[]');
    if(url.includes('/rpc/ela_deposer_course_serveur'))return insertionPanne?new Response('x',{status:500}):new Response('"ok"');
    return new Response('[]');};
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const bonJ=(ref,extra)=>Object.assign({ref,course:{depart:'12 rue de la Paix, Paris',arrivee:'Orly',date:'2026-10-12',heure:'06:30',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:30},
    client:{nom:'Client Journal',telephone:'0612345678'},prix:{total:90},paiement:'carte'},extra);
  const dep=(b,origin='https://elatransfer.com')=>dc(new Request('http://x',{method:'POST',headers:{origin,'x-forwarded-for':'10.0.0.7','content-type':'application/json'},body:JSON.stringify({bon:b})}));
  let r=await dep(bonJ('ELA-26-10-JD1AA'));
  ok(r.status===201&&journalDepots.length===0,'journal des dépôts : un dépôt réussi n\'écrit rien ('+r.status+', '+journalDepots.length+' ligne(s))');
  quotaOk=false;r=await dep(bonJ('ELA-26-10-JD2BB'));quotaOk=true;
  ok(r.status===429&&journalDepots.length===1&&journalDepots[0].code===429&&journalDepots[0].motif==='quota'&&journalDepots[0].ref==='ELA-26-10-JD2BB','journal des dépôts : un refus par le plafond (429) est écrit avec son motif et sa référence');
  quotaPanne=true;r=await dep(bonJ('ELA-26-10-JD3CC'));quotaPanne=false;
  ok(r.status===503&&journalDepots[1]?.code===503&&journalDepots[1]?.motif==='indisponible','journal des dépôts : un serveur indisponible au quota (503) est écrit');
  insertionPanne=true;r=await dep(bonJ('ELA-26-10-JD4DD'));insertionPanne=false;
  ok(r.status===503&&journalDepots[2]?.code===503&&journalDepots[2]?.motif==='indisponible','journal des dépôts : une écriture en base refusée (503) est écrite');
  r=await dep(bonJ('ELA-26-10-JD5EE',{prix:{total:-5}}));
  ok(r.status===400&&journalDepots[3]?.code===400&&journalDepots[3]?.motif==='invalide'&&journalDepots[3]?.ref==='ELA-26-10-JD5EE','journal des dépôts : une demande invalide (400) est écrite avec sa référence');
  r=await dep(bonJ('ELA-26-10-JD6FF'),'https://pirate.example');
  ok(r.status===403&&journalDepots[4]?.code===403&&journalDepots[4]?.motif==='origine','journal des dépôts : une origine refusée (403) est écrite');
  r=await dep(bonJ('ELA-26-10-JD7GG',{parReception:true,provenanceCle:'easyhotel-aeroville'}));
  ok(r.status===401&&journalDepots[5]?.motif==='session'&&journalDepots[5]?.provenance_cle==='easyhotel-aeroville'&&journalDepots[5]?.par_reception===true,'journal des dépôts : une session de réception refusée (401) est écrite avec la clé de l\'hôtel');
  const brut=JSON.stringify(journalDepots);
  ok(!brut.includes('0612345678')&&!brut.includes('Client Journal')&&!brut.includes('10.0.0.7')&&!brut.includes('rue de la Paix'),'journal des dépôts : ni téléphone, ni nom, ni adresse, ni adresse IP dans le journal');
  const avant=journalDepots.length;r=await dep(bonJ('ELA-26-10-JD8HH',{provenance:'demo-hotel'}));
  ok(r.status===403&&journalDepots.length===avant,'journal des dépôts : la démo (refus voulu) n\'est pas journalisée');
  globalThis.fetch=async(url,init={})=>{url=String(url);if(url.includes('/rest/v1/journal_depots'))throw new Error('journal injoignable');if(url.includes('/rpc/consommer_quota_reservation'))return new Response('false');return new Response('[]');};
  r=await dep(bonJ('ELA-26-10-JD9II'));
  ok(r.status===429,'journal des dépôts : un journal injoignable ne change pas la réponse au client ('+r.status+')');
  globalThis.fetch=fetchAvant;
}
/* ═══ mesure : LA PORTE D'ÉCRITURE DE LA MESURE D'AUDIENCE (15/10/2026) ═══
   Origine stricte, liste fermée, robots écartés sans rien écrire, quota par
   adresse hachée, source classée ICI (une seule règle), pays depuis l'en-tête
   Cloudflare. Le navigateur n'envoie AUCUN identifiant : l'empreinte est
   calculée ici, et ni l'adresse IP ni le navigateur ne partent en base. */
{
  const fetchAvant=globalThis.fetch;
  let ecrits=[], quotaRefuse=false, rpcPanne=false, rpcAbsente=false, clesQuota=[], anciens=[];
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')){clesQuota.push(JSON.parse(init.body));return new Response(quotaRefuse?'false':'true');}
    if(url.includes('/rpc/ela_mesurer_evenement')){if(rpcAbsente)return new Response('{"code":"PGRST202"}',{status:404});if(rpcPanne)return new Response('',{status:500});ecrits.push(JSON.parse(init.body));return new Response('true');}
    if(url.includes('/rpc/ela_mesurer')){anciens.push(JSON.parse(init.body));return new Response(null,{status:204});}
    return fetchAvant(url,init);
  };
  const ms=await charger('mesure',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const base={evenement:'page_vue',page:'fr-cdg',appareil:'mobile',langue:'fr'};
  const UA='Mozilla/5.0 (iPhone)';
  const envoi=(corps,entetes={},origin='https://elatransfer.com')=>ms(new Request('http://x',{method:'POST',headers:{origin,'content-type':'text/plain','user-agent':UA,'cf-ipcountry':'fr','cf-connecting-ip':'10.0.0.3',...entetes},body:typeof corps==='string'?corps:JSON.stringify(corps)}));
  const dernier=()=>ecrits.at(-1)?.p||{};
  let r=await envoi({...base,referent:'https://www.google.com/search?q=elatransfer',nom:'Dupont',telephone:'0612345678',session:'abcdefgh12',visiteur:'x'});
  ok(r.status===200&&ecrits.length===1,'mesure : un geste valide, envoyé en text/plain (sans requête préalable), est écrit ('+r.status+')');
  ok(dernier().page==='fr-cdg'&&dernier().source==='google'&&dernier().referent==='google.com','mesure : la page, la source google et le domaine nu du référent');
  ok(dernier().pays==='FR','mesure : le pays vient de l\'en-tête Cloudflare, en majuscules');
  const {createHash}=await import('node:crypto');
  ok(ecrits[0]?.p_brute===createHash('sha256').update('10.0.0.3|'+UA).digest('hex'),'mesure : l\'empreinte est calculée ICI, sur l\'adresse et le navigateur');
  const brut=JSON.stringify(ecrits[0]?.p);
  ok(!brut.includes('Dupont')&&!brut.includes('0612345678')&&!brut.includes('10.0.0.3')&&!brut.includes('Mozilla')&&!brut.includes('abcdefgh12'),'mesure : ni nom, ni téléphone, ni adresse IP, ni navigateur, ni identifiant venu de la page ne partent en base');
  ok(clesQuota[0]?.p_limite===100&&clesQuota[0]?.p_cle.length===64,'mesure : quota de 100 par heure sur une clé hachée');
  r=await envoi(base,{},'https://pirate.example');
  ok(r.status===403&&ecrits.length===1,'mesure : une origine étrangère est refusée (403)');
  r=await envoi(base,{'user-agent':'Mozilla/5.0 (compatible; Googlebot/2.1)'});
  ok(r.status===204&&ecrits.length===1,'mesure : Googlebot reçoit 204 et rien n\'est écrit');
  r=await envoi({...base,evenement:'mouse_move'});
  ok(r.status===400&&ecrits.length===1,'mesure : un geste hors liste est refusé (400)');
  r=await envoi({...base,page:'/?ok=abc'});
  ok(r.status===400,'mesure : une page hors format (une adresse peut porter une référence) est refusée');
  r=await envoi({...base,evenement:'demande_envoyee'});
  ok(r.status===400,'mesure : une demande envoyée sans référence est refusée');
  r=await envoi({...base,evenement:'demande_envoyee',detail:{ref:'ELA-26-10-AB12C',nom:'Dupont',chambre:'214'}});
  ok(r.status===200&&dernier().detail?.ref==='ELA-26-10-AB12C'&&!('nom' in (dernier().detail||{}))&&!('chambre' in (dernier().detail||{})),'mesure : la référence entre dans le détail, une clé inconnue (nom, chambre) est ignorée');
  r=await envoi({...base,lien:'hotel-exemple'});
  ok(dernier().lien==='hotel-exemple','mesure : le code du lien d\'un partenaire part tel quel (la base le reconnaît)');
  r=await envoi('x'.repeat(2100));
  ok(r.status===413,'mesure : un corps de plus de 2 Ko est refusé (413)');
  r=await envoi('{pas du json');
  ok(r.status===400,'mesure : un corps illisible est refusé (400)');
  const n=ecrits.length; quotaRefuse=true;r=await envoi(base);quotaRefuse=false;
  ok(r.status===429&&ecrits.length===n,'mesure : au-delà du quota, 429 et rien d\'écrit');
  rpcPanne=true;r=await envoi(base);rpcPanne=false;
  ok(r.status===503,'mesure : une base en panne rend 503, jamais un faux succès');
  /* La mise en service : fonction déployée, migration pas encore appliquée. */
  rpcAbsente=true;
  r=await envoi({...base,evenement:'clic_whatsapp',lien:'hotel-exemple'});
  ok(r.status===200&&anciens.length===1&&anciens[0].p_page==='fr-cdg'&&anciens[0].p_evenement==='clic_whatsapp'&&anciens[0].p_source==='hotel-exemple'&&Object.keys(anciens[0]).length===3,
    'mesure : migration pas encore appliquée, le geste passe au compteur du 14 octobre (page, geste, lien, rien d\'autre) — '+r.status+' '+JSON.stringify(anciens));
  r=await envoi({...base,evenement:'prix_demande',detail:{aeroport:'cdg'}});
  ok(r.status===200&&anciens.length===1,'mesure : un geste de prix, inconnu de l\'ancien compteur, ne lui est pas passé');
  rpcAbsente=false;
  const src=async(c)=>{await envoi({...base,...c});return dernier().source;};
  ok(await src({referent:'https://m.facebook.com/x'})==='social','mesure : Facebook est classé réseau social');
  ok(await src({referent:'https://wa.me/33759312433'})==='whatsapp','mesure : un lien WhatsApp est classé whatsapp');
  ok(await src({utm_source:'newsletter',utm_medium:'email'})==='campagne'&&dernier().utm_source==='newsletter','mesure : des UTM sans Google sont une campagne, et les UTM sont gardés');
  ok(await src({referent:'https://www.google.com/',utm_source:'google',utm_medium:'gbp'})==='google_business','mesure : « utm_medium=gbp » distingue la fiche Google d\'une recherche');
  ok(await src({referent:'https://www.bing.com/search'})==='autre','mesure : un autre moteur est classé « autre »');
  ok(await src({referent:'https://blog.exemple.fr/article'})==='referent'&&dernier().referent==='blog.exemple.fr','mesure : un site tiers est un référent, domaine seul');
  ok(await src({})==='direct','mesure : sans référent ni UTM, c\'est « direct »');
  await envoi(base,{'cf-ipcountry':'XX'});
  ok(dernier().pays==='XX','mesure : un pays inconnu de Cloudflare reste « XX »');
  await envoi(base,{'cf-ipcountry':''});
  ok(dernier().pays===null,'mesure : sans en-tête Cloudflare, aucun pays inventé');
  /* LE PAYS PAR LE FUSEAU (16/10/2026) : en production, Supabase ne
     transmet pas « cf-ipcountry » ; le fuseau du navigateur le remplace,
     relu dans la table officielle. */
  await envoi({...base,fuseau:'Europe/Paris'},{'cf-ipcountry':''});
  ok(dernier().pays==='FR','mesure : sans en-tête Cloudflare, « Europe/Paris » donne FR');
  await envoi({...base,fuseau:'America/New_York'},{'cf-ipcountry':'XX'});
  ok(dernier().pays==='US','mesure : un en-tête « XX » cède au fuseau (New York → US)');
  await envoi({...base,fuseau:'Europe/Kiev'},{'cf-ipcountry':''});
  ok(dernier().pays==='UA','mesure : un ancien nom de fuseau est reconnu (Europe/Kiev → UA)');
  await envoi({...base,fuseau:'Europe/Paris'},{'cf-ipcountry':'de'});
  ok(dernier().pays==='DE','mesure : l\'en-tête de Cloudflare, quand il arrive, passe avant le fuseau');
  await envoi({...base,fuseau:'UTC'},{'cf-ipcountry':''});
  ok(dernier().pays===null,'mesure : un fuseau sans pays (UTC) ne fabrique pas de pays');
  await envoi({...base,fuseau:'Paris/<script>'},{'cf-ipcountry':''});
  ok(dernier().pays===null&&!JSON.stringify(ecrits.at(-1)).includes('script'),'mesure : un fuseau inventé est ignoré, et le fuseau lui-même ne part jamais en base');
  ok(!JSON.stringify(ecrits).includes('Europe/Paris'),'mesure : seul le pays est gardé, jamais le fuseau');
  globalThis.fetch=fetchAvant;
}
/* ═══ DEPOSER-COURSE SOUS LA CHARGE (audit du 19 octobre 2026) ═══
   Cinq, puis quinze dépôts qui arrivent EN MÊME TEMPS, et deux dépôts
   identiques en course l'un contre l'autre. Le faux serveur tient une table
   avec une référence UNIQUE (l'index de production) et un quota atomique par
   clé, et il répond avec un délai : les deux dépôts identiques passent donc
   tous deux la vérification « déjà déposée ? » avant la première écriture,
   exactement la fenêtre de la course réelle. Ce qu'on prouve : aucune ligne
   en double, un seul des deux gagne, et le REJEU du perdant est reconnu
   (200 « rejoue ») — c'est le chemin que prend maintenant le site. */
{
  const fetchAvant=globalThis.fetch;
  const table={},compteurs={};let ecrits=0;
  const dormir=ms=>new Promise(r=>setTimeout(r,ms));
  globalThis.fetch=async(url,init={})=>{
    url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')){const {p_cle,p_limite}=JSON.parse(init.body);compteurs[p_cle]=(compteurs[p_cle]||0)+1;return new Response(JSON.stringify(compteurs[p_cle]<=p_limite));}
    if(url.includes('/rpc/ela_deposer_course_serveur')){const {p_ref,p_bon}=JSON.parse(init.body);await dormir(30);if(table[p_ref])return new Response('{"code":"23505"}',{status:409});table[p_ref]={bon:p_bon};ecrits++;return new Response('"ok"');}
    if(url.includes('/rest/v1/courses?ref=eq.')){const ref=decodeURIComponent(url.match(/ref=eq\.([^&]+)/)[1]);await dormir(20);return new Response(JSON.stringify(table[ref]?[table[ref]]:[]));}
    if(url.includes('partenaires?')||url.includes('liens_suivi?')||url.includes('parametres_commerciaux?'))return new Response('[]');
    if(url.includes('journal_depots'))return new Response('');
    return new Response('?',{status:404});
  };
  const dc=await charger('deposer-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const bon=(ref,tel)=>({ref,course:{depart:'Place Vendôme, Paris',arrivee:'Orly',date:'2026-10-25',heure:'09:00',vehicule:'Berline',vehiculeCle:'berline',passagers:'2 passagers',distanceKm:30},client:{nom:'Client '+ref.slice(-5),telephone:tel||'0612345678'},prix:{total:90},paiement:'lien',provenanceCle:'',parReception:false});
  const depot=(ref,ip,tel)=>dc(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':ip||'10.0.0.1','content-type':'application/json'},body:JSON.stringify({bon:bon(ref,tel)})}));
  const refs5=['ELA-26-10-S1AAA','ELA-26-10-S2BBB','ELA-26-10-S3CCC','ELA-26-10-S4DDD','ELA-26-10-S5EEE'];
  const r5=await Promise.all(refs5.map(r=>depot(r,'10.0.0.1')));
  ok(r5.every(r=>r.status===201)&&Object.keys(table).length===5,'charge : 5 dépôts simultanés depuis la même adresse → 5 lignes, 5 × 201 ('+r5.map(r=>r.status).join(',')+')');
  const [a,b]=await Promise.all([depot('ELA-26-10-DBLE1','10.0.0.2'),depot('ELA-26-10-DBLE1','10.0.0.2')]);
  const codes=[a.status,b.status].sort().join('/');
  ok(codes==='201/409'&&Object.keys(table).length===6,'charge : deux dépôts IDENTIQUES en même temps → une seule ligne, un 201 et un 409 ('+codes+')');
  const rejeu=await depot('ELA-26-10-DBLE1','10.0.0.2');
  ok(rejeu.status===200&&(await rejeu.json()).rejoue===true&&Object.keys(table).length===6,'charge : le perdant qui REJOUE à l\'identique est reconnu (200 « rejoue »), aucune ligne de plus');
  const autre=await depot('ELA-26-10-DBLE1','10.0.0.3','0699999999');
  ok(autre.status===409&&Object.keys(table).length===6,'charge : une AUTRE course sur la même référence est refusée (409), la première n\'est pas écrasée');
  const refs15=Array.from({length:15},(_,i)=>'ELA-26-10-U'+String(i).padStart(2,'0')+'ZZ'.slice(0,2)+String.fromCharCode(65+i));
  const r15=await Promise.all(refs15.map((r,i)=>depot(r,'10.0.1.'+(i%3))));
  ok(r15.every(r=>r.status===201)&&Object.keys(table).length===21,'charge : 15 visiteurs simultanés depuis trois adresses → 15 lignes, aucune perte');
  const r13=await Promise.all(Array.from({length:13},(_,i)=>depot('ELA-26-10-Q'+String(i).padStart(2,'0')+'KK','10.0.2.1')));
  const refus=r13.filter(r=>r.status===429).length;
  ok(refus===1&&r13.filter(r=>r.status===201).length===12,'charge : 13 dépôts d\'une même adresse dans l\'heure → 12 passent, le 13e lit 429 ('+refus+' refus)');
  ok(ecrits===Object.keys(table).length,'charge : chaque écriture réussie correspond à une ligne, aucun doublon ('+ecrits+')');
  const total=Object.values(compteurs).reduce((a,b)=>a+b,0);
  ok(total===5+2+15+13,'charge : un rejeu et une référence déjà prise ne consomment PAS le quota (35 unités attendues, '+total+')');
  globalThis.fetch=fetchAvant;
}
/* ═══ ERREUR-CLIENT — une erreur du site remonte, sans donnée personnelle
   (audit du 19 octobre 2026) ═══ On lit ce qui PART à la base. */
{
  const fetchAvant=globalThis.fetch;const ecrits=[];let quota=0,rpcAbsente=false;
  globalThis.fetch=async(url,init={})=>{url=String(url);
    if(url.includes('/rpc/consommer_quota_reservation')){quota++;const {p_limite}=JSON.parse(init.body);return new Response(JSON.stringify(quota<=p_limite));}
    if(url.includes('/rpc/ela_erreur_client_ecrire')){if(rpcAbsente)return new Response('{"code":"PGRST202"}',{status:404});ecrits.push(JSON.parse(init.body).p);return new Response('true');}
    return new Response('?',{status:404});};
  const ec=await charger('erreur-client',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const envoi=(corps,entetes={})=>ec(new Request('http://x',{method:'POST',headers:{origin:'https://elatransfer.com','x-forwarded-for':'10.0.0.7','user-agent':'Mozilla/5.0 iPhone',...entetes},body:typeof corps==='string'?corps:JSON.stringify(corps)}));
  const base={espace:'public',chemin:'/',ecran:'ecran-recap',message:"TypeError: Cannot read properties of undefined (reading 'label') — client 06 12 34 56 78 <jean.dupont@exemple.fr> https://elatransfer.com/?ok=abc&tel=0612345678",source:'https://elatransfer.com/index.html?v=3:11420',appareil:'mobile',langue:'fr'};
  let r=await envoi(base);
  ok(r.status===204&&ecrits.length===1,'erreur-client : une erreur valide est écrite et rend 204 ('+r.status+')');
  const e=ecrits[0]||{};
  ok(!/\d{6}/.test(e.message||'')&&!/0612345678|06 12 34 56 78/.test(e.message||''),'erreur-client : le téléphone est masqué dans le message');
  ok(!/@/.test(e.message||''),'erreur-client : l\'adresse e-mail est masquée');
  ok(!/\?ok=|tel=/.test(e.message||'')&&(e.message||'').includes('https://elatransfer.com/'),'erreur-client : une adresse complète perd sa requête (« ?ok=… »), garde son chemin');
  ok((e.message||'').includes('TypeError')&&(e.message||'').length<=200,'erreur-client : le message utile reste, borné à 200 signes');
  ok(e.source==='https://elatransfer.com/index.html'||e.source==='https://elatransfer.com/index.html:11420'||/index\.html/.test(e.source||''),'erreur-client : la source garde fichier et ligne ('+e.source+')');
  ok(e.espace==='public'&&e.ecran==='ecran-recap'&&e.appareil==='mobile'&&e.langue==='fr'&&e.chemin==='/','erreur-client : espace, écran, appareil, langue, chemin passent');
  ok(!JSON.stringify(e).includes('10.0.0.7')&&!JSON.stringify(e).includes('iPhone'),'erreur-client : ni l\'adresse IP ni le navigateur ne partent en base');
  r=await envoi(base,{origin:'https://pirate.example'});
  ok(r.status===403&&ecrits.length===1,'erreur-client : une origine étrangère est refusée');
  r=await envoi(base,{'user-agent':'Googlebot/2.1'});
  ok(r.status===204&&ecrits.length===1,'erreur-client : un robot reçoit 204 et rien n\'est écrit');
  r=await envoi({...base,espace:'frigo'});
  ok(r.status===400&&ecrits.length===1,'erreur-client : un espace hors liste est refusé');
  r=await envoi({...base,ecran:'<script>'});
  ok(r.status===400,'erreur-client : un écran mal formé est refusé');
  r=await envoi({...base,message:''});
  ok(r.status===400,'erreur-client : un message vide est refusé');
  r=await envoi('x'.repeat(3001));
  ok(r.status===413,'erreur-client : un corps de 3 Ko est refusé');
  r=await envoi({...base,message:'m'.repeat(900)});
  ok(r.status===204&&(ecrits.at(-1).message||'').length===200,'erreur-client : un message de 900 signes est tronqué à 200');
  quota=29;r=await envoi(base);ok(r.status===204,'erreur-client : la 30e erreur de l\'heure passe');
  r=await envoi(base);ok(r.status===429,'erreur-client : la 31e lit 429 — une page qui boucle s\'arrête là');
  quota=0;rpcAbsente=true;r=await envoi(base);
  ok(r.status===503,'erreur-client : RPC absente (migration pas appliquée) → 503, jamais 200');
  globalThis.fetch=fetchAvant;
}
/* ═══ COURSES-HOTEL — un partenaire DÉSACTIVÉ ne lit plus rien (audit du
   19 octobre 2026) ; une fiche absente ou une table muette laissent le code
   décider, comme avant. ═══ */
{
  const fetchAvant=globalThis.fetch;let fiche=null;
  globalThis.fetch=async(url,init={})=>{url=String(url);
    if(url.includes('/rest/v1/partenaires?')){if(fiche==='panne')return new Response('x',{status:500});return new Response(JSON.stringify(fiche===null?[]:[{actif:fiche}]));}
    return fetchAvant(url,init);};
  /* « charger » remplace l'environnement Deno à chaque fonction chargée : on
     recharge courses-hotel avec SON secret, sinon tout rend 401 pour une
     raison qui n'a rien à voir. */
  const hc2=await charger('courses-hotel',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S',HOTEL_EASYHOTEL_AEROVILLE_CODE:'easyhotel-9F3K2Q'});
  const hp2=(code)=>hc2(new Request('http://x',{method:'POST',headers:{'x-forwarded-for':'1.2.3.5'},body:JSON.stringify({hotel:'easyhotel-aeroville',code})}));
  quotaAppels=0;quotaLimite=60;
  fiche=true;let r=await hp2('easyhotel-9F3K2Q');ok(r.status===200,'réception : partenaire actif, bon code → la liste ('+r.status+')');
  fiche=false;r=await hp2('easyhotel-9F3K2Q');ok(r.status===401&&(await r.json()).refuse===true,'réception : partenaire DÉSACTIVÉ, bon code → refusé, même réponse qu\'un code faux');
  fiche=null;r=await hp2('easyhotel-9F3K2Q');ok(r.status===200,'réception : pas de fiche partenaire → le code décide (servi)');
  fiche='panne';r=await hp2('easyhotel-9F3K2Q');ok(r.status===200,'réception : table des partenaires muette → le code décide (servi), on ne ferme pas un comptoir sur un doute');
  fiche=true;r=await hp2('mauvais');ok(r.status===401,'réception : partenaire actif, code faux → refusé (le contrôle du partenaire ne remplace pas le code)');
  globalThis.fetch=fetchAvant;
}
/* ═══ ETAT-COURSE NE VA PAS EN BASE POUR UNE RÉFÉRENCE MAL FORMÉE (audit
   du 19 octobre 2026) ═══ Ouverte à tous, sans plafond : chaque appel
   coûtait une lecture, quelle que soit la référence. On compte les lectures
   et on vérifie que la réponse reste celle d'une course introuvable. */
{
  const fetchAvant=globalThis.fetch;let lectures=0;
  globalThis.fetch=async(url,init={})=>{url=String(url);if(url.includes('/rest/v1/courses?select=statut,bon')){lectures++;const ref=decodeURIComponent(url.match(/ref=eq\.([^&]+)/)[1]);return new Response(JSON.stringify(rows[ref]?[{statut:'confirmee',bon:rows[ref].bon}]:[]));}return fetchAvant(url,init);};
  const e=await charger('etat-course',{SUPABASE_URL:'http://sb',SUPABASE_SERVICE_ROLE_KEY:'S'});
  const et=(ref,tel)=>e(new Request('http://x',{method:'POST',body:JSON.stringify({ref,tel})}));
  rows['ELA-26-10-K7QPM']={ref:'ELA-26-10-K7QPM',bon:{ref:'ELA-26-10-K7QPM',client:{telephone:'+33 7 59 31 24 33'},course:{vehicule:'Berline',date:'2026-10-20',heure:'10:00'},chauffeur:{nom:'Ali',telephone:'06'}}};
  let r=await et('ELA-26-10-K7QPM','0759312433');
  ok(r.status===200&&(await r.json()).statut==='confirmee','etat-course : une vraie référence et le bon téléphone rendent l\'état');
  r=await et('ELA-26-09-0007','0759312433');
  ok(r.status===404&&lectures===2,'etat-course : l\'ancienne forme (quatre chiffres) va en base et rend « inconnue »');
  r=await et("ela' or 1=1 --",'0759312433');
  ok(r.status===404&&(await r.json()).inconnue===true&&lectures===2,'etat-course : une référence mal formée rend « inconnue » SANS lecture en base');
  r=await et('X'.repeat(300),'0759312433');
  ok(r.status===404&&lectures===2,'etat-course : une référence de 300 signes non plus');
  r=await et('ELA-26-10-K7QPM','0600000000');
  ok(r.status===404&&(await r.json()).inconnue===true,'etat-course : un mauvais téléphone rend la MÊME réponse qu\'une course introuvable');
  globalThis.fetch=fetchAvant;
}
console.log('=== RÉUSSIS ('+reussis.length+') ===');reussis.forEach(x=>console.log('  ✓ '+x));
if(echecs.length){console.log('=== ÉCHECS ('+echecs.length+') ===');echecs.forEach(x=>console.log('  ✗ '+x));process.exit(1);}
