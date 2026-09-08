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
import { chiffrer, jetonVapid } from "./chiffrer.js";

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
