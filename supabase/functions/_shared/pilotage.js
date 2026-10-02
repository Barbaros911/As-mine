/* =====================================================================
   PILOTAGE.JS — ce que l'assistant sait dire, et ce que la sentinelle voit
   ---------------------------------------------------------------------
   02/10/2026, à la demande de Barbaros : « un véritable assistant de
   pilotage connecté à l'activité », sans toucher au tunnel de réservation.

   POURQUOI CE FICHIER EST À PART, EN JAVASCRIPT ORDINAIRE. Tout ce qui
   DÉCIDE — qu'est-ce qu'une course urgente, sans chauffeur, en retard, en
   double ; qu'est-ce qu'une anomalie ; quel texte part sur Telegram — tient
   ici, sans réseau ni Deno. « test-pilotage.mjs » le relit depuis Node.
   Les deux fonctions qui s'en servent (telegram-bot pour les questions,
   pilotage pour la sentinelle) ne font que LIRE la base et ENVOYER.

   PAS D'IA GÉNÉRATIVE ICI, ET C'EST UN CHOIX. Les questions sont reconnues
   par mots-clés. Un modèle de langue enverrait les courses (trajets, prix)
   chez un tiers à chaque question, et pourrait se tromper sur un chiffre —
   or Barbaros décide sur ces chiffres, la nuit. Huit questions fixes,
   déterministes et éprouvées valent mieux qu'une conversation libre qui
   invente une course.

   CE QUE LES RÉPONSES NE PORTENT JAMAIS : le nom, le téléphone, le numéro
   de chambre du client. Même règle que l'alerte Telegram (RGPD 5.1.c) :
   ils ne servent pas à DÉCIDER, ils sont dans l'admin, à un doigt. Le
   départ affiché est « departPublic », celui SANS la chambre.
   ===================================================================== */

export const REF_RE = /^[A-Z]{2,4}-[0-9A-Z-]{4,26}$/;
const ACTIFS = new Set(["attente", "confirmee"]);
const FINIS = new Set(["realisee", "refusee", "annulee"]);

/* ═══ L'HEURE DE PARIS ═══
   La date et l'heure d'un bon sont des heures CIVILES de Paris. On compare
   donc à l'horloge de Paris convertie de la même façon (pseudo-UTC), comme
   « nouvelle-demande » : un serveur en UTC décalerait sinon « aujourd'hui »
   d'un jour entre minuit et 2 h — exactement quand personne ne teste. */
const HORLOGE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function maintenantParis(ms = Date.now()) {
  const p = Object.fromEntries(HORLOGE.formatToParts(new Date(ms)).filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
}
export function jourIso(pseudo) { return new Date(pseudo).toISOString().slice(0, 10); }
export function departCivil(bon) {
  const c = (bon && bon.course) || {};
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(c.date || ""));
  const h = /^(\d{1,2}):(\d{2})$/.exec(String(c.heure || ""));
  if (!d || !h) return null;
  const v = [...d.slice(1), ...h.slice(1)].map(Number);
  if (v[1] < 1 || v[1] > 12 || v[2] < 1 || v[2] > 31 || v[3] > 23 || v[4] > 59) return null;
  return Date.UTC(v[0], v[1] - 1, v[2], v[3], v[4]);
}

/* ═══ LECTURE D'UNE COURSE ═══ */
function sansChambre(t) { return String(t || "").replace(/\s*\((?:ch\.|chambre|room)[^)]*\)\s*/gi, " ").trim(); }
function court(t, max = 26) {
  const s = String(t || "").trim() || "—";
  if (s.length <= max) return s;
  const c = s.slice(0, max), e = c.lastIndexOf(" ");
  return (e > max * 0.6 ? c.slice(0, e) : c) + "…";
}
export function chauffeurDe(bon) {
  const ch = (bon && bon.chauffeur) || {};
  return String(ch.nom || "").trim() || (String(ch.telephone || "").trim() ? "(numéro seul)" : "");
}
function origine(bon) {
  if (!bon) return "site";
  if (bon.parReception) return "réception " + (bon.provenance || bon.provenanceCle || "hôtel");
  if (bon.canal === "admin") return "saisie admin";
  if (bon.provenanceCle || bon.provenance) return "flyer " + (bon.provenance || bon.provenanceCle);
  return "site public";
}
/* Une ligne par course, et rien d'autre que ce qui sert à décider. */
export function ligneCourse(c, nowP) {
  const bon = c.bon || {}, co = bon.course || {};
  const dep = departCivil(bon);
  const quand = dep === null ? "date ?" : (jourIso(dep) === jourIso(nowP) ? "" : jourIso(dep).slice(8, 10) + "/" + jourIso(dep).slice(5, 7) + " ") + String(co.heure || "");
  const etat = { attente: "⏳ attente", confirmee: "✔ confirmée", realisee: "✅ réalisée", refusee: "✖ non prise", annulee: "✖ annulée" }[c.statut] || c.statut;
  const ch = chauffeurDe(bon);
  const chTxt = ACTIFS.has(c.statut) ? (ch ? " · " + ch : " · ⚠ sans chauffeur") : "";
  return quand.trim() + " · " + c.ref + "\n   " + court(co.departPublic || sansChambre(co.depart)) + " → " + court(co.arriveePublic || sansChambre(co.arrivee)) + " · " + (co.vehicule || "—") + " · " + etat + chTxt;
}

