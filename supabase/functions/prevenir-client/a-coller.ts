/* =====================================================================
   PREVENIR-CLIENT — LE FICHIER À COLLER DANS SUPABASE
   ---------------------------------------------------------------------
   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction
   se fait dans « index.ts » ou « chiffrer.js », puis on relance
   « node supabase/functions/prevenir-client/assembler.mjs ».
   Un test compare les deux — une retouche faite ici serait perdue au
   prochain assemblage, et pire, elle tournerait un moment sans que
   personne ne sache d'où elle vient.
   ===================================================================== */
/* =====================================================================
   PREVENIR-CLIENT — la notification qui part quand Barbaros confirme
   ---------------------------------------------------------------------
   ELLE EST APPELÉE PAR L'ESPACE EXPLOITANT, pas par un webhook. C'est un
   geste : Barbaros appuie sur « Confirmer la course », et le client abonné
   reçoit une notification sur son téléphone. Un webhook sur la table se
   déclencherait à chaque changement de statut — course réalisée, chauffeur
   corrigé — et enverrait au client des notifications qui ne veulent rien
   dire.

   ELLE NE PEUT PAS FAIRE ÉCHOUER UNE CONFIRMATION. La page l'appelle en
   détaché et ignore la réponse : fonction absente, client non abonné,
   réseau coupé, la course est confirmée quand même. On perd le bip, jamais
   la course. Ne jamais inverser cette répartition.

   SEUL L'EXPLOITANT CONNECTÉ PEUT L'APPELER. Supabase vérifie le jeton
   avant même d'entrer ici (ne pas déployer avec « --no-verify-jwt ») ; sans
   ça, n'importe qui pourrait envoyer une notification à n'importe lequel
   des clients.

   ELLE NE LIT PAS LA COURSE. Le titre, le texte et le lien lui sont donnés
   par la page, qui les compose déjà pour le message WhatsApp. La fonction
   ne connaît donc rien du format d'un bon : le jour où le bon change, elle
   n'a pas à bouger.

   ═══ CE QUE LA NOTIFICATION PORTE, ET RIEN D'AUTRE ═══
   La référence, le prénom du chauffeur, le véhicule, l'heure — exactement
   ce que porte déjà le lien « ?ok= ». Jamais le nom du client, jamais son
   numéro, jamais les adresses (RGPD 5.1.c). Le contenu est chiffré de bout
   en bout, mais la règle ne dépend pas du chiffrement : elle dépend de ce
   qui est nécessaire.
   ===================================================================== */
/* =====================================================================
   CHIFFRER.JS — la partie délicate d'une notification push
   ---------------------------------------------------------------------
   UNE NOTIFICATION PUSH EST CHIFFRÉE DE BOUT EN BOUT. Le service qui la
   transporte — Google pour Chrome et Android, Mozilla pour Firefox, Apple
   pour Safari — ne peut pas lire ce qu'elle contient, et c'est voulu : le
   texte passe par un tiers, le chiffrement fait qu'il n'y voit rien. Deux
   mécanismes se superposent, et ils ne servent pas à la même chose :

   1. VAPID (RFC 8292) — un jeton signé qui dit au service de push « c'est
      bien Elatransfer qui envoie ». Il prouve l'expéditeur ; il ne chiffre
      rien.
   2. aes128gcm (RFC 8291) — le chiffrement du contenu, avec une clé que
      seul le navigateur du client possède. C'est lui qui rend le texte
      illisible pour le transporteur.

   CE FICHIER EST EN JAVASCRIPT ORDINAIRE, ET C'EST TOUT L'INTÉRÊT. Il
   n'utilise que « Web Crypto », présent à l'identique dans Deno et dans
   Node : un test peut donc le faire tourner SANS déployer, et surtout le
   confronter à un déchiffreur indépendant.

   ═══ LA LEÇON DU CODE QR, APPLIQUÉE ═══
   Ce dépôt a déjà payé cher une vérification maison : un encodeur QR qui
   passait tous ses propres contrôles et qu'AUCUN téléphone ne savait lire,
   parce que le décodeur écrit par le même auteur reproduisait la même
   erreur. Un chiffrement se trompe exactement pareil — et en pire, parce
   qu'un résultat faux ressemble toujours à des octets aléatoires corrects.
   « test-push.mjs » DÉCHIFFRE donc la sortie avec « http_ece », une
   bibliothèque écrite par quelqu'un d'autre, et vérifie qu'on retrouve le
   texte de départ. C'est la seule preuve qui vaille.
   ===================================================================== */

/* base64url : l'alphabet du web. Le « + », le « / » et le « = » du base64
   ordinaire se font réécrire en route par les intermédiaires. */
