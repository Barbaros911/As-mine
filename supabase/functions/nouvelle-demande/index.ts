import { titre, corps } from "./message.js";
import { chiffrer, jetonVapid } from "./chiffrer.js";

const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const TELEGRAM_TOKEN=Deno.env.get("TELEGRAM_TOKEN")??"",TELEGRAM_CHAT=Deno.env.get("TELEGRAM_CHAT")??"";
const RESEND_CLE=Deno.env.get("RESEND_CLE")??"",EMAIL_EXPEDITEUR=Deno.env.get("EMAIL_EXPEDITEUR")??"",EMAIL_DESTINATAIRE=Deno.env.get("EMAIL_DESTINATAIRE")??"";
const VAPID_PUBLIQUE=Deno.env.get("VAPID_PUBLIQUE")??"",VAPID_PRIVEE=Deno.env.get("VAPID_PRIVEE")??"",VAPID_SUJET=Deno.env.get("VAPID_SUJET")??"mailto:contact@elatransfer.com";
/* L'ESPACE HISTORIQUE EST L'ADMIN RETENU (23/09/2026, choix de Barbaros :
   « on garde l'ancien »). Admin v2 reste en ligne mais n'est plus la porte. */
const ADMIN=Deno.env.get("ADRESSE_ADMIN")??"https://elatransfer.com/admin.html";

type Resultat={ok:boolean;detail:string;statut?:"envoye"|"echec"|"indisponible"|"aucun_abonne"};
async function envoyer(url:string,init:RequestInit,ms=8000):Promise<Resultat>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{...init,signal:ctrl.signal});return{ok:r.ok,detail:r.ok?"":`${r.status} ${await r.text()}`};}catch(e){return{ok:false,detail:String(e)}}finally{clearTimeout(timer)}}
async function db(path:string,init:RequestInit={}){const h=new Headers(init.headers);h.set("apikey",S);h.set("Authorization",`Bearer ${S}`);if(init.body)h.set("Content-Type","application/json");return fetch(`${U}/rest/v1/${path}`,{...init,headers:h});}
async function journal(type_evenement:string,course_ref:string,canal:string,r:Resultat){if(!U||!S)return;await db("journal_notifications_admin",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({type_evenement,course_ref,canal,statut:r.statut||(r.ok?"envoye":"echec"),detail:r.detail.slice(0,500)||null})}).catch(()=>{});}
async function parTelegram(t:string,m:string):Promise<Resultat>{if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT)return{ok:false,detail:"telegram_non_configure",statut:"indisponible"};return envoyer(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:TELEGRAM_CHAT,text:t+"\n\n"+m,disable_web_page_preview:true})});}
async function parEmail(t:string,m:string):Promise<Resultat>{if(!RESEND_CLE||!EMAIL_EXPEDITEUR||!EMAIL_DESTINATAIRE)return{ok:false,detail:"email_non_configure",statut:"indisponible"};return envoyer("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${RESEND_CLE}`,"Content-Type":"application/json"},body:JSON.stringify({from:EMAIL_EXPEDITEUR,to:[EMAIL_DESTINATAIRE],subject:t,text:m})});}
async function parPush(t:string,ref:string):Promise<Resultat>{
  if(!U||!S||!VAPID_PUBLIQUE||!VAPID_PRIVEE)return{ok:false,detail:"push_non_configure",statut:"indisponible"};
  const r=await db("abonnements_admin?select=id,abonnement&actif=eq.true");if(!r.ok)return{ok:false,detail:"lecture_abonnements_refusee",statut:"echec"};const lignes=await r.json();if(!Array.isArray(lignes)||!lignes.length)return{ok:false,detail:"aucun_abonne",statut:"aucun_abonne"};
  const charge=JSON.stringify({titre:t,corps:`${ref} — action requise`,ref,url:`${ADMIN}?ref=${encodeURIComponent(ref)}`});let envoyes=0,echecs=0;
  for(const ligne of lignes){const ab=ligne.abonnement;if(!ab?.endpoint||!ab?.keys?.p256dh||!ab?.keys?.auth){echecs++;continue;}try{const paquet=await chiffrer(charge,ab.keys.p256dh,ab.keys.auth),origine=new URL(ab.endpoint).origin,jeton=await jetonVapid(origine,VAPID_SUJET,VAPID_PRIVEE,VAPID_PUBLIQUE),rep=await fetch(ab.endpoint,{method:"POST",headers:{Authorization:`vapid t=${jeton}, k=${VAPID_PUBLIQUE}`,"Content-Encoding":"aes128gcm","Content-Type":"application/octet-stream",TTL:"14400"},body:paquet});if(rep.ok)envoyes++;else{echecs++;if(rep.status===404||rep.status===410)await db(`abonnements_admin?id=eq.${encodeURIComponent(ligne.id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({actif:false,modifie_le:new Date().toISOString()})}).catch(()=>{});}}catch{echecs++;}}
  return envoyes?{ok:true,detail:`${envoyes}/${lignes.length} push`,statut:"envoye"}:{ok:false,detail:`0/${lignes.length} push; ${echecs} échec(s)`,statut:"echec"};
}

Deno.serve(async(req)=>{
  let charge:Record<string,unknown>;try{charge=await req.json()}catch{return new Response("corps illisible",{status:400})}
  if(charge.type!=="INSERT"||charge.table!=="courses")return new Response("ignoré : "+String(charge.type),{status:200});
  const ligne=(charge.record??{}) as Record<string,any>,bon=(ligne.bon??{}) as Record<string,any>;if(!bon.ref&&ligne.ref)bon.ref=ligne.ref;const ref=String(bon.ref||ligne.ref||"").slice(0,32),t=titre(bon),m=corps(bon,ADMIN);

  /* Push ELA + Telegram partent en parallèle. L'un ne bloque jamais l'autre.
     L'e-mail reste un troisième filet facultatif. */
  const [push,telegram,email]=await Promise.all([parPush(t,ref),parTelegram(t,m),parEmail(t,m)]);
  await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram),journal("nouvelle_reservation",ref,"email",email)]);
  const utiles=[push,telegram,email].filter(x=>x.statut!=="indisponible");
  const bilan=`push : ${push.ok?"ok":push.detail} | telegram : ${telegram.ok?"ok":telegram.detail} | email : ${email.ok?"ok":email.detail}`;
  if(!utiles.length)return new Response("aucun canal configuré",{status:500});
  return new Response(bilan,{status:utiles.some(x=>x.ok)?200:500});
});
