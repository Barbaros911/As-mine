#!/usr/bin/env node
/* =====================================================================
   VERIFIER-PRODUCTION.MJS — la page est-elle vivante APRÈS la mise en ligne
   ---------------------------------------------------------------------
   Une fusion n'est pas une preuve. Le site se construit, GitHub le
   publie, et personne ne va voir derrière. Ce contrôleur y va.

   IL PREND UNE ADRESSE, N'IMPORTE LAQUELLE. C'est la seule décision de
   conception qui compte ici : le même fichier éprouve le site construit
   en local et le site en ligne. Deux contrôleurs, un pour chaque cible,
   auraient divergé — et c'est celui qu'on oublie qui aurait laissé
   passer la panne. C'est aussi ce qui le rend éprouvable depuis une
   machine sans réseau : on le fait tourner contre `site/`.

   CE QU'IL ÉPROUVE, ET POURQUOI CES CINQ-LÀ :

   1. LES PAGES CRITIQUES RÉPONDENT. Le site a dix portes d'entrée et
      une seule est sur la page d'accueil. Une redirection cassée ne se
      voit jamais depuis l'accueil.

   2. AUCUN FICHIER DU SITE NE MANQUE. C'est LE point de rupture de ce
      dépôt, écrit noir sur blanc dans CLAUDE.md : `construire.sh` ne
      publie que ce qu'il nomme, un fichier oublié marche parfaitement en
      local — où le serveur sert le dépôt entier — et reste introuvable
      en ligne. Une bibliothèque de carte absente ne lève aucune erreur :
      il manque une carte, c'est tout.
      ON NE COMPTE QUE NOTRE PROPRE ORIGINE. Un serveur de tuiles lent ou
      un calculateur d'itinéraire muet n'est pas notre régression — le
      site est écrit pour tenir sans eux. Confondre les deux ferait
      sonner l'alerte une nuit sur deux, et c'est la meilleure façon de
      la faire ignorer.

   3. AUCUNE ERREUR JAVASCRIPT. Une page qui lève au chargement s'affiche
      parfaitement et ne fait plus rien au clic.

   4. CE QUI PERMET DE RÉSERVER EST BIEN LÀ. Deux adresses et le bouton
      « Voir mon prix ». Sans eux la page est en ligne et ne sert à rien
      — et c'est exactement ce qu'un contrôle de code HTTP ne voit pas.

   5. LA DÉMO DES PROFESSIONNELS RESTE FERMÉE. Sans session, elle renvoie
      au formulaire et n'appelle pas le serveur. On n'exige JAMAIS qu'elle
      s'ouvre : c'est le serveur qui en décide, sur une session.

   Lancer :
     node .github/scripts/verifier-production.mjs https://elatransfer.com/
     node .github/scripts/verifier-production.mjs http://127.0.0.1:8099/
   Sortie : 0 si tout va bien, 1 sinon. Rapport JSON sur --rapport.
   ===================================================================== */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith("--")) || "https://elatransfer.com/").replace(/\/*$/, "/");
const RAPPORT = (args.find((a) => a.startsWith("--rapport=")) || "").split("=")[1] || "";

/* LES PORTES D'ENTRÉE, ET CHACUNE DOIT PROUVER QUI ELLE EST.
   `titre` n'est pas un confort : un code 200 ne dit pas QUELLE page a
   répondu. Ce dépôt a déjà payé exactement ça — un mauvais réglage
   d'hébergeur (`html_handling`) faisait servir le site de réservation à
   l'adresse `/demos/`, en 200, et Barbaros l'a vu avant nous. Un contrôle
   de code HTTP serait resté vert.
   ÉPROUVÉ : en supprimant `exploitant/index.html`, le serveur rend un
   listage de dossier en 200 — le contrôle par titre tombe, le contrôle
   par code passait.
   `demos/` éprouve en plus la résolution d'un DOSSIER, qui est un
   mécanisme de service différent d'un fichier exact. */
/* DIX PORTES DEPUIS LE 2 OCTOBRE 2026, TREIZE DEPUIS LE 8 OCTOBRE (la démo des
   professionnels, en fin de liste). Les cinq ajoutées sont celles que
   la vérification d'avant lancement a trouvées sans surveillance : le
   tunnel visé par les cartes du flyer, l'admin où mène admin.html, la page
   du QR easyHotel, et la réception sous ses DEUX adresses — la nouvelle
   (PR #281) et l'ancienne, que des icônes posées sur des tablettes
   continuent d'ouvrir. Toutes sont construites par la recette ; aucune
   n'était vérifiée une fois en ligne. */
/* L'EMPREINTE DU SITE PUBLIC EST LA MARQUE, PAS LE MÉTIER (4 octobre 2026).
   Elle était « Chauffeur privé » : le jour où Barbaros a retitré le site
   (« Elatransfer — Transferts privés & solutions de réservation »), ce
   contrôle a crié sur une page parfaitement servie et ouvert l'Issue #300.
   Un libellé se reformule, une marque non.
   DEPUIS LE 5 OCTOBRE 2026 LA MARQUE EST PARTOUT « Elatransfer », admin et
   hôtel compris : elle ne distingue plus une porte d'une autre. Chaque page
   construite porte son espace (« data-ela-space ») ; on l'exige en plus du
   titre là où il existe — c'est lui qui dit QUELLE page a répondu. */
const PAGES = [
  { chemin: "", quoi: "le site de réservation", titre: "Elatransfer", espace: "public" },
  { chemin: "application.html", quoi: "le tunnel de r\u00e9servation (cartes du flyer)", titre: "Elatransfer", espace: "hotel-client" },
  { chemin: "admin.html", quoi: "le raccourci exploitant", titre: "Espace exploitant" },
  { chemin: "exploitant/", quoi: "l'espace exploitant", titre: "Espace exploitant" },
  { chemin: "ela-admin/", quoi: "l'admin historique (o\u00f9 m\u00e8ne admin.html)", titre: "Administration" },
  /* Admin v2 n'est plus publié (3 octobre 2026) : son ancienne adresse doit
     RENVOYER vers l'admin, pas rendre un 404 ni rouvrir Admin v2. « Admin »
     seul aurait accepté les deux titres : on exige celui de la redirection. */
  { chemin: "admin-v2.html", quoi: "l'ancienne adresse d'Admin v2 (renvoie vers l'admin)", titre: "Espace exploitant" },
  { chemin: "easyhotel-client/", quoi: "la page du QR easyHotel", titre: "easyHotel A\u00e9roville" },
  { chemin: "easyhotel-reception/", quoi: "la r\u00e9ception easyHotel (ancienne adresse, ic\u00f4nes d\u00e9j\u00e0 pos\u00e9es)", titre: "R\u00e9ception easyHotel" },
  { chemin: "reception/easyhotel-aeroville/", quoi: "la r\u00e9ception easyHotel (adresse propre)", titre: "R\u00e9ception easyHotel" },
  { chemin: "demos/", quoi: "la galerie (r\u00e9solution de dossier)", titre: "D\u00e9monstrations" },
  /* LA DÉMO DES PROFESSIONNELS (8 octobre 2026). La page de vente doit
     rester dans Google ; la démo n'y doit jamais entrer, et elle doit
     arriver FERMÉE — c'est le serveur qui l'ouvre, sur une session. On ne
     vérifie donc jamais qu'elle s'ouvre : seulement qu'elle est servie,
     masquée et hors de Google. Le titre de la page pro contient la marque,
     comme celui de l'accueil : c'est son adresse canonique qui dit qu'on
     n'a pas reçu l'accueil à sa place (le piège de `/demos/`). */
  { chemin: "professionnels/", quoi: "la page des professionnels", titre: "Elatransfer",
    marqueur: 'href="https://elatransfer.com/professionnels/"', robots: "index" },
  { chemin: "demo/hotel/", quoi: "la d\u00e9mo h\u00f4tel (vue client)", titre: "D\u00e9monstration", espace: "demo",
    marqueur: "html.demo-attente body{visibility:hidden}", robots: "noindex" },
  { chemin: "demo/hotel/reception/", quoi: "la d\u00e9mo h\u00f4tel (vue r\u00e9ception)", titre: "D\u00e9monstration", espace: "demo",
    marqueur: "html.demo-attente body{visibility:hidden}", robots: "noindex" },
];

/* La balise robots lue comme le ferait Google : `noindex` dans le contenu
   de la balise <meta name="robots">, ou dans l'en-tête X-Robots-Tag
   (Cloudflare le pose sur /demo/*). Absente = indexable. */
function indexable(html, entete) {
  const balises = [...html.matchAll(/<meta[^>]+name=["']robots["'][^>]*>/gi)].map((m) => m[0]);
  return !/noindex/i.test(balises.join(" ") + " " + (entete || ""));
}

/* Ce sans quoi on ne peut pas réserver. On vise des RÔLES stables, pas
   des libellés : un libellé se reformule, un champ de départ non. */
const INDISPENSABLES = [
  { sel: "#depart", quoi: "le champ de départ" },
  { sel: "#arrivee", quoi: "le champ d'arrivée" },
  { sel: '[data-t="btn_prix"]', quoi: "le bouton « Voir mon prix »" },
];

const origine = new URL(BASE).origin;
const echecs = [];
const rapport = { base: BASE, date: new Date().toISOString(), echecs: [], controles: [] };

const ok = (m) => { console.log(`  ✓ ${m}`); rapport.controles.push({ ok: true, m }); };
const ko = (m) => { console.log(`  ✗ ${m}`); echecs.push(m); rapport.controles.push({ ok: false, m }); };

console.log(`\n=== CONTRÔLE DE PRODUCTION — ${BASE} ===\n`);

/* ---- 1. Les pages critiques répondent ------------------------------ */
console.log("Les pages répondent :");
for (const p of PAGES) {
  const url = BASE + p.chemin;
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) { ko(`${p.quoi} (${url}) r\u00e9pond ${r.status}`); continue; }
    const html = await r.text();
    const titre = (html.match(/<title>([^<]*)<\/title>/i) || [, ""])[1];
    const espace = (html.match(/data-ela-space="([^"]*)"/i) || [, ""])[1];
    if (p.espace && espace !== p.espace) ko(`${p.quoi} (${url}) r\u00e9pond ${r.status} mais sert une AUTRE page \u2014 espace lu : \u00ab ${espace || "(aucun)"} \u00bb`);
    else if (!titre.includes(p.titre)) ko(`${p.quoi} (${url}) r\u00e9pond ${r.status} mais sert une AUTRE page \u2014 titre lu : \u00ab ${titre.trim() || "(aucun)"} \u00bb`);
    else if (p.marqueur && !html.includes(p.marqueur)) ko(`${p.quoi} (${url}) r\u00e9pond ${r.status} mais sert une AUTRE page \u2014 il y manque \u00ab ${p.marqueur} \u00bb`);
    else ok(`${p.quoi} \u2014 ${r.status}, c'est bien la bonne page`);
    if (p.robots) {
      const lu = indexable(html, r.headers.get("x-robots-tag")) ? "index" : "noindex";
      if (lu === p.robots) ok(`${p.quoi} \u2014 ${p.robots === "index" ? "indexable par Google" : "hors de Google (noindex)"}`);
      else ko(`${p.quoi} (${url}) est ${lu === "index" ? "INDEXABLE alors qu'elle ne doit pas sortir dans Google" : "en NOINDEX alors qu'elle doit sortir dans Google"}`);
    }
  } catch (e) {
    ko(`${p.quoi} (${url}) injoignable : ${e.message}`);
  }
}

/* ---- 2 à 4. La page d'accueil, vraiment ouverte --------------------- */
const navigateur = await chromium.launch();
const ctx = await navigateur.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
});
const page = await ctx.newPage();

