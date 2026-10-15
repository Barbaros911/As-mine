/* =====================================================================
   MESURE — la seule porte d'écriture de la mesure du trafic
   ---------------------------------------------------------------------
   15 octobre 2026, à la demande de Barbaros (« Analytics temps réel dans
   l'admin »). Le navigateur public (mesure.js) appelle cette fonction pour
   chaque événement : page vue, prix, formulaire, demande envoyée, appel,
   WhatsApp. Elle VALIDE, CLASSE LA SOURCE, LIT LE PAYS, PLAFONNE, puis
   écrit par la RPC ela_mesurer_evenement() (20261015000000_mesure_trafic.sql),
   qui déduplique et revalide. anon n'a aucun droit sur la table : sans cette
   fonction, rien ne s'écrit.

   CE QUI N'ENTRE JAMAIS ICI : nom, téléphone, adresse, chambre, prix, texte
   libre. Le corps est une liste FERMÉE de champs, chacun borné par une
   expression régulière ; tout le reste est ignoré ou refusé. L'adresse IP ne
   sert qu'au quota, hachée avec l'heure, et n'est jamais écrite. Le PAYS vient
   de l'en-tête « cf-ipcountry » que Cloudflare pose devant le site — deux
   lettres, rien de plus.

   LA SOURCE EST CLASSÉE ICI, PAS DANS LE NAVIGATEUR : une seule règle,
   éprouvée sans navigateur (test-securite-fonctions.mjs). Le navigateur envoie
   le domaine du référent de la PREMIÈRE page de la session, les UTM et le
   paramètre « src » de l'adresse, et les renvoie tels quels à chaque
   événement : la source d'une session ne change donc jamais en cours de
   route — une réservation faite trois pages après l'arrivée depuis Google
   reste « google », pas « direct ».

   UN ROBOT N'EST PAS UN CLIENT. Les user-agents qui se présentent comme tels
   (bot, crawl, spider, headless, lighthouse…) reçoivent 204 et rien n'est
   écrit. Pas de détection savante : elle serait fragile, et Googlebot se
   nomme. Le user-agent n'est jamais conservé.

   RIEN NE PEUT CASSER LE SITE : la fonction peut rendre 400, 403, 413, 429 ou
   503, le navigateur ne lit pas la réponse. Une panne ici = une mesure
   manquée, jamais une réservation perdue.
   ===================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 2_000;
const QUOTA_PAR_HEURE = 100;

const EVENEMENTS = new Set(["page_view", "price_click", "price_displayed", "booking_started",
  "booking_submitted", "call_click", "whatsapp_click"]);
const ESPACES = new Set(["public", "hotel-client", "pro"]);
const APPAREILS = new Set(["mobile", "tablette", "ordinateur"]);
const DETAIL_CLES = new Set(["aeroport", "gamme", "choix_wa", "ref"]);
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|facebookexternalhit|preview|scan|curl\/|wget\//i;

function reponse(status: number, body: Record<string, unknown>, origin = "") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}
function texte(v: unknown, max: number) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function identifiant(v: unknown) { const t = texte(v, 32); return /^[a-z0-9]{8,32}$/.test(t) ? t : ""; }
function chemin(v: unknown) {
  /* La page SANS sa chaîne de requête ni son ancre : « ?ok=… » porte une
     confirmation, « ?ref=… » une référence — rien de tout ça n'entre. */
  const t = texte(v, 200).split("?")[0].split("#")[0];
  return /^\/[^?#\s]{0,119}$/.test(t) ? t : "";
}
function domaine(v: unknown) {
  /* On accepte un domaine nu ou une adresse complète, et on ne garde que
     l'hôte en minuscules — jamais le chemin d'une page référente. */
  const t = texte(v, 300).toLowerCase();
  if (!t) return "";
  let h = t;
  try { if (/^[a-z]+:\/\//.test(t)) h = new URL(t).hostname; } catch (_e) { return ""; }
  h = h.replace(/^www\./, "");
  return /^[a-z0-9.-]{1,80}$/.test(h) ? h : "";
}
function utm(v: unknown) { return texte(v, 60).toLowerCase().replace(/[^a-z0-9 _.-]/g, "").slice(0, 60); }

/* ═══ LA SOURCE ═══ Du plus précis au plus général. « google_business » ne se
   devine pas : un lien posé sur la fiche Google arrive avec le même référent
   qu'une recherche. Il faut que le lien de la fiche porte « ?src=gbp » —
   c'est ce que Barbaros y colle, et c'est honnête : sans ce marqueur, c'est
   « google ». */
export function classerSource(e: { referent: string; utm_source: string; utm_medium: string; src: string; espace: string; hotel: boolean }) {
  const src = e.src.toLowerCase();
  if (src === "gbp" || src === "google-business") return "google_business";
  if (e.hotel || e.espace === "hotel-client" || src === "qr" || src === "flyer") return "hotel";
  if (src === "wa" || src === "whatsapp") return "whatsapp";
  const us = e.utm_source, um = e.utm_medium;
  if (us) {
    if (/google/.test(us) && /cpc|ppc|ads|paid/.test(um)) return "campagne";
    if (/google/.test(us)) return "google";
    if (/whatsapp/.test(us)) return "whatsapp";
    if (/facebook|instagram|tiktok|linkedin|twitter|x\.com|snapchat|youtube/.test(us)) return "social";
    return "campagne";
  }
  const r = e.referent;
  if (!r) return "direct";
  if (/(^|\.)google\.[a-z.]+$/.test(r) || r === "googleadservices.com" || r === "google.com") return "google";
  if (/(^|\.)(wa\.me|whatsapp\.com|l\.wl\.co)$/.test(r)) return "whatsapp";
  if (/(^|\.)(facebook\.com|instagram\.com|fb\.com|l\.facebook\.com|lm\.facebook\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|tiktok\.com|snapchat\.com|youtube\.com|youtu\.be|pinterest\.[a-z]+)$/.test(r)) return "social";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.[a-z.]+|qwant\.com|ecosia\.org|yandex\.[a-z]+|baidu\.com|brave\.com|startpage\.com)$/.test(r)) return "autre";
  return "referent";
}

