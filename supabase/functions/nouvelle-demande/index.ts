import { titre, titreRappel, titreNonVue, titreVuePasConfirmee, titreFinal, duree, corps, titreAPrevenir, corpsAPrevenir } from "./message.js";
import { chiffrer, jetonVapid } from "./chiffrer.js";

const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const TELEGRAM_TOKEN=Deno.env.get("TELEGRAM_TOKEN")??"",TELEGRAM_CHAT=Deno.env.get("TELEGRAM_CHAT")??"";
const RESEND_CLE=Deno.env.get("RESEND_CLE")??"",EMAIL_EXPEDITEUR=Deno.env.get("EMAIL_EXPEDITEUR")??"",EMAIL_DESTINATAIRE=Deno.env.get("EMAIL_DESTINATAIRE")??"";
const VAPID_PUBLIQUE=Deno.env.get("VAPID_PUBLIQUE")??"",VAPID_PRIVEE=Deno.env.get("VAPID_PRIVEE")??"",VAPID_SUJET=Deno.env.get("VAPID_SUJET")??"mailto:contact@elatransfer.com";
/* L'ESPACE HISTORIQUE EST L'ADMIN RETENU (23/09/2026, choix de Barbaros :
   « on garde l'ancien »). Admin v2 reste en ligne mais n'est plus la porte. */
const ADMIN=Deno.env.get("ADRESSE_ADMIN")??"https://elatransfer.com/ela-admin/";
/* LE SECRET DE LA RELANCE (19 octobre 2026, audit, P2). RELANCE et
   INSTALLER_TELEGRAM étaient joignables par quiconque a la clé publique du
   site : appeler la relance en boucle (du bruit sur la base, jamais un
   message de plus, la cadence vient du journal) ou reposer le webhook du
   bot en boucle (Telegram ralentit alors le bot, et le bouton « Vu » avec).
   pg_cron envoie maintenant l'en-tête « x-ela-relance », lu dans le coffre
   (Vault, secret « ela_relance_secret ») à chaque appel. LA FONCTION LIT LA
   MÊME VALEUR DANS LA BASE (RPC ela_relance_secret, réservée à la clé de
   service) : le secret est FABRIQUÉ par la migration, ne sort jamais de
   Supabase, et personne n'a rien à coller (Barbaros : « Fais-le toi-même »).
   RELANCE_SECRET (secret de fonction) reste un repli manuel : posé, il
   l'emporte. SANS SECRET NULLE PART (migration pas appliquée, RPC absente),
   RIEN NE CHANGE : la relance est l'alerte, on ne la coupe pas pour un
   verrou manquant. Lu une fois par 5 min, relu sur un désaccord (le secret
   a pu tourner) ; comparaison à temps constant. Le webhook INSERT n'est pas
   concerné. */
const RELANCE_SECRET=Deno.env.get("RELANCE_SECRET")??"";
let secretRelanceCache={valeur:"",lu:0};
async function secretRelanceAttendu(force=false):Promise<string>{
  if(RELANCE_SECRET)return RELANCE_SECRET;
  if(!force&&secretRelanceCache.lu&&Date.now()-secretRelanceCache.lu<300000)return secretRelanceCache.valeur;
  let valeur="";
  try{const r=await db("rpc/ela_relance_secret",{method:"POST",body:"{}"});if(r.ok){const v=await r.json();if(typeof v==="string")valeur=v;}}catch{valeur="";}
  secretRelanceCache={valeur,lu:Date.now()};
  return valeur;
}
function memeSecret(recu:string,attendu:string):boolean{
  const a=new TextEncoder().encode(recu),b=new TextEncoder().encode(attendu);
  if(a.length!==b.length)return false;
  let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];
  return d===0;
}
async function relanceAutorisee(req:Request):Promise<boolean>{
  let attendu=await secretRelanceAttendu();
  if(!attendu)return true;
  const recu=req.headers.get("x-ela-relance")??"";
  if(memeSecret(recu,attendu))return true;
  attendu=await secretRelanceAttendu(true);
  return !attendu||memeSecret(recu,attendu);
}

type Resultat={ok:boolean;detail:string;statut?:"envoye"|"echec"|"indisponible"|"aucun_abonne"};
async function envoyer(url:string,init:RequestInit,ms=8000):Promise<Resultat>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{...init,signal:ctrl.signal});return{ok:r.ok,detail:r.ok?"":`${r.status} ${await r.text()}`};}catch(e){return{ok:false,detail:String(e)}}finally{clearTimeout(timer)}}
async function db(path:string,init:RequestInit={}){const h=new Headers(init.headers);h.set("apikey",S);h.set("Authorization",`Bearer ${S}`);if(init.body)h.set("Content-Type","application/json");return fetch(`${U}/rest/v1/${path}`,{...init,headers:h});}
async function journal(type_evenement:string,course_ref:string,canal:string,r:Resultat){if(!U||!S)return;await db("journal_notifications_admin",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({type_evenement,course_ref,canal,statut:r.statut||(r.ok?"envoye":"echec"),detail:r.detail.slice(0,500)||null})}).catch(()=>{});}
/* Sous chaque alerte : « ✅ Vu » arrête les rappels (fonction telegram-bot),
   « Ouvrir la course » mène au bon — et l'ouvrir les arrête aussi. */
