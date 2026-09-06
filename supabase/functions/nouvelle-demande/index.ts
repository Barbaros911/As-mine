/* =====================================================================
   NOUVELLE-DEMANDE — prévenir Barbaros dès qu'une course est déposée
   ---------------------------------------------------------------------
   LE PROBLÈME QU'ELLE RÈGLE. Une demande arrivée à 5 h du matin ne se
   voyait qu'en ouvrant le tableau de bord. Entre-temps le client a
   attendu, appelé quelqu'un d'autre, ou pris un taxi. Ce n'est pas un
   confort : c'est une course perdue, donc de l'argent.

   COMMENT ELLE EST APPELÉE. Supabase déclenche un « Database Webhook » à
   chaque INSERT dans la table « courses », qui appelle cette fonction.
   Elle ne s'exécute donc JAMAIS depuis la page du client : rien de ce qui
   suit n'est visible du navigateur, et c'est tout l'intérêt — les jetons
   d'envoi vivent ici, dans les secrets du projet Supabase, pas dans le
   dépôt public. C'est la réponse à « où mettre une clé qu'on ne veut pas
   publier » : pas dans la page, ici.

   ELLE NE PEUT PAS FAIRE ÉCHOUER UNE RÉSERVATION. Le webhook part APRÈS
   que la ligne est écrite, et de façon détachée. Si Telegram est en
   panne, si le jeton est périmé, si cette fonction plante : la course est
   quand même enregistrée et le client voit bien sa demande partie. On ne
   perd que la notification, jamais la course. C'est la seule répartition
   acceptable — l'inverse ferait perdre des clients pour éviter de rater
   un bip.

   DEUX CANAUX, ON PREND CE QUI EST CONFIGURÉ. Telegram si son jeton est
   posé, e-mail si le sien l'est, les deux si les deux le sont. Aucun
   n'est obligatoire. Même principe que CLE_MAPBOX et CLE_ORS dans la
   page : on n'a pas à choisir à l'avance, et changer d'avis ne demande
   pas de me réécrire.

   Le texte du message est dans « message.js », à part et sans rien de
   propre à Deno, pour qu'il puisse être éprouvé depuis Node sans réseau —
   c'est lui qui décide s'il se lève ou non.

   Déploiement et réglages : voir NOTIFICATION.md.
   ===================================================================== */

import { titre, corps } from "./message.js";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const TELEGRAM_CHAT = Deno.env.get("TELEGRAM_CHAT") ?? "";
const RESEND_CLE = Deno.env.get("RESEND_CLE") ?? "";
const EMAIL_EXPEDITEUR = Deno.env.get("EMAIL_EXPEDITEUR") ?? "";
const EMAIL_DESTINATAIRE = Deno.env.get("EMAIL_DESTINATAIRE") ?? "";

/* L'adresse du tableau de bord, mise en pied de message : le geste suivant
   est toujours le même — ouvrir le bon et chercher un chauffeur. Un lien
   sur lequel appuyer vaut mieux qu'une adresse à retaper à 5 h. */
const ADMIN = Deno.env.get("ADRESSE_ADMIN") ??
  "https://barbaros911.github.io/As-mine/admin.html";

/* Un appel qui n'aboutit pas ne doit pas retenir la fonction : elle est
   comptée au temps d'exécution, et un service muet la ferait tourner
   jusqu'à sa limite pour rien. */
async function envoyer(url: string, init: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return { ok: r.ok, detail: r.ok ? "" : `${r.status} ${await r.text()}` };
  } catch (e) {
    return { ok: false, detail: String(e) };
  } finally {
    clearTimeout(minuteur);
  }
}

async function parTelegram(t: string, m: string) {
  /* TEXTE BRUT, SANS « parse_mode ». En Markdown, une adresse qui contient
     un tiret bas ou une étoile — ça arrive — fait rejeter TOUT le message
     par Telegram, et la notification est perdue sans que personne ne le
     sache. Le gras ne vaut pas ce risque. */
  return await envoyer(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT,
        text: t + "\n\n" + m,
        disable_web_page_preview: true,
      }),
    },
  );
}

async function parEmail(t: string, m: string) {
  return await envoyer("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_CLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_EXPEDITEUR,
      to: [EMAIL_DESTINATAIRE],
      subject: t,
      text: m,
    }),
  });
}

Deno.serve(async (req) => {
  let charge: Record<string, unknown>;
  try {
    charge = await req.json();
  } catch {
    return new Response("corps illisible", { status: 400 });
  }

  /* ON NE RÉAGIT QU'À UNE COURSE QUI ARRIVE. Sans ce filtre, chaque
     changement de statut — chauffeur attribué, course réalisée — le
     préviendrait d'une « nouvelle demande » qu'il vient de traiter
     lui-même, et il cesserait de regarder ses notifications. Le webhook
     doit de toute façon être réglé sur INSERT seul : ceci est la
     ceinture, au cas où il serait un jour élargi par inadvertance. */
  if (charge.type !== "INSERT" || charge.table !== "courses") {
    return new Response("ignoré : " + String(charge.type), { status: 200 });
  }

  const ligne = (charge.record ?? {}) as Record<string, any>;
  const bon = (ligne.bon ?? {}) as Record<string, any>;
  /* La référence est en colonne ET dans le bon. Si le bon en manque — une
     course déposée par un outil futur, par exemple —, on prend celle de la
     colonne plutôt que d'écrire « Réf. — ». */
  if (!bon.ref && ligne.ref) bon.ref = ligne.ref;

  const t = titre(bon);
  const m = corps(bon, ADMIN);

  const envois: Promise<{ ok: boolean; detail: string }>[] = [];
  const noms: string[] = [];
  if (TELEGRAM_TOKEN && TELEGRAM_CHAT) {
    envois.push(parTelegram(t, m));
    noms.push("telegram");
  }
  if (RESEND_CLE && EMAIL_EXPEDITEUR && EMAIL_DESTINATAIRE) {
    envois.push(parEmail(t, m));
    noms.push("email");
  }

  if (!envois.length) {
    /* Rien de configuré : on le DIT, au lieu de rendre un succès muet.
       Un « 200 OK » ici ferait croire pendant des semaines que les
       notifications marchent, jusqu'au premier client perdu. */
    return new Response("aucun canal configuré — voir NOTIFICATION.md", {
      status: 500,
    });
  }

  const r = await Promise.all(envois);
  const bilan = noms
    .map((n, i) => n + " : " + (r[i].ok ? "ok" : r[i].detail))
    .join(" | ");

  /* Un seul canal qui passe suffit : il est prévenu. On ne rend une erreur
     que si AUCUN n'a abouti — c'est ce qui s'affiche en rouge dans les
     journaux du webhook, et c'est là qu'on veut le voir. */
  return new Response(bilan, { status: r.some((x) => x.ok) ? 200 : 500 });
});