function versB64u(octets: any) {
  let s = "";
  const t = new Uint8Array(octets);
  for (let i = 0; i < t.length; i++) s += String.fromCharCode(t[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function depuisB64u(texte: any) {
  let p = String(texte).replace(/-/g, "+").replace(/_/g, "/");
  while (p.length % 4) p += "=";
  const brut = atob(p);
  const t = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) t[i] = brut.charCodeAt(i);
  return t;
}
function coller(...morceaux: any[]) {
  let n = 0;
  for (const m of morceaux) n += m.length;
  const out = new Uint8Array(n);
  let d = 0;
  for (const m of morceaux) { out.set(m, d); d += m.length; }
  return out;
}
/* Déclarée en « function » et non en flèche : l'assembleur n'annote que les
   fonctions déclarées, et un paramètre de flèche resté nu deviendrait une
   erreur « implicitly has an any type » qui empêcherait le déploiement. */
function OCTETS(t: any) { return new TextEncoder().encode(t); }

/* HKDF (RFC 5869) — la fabrique de clés du protocole. À partir d'un secret
   partagé et d'une étiquette, elle produit une clé de la longueur voulue.
   L'étiquette compte autant que le secret : deux clés tirées du même secret
   avec deux étiquettes différentes n'ont aucun rapport entre elles, et
   c'est ce qui permet d'en tirer trois sans qu'elles se compromettent. */
async function hkdf(sel: any, secret: any, info: any, longueur: any) {
  const cle = await crypto.subtle.importKey("raw", secret, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: sel, info: info }, cle, longueur * 8);
  return new Uint8Array(bits);
}

/* ---------------------------------------------------------------------
   LE JETON VAPID
   Un JWT signé en ES256. Trois pièges, tous silencieux :
   — « aud » est l'ORIGINE du service de push, pas l'adresse complète de
     l'abonnement. Avec l'adresse entière, le service répond 401 et la
     notification est perdue sans un mot.
   — la signature ES256 attendue est le format « brut » (r puis s, 64
     octets). Web Crypto le rend déjà ainsi ; une bibliothèque Node rendrait
     du DER, qui serait refusé.
   — « exp » ne doit pas dépasser 24 h. On met une heure : largement assez
     pour un envoi, et ça limite la portée d'un jeton qui traînerait.
   --------------------------------------------------------------------- */
async function jetonVapid(origine: any, sujet: any, clePriveeB64: any, clePubliqueB64: any) {
  const entete = versB64u(OCTETS(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const corps = versB64u(OCTETS(JSON.stringify({
    aud: origine,
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: sujet
  })));
  const aSigner = OCTETS(entete + "." + corps);

  /* La clé privée VAPID est 32 octets bruts ; Web Crypto veut une JWK. On la
     recompose avec la moitié publique, qui donne x et y. */
  const pub = depuisB64u(clePubliqueB64);
  const jwk = {
    kty: "EC", crv: "P-256",
    x: versB64u(pub.slice(1, 33)),
    y: versB64u(pub.slice(33, 65)),
    d: clePriveeB64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    ext: true
  };
  const cle = await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, cle, aSigner);
  return entete + "." + corps + "." + versB64u(new Uint8Array(sig));
}

/* ---------------------------------------------------------------------
   LE CHIFFREMENT DU CONTENU (aes128gcm, RFC 8291)
   On fabrique une paire de clés jetable, on la marie à la clé publique du
   navigateur (ECDH), et on tire de ce mariage la clé qui chiffre le texte.
   Le navigateur refera le même calcul avec SA clé privée : lui seul peut.

   TROIS PIÈGES, ET AUCUN NE SE VOIT À L'ŒIL :
   — l'ordre dans « key_info » est client PUIS serveur. Inversé, le
     déchiffrement échoue chez le client, jamais chez nous.
   — le texte doit se terminer par un octet 0x02 (le marqueur de dernier
     bloc) AVANT d'être chiffré. Sans lui, certains navigateurs acceptent,
     d'autres rejettent : une notification qui marche sur Android et pas sur
     Firefox, sans message nulle part.
   — l'en-tête porte la clé publique jetable EN CLAIR, en 65 octets non
     compressés. C'est ce qui permet au navigateur de refaire le calcul.
   --------------------------------------------------------------------- */
async function chiffrer(texte: any, p256dhB64: any, authB64: any) {
  const clientPub = depuisB64u(p256dhB64);
  const auth = depuisB64u(authB64);
  /* SEL ET PAIRE SONT TIRÉS ICI, JAMAIS FOURNIS DU DEHORS. Une première
     version acceptait de les recevoir « pour les tests » : c'était deux
     paramètres de trop, une porte pour réutiliser un sel par accident — ce
     qui casse AES-GCM — et surtout une signature à cinq arguments que
     TypeScript refusait d'appeler avec trois. La vérification passe par le
     DÉCHIFFREMENT, pas par l'injection : on n'a pas besoin de rendre le
     hasard prévisible pour prouver qu'on chiffre juste. */
  const sel = crypto.getRandomValues(new Uint8Array(16));
  const paire = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serveurPub = new Uint8Array(
    await crypto.subtle.exportKey("raw", paire.publicKey));

  const cleClient = await crypto.subtle.importKey(
    "raw", clientPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const partage = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: cleClient }, paire.privateKey, 256));

  /* Premier tirage : le secret partagé est « salé » avec le secret
     d'authentification du navigateur, que lui seul connaît. */
  const prk = await hkdf(auth, partage,
    coller(OCTETS("WebPush: info\0"), clientPub, serveurPub), 32);

  const cek = await hkdf(sel, prk, OCTETS("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sel, prk, OCTETS("Content-Encoding: nonce\0"), 12);

  const cleAes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const clair = coller(OCTETS(texte), new Uint8Array([2]));
  const scelle = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce }, cleAes, clair));

  /* L'en-tête : sel (16) + taille d'enregistrement (4) + longueur de la clé
     (1) + la clé publique jetable (65). */
  const taille = new Uint8Array(4);
  new DataView(taille.buffer).setUint32(0, 4096, false);
  return coller(sel, taille, new Uint8Array([serveurPub.length]), serveurPub, scelle);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIQUE = Deno.env.get("VAPID_PUBLIQUE") ?? "";
