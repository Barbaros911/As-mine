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

/* Une demande « dès que possible » le dit d'abord : sa date est l'instant où
   elle a été faite, pas un rendez-vous (4 octobre 2026). */
function quand(bon: any) {
  const c = bon.course ?? {};
  if (c.immediat) return "IMMÉDIAT";
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

/* LE RAPPEL DIT D'ABORD DEPUIS COMBIEN DE TEMPS ON ATTEND : c'est ce qui
   le distingue d'une nouvelle demande sur un écran verrouillé. */
function titreRappel(bon: any, minutes: any) {
  const c = bon.course ?? {};
  return "RAPPEL " + minutes + " min — "
    + court(c.departPublic ?? c.depart, 20)
    + " → " + court(c.arriveePublic ?? c.arrivee, 20)
    + ", " + quand(bon);
}

/* LE DERNIER MESSAGE, à l'heure du départ : il dit que c'est fini, pas
   « rappel ». Après lui, plus rien ne part — une course oubliée se clôt dans
   l'admin, elle ne sonne pas six heures. */
function titreFinal(bon: any) {
  const c = bon.course ?? {};
  return (c.immediat ? "DEMANDE IMMÉDIATE sans réponse depuis 30 min — " : "DÉPART PASSÉ, non traitée — ")
    + court(c.departPublic ?? c.depart, 20)
    + " → " + court(c.arriveePublic ?? c.arrivee, 20)
    + ", " + quand(bon);
}

/* Le tarif à confirmer dit POURQUOI : c'est ce qui dit quoi faire. */
function motifs(m: any) {
  const noms = { longue: "longue distance", groupe: "plusieurs véhicules", adresse: "adresse à vérifier" };
  const l = (Array.isArray(m) ? m : []).map((k) => noms[k]).filter(Boolean);
  return l.length ? " (" + l.join(", ") + ")" : "";
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
    "Quand : " + (c.immediat ? "dès que possible (demandé le " + (`${c.date ?? ""} ${c.heure ?? ""}`.trim() || "—") + ")" : quand(bon)),
    "",
    (c.vehicule || "—") + " · " + (c.passagers || "—"),
    "Paiement : " + (bon.paiementNom || "—"),
    "Prix : " + (c.tarifAConfirmer ? "À CONFIRMER" + motifs(c.motifsTarif) : euros(bon.prix && bon.prix.total)),
  ];
  if (c.adresseAVerifier) l.push("Adresse tapée à la main : à vérifier");
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
const ADMIN=Deno.env.get("ADRESSE_ADMIN")??"https://elatransfer.com/ela-admin/";

type Resultat={ok:boolean;detail:string;statut?:"envoye"|"echec"|"indisponible"|"aucun_abonne"};
async function envoyer(url:string,init:RequestInit,ms=8000):Promise<Resultat>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{...init,signal:ctrl.signal});return{ok:r.ok,detail:r.ok?"":`${r.status} ${await r.text()}`};}catch(e){return{ok:false,detail:String(e)}}finally{clearTimeout(timer)}}
async function db(path:string,init:RequestInit={}){const h=new Headers(init.headers);h.set("apikey",S);h.set("Authorization",`Bearer ${S}`);if(init.body)h.set("Content-Type","application/json");return fetch(`${U}/rest/v1/${path}`,{...init,headers:h});}
async function journal(type_evenement:string,course_ref:string,canal:string,r:Resultat){if(!U||!S)return;await db("journal_notifications_admin",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({type_evenement,course_ref,canal,statut:r.statut||(r.ok?"envoye":"echec"),detail:r.detail.slice(0,500)||null})}).catch(()=>{});}
/* Sous chaque alerte : « ✅ Vu » arrête les rappels (fonction telegram-bot),
   « Ouvrir la course » mène au bon — et l'ouvrir les arrête aussi. */
