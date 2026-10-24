#!/usr/bin/env node
/* =====================================================================
   CE QUE GITHUB DIT DU TRAVAIL : PRIORITÉS, ISSUES [TEAM], PR OUVERTES
   ---------------------------------------------------------------------
   Appelé par etat.sh. Il ne retient rien : il demande à GitHub, et il le
   dit en toutes lettres quand GitHub ne répond pas.

   POURQUOI CE FICHIER EXISTE (24 octobre 2026). etat.sh listait les Issues
   et les PR avec « gh issue list » et « gh pr list ». Ces deux commandes
   passent par l'API GraphQL, que les sessions Claude Code dans le cloud
   refusent ; l'erreur partait dans /dev/null. /etat affichait donc
   « Issues [TEAM] ouvertes : » suivi de RIEN, alors que #164 et #399
   étaient ouvertes — une liste vide qui ressemble à « rien en cours ».
   Ici on passe par l'API REST (« gh api »), qui répond partout, et une
   réponse absente s'écrit « GitHub n'a pas répondu », jamais un vide.

   LES PRIORITÉS (TEAM_RULES.md §11) se lisent sur les ÉTIQUETTES P0…P3
   des Issues ouvertes. Aucun fichier ne les recopie : il finirait faux.

   Usage :  node .claude/outils/etat-github.mjs            (tout)
            node .claude/outils/etat-github.mjs --court    (priorités et
                                                            PR seulement)
   ===================================================================== */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/* LE PLAFOND DE TEAM_RULES §11 : au-delà, une nouvelle tâche en remplace
   une, ou va au parking. */
export const ACTIVES_MAX = 3;
const ACTIVES = ["P0", "P1", "P2"];
const PARKING = "P3";

const rouge = (t, couleur) => couleur ? "\x1b[31m" + t + "\x1b[0m" : t;
const gras  = (t, couleur) => couleur ? "\x1b[1m" + t + "\x1b[0m" : t;

/* Une Issue qui porterait deux étiquettes de priorité prend la plus forte :
   un P0 étiqueté aussi P3 par mégarde reste un P0. */
export function prioriteDe(issue) {
  const noms = (issue.labels || []).map(l => typeof l === "string" ? l : l && l.name);
  return ["P0", "P1", "P2", "P3"].find(p => noms.includes(p)) || null;
}

/* L'API REST rend les PR mêlées aux Issues : on les écarte. */
const vraiesIssues = liste => liste.filter(i => i && !i.pull_request);

export function rendrePriorites(issues, couleur = false) {
  const l = [];
  if (!Array.isArray(issues)) {
    l.push("  " + rouge("GitHub n'a pas répondu", couleur)
      + " (gh absent, non connecté ou réseau coupé) :");
    l.push("  lire les Issues étiquetées P0 à P3 sur GitHub AVANT d'engager une tâche.");
    return l;
  }
  const ouvertes = vraiesIssues(issues);
  const actives = ouvertes.filter(i => ACTIVES.includes(prioriteDe(i)))
    .sort((a, b) => prioriteDe(a).localeCompare(prioriteDe(b)) || a.number - b.number);
  const parking = ouvertes.filter(i => prioriteDe(i) === PARKING);

  l.push("  actives    " + actives.length + " / " + ACTIVES_MAX);
  for (const i of actives) l.push("    " + prioriteDe(i) + "  #" + i.number + "  " + i.title);
  if (!actives.length) l.push("    aucune Issue ouverte étiquetée P0, P1 ou P2");
  l.push("  parking    " + parking.length + " (Issues P3, hors plafond)");

  if (actives.length > ACTIVES_MAX) {
    l.push("  " + rouge("PLUS DE " + ACTIVES_MAX + " PRIORITÉS ACTIVES ("
      + actives.length + ")", couleur)
      + " — en finir une, ou en passer une au parking, avant d'en ouvrir une autre.");
  }
  const haute = actives.find(i => ["P0", "P1"].includes(prioriteDe(i)));
  if (haute) {
    l.push("  → " + prioriteDe(haute) + " ouvert (#" + haute.number + ") : une tâche de priorité"
      + " plus basse se propose APRÈS lui, sauf décision de Barbaros.");
  }
  return l;
}

export function rendreTeam(issues) {
  if (!Array.isArray(issues)) return ["    GitHub n'a pas répondu — les lire sur GitHub."];
  const team = vraiesIssues(issues).filter(i => /\[TEAM\]/i.test(i.title || ""));
  if (!team.length) return ["    (aucune)"];
  return team.map(i => "    #" + i.number + "  " + String(i.updated_at || "").slice(0, 10)
    + "  " + i.title + (prioriteDe(i) ? "  [" + prioriteDe(i) + "]" : ""));
}

export function rendrePr(pulls) {
  if (!Array.isArray(pulls)) return ["    GitHub n'a pas répondu — les lire sur GitHub."];
  if (!pulls.length) return ["    (aucune)"];
  return pulls.map(p => "    #" + p.number + "  " + p.title
    + "  ← " + ((p.head && p.head.ref) || "?"));
}

/* ── Demander à GitHub ─────────────────────────────────────────────── */
function depot() {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const m = url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/i);
    return m ? m[1] : null;
  } catch { return null; }
}

/* Rend un tableau, ou null si GitHub n'a pas répondu (gh absent, refus,
   réseau, réponse illisible). Jamais une liste vide inventée. */
function demander(chemin) {
  try {
    const sortie = execFileSync("gh", ["api", chemin],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 });
    const json = JSON.parse(sortie);
    return Array.isArray(json) ? json : null;
  } catch { return null; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const court = process.argv.includes("--court");
  const couleur = !court && process.stdout.isTTY;
  const titre = t => court ? "── " + t : "\n" + gras("── " + t, couleur);
  const d = depot();
  const issues = d ? demander("repos/" + d + "/issues?state=open&per_page=100") : null;
  const pulls  = d ? demander("repos/" + d + "/pulls?state=open&per_page=100") : null;

  const l = [titre("PRIORITÉS (TEAM_RULES.md §11)"), ...rendrePriorites(issues, couleur)];
  if (court) {
    l.push("  PR ouvertes :", ...rendrePr(pulls));
  } else {
    l.push(titre("CE QUI ATTEND UNE RÉPONSE"),
      "  Issues [TEAM] ouvertes :", ...rendreTeam(issues),
      "  PR ouvertes :", ...rendrePr(pulls));
  }
  console.log(l.join("\n"));
}
