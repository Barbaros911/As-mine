#!/usr/bin/env node
/* =====================================================================
   REGRESSION-VISUELLE.MJS — ce que la page avait, et ce qu'elle a
   ---------------------------------------------------------------------
   Les suites de tests de ce dépôt éprouvent des RÈGLES : pas de
   débordement, pas de bouton recouvert, pas de fichier manquant. Elles
   sont excellentes pour ce qu'elles nomment. Elles ne voient rien de ce
   que personne n'a pensé à nommer — une couleur qui change, un bloc qui
   se décale de trente pixels, une section qui disparaît sans erreur.
   Jusqu'ici c'est Barbaros qui les trouvait, sur une capture.

   AUCUNE DÉPENDANCE AJOUTÉE, ET C'EST DÉLIBÉRÉ. Comparer deux images
   demande normalement `pixelmatch` et `pngjs`. Ce projet ne tolère
   qu'une seule bibliothèque extérieure (Leaflet, servie depuis le
   dépôt) ; en ajouter deux pour un outil de contrôle serait ouvrir la
   porte par la fenêtre. La comparaison est donc faite par le navigateur
   qui est déjà installé : deux <canvas>, une boucle sur les pixels.

   LE RÉSEAU EXTÉRIEUR EST COUPÉ PENDANT LES CAPTURES. Un fond de carte
   ou une police qui arrive avec un dixième de seconde de retard change
   l'image : la comparaison signalerait un écart tous les jours, et une
   alerte qui se trompe tous les jours ne se lit plus. Seule notre
   origine répond — c'est aussi le cas réel d'un client sans réseau.

   CE QUI FAIT ÉCHOUER, ET CE QUI NE FAIT QUE SIGNALER :
     - une page qui ne s'ouvre plus → ÉCHEC, c'est un défaut ;
     - une page dont l'image a changé → SIGNALÉ, avec le pourcentage et
       l'image des différences. C'est peut-être exactement ce qui était
       demandé. La validation visuelle reste humaine — c'est la règle.

   Lancer :
     node .github/scripts/regression-visuelle.mjs capturer <url> <dossier>
     node .github/scripts/regression-visuelle.mjs comparer <avant> <apres> <sortie>
   ===================================================================== */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [mode, ...reste] = process.argv.slice(2);

/* Les écrans qui comptent. Un par public : le client, l'exploitant, la
   façade publique, le partenaire. On ne capture pas tout le site — une
   liste trop longue rend le rapport illisible, donc ignoré. */
const ECRANS = [
  { nom: "accueil-client", chemin: "" },
  { nom: "admin-v2", chemin: "admin-v2.html" },
  { nom: "facade-publique", chemin: "ela-public/" },
  { nom: "easyhotel-client", chemin: "easyhotel-client/" },
];

const TAILLES = [
  { nom: "telephone", width: 390, height: 844, dpr: 1 },
  { nom: "ordinateur", width: 1280, height: 800, dpr: 1 },
];

