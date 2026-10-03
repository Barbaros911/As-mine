/* =====================================================================
   CHIEN-DE-GARDE.MJS — « est-ce que je reçois bien tout ? », toutes les 15 min
   ---------------------------------------------------------------------
   2 octobre 2026, à la demande de Barbaros : le projet démarre le 12, il
   veut être sûr de recevoir toutes les demandes, d'où qu'elles viennent.
   Le site envoie les alertes ; personne ne surveillait la sonnette
   elle-même. Si Telegram tombe, si la relance pg_cron s'arrête, si une
   demande reste sans alerte, rien ne le disait — on l'apprenait en perdant
   un client.

   CE FICHIER NE FAIT QUE JUGER. Le workflow lit une ligne JSON sur le
   serveur (sante-serveur.sql, lecture seule, aucune donnée personnelle) et
   la lui donne ; il rend « ok » ou la liste de ce qui cloche, en français,
   pour l'Issue. Séparé du workflow pour être ÉPROUVÉ sans réseau
   (test-chien-de-garde.mjs) : un chien de garde qui aboie à tort finit
   ignoré, et celui qui se tait sur une vraie panne ne sert à rien.

   IL N'ÉCRIT QU'EN CAS DE PANNE — jamais sur Telegram (il n'en veut pas
   plus), par une Issue unique qui se ferme seule au retour à la normale.
   ===================================================================== */

export function juger(sante) {
  const s = sante && typeof sante === "object" ? sante : null;
  if (!s) return { ok: false, pannes: ["Le serveur n'a pas rendu d'état lisible (réponse vide ou illisible)."] };
  const n = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  const pannes = [];

  const sansAlerte = n(s.sans_alerte);
  if (sansAlerte === null) pannes.push("Impossible de compter les demandes sans alerte.");
  else if (sansAlerte > 0) pannes.push(`${sansAlerte} demande(s) du site en attente depuis plus de 2 min SANS AUCUNE alerte réussie — Barbaros ne les a probablement pas vues.`);

  if (s.relance_active !== true) pannes.push("La relance automatique (tâche pg_cron « ela-relance-alertes ») est ABSENTE ou inactive : plus de rappel, plus de rattrapage.");

  const derniere = n(s.derniere_relance_s);
  if (s.relance_active === true) {
    if (derniere === null) pannes.push("La relance n'a jamais tourné (aucun passage enregistré).");
    else if (derniere > 300) pannes.push(`Le dernier passage de la relance remonte à ${Math.round(derniere / 60)} min (attendu : moins d'une minute).`);
  }

  const echecsRelance = n(s.relances_echouees_15min) || 0;
  if (echecsRelance >= 10) pannes.push(`${echecsRelance} passages de la relance en échec sur le dernier quart d'heure.`);

  const tgEchecs = n(s.telegram_echecs_1h) || 0, tgOk = n(s.telegram_ok_1h) || 0;
  if (tgEchecs > 0 && tgOk === 0) pannes.push(`Telegram refuse tous les envois depuis une heure (${tgEchecs} échec(s), 0 réussite) — jeton ou conversation à vérifier.`);

  return { ok: pannes.length === 0, pannes };
}

/* En ligne de commande : le JSON en argument ou sur l'entrée standard. */
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const brut = process.argv[2] ?? (await new Promise((r) => { let t = ""; process.stdin.on("data", (d) => t += d); process.stdin.on("end", () => r(t)); }));
  let sante = null;
  try {
    const j = JSON.parse(brut);
    /* L'API de gestion rend un tableau de lignes ; la ligne porte « sante ». */
    sante = Array.isArray(j) ? (j[0]?.sante ?? j[0] ?? null) : (j?.sante ?? j);
    if (typeof sante === "string") sante = JSON.parse(sante);
  } catch { sante = null; }
  const v = juger(sante);
  console.log(v.ok ? "ok — tout arrive" : "PANNE\n- " + v.pannes.join("\n- "));
  console.log("mesures : " + JSON.stringify(sante));
  process.exit(v.ok ? 0 : 1);
}
