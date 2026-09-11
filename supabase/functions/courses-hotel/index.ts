/* =====================================================================
   COURSES-HOTEL — la réception d'un hôtel partenaire voit SES courses
   ---------------------------------------------------------------------
   Barbaros, septembre 2026 : « on peut pas mettre un système dans lequel
   ils peuvent placer les réservations, voir les historiques etc ? », puis
   « je veux qu'il y ait un lien de connexion vraiment destiné à la
   réception de l'hôtel uniquement ».

   ═══ LE PROBLÈME QU'ELLE RÉSOUT ═══
   L'écran hôtel sait réserver, mais la liste des courses vivait dans le
   navigateur de l'appareil. Deux conséquences, opposées et toutes deux
   mauvaises : sur la tablette PARTAGÉE d'un comptoir, chaque client voyait
   les réservations des précédents ; et sur n'importe quel autre appareil —
   le téléphone du collègue de nuit, la tablette après un vidage de cache —
   la réception ne voyait plus rien du tout.
   Ici la liste vient du SERVEUR, filtrée sur l'hôtel. La réception voit ce
   qu'elle a réservé, où qu'elle soit, et rien d'autre.

   ═══ POURQUOI UNE FONCTION, ET PAS UNE LECTURE DIRECTE ═══
   Même raison que « etat-course », et elle ne se négocie pas : la règle de
   sécurité interdit la LECTURE aux visiteurs anonymes, et elle DOIT
   l'interdire — la clé publique du site est lisible par n'importe qui, une
   policy de lecture pour « anon » exposerait les noms, téléphones et
   adresses de TOUS les clients (RGPD). Cette fonction est la seule porte :
   elle lit avec la clé de service, qui ne sort jamais d'ici.

   ═══ LE CODE EST VÉRIFIÉ ICI, JAMAIS DANS LA PAGE ═══
   C'est LA différence avec le code de l'espace exploitant, qui vit dans le
   site sous forme d'empreinte : celui-là, quelqu'un qui lit la source peut
   l'attaquer hors ligne, autant d'essais qu'il veut, sans que personne le
   sache. Ici le code n'est nulle part dans le site — il vit dans les
   secrets Supabase, à côté des jetons Telegram et VAPID. Pour l'essayer il
   faut appeler cette fonction, un essai à la fois, sur le réseau.
   **Ce n'est pas un coffre pour autant.** Le dire à Barbaros plutôt que de
   laisser croire le contraire : ce qui protège vraiment, c'est que
   l'adresse ne se communique qu'à l'hôtel ET que le code soit long. Un
   code à huit chiffres se devine ; « easyhotel-9F3K2Q » non.

   ═══ UN HÔTEL INCONNU ET UN CODE FAUX RENDENT LA MÊME RÉPONSE ═══
   Les distinguer dirait à qui essaie des noms au hasard lesquels sont
   partenaires — et donc lesquels valent la peine d'insister. Même règle
   que la course introuvable d'« etat-course ».

   ═══ CE QU'ELLE REND, ET CE QU'ELLE NE REND PAS ═══
   Ce dont un comptoir a besoin pour répondre à son client sans appeler
   Barbaros : la référence, la date, l'heure, la destination, le véhicule,
   le prix, le nom du client, sa chambre, l'état, et — seulement sur une
   course confirmée ou réalisée — le prénom du chauffeur et son numéro.
   LE TÉLÉPHONE DU CLIENT EN FAIT PARTIE, et c'est une DÉCISION, pas un
   oubli. Il avait d'abord été écarté au nom de la minimisation. Barbaros a
   tranché l'inverse : « la réservation doit comporter le numéro de chambre
   ou le nom du client ainsi que le numéro ». Et il a raison sur le fond —
   la réception a tapé ce numéro elle-même, et un client parti prendre son
   petit-déjeuner n'est joignable QUE là quand la voiture arrive. La
   minimisation interdit ce qui n'est pas nécessaire, pas ce qui sert. Ce
   qui reste vrai : ces données ne sortent jamais de l'hôtel qui les a
   saisies, et le code protège l'accès.

   ═══ RIEN NE S'ANNULE DEPUIS UNE TABLETTE D'HÔTEL ═══
   Une course annulée à 5 h du matin libère un chauffeur que Barbaros a
   déjà engagé, et il est le seul à pouvoir le rappeler. Le bouton de la
   réception ne change donc **jamais** le statut : il pose un drapeau
   « annulation demandée » sur le bon, et c'est Barbaros qui tranche. Un
   contrôle vérifie que le statut est intact après l'appel.
   ===================================================================== */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* Le secret d'un hôtel se nomme d'après sa clé : « easyhotel-aeroville »
   donne « HOTEL_EASYHOTEL_AEROVILLE_CODE ». Un nom de secret mal écrit
   n'est pas une erreur visible — la fonction croit simplement que l'hôtel
   n'existe pas, et la réception lit « code refusé » sans comprendre. La
   marche à suivre le répète, et le nom se calcule ici plutôt que de
   s'écrire à la main quelque part. */
