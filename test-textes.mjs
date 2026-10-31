/* =====================================================================
   TEST-TEXTES.MJS — le dictionnaire des deux langues, sans navigateur
   ---------------------------------------------------------------------
   Première extraction du plan d'architecture (31 octobre 2026) : le
   dictionnaire « ELA_TEXTES » est sorti du moteur d'index.html vers
   textes.js, données seules. Ce que cette suite verrouille, pour toujours :
   — textes.js existe, ne contient QUE des textes (aucune fonction hors
     l'enveloppe, ni DOM, ni réseau, ni stockage) et pose un seul nom ;
   — chaque clé française a son anglaise, et réciproquement ;
   — chaque clé que la page demande (« data-t », « data-t-html »,
     « data-t-ph », « data-t-aria », « T("…") ») existe : une clé absente
     s'afficherait telle quelle (« err_coord ») sous les yeux du client ;
   — la page charge textes.js AVANT son moteur, et le moteur refuse de
     démarrer sans lui (même garde que pour itineraire-partage.js) ;
   — textes.js est nommé dans construire.sh (copie ET masquage des
     commentaires) et dans le SHELL de sw.js : oublié, il marcherait en
     local et rendrait une 404 en ligne, ou manquerait hors ligne.
   Les clés définies mais jamais demandées sont LISTÉES, pas refusées : en
   retirer une est une décision, pas une correction.
   Ni réseau, ni navigateur : moins d'une seconde.
   Lancer :  node test-textes.mjs
   ===================================================================== */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ok = [], ko = [];
const check = (nom, cond, detail = "") => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));
const lire = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
const sansCommentaires = (s) => s
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/* ── 1. Le fichier, et rien d'autre que des textes ── */
const source = lire("textes.js");
check("textes.js existe", source.length > 0);
let dico = null;
if (source) {
  const racine = {};
  try { vm.runInNewContext(source, { window: racine, globalThis: racine }); } catch (e) { check("textes.js s'exécute", false, e.message); }
  dico = racine.ELA_TEXTES || null;
  check("textes.js pose window.ELA_TEXTES, et lui seul", dico && Object.keys(racine).length === 1,
    "noms posés : " + Object.keys(racine).join(", "));
  const corps = sansCommentaires(source);
  check("textes.js ne contient aucune fonction hors son enveloppe", (corps.match(/\bfunction\b/g) || []).length === 1);
  check("textes.js ne touche ni au DOM, ni au réseau, ni au stockage",
    !/\b(document|navigator|location|window)\.[a-zA-Z_]|\bfetch\s*\(|\b(localStorage|sessionStorage)\b/.test(corps));
}

/* ── 2. Deux langues, les mêmes clés ── */
let fr = {}, en = {};
if (dico) {
  fr = dico.fr || {}; en = dico.en || {};
  check("le dictionnaire a « fr » et « en », et deux langues seulement",
    dico.fr && dico.en && Object.keys(dico).length === 2, Object.keys(dico).join(", "));
  const sansEn = Object.keys(fr).filter(k => !(k in en));
  const sansFr = Object.keys(en).filter(k => !(k in fr));
  check("chaque clé française a son anglaise", sansEn.length === 0, sansEn.join(", "));
  check("chaque clé anglaise a sa française", sansFr.length === 0, sansFr.join(", "));
  const vides = [...Object.entries(fr), ...Object.entries(en)].filter(([, v]) => typeof v !== "string" || !v.trim()).map(([k]) => k);
  check("aucune clé vide ni non textuelle", vides.length === 0, vides.join(", "));
  check("le dictionnaire n'est pas anecdotique", Object.keys(fr).length > 200, Object.keys(fr).length + " clés");
}

/* ── 3. Ce que la page demande existe ── */
const page = lire("index.html");
const corpsPage = sansCommentaires(page);
const demandees = new Set();
for (const m of corpsPage.matchAll(/data-t(?:-html|-ph|-aria)?="([a-z0-9_]+)"/g)) demandees.add(m[1]);
for (const m of corpsPage.matchAll(/\bT\("([a-z0-9_]+)"\)/g)) demandees.add(m[1]);
for (const m of corpsPage.matchAll(/\bT\([^()]*\?\s*"([a-z0-9_]+)"\s*:\s*"([a-z0-9_]+)"\)/g)) { demandees.add(m[1]); demandees.add(m[2]); }
check("la page demande des clés (data-t, T)", demandees.size > 100, demandees.size + " clés");
const inconnues = [...demandees].filter(k => !(k in fr));
check("chaque clé demandée par la page existe en français", inconnues.length === 0, inconnues.join(", "));
const inutilisees = Object.keys(fr).filter(k => !demandees.has(k));
console.log("Clés définies mais jamais demandées par data-t ou T(\"…\") : " + inutilisees.length +
  " (certaines sont lues par une clé calculée, « T(cle) » ; en retirer une est une décision).");

/* ── 4. L'ordre de chargement et la garde ── */
const posScript = page.indexOf('<script src="textes.js"></script>');
const posMoteur = page.indexOf("if(!window.ELA_TEXTES) throw");
check("la page charge textes.js", posScript > 0);
check("le moteur refuse de démarrer sans textes.js", posMoteur > 0);
check("textes.js est chargé avant le moteur", posScript > 0 && posMoteur > posScript);
check("le moteur ne définit plus le dictionnaire lui-même", !/window\.ELA_TEXTES\s*=\s*\{/.test(corpsPage));

/* ── 5. La recette de publication et le service worker ── */
const recette = lire("construire.sh").split("\n").filter(l => !/^\s*#/.test(l)).join("\n");
check("construire.sh copie textes.js dans site/", /\btextes\.js\b/.test(recette.split("masquer-commentaires")[0]));
check("construire.sh masque les commentaires de site/textes.js", /site\/textes\.js/.test(recette));
const sw = sansCommentaires(lire("sw.js"));
check("sw.js garde textes.js dans son SHELL", /"\.\/textes\.js"/.test(sw));

/* ── Bilan ── */
for (const l of ok) console.log("✔ " + l);
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); for (const l of ko) console.log("✘ " + l); console.log(""); }
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
process.exit(ko.length ? 1 : 0);
