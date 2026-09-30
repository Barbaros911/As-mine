/* =====================================================================
   TELEGRAM-BOT — le bouton « ✅ Vu » arrête les rappels
   ---------------------------------------------------------------------
   30/09/2026, à sa demande : « le rappel Telegram doit sonner, vibrer tant
   que je n'ai pas ouvert la demande reçue sur Telegram ».
   TELEGRAM NE DIT JAMAIS À UN BOT QU'UN MESSAGE A ÉTÉ LU. Il n'existe aucun
   accusé de lecture dans l'API des bots : « ouvert » ne peut donc être
   qu'un GESTE — le bouton « ✅ Vu » sous chaque alerte, qui arrive ici.
   Ouvrir la course dans l'admin arrête aussi les rappels (RPC
   ela_marquer_vue), pour le cas où il y va directement.

   QUI PEUT APPELER ICI : Telegram seul. Il envoie l'en-tête
   « X-Telegram-Bot-Api-Secret-Token » posé à l'installation du webhook
   (nouvelle-demande, {type:"INSTALLER_TELEGRAM"}). Ce secret est DÉRIVÉ du
   jeton du bot : aucun secret de plus à poser chez Supabase, et personne
   sans le jeton ne peut le fabriquer. On vérifie EN PLUS que l'appui vient
   de SA conversation (TELEGRAM_CHAT) : un inconnu qui écrirait au bot ne
   peut faire taire aucune alerte.
   Déployée SANS vérification de JWT : Telegram n'en envoie pas.
   ===================================================================== */
const U=Deno.env.get("SUPABASE_URL")??"",S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")??"";
const TOKEN=Deno.env.get("TELEGRAM_TOKEN")??"",CHAT=Deno.env.get("TELEGRAM_CHAT")??"";
const ADMIN=Deno.env.get("ADRESSE_ADMIN")??"https://elatransfer.com/ela-admin/";

async function secretWebhook(jeton:string):Promise<string>{
  const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(jeton+":webhook-ela"));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function tg(methode:string,corps:Record<string,unknown>){
  return fetch(`https://api.telegram.org/bot${TOKEN}/${methode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(corps)}).catch(()=>null);
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return new Response("méthode refusée",{status:405});
  if(!TOKEN||!CHAT||!U||!S)return new Response("non configuré",{status:500});
  if(req.headers.get("x-telegram-bot-api-secret-token")!==await secretWebhook(TOKEN))return new Response("refusé",{status:401});
  let maj:Record<string,any>;try{maj=await req.json()}catch{return new Response("corps illisible",{status:400})}
  const cb=maj?.callback_query;
  if(!cb)return new Response("ignoré",{status:200});
  if(String(cb.message?.chat?.id??"")!==String(CHAT)){
    await tg("answerCallbackQuery",{callback_query_id:cb.id,text:"Non autorisé."});
    return new Response("autre conversation",{status:200});
  }
  const m=/^vu:([A-Z]{2,4}-[0-9A-Z-]{4,26})$/.exec(String(cb.data||""));
  if(!m){await tg("answerCallbackQuery",{callback_query_id:cb.id});return new Response("ignoré",{status:200});}
  const ref=m[1];
  const r=await fetch(`${U}/rest/v1/journal_notifications_admin`,{method:"POST",headers:{apikey:S,Authorization:`Bearer ${S}`,"Content-Type":"application/json",Prefer:"return=minimal"},
    body:JSON.stringify({type_evenement:"vue",course_ref:ref,canal:"telegram",statut:"envoye",detail:"bouton Vu sur Telegram"})}).catch(()=>null);
  const fait=!!(r&&r.ok);
  await tg("answerCallbackQuery",{callback_query_id:cb.id,text:fait?`Rappels arrêtés pour ${ref}.`:"Échec — réessayez."});
  /* Le bouton « Vu » disparaît du message : il a été dit. « Ouvrir la
     course » reste, c'est le geste suivant. */
  if(fait&&cb.message?.message_id)await tg("editMessageReplyMarkup",{chat_id:CHAT,message_id:cb.message.message_id,
    reply_markup:{inline_keyboard:[[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]}});
  return new Response(fait?"vu":"échec",{status:fait?200:500});
});
