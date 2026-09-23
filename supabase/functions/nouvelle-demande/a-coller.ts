/* =====================================================================
   NOUVELLE-DEMANDE — LE FICHIER À COLLER DANS SUPABASE
   ---------------------------------------------------------------------
   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction
   se fait dans « index.ts » ou l'un des fichiers qu'il importe, puis
   on relance
   « node supabase/functions/nouvelle-demande/assembler.mjs ».
   Un test compare les deux — une retouche faite ici serait perdue au
   prochain assemblage, et pire, elle tournerait un moment sans que
   personne ne sache d'où elle vient.
   ===================================================================== */
/* =====================================================================
   MESSAGE.JS — ce que Barbaros lit sur son téléphone
   ---------------------------------------------------------------------
   POURQUOI CE FICHIER EST À PART, ET EN JAVASCRIPT ORDINAIRE. Le reste de
   la fonction — les jetons, les appels à Telegram et à Resend — ne peut
   s'éprouver qu'en la déployant. Le TEXTE, lui, est ce qui décide s'il se
   lève ou non à 5 h du matin, et il n'a besoin d'aucun réseau pour être
   vérifié. Écrit sans types et sans rien de propre à Deno, il se relit
   depuis Node : « test-notification.mjs » le fait passer par onze cas.
   Deno l'importe tel quel.

   CE QUE LE MESSAGE NE PORTE PAS : le nom et le téléphone du client, ni
   le numéro de chambre. Ils ne servent pas à DÉCIDER — il regarde le
   trajet, l'heure et le prix, puis ouvre son tableau de bord où tout est
   déjà. Les promener chez un tiers pour rien, c'est exactement ce que la
   minimisation interdit (RGPD 5.1.c) ; c'est aussi la règle déjà tenue
   par le lien de confirmation « ?ok= » du site.
   ===================================================================== */

function euros(n: any) {
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return "—";
  return v.toFixed(2).replace(".", ",") + " €";
}

/* Une adresse entière ne tient pas sur une ligne d'écran verrouillé. On
   coupe sur un mot, jamais au milieu — et seulement si la coupe ne mange
   pas plus de 40 % du texte, sinon on préfère trancher net que rendre
   « Roissy… » là où « Roissy-Charles-de-Gaulle T2E » était attendu. */
function court(texte: any, max: any = 42) {
  const t = String(texte ?? "").trim() || "—";
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe) + "…";
}

function quand(bon: any) {
  const c = bon.course ?? {};
  const brut = bon.dateMsg ?? `${c.date ?? ""} ${c.heure ?? ""}`;
  return String(brut).trim() || "—";
}

/* LE TITRE EST CE QU'IL LIT EN PREMIER, ET SOUVENT LE SEUL : sur un écran
   verrouillé, c'est la ligne qui décide s'il se lève. Elle porte donc le
   trajet et l'heure, pas « Nouvelle notification ». */
function titre(bon: any) {
  const c = bon.course ?? {};
  return "Nouvelle demande — "
    + court(c.departPublic ?? c.depart, 24)
    + " → " + court(c.arriveePublic ?? c.arrivee, 24)
    + ", " + quand(bon);
}

