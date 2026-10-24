/* =====================================================================
   /etat DIT LES PRIORITÉS, ET NE SE TAIT JAMAIS
   ---------------------------------------------------------------------
   POURQUOI CETTE SUITE EXISTE (24 octobre 2026). etat.sh listait les
   Issues et les PR par « gh issue list » et « gh pr list », qui passent
   par GraphQL — refusé dans les sessions Claude Code du cloud. L'erreur
   partait dans /dev/null : « Issues [TEAM] ouvertes : » suivi de RIEN,
   alors que #164 et #399 étaient ouvertes. Une liste vide ressemble à
   « rien en cours » ; c'est le pire mensonge d'un outil d'état.

   Le même jour, les priorités (TEAM_RULES.md §11) sont venues s'y lire :
   les étiquettes P0…P3 des Issues ouvertes, trois actives au plus, P3 au
   parking. Le crochet SessionStart les affiche à l'ouverture de chaque
   session ; s'il casse, aucun agent ne voit plus les priorités, et rien ne
   proteste.

   CE QU'ELLE ÉPROUVE, avec un FAUX « gh » posé en tête du PATH (aucun
   réseau, aucune Issue réelle, aucune valeur du jour) :
     1. le calcul : plafond, parking hors plafond, PR écartées des Issues,
        double étiquette = la plus forte, P0 ouvert signalé ;
     2. etat.sh --court, de bout en bout, quand GitHub répond ;
     3. etat.sh quand GitHub NE répond PAS : il le dit en toutes lettres
        (l'ancien code, lui, affichait une liste vide — il tombe ici) ;
     4. la commande EXACTE du crochet de .claude/settings.json : elle rend
        les priorités, et ne fait jamais échouer l'ouverture d'une session.

   NI NAVIGATEUR NI RÉSEAU : « git fetch » est coupé (GIT_ALLOW_PROTOCOL).

   Usage :  node test-etat.mjs
   ===================================================================== */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rendrePriorites, rendreTeam, rendrePr, prioriteDe, ACTIVES_MAX }
  from "./.claude/outils/etat-github.mjs";

let ok = 0; const echecs = [];
function check(nom, condition, detail) {
  if (condition) { ok++; return; }
  echecs.push("  ✗ " + nom + (detail ? "\n      " + String(detail).slice(0, 900) : ""));
}

const issue = (number, labels, title = "Tâche " + number, extra = {}) =>
  ({ number, title, labels: labels.map(name => ({ name })), updated_at: "2026-01-01T00:00:00Z", ...extra });

