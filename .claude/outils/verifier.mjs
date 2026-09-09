#!/usr/bin/env node
/* =====================================================================
   VERIFIER.MJS — le coup d'œil avant de montrer une page
   ---------------------------------------------------------------------
   Ouvre vraiment la page, sur téléphone et sur ordinateur, et rend deux
   captures plus trois verdicts. Il ne remplace AUCUNE suite de tests :
   il répond à la question « est-ce que ça tient debout ? » en dix
   secondes, avant de vous montrer quoi que ce soit.

   CE QU'IL ÉPROUVE, ET POURQUOI CES TROIS-LÀ :
   1. Un débordement horizontal. Sur un téléphone, une page qui déborde
      se balade de gauche à droite sous le pouce.
   2. Une erreur JavaScript. Une page qui lève une erreur au chargement
      peut s'afficher parfaitement et ne plus rien faire au clic.
   3. UN BOUTON RECOUVERT. C'est le défaut le plus coûteux du projet :
      « Voir mon prix » passait derrière la barre du bas, le client
      appuyait au milieu du bouton et changeait d'écran sans un mot.
      Rien ne se voyait à l'écran — ni sur une capture. Seule la mesure
      le donne : on demande à la page QUI reçoit le doigt au centre de
      chaque bouton.

   390 × 844 est la taille d'un iPhone, hauteur comprise. La hauteur
   compte : à 390 × 560 la page se remet en page et le verdict change.

   Lancer :  npx http-server -p 8099 -s .
             node .claude/outils/verifier.mjs [adresse] [dossier-captures]
   ===================================================================== */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const ADRESSE = process.argv[2] || "http://127.0.0.1:8099/";
const SORTIE = process.argv[3] || "/tmp/verification";
const ECRANS = [
  { nom: "telephone", width: 390, height: 844, dpr: 2 },
  { nom: "ordinateur", width: 1280, height: 800, dpr: 1 },
];

mkdirSync(SORTIE, { recursive: true });
const navigateur = await chromium.launch();
let fautes = 0;

for (const e of ECRANS) {
  const ctx = await navigateur.newContext({
    viewport: { width: e.width, height: e.height },
    deviceScaleFactor: e.dpr,
    locale: "fr-FR",
  });
  const p = await ctx.newPage();

  /* Tout ce qui n'est pas le serveur local échoue TOUT DE SUITE. Sans ça
     le navigateur attend trente secondes par appel, et on ne vérifie
     plus rien — on attend. C'est aussi le cas réel d'un client dans un
     parking d'aéroport : la page doit tenir sans ses dépendances. */
  await p.route("**", (r) => {
    const h = new URL(r.request().url()).hostname;
    return h === "127.0.0.1" || h === "localhost" ? r.continue() : r.abort();
  });

  const erreurs = [];
  p.on("pageerror", (err) => erreurs.push(err.message));

  console.log(`\n═══ ${e.nom.toUpperCase()} — ${e.width} × ${e.height} ═══`);
  try {
    await p.goto(ADRESSE, { waitUntil: "domcontentloaded", timeout: 15000 });
  } catch (err) {
    console.log(`  ✗ la page ne s'ouvre pas : ${err.message.split("\n")[0]}`);
    console.log(`    (le serveur local tourne-t-il ? npx http-server -p 8099 -s .)`);
    fautes++;
    await ctx.close();
    continue;
  }
  await p.waitForTimeout(1200);

  /* 1. Débordement horizontal — un pixel de marge pour les arrondis. */
  const trop = await p.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  if (trop > 1) { console.log(`  ✗ la page déborde de ${trop} px sur la droite`); fautes++; }
  else console.log(`  ✓ aucun débordement horizontal`);

  /* 2. Erreurs JavaScript. */
  if (erreurs.length) {
    console.log(`  ✗ ${erreurs.length} erreur(s) JavaScript :`);
    erreurs.slice(0, 3).forEach((m) => console.log(`      ${m.split("\n")[0]}`));
    fautes++;
  } else console.log(`  ✓ aucune erreur JavaScript`);

  /* 3. Un bouton recouvert. On vise les RÔLES, pas les balises : tout ce
        sur quoi un client peut appuyer, visible et dans l'écran. */
  const caches = await p.evaluate(() => {
    const dehors = [];
    for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.top < 0 || r.bottom > window.innerHeight) continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      const recu = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (recu && recu !== el && !el.contains(recu) && !recu.contains(el)) {
        dehors.push({
          bouton: (el.textContent || "").trim().slice(0, 28) || el.className.slice(0, 28),
          recouvertPar: recu.className ? "." + String(recu.className).split(" ")[0] : recu.tagName,
        });
      }
    }
    return dehors;
  });
  if (caches.length) {
    console.log(`  ✗ ${caches.length} bouton(s) recouverts — un appui au centre part ailleurs :`);
    caches.forEach((c) => console.log(`      « ${c.bouton} » reçoit : ${c.recouvertPar}`));
    fautes++;
  } else console.log(`  ✓ aucun bouton recouvert`);

  const chemin = `${SORTIE}/${e.nom}.png`;
  await p.screenshot({ path: chemin });
  console.log(`  → capture : ${chemin}`);
  await ctx.close();
}

await navigateur.close();
console.log(
  fautes === 0
    ? `\n═══ RIEN À SIGNALER — les captures sont prêtes à être montrées ═══`
    : `\n═══ ${fautes} POINT(S) À REGARDER AVANT DE MONTRER LA PAGE ═══`
);
process.exit(fautes === 0 ? 0 : 1);