function nomDuSecret(cle: string): string {
  return "HOTEL_" + cle.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_CODE";
}

/* UNE COMPARAISON QUI NE FUIT PAS PAR SA DURÉE. « a === b » s'arrête au
   premier caractère différent : le temps de réponse dit alors combien de
   caractères de tête sont justes, et un code se reconstruit lettre par
   lettre. On compare tout, toujours. */
function memeCode(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const entetes = {
  "Content-Type": "application/json",
  /* La page est servie depuis un autre domaine que la fonction : sans ces
     en-têtes le navigateur refuse la réponse avant même de la lire. */
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erreur: "méthode refusée" }),
      { status: 405, headers: entetes });
  }
  /* RIEN DE CONFIGURÉ REND UNE ERREUR, PAS UN SUCCÈS MUET — même règle que
     les trois autres fonctions. Une liste vide ferait croire à la réception
     qu'elle n'a aucune course, ce qui est un mensonge, pas une panne. */
  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return new Response(JSON.stringify({ erreur: "clé de service absente" }),
      { status: 500, headers: entetes });
  }

  let corps: any = {};
  try { corps = await req.json(); } catch (_e) { corps = {}; }
  const cle = String(corps.hotel ?? "").trim().toLowerCase();
  const code = String(corps.code ?? "");
  const action = String(corps.action ?? "liste");

  if (!cle || !code) {
    return new Response(JSON.stringify({ erreur: "hôtel ou code manquant" }),
      { status: 400, headers: entetes });
  }
  /* La clé vient d'une adresse, donc de l'extérieur : on la borne avant de
     l'utiliser pour composer un nom de variable d'environnement. */
  if (!/^[a-z0-9-]{3,40}$/.test(cle)) {
    await attendre(700);
    return new Response(JSON.stringify({ refuse: true }),
      { status: 401, headers: entetes });
  }

  const attendu = Deno.env.get(nomDuSecret(cle)) ?? "";
  if (!memeCode(code, attendu)) {
    /* Une attente sur l'échec, jamais sur le succès. Elle ne transforme pas
       cette serrure en coffre — on peut paralléliser — mais elle rend un
       essai en force nettement plus coûteux qu'une boucle sur un fichier
       téléchargé, ce qu'est le code de l'espace exploitant. */
    await attendre(700);
    return new Response(JSON.stringify({ refuse: true }),
      { status: 401, headers: entetes });
  }

  /* ---- La demande d'annulation ---------------------------------------
     Elle ne décide rien. On relit le bon, on pose le drapeau, on réécrit
     le bon — et on ne touche PAS à la colonne « statut ». */
  if (action === "annulation") {
    const ref = String(corps.ref ?? "").trim();
    if (!ref) {
      return new Response(JSON.stringify({ erreur: "référence manquante" }),
        { status: 400, headers: entetes });
    }
    const lu = await fetch(
      `${SUPABASE_URL}/rest/v1/courses?select=ref,statut,bon&ref=eq.${encodeURIComponent(ref)}&limit=1`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
    if (!lu.ok) {
      return new Response(JSON.stringify({ erreur: "lecture refusée" }),
        { status: 502, headers: entetes });
    }
    const lignes = await lu.json();
    const ligne = Array.isArray(lignes) ? lignes[0] : null;
    const bon = (ligne && ligne.bon) || null;
    /* UN HÔTEL NE PEUT DEMANDER L'ANNULATION QUE DE SES PROPRES COURSES.
       Sans ce contrôle, un code d'hôtel valable ouvrirait le droit de
       toucher aux courses de tous les autres — c'est la même erreur que
       d'ouvrir la modification d'une ligne au visiteur anonyme. */
    if (!bon || String(bon.provenanceCle ?? "") !== cle) {
      return new Response(JSON.stringify({ inconnue: true }),
        { status: 404, headers: entetes });
    }
    bon.annulationDemandee = true;
    const ecrit = await fetch(
      `${SUPABASE_URL}/rest/v1/courses?ref=eq.${encodeURIComponent(ref)}`,
      { method: "PATCH",
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
                   "Content-Type": "application/json", Prefer: "return=minimal" },
        /* On n'envoie QUE « bon ». Écrire « statut » ici, même à sa valeur
           actuelle, serait le premier pas vers une annulation silencieuse. */
        body: JSON.stringify({ bon: bon }) });
    if (!ecrit.ok) {
      return new Response(JSON.stringify({ erreur: "écriture refusée" }),
        { status: 502, headers: entetes });
    }
    return new Response(JSON.stringify({ ok: true, ref: ref }), { headers: entetes });
  }

  /* ---- La liste des courses de cet hôtel ------------------------------
     Le filtre porte sur la CLÉ rangée dans le bon, pas sur le libellé
     affiché : le libellé est du texte destiné à un écran, il peut être
     corrigé un jour (« easyHotel Aéroville » → « easyHotel Paris CDG ») et
     l'historique deviendrait alors invisible à son propre hôtel. */
  const url = `${SUPABASE_URL}/rest/v1/courses`
    + `?select=ref,statut,cree_le,bon`
    + `&bon->>provenanceCle=eq.${encodeURIComponent(cle)}`
    + `&order=cree_le.desc&limit=200`;
  const r = await fetch(url,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
  if (!r.ok) {
    return new Response(JSON.stringify({ erreur: "lecture refusée" }),
      { status: 502, headers: entetes });
  }
  const lignes = await r.json();

  /* On ne prend le numéro que dans la forme EXACTE que la page compose,
     « (ch. 214) », et en FIN de libellé. Une recherche plus large
     ramasserait un nom de rue — il existe des « rue de la Chambre ». */
  function chambreDuLibelle(label: any): string {
    const m = String(label || "").match(/\(ch\.\s*([^)]{1,12})\)\s*$/);
    return m ? m[1].trim() : "";
  }

  const courses = (Array.isArray(lignes) ? lignes : []).map((l: any) => {
    const bon = l.bon || {};
    const co = bon.course || {};
    const ch = bon.chauffeur || {};
    const cl = bon.client || {};
    /* LE STATUT DE LA COLONNE FAIT FOI, pas celui recopié dans le bon :
       c'est lui que l'exploitant met à jour, et les deux peuvent diverger
       le temps d'une synchronisation. Même règle qu'« etat-course ». */
    const statut = String(l.statut || bon.statut || "attente");
    return {
      ref: String(l.ref || ""),
      statut: statut,
      date: String(co.date || ""),
      heure: String(co.heure || ""),
      depart: String(co.departPublic || co.depart || ""),
      arrivee: String(co.arrivee || ""),
      vehicule: String(co.vehicule || ""),
      prix: Number(bon.prix && bon.prix.total) || 0,
      /* Le nom, la chambre ET le numéro : ce sont SES clients, c'est elle
         qui les a saisis, et c'est ce qu'un comptoir doit avoir sous les
         yeux quand la voiture est en bas. Voir l'en-tête. */
      client: String(cl.nom || ""),
      tel: String(cl.telephone || ""),
      /* LE REPLI SUR LE LIBELLÉ N'EST PAS UNE CEINTURE, IL EST NÉCESSAIRE.
         « course.chambre » n'a été écrit qu'à partir de septembre 2026 ;
         avant, la chambre n'existait QUE fondue dans le libellé de départ,
         sous la forme « … (ch. 214) ». Sans ce repli, toutes les courses
         déjà prises perdraient leur numéro pour la réception — et c'est
         justement celle d'hier soir qu'on rouvre ce matin. */
      chambre: String(co.chambre || chambreDuLibelle(co.depart)),
      /* Ce que la réception a écrit elle-même. Elle doit pouvoir le relire :
         c'est le seul champ de la course qu'aucun formulaire ne rappelle,
         et c'est sur lui qu'elle vérifie avant de répondre au client. */
      note: String(co.note || ""),
      /* LE MODE DE RÈGLEMENT, à sa demande. La réception l'annonce au
         client au moment de réserver ; s'il n'est pas relisible ensuite,
         elle ne peut plus répondre à « je paie comment, déjà ? » — et le
         chauffeur se présente avec ou sans terminal de carte selon cette
         seule réponse. */
      paiement: String(bon.paiementNom || bon.paiement || ""),
      annulationDemandee: !!bon.annulationDemandee,
      /* Le chauffeur seulement quand la course est réellement attribuée :
         sur une course en attente, un nom écrit pour mémoire promettrait
         une voiture qui n'a rien accepté. */
      chauffeur: (statut === "confirmee" || statut === "realisee")
        ? { nom: String(ch.nom || ""), telephone: String(ch.telephone || "") }
        : { nom: "", telephone: "" }
    };
  });

  return new Response(JSON.stringify({ hotel: cle, courses: courses }),
    { headers: entetes });
});
