/* =====================================================================
   VERIFIER-CACHE-SW — un fichier « cache d'abord » ne change pas sans
   incrément de CACHE (audit du 9 octobre 2026, P2)
   ---------------------------------------------------------------------
   sw.js sert le HTML « réseau d'abord » mais garde en cache, jusqu'au
   prochain changement de version, tout le reste du SHELL : telephone.js,
   itineraire-partage.js, bon-client.js, intake-demande.js, qr-affiche.js,
   admin-sante.js, le manifeste, les icônes et les logos. Un téléphone qui a
   installé l'application reçoit donc le NOUVEAU index.html avec les ANCIENS
   scripts tant que la constante CACHE n'a pas bougé — et un index.html qui
   appelle une fonction que l'ancien telephone.js n'a pas lève « X is not
   defined » dès le chargement : plus aucune demande ne part pour ces
   clients-là, sans un mot. C'est arrivé (« Barbaros a publié et n'a rien vu
   changer sur son téléphone »), et rien ne l'empêchait de se reproduire :
   la règle « incrémenter CACHE à chaque changement visible » n'était écrite
   que dans la mémoire du projet.

   Ce script lit la liste du SHELL dans sw.js — jamais une liste recopiée
   ici, qui survivrait au fichier qu'on ajoute — et compare les deux côtés
   d'une pull request : si un fichier « cache d'abord » a changé et que la
   constante CACHE est la même, il refuse. Les entrées servies « réseau
   d'abord » (le HTML, et NETWORK_FIRST_ASSETS) ne comptent pas.

   Lancer :  node .github/scripts/verifier-cache-sw.mjs <base> [tete]
   (deux révisions git ; « tete » vaut HEAD par défaut). Sortie 0 si rien à
   redire, 1 s'il manque l'incrément, 2 sur une erreur d'usage.
   Éprouvé sur l'historique : bon-client.js modifié sans sw.js dans 75019da
   et e1d07ee → refus ; avec sw.js dans 68e6fc3 → accepté.
   ===================================================================== */
import { execFileSync } from "node:child_process";

const [base, tete = "HEAD"] = process.argv.slice(2);
if (!base) {
  console.error("usage : node .github/scripts/verifier-cache-sw.mjs <base> [tete]");
  process.exit(2);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

function cacheDe(source) {
  const m = /const CACHE\s*=\s*"([^"]+)"/.exec(source);
  return m ? m[1] : null;
}

/* Les chemins d'un tableau de chaînes « ./x » ou « /x », commentaires
   retirés : le SHELL en porte plusieurs entre ses entrées. */
function cheminsDe(source, nom) {
  const m = new RegExp("const " + nom + "\\s*=\\s*\\[([\\s\\S]*?)\\];").exec(source);
  if (!m) return null;
  const sansCommentaires = m[1].replace(/\/\*[\s\S]*?\*\//g, "");
  return [...sansCommentaires.matchAll(/"\.?\/([^"]*)"/g)].map((x) => x[1]);
}

/* Le HTML est servi « réseau d'abord » par la branche de navigation : il ne
   dépend pas de la version du cache. */
const HTML = new Set(["", "index.html", "application.html", "ela-admin/"]);

const swTete = git("show", `${tete}:sw.js`);
const shell = cheminsDe(swTete, "SHELL");
if (!shell) {
  console.error("SHELL introuvable dans sw.js : le script ne sait plus le lire, à corriger.");
  process.exit(2);
}
const reseauDabord = new Set(cheminsDe(swTete, "NETWORK_FIRST_ASSETS") || []);
const cacheDabord = shell.filter((p) => !HTML.has(p) && !reseauDabord.has(p));

const changes = git("diff", "--name-only", `${base}...${tete}`).split("\n").filter(Boolean);
const touches = cacheDabord.filter((p) => changes.includes(p));

if (!touches.length) {
  console.log("Aucun fichier « cache d'abord » du service worker n'a changé.");
  process.exit(0);
}

let swBase = null;
try { swBase = git("show", `${base}:sw.js`); } catch (_e) { /* pas de sw.js à la base : rien à comparer */ }
const avant = swBase ? cacheDe(swBase) : null, apres = cacheDe(swTete);

if (!swBase || !avant || avant !== apres) {
  console.log(`Fichier(s) « cache d'abord » modifié(s) (${touches.join(", ")}) et CACHE passé de ${avant} à ${apres} : correct.`);
  process.exit(0);
}

console.error(`ERREUR : ${touches.join(", ")} ${touches.length > 1 ? "ont" : "a"} changé, mais la constante CACHE de sw.js vaut toujours "${apres}".`);
console.error("Les téléphones qui ont installé l'application garderaient l'ancien fichier avec le nouveau index.html.");
console.error("Incrémenter CACHE dans sw.js (par exemple « " + apres.replace(/(\d+)$/, (n) => String(Number(n) + 1)) + " »).");
process.exit(1);
