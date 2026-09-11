/* =====================================================================
   NOUVELLE-DEMANDE — LE FICHIER À COLLER DANS SUPABASE
   ---------------------------------------------------------------------
   CE FICHIER EST FABRIQUÉ. Ne pas le modifier ici : toute correction
   se fait dans « index.ts » ou « message.js », puis on relance
   « node supabase/functions/nouvelle-demande/assembler.mjs ».
   Un test compare les deux — une retouche faite ici serait perdue au
   prochain assemblage, et pire, elle tournerait un moment sans que
   personne ne sache d'où elle vient.
   ===================================================================== */
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

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const TELEGRAM_CHAT = Deno.env.get("TELEGRAM_CHAT") ?? "";
const RESEND_CLE = Deno.env.get("RESEND_CLE") ?? "";
const EMAIL_EXPEDITEUR = Deno.env.get("EMAIL_EXPEDITEUR") ?? "";
const EMAIL_DESTINATAIRE = Deno.env.get("EMAIL_DESTINATAIRE") ?? "";

/* L'adresse du tableau de bord, mise en pied de message : le geste suivant
   est toujours le même — ouvrir le bon et chercher un chauffeur. Un lien
   sur lequel appuyer vaut mieux qu'une adresse à retaper à 5 h. */
/* ═══ L'ADRESSE DU SITE, PAS CELLE DU DÉPÔT ═══
   Elle pointait sur « barbaros911.github.io/As-mine/ », l'adresse
   d'hébergement de GitHub Pages. Personne ne l'avait vu parce que cette
   fonction n'avait jamais tourné : elle est restée écrite et non déployée
   pendant des semaines, et le défaut n'est apparu qu'au premier vrai
   message, en septembre 2026 — « pourquoi on voit github dans le message ».
   Trois raisons de ne pas la laisser : ce n'est pas l'adresse d'Elatransfer,
   elle montre le nom du dépôt à qui lit la notification par-dessus son
   épaule, et le jour d'une bascule d'hébergement elle ouvrirait une version
   périmée du tableau de bord. */
const ADMIN = Deno.env.get("ADRESSE_ADMIN") ??
  "https://elatransfer.com/admin.html";

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