/* ------------------------------------------------------------------ */
async function capturer(base, dossier) {
  base = base.replace(/\/*$/, "/");
  mkdirSync(dossier, { recursive: true });
  const navigateur = await chromium.launch();
  let absentes = 0;

  for (const taille of TAILLES) {
    const ctx = await navigateur.newContext({
      viewport: { width: taille.width, height: taille.height },
      deviceScaleFactor: taille.dpr,
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
      reducedMotion: "reduce",
    });
    /* L'HORLOGE EST FIGÉE, ET SANS ÇA L'OUTIL CRIERAIT SUR CHAQUE PR.
       Le formulaire d'accueil s'ouvre sur « maintenant + 15 minutes »
       arrondi au pas de 5 : deux captures prises à quelques minutes
       d'écart n'affichent pas la même heure. Mesuré — 65 pixels d'écart
       sur l'accueil entre la capture AVANT et la capture APRÈS, alors
       qu'aucun fichier du site n'avait changé. Une alerte qui se trompe
       à chaque passage ne se lit plus, et c'est la deuxième fois que ce
       projet l'apprend : les suites du dépôt ancrent déjà l'horloge du
       navigateur pour la même raison. */
    await ctx.clock.setFixedTime(new Date("2026-06-15T09:30:00Z"));
    const page = await ctx.newPage();
    await page.route("**", (r) => {
      const h = new URL(r.request().url()).hostname;
      return h === "127.0.0.1" || h === "localhost" ? r.continue() : r.abort();
    });

    for (const e of ECRANS) {
      const nom = `${e.nom}--${taille.nom}`;
      try {
        const r = await page.goto(base + e.chemin, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        if (!r || !r.ok()) throw new Error(`réponse ${r ? r.status() : "nulle"}`);
        /* UN CODE 200 NE DIT PAS QU'ON A UNE PAGE DU SITE. Éprouvé : en
           supprimant `easyhotel-client/index.html`, le serveur rend un
           listage de dossier en 200 — la capture réussissait et la page
           cassée était rapportée comme un simple « changement d'aspect ».
           Toute page de ce site porte un `meta viewport`, parce que le
           mobile d'abord est la règle ; aucun listage n'en a. */
        const estUnePage = await page.locator('meta[name="viewport"]').count();
        if (!estUnePage) throw new Error("ce n'est pas une page du site (aucun meta viewport)");
        /* Les animations sont figées : une transition en cours rendrait
           deux captures différentes du même écran. */
        await page.addStyleTag({
          content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
        });
        await page.waitForTimeout(1500);
        writeFileSync(
          join(dossier, `${nom}.png`),
          await page.screenshot({ fullPage: true })
        );
        console.log(`  ✓ ${nom}`);
      } catch (err) {
        console.log(`  ✗ ${nom} — ${err.message.split("\n")[0]}`);
        absentes++;
      }
    }
    await ctx.close();
  }
  await navigateur.close();
  return absentes;
}

/* ------------------------------------------------------------------ */
async function comparer(avant, apres, sortie) {
  mkdirSync(sortie, { recursive: true });
  const noms = new Set([
    ...(existsSync(avant) ? readdirSync(avant) : []),
    ...(existsSync(apres) ? readdirSync(apres) : []),
  ].filter((f) => f.endsWith(".png")));

  const navigateur = await chromium.launch();
  const page = await navigateur.newPage();
  const lignes = [];
  let disparues = 0;

  for (const fichier of [...noms].sort()) {
    const a = join(avant, fichier);
    const b = join(apres, fichier);

    if (!existsSync(b)) {
      lignes.push({ ecran: fichier.replace(/\.png$/, ""), verdict: "DISPARU", pct: null });
      disparues++;
      continue;
    }
    if (!existsSync(a)) {
      lignes.push({ ecran: fichier.replace(/\.png$/, ""), verdict: "NOUVEAU", pct: null });
      continue;
    }

    const b64 = (p) => readFileSync(p).toString("base64");
    const res = await page.evaluate(
      async ([srcA, srcB]) => {
        const charger = (src) =>
          new Promise((ok, ko) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = () => ko(new Error("image illisible"));
            i.src = src;
          });
        const [ia, ib] = await Promise.all([charger(srcA), charger(srcB)]);
        const L = Math.max(ia.width, ib.width);
        const H = Math.max(ia.height, ib.height);

        const dessiner = (img) => {
          const c = document.createElement("canvas");
          c.width = L; c.height = H;
          const x = c.getContext("2d", { willReadFrequently: true });
          x.fillStyle = "#ffffff"; x.fillRect(0, 0, L, H);
          x.drawImage(img, 0, 0);
          return x.getImageData(0, 0, L, H);
        };
        const da = dessiner(ia), db = dessiner(ib);

        const diff = document.createElement("canvas");
        diff.width = L; diff.height = H;
        const dx = diff.getContext("2d");
        const sortie = dx.createImageData(L, H);

        /* Seuil par canal : une différence d'un ou deux niveaux vient du
           rendu, pas d'un changement de dessin. */
        const SEUIL = 12;
        let differents = 0;
        for (let i = 0; i < da.data.length; i += 4) {
          const ecart =
            Math.abs(da.data[i] - db.data[i]) +
            Math.abs(da.data[i + 1] - db.data[i + 1]) +
            Math.abs(da.data[i + 2] - db.data[i + 2]);
          if (ecart > SEUIL) {
            differents++;
            sortie.data[i] = 255; sortie.data[i + 1] = 0;
            sortie.data[i + 2] = 60; sortie.data[i + 3] = 255;
          } else {
            /* Le reste en gris pâle : on veut voir OÙ ça change, donc il
               faut garder la page lisible derrière les marques. */
            const gris = 235 + (da.data[i] > 200 ? 15 : 0);
            sortie.data[i] = gris; sortie.data[i + 1] = gris;
            sortie.data[i + 2] = gris; sortie.data[i + 3] = 255;
          }
        }
        dx.putImageData(sortie, 0, 0);
        return {
          differents,
          pct: (differents / (L * H)) * 100,
          hauteurAvant: ia.height, hauteurApres: ib.height,
          largeurAvant: ia.width, largeurApres: ib.width,
          image: diff.toDataURL("image/png"),
        };
      },
      [`data:image/png;base64,${b64(a)}`, `data:image/png;base64,${b64(b)}`]
    );

    /* LE SEUIL EST UN NOMBRE DE PIXELS, PAS UN POURCENTAGE, et c'est la
       falsification qui l'a imposé : repeindre la couleur d'accent du site
       ne touchait que 0,02 % de la surface d'une longue page — sous le
       seuil, donc déclaré « identique » alors que tous les boutons avaient
       changé de couleur. Une grande page diluait le défaut.
       20 pixels est tenable parce que le bruit mesuré est EXACTEMENT nul :
       deux captures du même site rendent 0 pixel d'écart sur les huit
       écrans. Le seuil ne protège donc que d'un pixel d'anticrénelage
       égaré, pas d'une instabilité qu'on n'aurait pas su corriger. */
    const CHANGE = res.differents >= 20;
    if (CHANGE) {
      writeFileSync(
        join(sortie, fichier.replace(/\.png$/, "--differences.png")),
        Buffer.from(res.image.split(",")[1], "base64")
      );
    }
    lignes.push({
      ecran: fichier.replace(/\.png$/, ""),
      verdict: CHANGE ? "CHANGÉ" : "identique",
      pct: res.pct,
      differents: res.differents,
      hauteur: res.hauteurAvant === res.hauteurApres
        ? null
        : `${res.hauteurAvant} → ${res.hauteurApres} px`,
    });
  }
  await navigateur.close();

  /* ---- le rapport ---- */
  const md = ["## Régression visuelle", ""];
  if (!lignes.length) md.push("_Aucune capture à comparer._");
  else {
    md.push("| Écran | Verdict | Pixels changés | Part de la page | Hauteur |");
    md.push("|---|---|---|---|---|");
    for (const l of lignes) {
      md.push(
        `| \`${l.ecran}\` | ${l.verdict} | ${l.differents === undefined ? "—" : l.differents.toLocaleString("fr-FR")} | ${l.pct === null || l.pct === undefined ? "—" : l.pct.toFixed(3) + " %"} | ${l.hauteur || "inchangée"} |`
      );
    }
    md.push("");
    const changes = lignes.filter((l) => l.verdict === "CHANGÉ");
    md.push(
      changes.length
        ? `**${changes.length} écran(s) ont changé d'aspect.** Les images des différences sont dans les artefacts : le rouge marque ce qui a bougé. Un changement n'est pas un défaut — c'est peut-être exactement ce qui était demandé. **La validation visuelle reste humaine.**`
        : "**Aucun écran n'a changé d'aspect.**"
    );
    if (disparues) md.push("", `> ⚠️ **${disparues} écran(s) ne s'ouvrent plus.** Ce n'est pas un changement d'aspect, c'est un défaut.`);
  }
  const texte = md.join("\n");
  writeFileSync(join(sortie, "rapport.md"), texte);
  console.log("\n" + texte + "\n");
  return disparues;
}

/* ------------------------------------------------------------------ */
if (mode === "capturer") {
  const absentes = await capturer(reste[0] || "http://127.0.0.1:8099/", resolve(reste[1] || "captures"));
  process.exit(absentes > 0 ? 1 : 0);
} else if (mode === "comparer") {
  const disparues = await comparer(resolve(reste[0]), resolve(reste[1]), resolve(reste[2] || "differences"));
  process.exit(disparues > 0 ? 1 : 0);
} else {
  console.error("usage : capturer <url> <dossier>  |  comparer <avant> <apres> <sortie>");
  process.exit(2);
}
