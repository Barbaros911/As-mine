/* =====================================================================
   TEST-HOTELS.MJS — la fiche des hôtels partenaires, sans navigateur
   ---------------------------------------------------------------------
   Quatrième extraction du plan d'architecture (2 novembre 2026) : la fiche
   HOTELS vivait dans le moteur d'index.html, et trois scripts de build la
   découpaient dans la page par recherche de chaîne (construire-espaces-hotel,
   construire-demo, verifier-demo), un quatrième lisait ses forfaits dans la
   page publiée (verifier-tarif-hotel), une suite y injectait un hôtel
   fictif (test-finition-commune). Elle vit dans hotels.js, données seules,
   déplacée à l'identique, et tous la lisent là.
   Ce que cette suite verrouille :
   — hotels.js existe, ne contient QUE des données (ni DOM, ni réseau, ni
     stockage) et pose un seul nom, ELA_HOTELS ;
   — chaque hôtel a la FORME dont le moteur, la réception et les scripts
     dépendent : une clé utilisable dans une adresse et recopiée sur la
     fiche, un nom, un nom court, une adresse, des coordonnées de secours
     en Île-de-France, des alias, ses couleurs mesurées, des photos servies
     par le dépôt ou vides, des destinations reconnues par un aéroport de
     config.js ou par un point et un rayon, un forfait par gamme ou aucun ;
   — le moteur lit la fiche et ne la déclare plus ; hotels.js est chargé
     avant lui, nommé dans construire.sh (copie, masquage) et dans le SHELL
     de sw.js ;
   — les scripts de build et la suite de finition lisent hotels.js, plus
     jamais la page ; la démo reçoit sa propre fiche (/demo/hotels.js).
   Les VALEURS ne sont pas figées ici : verifier-tarif-hotel.mjs compare les
   forfaits à la source serveur et à la page du QR.
   Lancer :  node test-hotels.mjs
   ===================================================================== */
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ok = [], ko = [];
const check = (nom, cond, detail = "") => (cond ? ok : ko).push(nom + (detail ? " — " + detail : ""));
const lire = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
const sansCommentaires = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

