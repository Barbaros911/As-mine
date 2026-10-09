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
    if(url.includes('/rpc/ela_prospect_creer')){const a=JSON.parse(init.body);
      if(a.p_email.startsWith('quota@'))return new Response('{"message":"quota_email"}',{status:400});
      if(a.p_email.startsWith('refus@'))return new Response(JSON.stringify({code:'23514',message:'new row violates check constraint',details:'Failing row contains ('+a.p_nom+', '+a.p_email+', '+a.p_telephone+')'}),{status:400});
      const id=randomUUID();F.crees.push(a);F.prospects.add(id);F.jetons.set(a.p_jeton_empreinte,id);
      return new Response(JSON.stringify([{id,domaine_pro:!a.p_email.endsWith('@gmail.com')}]));}
    if(url.includes('/rpc/ela_prospect_ouvrir')){const a=JSON.parse(init.body);F.ouverts.push(a.p_id);return new Response(JSON.stringify(F.prospects.has(a.p_id)));}
    if(url.includes('/rpc/ela_prospect_confirmer')){const a=JSON.parse(init.body);const ok=F.jetons.has(a.p_empreinte);F.jetons.delete(a.p_empreinte);return new Response(JSON.stringify(ok));}
    if(url.includes('api.telegram.org')){if(F.tgPanne)throw new Error('réseau');F.tg.push(JSON.parse(init.body));return new Response('{}');}
    if(url.includes('api.resend.com')){F.mails.push(JSON.parse(init.body));return new Response('{}');}
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
  const raz=()=>{F.quota=true;F.turnstile=0;F.crees=[];F.tg=[];F.mails=[];F.ouverts=[];F.tgPanne=false;F.quotaCles=[];};

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
console.log('=== RÉUSSIS ('+reussis.length+') ===');reussis.forEach(x=>console.log('  ✓ '+x));
if(echecs.length){console.log('=== ÉCHECS ('+echecs.length+') ===');echecs.forEach(x=>console.log('  ✗ '+x));process.exit(1);}
