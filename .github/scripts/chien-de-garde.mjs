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

/* LE JUGE VIT DANS « admin-sante.js », À LA RACINE (4 octobre 2026). Le
   voyant de l'admin juge les mêmes mesures : deux copies de la règle
   finiraient par se contredire — un voyant vert pendant que l'Issue crie.
   Le fichier est un script de navigateur qui pose « ELA_SANTE » sur l'objet
   global ; Node le charge tel quel (le dépôt n'a pas « type: module », donc
   un .js est du CommonJS, et un import nommé échouerait). */
import '../../admin-sante.js';
export const juger = globalThis.ELA_SANTE.juger;

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