const erreurs = [];
const manquants = [];
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("response", (r) => {
  /* Notre origine seulement — voir l'en-tête. */
  if (r.status() >= 400 && new URL(r.url()).origin === origine) {
    manquants.push(`${r.status()} ${r.url()}`);
  }
});
page.on("requestfailed", (r) => {
  if (new URL(r.url()).origin === origine) {
    manquants.push(`échec ${r.url()}`);
  }
});

console.log("\nLa page d'accueil, ouverte pour de vrai :");
let ouverte = false;
try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  ouverte = true;
  ok("la page s'ouvre");
} catch (e) {
  ko(`la page ne s'ouvre pas : ${e.message.split("\n")[0]}`);
}

if (ouverte) {
  /* On laisse le temps aux ressources différées de partir. */
  await page.waitForTimeout(3000);

  if (manquants.length) {
    ko(`${manquants.length} fichier(s) du site manquent — c'est la recette de publication :`);
    manquants.slice(0, 8).forEach((m) => console.log(`      ${m}`));
  } else ok("aucun fichier du site ne manque");

  if (erreurs.length) {
    ko(`${erreurs.length} erreur(s) JavaScript :`);
    erreurs.slice(0, 3).forEach((m) => console.log(`      ${m.split("\n")[0]}`));
  } else ok("aucune erreur JavaScript");

  for (const i of INDISPENSABLES) {
    const vu = await page.locator(i.sel).first().isVisible().catch(() => false);
    if (vu) ok(`${i.quoi} est là`);
    else ko(`${i.quoi} (${i.sel}) est absent ou invisible — on ne peut pas réserver`);
  }

  const trop = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  if (trop > 1) ko(`la page déborde de ${trop} px à 390 px`);
  else ok("aucun débordement horizontal à 390 px");
}