function boutons(ref:string){return{inline_keyboard:[[{text:"✅ Vu — arrêter les rappels",callback_data:`vu:${ref}`}],[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]};}
/* « clavier » remplace les boutons d'une alerte de demande (24/10/2026) : le
   rappel « client pas prévenu » n'a pas de « Vu », qui arrête les rappels
   d'une demande EN ATTENTE et ne veut rien dire ici. */
async function parTelegram(t:string,m:string,ref="",clavier?:Record<string,unknown>):Promise<Resultat>{
  if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT)return{ok:false,detail:"telegram_non_configure",statut:"indisponible"};
  /* ON GARDE L'IDENTIFIANT DU MESSAGE (2 octobre 2026) : un rappel REMPLACE le
     précédent — on efface l'ancien avant d'envoyer le nouveau — pour qu'une
     seule ligne de rappel reste dans la conversation, jamais une pile. Il est
     rangé dans le journal (« message_id=N »), le seul endroit relu ensuite. */
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,
      body:JSON.stringify({chat_id:TELEGRAM_CHAT,text:t+"\n\n"+m,disable_web_page_preview:true,...(clavier?{reply_markup:clavier}:ref?{reply_markup:boutons(ref)}:{})})});
    const txt=await r.text();
    if(!r.ok)return{ok:false,detail:`${r.status} ${txt}`};
    let id="";try{id=String(JSON.parse(txt)?.result?.message_id??"")}catch{id=""}
    return{ok:true,detail:id?`message_id=${id}`:""};
  }catch(e){return{ok:false,detail:String(e)}}finally{clearTimeout(timer)}
}
/* L'annonce initiale n'est JAMAIS effacée : elle porte le détail et les
   boutons. Seul le rappel précédent l'est. Un échec ici n'empêche rien. */
async function effacerTelegram(messageId:string):Promise<void>{
  if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT||!/^\d+$/.test(messageId))return;
  await envoyer(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({chat_id:TELEGRAM_CHAT,message_id:Number(messageId)})}).catch(()=>{});
}
function dernierRappelTelegram(journalRef:Array<Record<string,string>>):string{
  for(const x of [...journalRef].reverse()){
    if(x.canal!=="telegram"||x.statut!=="envoye"||(x.type_evenement!=="rappel_reservation"&&x.type_evenement!=="rappel_final"&&x.type_evenement!=="rappel_vue"))continue;
    const m=/message_id=(\d+)/.exec(x.detail||"");if(m)return m[1];
  }
  return "";
}
/* Le secret du webhook est DÉRIVÉ du jeton du bot : même calcul dans
   telegram-bot. Aucun secret de plus à poser. */
