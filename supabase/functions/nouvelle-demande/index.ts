import { titre, titreRappel, corps } from "./message.js";
import { chiffrer, jetonVapid } from "./chiffrer.js";

const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const TELEGRAM_TOKEN=Deno.env.get("TELEGRAM_TOKEN")??"",TELEGRAM_CHAT=Deno.env.get("TELEGRAM_CHAT")??"";
const RESEND_CLE=Deno.env.get("RESEND_CLE")??"",EMAIL_EXPEDITEUR=Deno.env.get("EMAIL_EXPEDITEUR")??"",EMAIL_DESTINATAIRE=Deno.env.get("EMAIL_DESTINATAIRE")??"";
const VAPID_PUBLIQUE=Deno.env.get("VAPID_PUBLIQUE")??"",VAPID_PRIVEE=Deno.env.get("VAPID_PRIVEE")??"",VAPID_SUJET=Deno.env.get("VAPID_SUJET")??"mailto:contact@elatransfer.com";
/* L'ESPACE HISTORIQUE EST L'ADMIN RETENU (23/09/2026, choix de Barbaros :
   « on garde l'ancien »). Admin v2 reste en ligne mais n'est plus la porte. */
const ADMIN=Deno.env.get("ADRESSE_ADMIN")??"https://elatransfer.com/ela-admin/";

type Resultat={ok:boolean;detail:string;statut?:"envoye"|"echec"|"indisponible"|"aucun_abonne"};
async function envoyer(url:string,init:RequestInit,ms=8000):Promise<Resultat>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{...init,signal:ctrl.signal});return{ok:r.ok,detail:r.ok?"":`${r.status} ${await r.text()}`};}catch(e){return{ok:false,detail:String(e)}}finally{clearTimeout(timer)}}
async function db(path:string,init:RequestInit={}){const h=new Headers(init.headers);h.set("apikey",S);h.set("Authorization",`Bearer ${S}`);if(init.body)h.set("Content-Type","application/json");return fetch(`${U}/rest/v1/${path}`,{...init,headers:h});}
async function journal(type_evenement:string,course_ref:string,canal:string,r:Resultat){if(!U||!S)return;await db("journal_notifications_admin",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({type_evenement,course_ref,canal,statut:r.statut||(r.ok?"envoye":"echec"),detail:r.detail.slice(0,500)||null})}).catch(()=>{});}
/* Sous chaque alerte : « ✅ Vu » arrête les rappels (fonction telegram-bot),
   « Ouvrir la course » mène au bon — et l'ouvrir les arrête aussi. */
function boutons(ref:string){return{inline_keyboard:[[{text:"✅ Vu — arrêter les rappels",callback_data:`vu:${ref}`}],[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]};}
async function parTelegram(t:string,m:string,ref=""):Promise<Resultat>{if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT)return{ok:false,detail:"telegram_non_configure",statut:"indisponible"};return envoyer(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:TELEGRAM_CHAT,text:t+"\n\n"+m,disable_web_page_preview:true,...(ref?{reply_markup:boutons(ref)}:{})})});}
/* Le secret du webhook est DÉRIVÉ du jeton du bot : même calcul dans
   telegram-bot. Aucun secret de plus à poser. */