function boutons(ref:string){return{inline_keyboard:[[{text:"✅ Vu — arrêter les rappels",callback_data:`vu:${ref}`}],[{text:"Ouvrir la course",url:`${ADMIN}?ref=${encodeURIComponent(ref)}`}]]};}
async function parTelegram(t:string,m:string,ref=""):Promise<Resultat>{
  if(!TELEGRAM_TOKEN||!TELEGRAM_CHAT)return{ok:false,detail:"telegram_non_configure",statut:"indisponible"};
  /* ON GARDE L'IDENTIFIANT DU MESSAGE (2 octobre 2026) : un rappel REMPLACE le
     précédent — on efface l'ancien avant d'envoyer le nouveau — pour qu'une
     seule ligne de rappel reste dans la conversation, jamais une pile. Il est
     rangé dans le journal (« message_id=N »), le seul endroit relu ensuite. */
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,
      body:JSON.stringify({chat_id:TELEGRAM_CHAT,text:t+"\n\n"+m,disable_web_page_preview:true,...(ref?{reply_markup:boutons(ref)}:{})})});
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
    if(x.canal!=="telegram"||x.statut!=="envoye"||(x.type_evenement!=="rappel_reservation"&&x.type_evenement!=="rappel_final"))continue;
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
   - RATTRAPAGE (inchangé) : en attente depuis plus d'1 min sans AUCUNE
     alerte réussie → annoncée maintenant, par tous les canaux.
   - LA NOTIFICATION ELA EST L'ALARME : à chaque tour (20 s) les 10 premières
     minutes et à H-30 ou moins, toutes les 10 min entre H-2 et H-30, rien
     avant H-2. Elle REMPLACE la précédente sur le téléphone (même étiquette),
     elle ne s'empile pas.
   - TELEGRAM INFORME : un rappel à +3 min, un à +10 min, puis toutes les
     15 min pendant la première heure ; silence ensuite jusqu'à H-2 (toutes
     les 15 min), toutes les 5 min sous H-30. Chaque rappel EFFACE le
     précédent : une seule ligne de rappel visible, jamais une pile.
   - À L'HEURE DU DÉPART, UN DERNIER MESSAGE sur les deux canaux (« départ
     passé, non traitée »), puis plus rien. Une course oubliée se clôt dans
     l'admin, elle ne sonne pas six heures.
   - Tout s'arrête dès que la course n'est plus « attente », ou dès qu'elle
     est VUE (bouton « ✅ Vu », ou ouverte dans l'admin).
   - LES SAISIES DE L'EXPLOITANT NE SONT NI ANNONCÉES NI RELANCÉES.
   Rien n'est cru de l'appel : tout est relu sur le serveur, et la cadence
   vient du journal. */
const MIN_MS=60*1000,IMMEDIAT_MS=30*60*1000;
/* SOUPLESSE : pg_cron ne tombe jamais pile. Un rappel dû à 3 min vérifié à
   2 min 59 s partirait au tour suivant, 20 s plus tard — ou, pour la
   notification « à chaque tour », une fois sur deux. */
const SOUPLESSE_MS=5*1000;
const RATTRAPAGE_MS=60*1000,PAS_ALARME_MS=20*1000-SOUPLESSE_MS,ALARME_MS=10*MIN_MS,PAS_PROCHE_MS=10*MIN_MS,FENETRE_MS=6*3600*1000;
const plusRecent=(l:Array<Record<string,string>>,defaut:number)=>l.length?Math.max(...l.map(x=>Date.parse(x.cree_le))):defaut;
/* Date et heure du bon sont des heures civiles de Paris. Les convertir en
   pseudo-UTC, comme l'horloge de Paris courante, évite que le serveur UTC
   décale le seuil d'une ou deux heures lors des changements été/hiver. */
const HORLOGE_PARIS=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function heureCivileParis(ms:number):number{const p=Object.fromEntries(HORLOGE_PARIS.formatToParts(new Date(ms)).filter(x=>x.type!=="literal").map(x=>[x.type,Number(x.value)]));return Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);}
function departCivil(bon:Record<string,any>):number|null{const c=(bon.course??{}) as Record<string,any>,d=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(c.date??"")),h=/^(\d{1,2}):(\d{2})$/.exec(String(c.heure??""));if(!d||!h)return null;const valeurs=[...d.slice(1),...h.slice(1)].map(Number),v=Date.UTC(valeurs[0],valeurs[1]-1,valeurs[2],valeurs[3],valeurs[4]);return valeurs[1]>=1&&valeurs[1]<=12&&valeurs[2]>=1&&valeurs[2]<=31&&valeurs[3]<=23&&valeurs[4]<=59?v:null;}
/* Temps restant avant le départ, en ms (négatif = passé) ; null si le bon
   n'a pas de date lisible. */
function resteAvantDepart(bon:Record<string,any>):number|null{const depart=departCivil(bon);return depart===null?null:depart-heureCivileParis(Date.now());}
/* LA NOTIFICATION ELA — l'alarme. Pas de rappel une fois le départ passé :
   c'est le message final qui parle, une fois. */
function cadencePush(reste:number|null,age:number):number|null{
  if(reste!==null&&reste<=0)return null;
  if(age<=ALARME_MS)return PAS_ALARME_MS;
  if(reste===null)return null;
  if(reste<=30*MIN_MS)return PAS_ALARME_MS;
  if(reste<=2*3600*1000)return PAS_PROCHE_MS;
  return null;
}
/* TELEGRAM — l'information. « n » = rappels Telegram déjà tentés (réussis
   ou non : un échec compte, sinon une panne de Telegram ferait réessayer à
   chaque tour), « depuisDernier » = temps écoulé depuis le dernier envoi
   Telegram, annonce comprise. */
function telegramDu(age:number,reste:number|null,n:number,depuisDernier:number):boolean{
  if(reste!==null&&reste<=0)return false;
  if(reste!==null&&reste<=30*MIN_MS)return depuisDernier>=5*MIN_MS-SOUPLESSE_MS;
  if(n===0)return age>=3*MIN_MS-SOUPLESSE_MS;
  if(n===1)return age>=10*MIN_MS-SOUPLESSE_MS;
  if(age>60*MIN_MS&&(reste===null||reste>2*3600*1000))return false;
  return depuisDernier>=15*MIN_MS-SOUPLESSE_MS;
}
/* Faut-il encore regarder cette course ? Hors de toute fenêtre, on
   n'interroge même pas le journal : sept jours de demandes relues toutes
   les 20 s. */