async function secretWebhook(jeton:string):Promise<string>{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(jeton+":webhook-ela"));return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function installerTelegram():Promise<string>{
  if(!TELEGRAM_TOKEN||!U)return "telegram non configuré";
  const r=await envoyer(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:`${U}/functions/v1/telegram-bot`,secret_token:await secretWebhook(TELEGRAM_TOKEN),allowed_updates:["callback_query"]})});
  return r.ok?"webhook Telegram installé":"webhook Telegram refusé : "+r.detail.slice(0,200);
}
async function parEmail(t:string,m:string):Promise<Resultat>{if(!RESEND_CLE||!EMAIL_EXPEDITEUR||!EMAIL_DESTINATAIRE)return{ok:false,detail:"email_non_configure",statut:"indisponible"};return envoyer("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${RESEND_CLE}`,"Content-Type":"application/json"},body:JSON.stringify({from:EMAIL_EXPEDITEUR,to:[EMAIL_DESTINATAIRE],subject:t,text:m})});}
/* LA PASTILLE DE L'ICÔNE, MÊME APPLICATION FERMÉE (30/09/2026). Une page
   fermée ne tourne plus : seule la notification arrive. Elle porte donc le
   NOMBRE de demandes en attente, que le service worker pose sur l'icône. */
async function nbAttente():Promise<number>{
  if(!U||!S)return 0;
  const depuis=new Date(Date.now()-30*86400000).toISOString();
  const r=await db(`courses?select=ref&statut=eq.attente&cree_le=gte.${encodeURIComponent(depuis)}&limit=99`).catch(()=>null);
  if(!r||!r.ok)return 0;
  const l=await r.json().catch(()=>[]);return Array.isArray(l)?l.length:0;
}
async function parPush(t:string,ref:string,etiq=ref):Promise<Resultat>{
  if(!U||!S||!VAPID_PUBLIQUE||!VAPID_PRIVEE)return{ok:false,detail:"push_non_configure",statut:"indisponible"};
  const r=await db("abonnements_admin?select=id,abonnement&actif=eq.true");if(!r.ok)return{ok:false,detail:"lecture_abonnements_refusee",statut:"echec"};const lignes=await r.json();if(!Array.isArray(lignes)||!lignes.length)return{ok:false,detail:"aucun_abonne",statut:"aucun_abonne"};
  const charge=JSON.stringify({titre:t,corps:`${etiq} — action requise`,ref,attente:await nbAttente(),url:`${ADMIN}?ref=${encodeURIComponent(ref)}`});let envoyes=0,echecs=0;
  /* 8 s AU PLUS PAR APPAREIL (25 octobre 2026, P0) : un service de
     notification qui ne répond pas retenait toute la relance, qui chevauchait
     alors le tour suivant — et les rappels partaient en double. */
  for(const ligne of lignes){const ab=ligne.abonnement;if(!ab?.endpoint||!ab?.keys?.p256dh||!ab?.keys?.auth){echecs++;continue;}const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);try{const paquet=await chiffrer(charge,ab.keys.p256dh,ab.keys.auth),origine=new URL(ab.endpoint).origin,jeton=await jetonVapid(origine,VAPID_SUJET,VAPID_PRIVEE,VAPID_PUBLIQUE),rep=await fetch(ab.endpoint,{method:"POST",signal:ctrl.signal,headers:{Authorization:`vapid t=${jeton}, k=${VAPID_PUBLIQUE}`,"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:"14400"},body:paquet});if(rep.ok)envoyes++;else{echecs++;if(rep.status===404||rep.status===410)await db(`abonnements_admin?id=eq.${encodeURIComponent(ligne.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({actif:false,modifie_le:new Date().toISOString()})}).catch(()=>{});}}catch{echecs++;}finally{clearTimeout(timer);}}
  return envoyes?{ok:true,detail:`${envoyes}/${lignes.length} push`,statut:"envoye"}:{ok:false,detail:`0/${lignes.length} push; ${echecs} échec(s)`,statut:"echec"};
}

/* LE CORPS REÇU N'EST QU'UN SIGNAL, JAMAIS UNE SOURCE (audit du 28/09/2026).
   Cette fonction est joignable avec la clé publique du site : n'importe qui
   pouvait lui envoyer un faux « INSERT » et faire partir chez Barbaros une
   alerte au texte de son choix — de quoi l'hameçonner ou le noyer la nuit.
   On ne retient donc que la RÉFÉRENCE, et on relit la course sur le serveur :
   elle doit exister, être toute récente, et ne pas avoir déjà été annoncée.
   Aucun réglage à changer dans Supabase : le vrai webhook passe à l'identique. */
const FRAICHEUR_MS=15*60*1000;
async function courseReelle(ref:string):Promise<Record<string,any>|null>{
  if(!U||!S||!/^[A-Z]{2,4}-[0-9A-Z-]{4,26}$/.test(ref))return null;
  const r=await db(`courses?select=ref,bon,cree_le&ref=eq.${encodeURIComponent(ref)}&limit=1`);if(!r.ok)return null;
  const l=(await r.json())?.[0];if(!l)return null;
  const cree=Date.parse(String(l.cree_le||""));if(!Number.isFinite(cree)||Date.now()-cree>FRAICHEUR_MS)return null;
  const deja=await db(`journal_notifications_admin?select=course_ref&type_evenement=eq.nouvelle_reservation&course_ref=eq.${encodeURIComponent(ref)}&limit=1`);
  if(deja.ok&&((await deja.json())||[]).length)return null;
  const bon=(l.bon??{}) as Record<string,any>;if(!bon.ref)bon.ref=l.ref;
  if(saisieExploitant(bon))return null;
  return bon;
}
/* LES SAISIES DE L'EXPLOITANT NE DÉCLENCHENT AUCUNE ALERTE (2 octobre 2026,
   à sa demande : « aucune alerte du tout »). « Coller une demande » et
   « Saisir par téléphone » écrivent dans la même table que les clients : le
   serveur lui annonçait sa propre saisie, puis la relançait dix minutes.
   Une demande passée par le site porte l'empreinte posée par
   « deposer-course » (securite.empreinteDepot) ; les siennes, jamais. C'est
   le serveur qui la pose : un client ne peut pas la contrefaire pour se
   faire passer pour l'exploitant, ni l'inverse. */
function saisieExploitant(bon:Record<string,any>):boolean{
  const s=(bon.securite??{}) as Record<string,unknown>;
  return !(typeof s.empreinteDepot==="string"&&s.empreinteDepot.length>0);
}

/* LE RAPPEL ET LE RATTRAPAGE — UN CANAL QUI INSISTE, UN CANAL QUI INFORME
   (2 octobre 2026, à sa demande, après « je ne veux pas trop d'alertes sur
   Telegram »). La version précédente faisait l'alarme sur les deux canaux :
   Telegram toutes les 20 s pendant 10 min, puis toutes les 20 s dès H-30 et
   JUSQU'À 6 H APRÈS LE DÉPART tant que la course restait « en attente » et
   non vue — jusqu'à un millier de messages pour une seule course oubliée.
   C'est le téléphone qui finissait par couper le son, et la vraie demande
   suivante passait avec.
   Appelée toutes les 20 s par pg_cron avec {type:"RELANCE"}.
   PLUS AUCUN SILENCE AVANT LE « VU » (25 octobre 2026, P0). Mesuré sur ce
   code : une demande de la veille pour le lendemain matin, ratée dans ses
   10 premières minutes, recevait trois Telegram (+25, +40, +55 min) puis
   QUATORZE HEURES de silence jusqu'à H-2 — la notification s'était tue dès
   +10 min. C'est le chemin de la réservation vue avec plus de 30 min de
   retard. Barbaros, interrogé : la nuit aussi, jusqu'au « Vu » (« oui »).
   - RATTRAPAGE : en attente depuis plus d'1 min sans AUCUNE alerte réussie
     → annoncée maintenant, par tous les canaux ; toutes les minutes les
     6 premières heures, puis tous les quarts d'heure tant que le départ
     n'est pas passé (avant : jamais au-delà de 6 h).
   - NON VUE — la notification ELA est l'alarme, Telegram informe :
       · 0 à 10 min : notification à chaque tour (20 s), Telegram toutes les
         90 s (9 octobre 2026, à sa demande, éprouvé admin fermé ; pas moins :
         à 20 s, le téléphone finissait par couper le son de Telegram) ;
       · 10 à 30 min, PALIER CRITIQUE (« 🔴 NON VUE ») : notification toutes
         les 2 min, Telegram toutes les 5 min ;
       · au-delà, JOUR ET NUIT, quel que soit le départ : notification toutes
         les 5 min, Telegram toutes les 15 min ;
       · départ dans 30 min ou moins : notification à chaque tour, Telegram
         toutes les 5 min.
     La notification REMPLACE la précédente (même étiquette) ; chaque rappel
     Telegram EFFACE le précédent : une ligne de rappel visible, jamais une
     pile (2 octobre 2026, « pas trop d'alertes sur Telegram »).
   - VUE MAIS TOUJOURS EN ATTENTE : « Vu » arrête l'alarme, pas le suivi. Un
     rappel « vue, pas confirmée » 30 min après le « Vu », puis un à H-2 et
     un à H-30 — jamais deux à moins de 20 min, ni dans les 20 min qui
     suivent le « Vu ». Avant, « Vu » coupait tout jusqu'au départ.
   - À L'HEURE DU DÉPART, UN DERNIER MESSAGE sur les deux canaux (« départ
     passé, non traitée »), vue ou non, puis plus rien. Une course oubliée
     se clôt dans l'admin, elle ne sonne pas six heures.
   - Tout s'arrête dès que la course n'est plus « attente ».
   - LES SAISIES DE L'EXPLOITANT NE SONT NI ANNONCÉES NI RELANCÉES.
   Rien n'est cru de l'appel : tout est relu sur le serveur, et la cadence
   vient du journal — une nouvelle exécution du serveur reprend exactement
   où la précédente s'est arrêtée. */
const MIN_MS=60*1000,IMMEDIAT_MS=30*60*1000;
/* SOUPLESSE : pg_cron ne tombe jamais pile. Un rappel dû à 3 min vérifié à
   2 min 59 s partirait au tour suivant, 20 s plus tard — ou, pour la
   notification « à chaque tour », une fois sur deux. */
const SOUPLESSE_MS=5*1000;
const RATTRAPAGE_MS=60*1000,PAS_ALARME_MS=20*1000-SOUPLESSE_MS,ALARME_MS=10*MIN_MS,FENETRE_MS=6*3600*1000;
/* Telegram pendant la fenêtre d'alarme : 90 s (9 octobre 2026). */
const PAS_TELEGRAM_ALARME_MS=90*1000;
/* Le palier critique (10 à 30 min) et la suite, jusqu'au « Vu » (25 octobre
   2026). */
const CRITIQUE_MS=30*MIN_MS,PAS_PUSH_CRITIQUE_MS=2*MIN_MS,PAS_TG_CRITIQUE_MS=5*MIN_MS,PAS_PUSH_SUITE_MS=5*MIN_MS,PAS_TG_SUITE_MS=15*MIN_MS;
/* Le suivi d'une demande vue mais pas confirmée (25 octobre 2026). */
const VUE_SUIVI_MS=30*MIN_MS,VUE_ECART_MS=20*MIN_MS;
const plusRecent=(l:Array<Record<string,string>>,defaut:number)=>l.length?Math.max(...l.map(x=>Date.parse(x.cree_le))):defaut;
/* L'ÉTIQUETTE D'UNE COURSE DANS UNE ALERTE (9 octobre 2026, Barbaros : « je
   voudrais que tous les numéros soient pareils »). Le N° court quand la base
   l'a attribué, la référence sinon — jamais les deux en tête : la référence
   longue reste la clé technique (bouton, lien, journal), pas ce qu'on lit. */
function etiquette(bon:Record<string,any>|null|undefined,ref:string):string{const n=Number(bon?.numero);return n>0?`N° ${n}`:`Réf. ${ref}`;}
/* Date et heure du bon sont des heures civiles de Paris. Les convertir en
   pseudo-UTC, comme l'horloge de Paris courante, évite que le serveur UTC
   décale le seuil d'une ou deux heures lors des changements été/hiver. */
const HORLOGE_PARIS=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function heureCivileParis(ms:number):number{const p=Object.fromEntries(HORLOGE_PARIS.formatToParts(new Date(ms)).filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);}
function departCivil(bon:Record<string,any>):number|null{const c=(bon.course??{}) as Record<string,any>,d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(c.date??"")),h=/^(\d{1,2}):(\d{2})$/.exec(String(c.heure??""));if(!d||!h)return null;const valeurs=[...d.slice(1),...h.slice(1)].map(Number),v=Date.UTC(valeurs[0],valeurs[1]-1,valeurs[2],valeurs[3],valeurs[4]);return valeurs[1]>=1&&valeurs[1]<=12&&valeurs[2]>=1&&valeurs[2]<=31&&valeurs[3]<=23&&valeurs[4]<=59?v:null;}
/* Temps restant avant le départ, en ms (négatif = passé) ; null si le bon
   n'a pas de date lisible. */
function resteAvantDepart(bon:Record<string,any>):number|null{const depart=departCivil(bon);return depart===null?null:depart-heureCivileParis(Date.now());}
/* LA NOTIFICATION ELA — l'alarme, d'une demande NON VUE. Pas de rappel une
   fois le départ passé : c'est le message final qui parle, une fois. Plus
   jamais « rien » avant le départ (25 octobre 2026) : c'était le silence de
   +10 min à H-2. */
function cadencePush(reste:number|null,age:number):number|null{
  if(reste!==null&&reste<=0)return null;
  if(age<=ALARME_MS||(reste!==null&&reste<=30*MIN_MS))return PAS_ALARME_MS;
  if(age<=CRITIQUE_MS)return PAS_PUSH_CRITIQUE_MS-SOUPLESSE_MS;
  return PAS_PUSH_SUITE_MS-SOUPLESSE_MS;
}
/* TELEGRAM — l'information. « depuisDernier » = temps écoulé depuis le
   dernier envoi Telegram, annonce comprise, réussi OU NON : un échec compte,
   sinon une panne de Telegram ferait réessayer à chaque tour. */
function telegramDu(age:number,reste:number|null,depuisDernier:number):boolean{
  if(reste!==null&&reste<=0)return false;
  if(reste!==null&&reste<=30*MIN_MS)return depuisDernier>=5*MIN_MS-SOUPLESSE_MS;
  if(age<=ALARME_MS)return depuisDernier>=PAS_TELEGRAM_ALARME_MS-SOUPLESSE_MS;
  if(age<=CRITIQUE_MS)return depuisDernier>=PAS_TG_CRITIQUE_MS-SOUPLESSE_MS;
  return depuisDernier>=PAS_TG_SUITE_MS-SOUPLESSE_MS;
}
/* Faut-il encore regarder cette course ? Tant que son départ n'est pas
   passé depuis plus de 6 h, oui (25 octobre 2026 : elle sonne jusqu'au
   « Vu », quel que soit le départ). Une course sans date lisible reste
   bornée par la lecture (7 jours). Au-delà, on n'interroge même pas le
   journal. */
function encoreUtile(age:number,reste:number|null):boolean{
  if(age<=FENETRE_MS||reste===null)return true;
  return reste>-FENETRE_MS;
}
/* LE DÉPART EST PASSÉ : un dernier message, une seule fois, puis rien — que
   la demande ait été vue ou non. Vue, son message n'offre plus « Vu ». */
async function messageFinal(ref:string,bon:Record<string,any>,journalRef:Array<Record<string,string>>,vue:boolean):Promise<boolean>{
  if(journalRef.some(x=>x.type_evenement==="rappel_final"))return false;
  const t=titreFinal(bon),etiq=etiquette(bon,ref);
  await effacerTelegram(dernierRappelTelegram(journalRef));
  const [tg,push]=await Promise.all([
    parTelegram(t,bon.course?.immediat===true?`${etiq} — demande immédiate toujours en attente après 30 min. Rappelez le client ou refusez-la dans l'admin. Plus aucun rappel ne partira.`:`${etiq} — l'heure du départ est passée et la demande est toujours en attente. À clore dans l'admin. Plus aucun rappel ne partira.`,ref,
      vue?{inline_keyboard:[[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]}:undefined),
    parPush(t,ref,etiq),
  ]);
  await Promise.all([journal("rappel_final",ref,"telegram",tg),journal("rappel_final",ref,"push",push)]);
  return true;
}
/* VUE, PAS CONFIRMÉE (25 octobre 2026, P0). « Vu » arrête l'alarme. Avant,
   il arrêtait TOUT jusqu'au départ : une demande vue puis oubliée partait
   sans chauffeur sans qu'un seul message ne le rappelle. Trois rappels au
   plus, chacun une fois : 30 min après le « Vu », à H-2, à H-30 — jamais
   deux à moins de 20 min, ni dans les 20 min qui suivent le « Vu ». Puis le
   message final à l'heure du départ. Un rappel couvre les jalons déjà
   atteints quand il part : envoyé à H-25, il vaut pour H-2 et pour H-30. */
async function suivreVue(ref:string,bon:Record<string,any>,journalRef:Array<Record<string,string>>,vueLe:number,reste:number|null):Promise<""|"final"|"rappel">{
  if(reste!==null&&reste<=0)return (await messageFinal(ref,bon,journalRef,true))?"final":"";
  if(!Number.isFinite(vueLe))return "";
  const faits=journalRef.filter(x=>x.type_evenement==="rappel_vue"),maintenant=Date.now();
  const depart=reste===null?null:maintenant+reste;
  /* « reste » se compte à la minute près (heureCivileParis tronque) : le
     départ calculé flotte d'un tour à l'autre de moins d'une minute. Sans
     cette marge, le rappel de H-2 se croyait non fait et repartait 20 min
     plus tard — trouvé par le test (cinq rappels au lieu de trois). */
  const couvert=(jalon:number)=>faits.some(x=>Date.parse(x.cree_le)>=jalon-MIN_MS-SOUPLESSE_MS);
  const du=(!faits.length&&maintenant-vueLe>=VUE_SUIVI_MS-SOUPLESSE_MS)
    ||(depart!==null&&reste!==null&&reste<=2*3600*1000&&!couvert(depart-2*3600*1000))
    ||(depart!==null&&reste!==null&&reste<=30*MIN_MS&&!couvert(depart-30*MIN_MS));
  if(!du||maintenant-vueLe<VUE_ECART_MS-SOUPLESSE_MS||maintenant-plusRecent(faits,0)<VUE_ECART_MS-SOUPLESSE_MS)return "";
  const etiq=etiquette(bon,ref),t=titreVuePasConfirmee(bon);
  await effacerTelegram(dernierRappelTelegram(journalRef));
  const [tg,push]=await Promise.all([
    parTelegram(t,`${etiq} — vue il y a ${duree((maintenant-vueLe)/60000)}, toujours en attente. Confirmez-la ou refusez-la dans l'admin.`,ref,
      {inline_keyboard:[[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]}),
    parPush(t,ref,etiq),
  ]);
  await Promise.all([journal("rappel_vue",ref,"telegram",tg),journal("rappel_vue",ref,"push",push)]);
  return "rappel";
}
/* On lit les demandes en attente des 7 derniers jours : c'est l'heure du
   départ qui décide du rappel (un hôtel réserve la veille). */
const LECTURE_MS=7*24*3600*1000;
async function relancer():Promise<string>{
  if(!U||!S)return "non configuré";
  const depuis=new Date(Date.now()-LECTURE_MS).toISOString();
  const r=await db(`courses?select=ref,bon,cree_le&statut=eq.attente&cree_le=gte.${encodeURIComponent(depuis)}&order=cree_le.desc&limit=200`);
  if(!r.ok)return "lecture refusée";
  const lignes=(await r.json())||[];let rattrapes=0,rappelsTg=0,rappelsPush=0,finals=0,suivis=0;
  for(const l of lignes){
    const ref=String(l.ref||"").slice(0,32);if(!/^[A-Z]{2,4}-[0-9A-Z-]{4,26}$/.test(ref))continue;
    const cree=Date.parse(String(l.cree_le||""));if(!Number.isFinite(cree))continue;
    const bon=(l.bon??{}) as Record<string,any>;if(!bon.ref)bon.ref=ref;
    if(saisieExploitant(bon))continue;
    /* UNE DEMANDE IMMÉDIATE N'A PAS DE RENDEZ-VOUS : son « départ » est
       l'instant même où elle a été faite. Comptée sur lui, elle recevait au
       tour suivant le message final « départ passé », puis le silence — la
       demande en attente sans bruit qu'on veut justement éviter. Sa référence
       devient création + 30 min : 30 minutes d'alarme pleine, puis un
       dernier message (4 octobre 2026). */
    /* ET AUCUNE DEMANDE N'EST « PASSÉE » DANS SES 30 PREMIÈRES MINUTES. Un
       client qui réserve pour la minute même — l'heure proposée par le site,
       ou celle qu'il lit sur sa montre — avait un départ « passé » au tour
       suivant : message final, plus aucune alarme, pour la demande la plus
       pressée de toutes. Elle est traitée comme une demande immédiate ; une
       demande faite à l'avance n'y voit aucune différence (4 octobre 2026). */
    const age=Date.now()-cree,plancher=cree+IMMEDIAT_MS-Date.now();
    const brut=bon.course?.immediat===true?plancher:resteAvantDepart(bon);
    const reste=brut===null?null:Math.max(brut,plancher);
    if(!encoreUtile(age,reste))continue;
    const j=await db(`journal_notifications_admin?select=type_evenement,canal,statut,detail,cree_le&course_ref=eq.${encodeURIComponent(ref)}&order=cree_le.asc`);
    if(!j.ok)continue;
    const journalRef=((await j.json())||[]) as Array<Record<string,string>>;
    const vue=journalRef.find(x=>x.type_evenement==="vue");
    if(vue){
      const fait=await suivreVue(ref,bon,journalRef,Date.parse(vue.cree_le),reste);
      if(fait==="final")finals++;else if(fait==="rappel")suivis++;
      continue;
    }
    const reussies=journalRef.filter(x=>x.statut==="envoye");
    /* LES RAPPELS SE COMPTENT DEPUIS L'ANNONCE, PAS DEPUIS LA CRÉATION : une
       demande rattrapée 15 min après son dépôt aurait eu son « +3 min » au
       tour suivant. Trouvé par le test. */
    const annonce=reussies.length?Math.min(...reussies.map(x=>Date.parse(x.cree_le)).filter(Number.isFinite)):cree;
    const ageAnnonce=Date.now()-(Number.isFinite(annonce)?annonce:cree);
    if(!reussies.length){
      const derniereTentative=plusRecent(journalRef.filter(x=>x.type_evenement==="nouvelle_reservation"),cree);
      /* LE RATTRAPAGE VA JUSQU'AU DÉPART (25 octobre 2026). Borné à 6 h, une
         demande dont toutes les alertes avaient échoué plus de 6 h n'était
         plus jamais annoncée — et le voyant cessait alors de la compter.
         Toutes les minutes les 6 premières heures, tous les quarts d'heure
         ensuite ; une demande dont le départ est passé ne réveille pas
         l'historique. */
      const utile=reste===null?age<=FENETRE_MS:reste>0;
      const pas=age>FENETRE_MS?15*MIN_MS:RATTRAPAGE_MS;
      if(age<RATTRAPAGE_MS||!utile||Date.now()-derniereTentative<pas)continue;
      const t=titre(bon),m=corps(bon,ADMIN);rattrapes++;
      const [push,telegram]=await Promise.all([parPush(t,ref,etiquette(bon,ref)),parTelegram(t,m,ref)]);
      await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram)]);
      continue;
    }
    if(reste!==null&&reste<=0){
      if(await messageFinal(ref,bon,journalRef,false))finals++;
      continue;
    }
    const minutes=Math.max(1,Math.round(age/60000));
    /* Passé la fenêtre d'alarme, le titre dit « NON VUE » et depuis quand. */
    const critique=ageAnnonce>ALARME_MS;
    const t=critique?titreNonVue(bon,minutes):titreRappel(bon,minutes);
    const tgTous=journalRef.filter(x=>x.canal==="telegram");
    const doitTelegram=!!(TELEGRAM_TOKEN&&TELEGRAM_CHAT)&&telegramDu(ageAnnonce,reste,Date.now()-plusRecent(tgTous,cree));
    const cadence=cadencePush(reste,ageAnnonce);
    const pushDernier=plusRecent(journalRef.filter(x=>x.canal==="push"),cree);
    const doitPush=cadence!==null&&Date.now()-pushDernier>=cadence;
    if(doitTelegram){
      /* Le rappel précédent s'efface AVANT d'envoyer le suivant. */
      await effacerTelegram(dernierRappelTelegram(journalRef));
      const tg=await parTelegram(t,critique
        ?`${etiquette(bon,ref)} — toujours en attente, NON VUE depuis ${duree(minutes)}. Appuyez sur « ✅ Vu » pour arrêter les rappels.`
        :`${etiquette(bon,ref)} — toujours en attente. Appuyez sur « Vu » pour arrêter les rappels.`,ref);
      await journal("rappel_reservation",ref,"telegram",tg);rappelsTg++;
    }
    if(doitPush){
      const push=await parPush(t,ref,etiquette(bon,ref));
      await journal("rappel_reservation",ref,"push",push);rappelsPush++;
    }
  }
  return `relance : ${lignes.length} en attente, ${rattrapes} rattrapée(s), ${rappelsTg} rappel(s) Telegram, ${rappelsPush} rappel(s) notification, ${suivis} suivi(s) de demande vue, ${finals} message(s) final(aux)`;
}

/* ═══ LE CLIENT PAS ENCORE PRÉVENU (24 octobre 2026, à sa demande : « un
   pense-bête qui m'empêche d'oublier ») ═══
   L'admin pose « aPrevenir » sur la course quand un geste doit se dire au
   client — confirmation, refus, annulation, changement — et l'efface quand
   le message est ouvert. Resté posé 15 min : un rappel Telegram ; un
   second, le dernier, à H-3 (45 min après le geste pour une demande
   immédiate, qui n'a pas de rendez-vous), au moins 30 min après le
   premier. DEUX AU PLUS PAR GESTE : c'est un pense-bête, pas une alarme —
   l'alarme reste celle des demandes en attente, et Barbaros ne veut pas
   « trop d'alertes sur Telegram ». Rien une fois le départ passé.
   MÊMES RÈGLES QUE L'ADMIN (« aPrevenirActif ») : le type doit encore
   correspondre à l'état de la course, un client qui a payé a reçu sa
   confirmation, il faut un numéro. Le compte se lit dans le journal depuis
   l'heure du geste : un nouveau geste repart de zéro.
   Telegram seul, sans bouton « Vu » : « Ouvrir la course » suffit. Rien
   n'est cru de l'appel, tout est relu sur le serveur. */
const STATUT_PREVENIR:Record<string,string>={confirmation:"confirmee",modification:"confirmee",refus:"refusee",annulation:"annulee"};
const PREVENIR_PREMIER_MS=15*MIN_MS,PREVENIR_DERNIER_MS=3*3600*1000,PREVENIR_ECART_MS=30*MIN_MS,PREVENIR_IMMEDIAT_MS=45*MIN_MS,PREVENIR_IMMEDIAT_FIN_MS=3*3600*1000;
async function rappelerAPrevenir():Promise<string>{
  if(!U||!S)return "client pas prévenu : non configuré";
  if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT)return "client pas prévenu : Telegram non configuré";
  /* Les courses d'hier et après : une course passée n'a plus rien à dire. */
  const hier=new Date(heureCivileParis(Date.now())-24*3600*1000).toISOString().slice(0,10);
  const r=await db(`courses?select=ref,statut,bon&statut=in.(confirmee,refusee,annulee)&bon->>aPrevenir=not.is.null&bon->course->>date=gte.${hier}&limit=100`).catch(()=>null);
  if(!r||!r.ok)return "client pas prévenu : lecture refusée"+(r?" ("+r.status+")":"");
  const lignes=((await r.json().catch(()=>[]))||[]) as Array<Record<string,any>>;let n=0;
  for(const l of lignes){
    const ref=String(l.ref||"").slice(0,32);if(!/^[A-Z]{2,4}-[0-9A-Z-]{4,26}$/.test(ref))continue;
    const bon=(l.bon??{}) as Record<string,any>,a=(bon.aPrevenir??null) as Record<string,any>|null;
    if(!a||STATUT_PREVENIR[String(a.type)]!==String(l.statut))continue;
    if(String(bon.client?.telephone??"").replace(/\D/g,"").length<8)continue;
    if(a.type==="confirmation"&&bon.paye)continue;
    const depuis=Date.parse(String(a.depuis||""));if(!Number.isFinite(depuis))continue;
    const age=Date.now()-depuis;if(age<PREVENIR_PREMIER_MS-SOUPLESSE_MS)continue;
    const immediat=bon.course?.immediat===true,reste=immediat?null:resteAvantDepart(bon);
    if(immediat?age>PREVENIR_IMMEDIAT_FIN_MS:(reste===null||reste<=0))continue;
    const j=await db(`journal_notifications_admin?select=type_evenement,cree_le&type_evenement=eq.client_a_prevenir&course_ref=eq.${encodeURIComponent(ref)}&cree_le=gte.${encodeURIComponent(new Date(depuis).toISOString())}&order=cree_le.asc`);
    if(!j.ok)continue;
    const faits=((await j.json())||[]) as Array<Record<string,string>>;
    if(faits.length>=2)continue;
    if(faits.length===1){
      const proche=immediat?age>=PREVENIR_IMMEDIAT_MS-SOUPLESSE_MS:(reste!==null&&reste<=PREVENIR_DERNIER_MS);
      if(!proche||Date.now()-plusRecent(faits,depuis)<PREVENIR_ECART_MS-SOUPLESSE_MS)continue;
    }
    const etiq=etiquette(bon,ref);
    const tg=await parTelegram(titreAPrevenir(bon,etiq,faits.length===1),corpsAPrevenir(String(a.type),etiq),ref,
      {inline_keyboard:[[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]});
    await journal("client_a_prevenir",ref,"telegram",tg);n++;
  }
  return `${n} rappel(s) « client pas prévenu »`;
}

/* UNE SEULE RELANCE À LA FOIS (25 octobre 2026, P0). pg_cron appelle toutes
   les 20 s sans attendre la réponse : un tour plus long (Telegram lent,
   plusieurs demandes) chevauchait le suivant, les deux lisaient le même
   journal avant que l'un n'écrive, et le rappel partait deux fois. Le
   verrou vit en mémoire, il vaut donc pour une instance de la fonction ; il
   se libère seul après 60 s, pour qu'un tour bloqué ne fasse jamais taire
   les suivants. */
const RELANCE_VERROU_MS=60*1000;
let relanceEnCoursDepuis=0;
const annoncesEnCours:Set<string>=new Set();
Deno.serve(async(req)=>{
  let charge:Record<string,unknown>;try{charge=await req.json()}catch{return new Response("corps illisible",{status:400})}
  if(charge.type==="RELANCE"||charge.type==="INSTALLER_TELEGRAM"){
    if(!(await relanceAutorisee(req)))return new Response("relance refusée : en-tête x-ela-relance absent ou faux",{status:401});
    if(charge.type==="RELANCE"){
      if(Date.now()-relanceEnCoursDepuis<RELANCE_VERROU_MS)return new Response("relance déjà en cours : ce tour s'efface",{status:200});
      relanceEnCoursDepuis=Date.now();
      try{
        /* Deux tâches indépendantes : une lecture refusée d'un côté n'arrête
           pas l'autre. */
        const attente=await relancer(),prevenir=await rappelerAPrevenir();
        return new Response(attente+" | "+prevenir,{status:200});
      }finally{relanceEnCoursDepuis=0;}
    }
    /* Poser le webhook du bouton « Vu ». Appelé une fois par la migration ;
       le rappeler ne fait que reposer la même adresse. */
    return new Response(await installerTelegram(),{status:200});
  }
  if(charge.type!=="INSERT"||charge.table!=="courses")return new Response("ignoré : "+String(charge.type),{status:200});
  const recu=(charge.record??{}) as Record<string,any>;
  const refRecue=String(recu.ref||(recu.bon??{}).ref||"").trim().slice(0,32);
  /* UNE ANNONCE PAR DEMANDE, MÊME APPELÉE DEUX FOIS EN MÊME TEMPS (25 octobre
     2026, P0) : deux appels simultanés liraient tous deux un journal encore
     vide, et la demande s'annoncerait deux fois. Même portée que le verrou
     de la relance : une instance de la fonction. */
  if(annoncesEnCours.has(refRecue))return new Response("ignoré : annonce déjà en cours",{status:200});
  annoncesEnCours.add(refRecue);
  try{
    const bon=await courseReelle(refRecue);
    if(!bon)return new Response("ignoré : course inconnue, ancienne ou déjà annoncée",{status:200});
    const ref=String(bon.ref).slice(0,32),t=titre(bon),m=corps(bon,ADMIN);

    /* Push ELA + Telegram partent en parallèle. L'un ne bloque jamais l'autre.
       L'e-mail reste un troisième filet facultatif. */
    const [push,telegram,email]=await Promise.all([parPush(t,ref,etiquette(bon,ref)),parTelegram(t,m,ref),parEmail(t,m)]);
    await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram),journal("nouvelle_reservation",ref,"email",email)]);
    const utiles=[push,telegram,email].filter(x=>x.statut!=="indisponible");
    const bilan=`push : ${push.ok?"ok":push.detail} | telegram : ${telegram.ok?"ok":telegram.detail} | email : ${email.ok?"ok":email.detail}`;
    if(!utiles.length)return new Response("aucun canal configuré",{status:500});
    return new Response(bilan,{status:utiles.some(x=>x.ok)?200:500});
  }finally{annoncesEnCours.delete(refRecue);}
});
