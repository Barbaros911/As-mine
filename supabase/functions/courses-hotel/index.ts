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
   le prix (SEULEMENT tant que la course est à venir), le nom du client,
   sa chambre, l'état, et — seulement sur une
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
   déjà engagé, et il est le seul à pouvoir le rappeler. Depuis le
   30/09/2026 la réception ne peut même plus le DEMANDER par un bouton :
   elle appelle, et Barbaros annule depuis son admin. Cette fonction ne
   fait que lire ; toute autre action est refusée.
   ===================================================================== */

import {
  creerSessionHotel,
  nomSecretHotel,
  validerSessionHotel,
} from "../_shared/hotel-session.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);

/* Le secret d'un hôtel se nomme d'après sa clé : « easyhotel-aeroville »
   donne « HOTEL_EASYHOTEL_AEROVILLE_CODE ». Un nom de secret mal écrit
   n'est pas une erreur visible — la fonction croit simplement que l'hôtel
   n'existe pas, et la réception lit « code refusé » sans comprendre. La
   marche à suivre le répète, et le nom se calcule ici plutôt que de
   s'écrire à la main quelque part. */
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

function entetes(origin: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* UN PLAFOND D'ESSAIS PAR ADRESSE IP (audit du 28/09/2026). L'attente de
   700 ms ne suffisait pas : on peut paralléliser, et un code court se
   devinait en quelques heures. Chaque appel consomme une unité du quota
   serveur déjà utilisé par le dépôt public — soixante par heure et par IP,
   bien au-delà de ce qu'une réception fait en ouvrant sa liste. Le compte
   est pris AVANT la comparaison : sinon l'essai gagnant passerait même une
   fois la limite atteinte. */
const ESSAIS_PAR_HEURE = 60;
async function sha256(v: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function quotaOk(req: Request): Promise<boolean | null> {
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue")
    .split(",")[0].trim();
  const cle = await sha256("courses-hotel|" + ip + "|" + new Date().toISOString().slice(0, 13));
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`, {
      method: "POST",
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
                 "Content-Type": "application/json" },
      body: JSON.stringify({ p_cle: cle, p_limite: ESSAIS_PAR_HEURE })
    });
    if (!r.ok) return null;
    return (await r.json()) === true;
  } catch (_e) { return null; }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!ORIGINS.has(origin)) return new Response("refusé", { status: 403 });
    return new Response(null, { status: 204, headers: {
      ...entetes(origin),
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "600",
    } });
  }
  if (origin && !ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ erreur: "origine refusée" }),
      { status: 403, headers: entetes(origin) });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erreur: "méthode refusée" }),
      { status: 405, headers: entetes(origin) });
  }
  /* RIEN DE CONFIGURÉ REND UNE ERREUR, PAS UN SUCCÈS MUET — même règle que
     les trois autres fonctions. Une liste vide ferait croire à la réception
     qu'elle n'a aucune course, ce qui est un mensonge, pas une panne. */
  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return new Response(JSON.stringify({ erreur: "clé de service absente" }),
      { status: 500, headers: entetes(origin) });
  }

  let corps: any = {};
  try { corps = await req.json(); } catch (_e) { corps = {}; }
  const cle = String(corps.hotel ?? "").trim().toLowerCase();
  const code = String(corps.code ?? "");
  const session = String(corps.session ?? "");
  const action = String(corps.action ?? "liste");

  if (!cle || (!code && !session)) {
    return new Response(JSON.stringify({ erreur: "hôtel ou autorisation manquante" }),
      { status: 400, headers: entetes(origin) });
  }
  /* La clé vient d'une adresse, donc de l'extérieur : on la borne avant de
     l'utiliser pour composer un nom de variable d'environnement. */
  if (!/^[a-z0-9-]{3,40}$/.test(cle)) {
    await attendre(700);
    return new Response(JSON.stringify({ refuse: true }),
      { status: 401, headers: entetes(origin) });
  }

  const quota = await quotaOk(req);
  if (quota === null) {
    return new Response(JSON.stringify({ erreur: "service indisponible" }),
      { status: 503, headers: entetes(origin) });
  }
  if (!quota) {
    return new Response(JSON.stringify({ erreur: "trop d'essais, réessayez dans une heure" }),
      { status: 429, headers: entetes(origin) });
  }

  const attendu = Deno.env.get(nomSecretHotel(cle)) ?? "";
  const sessionValide = session
    ? await validerSessionHotel(session, cle, attendu)
    : false;
  if (!sessionValide && !memeCode(code, attendu)) {
    /* Une attente sur l'échec, jamais sur le succès. Elle ne transforme pas
       cette serrure en coffre — on peut paralléliser — mais elle rend un
       essai en force nettement plus coûteux qu'une boucle sur un fichier
       téléchargé, ce qu'est le code de l'espace exploitant. */
    await attendre(700);
    return new Response(JSON.stringify({ refuse: true }),
      { status: 401, headers: entetes(origin) });
  }
  const sessionCourante = sessionValide ? session : await creerSessionHotel(cle, attendu);

  /* ---- La réception ne fait QUE lire ------------------------------
     (30/09/2026, à la demande de Barbaros : « la réception ne peut
     annuler »). Il y avait ici une action « annulation » qui posait un
     drapeau sur le bon. Elle est retirée : pour annuler, la réception
     appelle, et c'est Barbaros qui annule depuis son admin. Toute action
     autre que la liste est REFUSÉE ici, en plus du bouton retiré de la
     page — un bouton retiré n'empêche pas un appel direct. */
  if (action !== "liste") {
    return new Response(JSON.stringify({ erreur: "action non autorisée" }),
      { status: 403, headers: entetes(origin) });
  }

  /* ---- La liste des courses de cet hôtel ------------------------------
     Le filtre porte sur la CLÉ rangée dans le bon, pas sur le libellé
     affiché : le libellé est du texte destiné à un écran, il peut être
     corrigé un jour (« easyHotel Aéroville » → « easyHotel Paris CDG ») et
     l'historique deviendrait alors invisible à son propre hôtel. */
  const url = `${SUPABASE_URL}/rest/v1/courses`
    + `?select=ref,statut,cree_le,bon`
    + `&bon->>provenanceCle=eq.${encodeURIComponent(cle)}`
    /* 500 et plus 200 (30/09/2026) : la réception retrouve maintenant son
       HISTORIQUE (onglet « Passées », recherche). 200 couvrait quelques
       semaines d'un hôtel actif ; 500 couvre des mois, pour quelques
       centaines de Ko relus toutes les 30 s seulement quand l'écran est
       ouvert et visible. */
    + `&order=cree_le.desc&limit=500`;
  const r = await fetch(url,
    { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
  if (!r.ok) {
    return new Response(JSON.stringify({ erreur: "lecture refusée" }),
      { status: 502, headers: entetes(origin) });
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
      /* LE PRIX NE SORT QUE TANT QUE LA COURSE EST À VENIR (30/09/2026, à
         la demande de Barbaros : « une fois les courses réalisées, aucune
         trace du chiffre ne doit rester »). La réception en a besoin pour
         l'annoncer ; une fois la course faite, non prise ou annulée, elle
         ne sert plus qu'à additionner ce qu'Elatransfer encaisse. Le champ
         n'est pas mis à zéro, il est ABSENT : masquer à l'écran laisserait
         le montant dans la réponse, lisible par les outils du navigateur. */
      ...(statut === "attente" || statut === "confirmee"
        ? { prix: Number(bon.prix && bon.prix.total) || 0 } : {}),
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
      /* Le moment où Barbaros a MODIFIÉ la course depuis son admin (heure,
         adresses…). La réception l'affiche sur la carte : un changement
         d'heure qui ne se voit pas fait descendre le client à la mauvaise
         heure. */
      modifie: String(bon.modifieLe || ""),
      /* Le chauffeur seulement quand la course est réellement attribuée :
         sur une course en attente, un nom écrit pour mémoire promettrait
         une voiture qui n'a rien accepté. */
      chauffeur: (statut === "confirmee" || statut === "realisee")
        ? { nom: String(ch.nom || ""), telephone: String(ch.telephone || "") }
        : { nom: "", telephone: "" }
    };
  });

  return new Response(JSON.stringify({ hotel: cle, courses: courses, session: sessionCourante }),
    { headers: entetes(origin) });
});
