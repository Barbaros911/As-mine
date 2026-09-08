/* =====================================================================
   ETAT-COURSE — la réponse d'Elatransfer arrive SUR LE SITE
   ---------------------------------------------------------------------
   Barbaros, septembre 2026 : « il faut que je puisse répondre aussi via le
   site si le client veut voir sa réponse sur le site ».

   ═══ LE PROBLÈME QU'ELLE RÉSOUT ═══
   « Mes courses » n'affichait que ce qui dort dans le téléphone du client,
   figé à l'instant de la réservation. Une course confirmée à 4 h du matin
   restait « EN ATTENTE » sur son écran des jours plus tard. **Ce n'est pas
   une information manquante, c'est une information FAUSSE** : le client
   rappelle pour demander si sa voiture est réservée, alors qu'un chauffeur
   lui est attribué depuis la veille.

   ═══ POURQUOI UNE FONCTION, ET PAS UNE SIMPLE LECTURE ═══
   La règle de sécurité du serveur interdit la LECTURE aux visiteurs
   anonymes, et **elle doit l'interdire** : la clé publique du site est
   lisible par n'importe qui, donc une policy de lecture pour « anon »
   exposerait les noms, téléphones et adresses de TOUS les clients (RGPD).
   Cette fonction est la seule porte : elle lit avec la clé de service, qui
   ne sort jamais d'ici, et ne rend qu'une course à la fois.

   ═══ CE QUI FAIT OFFICE DE CLÉ : LA RÉFÉRENCE **ET** LE TÉLÉPHONE ═══
   La référence seule ne protégerait rien — elle est séquentielle
   (ELA-26-09-0007), donc devinable : il suffirait de compter pour lire les
   courses des autres. On exige donc aussi le numéro du client, que seul son
   téléphone connaît (il est dans son stockage local depuis sa réservation).
   Les deux ensemble, c'est ce que possède le client et personne d'autre.

   ═══ CE QU'ELLE REND, ET RIEN D'AUTRE ═══
   Le statut, le prénom du chauffeur, son téléphone, le véhicule, l'heure.
   **Jamais les adresses, jamais le nom du client, jamais le numéro de
   chambre, jamais le prix.** Exactement ce que porte déjà le lien « ?ok= »
   et la notification — même règle, même raison (RGPD 5.1.c) : ce qui n'est
   pas nécessaire ne voyage pas. Le client a déjà tout le reste sur son
   propre bon, dans son téléphone.

   ═══ UNE COURSE INTROUVABLE ET UN TÉLÉPHONE QUI NE CORRESPOND PAS RENDENT
   LA MÊME RÉPONSE ═══ Distinguer les deux dirait à qui essaie des
   références au hasard lesquelles existent. On répond « inconnue » dans les
   deux cas, avec le même code.
   ===================================================================== */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* DEUX ÉCRITURES DU MÊME NUMÉRO NE DOIVENT PAS SE MANQUER. Le client a pu
   taper « 07 59 31 24 33 », « 0759312433 » ou « +33 7 59 31 24 33 ». On ne
   garde que les chiffres, et on ne compare que les NEUF DERNIERS : c'est ce
   qui reste identique une fois retiré le « 0 » national ou le « +33 ». */
function empreinteTel(brut: unknown): string {
  const chiffres = String(brut ?? "").replace(/\D/g, "");
  return chiffres.length >= 9 ? chiffres.slice(-9) : chiffres;
}

const entetes = {
  "Content-Type": "application/json",
  /* La page est servie depuis un autre domaine que la fonction : sans ces
     en-têtes le navigateur refuse la réponse avant même de la lire, et
     l'erreur ne ressemble à rien de ce qui se passe vraiment. */
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erreur: "méthode refusée" }),
      { status: 405, headers: entetes });
  }
  /* RIEN DE CONFIGURÉ REND UNE ERREUR, PAS UN SUCCÈS MUET — même règle que
     les deux autres fonctions. Un « 200 » avec une course vide ferait
     croire au site que toutes les demandes sont introuvables, et il
     afficherait « en attente » pour toujours sans que personne ne sache
     pourquoi. */
  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return new Response(JSON.stringify({ erreur: "clé de service absente" }),
      { status: 500, headers: entetes });
  }

  let corps: any = {};
  try { corps = await req.json(); } catch (_e) { corps = {}; }
  const ref = String(corps.ref ?? "").trim();
  const tel = empreinteTel(corps.tel);
  if (!ref || !tel) {
    return new Response(JSON.stringify({ erreur: "référence ou téléphone manquant" }),
      { status: 400, headers: entetes });
  }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/courses?select=statut,bon&ref=eq.${encodeURIComponent(ref)}&limit=1`,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
  if (!r.ok) {
    return new Response(JSON.stringify({ erreur: "lecture refusée" }),
      { status: 502, headers: entetes });
  }
  const lignes = await r.json();
  const ligne = Array.isArray(lignes) ? lignes[0] : null;

  /* Course inconnue OU téléphone qui ne correspond pas : même réponse. */
  const bon = (ligne && ligne.bon) || null;
  const attendu = empreinteTel(bon && bon.client && bon.client.telephone);
  if (!bon || !attendu || attendu !== tel) {
    return new Response(JSON.stringify({ inconnue: true }),
      { status: 404, headers: entetes });
  }

  const ch = bon.chauffeur || {};
  const co = bon.course || {};
  /* LE STATUT DE LA COLONNE FAIT FOI, pas celui recopié dans le bon : c'est
     lui que l'exploitant met à jour, et les deux peuvent diverger le temps
     d'une synchronisation. */
  const statut = String(ligne.statut || bon.statut || "attente");

  return new Response(JSON.stringify({
    ref: ref,
    statut: statut,
    /* Le chauffeur n'est renvoyé QUE sur une course confirmée ou réalisée.
       Sur une course encore en attente, Barbaros a pu écrire un nom dans
       le champ pour se souvenir d'un chauffeur à rappeler — l'envoyer au
       client lui promettrait une voiture qui n'a rien accepté. */
    chauffeur: (statut === "confirmee" || statut === "realisee")
      ? { nom: String(ch.nom || ""), telephone: String(ch.telephone || "") }
      : { nom: "", telephone: "" },
    vehicule: String(co.vehicule || ""),
    date: String(co.date || ""),
    heure: String(co.heure || "")
  }), { headers: entetes });
});
