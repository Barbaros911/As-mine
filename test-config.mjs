/* =====================================================================
   TEST-CONFIG.MJS — les réglages du tunnel et la grille de repli, sans
   navigateur
   ---------------------------------------------------------------------
   Deuxième extraction du plan d'architecture (31 octobre 2026) : les
   constantes de configuration du moteur (gammes, grille publique de repli,
   forfaits, accueil, grandes gares, aéroports, pas des créneaux, marges de
   durée, option pancarte, rayons, précision, alerte des papiers) vivent
   dans config.js, données seules. HOTELS n'y est PAS (hotels.js, 2/11/2026,
   test-hotels.mjs) ; les clés Supabase non plus : la démo les réécrit par
   chaîne, elles partiront dans leur propre PR.
   Ce que cette suite verrouille :
   — config.js existe, ne contient QUE des données (aucune fonction hors
     l'enveloppe, ni DOM, ni réseau, ni stockage) et pose un seul nom ;
   — chaque constante attendue est posée, avec la FORME dont le moteur
     dépend : deux gammes « berline » et « van » avec parKm, mini et
     places ; une grille par gamme, tranches croissantes et prix
     croissants, un « auDela » positif ; trois forfaits Paris ; des gares et
     des terminaux avec des coordonnées plausibles ;
   — le moteur ne déclare plus aucune de ces constantes par un littéral :
     il les lit dans ELA_CONFIG, et refuse de démarrer sans config.js ;
   — config.js est chargé avant le moteur, nommé dans construire.sh (copie
     et masquage) et dans le SHELL de sw.js.
   Les VALEURS ne sont pas figées ici : test-doc.mjs compare la grille au
   mémo, test-grille-publique.mjs la fait calculer par le site.
   Lancer :  node test-config.mjs
   ===================================================================== */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ok = [], ko = [];
const check = (nom, cond, detail = "") => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));
const lire = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
const sansCommentaires = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
const NOMS = ["AEROPORTS", "TERMINAL_EN", "RAYON_AEROPORT_KM", "PRECISION_GEO_M", "GAMMES",
  "GRILLE_PUBLIQUE", "FORFAITS_PUBLICS", "ACCUEIL_EUR", "LE_BOURGET", "RAYON_AEROPORT_ACCUEIL_KM",
  "RAYON_GARE_KM", "GRANDES_GARES", "OPTION_PANCARTE_EUR", "MARGE_DUREE_MIN", "MARGE_DUREE_MAX",
  "PAS_MINUTES", "JOURS_ALERTE"];

