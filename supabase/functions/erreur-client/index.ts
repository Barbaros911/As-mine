/* =====================================================================
   ERREUR-CLIENT — une erreur JavaScript du site remonte, sans donnée
   personnelle (audit du 19 octobre 2026, observabilité)
   ---------------------------------------------------------------------
   Jusqu'ici une exception dans le tunnel de réservation ne se voyait que si
   un client appelait : le voyant, le chien de garde et le journal des dépôts
   refusés ne regardent que ce qui atteint le serveur. Une page qui casse
   AVANT le dépôt ne laissait aucune trace. La page envoie ici, détachée et
   sans attendre, le message de l'erreur, l'écran, l'espace et l'appareil ;
   l'admin compte les erreurs des 24 dernières heures (ela_erreurs_client_
   recentes) et en lit les cinq messages les plus fréquents.

   CE QUI NE PASSE JAMAIS : nom, téléphone, adresse, référence, adresse IP,
   navigateur complet. La page masque déjà les suites de six chiffres et les
   adresses e-mail ; on le refait ICI, parce qu'une vieille page en cache ne
   le fait pas forcément. Le message est borné à 200 signes, la source à 160.

   COMME « mesure » : origine stricte, corps minuscule, robots écartés, quota
   par adresse (30 par heure : une page qui boucle s'arrête là), puis
   écriture par une RPC réservée à la clé de service, qui purge les lignes de
   plus de 30 jours. Déployée --no-verify-jwt : la page appelle en
   « text/plain » sans clé. RIEN NE PEUT CASSER LE SITE : la page ne lit pas
   la réponse. Une panne ici = une erreur non comptée, jamais une réservation
   perdue. Tant que la migration n'est pas appliquée (RPC absente, 404), on
   rend 503 et on se tait.
   ===================================================================== */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 3_000;
const QUOTA_PAR_HEURE = 30;
const ESPACES = new Set(["public", "hotel", "reception", "admin", "autre"]);
const APPAREILS = new Set(["mobile", "tablette", "ordinateur"]);
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|pingdom|uptime|monitor|facebookexternalhit|preview|scan|curl\/|wget\//i;

function reponse(status: number, body: Record<string, unknown>, origin = "") {
  const headers: Record<string, string> = {
    "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}
function texte(v: unknown, max: number) { return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : ""; }
/* Ce qui pourrait identifier quelqu'un est masqué, même si la page l'a déjà
   fait : six chiffres de suite (un téléphone, un numéro de vol en est loin),
   une adresse e-mail, une adresse complète avec son protocole et sa requête. */
export function masquer(v: string): string {
  return v
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "…")
    .replace(/\d(?:[\s.-]?\d){5,}/g, "…")
    .replace(/https?:\/\/[^\s"')]+/g, (u) => { try { const x = new URL(u); return x.origin + x.pathname; } catch { return "…"; } });
}
async function sha256(v: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return reponse(204, {}, origin);
  if (req.method !== "POST") return reponse(405, { erreur: "méthode refusée" }, origin);
  if (!ORIGINS.has(origin)) return reponse(403, { erreur: "origine refusée" }, origin);
  if (!SUPABASE_URL || !SERVICE_ROLE) return reponse(503, { erreur: "service indisponible" }, origin);
  if (ROBOT.test(req.headers.get("user-agent") ?? "")) return reponse(204, {}, origin);

  const brut = await req.text();
  if (brut.length > MAX_BODY) return reponse(413, { erreur: "trop long" }, origin);
  let e: any = null;
  try { e = JSON.parse(brut); } catch (_e) { e = null; }
  if (!e || typeof e !== "object" || Array.isArray(e)) return reponse(400, { erreur: "invalide" }, origin);

  const espace = texte(e.espace, 12), message = masquer(texte(e.message, 200));
  const appareil = texte(e.appareil, 12), langue = texte(e.langue, 2).toLowerCase();
  const ecran = texte(e.ecran, 40), chemin = texte(e.chemin, 120) || "/";
  if (!ESPACES.has(espace) || !message) return reponse(400, { erreur: "invalide" }, origin);
  if (!/^\/[A-Za-z0-9/._-]*$/.test(chemin)) return reponse(400, { erreur: "invalide" }, origin);
  if (ecran && !/^[a-z0-9-]{1,40}$/.test(ecran)) return reponse(400, { erreur: "invalide" }, origin);
  const source = masquer(texte(e.source, 160));

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue").split(",")[0].trim();
  const cleQuota = await sha256("erreur|" + ip + "|" + new Date().toISOString().slice(0, 13));
  const quota = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_cle: cleQuota, p_limite: QUOTA_PAR_HEURE }),
  }).catch(() => null);
  if (!quota || !quota.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  if ((await quota.json()) !== true) return reponse(429, { erreur: "trop d'erreurs" }, origin);

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ela_erreur_client_ecrire`, {
    method: "POST", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p: { espace, chemin, ecran: ecran || null, message, source: source || null,
      appareil: APPAREILS.has(appareil) ? appareil : null, langue: /^[a-z]{2}$/.test(langue) ? langue : null } }),
  }).catch(() => null);
  if (!r || !r.ok) return reponse(503, { erreur: "service indisponible" }, origin);
  return reponse(204, {}, origin);
});
