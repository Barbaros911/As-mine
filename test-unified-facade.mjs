#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

execFileSync("sh", ["construire.sh"], { stdio: "inherit" });

const root = readFileSync("site/index.html", "utf8");
const legacy = readFileSync("site/application.html", "utf8");
const css = readFileSync("site/application-facade.css", "utf8");
const sw = readFileSync("site/sw.js", "utf8");
const publicGateway = readFileSync("site/ela-public/index.html", "utf8");
const adminGateway = readFileSync("site/ela-admin/index.html", "utf8");
const receptionGateway = readFileSync("site/easyhotel-reception/index.html", "utf8");

for (const [name, html] of [["racine", root], ["/application", legacy]]) {
  assert.match(html, /id="depart"/, name + " conserve le départ");
  assert.match(html, /id="arrivee"/, name + " conserve l’arrivée");
  assert.match(html, /id="btnVoirPrix"/, name + " conserve le calcul de prix");
  assert.match(html, /SUPABASE_URL/, name + " conserve l’intégration Supabase");
  assert.match(html, /application-facade\.css/, name + " charge la nouvelle façade");
  assert.match(html, /brand-logo\.webp/, name + " utilise le logo officiel");
  assert.match(html, /easyhotel|reception/i, name + " conserve les modes hôteliers");
}
assert.doesNotMatch(root, /sites\/ela-public/, "la racine ne doit plus être une copie vitrine");
assert.match(css, /#062f55/i, "la façade conserve le bleu marine ELA");
assert.match(css, /#12c4ee/i, "la façade conserve le cyan ELA");
assert.match(css, /@media\s*\(max-width:\s*899px\)/, "la façade contient le rendu mobile");
assert.match(sw, /elatransfer-v80/, "le cache est invalidé après l’unification");
assert.match(sw, /application-facade\.css/, "la façade reste disponible hors ligne");

console.log("OK — façade et réservation unifiées, fonctions critiques conservées.");
