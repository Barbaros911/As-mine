#!/usr/bin/env node
/* =====================================================================
   GARDE-FOU AVANT UN « git commit »
   ---------------------------------------------------------------------
   Trois erreurs déjà commises sur ce dépôt, que rien n'attrapait :

   1. CACHE non incrémenté dans sw.js. Le site part en ligne et les
      téléphones qui ont INSTALLÉ l'application continuent de servir
      l'ancienne page. Barbaros a publié et n'a rien vu changer.
   2. Un fichier appelé par index.html mais absent de construire.sh. Il
      marche parfaitement en local — le serveur de test sert tout le
      dépôt — et rend un 404 en ligne. Arrivé avec « carte/ », puis
      « exploitant/ ».
   3. Un secret dans un fichier suivi. La clé VAPID privée a failli
      partir, écrite en clair dans un test. Le dépôt est PUBLIC.

   Ce fichier est appelé par Claude Code avant chaque commande « git ».
   Il ne fait rien d'autre que lire et refuser : il ne modifie rien.
   Code de sortie 2 = on bloque, le message part vers Claude.
   ===================================================================== */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

/* Ce que le service worker garde sur le téléphone du client. Un
   changement ici sans nouveau numéro de CACHE ne se voit pas chez lui.
   sw.js n'y est PAS : c'est le fichier qui PORTE le numéro, exiger un
   incrément à chaque virgule qu'on y corrige serait du bruit. */
const SERVIS = [
  /^index\.html$/,
  /^manifest(-exploitant)?\.webmanifest$/,
  /^icon(-maskable)?\.svg$/,
  /^icon-180\.png$/,
  /^carte\//,
  /^exploitant\//,
];

/* Motifs à très forte certitude seulement. Un garde-fou qui crie pour
   rien finit par être désactivé, et il ne protège plus de rien. */
const SECRETS = [
  [/\bghp_[A-Za-z0-9]{36}\b/, "un jeton GitHub (ghp_…)"],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/, "un jeton GitHub (github_pat_…)"],
  [/\bsbp_[a-f0-9]{40}\b/, "un jeton d'accès Supabase (sbp_…)"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "une clé privée"],
];

const git = (...a) => execFileSync("git", a, { encoding: "utf8" });

/* ON SE PLACE À LA RACINE DU DÉPÔT, quel que soit l'endroit d'où la
   commande est lancée. Sans ça, un commit fait depuis « sites/alfredo/ »
   ne trouverait ni sw.js ni construire.sh — et les gardes, protégés par
   « existsSync », se tairaient. Un contrôle muet passe pour un contrôle
   réussi : c'est la pire façon de ne pas protéger. */
try {
  process.chdir(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
} catch { process.exit(0); }
const doux = (...a) => { try { return git(...a); } catch { return null; } };

/* ── Est-ce bien un « git commit » ? ───────────────────────────────── */
let entree = "";
try { entree = readFileSync(0, "utf8"); } catch { process.exit(0); }
let commande = "";
try { commande = JSON.parse(entree)?.tool_input?.command ?? ""; } catch { process.exit(0); }
if (!/git\s+(-\S+\s+|--\S+\s+)*commit\b/.test(commande)) process.exit(0);

/* Sur « --amend » on se compare au commit d'AVANT celui qu'on refait :
   sinon le numéro de cache déjà incrémenté par ce commit passerait pour
   inchangé, et on bloquerait une correction parfaitement propre. */
const amend = /--amend\b/.test(commande);
const base = amend ? "HEAD~1" : "HEAD";

const griefs = [];

/* ── 1. Le numéro de cache ─────────────────────────────────────────── */
const prepares = (doux("diff", "--cached", "--name-only") ?? "")
  .split("\n").filter(Boolean);

if (prepares.length) {
  const touches = prepares.filter((f) => SERVIS.some((r) => r.test(f)));
  const avant = doux("show", `${base}:sw.js`);
  const maintenant = existsSync("sw.js") ? readFileSync("sw.js", "utf8") : null;
  const numero = (t) => t?.match(/const\s+CACHE\s*=\s*"([^"]+)"/)?.[1] ?? null;

  /* Sans point de comparaison — premier commit, sw.js absent — on ne
     dit rien : un garde-fou qui invente un grief n'est pas un garde-fou. */
  if (touches.length && avant && maintenant) {
    const a = numero(avant), b = numero(maintenant);
    if (a && b && a === b) {
      griefs.push(
        `Le numéro de cache n'a pas bougé (« ${b} »), alors que ces fichiers changent :\n` +
        touches.map((f) => `      · ${f}`).join("\n") + "\n" +
        `   Les téléphones qui ont installé l'application garderont l'ancienne page.\n` +
        `   Corriger : incrémenter CACHE dans sw.js (« ${b} » → la version suivante).`
      );
    }
  }
}

/* ── 2. Ce que la page appelle doit être publié ────────────────────── */
/* On lit ce que index.html va CHERCHER, plutôt qu'une liste à tenir à
   jour — une liste finit toujours par mentir. */
