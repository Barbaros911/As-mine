/* =====================================================================
   TEST-PUSH.MJS — le chiffrement d'une notification, vérifié par un TIERS
   ---------------------------------------------------------------------
   ═══ POURQUOI CETTE SUITE EXISTE ═══
   Ce dépôt a déjà payé une vérification maison. L'encodeur QR passait TOUS
   ses propres contrôles — format relu, masque, Reed-Solomon divisible, dix
   syndromes nuls — et n'était lisible par AUCUN téléphone : le décodeur
   écrit par le même auteur reproduisait exactement la même erreur.

   Un chiffrement se trompe pareil, et en pire : un résultat faux ressemble
   toujours à des octets corrects. Relire son propre code ne prouve rien du
   tout.

   ON DÉCHIFFRE DONC AVEC « http_ece », écrit par quelqu'un d'autre — la
   bibliothèque qu'utilise « web-push », la référence du domaine. Si elle
   retrouve le texte de départ, alors un vrai navigateur le retrouvera
   aussi. C'est la seule preuve qui vaille.

   Ni navigateur, ni réseau, ni Supabase : tout se vérifie hors ligne.

   Lancer :  node test-push.mjs
   ===================================================================== */
import { chiffrer, jetonVapid, versB64u, depuisB64u } from
  "./supabase/functions/prevenir-client/chiffrer.js";
import { createRequire } from "node:module";
import { createECDH, createPublicKey, createVerify } from "node:crypto";

const ok = [], ko = [];
const check = (n, c, d = "") => (c ? ok : ko).push(n + (d ? " — " + d : ""));

/* http_ece vit dans le bac à sable, pas dans le dépôt : le dépôt n'a aucune
   dépendance, et c'est une force. On le charge s'il est là, et on REFUSE de
   passer au vert s'il ne l'est pas — un contrôle qu'on saute en silence est
   pire qu'un contrôle absent. */
let ece = null;
const BAC = "/tmp/claude-0/-home-user-As-mine/"
          + "4bad491f-f7fd-5fb8-ac80-285f0ac64a0c/scratchpad/node_modules/";
try {
  ece = createRequire(BAC + "x.js")("http_ece");
} catch (e) { /* absent : le contrôle le dira */ }

