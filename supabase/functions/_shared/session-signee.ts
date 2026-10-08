/* =====================================================================
   LA SESSION SIGNÉE — UN SEUL OUTIL POUR LA RÉCEPTION ET LA DÉMO
   ---------------------------------------------------------------------
   8 octobre 2026 (démo professionnels, bloc 2). La signature HMAC vivait
   dans hotel-session.ts ; la démo en a besoin à l'identique. Deux copies
   d'un code de sécurité finissent par diverger — et c'est celle qu'on
   oublie de corriger qui laisse passer une session forgée.
   Le FORMAT ne change pas : « contenu.signature », contenu = JSON en
   base64url, signature = HMAC-SHA256 en base64url. Une session de
   réception émise avant ce partage reste valable (épreuve dans
   test-securite-fonctions.mjs).
   ===================================================================== */
const encodeur = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let brut = "";
  for (const octet of bytes) brut += String.fromCharCode(octet);
  return btoa(brut).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function depuisB64url(valeur: string): Uint8Array | null {
  try {
    if (!/^[A-Za-z0-9_-]*$/.test(valeur)) return null;
    const normalise = valeur.replace(/-/g, "+").replace(/_/g, "/");
    const rempli = normalise + "=".repeat((4 - normalise.length % 4) % 4);
    const brut = atob(rempli);
    return Uint8Array.from(brut, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/* UNE COMPARAISON QUI NE FUIT PAS PAR SA DURÉE : on compare tout, toujours. */
export function egaux(a: string, b: string): boolean {
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

export async function signerContenu(donnees: Record<string, unknown>, secret: string): Promise<string> {
  const contenu = b64url(encodeur.encode(JSON.stringify(donnees)));
  return contenu + "." + await signature(contenu, secret);
}

/* Rend le contenu SEULEMENT si la signature est juste. Sans secret, rien
   ne passe : un secret absent ne doit jamais valoir « tout est signé ». */
export async function lireContenuSigne(jeton: string, secret: string): Promise<any | null> {
  if (!jeton || typeof jeton !== "string" || jeton.length > 1500 || !secret) return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 2 || !morceaux[0] || !morceaux[1]) return null;
  const attendue = await signature(morceaux[0], secret);
  if (!egaux(attendue, morceaux[1])) return null;
  const octets = depuisB64url(morceaux[0]);
  if (!octets) return null;
  try {
    const donnees = JSON.parse(new TextDecoder().decode(octets));
    return donnees && typeof donnees === "object" && !Array.isArray(donnees) ? donnees : null;
  } catch {
    return null;
  }
}
