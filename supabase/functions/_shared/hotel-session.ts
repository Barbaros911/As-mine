const DUREE_SESSION_MS = 12 * 60 * 60 * 1000;
const encodeur = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let brut = "";
  for (const octet of bytes) brut += String.fromCharCode(octet);
  return btoa(brut).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function depuisB64url(valeur: string): Uint8Array | null {
  try {
    const normalise = valeur.replace(/-/g, "+").replace(/_/g, "/");
    const rempli = normalise + "=".repeat((4 - normalise.length % 4) % 4);
    const brut = atob(rempli);
    return Uint8Array.from(brut, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function egaux(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

async function signature(message: string, secret: string): Promise<string> {
  const cle = await crypto.subtle.importKey(
    "raw",
    encodeur.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cle, encodeur.encode(message));
  return b64url(new Uint8Array(sig));
}

export function nomSecretHotel(cle: string): string {
  return "HOTEL_" + cle.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_CODE";
}

export async function creerSessionHotel(cle: string, secret: string): Promise<string> {
  const maintenant = Date.now();
  const contenu = b64url(encodeur.encode(JSON.stringify({
    v: 1,
    hotel: cle,
    iat: maintenant,
    exp: maintenant + DUREE_SESSION_MS,
  })));
  return contenu + "." + await signature(contenu, secret);
}

export async function validerSessionHotel(
  jeton: string,
  hotelAttendu: string,
  secret: string,
): Promise<boolean> {
  if (!jeton || jeton.length > 1500 || !secret) return false;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 2) return false;
  const attendue = await signature(morceaux[0], secret);
  if (!egaux(attendue, morceaux[1])) return false;
  const octets = depuisB64url(morceaux[0]);
  if (!octets) return false;
  try {
    const donnees = JSON.parse(new TextDecoder().decode(octets));
    return donnees?.v === 1
      && donnees?.hotel === hotelAttendu
      && Number.isFinite(donnees?.iat)
      && Number.isFinite(donnees?.exp)
      && donnees.iat <= Date.now() + 60_000
      && donnees.exp > Date.now()
      && donnees.exp - donnees.iat <= DUREE_SESSION_MS;
  } catch {
    return false;
  }
}