async function secretWebhook(jeton:string):Promise<string>{const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(jeton+":webhook-ela"));return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function installerTelegram():Promise<string>{
  if(!TELEGRAM_TOKEN||!U)return "telegram non configuré";
  const r=await envoyer(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({url:`${U}/functions/v1/telegram-bot`,secret_token:await secretWebhook(TELEGRAM_TOKEN),allowed_updates:["callback_query","message"]})});
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
async function parPush(t:string,ref:string):Promise<Resultat>{
  if(!U||!S||!VAPID_PUBLIQUE||!VAPID_PRIVEE)return{ok:false,detail:"push_non_configure",statut:"indisponible"};
  const r=await db("abonnements_admin?select=id,abonnement&actif=eq.true");if(!r.ok)return{ok:false,detail:"lecture_abonnements_refusee",statut:"echec"};const lignes=await r.json();if(!Array.isArray(lignes)||!lignes.length)return{ok:false,detail:"aucun_abonne",statut:"aucun_abonne"};
  const charge=JSON.stringify({titre:t,corps:`${ref} — action requise`,ref,attente:await nbAttente(),url:`${ADMIN}?ref=${encodeURIComponent(ref)}`});let envoyes=0,echecs=0;
  for(const ligne of lignes){const ab=ligne.abonnement;if(!ab?.endpoint||!ab?.keys?.p256dh||!ab?.keys?.auth){echecs++;continue;}try{const paquet=await chiffrer(charge,ab.keys.p256dh,ab.keys.auth),origine=new URL(ab.endpoint).origin,jeton=await jetonVapid(origine,VAPID_SUJET,VAPID_PRIVEE,VAPID_PUBLIQUE),rep=await fetch(ab.endpoint,{method:"POST",headers:{Authorization:`vapid t=${jeton}, k=${VAPID_PUBLIQUE}`,"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:"14400"},body:paquet});if(rep.ok)envoyes++;else{echecs++;if(rep.status===404||rep.status===410)await db(`abonnements_admin?id=eq.${encodeURIComponent(ligne.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({actif:false,modifie_le:new Date().toISOString()})}).catch(()=>{});}}catch{echecs++;}}
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
  const bon=(l.bon??{}) as Record<string,any>;if(!bon.ref)bon.ref=l.ref;return bon;
}

/* LE RAPPEL ET LE RATTRAPAGE (30/09/2026, à sa demande : « recevoir toutes
   les courses en temps et en heure… », puis une cadence liée à l'urgence).
   Appelée toutes les 20 s par pg_cron avec {type:"RELANCE"}.
   - RATTRAPAGE : une course en attente depuis plus d'1 min sans AUCUNE
     alerte réussie est annoncée maintenant, par tous les canaux.
   - LES 10 PREMIÈRES MINUTES, ET DÉPART DANS 30 MIN OU MOINS : Telegram ET
     notification à CHAQUE tour (20 s), soit trois fois par minute
     (30/09/2026, à sa demande : « tout sonne plusieurs fois par minute
     lorsque je reçois des commandes »). C'était toutes les 3 min.
   - DEPART DANS 2 H OU MOINS : les deux canaux toutes les 10 min.
   - PLUS DE 2 H : l'annonce initiale suffit ; la relance commence à H-2.
   Les deux canaux s'arrêtent dès que la course n'est plus « attente », ou
   dès qu'elle est VUE : bouton « ✅ Vu » sous le message, ou course ouverte
   dans l'admin. La fenêtre de 6 h borne aussi tout incident ancien.
   Rien n'est cru de l'appel : tout est relu sur le serveur, et la cadence
   vient du journal. */
/* PAS_ALARME_MS vaut 15 s et non 20 : pg_cron ne tombe jamais pile à 20 s,
   et un tour arrivé à 19,9 s sauterait son rappel — une fois sur deux. */
const RATTRAPAGE_MS=60*1000,PAS_ALARME_MS=15*1000,ALARME_MS=10*60*1000,PAS_URGENT_MS=PAS_ALARME_MS,PAS_PROCHE_MS=10*60*1000,FENETRE_MS=6*3600*1000;
const plusRecent=(l:Array<Record<string,string>>,defaut:number)=>l.length?Math.max(...l.map(x=>Date.parse(x.cree_le))):defaut;
/* Date et heure du bon sont des heures civiles de Paris. Les convertir en
   pseudo-UTC, comme l'horloge de Paris courante, évite que le serveur UTC
   décale le seuil d'une ou deux heures lors des changements été/hiver. */
const HORLOGE_PARIS=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function heureCivileParis(ms:number):number{const p=Object.fromEntries(HORLOGE_PARIS.formatToParts(new Date(ms)).filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);}
function departCivil(bon:Record<string,any>):number|null{const c=(bon.course??{}) as Record<string,any>,d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(c.date??"")),h=/^(\d{1,2}):(\d{2})$/.exec(String(c.heure??""));if(!d||!h)return null;const valeurs=[...d.slice(1),...h.slice(1)].map(Number),v=Date.UTC(valeurs[0],valeurs[1]-1,valeurs[2],valeurs[3],valeurs[4]);return valeurs[1]>=1&&valeurs[1]<=12&&valeurs[2]>=1&&valeurs[2]<=31&&valeurs[3]<=23&&valeurs[4]<=59?v:null;}
/* Un départ passé depuis plus de 6 h n'est plus relancé : c'est un oubli à
   clore dans l'admin, pas une alarme à sonner la nuit. */
function cadenceRappel(bon:Record<string,any>,age=Infinity):number|null{if(age<=ALARME_MS)return PAS_ALARME_MS;const depart=departCivil(bon);if(depart===null)return null;const reste=depart-heureCivileParis(Date.now());if(reste<-FENETRE_MS)return null;return reste<=30*60*1000?PAS_URGENT_MS:reste<=2*3600*1000?PAS_PROCHE_MS:null;}
/* LA FENÊTRE SE COMPTE DEPUIS LE DÉPART, PAS DEPUIS LA CRÉATION (30/09/2026).
   Lue depuis la création, elle écartait toute demande faite plus de 6 h avant
   le départ — un hôtel qui réserve la veille, un vol du lendemain, c'est-à-dire
   le cas le plus courant : à H-20 min, toujours en attente, AUCUN rappel. On lit
   donc les demandes en attente des 7 derniers jours ; c'est l'heure du départ
   qui décide du rappel, et le rattrapage garde sa borne de 6 h depuis la
   création (une vieille demande jamais annoncée ne se réveille pas la nuit). */
const LECTURE_MS=7*24*3600*1000;
async function relancer():Promise<string>{
  if(!U||!S)return "non configuré";
  const depuis=new Date(Date.now()-LECTURE_MS).toISOString();
  const r=await db(`courses?select=ref,bon,cree_le&statut=eq.attente&cree_le=gte.${encodeURIComponent(depuis)}&order=cree_le.desc&limit=200`);
  if(!r.ok)return "lecture refusée";
  /* LE PASSAGE EST ÉCRIT (02/10/2026) : la sentinelle et le chien de garde
     GitHub savent ainsi que la relance tourne. Écrit APRÈS la lecture — il
     prouve que la chaîne pg_cron → fonction → base marche, pas seulement que
     la fonction a été appelée. Un échec d'écriture ne bloque rien. */
  await db("sante_systeme?on_conflict=cle",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({cle:"relance",maj:new Date().toISOString()})}).catch(()=>{});
  const lignes=(await r.json())||[];let rattrapes=0,rappelsTg=0,rappelsPush=0;
  for(const l of lignes){
    const ref=String(l.ref||"").slice(0,32);if(!/^[A-Z]{2,4}-[0-9A-Z-]{4,26}$/.test(ref))continue;
    const cree=Date.parse(String(l.cree_le||""));if(!Number.isFinite(cree))continue;
    /* Ni rattrapage possible (plus de 6 h), ni rappel dû (départ loin ou
       passé depuis longtemps) : on n'interroge même pas le journal. Sans ce
       tri, sept jours de demandes relues toutes les 20 s. */
    if(Date.now()-cree>FENETRE_MS&&cadenceRappel((l.bon??{}) as Record<string,any>)===null)continue;
    const j=await db(`journal_notifications_admin?select=type_evenement,canal,statut,cree_le&course_ref=eq.${encodeURIComponent(ref)}&order=cree_le.asc`);
    if(!j.ok)continue;
    const journalRef=((await j.json())||[]) as Array<Record<string,string>>;
    if(journalRef.some(x=>x.type_evenement==="vue"))continue;
    const reussies=journalRef.filter(x=>x.statut==="envoye");
    const bon=(l.bon??{}) as Record<string,any>;if(!bon.ref)bon.ref=ref;
    const age=Date.now()-cree;
    if(!reussies.length){
      const derniereTentative=plusRecent(journalRef.filter(x=>x.type_evenement==="nouvelle_reservation"),cree);
      if(age<RATTRAPAGE_MS||age>FENETRE_MS||Date.now()-derniereTentative<RATTRAPAGE_MS)continue;
      const t=titre(bon),m=corps(bon,ADMIN);rattrapes++;
      const [push,telegram]=await Promise.all([parPush(t,ref),parTelegram(t,m,ref)]);
      await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram)]);
      continue;
    }
    const cadence=cadenceRappel(bon,age);if(cadence===null)continue;
    const t=titreRappel(bon,Math.max(1,Math.round(age/60000)));
    /* Une tentative échouée compte pour la cadence : sinon une panne d'un
       fournisseur provoquerait un nouvel appel toutes les 20 secondes. */
    const tgDernier=plusRecent(journalRef.filter(x=>x.canal==="telegram"),cree);
    const pushDernier=plusRecent(journalRef.filter(x=>x.canal==="push"),cree);
    const doitTelegram=TELEGRAM_TOKEN&&TELEGRAM_CHAT&&Date.now()-tgDernier>=cadence;
    const doitPush=Date.now()-pushDernier>=cadence;
    if(doitTelegram&&doitPush){
      const [tg,push]=await Promise.all([
        parTelegram(t,`Réf. ${ref} — toujours en attente. Appuyez sur « Vu » pour arrêter les rappels.`,ref),
        parPush(t,ref),
      ]);
      await Promise.all([journal("rappel_reservation",ref,"telegram",tg),journal("rappel_reservation",ref,"push",push)]);
      rappelsTg++;rappelsPush++;
    }else if(doitTelegram){
      /* Court : sur un écran verrouillé seule la première ligne se lit, et
         le détail est déjà dans le premier message. */
      const tg=await parTelegram(t,`Réf. ${ref} — toujours en attente. Appuyez sur « Vu » pour arrêter les rappels.`,ref);
      await journal("rappel_reservation",ref,"telegram",tg);rappelsTg++;
    }else if(doitPush){
      const push=await parPush(t,ref);
      await journal("rappel_reservation",ref,"push",push);rappelsPush++;
    }
  }
  return `relance : ${lignes.length} en attente, ${rattrapes} rattrapée(s), ${rappelsTg} rappel(s) Telegram, ${rappelsPush} rappel(s) notification`;
}

