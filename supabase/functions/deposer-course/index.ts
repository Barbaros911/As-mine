import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 24_000;

function reponse(status:number, body:Record<string,unknown>, origin="") {
  const headers:Record<string,string> = {
    "Content-Type":"application/json",
    "Cache-Control":"no-store",
    "Vary":"Origin"
  };
  if (ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), {status, headers});
}

function texte(v:unknown, max:number) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function nombre(v:unknown, min:number, max:number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function booleen(v:unknown) { return v === true; }
function entierPassagers(v:unknown) {
  if (typeof v === "number") return nombre(v, 1, 8);
  if (typeof v !== "string") return null;
  const m = v.match(/^\s*(\d+)/);
  return m ? nombre(m[1], 1, 8) : null;
}
function entierBagages(v:unknown) {
  if (typeof v === "number") return nombre(v, 0, 20);
  if (typeof v !== "string") return 0;
  const m = v.match(/(?:·|\s)(\d+)\s+bagage/i);
  return m ? nombre(m[1], 0, 20) : 0;
}
async function sha256(v:string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async (req:Request) => {
  const origin = req.headers.get("origin") ?? "";

  if (req.method === "OPTIONS") {
    if (!ORIGINS.has(origin)) return reponse(403, {erreur:"refusé"});
    return new Response(null, {status:204, headers:{
      "Access-Control-Allow-Origin":origin,
      "Access-Control-Allow-Methods":"POST, OPTIONS",
      "Access-Control-Allow-Headers":"content-type, apikey",
      "Access-Control-Max-Age":"600",
      "Vary":"Origin"
    }});
  }
  if (req.method !== "POST") return reponse(405, {erreur:"méthode refusée"}, origin);
  if (!ORIGINS.has(origin)) return reponse(403, {erreur:"origine refusée"});
  if (!SUPABASE_URL || !SERVICE_ROLE) return reponse(503, {erreur:"service indisponible"}, origin);

  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return reponse(413, {erreur:"requête trop grande"}, origin);

  let brut:string;
  try { brut = await req.text(); }
  catch { return reponse(400, {erreur:"requête illisible"}, origin); }
  if (brut.length > MAX_BODY) return reponse(413, {erreur:"requête trop grande"}, origin);

  let entree:any;
  try { entree = JSON.parse(brut); }
  catch { return reponse(400, {erreur:"requête invalide"}, origin); }

  const bon = entree?.bon;
  if (!bon || typeof bon !== "object" || Array.isArray(bon))
    return reponse(400, {erreur:"demande invalide"}, origin);

  const ref = texte(bon.ref, 32);
  const c = bon.course;
  const client = bon.client;
  const p = bon.prix;
  if (!/^ELA-[A-Z0-9-]{6,24}$/.test(ref) || !c || typeof c !== "object" || !client || typeof client !== "object" || !p || typeof p !== "object")
    return reponse(400, {erreur:"demande invalide"}, origin);

  const depart = texte(c.depart, 300);
  const arrivee = texte(c.arrivee, 300);
  const date = texte(c.date, 10);
  const heure = texte(c.heure, 5);
  const nom = texte(client.nom, 120);
  const tel = texte(client.telephone, 40);
  const vehicule = texte(c.vehicule, 40);
  const vehiculeCle = texte(c.vehiculeCle, 24);
  const paiement = texte(bon.paiement, 20);
  const total = nombre(p.total, 0, 5000);
  const distanceKm = nombre(c.distanceKm, 0, 1500);
  const passagers = entierPassagers(c.passagers);
  const bagages = entierBagages(c.passagers);

  if (!depart || !arrivee || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(heure) || !nom || tel.length < 6 || !vehicule || !["berline","van"].includes(vehiculeCle) || !["carte","especes"].includes(paiement) || total === null || distanceKm === null || passagers === null || bagages === null)
    return reponse(400, {erreur:"demande invalide"}, origin);

  const propre:any = {
    ref,
    cree: new Date().toISOString(),
    course: {
      type: texte(c.type, 40) || "Trajet simple",
      depart,
      arrivee,
      departPublic: texte(c.departPublic, 300) || depart,
      arriveePublic: texte(c.arriveePublic, 300) || arrivee,
      date,
      heure,
      terminal: texte(c.terminal, 40) || null,
      vol: texte(c.vol, 30),
      train: texte(c.train, 30),
      note: texte(c.note, 200),
      chambre: texte(c.chambre, 30),
      pancarte: booleen(c.pancarte),
      vehicule,
      vehiculeCle,
      passagers: texte(c.passagers, 80),
      passagersNombre: passagers,
      bagagesNombre: bagages,
      distanceKm,
      estimee: booleen(c.estimee)
    },
    client: { nom, telephone: tel },
    langue: ["fr","en"].includes(texte(bon.langue, 2)) ? texte(bon.langue, 2) : "fr",
    conditionsAcceptees: {
      version: texte(bon.conditionsAcceptees?.version, 20),
      langue: ["fr","en"].includes(texte(bon.conditionsAcceptees?.langue, 2)) ? texte(bon.conditionsAcceptees?.langue, 2) : "fr"
    },
    provenance: texte(bon.provenance, 120),
    provenanceCle: texte(bon.provenanceCle, 80),
    parReception: booleen(bon.parReception),
    paiement,
    paiementNom: texte(bon.paiementNom, 60),
    prix: {
      total,
      ht: Math.round((total / 1.10) * 100) / 100,
      tva: Math.round((total - total / 1.10) * 100) / 100,
      majoration: false,
      serveurVerifie: false
    }
  };

  /* Le tarif actuel est encore calculé dans le navigateur. La passerelle le
     conserve pour ne pas casser le parcours existant, mais le marque
     explicitement NON autoritatif. Le futur paiement #173 ne doit jamais
     créer/capturer un PaymentIntent depuis cette valeur : il utilisera un
     snapshot tarifaire recalculé et signé côté serveur. */
  const empreinteDepot = await sha256(JSON.stringify(propre));
  propre.securite = {
    empreinteDepot,
    prixServeurVerifie:false,
    provenanceServeurVerifie:false
  };

  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue").split(",")[0].trim();
  const cleQuota = await sha256(ip + "|" + new Date().toISOString().slice(0,13));
  const quota = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`, {
    method:"POST",
    headers:{apikey:SERVICE_ROLE, Authorization:`Bearer ${SERVICE_ROLE}`, "Content-Type":"application/json"},
    body:JSON.stringify({p_cle:cleQuota, p_limite:12})
  });
  if (!quota.ok) return reponse(503, {erreur:"service indisponible"}, origin);
  if ((await quota.json()) !== true) return reponse(429, {erreur:"trop de demandes"}, origin);

  /* Idempotence réelle : même référence + même contenu = succès rejouable ;
     même référence + contenu différent = conflit. On ne masque jamais un
     écrasement sous un faux 200. */
  const deja = await fetch(`${SUPABASE_URL}/rest/v1/courses?ref=eq.${encodeURIComponent(ref)}&select=bon&limit=1`, {
    headers:{apikey:SERVICE_ROLE, Authorization:`Bearer ${SERVICE_ROLE}`}
  });
  if (!deja.ok) return reponse(503, {erreur:"service indisponible"}, origin);
  const lignes = await deja.json();
  if (Array.isArray(lignes) && lignes.length) {
    if (lignes[0]?.bon?.securite?.empreinteDepot === empreinteDepot)
      return reponse(200, {ok:true, ref, rejoue:true}, origin);
    return reponse(409, {erreur:"référence déjà utilisée"}, origin);
  }

  const ins = await fetch(`${SUPABASE_URL}/rest/v1/courses`, {
    method:"POST",
    headers:{apikey:SERVICE_ROLE, Authorization:`Bearer ${SERVICE_ROLE}`, "Content-Type":"application/json", "Prefer":"return=minimal"},
    body:JSON.stringify({ref, statut:"attente", bon:propre})
  });
  if (ins.status === 409) return reponse(409, {erreur:"référence déjà utilisée"}, origin);
  if (!ins.ok) return reponse(503, {erreur:"service indisponible"}, origin);

  return reponse(201, {ok:true, ref}, origin);
});
