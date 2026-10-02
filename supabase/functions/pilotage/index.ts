/* =====================================================================
   PILOTAGE — la sentinelle et le bilan de santé
   ---------------------------------------------------------------------
   02/10/2026, à la demande de Barbaros : « aucune réservation perdue,
   aucune double réservation, aucune alerte critique manquée ».

   DEUX APPELS, TOUS DEUX EN LECTURE SUR LES COURSES :
   - {type:"SENTINELLE"} — pg_cron, chaque minute. Relit les courses et le
     journal des alertes, cherche les anomalies (pilotage.js) et les envoie
     sur Telegram, chacune à SA cadence, jusqu'à ce qu'elle se règle. Elle
     n'écrit que dans ses deux tables (alertes_pilotage, sante_systeme).
   - {type:"SANTE"} — le chien de garde GitHub, toutes les 15 min. Rend
     {ok, codes}, jamais une référence ni un trajet : il est appelé avec la
     clé publique du site, sa réponse est donc publique de fait.

   CE QUE CETTE FONCTION NE FAIT PAS, ET NE DOIT PAS FAIRE : modifier une
   course. Une panne ici ne touche ni le dépôt des réservations
   (deposer-course), ni l'alerte immédiate (nouvelle-demande), ni la
   relance : ce sont trois chemins séparés. On perd une couche de
   surveillance, jamais une course.

   LE CORPS REÇU N'EST QU'UN SIGNAL. Comme nouvelle-demande, cette fonction
   est joignable avec la clé publique : n'importe qui peut l'appeler. Elle
   ne croit donc rien de l'appel — tout est relu en base, et la cadence
   vient de alertes_pilotage. L'appeler cent fois n'envoie rien de plus.
   ===================================================================== */
import { anomalies, aDire, sante } from "../_shared/pilotage.js";
import { db, lireJson, lireDonnees } from "../_shared/lecture-pilotage.ts";

const TOKEN = Deno.env.get("TELEGRAM_TOKEN") ?? "", CHAT = Deno.env.get("TELEGRAM_CHAT") ?? "";
const ADMIN = Deno.env.get("ADRESSE_ADMIN") ?? "https://elatransfer.com/ela-admin/";

async function telegram(texte: string, cle: string) {
  if (!TOKEN || !CHAT) return false;
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal,
      /* Aucun parse_mode : un tiret bas dans une adresse ferait rejeter tout
         le message, et l'alerte serait perdue sans un mot. */
      body: JSON.stringify({
        chat_id: CHAT, text: texte, disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: "Je m'en occupe — silence 30 min", callback_data: ("acq:" + cle).slice(0, 64) }], [{ text: "Ouvrir l'admin", url: ADMIN }]] },
      }),
    });
    return r.ok;
  } catch { return false; } finally { clearTimeout(t); }
}

async function sentinelle(): Promise<string> {
  const now = Date.now();
  const d = await lireDonnees(now);
  if (!d) return "lecture refusée";
  /* Le passage de la sentinelle est écrit d'abord : le chien de garde
     externe sait ainsi qu'elle tourne, même un jour sans anomalie. */
  await db("sante_systeme?on_conflict=cle", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ cle: "sentinelle", maj: new Date(now).toISOString() }) }).catch(() => null);

  const liste = anomalies(d.courses, d.journal, d.sante, now);
  const etats = await lireJson(`alertes_pilotage?select=cle,dernier_envoi,acquittee_jusqu_au,resolue_le,nb_envois&resolue_le=is.null`) || [];
  const parCle = new Map(etats.map(e => [e.cle, e]));
  let envoyees = 0;
  for (const a of liste) {
    const e = parCle.get(a.cle);
    if (!aDire(a, e, now)) continue;
    const prefixe = a.gravite === "critique" ? "🚨 ELA — " : "⚠️ ELA — ";
    const ok = await telegram(prefixe + a.texte, a.cle);
    await db("alertes_pilotage?on_conflict=cle", {
      method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ cle: a.cle, course_ref: a.ref ?? null, gravite: a.gravite, texte: a.texte.slice(0, 1000), dernier_envoi: new Date(now).toISOString(), dernier_statut: ok ? "envoye" : "echec", nb_envois: (e?.nb_envois ?? 0) + 1, resolue_le: null }),
    }).catch(() => null);
    if (ok) envoyees++;
  }
  /* CE QUI S'EST RÉGLÉ SE FERME : la course a reçu son chauffeur, la relance
     est repartie… Une anomalie qui revient plus tard repart de zéro. */
  const presentes = new Set(liste.map(a => a.cle));
  const reglees = etats.filter(e => !presentes.has(e.cle)).map(e => e.cle);
  for (const cle of reglees) {
    await db(`alertes_pilotage?cle=eq.${encodeURIComponent(cle)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ resolue_le: new Date(now).toISOString() }) }).catch(() => null);
  }
  return `sentinelle : ${liste.length} anomalie(s), ${envoyees} envoyée(s), ${reglees.length} réglée(s)`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("méthode refusée", { status: 405 });
  let charge: Record<string, unknown>;
  try { charge = await req.json(); } catch { return new Response("corps illisible", { status: 400 }); }
  if (charge.type === "SENTINELLE") return new Response(await sentinelle(), { status: 200 });
  if (charge.type === "SANTE") {
    const d = await lireDonnees();
    const corps = d ? sante(d.courses, d.journal, d.sante) : { ok: false, codes: ["lecture_base"] };
    /* Le passage de la sentinelle elle-même : si pg_cron est à terre, elle
       ne peut pas le dire, mais ce bilan, appelé de l'extérieur, le peut. */
    const tour = Date.parse(String(d?.sante?.sentinelle || ""));
    if (d && (!Number.isFinite(tour) || Date.now() - tour > 5 * 60 * 1000)) { corps.ok = false; corps.codes = [...corps.codes, "sentinelle"].sort(); }
    return new Response(JSON.stringify(corps), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return new Response("ignoré", { status: 200 });
});
