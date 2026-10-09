/* =====================================================================
   DEMANDE-DEMO — un professionnel demande la démo, et l'ouvre aussitôt
   ---------------------------------------------------------------------
   8 octobre 2026, mission « Démo professionnels » (bloc 2, le serveur).
   Parcours : /professionnels/ → formulaire → ICI → session →
   /demo/hotel/ s'ouvre tout de suite, au nom de l'établissement saisi. Un
   lien de confirmation part par e-mail sans rien bloquer. Barbaros est
   prévenu sur Telegram.

   ═══ AUCUNE CLÉ SUPABASE CÔTÉ NAVIGATEUR ═══
   Déployée --no-verify-jwt, comme telegram-bot : la page de démo ne porte
   aucune clé. Tout ce qui protège est donc ICI : origine, taille, champ
   piège, délai minimum de remplissage, quotas, validation, signature de la
   session — et Turnstile, s'il est configuré (voir plus bas).

   ═══ TURNSTILE EST FACULTATIF (bloc 4, décision de Barbaros : option B) ═══
   Sans le secret TURNSTILE_SECRET, la vérification est SAUTÉE : la
   protection repose sur le champ piège, le délai minimum et les quotas.
   Pour la réactiver, il suffit de poser le secret TURNSTILE_SECRET dans
   Supabase ET la clé publique du widget dans /professionnels/
   (constante CLE_TURNSTILE) : la page envoie alors « turnstile », et la
   fonction l'EXIGE comme avant. Aucune autre ligne à changer.

   ═══ LE CONTRAT (les blocs 1, 3 et 4 s'appuient dessus) ═══
   {action:"demander", type, etablissement, prenom, nom, fonction, email,
    telephone, langue, duree, site:"", turnstile (seulement si configuré)}
   « prenom » (9 octobre 2026) : présent = nouvelle page, il est EXIGÉ et
   « nom » est le nom de famille ; absent = page ancienne restée en cache,
   « nom » est le nom complet, comme avant.
     → 200 {session, expire, etablissement} · 400 {erreur:"champ", champ}
     · 403 {erreur:"robot"} · 429 {erreur:"quota"} · 503 {erreur:"indisponible"}
   {action:"ouvrir", session} → 200 {ok, etablissement, type, expire}
     · 401 {erreur:"session"}
   {action:"confirmer", jeton} → 200 {ok} · 410 {erreur:"jeton"}
   « expire » est une date ISO 8601 (UTC).

   ═══ CE QUI NE SORT JAMAIS ═══
   « domaine_pro » (adresse professionnelle ou grand public) : la base le
   calcule, Barbaros le lit, le navigateur jamais. Aucune adresse IP n'est
   gardée : les quotas la mêlent à l'heure dans une empreinte qui s'efface
   seule. Le jeton de confirmation n'existe en base que sous son empreinte.
   ===================================================================== */
import { b64url, lireContenuSigne, signerContenu } from "../_shared/session-signee.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
/* LE SECRET DES SESSIONS DE DÉMO SE FABRIQUE TOUT SEUL (8/10/2026, à la
   demande de Barbaros : « le minimum de manip »). Posé dans Supabase,
   DEMO_SESSION_SECRET l'emporte ; absent, on le dérive de la clé
   service_role, que la plateforme fournit à toute fonction et qui ne sort
   jamais du serveur — même méthode que le secret du webhook Telegram. Le
   libellé le sépare de tout autre usage de cette clé : une session de démo
   ne peut pas servir ailleurs, ni l'inverse. Changer la clé service_role
   ferme les démos ouvertes : elles durent sept jours, c'est acceptable. */
const SECRET_SESSION_POSE = Deno.env.get("DEMO_SESSION_SECRET") ?? "";
let secretSessionDerive: Promise<string> | null = null;
function secretSession(): Promise<string> {
  if (SECRET_SESSION_POSE) return Promise.resolve(SECRET_SESSION_POSE);
  if (!SERVICE_ROLE) return Promise.resolve("");
  return secretSessionDerive ??= sha256("elatransfer:demo-session:v1:" + SERVICE_ROLE);
}
const SECRET_TURNSTILE = Deno.env.get("TURNSTILE_SECRET") ?? "";
const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "";
const TELEGRAM_CHAT = Deno.env.get("TELEGRAM_CHAT") ?? "";
const RESEND_CLE = Deno.env.get("RESEND_CLE") ?? "";
const EMAIL_EXPEDITEUR = Deno.env.get("EMAIL_EXPEDITEUR") ?? "";