/* ═══ CE QUI DEMANDE UNE INTERVENTION ═══
   Les seuils sont ceux de la relance existante : 2 h = « proche »,
   30 min = « urgent ». Une course en attente demande toujours quelque chose
   (quelqu'un attend une réponse) ; une confirmée sans chauffeur aussi. */
export const PROCHE_MS = 2 * 3600 * 1000, URGENT_MS = 30 * 60 * 1000, RETARD_MS = 30 * 60 * 1000, VIEUX_MS = 6 * 3600 * 1000;
export function analyser(courses, now = Date.now()) {
  const nowP = maintenantParis(now), auj = jourIso(nowP), dem = jourIso(nowP + 86400000);
  const tri = (a, b) => (departCivil(a.bon) ?? 0) - (departCivil(b.bon) ?? 0);
  const valides = (courses || []).filter(c => c && REF_RE.test(String(c.ref || "")));
  const de = (jour) => valides.filter(c => !["refusee", "annulee"].includes(c.statut) && departCivil(c.bon) !== null && jourIso(departCivil(c.bon)) === jour).sort(tri);
  const actives = valides.filter(c => ACTIFS.has(c.statut));
  const reste = (c) => { const d = departCivil(c.bon); return d === null ? null : d - nowP; };
  const enRetard = actives.filter(c => { const r = reste(c); return r !== null && r < -RETARD_MS; }).sort(tri);
  const avenir = actives.filter(c => { const r = reste(c); return r === null || r >= -RETARD_MS; });
  const sansChauffeur = avenir.filter(c => !chauffeurDe(c.bon)).sort(tri);
  const urgentes = avenir.filter(c => {
    const r = reste(c);
    if (r === null) return c.statut === "attente";
    return r <= PROCHE_MS && (c.statut === "attente" || !chauffeurDe(c.bon));
  }).sort(tri);
  const enAttente = actives.filter(c => c.statut === "attente").sort(tri);
  return { nowP, auj, dem, aujourdhui: de(auj), demain: de(dem), urgentes, sansChauffeur, enRetard, enAttente, actives, valides };
}

/* ═══ LES DOUBLONS ═══
   « Aucune double réservation » : deposer-course est déjà idempotent sur la
   référence, mais un client qui appuie deux fois après un échec réseau, ou
   une réception qui ressaisit, fabrique deux références pour un trajet.
   Rien ne l'empêche sans connaître l'intention : on le SIGNALE.
   On compare trajet + date + heure, jamais le téléphone (il ne quitte pas
   la base). Et un même chauffeur sur deux départs à moins d'une heure. */
export function doublons(courses) {
  const actives = (courses || []).filter(c => ACTIFS.has(c.statut) && departCivil(c.bon) !== null);
  const vus = new Map(), trajets = [];
  for (const c of actives) {
    const co = c.bon.course || {};
    const cle = [co.date, co.heure, (co.departPublic || sansChambre(co.depart)).toLowerCase(), (co.arriveePublic || sansChambre(co.arrivee)).toLowerCase()].join("|");
    if (vus.has(cle)) trajets.push([vus.get(cle), c.ref]); else vus.set(cle, c.ref);
  }
  const chauffeurs = [], parCh = new Map();
  for (const c of actives) {
    const ch = (c.bon.chauffeur || {}), cle = String(ch.telephone || "").replace(/\D/g, "").slice(-9) || String(ch.nom || "").trim().toLowerCase();
    if (!cle) continue;
    const d = departCivil(c.bon);
    for (const autre of parCh.get(cle) || []) if (Math.abs(autre.d - d) < 3600 * 1000) chauffeurs.push([autre.ref, c.ref, chauffeurDe(c.bon)]);
    parCh.set(cle, [...(parCh.get(cle) || []), { ref: c.ref, d }]);
  }
  return { trajets, chauffeurs };
}

