import { lireContenuSigne, signerContenu } from "./session-signee.ts";

/* 30 JOURS (30/09/2026, à la demande de Barbaros : « personne ne verra le
   code à part la réception »). Il ne veut pas qu'on le redemande sans cesse.
   Le code ne disparaît pas pour autant : la clé de l'hôtel est publique (elle
   est dans les liens de la page du QR), c'est lui seul qui garde les noms et
   téléphones des clients. La session est signée avec une clé DÉRIVÉE du code
   (ci-dessous) : changer le code dans les secrets Supabase coupe aussitôt
   toutes les tablettes connectées. */
const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/* ═══ LA CLÉ DE SIGNATURE N'EST PLUS LE CODE LUI-MÊME (audit du 9 octobre
   2026, P1). Jusqu'ici le jeton était un HMAC dont la clé était le code de
   l'hôtel, tel quel. Or le jeton CIRCULE : il vit 30 jours dans le stockage
   de la tablette et part dans chaque requête. Qui en tenait un pouvait
   essayer des codes HORS LIGNE — sans le plafond de 60 essais par heure, sans
   l'attente de 700 ms : 500 000 essais par seconde et par cœur, mesuré. Un
   code au format « easyhotel-XXXXXX » tombait en quelques minutes.
   La clé est maintenant un condensé du code ET d'un secret qui ne sort
   jamais du serveur — la clé service_role, toujours présente dans
   l'exécution d'une fonction. Un jeton ne dit plus rien du code ; le seul
   endroit où un code s'essaie redevient le serveur, un essai à la fois.
   SANS CE SECRET, ON NE SIGNE RIEN ET ON NE VALIDE RIEN : un secret absent ne
   doit jamais valoir « tout est signé » (même règle que session-signee.ts).
   Les sessions signées à l'ancienne (v1, clé = le code) sont refusées :
   chaque tablette retape son code une fois. */
const VERSION_SESSION = 2;
const encodeur = new TextEncoder();

function poivre(): string {
  const d = (globalThis as { Deno?: { env?: { get(k: string): string | undefined } } }).Deno;
  try { return d?.env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; } catch (_e) { return ""; }
}

/* La clé HMAC d'un hôtel : vide si le code ou le secret serveur manque. */
export async function cleDeSignature(code: string): Promise<string> {
  const secret = poivre();
  if (!code || !secret) return "";
  const h = await crypto.subtle.digest(
    "SHA-256",
    encodeur.encode("elatransfer:hotel-session:v2:" + secret + ":" + code),
  );
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function nomSecretHotel(cle: string): string {
  return "HOTEL_" + cle.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_CODE";
}

/* Rend "" si rien ne peut être signé : l'appelant renvoie alors une session
   vide, et la tablette redemande le code — jamais une session non signée. */
export async function creerSessionHotel(cle: string, code: string): Promise<string> {
  const k = await cleDeSignature(code);
  if (!k) return "";
  const maintenant = Date.now();
  return await signerContenu({
    v: VERSION_SESSION,
    hotel: cle,
    iat: maintenant,
    exp: maintenant + DUREE_SESSION_MS,
  }, k);
}

export async function validerSessionHotel(
  jeton: string,
  hotelAttendu: string,
  code: string,
): Promise<boolean> {
  const k = await cleDeSignature(code);
  if (!k) return false;
  const donnees = await lireContenuSigne(jeton, k);
  if (!donnees) return false;
  return donnees.v === VERSION_SESSION
    && donnees.hotel === hotelAttendu
    && Number.isFinite(donnees.iat)
    && Number.isFinite(donnees.exp)
    && donnees.iat <= Date.now() + 60_000
    && donnees.exp > Date.now()
    && donnees.exp - donnees.iat <= DUREE_SESSION_MS;
}
