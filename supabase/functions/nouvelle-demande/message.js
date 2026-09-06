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

export function euros(n) {
  const v = typeof n === "number" ? n : Number(n);
  if (!isFinite(v)) return "—";
  return v.toFixed(2).replace(".", ",") + " €";
}

/* Une adresse entière ne tient pas sur une ligne d'écran verrouillé. On
   coupe sur un mot, jamais au milieu — et seulement si la coupe ne mange
   pas plus de 40 % du texte, sinon on préfère trancher net que rendre
   « Roissy… » là où « Roissy-Charles-de-Gaulle T2E » était attendu. */
export function court(texte, max = 42) {
  const t = String(texte ?? "").trim() || "—";
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe) + "…";
}

function quand(bon) {
  const c = bon.course ?? {};
  const brut = bon.dateMsg ?? `${c.date ?? ""} ${c.heure ?? ""}`;
  return String(brut).trim() || "—";
}

/* LE TITRE EST CE QU'IL LIT EN PREMIER, ET SOUVENT LE SEUL : sur un écran
   verrouillé, c'est la ligne qui décide s'il se lève. Elle porte donc le
   trajet et l'heure, pas « Nouvelle notification ». */
export function titre(bon) {
  const c = bon.course ?? {};
  return "Nouvelle demande — "
    + court(c.departPublic ?? c.depart, 24)
    + " → " + court(c.arriveePublic ?? c.arrivee, 24)
    + ", " + quand(bon);
}

export function corps(bon, adresseAdmin) {
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