/* ═══ LA SENTINELLE ═══
   Chaque anomalie porte une CLÉ stable (pour ne pas la répéter à chaque
   tour), une CADENCE (combien de temps avant de la redire), et un TEXTE.
   Elle disparaît d'elle-même quand la situation se règle : c'est ce qui
   arrête les rappels « dès que la réservation est prise en charge ».
   journal : lignes de journal_notifications_admin des dernières 24 h.
   sante   : { relance: ISO du dernier tour de la relance }. */
export const CADENCES = { urgent: 5 * 60 * 1000, proche: 15 * 60 * 1000, systeme: 30 * 60 * 1000, unique: 365 * 86400000 };
export function anomalies(courses, journal, sante, now = Date.now()) {
  const a = analyser(courses, now), out = [];
  const j = journal || [];
  /* 1. LA CHAÎNE : une demande arrivée en base et jamais annoncée. La
     relance la rattrape à 1 min ; à 3 min, c'est que la relance elle-même
     ne passe pas. C'est l'anomalie qui compte le plus. */
  for (const c of a.enAttente) {
    const cree = Date.parse(String(c.cree_le || ""));
    if (!Number.isFinite(cree) || now - cree < 3 * 60 * 1000 || now - cree > 24 * 3600 * 1000) continue;
    const annoncee = j.some(x => x.course_ref === c.ref && x.statut === "envoye");
    if (!annoncee) out.push({ cle: "non_annoncee:" + c.ref, ref: c.ref, gravite: "critique", cadence: CADENCES.urgent, texte: "Demande JAMAIS annoncée (aucune alerte réussie depuis " + Math.round((now - cree) / 60000) + " min)\n" + ligneCourse(c, a.nowP) });
  }
  /* 2. LA RELANCE TOURNE-T-ELLE ? Elle écrit son passage toutes les 20 s.
     Plus de 3 min sans passage : pg_cron, pg_net ou la fonction est à
     terre, et plus aucun rattrapage ni rappel ne part. */
  const tour = Date.parse(String((sante || {}).relance || ""));
  if (!Number.isFinite(tour) || now - tour > 3 * 60 * 1000) out.push({ cle: "systeme:relance", gravite: "critique", cadence: CADENCES.systeme, texte: "La relance automatique ne tourne plus" + (Number.isFinite(tour) ? " (dernier passage il y a " + Math.round((now - tour) / 60000) + " min)" : " (aucun passage enregistré)") + ". Les rappels et le rattrapage sont arrêtés." });
  /* 3. LES CANAUX : les 3 dernières tentatives Telegram toutes en échec
     (jeton révoqué, bot bloqué…). Un échec isolé suivi d'un succès n'est
     pas une panne. */
  const tg = j.filter(x => x.canal === "telegram" && x.type_evenement !== "vue").sort((x, y) => Date.parse(y.cree_le) - Date.parse(x.cree_le)).slice(0, 3);
  if (tg.length === 3 && tg.every(x => x.statut === "echec")) out.push({ cle: "systeme:telegram", gravite: "critique", cadence: CADENCES.systeme, texte: "Les " + tg.length + " derniers envois Telegram ont échoué : " + String(tg[0].detail || "").slice(0, 120) });
  const push = j.filter(x => x.canal === "push" && x.type_evenement !== "vue").sort((x, y) => Date.parse(y.cree_le) - Date.parse(x.cree_le)).slice(0, 3);
  if (push.length === 3 && push.every(x => x.statut === "echec")) out.push({ cle: "systeme:push", gravite: "alerte", cadence: CADENCES.systeme, texte: "Les notifications ELA échouent (" + String(push[0].detail || "").slice(0, 120) + ")." });
  /* 4. CONFIRMÉE SANS CHAUFFEUR À H-2 : le client croit sa voiture
     réservée. Toutes les 15 min, toutes les 5 min à H-30. S'arrête dès
     qu'un chauffeur est saisi. (Une course en ATTENTE est déjà relancée
     par nouvelle-demande : on ne la double pas ici.) */
  for (const c of a.sansChauffeur) {
    if (c.statut !== "confirmee") continue;
    const d = departCivil(c.bon); if (d === null) continue;
    const r = d - a.nowP; if (r > PROCHE_MS) continue;
    out.push({ cle: "sans_chauffeur:" + c.ref, ref: c.ref, gravite: r <= URGENT_MS ? "critique" : "alerte", cadence: r <= URGENT_MS ? CADENCES.urgent : CADENCES.proche, texte: "Course CONFIRMÉE sans chauffeur, départ dans " + Math.max(0, Math.round(r / 60000)) + " min\n" + ligneCourse(c, a.nowP) });
  }
  /* 5. EN RETARD : l'heure est passée de 30 min et la course n'est ni
     réalisée ni refusée. Faite et pas close, ou oubliée. Dite UNE fois. */
  for (const c of a.enRetard) {
    const d = departCivil(c.bon); if (d === null || a.nowP - d > VIEUX_MS) continue;
    out.push({ cle: "retard:" + c.ref, ref: c.ref, gravite: "alerte", cadence: CADENCES.unique, texte: "Départ passé, course toujours « " + c.statut + " » — à clore ou oubliée ?\n" + ligneCourse(c, a.nowP) });
  }
  /* 6. LES DOUBLONS. Dits une fois chacun. */
  const dbl = doublons(a.actives);
  for (const [x, y] of dbl.trajets) out.push({ cle: "doublon:" + [x, y].sort().join("+"), ref: y, gravite: "alerte", cadence: CADENCES.unique, texte: "Double réservation possible : " + x + " et " + y + " ont le même trajet, le même jour, à la même heure." });
  for (const [x, y, nom] of dbl.chauffeurs) out.push({ cle: "chauffeur_double:" + [x, y].sort().join("+"), ref: y, gravite: "alerte", cadence: CADENCES.unique, texte: "Chauffeur " + nom + " sur deux départs à moins d'une heure : " + x + " et " + y + "." });
  return out;
}