/* ---- 5. La démo reste fermée sans session ---------------------------
   Un visiteur qui arrive sur /demo/hotel/ sans avoir rempli le formulaire
   doit être renvoyé à /professionnels/#demo, sans jamais voir la démo et
   sans que la page appelle le serveur (sans session, il n'y a rien à
   demander). Le contexte est neuf : aucun stockage, donc aucune session. */
console.log("\nLa démo, ouverte sans session :");
const ctxDemo = await navigateur.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const pDemo = await ctxDemo.newPage();
const appelsDemo = [];
pDemo.on("request", (r) => { if (/supabase\.co/i.test(r.url())) appelsDemo.push(r.url()); });
try {
  await pDemo.goto(BASE + "demo/hotel/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pDemo.waitForURL((u) => new URL(u).pathname.startsWith(new URL(BASE).pathname + "professionnels/"), { timeout: 10000 });
  ok("sans session, la démo renvoie au formulaire des professionnels");
} catch (e) {
  const ou = pDemo.url();
  const visible = await pDemo.evaluate(() => !document.documentElement.classList.contains("demo-attente")).catch(() => null);
  ko(`sans session, la démo ne renvoie pas au formulaire \u2014 adresse finale : ${ou}${visible ? " (et la page est AFFICHÉE)" : ""}`);
}
if (appelsDemo.length) ko(`sans session, la démo a appelé le serveur : ${appelsDemo[0]}`);
else ok("sans session, la démo n'appelle pas le serveur");
await ctxDemo.close();

await navigateur.close();

rapport.echecs = echecs;
if (RAPPORT) writeFileSync(RAPPORT, JSON.stringify(rapport, null, 2));

console.log(
  echecs.length === 0
    ? `\n=== LE SITE EN LIGNE RÉPOND — ${rapport.controles.length} contrôles au vert ===\n`
    : `\n=== ${echecs.length} PROBLÈME(S) EN PRODUCTION ===\n`
);
process.exit(echecs.length === 0 ? 0 : 1);