/* ── 1. Le fichier, et rien d'autre que des données ── */
const source = lire("config.js");
check("config.js existe", source.length > 0);
let C = null;
if (source) {
  const racine = {};
  try { vm.runInNewContext(source, { window: racine, globalThis: racine }); } catch (e) { check("config.js s'exécute", false, e.message); }
  C = racine.ELA_CONFIG || null;
  check("config.js pose window.ELA_CONFIG, et lui seul", C && Object.keys(racine).length === 1, "noms posés : " + Object.keys(racine).join(", "));
  const corps = sansCommentaires(source);
  check("config.js ne contient aucune fonction hors son enveloppe", (corps.match(/\bfunction\b/g) || []).length === 1);
  check("config.js ne touche ni au DOM, ni au réseau, ni au stockage",
    !/\b(document|navigator|location|window)\.[a-zA-Z_]|\bfetch\s*\(|\b(localStorage|sessionStorage)\b/.test(corps));
  check("config.js ne porte ni fiche d'hôtel ni clé de serveur (elles restent au moteur, pour l'instant)",
    !/\b(HOTELS|SUPABASE_URL|SUPABASE_CLE|CLE_VAPID)\b/.test(corps));
}

/* ── 2. Chaque constante, avec la forme dont le moteur dépend ── */
if (C) {
  const absentes = NOMS.filter(n => !(n in C));
  check("toutes les constantes attendues sont posées", absentes.length === 0, absentes.join(", "));
  const enTrop = Object.keys(C).filter(n => !NOMS.includes(n));
  check("aucune constante inattendue (une nouvelle s'ajoute ici ET dans ce test)", enTrop.length === 0, enTrop.join(", "));
  const cles = (C.GAMMES || []).map(g => g.cle);
  check("deux gammes, « berline » et « van », dans cet ordre", cles.join(",") === "berline,van", cles.join(","));
  check("chaque gamme a parKm > 0, mini > 0 et places > 0",
    (C.GAMMES || []).every(g => g.parKm > 0 && g.mini > 0 && g.places > 0 && typeof g.nom === "string"));
  for (const g of ["berline", "van"]) {
    const t = C.GRILLE_PUBLIQUE && C.GRILLE_PUBLIQUE[g];
    const km = t ? t.tranches.map(x => x.km) : [], prix = t ? t.tranches.map(x => x.prix) : [];
    const croissant = a => a.every((v, i) => i === 0 || v > a[i - 1]);
    check(`grille ${g} : des tranches croissantes en km et en prix, un au-delà positif`,
      t && km.length >= 2 && croissant(km) && croissant(prix) && t.auDela > 0, JSON.stringify(t));
  }
  const f = C.FORFAITS_PUBLICS || [];
  check("trois forfaits Paris (orly, cdg, disney), un prix par gamme",
    f.map(x => x.cle).join(",") === "orly,cdg,disney" && f.every(x => x.prix && x.prix.berline > 0 && x.prix.van > 0));
  check("l'accueil est un montant positif", C.ACCUEIL_EUR > 0);
  const gares = C.GRANDES_GARES || [];
  check("neuf grandes gares, toutes avec un nom et des coordonnées en Île-de-France",
    gares.length === 9 && gares.every(g => g.nom && g.lat > 48 && g.lat < 50 && g.lon > 1.5 && g.lon < 3.5));
  const aps = Object.values(C.AEROPORTS || {});
  check("trois aéroports, chacun avec un nom, un nom anglais, des mots et des terminaux positionnés",
    aps.length === 3 && aps.every(a => a.nom && a.nomEn && a.mots.length && Object.values(a.terminaux).every(p => p[0] > 48 && p[1] > 1.5)));
  check("les créneaux ont un pas entier de minutes", Number.isInteger(C.PAS_MINUTES) && C.PAS_MINUTES > 0);
  check("la marge de durée est une fourchette", C.MARGE_DUREE_MIN >= 0 && C.MARGE_DUREE_MAX > C.MARGE_DUREE_MIN);
  check("les rayons, la précision et l'alerte des papiers sont positifs",
    [C.RAYON_AEROPORT_KM, C.RAYON_AEROPORT_ACCUEIL_KM, C.RAYON_GARE_KM, C.PRECISION_GEO_M, C.JOURS_ALERTE, C.OPTION_PANCARTE_EUR].every(v => v > 0));
}

/* ── 3. Le moteur lit, il ne déclare plus ── */
const page = lire("index.html");
const corpsPage = sansCommentaires(page);
const encoreDeclarees = NOMS.filter(n => new RegExp("\\bvar\\s+" + n + "\\s*=\\s*[\\[{0-9\"]").test(corpsPage)
  || new RegExp(",\\s*" + n + "\\s*=\\s*[0-9\"]").test(corpsPage));
check("le moteur ne déclare plus ces constantes par un littéral", encoreDeclarees.length === 0, encoreDeclarees.join(", "));
/* Depuis prix.js (1er novembre 2026), les rayons, Le Bourget et les gares
   ne sont plus lus que par les règles du prix : chaque constante a un
   lecteur, dans le moteur ou dans prix.js. */
const corpsPrix = sansCommentaires(lire("prix.js"));
const lues = NOMS.filter(n => new RegExp("\\b" + n + "\\s*=\\s*window\\.ELA_CONFIG\\." + n + "\\b").test(corpsPage)
  || new RegExp("\\b" + n + "\\s*=\\s*C\\." + n + "\\b").test(corpsPrix));
check("le moteur ou prix.js lit chaque constante dans ELA_CONFIG", lues.length === NOMS.length, "manquent : " + NOMS.filter(n => !lues.includes(n)).join(", "));
const posScript = page.indexOf('<script src="config.js"></script>');
const posGarde = page.indexOf("if(!window.ELA_CONFIG) throw");
check("la page charge config.js", posScript > 0);
check("le moteur refuse de démarrer sans config.js", posGarde > 0);
check("config.js est chargé avant le moteur", posScript > 0 && posGarde > posScript);

/* ── 4. La recette de publication et le service worker ── */
const recette = lire("construire.sh").split("\n").filter(l => !/^\s*#/.test(l)).join("\n");
check("construire.sh copie config.js dans site/", /\bconfig\.js\b/.test(recette.split("masquer-commentaires")[0]));
check("construire.sh masque les commentaires de site/config.js", /site\/config\.js/.test(recette));
check("sw.js garde config.js dans son SHELL", /"\.\/config\.js"/.test(sansCommentaires(lire("sw.js"))));

for (const l of ok) console.log("✔ " + l);
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); for (const l of ko) console.log("✘ " + l); console.log(""); }
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
process.exit(ko.length ? 1 : 0);