/* ═══ 1. LE CALCUL ═══════════════════════════════════════════════════ */
{
  check("1 le plafond est celui de TEAM_RULES §11 (trois)", ACTIVES_MAX === 3, ACTIVES_MAX);

  const trop = Array.from({ length: ACTIVES_MAX + 1 }, (_, i) => issue(10 + i, ["P2"]));
  const t = rendrePriorites(trop).join("\n");
  check("1 au-delà du plafond, l'avertissement s'affiche", /PLUS DE 3 PRIORITÉS ACTIVES/.test(t), t);

  const juste = Array.from({ length: ACTIVES_MAX }, (_, i) => issue(20 + i, ["P1"]));
  const j = rendrePriorites([...juste, issue(30, ["P3"]), issue(31, ["P3"])]).join("\n");
  check("1 au plafond pile, pas d'avertissement", !/PLUS DE/.test(j), j);
  check("1 le parking (P3) ne compte pas dans les actives",
    /actives\s+3 \/ 3/.test(j) && /parking\s+2\b/.test(j), j);

  const pr = issue(40, ["P0"], "Une PR", { pull_request: { url: "x" } });
  const p = rendrePriorites([pr]).join("\n");
  check("1 une PR rendue par l'API des Issues n'est pas une priorité", /actives\s+0 \//.test(p), p);

  check("1 deux étiquettes : la plus forte gagne", prioriteDe(issue(41, ["P3", "P0"])) === "P0");
  check("1 une Issue sans étiquette n'a pas de priorité", prioriteDe(issue(42, ["bug"])) === null);

  const z = rendrePriorites([issue(50, ["P2"]), issue(51, ["P0"])]).join("\n");
  check("1 les actives sont rangées du P0 au P2", z.indexOf("#51") < z.indexOf("#50"), z);
  check("1 un P0 ouvert est signalé avant toute tâche plus basse", /P0 ouvert \(#51\)/.test(z), z);

  for (const [nom, rendu] of [["priorités", rendrePriorites(null)], ["Issues [TEAM]", rendreTeam(null)],
                               ["PR", rendrePr(null)]]) {
    check("1 " + nom + " : GitHub muet s'écrit en toutes lettres, jamais une liste vide",
      /n'a pas répondu/.test(rendu.join("\n")), rendu.join("\n"));
  }
  check("1 une liste vraiment vide le dit (« aucune »)",
    /aucune/.test(rendreTeam([]).join()) && /aucune/.test(rendrePr([]).join()));
}

/* ═══ 2 à 4. etat.sh ET LE CROCHET, AVEC UN FAUX gh ══════════════════ */
const dossier = mkdtempSync(join(tmpdir(), "test-etat-"));
try {
  const issuesJson = JSON.stringify([
    issue(901, ["P0"], "[TEAM] Réservation à fiabiliser"),
    issue(902, ["P3"], "Ombre du bouton"),
    issue(903, [], "[TEAM] Canal"),
    issue(904, ["P1"], "PR mêlée", { pull_request: { url: "x" } }),
  ]);
  const pullsJson = JSON.stringify([{ number: 905, title: "Une PR ouverte", head: { ref: "claude/essai" } }]);
  writeFileSync(join(dossier, "issues.json"), issuesJson);
  writeFileSync(join(dossier, "pulls.json"), pullsJson);

  const fauxGh = (nom, corps) => {
    const rep = join(dossier, nom);
    execFileSync("mkdir", ["-p", rep]);
    writeFileSync(join(rep, "gh"), "#!/bin/sh\n" + corps + "\n");
    chmodSync(join(rep, "gh"), 0o755);
    return rep;
  };
  const repondant = fauxGh("repond",
    `case "$*" in *issues*) cat "${dossier}/issues.json" ;; *pulls*) cat "${dossier}/pulls.json" ;; ` +
    `*) exit 1 ;; esac`);
  const muet = fauxGh("muet", "echo 'HTTP 403: GraphQL refusé' >&2; exit 1");

  const lancer = (binGh, commande) => {
    const env = { ...process.env, PATH: binGh + ":" + process.env.PATH,
      GIT_ALLOW_PROTOCOL: "none", TMPDIR: dossier, GH_PROMPT_DISABLED: "1" };
    try {
      return { code: 0, sortie: execFileSync("sh", ["-c", commande],
        { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 }) };
    } catch (e) { return { code: e.status ?? 1, sortie: String(e.stdout || "") + String(e.stderr || "") }; }
  };

  /* ═══ 2. GitHub répond ═══ */
  {
    const { code, sortie } = lancer(repondant, "sh .claude/outils/etat.sh --court");
    check("2 etat.sh --court sort avec 0", code === 0, sortie);
    check("2 il liste le P0 ouvert", /P0\s+#901\s+\[TEAM\] Réservation à fiabiliser/.test(sortie), sortie);
    check("2 il compte une active et un parking", /actives\s+1 \/ 3/.test(sortie) && /parking\s+1\b/.test(sortie), sortie);
    check("2 la PR mêlée aux Issues n'est pas comptée", !/#904/.test(sortie), sortie);
    check("2 il liste les PR ouvertes", /#905\s+Une PR ouverte\s+← claude\/essai/.test(sortie), sortie);
    check("2 il rappelle l'annonce avant une nouvelle tâche", /TEAM_RULES\.md §11/.test(sortie), sortie);
    check("2 le mode court ne lance aucun test", !/tests\.sh|playwright/i.test(sortie), sortie);

    const complet = lancer(repondant, "sh .claude/outils/etat.sh");
    check("2 etat.sh (complet) liste les Issues [TEAM], sans étiquette comprise",
      /#901 .*\[TEAM\] Réservation/.test(complet.sortie) && /#903 .*\[TEAM\] Canal/.test(complet.sortie),
      complet.sortie);
    check("2 etat.sh (complet) montre les priorités", /PRIORITÉS/.test(complet.sortie), complet.sortie);
  }

  /* ═══ 3. GitHub ne répond pas ═══ */
  {
    const { code, sortie } = lancer(muet, "sh .claude/outils/etat.sh");
    check("3 GitHub muet : etat.sh le dit en toutes lettres (l'ancien code affichait une liste vide)",
      (sortie.match(/n'a pas répondu/g) || []).length >= 2, sortie);
    check("3 …et ne fait pas croire qu'il n'y a rien en cours", !/aucune Issue ouverte étiquetée/.test(sortie), sortie);
    check("3 …et sort quand même avec 0 (un outil d'état ne bloque pas)", code === 0, sortie);
  }

  /* ═══ 4. La commande EXACTE du crochet SessionStart ═══ */
  {
    const reglages = JSON.parse(readFileSync(".claude/settings.json", "utf8"));
    const crochets = (reglages.hooks && reglages.hooks.SessionStart || []).flatMap(b => b.hooks || []);
    const c = crochets.find(h => /\.claude\/outils\/etat\.sh"?\s+--court/.test(h.command || ""));
    check("4 un crochet SessionStart lance « etat.sh --court »", !!c, JSON.stringify(crochets));
    if (c) {
      check("4 …borné dans le temps (30 s au plus)", typeof c.timeout === "number" && c.timeout <= 30, c.timeout);
      const bon = lancer(repondant, c.command);
      check("4 …il rend les priorités à l'ouverture", bon.code === 0 && /P0\s+#901/.test(bon.sortie), bon.sortie);
      const casse = lancer(muet, c.command + "; exit $?");
      check("4 …et GitHub muet ne fait jamais échouer l'ouverture d'une session", casse.code === 0, casse.sortie);
    }
  }
} finally {
  rmSync(dossier, { recursive: true, force: true });
}

console.log("");
if (echecs.length) {
  console.log("=== ÉCHECS (" + echecs.length + ") ===");
  console.log(echecs.join("\n"));
  console.log("\n=== " + ok + " contrôles au vert, " + echecs.length + " en échec ===");
  process.exit(1);
}
console.log("=== " + ok + " contrôles au vert ===");
