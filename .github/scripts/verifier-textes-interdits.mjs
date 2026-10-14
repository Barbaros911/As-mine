#!/usr/bin/env node
/* =====================================================================
   VERIFIER-TEXTES-INTERDITS.MJS — appelé par construire.sh, en dernier
   ---------------------------------------------------------------------
   Parcourt le site CONSTRUIT (HTML, JS, JSON, manifestes, robots, plan du
   site) et fait échouer la construction si l'ancienne règle de paiement
   ou iMessage y revient. Il lit le site construit et non le dépôt : c'est
   ce qui part en ligne, transformations de construire.sh comprises.
   La liste et les exemptions sont dans textes-interdits.mjs.
   Lancer : node .github/scripts/verifier-textes-interdits.mjs site
   ===================================================================== */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { chercher, exempte } from "./textes-interdits.mjs";

const racine = process.argv[2] || "site";
const LUS = /\.(html|js|mjs|json|webmanifest|txt|xml)$/i;
const fichiers = [];
(function parcourir(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (LUS.test(n)) fichiers.push(p);
  }
})(racine);

let lus = 0;
const fautes = [];
for (const f of fichiers) {
  const chemin = relative(racine, f).split(sep).join("/");
  if (exempte(chemin)) continue;
  lus++;
  for (const x of chercher(readFileSync(f, "utf8"))) fautes.push({ chemin, ...x });
}

if (lus === 0) {
  console.error(`ERREUR : aucun fichier lu dans « ${racine} » — le contrôle ne vérifierait rien.`);
  process.exit(1);
}
if (fautes.length) {
  console.error(`ERREUR : l'ancienne règle de paiement revient dans le site construit (${fautes.length}) :`);
  for (const x of fautes) console.error(`  ${x.chemin} — ${x.quoi}\n      … ${x.extrait} …`);
  process.exit(1);
}
console.log(`Textes interdits : aucun dans les ${lus} fichiers publics du site.`);
