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
const demos = readFileSync("site/demos/index.html", "utf8");

for (const [name, html] of [["racine", root], ["/application", legacy]]) {
  assert.match(html, /id="depart"/, name + " conserve le départ");
  assert.match(html, /id="arrivee"/, name + " conserve l’arrivée");
  assert.match(html, /id="btnVoirPrix"/, name + " conserve le calcul de prix");
  assert.match(html, /SUPABASE_URL/, name + " conserve l’intégration Supabase");
  assert.match(html, /application-facade\.css/, name + " charge la nouvelle façade");
  assert.match(html, /brand-logo\.webp/, name + " utilise le logo officiel");
  assert.match(html, /easyhotel|reception/i, name + " conserve les modes hôteliers");

  assert.doesNotMatch(html, /CODE_EXPLOITANT|ela_exploitant|id="codeExploitant"|empreinte\(saisi\)/,
    name + " ne republie jamais l’ancien verrou local");
}
// Seule la racine Admin conserve l'authentification et le RBAC exploitant.
assert.match(root, /id="exploitantEmail"/, "la racine demande l’e-mail exploitant");
assert.match(root, /id="exploitantMdp"/, "la racine demande le mot de passe exploitant");
assert.match(root, /\/rest\/v1\/rpc\/est_exploitant/, "la racine vérifie le droit côté serveur");
// Le tunnel Client ne reçoit aucun composant ou appel RBAC Admin.
assert.doesNotMatch(legacy, /id="exploitantEmail"|id="exploitantMdp"|\/rest\/v1\/rpc\/est_exploitant|class="admin-nav"/,
  "/application exclut complètement l’Admin");
assert.doesNotMatch(root, /sites\/ela-public/, "la racine ne doit plus être une copie vitrine");
assert.match(css, /#062f55/i, "la façade conserve le bleu marine ELA");
assert.match(css, /#12c4ee/i, "la façade conserve le cyan ELA");
assert.match(css, /@media\s*\(max-width:\s*899px\)/, "la façade contient le rendu mobile");
// LE NUMÉRO DE CACHE NE SE FIGE PAS, IL NE PEUT QUE MONTER.
// Ce contrôle exigeait « elatransfer-v80 », le numéro du jour où il a été
// écrit. Or la règle du projet impose d'incrémenter ce numéro à CHAQUE
// changement visible — sans quoi les téléphones qui ont installé
// l'application gardent l'ancienne version. Le contrôle interdisait donc
// exactement ce que la règle exige : au premier incrément légitime, la
// PUBLICATION ENTIÈRE s'est arrêtée, et deux correctifs déjà fusionnés ne
// sont jamais arrivés en ligne. On éprouve la règle — un numéro présent, et
// au moins celui de l'unification — jamais une valeur du jour.
const versionCache = sw.match(/elatransfer-v(\d+)/);
assert.ok(versionCache, "le service worker nomme sa version de cache");
assert.ok(Number(versionCache[1]) >= 80,
  "le cache est invalidé après l’unification (v" + versionCache[1] + " < v80)");
assert.match(sw, /application-facade\.css/, "la façade reste disponible hors ligne");

assert.equal(root.includes('location.replace("/ela-admin/")'), false, "le vrai espace exploitant ne doit pas être remplacé par une maquette");
assert.equal(publicGateway.includes("location.replace(cible)"), true, "l’ancienne façade renvoie vers l’accueil unifié");
assert.equal(adminGateway.includes('params.set("exploitant", "1")'), true, "l’ancienne adresse admin ouvre le vrai mode exploitant");
assert.equal(receptionGateway.includes('data-ela-space="hotel-reception"'), true, "l’adresse réception livre son document dédié");
assert.equal(receptionGateway.includes('data-ela-hotel="easyhotel-aeroville"'), true, "l’hôtel de la réception est imposé par le document");
assert.equal(receptionGateway.includes('id="ecran-reception"'), true, "le document Réception contient le comptoir");
assert.doesNotMatch(receptionGateway, /id="exploitantEmail"|class="admin-nav"|id="ecran-chauffeurs"/,
  "le document Réception exclut complètement l’Admin");
for (const [name, html, exemples] of [
  ["admin", adminGateway, ["12/09/2026", "John Smith", "Sophie Martin", "Aller-retour", "30 €"]],
  ["réception", receptionGateway, ["12/09/2026", "John Smith", "Sophie Martin"]],
]) {
  for (const stale of exemples) {
    assert.equal(html.includes(stale), false, name + " ne contient plus la donnée de démonstration : " + stale);
  }
}
assert.equal(existsSync("site/as-mine-transport"), false, "l’ancienne maquette As-mine ne doit plus être publiée");
for (const projetClient of ["point-clotures", "ici-cuisine"]) {
  assert.equal(existsSync(`site/${projetClient}`), false, `${projetClient} reste dans GitHub mais ne doit pas être publié avec ELA`);
  assert.equal(demos.includes(projetClient), false, `${projetClient} ne doit pas apparaître dans la galerie ELA`);
}
for (const ancienneRoute of ["as-mine-transport", "ela-public", "ela-admin", "easyhotel-reception"]) {
  assert.equal(demos.includes(ancienneRoute), false, "la galerie ne doit pas lister l’ancienne route : " + ancienneRoute);
}
assert.equal(demos.includes("Application de réservation ELA Transfer"), true, "la galerie utilise la marque ELA Transfer");

console.log("OK — façade, réservation, anciennes routes et verrou exploitant serveur contrôlés.");