/* ── 1. Le fichier, et rien d'autre que des données ── */
const source = lire("hotels.js");
check("hotels.js existe", source.length > 0);
const racine = {};
const bac = { window: racine, globalThis: racine };
vm.runInNewContext(lire("config.js"), bac);
const C = racine.ELA_CONFIG || {};
let H = null;
if (source) {
  try { vm.runInNewContext(source, bac); } catch (e) { check("hotels.js s'exécute", false, e.message); }
  H = racine.ELA_HOTELS || null;
  check("hotels.js pose window.ELA_HOTELS, et lui seul", H && Object.keys(racine).join(",") === "ELA_CONFIG,ELA_HOTELS", "noms posés : " + Object.keys(racine).join(", "));
  const corps = sansCommentaires(source);
  check("hotels.js ne contient que l'enveloppe et la pose de la clé (deux fonctions)", (corps.match(/\bfunction\b/g) || []).length === 2);
  check("hotels.js ne touche ni au DOM, ni au réseau, ni au stockage",
    !/\b(document|navigator|location)\b|\bwindow\.[a-zA-Z_]|\bfetch\s*\(|\b(localStorage|sessionStorage)\b/.test(corps));
  check("hotels.js ne porte ni grille publique, ni clé de serveur", !/\b(GRILLE_PUBLIQUE|FORFAITS_PUBLICS|SUPABASE_URL|SUPABASE_CLE)\b/.test(corps));
}

/* ── 2. Chaque hôtel, avec la forme dont tout dépend ── */
if (H) {
  const cles = Object.keys(H);
  check("au moins un hôtel partenaire", cles.length >= 1);
  const hex = (v) => /^#[0-9a-fA-F]{6}$/.test(String(v));
  const cheminLocal = (v) => v === "" || /^\/[^\s"]+$/.test(String(v));
  for (const cle of cles) {
    const h = H[cle];
    check(`${cle} : une clé utilisable dans une adresse, recopiée sur la fiche`, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cle) && h.cle === cle);
    check(`${cle} : un nom, un nom court, une adresse`, [h.nom, h.court, h.adresse].every((v) => typeof v === "string" && v.trim().length > 0));
    check(`${cle} : des coordonnées de secours en Île-de-France`, h.lat > 48 && h.lat < 49.5 && h.lon > 1.5 && h.lon < 3.5);
    check(`${cle} : des alias en liste, et un co-marquage dit vrai ou faux`, Array.isArray(h.alias) && typeof h.coMarquage === "boolean");
    check(`${cle} : ses couleurs mesurées (charbon, vif, bouton, pale, paleEncre)`,
      h.marque && ["charbon", "vif", "bouton", "pale", "paleEncre"].every((k) => hex(h.marque[k])));
    check(`${cle} : photos servies par le dépôt ou vides, jamais une adresse http`,
      ["photo", "photoEntete", "photoComptoir"].every((k) => h[k] === undefined || cheminLocal(h[k])) && !/https?:/.test(JSON.stringify([h.photo, h.photoEntete, h.photoComptoir])));
    check(`${cle} : une page client qui commence par /`, h.pageClient === undefined || /^\/[^\s"]*$/.test(h.pageClient));
    const d = h.destinations || [];
    check(`${cle} : au moins une destination`, Array.isArray(d) && d.length >= 1);
    check(`${cle} : des clés de destination uniques`, new Set(d.map((x) => x.cle)).size === d.length);
    for (const x of d) {
      const parAeroport = x.aeroport && C.AEROPORTS && x.aeroport in C.AEROPORTS;
      const parPoint = typeof x.lat === "number" && typeof x.lon === "number" && x.rayonKm > 0;
      check(`${cle} / ${x.cle} : reconnue par un aéroport de config.js ou par un point et un rayon`, !!x.cle && !!x.nom && (parAeroport || parPoint));
      check(`${cle} / ${x.cle} : un forfait par gamme (berline, van) ou aucun`,
        x.forfait === null || x.forfait === undefined || (x.forfait.berline > 0 && x.forfait.van > 0));
    }
  }
}

/* ── 3. Le moteur lit, il ne déclare plus ── */
const page = lire("index.html");
const corpsPage = sansCommentaires(page);
check("le moteur lit la fiche dans ELA_HOTELS", /\bvar HOTELS = window\.ELA_HOTELS;/.test(corpsPage));
check("le moteur ne déclare plus la fiche par un littéral", !/var HOTELS = \{/.test(corpsPage) && !/Object\.keys\(HOTELS\)\.forEach\(function\(k\)\{ HOTELS\[k\]\.cle = k; \}\);/.test(corpsPage));
const posScript = page.indexOf('<script src="hotels.js"></script>');
const posGarde = page.indexOf("if(!window.ELA_HOTELS) throw");
check("la page charge hotels.js, après config.js", posScript > 0 && page.indexOf('<script src="config.js"></script>') < posScript);
check("le moteur refuse de démarrer sans hotels.js", posGarde > 0 && posScript < posGarde);

/* ── 4. La recette, le service worker, les scripts qui lisent la fiche ── */
const recette = lire("construire.sh").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
check("construire.sh copie hotels.js dans site/", /\bhotels\.js\b/.test(recette.split("masquer-commentaires")[0]));
check("construire.sh masque les commentaires de site/hotels.js et de site/demo/hotels.js", /site\/hotels\.js/.test(recette) && /site\/demo\/hotels\.js/.test(recette));
check("sw.js garde hotels.js dans son SHELL", /"\.\/hotels\.js"/.test(sansCommentaires(lire("sw.js"))));
check("tests.sh lance test-hotels.mjs", /test-hotels\.mjs/.test(lire(".claude/outils/tests.sh")));
const scripts = [".github/scripts/construire-espaces-hotel.mjs", ".github/scripts/construire-demo.mjs",
  ".github/scripts/verifier-demo.mjs", ".github/scripts/verifier-tarif-hotel.mjs", "test-finition-commune.mjs"];
for (const s of scripts) {
  const t = sansCommentaires(lire(s));
  check(`${s} lit hotels.js, plus jamais la fiche dans la page`, /hotels\.js/.test(t) && !/(?:source|html|page|site)\.indexOf\('var HOTELS = \{'\)/.test(t));
}
const demo = sansCommentaires(lire(".github/scripts/construire-demo.mjs"));
check("la démo reçoit sa propre fiche : /demo/hotels.js écrit, et la page y renvoie",
  /writeFileSync\(path\.join\(dossier, 'hotels\.js'\), HOTELS_DEMO\)/.test(demo) && /'<script src="\/demo\/hotels\.js"><\/script>'/.test(demo));
check("la fiche fictive de la démo a la forme de hotels.js (ELA_HOTELS, clé recopiée)",
  /racine\.ELA_HOTELS = HOTELS;/.test(demo) && /Object\.keys\(HOTELS\)\.forEach\(function\(k\)\{ HOTELS\[k\]\.cle = k; \}\);/.test(demo));

for (const l of ok) console.log("✔ " + l);
if (ko.length) { console.log("\n=== ÉCHECS (" + ko.length + ") ==="); for (const l of ko) console.log("✘ " + l); console.log(""); }
console.log(`=== ${ok.length} réussis, ${ko.length} échecs ===`);
process.exit(ko.length ? 1 : 0);
