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
  /* L'import de types « jsr: » de deposer-course n'existe pas pour Node. */
  js=js.replace(/^import "jsr:[^"]+";\s*$/m,'');
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
  fs.writeFileSync(tmpS+'/hotel-session.mjs',m.stripTypeScriptTypes(fs.readFileSync(R+'_shared/hotel-session.ts','utf8')));
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
  globalThis.fetch=fetchAvant;
}
console.log('=== RÉUSSIS ('+reussis.length+') ===');reussis.forEach(x=>console.log('  ✓ '+x));
if(echecs.length){console.log('=== ÉCHECS ('+echecs.length+') ===');echecs.forEach(x=>console.log('  ✗ '+x));process.exit(1);}