const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 4_000;
const DUREE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const LIEN_CONFIRMATION = "https://elatransfer.com/professionnels/?confirmer=";
/* LE DÉLAI MINIMUM : « duree » = millisecondes entre l'affichage du
   formulaire et l'envoi, mesurées par la page. Un humain met plus de 2,5 s
   à remplir six champs ; un robot qui poste directement n'en met aucune.
   Absent, illisible ou trop court : traité comme le champ piège. Le
   remplissage automatique du navigateur ne trompe pas ce contrôle : il faut
   encore lire et appuyer sur le bouton. */
const DUREE_MIN_MS = 2_500;

/* LES QUOTAS (propositions, à revoir avec Barbaros s'ils gênent).
   · 5 demandes par heure et par adresse IP : un hôtel remplit le formulaire
     une fois ; cinq laissent la place à une faute de frappe et à un collègue
     sur le même wifi.
   · 3 demandes par 24 h et par adresse e-mail, comptées DANS LA BASE (le
     compteur générique s'efface au bout de 70 min, il ne sait pas compter
     « par jour »). Au-delà, quelqu'un se sert du formulaire pour écrire à
     une adresse qui n'est pas la sienne.
   · 30 sessions FAUSSES et 20 confirmations par heure et par adresse IP.
     Une session juste ne consomme rien : la démo s'ouvre à chaque visite. */
const DEMANDES_PAR_HEURE_IP = 5;
const DEMANDES_PAR_JOUR_EMAIL = 3;
const OUVERTURES_FAUSSES_PAR_HEURE_IP = 30;
const CONFIRMATIONS_PAR_HEURE_IP = 20;

const TYPES = new Set(["hotel", "agence", "entreprise"]);
const LIBELLE_TYPE: Record<string, string> = { hotel: "Hôtel", agence: "Agence", entreprise: "Entreprise" };

function entetes(origin: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function reponse(status: number, corps: Record<string, unknown>, origin: string): Response {
  return new Response(JSON.stringify(corps), { status, headers: entetes(origin) });
}

async function sha256(v: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
function aleatoire(octets: number): string {
  return b64url(crypto.getRandomValues(new Uint8Array(octets)));
}

/* Un appel sortant (Turnstile, Telegram, Resend) ne retient jamais la
   réponse plus de 6 secondes. */
async function fetchLimite(url: string, init: RequestInit, ms = 6000): Promise<Response | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctl.signal }); }
  catch (_e) { return null; }
  finally { clearTimeout(t); }
}

