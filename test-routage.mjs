#!/usr/bin/env node
/* =====================================================================
   LE ROUTAGE DU SITE PUBLIÉ — 18 octobre 2026.
   ---------------------------------------------------------------------
   Jusqu'à ce jour, Cloudflare rendait l'ACCUEIL, en 200, à toute adresse
   inconnue (« single-page-application »). Ce repli avait un effet
   invisible : un lien cassé, une icône absente, un fichier du service
   worker oublié par construire.sh « marchaient » — ils recevaient une page
   HTML en 200, sans rien signaler. Maintenant qu'une adresse inconnue rend
   une vraie 404, chacun de ces liens devient une panne visible du client.
   Ce contrôle les cherche AVANT la publication.

   Il ne lance aucun serveur : il applique au dossier site/ les règles que
   Cloudflare applique (« html_handling »: « auto-trailing-slash ») —
   mesurées sur wrangler 4.151 le 18/10/2026 :
     /x/        → x/index.html
     /x         → x.html, sinon x/index.html (redirection vers /x/)
     /x.html    → x.html (redirigé vers /x, même fichier)
   Ce qui ne se résout pas recevra la 404.

   Ce qu'il éprouve :
     1. la configuration : vraie 404, pas de repli « single-page » ;
     2. les deux pages 404 : présentes, noindex, sans canonique, chemins
        absolus (elles sont servies à n'importe quelle profondeur) ;
     3. chaque lien, image, script et feuille des pages publiées ;
     4. les URL des feuilles de style (url(...)) ;
     5. les manifestes : start_url et icônes ;
     6. le SHELL du service worker ;
     7. le plan du site : chaque URL existe, et aucune n'est une 404 ;
     8. les redirections : chaque cible existe.
   ===================================================================== */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SITE = process.argv[2] || "site";
const ORIGINE = "https://elatransfer.com";
const echecs = [];
let n = 0;
const ok = (cond, m) => { n++; if (!cond) { echecs.push(m); console.log("  ✗ " + m); } };

/* Le site construit est le sujet : absent, on le construit (le lanceur
   tests.sh prend les suites dans l'ordre alphabétique, rien ne garantit
   qu'une autre l'ait fait avant). */
if (SITE === "site" && !existsSync(join(SITE, "index.html"))) execSync("sh construire.sh", { stdio: "ignore" });
if (!existsSync(join(SITE, "index.html"))) {
  console.error(`${SITE}/ absent : lancer « sh construire.sh » d'abord.`);
  process.exit(1);
}

function estFichier(rel) {
  const p = join(SITE, rel);
  return existsSync(p) && statSync(p).isFile();
}
/* Le chemin d'URL (sans requête ni ancre) se résout-il en un fichier ? */
function resout(chemin) {
  let c = chemin.split("#")[0].split("?")[0];
  try { c = decodeURIComponent(c); } catch {}
  if (!c.startsWith("/")) return false;
  const rel = c.slice(1);
  if (rel === "") return estFichier("index.html");
  if (c.endsWith("/")) return estFichier(rel + "index.html");
  return estFichier(rel) || estFichier(rel + ".html") || estFichier(rel + "/index.html");
}
function fichiers(dir, ext, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) fichiers(p, ext, acc);
    else if (ext.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}
