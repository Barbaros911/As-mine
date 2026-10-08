import { lireContenuSigne, signerContenu } from "./session-signee.ts";

/* 30 JOURS (30/09/2026, à la demande de Barbaros : « personne ne verra le
   code à part la réception »). Il ne veut pas qu'on le redemande sans cesse.
   Le code ne disparaît pas pour autant : la clé de l'hôtel est publique (elle
   est dans les liens de la page du QR), c'est lui seul qui garde les noms et
   téléphones des clients. La session est signée AVEC le code : changer le code
   dans les secrets Supabase coupe aussitôt toutes les tablettes connectées. */
const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function nomSecretHotel(cle: string): string {
  return "HOTEL_" + cle.toUpperCase().replace(/[^A-Z0-9]+/g, "_") + "_CODE";
}

export async function creerSessionHotel(cle: string, secret: string): Promise<string> {
  const maintenant = Date.now();
  return await signerContenu({
    v: 1,
    hotel: cle,
    iat: maintenant,
    exp: maintenant + DUREE_SESSION_MS,
  }, secret);
}

export async function validerSessionHotel(
  jeton: string,
  hotelAttendu: string,
  secret: string,
): Promise<boolean> {
  const donnees = await lireContenuSigne(jeton, secret);
  if (!donnees) return false;
  return donnees.v === 1
    && donnees.hotel === hotelAttendu
    && Number.isFinite(donnees.iat)
    && Number.isFinite(donnees.exp)
    && donnees.iat <= Date.now() + 60_000
    && donnees.exp > Date.now()
    && donnees.exp - donnees.iat <= DUREE_SESSION_MS;
}