function encoreUtile(age:number,reste:number|null):boolean{
  if(age<=FENETRE_MS)return true;
  if(reste===null)return false;
  return reste>-FENETRE_MS&&reste<=2*3600*1000;
}
/* On lit les demandes en attente des 7 derniers jours : c'est l'heure du
   départ qui décide du rappel (un hôtel réserve la veille) ; le rattrapage
   garde sa borne de 6 h depuis la création. */
const LECTURE_MS=7*24*3600*1000;
async function relancer():Promise<string>{
  if(!U||!S)return "non configuré";
  const depuis=new Date(Date.now()-LECTURE_MS).toISOString();
  const r=await db(`courses?select=ref,bon,cree_le&statut=eq.attente&cree_le=gte.${encodeURIComponent(depuis)}&order=cree_le.desc&limit=200`);
  if(!r.ok)return "lecture refusée";
  const lignes=(await r.json())||[];let rattrapes=0,rappelsTg=0,rappelsPush=0,finals=0;
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
    if(journalRef.some(x=>x.type_evenement==="vue"))continue;
    const reussies=journalRef.filter(x=>x.statut==="envoye");
    /* LES RAPPELS SE COMPTENT DEPUIS L'ANNONCE, PAS DEPUIS LA CRÉATION : une
       demande rattrapée 15 min après son dépôt aurait eu son « +3 min » au
       tour suivant. Trouvé par le test. */
    const annonce=reussies.length?Math.min(...reussies.map(x=>Date.parse(x.cree_le)).filter(Number.isFinite)):cree;
    const ageAnnonce=Date.now()-(Number.isFinite(annonce)?annonce:cree);
    if(!reussies.length){
      const derniereTentative=plusRecent(journalRef.filter(x=>x.type_evenement==="nouvelle_reservation"),cree);
      if(age<RATTRAPAGE_MS||age>FENETRE_MS||Date.now()-derniereTentative<RATTRAPAGE_MS)continue;
      const t=titre(bon),m=corps(bon,ADMIN);rattrapes++;
      const [push,telegram]=await Promise.all([parPush(t,ref),parTelegram(t,m,ref)]);
      await Promise.all([journal("nouvelle_reservation",ref,"push",push),journal("nouvelle_reservation",ref,"telegram",telegram)]);
      continue;
    }
    /* LE DÉPART EST PASSÉ : un dernier message, une seule fois, puis rien. */
    if(reste!==null&&reste<=0){
      if(journalRef.some(x=>x.type_evenement==="rappel_final"))continue;
      const t=titreFinal(bon);finals++;
      await effacerTelegram(dernierRappelTelegram(journalRef));
      const [tg,push]=await Promise.all([
        parTelegram(t,bon.course?.immediat===true?`Réf. ${ref} — demande immédiate toujours en attente après 30 min. Rappelez le client ou refusez-la dans l'admin. Plus aucun rappel ne partira.`:`Réf. ${ref} — l'heure du départ est passée et la demande est toujours en attente. À clore dans l'admin. Plus aucun rappel ne partira.`,ref),
        parPush(t,ref),
      ]);
      await Promise.all([journal("rappel_final",ref,"telegram",tg),journal("rappel_final",ref,"push",push)]);
      continue;
    }
    const minutes=Math.max(1,Math.round(age/60000));
    const t=titreRappel(bon,minutes);
    const tgTous=journalRef.filter(x=>x.canal==="telegram");
    const tgRappels=tgTous.filter(x=>x.type_evenement==="rappel_reservation");
    const doitTelegram=!!(TELEGRAM_TOKEN&&TELEGRAM_CHAT)&&telegramDu(ageAnnonce,reste,tgRappels.length,Date.now()-plusRecent(tgTous,cree));
    const cadence=cadencePush(reste,ageAnnonce);
    const pushDernier=plusRecent(journalRef.filter(x=>x.canal==="push"),cree);
    const doitPush=cadence!==null&&Date.now()-pushDernier>=cadence;
    if(doitTelegram){
      /* Le rappel précédent s'efface AVANT d'envoyer le suivant. */
      await effacerTelegram(dernierRappelTelegram(journalRef));
      const tg=await parTelegram(t,`Réf. ${ref} — toujours en attente. Appuyez sur « Vu » pour arrêter les rappels.`,ref);
      await journal("rappel_reservation",ref,"telegram",tg);rappelsTg++;
    }
    if(doitPush){
      const push=await parPush(t,ref);
      await journal("rappel_reservation",ref,"push",push);rappelsPush++;
    }
  }
  return `relance : ${lignes.length} en attente, ${rattrapes} rattrapée(s), ${rappelsTg} rappel(s) Telegram, ${rappelsPush} rappel(s) notification, ${finals} message(s) final(aux)`;
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
