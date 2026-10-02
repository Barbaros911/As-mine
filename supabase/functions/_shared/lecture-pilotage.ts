/* =====================================================================
   LECTURE-PILOTAGE — ce que l'assistant et la sentinelle lisent en base
   ---------------------------------------------------------------------
   Une seule lecture pour les deux (telegram-bot et pilotage) : deux
   lectures écrites séparément finiraient par ne pas voir les mêmes
   courses, et l'assistant dirait « rien d'urgent » pendant que la
   sentinelle sonne.
   LECTURE SEULE, avec la clé service_role des secrets Supabase — jamais
   dans le site. Aucune écriture ici.
   ===================================================================== */
const U = Deno.env.get("SUPABASE_URL") ?? "", S = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export async function db(path: string, init: RequestInit = {}) {
  const h = new Headers(init.headers); h.set("apikey", S); h.set("Authorization", `Bearer ${S}`);
  if (init.body) h.set("Content-Type", "application/json");
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 10000);
  try { return await fetch(`${U}/rest/v1/${path}`, { ...init, headers: h, signal: ctrl.signal }); } finally { clearTimeout(t); }
}
export async function lireJson(path: string): Promise<any[] | null> {
  const r = await db(path).catch(() => null);
  if (!r || !r.ok) return null;
  const l = await r.json().catch(() => null);
  return Array.isArray(l) ? l : null;
}

/* Les courses utiles : toutes les actives (une réservation prise un mois à
   l'avance reste active), plus celles des 3 derniers jours. Rend null si
   une lecture échoue : mieux vaut « je ne sais pas » qu'un « rien d'urgent »
   calculé sur une liste vide. */
export async function lireDonnees(now = Date.now()) {
  if (!U || !S) return null;
  const depuis = new Date(now - 3 * 86400000).toISOString();
  const jour = new Date(now - 24 * 3600 * 1000).toISOString();
  const [actives, recentes, journal, etat] = await Promise.all([
    lireJson(`courses?select=ref,statut,bon,cree_le&statut=in.(attente,confirmee)&order=cree_le.desc&limit=1000`),
    lireJson(`courses?select=ref,statut,bon,cree_le&cree_le=gte.${encodeURIComponent(depuis)}&order=cree_le.desc&limit=1000`),
    lireJson(`journal_notifications_admin?select=type_evenement,course_ref,canal,statut,detail,cree_le&cree_le=gte.${encodeURIComponent(jour)}&order=cree_le.desc&limit=3000`),
    lireJson(`sante_systeme?select=cle,maj`),
  ]);
  if (!actives || !recentes || !journal) return null;
  const parRef = new Map<string, any>();
  for (const c of [...recentes, ...actives]) parRef.set(c.ref, c);
  const sante: Record<string, string> = {};
  for (const l of etat || []) sante[l.cle] = l.maj;
  return { courses: [...parRef.values()], journal, sante };
}

/* Une course précise, et TOUT son journal (pas seulement 24 h) : c'est le
   parcours complet qu'on veut voir. */
export async function lireCourse(ref: string) {
  const [c, j] = await Promise.all([
    lireJson(`courses?select=ref,statut,bon,cree_le&ref=eq.${encodeURIComponent(ref)}&limit=1`),
    lireJson(`journal_notifications_admin?select=type_evenement,course_ref,canal,statut,detail,cree_le&course_ref=eq.${encodeURIComponent(ref)}&order=cree_le.asc&limit=500`),
  ]);
  if (!c) return null;
  return { course: c[0] ?? null, journal: j || [] };
}