/* Faut-il (re)dire cette anomalie ? etat : ligne de alertes_pilotage. */
export function aDire(anomalie, etat, now = Date.now()) {
  if (!etat) return true;
  if (etat.resolue_le) return true;
  const acq = Date.parse(String(etat.acquittee_jusqu_au || ""));
  if (Number.isFinite(acq) && acq > now) return false;
  const dernier = Date.parse(String(etat.dernier_envoi || ""));
  return !Number.isFinite(dernier) || now - dernier >= anomalie.cadence;
}

/* ═══ LES QUESTIONS ═══
   Reconnues par mots-clés, accents et majuscules ignorés. Une question
   inconnue rend l'aide : jamais une réponse devinée. */
export function sansAccents(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").toLowerCase(); }
export function comprendre(texte) {
  const brut = String(texte || "").trim().slice(0, 200);
  const t = sansAccents(brut).replace(/^\//, "").replace(/@\w+/, "");
  const ref = /\b([A-Z]{2,4}-\d{2}-\d{2}-[0-9A-Z]{4,6})\b/.exec(brut.toUpperCase());
  if (ref) return { type: "statut", ref: ref[1] };
  if (/^(start|aide|help|\?|menu)\b/.test(t)) return { type: "aide" };
  if (/sans chauffeur|pas de chauffeur|sanschauffeur|chauffeur manquant/.test(t)) return { type: "sans_chauffeur" };
  if (/urgen/.test(t)) return { type: "urgentes" };
  if (/attention|a traiter|a faire|probleme|anomal/.test(t)) return { type: "attention" };
  if (/demain/.test(t)) return { type: "demain" };
  if (/aujourd|today|du jour/.test(t)) return { type: "aujourdhui" };
  if (/resume|bilan|activite|sante|etat general/.test(t)) return { type: "resume" };
  const h = /(?:hotel|hôtel)\s+(.{2,40})/.exec(t);
  if (h) return { type: "hotel", nom: h[1].trim() };
  if (/^hotel/.test(t)) return { type: "hotel", nom: "" };
  if (/statut|trace|ou en est/.test(t)) return { type: "statut", ref: "" };
  return { type: "aide" };
}

const LIMITE = 20;
function liste(titre, l, nowP, vide) {
  if (!l.length) return titre + "\n" + vide;
  const lignes = l.slice(0, LIMITE).map(c => "• " + ligneCourse(c, nowP));
  if (l.length > LIMITE) lignes.push("… et " + (l.length - LIMITE) + " autre(s) — voir l'admin.");
  return titre + "\n\n" + lignes.join("\n");
}
export const AIDE = "Assistant ELA — lecture seule.\n\nÉcrivez (ou touchez un bouton) :\n• aujourd'hui — les courses du jour\n• demain — celles de demain\n• urgent — ce qui presse (départ ≤ 2 h)\n• sans chauffeur — les courses à attribuer\n• attention — tout ce qui demande votre intervention\n• hotel easyhotel — les courses d'un hôtel\n• une référence (ELA-26-10-…) — son statut et son parcours\n• résumé — l'activité en bref\n\nAucune réponse ne porte le nom, le téléphone ni la chambre du client : ils restent dans l'admin.";
export const CLAVIER = { keyboard: [[{ text: "Attention" }, { text: "Urgent" }], [{ text: "Aujourd'hui" }, { text: "Demain" }], [{ text: "Sans chauffeur" }, { text: "Résumé" }]], resize_keyboard: true, is_persistent: true };

/* Le parcours d'une course : formulaire → serveur → alerte → vue → prise en
   charge. Ce qui n'a pas eu lieu est dit, pas tu. */
export function trace(c, journal, now = Date.now()) {
  const nowP = maintenantParis(now), bon = c.bon || {}, j = (journal || []).filter(x => x.course_ref === c.ref).sort((x, y) => Date.parse(x.cree_le) - Date.parse(y.cree_le));
  const heure = (iso) => { const d = new Date(maintenantParis(Date.parse(iso))); return d.toISOString().slice(8, 10) + "/" + d.toISOString().slice(5, 7) + " " + d.toISOString().slice(11, 16); };
  const premiere = (f) => j.find(f);
  const okTg = premiere(x => x.canal === "telegram" && x.statut === "envoye" && x.type_evenement !== "vue");
  const okPush = premiere(x => x.canal === "push" && x.statut === "envoye");
  const vue = premiere(x => x.type_evenement === "vue");
  const echecs = j.filter(x => x.statut === "echec").length;
  const l = [
    ligneCourse(c, nowP),
    "",
    "Origine : " + origine(bon),
    "1. Arrivée sur le serveur : " + (c.cree_le ? "oui, " + heure(c.cree_le) : "date inconnue"),
    "2. Alerte Telegram : " + (okTg ? "partie " + heure(okTg.cree_le) : "AUCUNE réussie"),
    "3. Notification ELA : " + (okPush ? "partie " + heure(okPush.cree_le) : "aucune réussie"),
    "4. Vue : " + (vue ? "oui, " + heure(vue.cree_le) + " (" + (vue.detail || vue.canal) + ")" : "pas encore"),
    "5. Chauffeur : " + (chauffeurDe(bon) || "aucun"),
    "6. Statut : " + c.statut,
  ];
  if (echecs) l.push("", echecs + " envoi(s) en échec au journal.");
  return l.join("\n");
}

/* La réponse à une question. donnees : { courses, journal, sante, course }. */
export function repondre(q, donnees, now = Date.now()) {
  const a = analyser(donnees.courses, now), nowP = a.nowP;
  switch (q.type) {
    case "aujourdhui": {
      const n = a.aujourdhui.length, faites = a.aujourdhui.filter(c => c.statut === "realisee").length;
      return liste("Aujourd'hui : " + n + " course(s), dont " + faites + " réalisée(s).", a.aujourdhui, nowP, "Aucune course prévue aujourd'hui.");
    }
    case "demain": return liste("Demain : " + a.demain.length + " course(s).", a.demain, nowP, "Aucune course prévue demain.");
    case "urgentes": return liste("Urgent : " + a.urgentes.length + " course(s) (départ ≤ 2 h en attente ou sans chauffeur).", a.urgentes, nowP, "Rien d'urgent. ✅");
    case "sans_chauffeur": return liste("Sans chauffeur : " + a.sansChauffeur.length + " course(s) à venir.", a.sansChauffeur, nowP, "Toutes les courses à venir ont un chauffeur. ✅");
    case "hotel": {
      if (!q.nom) return "Précisez l'hôtel : « hotel easyhotel ».";
      const n = sansAccents(q.nom).replace(/[^a-z0-9]/g, "");
      const l = a.valides.filter(c => { const b = c.bon || {}; return sansAccents((b.provenanceCle || "") + " " + (b.provenance || "")).replace(/[^a-z0-9]/g, "").includes(n); })
        .filter(c => !FINIS.has(c.statut) || (departCivil(c.bon) ?? 0) >= nowP - 7 * 86400000)
        .sort((x, y) => (departCivil(x.bon) ?? 0) - (departCivil(y.bon) ?? 0));
      return liste("Hôtel « " + q.nom + " » : " + l.length + " course(s) à venir ou des 7 derniers jours.", l, nowP, "Aucune course pour cet hôtel.");
    }
    case "statut": {
      if (!q.ref) return "Envoyez la référence, par exemple « ELA-26-10-AB3KZ ».";
      if (!donnees.course) return "Référence " + q.ref + " introuvable sur le serveur.\nSi le client l'a reçue, sa demande n'est jamais arrivée : elle n'existe que dans son message WhatsApp.";
      return trace(donnees.course, donnees.journal, now);
    }
    case "attention": {
      const ano = anomalies(donnees.courses, donnees.journal, donnees.sante, now);
      const blocs = [];
      if (ano.length) blocs.push("⚠ " + ano.length + " anomalie(s) :\n" + ano.slice(0, 10).map(x => "• " + x.texte).join("\n"));
      blocs.push(liste("En attente de réponse : " + a.enAttente.length, a.enAttente, nowP, "Aucune demande en attente. ✅"));
      const sc = a.sansChauffeur.filter(c => c.statut === "confirmee" && (departCivil(c.bon) ?? Infinity) - nowP <= 24 * 3600 * 1000);
      if (sc.length) blocs.push(liste("Confirmées sans chauffeur (24 h) : " + sc.length, sc, nowP, ""));
      if (a.enRetard.length) blocs.push(liste("Départ passé, à clore : " + a.enRetard.length, a.enRetard, nowP, ""));
      return blocs.join("\n\n");
    }
    case "resume": {
      const ano = anomalies(donnees.courses, donnees.journal, donnees.sante, now);
      const montant = a.aujourdhui.filter(c => c.statut !== "refusee" && c.statut !== "annulee").reduce((s, c) => s + (Number(((c.bon || {}).prix || {}).total) || 0), 0);
      const tour = Date.parse(String((donnees.sante || {}).relance || ""));
      return [
        "Résumé ELA — " + jourIso(nowP).split("-").reverse().join("/") + " " + new Date(nowP).toISOString().slice(11, 16),
        "",
        "Aujourd'hui : " + a.aujourdhui.length + " course(s) · " + a.aujourdhui.filter(c => c.statut === "realisee").length + " réalisée(s) · " + montant.toFixed(2).replace(".", ",") + " € prévus",
        "Demain : " + a.demain.length + " course(s)",
        "En attente de réponse : " + a.enAttente.length,
        "Sans chauffeur (à venir) : " + a.sansChauffeur.length,
        "Urgentes : " + a.urgentes.length,
        "Départ passé, à clore : " + a.enRetard.length,
        "",
        "Surveillance : " + (Number.isFinite(tour) && now - tour <= 3 * 60 * 1000 ? "relance active ✅" : "relance ARRÊTÉE ⚠") + " · " + (ano.length ? ano.length + " anomalie(s) — écrivez « attention »" : "aucune anomalie ✅"),
      ].join("\n");
    }
    default: return AIDE;
  }
}

/* Ce que le chien de garde EXTERNE (GitHub) a le droit de savoir : des
   codes, jamais une référence ni un trajet. L'appel se fait avec la clé
   publique du site : sa réponse est publique de fait. */
export function sante(courses, journal, etatSante, now = Date.now()) {
  const codes = [...new Set(anomalies(courses, journal, etatSante, now).filter(x => x.gravite === "critique").map(x => x.cle.split(":")[0] === "systeme" ? x.cle.split(":")[1] : x.cle.split(":")[0]))].sort();
  return { ok: codes.length === 0, codes };
}