/* L'adresse d'une page à partir de son fichier : x/index.html → /x/. */
function urlDe(fichier) {
  const rel = fichier.slice(SITE.length).replace(/\\/g, "/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}
/* Un lien de la page, rendu absolu ; null s'il sort du site. */
function absolu(lien, base) {
  const l = lien.trim();
  if (!l || /^(#|tel:|mailto:|sms:|data:|javascript:|blob:|whatsapp:|tg:)/i.test(l)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(l) || l.startsWith("//")) {
    const u = new URL(l.startsWith("//") ? "https:" + l : l);
    return u.origin === ORIGINE ? u.pathname : null;
  }
  return new URL(l, ORIGINE + base).pathname;
}

/* ---- 1. La configuration ------------------------------------------ */
console.log("La configuration de Cloudflare :");
const brut = readFileSync("wrangler.jsonc", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const conf = JSON.parse(brut);
ok(conf.assets?.not_found_handling === "404-page",
  `une adresse inconnue doit rendre une vraie 404 — not_found_handling lu : « ${conf.assets?.not_found_handling} »`);
ok(conf.assets?.html_handling === "auto-trailing-slash",
  `html_handling doit rester « auto-trailing-slash » (« none » a cassé /demos/) — lu : « ${conf.assets?.html_handling} »`);

/* ---- 2. Les pages 404 --------------------------------------------- */
console.log("Les pages 404 :");
for (const [f, lang] of [["404.html", "fr"], ["en/404.html", "en"]]) {
  ok(estFichier(f), `${f} doit être publié (construire.sh)`);
  if (!estFichier(f)) continue;
  const h = readFileSync(join(SITE, f), "utf8");
  ok(new RegExp(`<html[^>]+lang="${lang}"`).test(h), `${f} doit être en « ${lang} »`);
  ok(/<meta name="robots" content="[^"]*noindex/.test(h), `${f} doit porter noindex`);
  ok(!/rel="canonical"/.test(h), `${f} ne doit porter aucune canonique`);
  ok(!/mesure\.js|data-ela-page/.test(h), `${f} ne doit pas être comptée comme une page vue`);
  ok(/href="\/"|href="\/\?lang=en"/.test(h), `${f} doit offrir une sortie vers la réservation`);
  ok(/href="tel:\+33759312433"/.test(h), `${f} doit porter le numéro d'Elatransfer`);
  const relatifs = [...h.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1])
    .filter((l) => !/^(\/|#|https?:|tel:|mailto:)/.test(l));
  ok(relatifs.length === 0, `${f} est servi à toute profondeur : chemins relatifs interdits — trouvé : ${relatifs.join(", ")}`);
}

/* ---- 3. Les liens des pages publiées ------------------------------ */
console.log("Les liens des pages :");
const pages = fichiers(SITE, [".html"]);
let liens = 0;
for (const f of pages) {
  const h = readFileSync(f, "utf8");
  /* Les espaces construits (admin, réception, démo) portent <base href="/"> :
     leurs liens relatifs se lisent depuis la racine, comme le fait le
     navigateur. L'ignorer, c'était 34 fausses alertes au premier essai. */
  const balise = (h.match(/<base\s+href="([^"]*)"/i) || [, ""])[1];
  const base = balise ? new URL(balise, ORIGINE + urlDe(f)).pathname : urlDe(f);
  /* Une page qui ne fait que rediriger n'a qu'un lien, et il compte. */
  const trouves = [
    ...[...h.matchAll(/\s(?:href|src|poster)="([^"]*)"/gi)].map((m) => m[1]),
    ...[...h.matchAll(/\ssrcset="([^"]*)"/gi)].flatMap((m) => m[1].split(",").map((s) => s.trim().split(/\s+/)[0])),
    ...[...h.matchAll(/http-equiv="refresh" content="\d+;\s*url=([^"]+)"/gi)].map((m) => m[1]),
  ];
  for (const l of trouves) {
    if (/[{}$]|\$\{/.test(l)) continue; // modèle de code, pas un lien
    let p; try { p = absolu(l.replace(/&amp;/g, "&"), base); } catch { continue; }
    if (p === null) continue;
    liens++;
    ok(resout(p), `${base} pointe vers « ${l} », qui rendra une 404`);
  }
}
console.log(`  ${liens} liens internes lus dans ${pages.length} pages`);

/* ---- 4. Les feuilles de style ------------------------------------- */
for (const f of fichiers(SITE, [".css"])) {
  const base = urlDe(f);
  for (const m of readFileSync(f, "utf8").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    let p; try { p = absolu(m[1], base); } catch { continue; }
    if (p === null) continue;
    ok(resout(p), `${base} appelle « ${m[1]} », qui rendra une 404`);
  }
}

/* ---- 5. Les manifestes -------------------------------------------- */
console.log("Les manifestes :");
for (const f of fichiers(SITE, [".webmanifest"])) {
  const base = urlDe(f);
  const m = JSON.parse(readFileSync(f, "utf8"));
  const cibles = [m.start_url, ...(m.icons || []).map((i) => i.src)].filter(Boolean);
  for (const c of cibles) ok(resout(absolu(c, base)), `${base} : « ${c} » rendra une 404 (icône ou démarrage de l'application)`);
}

/* ---- 6. Le service worker ----------------------------------------- */
console.log("Le service worker :");
const sw = readFileSync(join(SITE, "sw.js"), "utf8");
const shell = (sw.match(/SHELL\s*=\s*\[([\s\S]*?)\]/) || [, ""])[1].match(/["'][^"']+["']/g) || [];
ok(shell.length > 0, "le SHELL du service worker doit être lisible");
for (const s of shell) {
  const c = s.slice(1, -1);
  ok(resout(absolu(c, "/")), `le service worker pré-charge « ${c} », qui rendra une 404 — addAll échoue et il ne s'installe plus`);
}

/* ---- 7. Le plan du site ------------------------------------------- */
console.log("Le plan du site :");
const plan = [...readFileSync(join(SITE, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(plan.length > 0, "sitemap.xml doit lister des URL");
for (const u of plan) {
  const p = new URL(u).pathname;
  ok(new URL(u).origin === ORIGINE, `sitemap.xml : « ${u} » n'est pas sur ${ORIGINE}`);
  ok(resout(p), `sitemap.xml annonce « ${u} », qui rendra une 404`);
  ok(!/\/404(\.html)?$/.test(p), `sitemap.xml ne doit pas annoncer une page 404 : « ${u} »`);
}

/* ---- 8. Les redirections ------------------------------------------ */
console.log("Les redirections :");
ok(estFichier("_redirects"), "_redirects doit être publié (construire.sh)");
if (estFichier("_redirects")) {
  for (const ligne of readFileSync(join(SITE, "_redirects"), "utf8").split("\n")) {
    const t = ligne.trim();
    if (!t || t.startsWith("#")) continue;
    const [de, vers, code] = t.split(/\s+/);
    ok(["301", "302", "307", "308"].includes(code), `_redirects : « ${t} » doit porter un code de redirection`);
    ok(!/\*/.test(de), `_redirects : « ${de} » — pas d'attrape-tout, une adresse inconnue doit rester une 404`);
    ok(resout(vers), `_redirects : « ${de} » renvoie vers « ${vers} », qui rendra une 404`);
    ok(!resout(de), `_redirects : « ${de} » est un fichier publié, la redirection masquerait une vraie page`);
  }
}

console.log(echecs.length
  ? `\n=== ÉCHECS (${echecs.length}) sur ${n} contrôles ===`
  : `\n=== ${n} contrôles au vert ===`);
process.exit(echecs.length ? 1 : 0);