async function sha256(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return reponse(204, {}, origin);
  if (req.method !== "POST") return reponse(405, { erreur: "méthode refusée" }, origin);
  if (!ORIGINS.has(origin)) return reponse(403, { erreur: "origine refusée" }, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE) return reponse(503, { erreur: "service indisponible" }, origin);

  /* Un robot déclaré : on répond poliment et on n'écrit rien. */
  if (ROBOT.test(req.headers.get("user-agent") ?? "")) return reponse(204, {}, origin);

  const brut = await req.text();
  if (brut.length > MAX_BODY) return reponse(413, { erreur: "trop long" }, origin);
  let entree: any = null;
  try { entree = JSON.parse(brut); } catch (_e) { entree = null; }
  if (!entree || typeof entree !== "object" || Array.isArray(entree)) return reponse(400, { erreur: "invalide" }, origin);

  const session = identifiant(entree.session), visiteur = identifiant(entree.visiteur);
  const evenement = texte(entree.evenement, 30);
  const page = chemin(entree.page), landing = chemin(entree.landing);
  const espace = texte(entree.espace, 20), appareil = texte(entree.appareil, 12);
  const langue = texte(entree.langue, 2).toLowerCase();
  if (!session || !visiteur || !EVENEMENTS.has(evenement) || !page || !ESPACES.has(espace)
      || !APPAREILS.has(appareil) || !/^[a-z]{2}$/.test(langue)) {
    return reponse(400, { erreur: "invalide" }, origin);
  }
  /* Le détail : quatre clés connues, des chaînes courtes. Tout le reste est
     IGNORÉ (pas refusé) : une clé de plus dans une vieille page en cache ne
     doit pas faire perdre l'événement entier. Une clé connue trop longue, si. */
  const detail: Record<string, string> = {};
  if (entree.detail && typeof entree.detail === "object" && !Array.isArray(entree.detail)) {
    for (const k of Object.keys(entree.detail)) {
      if (!DETAIL_CLES.has(k)) continue;
      const v = texte(entree.detail[k], 41);
      if (!v) continue;
      if (v.length > 40) return reponse(400, { erreur: "invalide" }, origin);
      if (k === "ref" && !/^ELA-[A-Z0-9-]{6,24}$/.test(v)) return reponse(400, { erreur: "invalide" }, origin);
      detail[k] = v;
    }
  }
  if (evenement === "booking_submitted" && !detail.ref) return reponse(400, { erreur: "invalide" }, origin);

  const referent = domaine(entree.referent);
  const utm_source = utm(entree.utm_source), utm_medium = utm(entree.utm_medium), utm_campaign = utm(entree.utm_campaign);
  const source = classerSource({ referent, utm_source, utm_medium, src: texte(entree.src, 20), espace, hotel: entree.hotel === true });
  const paysBrut = (req.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const pays = /^[A-Z]{2}$/.test(paysBrut) ? paysBrut : null;

  /* LE QUOTA : 100 événements par heure et par adresse, clé hachée, jamais
     l'adresse elle-même. Une réception et ses clients sur le même wifi
     restent loin dessous ; un script qui boucle s'arrête là. */
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue").split(",")[0].trim();
  const cle = await sha256("mesure|" + ip + "|" + new Date().toISOString().slice(0, 13));
  const quota = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cle: cle, p_limite: QUOTA_PAR_HEURE })
  }).catch(() => null);
  if (!quota || !quota.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  if ((await quota.json()) !== true) return reponse(429, { erreur: "trop d'événements" }, origin);

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ela_mesurer_evenement`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p: { session, visiteur, evenement, page, landing, source, referent: referent || null,
      utm_source: utm_source || null, utm_medium: utm_medium || null, utm_campaign: utm_campaign || null,
      langue, appareil, pays, espace, detail } })
  }).catch(() => null);
  if (!r) return reponse(503, { erreur: "service indisponible" }, origin);
  if (r.status === 400) return reponse(400, { erreur: "invalide" }, origin);
  if (!r.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  const compte = (await r.json().catch(() => null)) === true;
  return reponse(200, { ok: true, compte }, origin);
});
