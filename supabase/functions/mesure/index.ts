/* =====================================================================
   MESURE — la porte d'écriture de la mesure d'audience (15 octobre 2026)
   ---------------------------------------------------------------------
   Mission « Analytics temps réel dans l'admin ». Elle fait évoluer la
   mesure du 14 octobre (mesure.js → rpc/ela_mesurer, un compteur par jour)
   sans en créer une seconde : les pages et le moteur l'appellent pour chaque
   geste, elle valide, lit le pays, plafonne, puis écrit par
   « ela_mesurer_evenement » (20261015010000_mesure_trafic.sql), qui garde
   une ligne au journal ET incrémente le compteur d'origine.

   RIEN NE VIENT DU NAVIGATEUR QUI PUISSE IDENTIFIER : il n'envoie ni
   identifiant, ni cookie, rien de stocké chez lui. C'est ici qu'on calcule
   « sha256(adresse IP | navigateur) », et la base le mélange à une clé du
   jour qu'elle détruit le lendemain. L'adresse IP et le navigateur ne
   sortent pas de cette fonction — ni en base, ni dans un journal.

   LE CORPS EST UNE LISTE FERMÉE. Chaque champ est borné par une expression
   régulière ; une clé inconnue du détail est ignorée (une vieille page en
   cache ne doit pas perdre le geste), une valeur connue hors format refuse
   le geste. Jamais de nom, de téléphone, d'adresse, de prix.

   LA SOURCE EST CLASSÉE ICI, UNE SEULE RÈGLE, éprouvée sans navigateur
   (test-securite-fonctions.mjs). Le lien d'un partenaire (« ?via= ») est
   reconnu par la base, qui en fait la source « partenaire ». La fiche
   Google se distingue d'une recherche par ses UTM (« utm_medium=gbp » ou
   « utm_campaign=gbp ») : sans eux c'est « google », et c'est honnête.

   UN ROBOT N'EST PAS UN CLIENT : un navigateur qui se dit robot reçoit 204
   et rien n'est écrit. RIEN NE PEUT CASSER LE SITE : la page ne lit pas la
   réponse. Une panne ici = un geste non compté, jamais une réservation perdue.
   ===================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 2_000;
const QUOTA_PAR_HEURE = 100;

const EVENEMENTS = new Set(["page_vue", "clic_reserver", "clic_appel", "clic_whatsapp", "moteur_ouvert",
  "formulaire_commence", "prix_demande", "prix_affiche", "demande_envoyee"]);
const APPAREILS = new Set(["mobile", "tablette", "ordinateur"]);
const DETAIL_CLES = new Set(["aeroport", "gamme", "choix_wa", "ref"]);
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|facebookexternalhit|preview|scan|curl\/|wget\//i;

function reponse(status: number, body: Record<string, unknown>, origin = "") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}
function texte(v: unknown, max: number) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function cle(v: unknown) { const t = texte(v, 41); return /^[a-z0-9-]{2,40}$/.test(t) ? t : ""; }
function domaine(v: unknown) {
  /* Un domaine nu ou une adresse complète : on ne garde que l'hôte, en
     minuscules — jamais le chemin d'une page référente. */
  const t = texte(v, 300).toLowerCase();
  if (!t) return "";
  let h = t;
  try { if (/^[a-z]+:\/\//.test(t)) h = new URL(t).hostname; } catch (_e) { return ""; }
  h = h.replace(/^www\./, "");
  return /^[a-z0-9.-]{1,80}$/.test(h) ? h : "";
}
function utm(v: unknown) { return texte(v, 60).toLowerCase().replace(/[^a-z0-9 _.-]/g, "").slice(0, 60); }

export function classerSource(e: { referent: string; utm_source: string; utm_medium: string; utm_campaign: string }) {
  const us = e.utm_source, um = e.utm_medium, uc = e.utm_campaign;
  if (um === "gbp" || uc === "gbp" || us === "gbp" || us === "google-business") return "google_business";
  if (us) {
    if (/google/.test(us) && /cpc|ppc|ads|paid/.test(um)) return "campagne";
    if (/google/.test(us)) return "google";
    if (/whatsapp/.test(us)) return "whatsapp";
    if (/facebook|instagram|tiktok|linkedin|twitter|snapchat|youtube/.test(us)) return "social";
    return "campagne";
  }
  const r = e.referent;
  if (!r) return "direct";
  if (/(^|\.)google\.[a-z.]+$/.test(r) || r === "googleadservices.com") return "google";
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(r)) return "whatsapp";
  if (/(^|\.)(facebook\.com|instagram\.com|fb\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|tiktok\.com|snapchat\.com|youtube\.com|youtu\.be|pinterest\.[a-z]+)$/.test(r)) return "social";
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
  const navigateur = req.headers.get("user-agent") ?? "";
  if (ROBOT.test(navigateur)) return reponse(204, {}, origin);

  const brut = await req.text();
  if (brut.length > MAX_BODY) return reponse(413, { erreur: "trop long" }, origin);
  let e: any = null;
  try { e = JSON.parse(brut); } catch (_e) { e = null; }
  if (!e || typeof e !== "object" || Array.isArray(e)) return reponse(400, { erreur: "invalide" }, origin);

  const evenement = texte(e.evenement, 30), page = cle(e.page);
  const appareil = texte(e.appareil, 12), langue = texte(e.langue, 2).toLowerCase();
  if (!EVENEMENTS.has(evenement) || !page || !APPAREILS.has(appareil) || !/^[a-z]{2}$/.test(langue)) {
    return reponse(400, { erreur: "invalide" }, origin);
  }
  const detail: Record<string, string> = {};
  if (e.detail && typeof e.detail === "object" && !Array.isArray(e.detail)) {
    for (const k of Object.keys(e.detail)) {
      if (!DETAIL_CLES.has(k)) continue;
      const v = texte(e.detail[k], 41);
      if (!v) continue;
      if (v.length > 40) return reponse(400, { erreur: "invalide" }, origin);
      if (k === "ref" && !/^ELA-[A-Z0-9-]{6,24}$/.test(v)) return reponse(400, { erreur: "invalide" }, origin);
      detail[k] = v;
    }
  }
  if (evenement === "demande_envoyee" && !detail.ref) return reponse(400, { erreur: "invalide" }, origin);

  const referent = domaine(e.referent);
  const utm_source = utm(e.utm_source), utm_medium = utm(e.utm_medium), utm_campaign = utm(e.utm_campaign);
  const source = classerSource({ referent, utm_source, utm_medium, utm_campaign });
  const paysBrut = (req.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const pays = /^[A-Z]{2}$/.test(paysBrut) ? paysBrut : null;
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue").split(",")[0].trim();

  /* LE QUOTA : 100 gestes par heure et par adresse, sur une clé hachée.
     Une réception et ses clients sur le même wifi restent loin dessous ; un
     script qui boucle s'arrête là. */
  const cleQuota = await sha256("mesure|" + ip + "|" + new Date().toISOString().slice(0, 13));
  const quota = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cle: cleQuota, p_limite: QUOTA_PAR_HEURE })
  }).catch(() => null);
  if (!quota || !quota.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  if ((await quota.json()) !== true) return reponse(429, { erreur: "trop de gestes" }, origin);

  const empreinte = await sha256(ip + "|" + navigateur);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ela_mesurer_evenement`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p: { evenement, page, source, lien: cle(e.lien) || null, referent: referent || null,
      utm_source: utm_source || null, utm_medium: utm_medium || null, utm_campaign: utm_campaign || null,
      langue, appareil, pays, detail }, p_brute: empreinte })
  }).catch(() => null);
  if (!r) return reponse(503, { erreur: "service indisponible" }, origin);
  /* LE REPLI DE LA MISE EN SERVICE. La fonction se déploie à la fusion, la
     migration s'applique à la main ensuite : entre les deux, la RPC n'existe
     pas (404). Les pages n'appellent plus le compteur du 14 octobre
     elles-mêmes — sans ce repli, le registre (« Les pages du site », « Liens
     des partenaires ») cesserait de compter pendant ce temps. On lui passe
     donc le geste, comme le faisait la page. Les deux gestes de prix sont
     nouveaux : il ne les connaît pas. */
  if (r.status === 404) {
    if (evenement === "prix_demande" || evenement === "prix_affiche") return reponse(200, { ok: true, compte: false }, origin);
    const ancien = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ela_mesurer`, {
      method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_page: page, p_evenement: evenement, p_source: cle(e.lien) || null })
    }).catch(() => null);
    if (!ancien || !ancien.ok) return reponse(503, { erreur: "service indisponible" }, origin);
    return reponse(200, { ok: true, compte: true }, origin);
  }
  if (r.status === 400) return reponse(400, { erreur: "invalide" }, origin);
  if (!r.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  const compte = (await r.json().catch(() => null)) === true;
  return reponse(200, { ok: true, compte }, origin);
});
