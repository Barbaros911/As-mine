import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGINS = new Set(["https://elatransfer.com", "https://www.elatransfer.com"]);
const MAX_BODY = 24_000;

function json(status:number, body:Record<string,unknown>, origin="") {
  const headers:Record<string,string> = {"Content-Type":"application/json", "Cache-Control":"no-store", "Vary":"Origin"};
  if (ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), {status, headers});
}
function texte(v:unknown, max:number){ return typeof v === "string" ? v.trim().slice(0,max) : ""; }
function nombre(v:unknown, min:number, max:number){ const n=Number(v); return Number.isFinite(n) && n>=min && n<=max ? n : null; }
async function sha256(v:string){ const b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""); }

Deno.serve(async (req:Request) => {
  const origin=req.headers.get("origin") ?? "";
  if(req.method === "OPTIONS") {
    if(!ORIGINS.has(origin)) return json(403,{erreur:"refusé"});
    return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"content-type, apikey","Access-Control-Max-Age":"600","Vary":"Origin"}});
  }
  if(req.method !== "POST") return json(405,{erreur:"méthode refusée"},origin);
  if(!ORIGINS.has(origin)) return json(403,{erreur:"origine refusée"});
  const len=Number(req.headers.get("content-length") || 0);
  if(len > MAX_BODY) return json(413,{erreur:"requête trop grande"},origin);
  if(!SUPABASE_URL || !SERVICE_ROLE) return json(503,{erreur:"service indisponible"},origin);

  let brut:string;
  try { brut=await req.text(); } catch { return json(400,{erreur:"requête illisible"},origin); }
  if(brut.length > MAX_BODY) return json(413,{erreur:"requête trop grande"},origin);
  let entree:any;
  try { entree=JSON.parse(brut); } catch { return json(400,{erreur:"requête invalide"},origin); }
  const bon=entree?.bon;
  if(!bon || typeof bon !== "object" || Array.isArray(bon)) return json(400,{erreur:"demande invalide"},origin);

  const ref=texte(bon.ref,32);
  const c=bon.course;
  const client=bon.client;
  const prix=bon.prix;
  if(!/^ELA-[A-Z0-9-]{6,24}$/.test(ref) || !c || typeof c!=="object" || !client || typeof client!=="object" || !prix || typeof prix!=="object") return json(400,{erreur:"demande invalide"},origin);
  const depart=texte(c.depart,300), arrivee=texte(c.arrivee,300), date=texte(c.date,10), heure=texte(c.heure,5);
  const nom=texte(client.nom,120), tel=texte(client.telephone,40), vehicule=texte(c.vehicule,40), paiement=texte(bon.paiement,20);
  const total=nombre(prix.total,0,5000), passagers=nombre(c.passagers,1,8), bagages=nombre(c.bagages,0,20);
  if(!depart || !arrivee || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(heure) || !nom || tel.length<6 || !vehicule || !["carte","especes"].includes(paiement) || total===null || passagers===null || bagages===null) return json(400,{erreur:"demande invalide"},origin);

  const ip=(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "inconnue").split(",")[0].trim();
  const cle=await sha256(ip+"|"+new Date().toISOString().slice(0,13));
  const quota=await fetch(`${SUPABASE_URL}/rest/v1/rpc/consommer_quota_reservation`,{method:"POST",headers:{apikey:SERVICE_ROLE,Authorization:`Bearer ${SERVICE_ROLE}`,"Content-Type":"application/json"},body:JSON.stringify({p_cle:cle,p_limite:12})});
  if(!quota.ok) return json(503,{erreur:"service indisponible"},origin);
  if((await quota.json()) !== true) return json(429,{erreur:"trop de demandes"},origin);

  const propre:any={...bon,ref,client:{...client,nom,tel,telephone:tel},course:{...c,depart,arrivee,date,heure,vehicule,passagers,bagages},paiement,prix:{...prix,total}};
  delete propre.statut; delete propre.chauffeur; delete propre.chauffeurId; delete propre.operateur; delete propre.cree_le;
  propre.provenanceCle=texte(bon.provenanceCle,80);
  propre.parReception=Boolean(bon.parReception);

  const ins=await fetch(`${SUPABASE_URL}/rest/v1/courses`,{method:"POST",headers:{apikey:SERVICE_ROLE,Authorization:`Bearer ${SERVICE_ROLE}`,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify({ref,statut:"attente",bon:propre})});
  if(ins.status===409) return json(200,{ok:true,ref},origin);
  if(!ins.ok) return json(503,{erreur:"service indisponible"},origin);
  return json(201,{ok:true,ref},origin);
});