/* ---- Un abonnement de test : une vraie paire de clés P-256 ---- */
const client = await crypto.subtle.generateKey(
  { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
const clientPub = new Uint8Array(await crypto.subtle.exportKey("raw", client.publicKey));
const clientJwk = await crypto.subtle.exportKey("jwk", client.privateKey);
const auth = crypto.getRandomValues(new Uint8Array(16));

const TEXTE = JSON.stringify({
  titre: "Transfert confirmé — ELA-26-09-0031",
  corps: "Mehmet · Berline · 20/09/2026 18:30",
  ref: "ELA-26-09-0031",
  url: "https://elatransfer.com/?ok=abc"
});

const paquet = await chiffrer(TEXTE, versB64u(clientPub), versB64u(auth));

check("le paquet chiffré n'est pas vide", paquet.length > 100, paquet.length + " octets");

/* L'EN-TÊTE SE LIT À L'ŒIL, et il doit être exact : sel (16) + taille (4)
   + longueur de clé (1) + clé publique (65). Une seule de ces valeurs
   fausse et le navigateur jette le message sans rien dire. */
const vue = new DataView(paquet.buffer, paquet.byteOffset, paquet.byteLength);
check("l'en-tête annonce une taille d'enregistrement de 4096",
  vue.getUint32(16, false) === 4096, String(vue.getUint32(16, false)));
check("il annonce une clé publique de 65 octets, non compressée",
  paquet[20] === 65, String(paquet[20]));
check("et cette clé commence par 0x04, la marque du format non compressé",
  paquet[21] === 0x04, "0x" + paquet[21].toString(16));

/* ═══ LE CONTRÔLE QUI COMPTE : UN TIERS DÉCHIFFRE ═══ */
if (ece) {
  /* http_ece veut un vrai objet ECDH de Node, chargé avec la clé privée du
     CLIENT — celle que seul le navigateur possède. C'est exactement ce que
     fera un téléphone en recevant la notification. */
  const ecdhClient = createECDH("prime256v1");
  ecdhClient.setPrivateKey(Buffer.from(clientJwk.d, "base64url"));
  const clairRendu = ece.decrypt(Buffer.from(paquet), {
    version: "aes128gcm",
    privateKey: ecdhClient,
    authSecret: Buffer.from(auth)
  });
  /* http_ece RETIRE LUI-MÊME le marqueur de fin d'enregistrement (0x02) :
     il fait partie du protocole, pas du message. Comparer le texte ENTIER
     est donc la bonne mesure — et c'est aussi la preuve que le marqueur
     était correctement posé, puisque le déchiffreur a su le reconnaître et
     l'enlever. Une première version de ce contrôle coupait un caractère de
     trop et accusait à tort le chiffrement. */
  const rendu = clairRendu.toString("utf8");
  check("UNE BIBLIOTHÈQUE TIERCE DÉCHIFFRE ET RETROUVE LE TEXTE EXACT",
    rendu === TEXTE, rendu.slice(0, 80));

  /* UN DÉCHIFFREUR QUI ACCEPTE TOUT NE PROUVE RIEN. On abîme un octet du
     texte scellé : il doit refuser. Sans ce contrôle, le précédent pourrait
     passer au vert avec une bibliothèque complaisante. */
  const abime = Buffer.from(paquet);
  abime[abime.length - 5] ^= 0xff;
  let refuse = false;
  try {
    const e2 = createECDH("prime256v1");
    e2.setPrivateKey(Buffer.from(clientJwk.d, "base64url"));
    ece.decrypt(abime, { version: "aes128gcm", privateKey: e2,
                         authSecret: Buffer.from(auth) });
  } catch (err) { refuse = true; }
  check("et elle REFUSE un paquet abîmé — le sceau tient", refuse);
} else {
  check("http_ece absent : LE CHIFFREMENT N'A PAS PU ÊTRE ÉPROUVÉ", false,
    "npm install http_ece dans le bac à sable, puis relancer");
}

/* DEUX MESSAGES IDENTIQUES NE DOIVENT PAS DONNER LE MÊME PAQUET. La paire
   de clés et le sel sont tirés à chaque envoi ; les réutiliser reviendrait
   à chiffrer deux fois avec la même clé, ce qui casse AES-GCM. */
const paquet2 = await chiffrer(TEXTE, versB64u(clientPub), versB64u(auth));
check("deux envois du même texte donnent deux paquets différents",
  versB64u(paquet) !== versB64u(paquet2));

/* ---- LE JETON VAPID ----
   ═══ LA VRAIE CLÉ PRIVÉE N'ENTRE PAS DANS CE FICHIER ═══
   Elle a failli y être, écrite en clair « pour le test ». Ce dépôt est
   PUBLIC : c'était la publier. Et cette clé est la seule chose qui empêche
   un inconnu d'envoyer un « Transfert confirmé » aux clients d'Elatransfer.
   Un secret recopié dans un test est un secret perdu, même si le test ne
   sert qu'une fois.
   On fabrique donc une paire ICI MÊME, à chaque exécution. Ce qu'on éprouve
   est le CODE qui signe, pas la valeur du secret — et le code ne connaît
   pas la différence. */
const paireVapid = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const PUB = versB64u(new Uint8Array(
  await crypto.subtle.exportKey("raw", paireVapid.publicKey)));
const PRIV = (await crypto.subtle.exportKey("jwk", paireVapid.privateKey)).d;
const jeton = await jetonVapid("https://fcm.googleapis.com", "mailto:contact@elatransfer.com",
                               PRIV, PUB);
const [e64, c64, s64] = jeton.split(".");
const entete = JSON.parse(Buffer.from(e64, "base64url").toString());
const corps = JSON.parse(Buffer.from(c64, "base64url").toString());
check("le jeton est un JWT en trois morceaux", jeton.split(".").length === 3);
check("signé en ES256", entete.alg === "ES256" && entete.typ === "JWT",
  JSON.stringify(entete));
/* « aud » EST L'ORIGINE, PAS L'ADRESSE COMPLÈTE DE L'ABONNEMENT. Avec
   l'adresse entière le service répond 401, et la notification est perdue
   sans le moindre message. */
check("« aud » porte l'ORIGINE du service, pas l'adresse de l'abonnement",
  corps.aud === "https://fcm.googleapis.com", corps.aud);
check("il expire dans une heure, pas au-delà des 24 h permises",
  corps.exp > Math.floor(Date.now() / 1000) + 3500
  && corps.exp < Math.floor(Date.now() / 1000) + 3700, String(corps.exp));
check("il porte un « sub » joignable — un service de push peut vouloir écrire",
  /^mailto:|^https?:/.test(corps.sub), corps.sub);
/* La signature ES256 attendue est le format BRUT : r puis s, 64 octets.
   Une bibliothèque Node rendrait du DER, refusé par les services de push. */
check("la signature fait 64 octets, en format brut et non DER",
  Buffer.from(s64, "base64url").length === 64,
  String(Buffer.from(s64, "base64url").length));

/* ═══ LA SIGNATURE EST VÉRIFIÉE PAR NODE, pas par le code qui l'a faite ═══ */
const pubBrute = depuisB64u(PUB);
const cleVerif = createPublicKey({
  key: { kty: "EC", crv: "P-256",
         x: versB64u(pubBrute.slice(1, 33)), y: versB64u(pubBrute.slice(33, 65)) },
  format: "jwk"
});
const v = createVerify("SHA256");
v.update(e64 + "." + c64);
check("UN VÉRIFICATEUR INDÉPENDANT VALIDE LA SIGNATURE",
  v.verify({ key: cleVerif, dsaEncoding: "ieee-p1363" },
           Buffer.from(s64, "base64url")));

/* Une signature ne doit pas valider un corps modifié — sinon elle ne prouve
   rien du tout. */
const v2 = createVerify("SHA256");
v2.update(e64 + "." + c64 + "x");
check("et elle refuse un jeton retouché",
  !v2.verify({ key: cleVerif, dsaEncoding: "ieee-p1363" },
             Buffer.from(s64, "base64url")));

/* ---- LA CLÉ PUBLIQUE POSÉE DANS LA PAGE ---- */
const html = (await import("node:fs")).readFileSync("index.html", "utf8");
const dansPage = (html.match(/CLE_VAPID\s*=\s*"([^"]*)"/) || [])[1];
const brute = dansPage ? depuisB64u(dansPage) : new Uint8Array(0);
check("la page porte une clé publique de 65 octets, non compressée",
  brute.length === 65 && brute[0] === 0x04, brute.length + " octets");
/* UNE SUITE D'OCTETS DE LA BONNE LONGUEUR N'EST PAS UNE CLÉ. Un caractère
   perdu à la recopie donnerait un point qui n'est pas sur la courbe :
   « importKey » le refuse, et c'est exactement ce que fera le navigateur du
   client — sauf que lui le fera devant lui, sans rien dire. */
let surCourbe = false;
try {
  await crypto.subtle.importKey("raw", brute,
    { name: "ECDH", namedCurve: "P-256" }, false, []);
  surCourbe = true;
} catch (e) { /* le contrôle le dira */ }
check("et c'est un vrai point de la courbe P-256, pas des octets au hasard",
  surCourbe);

/* ═══ CE QUI NE S'ÉPROUVE PAS ICI, ET POURQUOI ═══
   Que cette clé publique soit celle de la clé PRIVÉE posée dans les secrets
   Supabase. Dépareillées, le navigateur accepte l'abonnement et le service
   de push refuse l'envoi : une panne qui ne se voit qu'au premier client.
   Le vérifier demanderait le secret, donc de le faire entrer dans le dépôt —
   ce qui coûterait bien plus cher que le contrôle ne rapporte.
   Il se lance donc à part, la clé en main, et sans jamais l'écrire nulle
   part :   VAPID_PRIVEE=… node test-push.mjs                                */
if (process.env.VAPID_PRIVEE) {
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(Buffer.from(process.env.VAPID_PRIVEE, "base64url"));
  check("LA CLÉ DE LA PAGE EST BIEN CELLE DU SECRET",
    versB64u(ecdh.getPublicKey()) === dansPage);
  /* Et pendant qu'on l'a sous la main : elle ne doit être dans AUCUN
     fichier suivi par git. */
  const suivis = (await import("node:child_process"))
    .execSync("git ls-files", { encoding: "utf8" }).trim().split("\n");
  const fs = await import("node:fs");
  const fautifs = suivis.filter(f => {
    try { return fs.readFileSync(f, "utf8").includes(process.env.VAPID_PRIVEE); }
    catch (e) { return false; }
  });
  check("et elle n'est dans aucun fichier du dépôt — il est public",
    fautifs.length === 0, fautifs.join(", "));
} else {
  check("la paire page/secret n'est PAS éprouvée ici — c'est voulu", true,
    "relancer avec VAPID_PRIVEE=… pour la vérifier, une fois");
}

/* ---- LE FICHIER À COLLER EST FABRIQUÉ, JAMAIS ÉCRIT À LA MAIN ----
   Deux recettes finissent toujours par diverger, et ici la divergence
   voudrait dire déployer un chiffrement que personne n'a éprouvé : le
   fichier collé dans Supabase ne serait plus celui que ce test vient de
   confronter à « http_ece ». */
const { assembler } = await import("./supabase/functions/prevenir-client/assembler.mjs");
const surDisque = (await import("node:fs"))
  .readFileSync("supabase/functions/prevenir-client/a-coller.ts", "utf8");
check("« a-coller.ts » est bien le fruit de l'assemblage — sinon, le relancer",
  assembler() === surDisque);
/* Ce que l'assemblage doit avoir fait, et qu'on ne verrait pas autrement :
   sans ces annotations la fonction ne se déploie pas, pour une raison qui
   n'a rien à voir avec ce qu'elle fait. */
check("les paramètres y sont annotés « any » — sinon TypeScript refuse le déploiement",
  /function versB64u\(\s*octets: any\s*\)/.test(surDisque));
check("et le paramètre « reste » est en « any[] », pas en « any »",
  /function coller\(\s*\.\.\.morceaux: any\[\]\s*\)/.test(surDisque));
check("plus aucun « export » : le fichier collé est d'un seul tenant",
  !/^export /m.test(surDisque));

console.log("\n=== RÉUSSIS (" + ok.length + ") ===");
ok.forEach(t => console.log("  ✔ " + t));
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); ko.forEach(t => console.log("  ✘ " + t)); }
process.exit(ko.length ? 1 : 0);