function corps(bon: any, adresseAdmin: any) {
  const c = bon.course ?? {};
  const l = [
    "Réf. " + (bon.ref || "—"),
    "",
    /* Le départ SANS le numéro de chambre : « departPublic » existe pour
       ça dans le bon. La chambre ne regarde que le chauffeur retenu. */
    "Départ : " + (c.departPublic || c.depart || "—"),
    "Arrivée : " + (c.arriveePublic || c.arrivee || "—"),
    "Quand : " + quand(bon),
    "",
    (c.vehicule || "—") + " · " + (c.passagers || "—"),
    "Paiement : " + (bon.paiementNom || "—"),
    "Prix : " + euros(bon.prix && bon.prix.total),
  ];
  if (c.vol) l.push("Vol : " + c.vol);
  /* D'où vient ce client : c'est ce qui dit quelle affiche d'hôtel
     travaille. Rien du tout pour une venue directe — un tiret se lirait
     « information perdue » plutôt que « venu directement ». */
  if (bon.provenance) l.push("Vient de : " + bon.provenance);
  /* Une distance estimée veut dire que les trois calculateurs d'itinéraire
     étaient à terre : le prix annoncé au client repose sur un vol
     d'oiseau. Il est ferme quand même — il faut donc qu'il le SACHE avant
     de confier la course, pas en la facturant. */
  if (c.estimee) l.push("(distance estimée — prix à vérifier)");
  l.push("", "Le client attend une réponse.", adresseAdmin);
  return l.join("\n");
}
function versB64u(octets: any){let s="";const t=new Uint8Array(octets);for(let i=0;i<t.length;i++)s+=String.fromCharCode(t[i]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function depuisB64u(texte: any){let p=String(texte).replace(/-/g,"+").replace(/_/g,"/");while(p.length%4)p+="=";const brut=atob(p),t=new Uint8Array(brut.length);for(let i=0;i<brut.length;i++)t[i]=brut.charCodeAt(i);return t;}
function coller(...m: any[]){let n=0;for(const x of m)n+=x.length;const o=new Uint8Array(n);let d=0;for(const x of m){o.set(x,d);d+=x.length;}return o;}
function OCTETS(t: any){return new TextEncoder().encode(t);}
async function hkdf(sel: any, secret: any, info: any, longueur: any){const cle=await crypto.subtle.importKey("raw",secret,"HKDF",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:sel,info},cle,longueur*8);return new Uint8Array(bits);}
async function jetonVapid(origine: any, sujet: any, privee: any, publique: any){const entete=versB64u(OCTETS(JSON.stringify({typ:"JWT",alg:"ES256"}))),corps=versB64u(OCTETS(JSON.stringify({aud:origine,exp:Math.floor(Date.now()/1000)+3600,sub:sujet}))),aSigner=OCTETS(entete+"."+corps),pub=depuisB64u(publique);const jwk={kty:"EC",crv:"P-256",x:versB64u(pub.slice(1,33)),y:versB64u(pub.slice(33,65)),d:privee.replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"") ,ext:true};const cle=await crypto.subtle.importKey("jwk",jwk,{name:"ECDSA",namedCurve:"P-256"},false,["sign"]),sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},cle,aSigner);return entete+"."+corps+"."+versB64u(new Uint8Array(sig));}
async function chiffrer(texte: any, p256dhB64: any, authB64: any){const clientPub=depuisB64u(p256dhB64),auth=depuisB64u(authB64),sel=crypto.getRandomValues(new Uint8Array(16)),paire=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},true,["deriveBits"]),serveurPub=new Uint8Array(await crypto.subtle.exportKey("raw",paire.publicKey)),cleClient=await crypto.subtle.importKey("raw",clientPub,{name:"ECDH",namedCurve:"P-256"},false,[]),partage=new Uint8Array(await crypto.subtle.deriveBits({name:"ECDH",public:cleClient},paire.privateKey,256)),prk=await hkdf(auth,partage,coller(OCTETS("WebPush: info\0"),clientPub,serveurPub),32),cek=await hkdf(sel,prk,OCTETS("Content-Encoding: aes128gcm\0"),16),nonce=await hkdf(sel,prk,OCTETS("Content-Encoding: nonce\0"),12),cleAes=await crypto.subtle.importKey("raw",cek,"AES-GCM",false,["encrypt"]),clair=coller(OCTETS(texte),new Uint8Array([2])),scelle=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:nonce},cleAes,clair)),taille=new Uint8Array(4);new DataView(taille.buffer).setUint32(0,4096,false);return coller(sel,taille,new Uint8Array([serveurPub.length]),serveurPub,scelle);}
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
