/* =====================================================================
   CLE-NOTIFICATIONS — rend la moitié PUBLIQUE de la paire VAPID
   ---------------------------------------------------------------------
   29/09/2026. La paire a été fabriquée sur le téléphone de Barbaros et
   posée dans les secrets Supabase ; Supabase ne remontre jamais une valeur
   enregistrée, et lui faire recopier la clé publique a échoué deux fois
   (le nom, puis l'empreinte). Le site la demande donc ici.
   ELLE EST PUBLIQUE PAR NATURE : le navigateur la reçoit de toute façon
   pour s'abonner. La moitié PRIVÉE ne sort JAMAIS d'ici — cette fonction
   ne la lit même pas.
   On ne rend qu'une clé bien formée (65 octets, point non compressé) : une
   valeur collée de travers ferait abonner des navigateurs à une clé que le
   service de push refusera ensuite, sans que personne ne le voie.
   ===================================================================== */
const entetes = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function bienFormee(cle: string): boolean {
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(cle)) return false;
  let b = cle.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  try {
    const brut = atob(b);
    return brut.length === 65 && brut.charCodeAt(0) === 4;
  } catch (_e) { return false; }
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erreur: "méthode refusée" }), { status: 405, headers: entetes });
  }
  const cle = (Deno.env.get("VAPID_PUBLIQUE") ?? "").trim();
  if (!bienFormee(cle)) {
    return new Response(JSON.stringify({ erreur: "clé non configurée" }), { status: 503, headers: entetes });
  }
  return new Response(JSON.stringify({ cle }), { headers: entetes });
});