function base(path: string, init: RequestInit = {}): Promise<Response | null> {
  return fetchLimite(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`,
               "Content-Type": "application/json", ...(init.headers ?? {}) },
  }, 8000);
}
async function rpc(nom: string, args: Record<string, unknown>): Promise<Response | null> {
  return base(`rpc/${nom}`, { method: "POST", body: JSON.stringify(args) });
}

function ipDe(req: Request): string {
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue")
    .split(",")[0].trim();
}
/* Le compteur générique de la passerelle publique (70 minutes, clé de 64
   caractères). La clé mêle l'usage, l'adresse et l'heure : jamais l'IP en
   clair. true = sous le plafond · false = plafond atteint · null = panne. */
async function quota(usage: string, req: Request, limite: number): Promise<boolean | null> {
  const cle = await sha256(`demo-${usage}|${ipDe(req)}|${new Date().toISOString().slice(0, 13)}`);
  const r = await rpc("consommer_quota_reservation", { p_cle: cle, p_limite: limite });
  if (!r || !r.ok) return null;
  try { return (await r.json()) === true; } catch (_e) { return null; }
}

/* ── LES CHAMPS ─────────────────────────────────────────────────────── */
/* Un texte : espaces resserrés, aucun caractère de contrôle, aucun chevron
   (il finira dans un message Telegram et dans un écran d'admin). */
function texte(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string") return min === 0 ? "" : null;
  const t = v.replace(/\s+/g, " ").trim();
  if (t.length < min || t.length > max) return null;
  if (/[\u0000-\u001f\u007f<>]/.test(t)) return null;
  return t;
}
function email(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  if (t.length > 254) return null;
  return /^[^\s@<>()",;:]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(t) ? t : null;
}
/* LA MÊME RÈGLE QUE telephone.js (telValide), puis la forme internationale
   qu'on compose sans réfléchir : « 06 12 34 56 78 » devient +33612345678.
   Deux règles séparées voudraient dire un numéro accepté par la page et
   refusé ici — et c'est le prospect qu'on ne rappellerait pas. */
export function telephoneNormalise(brut: unknown): string | null {
  const t = String(brut ?? "").trim();
  if (!t || t.length > 30) return null;
  const international = t.indexOf("+") === 0 || t.indexOf("00") === 0;
  let chiffres = t.replace(/\D/g, "");
  if (chiffres.indexOf("00") === 0) chiffres = chiffres.slice(2);
  if (/^(\d)\1+$/.test(chiffres)) return null;
  if (!international) {
    return chiffres.length === 10 && /^0[1-79]/.test(chiffres) ? "+33" + chiffres.slice(1) : null;
  }
  if (chiffres.indexOf("0") === 0) return null;
  return chiffres.length >= 8 && chiffres.length <= 15 ? "+" + chiffres : null;
}

/* ── TURNSTILE ─────────────────────────────────────────────────────────
   Vérifié ICI, jamais dans la page. true = humain · false = refusé ·
   null = Cloudflare injoignable (une panne n'est pas un robot : 503). */
async function turnstileOk(jeton: string, req: Request): Promise<boolean | null> {
  const corps = new URLSearchParams({ secret: SECRET_TURNSTILE, response: jeton });
  const ip = req.headers.get("cf-connecting-ip");
  if (ip) corps.set("remoteip", ip);
  const r = await fetchLimite("https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: corps });
  if (!r || !r.ok) return null;
  try { return (await r.json())?.success === true; } catch (_e) { return null; }
}

/* ── L'ALERTE À BARBAROS ───────────────────────────────────────────────
   Ce qu'il lui faut pour rappeler dans l'heure : qui, d'où, quel numéro.
   PAS l'adresse e-mail (elle est dans l'admin), seulement si elle est
   professionnelle. AUCUN parse_mode : un nom avec une étoile ou un tiret
   bas ferait rejeter tout le message par Telegram. Une panne ne fait
   JAMAIS échouer la demande. */
export function messageTelegram(p: Record<string, any>, domainePro: boolean | null): string {
  return [
    "Nouveau prospect — démo " + (LIBELLE_TYPE[p.type] ?? p.type).toLowerCase(),
    "Établissement : " + p.etablissement,
    "Type : " + (LIBELLE_TYPE[p.type] ?? p.type),
    "Nom : " + (p.prenom ? p.prenom + " " + p.nom : p.nom),
    "Fonction : " + (p.fonction || "—"),
    "Téléphone : " + p.telephone,
    "Adresse e-mail : " + (domainePro === null ? "—" : domainePro ? "professionnelle" : "grand public"),
    "Langue : " + (p.langue === "en" ? "anglais" : "français"),
  ].join("\n");
}
async function prevenirBarbaros(texteMessage: string): Promise<boolean> {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT) {
    console.warn("demande-demo : Telegram non configuré, alerte non envoyée");
    return false;
  }
  const r = await fetchLimite(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT, text: texteMessage, disable_web_page_preview: true }),
  });
  if (!r || !r.ok) console.warn("demande-demo : alerte Telegram en échec", r?.status ?? "réseau");
  return !!(r && r.ok);
}

/* ── L'E-MAIL AU PROSPECT ──────────────────────────────────────────────
   Seulement si Resend est configuré ; sinon on le journalise et rien ne
   bloque — la démo est déjà ouverte. */
export function emailConfirmation(langue: string, lien: string): { sujet: string; texte: string } {
  if (langue === "en") {
    return {
      sujet: "Confirm your email — Elatransfer demo",
      texte: "Hello,\n\nThank you for your interest in Elatransfer.\n"
        + "Please confirm your email address by opening this link (valid for 48 hours):\n"
        + lien + "\n\nWe will get back to you.\n\nElatransfer",
    };
  }
  return {
    sujet: "Confirmez votre adresse — démo Elatransfer",
    texte: "Bonjour,\n\nMerci de votre intérêt pour Elatransfer.\n"
      + "Confirmez votre adresse e-mail en ouvrant ce lien (valable 48 heures) :\n"
      + lien + "\n\nNous vous recontactons.\n\nElatransfer",
  };
}
async function envoyerEmail(destinataire: string, langue: string, lien: string): Promise<boolean> {
  if (!RESEND_CLE || !EMAIL_EXPEDITEUR) {
    console.warn("demande-demo : e-mail non configuré (RESEND_CLE / EMAIL_EXPEDITEUR), lien non envoyé");
    return false;
  }
  const m = emailConfirmation(langue, lien);
  const r = await fetchLimite("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_CLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_EXPEDITEUR, to: [destinataire], subject: m.sujet, text: m.texte }),
  });
  if (!r || !r.ok) console.warn("demande-demo : e-mail de confirmation en échec", r?.status ?? "réseau");
  return !!(r && r.ok);
}

/* ── LES TROIS ACTIONS ─────────────────────────────────────────────── */
async function demander(entree: any, req: Request, origin: string): Promise<Response> {
  const SECRET_SESSION = await secretSession();
  if (!SECRET_SESSION) return reponse(503, { erreur: "indisponible" }, origin);

  /* LE CHAMP PIÈGE ET LE DÉLAI MINIMUM : invisibles pour un humain. On rend
     une réponse qui a l'air normale — le robot n'apprend rien — et rien
     n'est écrit, rien n'est envoyé. La session factice ne s'ouvre pas. */
  const duree = entree.duree;
  const tropRapide = typeof duree !== "number" || !Number.isFinite(duree) || duree < DUREE_MIN_MS;
  if (typeof entree.site !== "string" || entree.site !== "" || tropRapide) {
    return reponse(200, {
      session: aleatoire(48) + "." + aleatoire(32),
      expire: new Date(Date.now() + DUREE_SESSION_MS).toISOString(),
      etablissement: texte(entree.etablissement, 0, 60) || "",
    }, origin);
  }

  const type = typeof entree.type === "string" && TYPES.has(entree.type) ? entree.type : null;
  if (!type) return reponse(400, { erreur: "champ", champ: "type" }, origin);
  const etablissement = texte(entree.etablissement, 2, 60);
  if (etablissement === null) return reponse(400, { erreur: "champ", champ: "etablissement" }, origin);
  /* LE PRÉNOM (9 octobre 2026). Absent : une page restée en cache envoie
     encore le nom complet dans « nom » — on l'accepte comme avant plutôt que
     de refuser un prospect pour une version de page. Présent : il est exigé,
     et « nom » est le nom de famille. */
  const avecPrenom = entree.prenom !== undefined && entree.prenom !== null;
  const prenom = avecPrenom ? texte(entree.prenom, 1, 60) : "";
  if (prenom === null) return reponse(400, { erreur: "champ", champ: "prenom" }, origin);
  const nom = texte(entree.nom, 2, 80);
  if (nom === null) return reponse(400, { erreur: "champ", champ: "nom" }, origin);
  const fonction = entree.fonction === undefined || entree.fonction === null ? "" : texte(entree.fonction, 0, 60);
  if (fonction === null) return reponse(400, { erreur: "champ", champ: "fonction" }, origin);
  const mail = email(entree.email);
  if (mail === null) return reponse(400, { erreur: "champ", champ: "email" }, origin);
  const telephone = telephoneNormalise(entree.telephone);
  if (telephone === null) return reponse(400, { erreur: "champ", champ: "telephone" }, origin);
  const langue = entree.langue === "en" ? "en" : "fr";
  /* Turnstile seulement s'il est configuré : sans secret, rien à vérifier. */
  const jetonTurnstile = typeof entree.turnstile === "string" ? entree.turnstile : "";
  if (SECRET_TURNSTILE && (!jetonTurnstile || jetonTurnstile.length > 2048)) {
    return reponse(403, { erreur: "robot" }, origin);
  }

  /* Le quota par adresse AVANT Turnstile : un robot qui insiste ne nous
     fait pas appeler Cloudflare cinq cents fois. */
  const q = await quota("demander", req, DEMANDES_PAR_HEURE_IP);
  if (q === null) return reponse(503, { erreur: "indisponible" }, origin);
  if (!q) return reponse(429, { erreur: "quota" }, origin);

  if (SECRET_TURNSTILE) {
    const humain = await turnstileOk(jetonTurnstile, req);
    if (humain === null) return reponse(503, { erreur: "indisponible" }, origin);
    if (!humain) return reponse(403, { erreur: "robot" }, origin);
  }

  /* Le jeton de confirmation : 32 octets tirés au sort. Seule son empreinte
     va en base ; le jeton lui-même ne vit que dans l'e-mail. */
  const jeton = aleatoire(32);
  const commun = {
    p_type: type, p_etablissement: etablissement, p_fonction: fonction,
    p_email: mail, p_telephone: telephone, p_langue: langue,
    p_jeton_empreinte: await sha256(jeton), p_par_jour: DEMANDES_PAR_JOUR_EMAIL,
  };
  let r = await rpc("ela_prospect_creer", prenom
    ? { ...commun, p_nom: nom, p_prenom: prenom }
    : { ...commun, p_nom: nom });
  /* LA BASE NE CONNAÎT PAS ENCORE LE PRÉNOM. La fusion déploie cette fonction
     AVANT que 20261009010000_prospects_prenom.sql soit appliquée : PostgREST
     répond alors 404 (PGRST202, « fonction introuvable avec ces
     paramètres »). On rappelle SANS p_prenom, et le nom complet va dans
     « nom » (80 caractères au plus, la limite de la colonne). Jamais de 503
     pour un prospect pendant la transition. */
  if (r && !r.ok && prenom) {
    const brut = await r.clone().text().catch(() => "");
    let code = "";
    try { code = String(JSON.parse(brut)?.code ?? ""); } catch (_e) { code = ""; }
    if (r.status === 404 || code === "PGRST202") {
      console.warn("demande-demo : base sans prénom, nom complet rangé dans « nom »");
      r = await rpc("ela_prospect_creer", { ...commun, p_nom: (prenom + " " + nom).slice(0, 80).trim() });
    }
  }
  if (!r) return reponse(503, { erreur: "indisponible" }, origin);
  if (!r.ok) {
    const brut = await r.text().catch(() => "");
    if (brut.includes("quota_email")) return reponse(429, { erreur: "quota" }, origin);
    /* JAMAIS le corps de l'erreur dans le journal : une contrainte refusée
       y recopie la ligne entière — nom, téléphone, e-mail du prospect. On
       ne garde que le statut et le code d'erreur PostgreSQL. */
    let code = "";
    try { code = String(JSON.parse(brut)?.code ?? "").slice(0, 8); } catch (_e) { code = ""; }
    console.warn("demande-demo : écriture refusée", r.status, code);
    return reponse(503, { erreur: "indisponible" }, origin);
  }
  let ligne: any = null;
  try { const l = await r.json(); ligne = Array.isArray(l) ? l[0] : l; } catch (_e) { ligne = null; }
  if (!ligne?.id) return reponse(503, { erreur: "indisponible" }, origin);

  const domainePro = typeof ligne.domaine_pro === "boolean" ? ligne.domaine_pro : null;
  await Promise.all([
    prevenirBarbaros(messageTelegram({ type, etablissement, prenom, nom, fonction, telephone, langue }, domainePro)),
    envoyerEmail(mail, langue, LIEN_CONFIRMATION + jeton),
  ]).catch(() => null);

  const exp = Date.now() + DUREE_SESSION_MS;
  const session = await signerContenu({ v: 1, p: ligne.id, e: etablissement, t: type, exp }, SECRET_SESSION);
  return reponse(200, { session, expire: new Date(exp).toISOString(), etablissement }, origin);
}

/* Une session est valable si ELLE est signée par CE secret, porte la bonne
   forme, et n'a pas expiré — et si sa durée n'excède pas sept jours : une
   session signée par erreur pour un an ne passe pas. */
export async function lireSessionDemo(session: unknown, secret: string): Promise<any | null> {
  if (typeof session !== "string") return null;
  const d = await lireContenuSigne(session, secret);
  if (!d || d.v !== 1) return null;
  if (typeof d.p !== "string" || !/^[0-9a-f-]{36}$/i.test(d.p)) return null;
  if (typeof d.e !== "string" || d.e.length > 60) return null;
  if (typeof d.t !== "string" || !TYPES.has(d.t)) return null;
  if (!Number.isFinite(d.exp) || d.exp <= Date.now() || d.exp > Date.now() + DUREE_SESSION_MS + 60_000) return null;
  return d;
}

async function ouvrir(entree: any, req: Request, origin: string): Promise<Response> {
  const SECRET_SESSION = await secretSession();
  if (!SECRET_SESSION) return reponse(503, { erreur: "indisponible" }, origin);
  const d = await lireSessionDemo(entree.session, SECRET_SESSION);
  if (!d) {
    const q = await quota("ouvrir", req, OUVERTURES_FAUSSES_PAR_HEURE_IP);
    if (q === false) return reponse(429, { erreur: "quota" }, origin);
    return reponse(401, { erreur: "session" }, origin);
  }
  const r = await rpc("ela_prospect_ouvrir", { p_id: d.p });
  if (!r || !r.ok) return reponse(503, { erreur: "indisponible" }, origin);
  /* Un prospect effacé (conservation dépassée) : sa session ne rouvre rien. */
  if ((await r.json().catch(() => null)) !== true) return reponse(401, { erreur: "session" }, origin);
  return reponse(200, { ok: true, etablissement: d.e, type: d.t, expire: new Date(d.exp).toISOString() }, origin);
}

async function confirmer(entree: any, req: Request, origin: string): Promise<Response> {
  const q = await quota("confirmer", req, CONFIRMATIONS_PAR_HEURE_IP);
  if (q === null) return reponse(503, { erreur: "indisponible" }, origin);
  if (!q) return reponse(429, { erreur: "quota" }, origin);
  const jeton = typeof entree.jeton === "string" ? entree.jeton : "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton)) return reponse(410, { erreur: "jeton" }, origin);
  const r = await rpc("ela_prospect_confirmer", { p_empreinte: await sha256(jeton) });
  if (!r || !r.ok) return reponse(503, { erreur: "indisponible" }, origin);
  if ((await r.json().catch(() => null)) !== true) return reponse(410, { erreur: "jeton" }, origin);
  return reponse(200, { ok: true }, origin);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") {
    if (!ORIGINS.has(origin)) return new Response("refusé", { status: 403 });
    return new Response(null, { status: 204, headers: {
      ...entetes(origin),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "600",
    } });
  }
  if (req.method !== "POST") return reponse(405, { erreur: "méthode" }, origin);
  /* Un navigateur envoie toujours son origine sur un POST : sans elle, ce
     n'est pas la page de démo qui appelle. */
  if (!ORIGINS.has(origin)) return reponse(403, { erreur: "origine" }, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE) return reponse(503, { erreur: "indisponible" }, origin);

  const longueur = Number(req.headers.get("content-length") || 0);
  if (longueur > MAX_BODY) return reponse(413, { erreur: "taille" }, origin);
  let brut = "";
  try { brut = await req.text(); } catch (_e) { return reponse(400, { erreur: "champ", champ: "corps" }, origin); }
  if (brut.length > MAX_BODY) return reponse(413, { erreur: "taille" }, origin);
  let entree: any;
  try { entree = JSON.parse(brut); } catch (_e) { return reponse(400, { erreur: "champ", champ: "corps" }, origin); }
  if (!entree || typeof entree !== "object" || Array.isArray(entree)) {
    return reponse(400, { erreur: "champ", champ: "corps" }, origin);
  }

  if (entree.action === "demander") return await demander(entree, req, origin);
  if (entree.action === "ouvrir") return await ouvrir(entree, req, origin);
  if (entree.action === "confirmer") return await confirmer(entree, req, origin);
  return reponse(400, { erreur: "champ", champ: "action" }, origin);
});
