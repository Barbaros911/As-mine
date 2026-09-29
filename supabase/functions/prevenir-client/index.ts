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

   SEUL L'EXPLOITANT CONNECTÉ PEUT L'APPELER — ET C'EST VÉRIFIÉ ICI.
   Le jeton vérifié par Supabase à l'entrée ne suffisait PAS (audit du
   28/09/2026) : la clé publique du site, lisible dans la page, passe cette
   porte-là. N'importe qui pouvait donc envoyer à un client abonné une
   fausse « Transfert confirmé » avec un titre, un texte et un LIEN de son
   choix — de l'hameçonnage signé Elatransfer, sur des références qui se
   devinent en comptant. On demande désormais au serveur si l'appelant est
   un exploitant (est_exploitant(), comme capturer-paiement), et le lien
   n'est accepté que s'il vise le site.

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
import { chiffrer, jetonVapid } from "./chiffrer.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIQUE = Deno.env.get("VAPID_PUBLIQUE") ?? "";
const VAPID_PRIVEE = Deno.env.get("VAPID_PRIVEE") ?? "";
const VAPID_SUJET = Deno.env.get("VAPID_SUJET") ?? "mailto:contact@elatransfer.com";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

/* Les seules adresses vers lesquelles une notification peut emmener. */
const ORIGINES = new Set(["https://elatransfer.com", "https://www.elatransfer.com",
  "https://barbaros911.github.io"]);
function lienSur(brut: unknown): string {
  try {
    const u = new URL(String(brut ?? ""));
    return ORIGINES.has(u.origin) ? u.href : "";
  } catch (_e) { return ""; }
}

/* Authentifié ne veut pas dire autorisé : on demande au serveur, avec le
   jeton de l'appelant, s'il figure parmi les exploitants actifs. */
async function exploitant(req: Request): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  const cle = ANON || (req.headers.get("apikey") ?? "");
  if (!auth.startsWith("Bearer ") || !cle || !SUPABASE_URL) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/est_exploitant`, {
      method: "POST",
      headers: { apikey: cle, Authorization: auth, "Content-Type": "application/json" },
      body: "{}"
    });
    return r.ok && (await r.json()) === true;
  } catch (_e) { return false; }
}

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

  if (!(await exploitant(req))) {
    return new Response("accès refusé", { status: 403 });
  }

  let corps: any = {};
  try { corps = await req.json(); } catch (_e) { corps = {}; }
  const ref = String(corps.ref ?? "").trim().slice(0, 32);
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
    titre: String(corps.titre ?? "Elatransfer").slice(0, 120),
    corps: String(corps.corps ?? "").slice(0, 300),
    ref: ref,
    url: lienSur(corps.url)
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