const VAPID_PRIVEE = Deno.env.get("VAPID_PRIVEE") ?? "";
const VAPID_SUJET = Deno.env.get("VAPID_SUJET") ?? "mailto:contact@elatransfer.com";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("méthode refusée", { status: 405 });
  }
  /* RIEN DE CONFIGURÉ REND UNE ERREUR, PAS UN SUCCÈS MUET. Un « 200 OK »
     ferait croire pendant des semaines que les notifications partent,
     jusqu'au premier client qui n'a rien reçu. Même règle que l'alerte. */
  if (!VAPID_PUBLIQUE || !VAPID_PRIVEE) {
    return new Response("VAPID_PUBLIQUE et VAPID_PRIVEE ne sont pas posés", { status: 500 });
  }
  if (!SERVICE_ROLE) {
    return new Response("SUPABASE_SERVICE_ROLE_KEY n'est pas posé", { status: 500 });
  }

  let corps: any = {};
  try { corps = await req.json(); } catch (_e) { corps = {}; }
  const ref = String(corps.ref ?? "").trim();
  if (!ref) return new Response("référence manquante", { status: 400 });

  /* Les abonnements de CETTE course. Un client peut s'être abonné depuis
     deux téléphones ; on envoie à tous, et on n'en fait échouer aucun à
     cause d'un autre. */
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/abonnements?select=abonnement&ref=eq.${encodeURIComponent(ref)}`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
  if (!r.ok) return new Response("lecture des abonnements refusée", { status: 502 });
  const lignes = await r.json();
  if (!Array.isArray(lignes) || lignes.length === 0) {
    /* PAS D'ABONNÉ N'EST PAS UNE ERREUR : la plupart des clients ne
       s'abonneront jamais. On le dit sans crier. */
    return new Response(JSON.stringify({ envoyes: 0, abonnes: 0 }),
      { headers: { "Content-Type": "application/json" } });
  }

  const charge = JSON.stringify({
    titre: String(corps.titre ?? "Elatransfer"),
    corps: String(corps.corps ?? ""),
    ref: ref,
    url: String(corps.url ?? "")
  });

  let envoyes = 0;
  const perimes: string[] = [];
  for (const ligne of lignes) {
    const ab = ligne.abonnement;
    if (!ab || !ab.endpoint || !ab.keys) continue;
    try {
      const paquet = await chiffrer(charge, ab.keys.p256dh, ab.keys.auth);
      const origine = new URL(ab.endpoint).origin;
      const jeton = await jetonVapid(origine, VAPID_SUJET, VAPID_PRIVEE, VAPID_PUBLIQUE);
      const rep = await fetch(ab.endpoint, {
        method: "POST",
        headers: {
          Authorization: `vapid t=${jeton}, k=${VAPID_PUBLIQUE}`,
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          /* Quatre heures : au-delà, la confirmation d'un transfert n'a plus
             d'intérêt, et une notification qui arrive après la course est
             pire que pas de notification. */
          TTL: "14400"
        },
        body: paquet
      });
      if (rep.ok) envoyes++;
      /* 404 et 410 veulent dire que le navigateur a jeté l'abonnement —
         application désinstallée, données du site effacées. On le retire :
         sans ça la table grossit d'adresses mortes qu'on réessaie à chaque
         confirmation. */
      else if (rep.status === 404 || rep.status === 410) perimes.push(ab.endpoint);
    } catch (_e) { /* un abonnement cassé n'empêche pas les autres */ }
  }

  for (const mort of perimes) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/abonnements?abonnement->>endpoint=eq.${encodeURIComponent(mort)}`,
      { method: "DELETE",
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } })
      .catch(() => {});
  }

  return new Response(JSON.stringify({ envoyes, abonnes: lignes.length, retires: perimes.length }),
    { headers: { "Content-Type": "application/json" } });
});