if (existsSync("index.html") && existsSync("construire.sh")) {
  const page = readFileSync("index.html", "utf8");
  const vises = new Set();
  /* DEUX FORMES SEULEMENT, et le resserrement n'est pas cosmétique : le
     premier jet acceptait tout mot suivi d'une barre oblique. Il ramassait
     les types MIME (« image/svg+xml ») et les morceaux d'adresse du serveur
     (« rest/v1/courses »), et refusait le commit pour six fichiers qui
     n'existent pas. Un garde-fou qui se trompe est un garde-fou qu'on
     débranche.
       · un chemin écrit « ./quelque-chose » — la forme des appels du script
       · un src= ou href= qui vise un fichier local
     Dans les deux cas l'extension doit être celle d'un vrai fichier servi. */
  const ACTIF = /\.(js|css|png|jpe?g|svg|webmanifest|ico|woff2?|json)$/i;
  const retenir = (chemin) => {
    if (!chemin || /^(https?:|\/\/|data:|mailto:|tel:|#|\?)/.test(chemin)) return;
    if (!ACTIF.test(chemin)) return;
    const propre = chemin.replace(/^\.\//, "");
    vises.add(propre.includes("/") ? propre.split("/")[0] : propre);
  };
  for (const m of page.matchAll(/["']\.\/([^"'\s]+)["']/g)) retenir(m[1]);
  for (const m of page.matchAll(/(?:src|href)=["']([^"'\s]+)["']/g)) retenir(m[1]);
  /* SEULES LES COMMANDES DE COPIE COMPTENT, et il a fallu deux essais
     pour l'obtenir. Chercher le mot dans le fichier le trouvait dans un
     COMMENTAIRE ; le chercher dans les lignes de commande le trouvait
     dans la ligne « reserves= », qui énumère les noms interdits aux
     sites vitrines et contient « carte » et « exploitant ». Éprouvé en
     retirant « cp -r carte » : les deux premières versions passaient au
     vert. On ne lit donc que ce qui copie vraiment.
     La jointure des lignes n'est pas un détail non plus : la première
     copie tient sur deux lignes avec une barre oblique inverse, et les
     icônes sont sur la seconde. */
  const recette = readFileSync("construire.sh", "utf8")
    .replace(/\\\n/g, " ")
    .split("\n")
    .filter((l) => !/^\s*#/.test(l) && /(^|&&|\|\||;)\s*cp\s/.test(l))
    .join("\n");
  const manquants = [...vises].filter((n) => !recette.includes(n));
  if (manquants.length) {
    griefs.push(
      `index.html appelle ceci, que construire.sh ne publie pas :\n` +
      manquants.map((n) => `      · ${n}`).join("\n") + "\n" +
      `   Ça marchera en local et rendra un 404 en ligne.\n` +
      `   Corriger : ajouter la ligne « cp » qui manque dans construire.sh.`
    );
  }
}

/* ── 3. Un secret qui partirait dans un dépôt public ───────────────── */
const ajouts = (doux("diff", "--cached", "-U0") ?? "")
  .split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
/* LA CLÉ « service_role » DE SUPABASE — on lit la CLÉ, pas le MOT.
   Premier jet : le motif était le mot « service_role ». Il a refusé son
   propre commit (le mot est dans ce fichier, c'est le motif cherché), et
   il aurait refusé CLAUDE.md et SUPABASE.md, qui l'expliquent tous les
   deux. Un nom de rôle n'est pas un secret.
   Ce qui en est un, c'est le jeton qui le porte : un JWT dont la charge
   utile annonce ce rôle contourne TOUTES les règles de sécurité du
   serveur. On le décode donc pour trancher — et c'est la seule façon de
   ne pas confondre avec la clé « anon », qui est un JWT elle aussi et
   qui a parfaitement sa place dans la page. */
for (const m of ajouts.join("\n").matchAll(/\beyJ[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
  let charge = "";
  try { charge = Buffer.from(m[1], "base64url").toString("utf8"); } catch { continue; }
  if (!/service_role/.test(charge)) continue;
  griefs.push(
    `Ce commit ajoute la clé « service_role » de Supabase.\n` +
    `   Elle contourne toutes les règles de sécurité du serveur, et le\n` +
    `   dépôt est PUBLIC : noms, téléphones et adresses de tous les clients.\n` +
    `   Corriger : retirer la clé et la RÉGÉNÉRER dans Supabase.`
  );
  break;
}

for (const [motif, quoi] of SECRETS) {
  const ligne = ajouts.find((l) => motif.test(l));
  if (ligne) {
    griefs.push(
      `Ce commit ajoute ce qui ressemble à ${quoi}.\n` +
      `   Le dépôt est PUBLIC : ce serait le publier.\n` +
      `   Corriger : retirer la valeur, et la RÉGÉNÉRER — un secret vu une\n` +
      `   fois est un secret perdu, même retiré au commit suivant.`
    );
  }
}

/* ── Verdict ───────────────────────────────────────────────────────── */
if (!griefs.length) process.exit(0);
console.error(
  `\nCOMMIT REFUSÉ — ${griefs.length} point${griefs.length > 1 ? "s" : ""} à corriger d'abord :\n\n` +
  griefs.map((g, i) => `${i + 1}. ${g}`).join("\n\n") +
  `\n\n(Garde-fou : .claude/hooks/avant-commit.mjs)\n`
);
process.exit(2);