Deno.serve(async(req)=>{
  let charge:Record<string,unknown>;try{charge=await req.json()}catch{return new Response("corps illisible",{status:400})}
  if(charge.type==="RELANCE")return new Response(await relancer(),{status:200});
  /* Poser le webhook du bouton « Vu ». Appelé une fois par la migration ;
     le rappeler ne fait que reposer la même adresse. */
  if(charge.type==="INSTALLER_TELEGRAM")return new Response(await installerTelegram(),{status:200});
  if(charge.type!=="INSERT"||charge.table!=="courses")return new Response("ignoré : "+String(charge.type),{status:200});
  const recu=(charge.record??{}) as Record<string,any>;
  const bon=await courseReelle(String(recu.ref||(recu.bon??{}).ref||"").trim().slice(0,32));
  if(!bon)return new Response("ignoré : course inconnue, ancienne ou déjà annoncée",{status:200});
  const ref=String(bon.ref).slice(0,32),t=titre(bon),m=corps(bon,ADMIN);

  /* Push ELA + Telegram partent en parallèle. L'un ne bloque jamais l'autre.
     L'e-mail reste un troisième filet facultatif. */
  const [push,telegram,email]=await Promise.all([parPush(t,ref),parTelegram(t,m,ref),parEmail(t,m)]);
  await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram),journal("nouvelle_reservation",ref,"email",email)]);
  const utiles=[push,telegram,email].filter(x=>x.statut!=="indisponible");
  const bilan=`push : ${push.ok?"ok":push.detail} | telegram : ${telegram.ok?"ok":telegram.detail} | email : ${email.ok?"ok":email.detail}`;
  if(!utiles.length)return new Response("aucun canal configuré",{status:500});
  return new Response(bilan,{status:utiles.some(x=>x.ok)?200:500});
});
