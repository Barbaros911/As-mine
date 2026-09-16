/* =====================================================================
   LA DOCUMENTATION EST COMPARÉE AU CODE
   ---------------------------------------------------------------------
   POURQUOI CETTE SUITE EXISTE. Le 16 septembre 2026, CLAUDE.md annonçait
   « Berline 2,35 €/km · Van 4,08 €/km ». Le code facturait 2,65 et 4,00
   depuis la PR #123. Personne ne pouvait le savoir en lisant le fichier :
   un document ne se trompe jamais bruyamment.

   CE QUE ÇA COÛTE N'EST PAS THÉORIQUE. Le prix d'Elatransfer est FERME,
   donc opposable. Une note qui annonce un tarif périmé, c'est le montant
   qu'on annonce au téléphone, celui qu'on recopie dans les CGV, et celui
   qu'un client oppose le jour où il compare. La règle « toucher à la
   grille veut dire toucher aux CGV » ne vaut que si quelque chose vérifie
   qu'elle a été tenue.

   LE PRINCIPE. Le CODE est la vérité — c'est lui qui encaisse. Un
   document qui le contredit a tort, et la construction s'arrête. C'est le
   seul moyen qu'une note reste vraie sans que personne n'y pense : tout
   ce qui s'écrit à la main finit périmé, pas par négligence mais parce
   qu'il y a toujours un soir où l'on fusionne à 2 h.

   CE QU'ELLE NE CONTRÔLE PAS, ET C'EST VOULU. Ce qui a été DÉCIDÉ et ce
   qui est PRÉVU ne se mesurent nulle part. Ça vit dans PROJECT_STATE.md
   et dans les Issues [TEAM], et ça ne peut être tenu que par des humains.

   NI NAVIGATEUR NI RÉSEAU — comme test-notification.mjs et test-push.mjs.
   Elle tourne en une seconde, donc elle peut bloquer la publication.

   Usage :  node test-doc.mjs
   ===================================================================== */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const page = readFileSync("index.html", "utf8");
const doc  = readFileSync("CLAUDE.md", "utf8");
/* TEAM_RULES peut ne pas exister sur une branche ancienne : on saute
   plutôt que de faire tomber la suite pour un fichier absent. */
const reglesTexte = existsSync("TEAM_RULES.md")
  ? readFileSync("TEAM_RULES.md", "utf8") : null;

/* LA SECTION QUI FAIT FOI. CLAUDE.md garde volontairement la description
   de l'ANCIEN site « pour comprendre d'où viennent les décisions » — on y
   lit encore 1,75 €/km, quatre gammes et des packs. Les y chercher ferait
   tomber la suite sur de l'histoire correctement archivée. CLAUDE.md le
   dit lui-même : « En cas de contradiction, c'est cette section-ci qui dit
   vrai. » On ne lit donc que celle-là. */
const depart = doc.search(/^# LE SITE\b/m);
const courant = depart < 0 ? "" : doc.slice(depart);

/* LE MÊME DÉCOUPAGE SERT AUX FICHIERS ET AUX BRANCHES, mais à l'envers :
   là, le mémo général du début (construire.sh, CLOUDFLARE.md, les règles
   de publication) est VIVANT, seul le bloc du milieu est de l'histoire.
   `vivant` = tout le document SAUF la description de l'ancien site. Sans
   ce retrait, la suite réclamait test.mjs et tailwind.config.js, supprimés
   à la bascule et cités précisément pour dire qu'ils l'ont été. Un contrôle
   qui se plaint d'une archive correcte finit par être désactivé en entier. */
const archiveDebut = doc.search(/^# Asmine — l'application de réservation\s*$/m);
let vivant = (archiveDebut > 0 && depart > archiveDebut)
  ? doc.slice(0, archiveDebut) + doc.slice(depart)
  : doc;

/* UNE SECONDE DÉCOUPE, PLUS FINE. La section du site actuel s'ouvre sur
   la liste de ce qui a été SUPPRIMÉ à la bascule — elle nomme des fichiers
   précisément pour dire qu'ils n'existent plus. Les exiger reviendrait à
   demander qu'on ressuscite ce qu'on vient d'enterrer. Le retrait est
   nommé et borné, jamais deviné d'après la présence du mot « supprimé » :
   une heuristique sur la prose finirait par excuser un vrai oubli. */
vivant = vivant.replace(
  /\*\*CE QUI A ÉTÉ SUPPRIMÉ À LA BASCULE[\s\S]*?(?=\n\*\*IL N'Y A PAS DE PAGE DE SECOURS)/,
  "");

let ok = 0; const echecs = [];
function verifier(nom, condition, detail){
  if(condition) { ok++; return true; }
  echecs.push("  ✗ " + nom + (detail ? "\n      " + detail : ""));
  return false;
}

/* --- La section existe. Sans elle, tout ce qui suit passerait au vert
       sans rien lire — l'échec le plus dangereux d'une suite. --------- */
verifier(
  "CLAUDE.md porte la section du site actuel",
  courant.length > 2000,
  "le titre « # LE SITE » a disparu ou la section est vide : plus rien n'est vérifié"
);

/* --- Une constante du code, lue dans la page ---------------------- */
function constante(nom){
  const m = page.match(new RegExp("\\b" + nom + "\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)"));
  return m ? Number(m[1]) : null;
}

/* ═══ 1. LA GRILLE — le contrôle qui a motivé toute la suite ═══
   On lit le tableau markdown de CLAUDE.md et on le compare à GAMMES.
   On vise le TABLEAU et non toute la prose : la prose raconte aussi
   l'histoire des tarifs (« il a fait baisser les deux tarifs »), et une
   narration au passé n'est pas une affirmation au présent. */
const gammes = {};
const blocGammes = page.match(/var GAMMES\s*=\s*\[([\s\S]*?)\]/);
if(blocGammes){
  for(const l of blocGammes[1].matchAll(
        /cle:"([a-z_]+)"[^}]*parKm:\s*([0-9.]+)[^}]*mini:\s*([0-9]+)/g)){
    gammes[l[1]] = { parKm:Number(l[2]), mini:Number(l[3]) };
  }
}
verifier("le code déclare ses deux gammes", Object.keys(gammes).length >= 2,
  "GAMMES n'a pas pu être relu dans index.html — le reste ne vérifie rien");

const nomVersCle = { berline:"berline", van:"van" };
let lignesLues = 0;
for(const l of courant.matchAll(
      /^\|\s*(Berline|Van)[^|]*\|\s*([0-9]+[,.][0-9]+)\s*€[^|]*\|\s*([0-9]+)\s*€[^|]*\|/gmi)){
  lignesLues++;
  const cle = nomVersCle[l[1].toLowerCase()];
  const docKm = Number(l[2].replace(",", "."));
  const docMini = Number(l[3]);
  const vrai = gammes[cle];
  if(!vrai){ verifier("la gamme « " + l[1] + " » du tableau existe dans le code", false); continue; }
  verifier(
    "le tarif au km de « " + l[1] + " » est celui du code",
    docKm === vrai.parKm,
    "CLAUDE.md annonce " + l[2] + " €/km, le code facture " + vrai.parKm.toFixed(2).replace(".", ",") +
    " €/km. Le prix est ferme donc opposable : c'est ce chiffre-là qu'on annonce au téléphone."
  );
  verifier(
    "le montant minimum de « " + l[1] + " » est celui du code",
    docMini === vrai.mini,
    "CLAUDE.md annonce " + docMini + " €, le code applique " + vrai.mini + " €."
  );
}
verifier("le tableau de la grille est lisible dans CLAUDE.md", lignesLues >= 2,
  "aucune ligne Berline/Van trouvée : la grille n'est plus documentée, ou sa forme a changé " +
  "et ce contrôle est devenu aveugle — ce qui est pire qu'un contrôle absent");

/* ═══ 2. LES CONSTANTES QUE LA DOC CHIFFRE ═══
   Chaque entrée nomme la constante ET la phrase qui l'annonce. Une
   constante qui bouge sans que la phrase suive, c'est le site qui applique
   un délai en en annonçant un autre — déjà arrivé au passage de 20 à 15
   minutes, où la constante, deux phrases et une table d'exemples devaient
   bouger ensemble. */
const chiffres = [
  { nom:"RAYON_ZONE_KM",       motif:/(\d+)\s*km autour de Paris/i,
    quoi:"le rayon de la zone desservie" },
  { nom:"DELAI_MINIMUM_MIN",   motif:/`DELAI_MINIMUM_MIN`\s*vaut\s*(\d+)/i,
    quoi:"le préavis minimum avant un départ" },
  { nom:"OPTION_PANCARTE_EUR", motif:/OPTION_PANCARTE_EUR[^\n]*?|PANCARTE EST UNE OPTION À\s*(\d+)\s*€/i,
    motifVrai:/UNE OPTION À\s*(\d+)\s*€/i, quoi:"le prix de la pancarte" },
  { nom:"JOURS_ALERTE",        motif:/\*\*(\d+)\s*jours d'avance\*\*\s*\(`JOURS_ALERTE`\)/i,
    quoi:"l'alerte sur les papiers des chauffeurs" },
  { nom:"PAS_MINUTES",         motif:/CRÉNEAUX VONT DE\s*(\d+)\s*EN\s*\d+\s*MINUTES/i,
    quoi:"le pas des créneaux d'heure" }
];
for(const c of chiffres){
  const vrai = constante(c.nom);
  if(!verifier("le code déclare " + c.nom, vrai !== null)) continue;
  const m = courant.match(c.motifVrai || c.motif);
  if(!verifier("CLAUDE.md annonce " + c.quoi, !!m,
      "la phrase qui chiffrait " + c.nom + " a disparu : le contrôle ne surveille plus rien")) continue;
  verifier(
    c.quoi + " est celui du code",
    Number(m[1]) === vrai,
    "CLAUDE.md dit " + m[1] + ", le code applique " + vrai + " (" + c.nom + ")."
  );
}

/* ═══ 3. LE PAS DE L'HEURE VIT À DEUX ENDROITS ═══
   `step` est en SECONDES dans l'attribut, en minutes dans le script.
   Désaccordés, le champ propose des heures que la borne refuse. */
const step = page.match(/id="heure"[^>]*step="(\d+)"/) || page.match(/step="(\d+)"[^>]*id="heure"/);
if(step) verifier("l'attribut step du champ d'heure suit PAS_MINUTES",
  Number(step[1]) === constante("PAS_MINUTES") * 60,
  "step=\"" + step[1] + "\" s, soit " + (Number(step[1])/60) + " min, contre PAS_MINUTES=" + constante("PAS_MINUTES"));

/* ═══ 4. AUCUN CODE D'ACCÈS EN CLAIR DANS LA DOCUMENTATION ═══
   CE CONTRÔLE A ÉTÉ RETOURNÉ (16 septembre 2026, demandé par ChatGPT dans
   la review de la PR #170, et il avait raison).
   Il faisait exactement l'inverse : il LISAIT le code exploitant écrit en
   toutes lettres dans CLAUDE.md et vérifiait qu'il correspondait à
   l'empreinte de la page. Autrement dit, un outil écrit pour empêcher la
   documentation de mentir **imposait de publier un secret** — le retirer
   faisait tomber la construction.
   LE DÉPÔT EST PUBLIC. Une valeur publiée est exposée, définitivement :
   la retirer ne la reprend pas, l'historique git la garde. Le seul
   comportement défendable est donc d'empêcher qu'une nouvelle valeur
   apparaisse.
   CE QUI PROTÈGE LES DONNÉES CLIENTS N'EST PAS CE CODE, c'est la Row Level
   Security de Supabase. Le code ne garde qu'un écran.
   ON VISE LA FORME, PAS UNE VALEUR : chercher « 12345678 » ne protégerait
   que d'une répétition de la même fuite. On refuse toute valeur PRÉSENTÉE
   comme un code d'accès, quelle qu'elle soit.
   LE PREMIER JET ÉTAIT TROP LARGE et prenait « renderTours » pour un
   secret — il suffisait du mot « code » suivi de deux points, comme dans
   « ce qui a disparu du code : renderTours ». Un contrôle qui crie sur du
   texte innocent finit par être désactivé en entier, et c'est la fuite
   suivante qui passe. On n'accepte donc que les tournures qui ANNONCENT
   une valeur — « protégé par le code X », « mot de passe X » — et on exige
   que la valeur contienne un chiffre : un secret d'ici en porte, un nom de
   fonction non. */
for (const [nom, texte] of [["CLAUDE.md", doc], ["TEAM_RULES.md", reglesTexte]]) {
  if (texte === null) continue;
  const annonces = [
    /protégé[e]?\s+par\s+le\s+code\s*[«"`']?([A-Za-z0-9!@#$%^&*_-]{6,32})[»"`']?/i,
    /code\s+(?:d['’]accès|exploitant|secret)\s*(?:est|:|vaut)?\s*[«"`']?([A-Za-z0-9!@#$%^&*_-]{6,32})[»"`']?/i,
    /mot\s+de\s+passe\s*(?:est|:|vaut)?\s*[«"`']?([A-Za-z0-9!@#$%^&*_-]{6,32})[»"`']?/i,
    /le\s+code\s+(?:est|vaut)\s*[«"`']?([A-Za-z0-9!@#$%^&*_-]{6,32})[»"`']?/i,
  ];
  let fuite = null;
  for (const motif of annonces) {
    const m = texte.match(motif);
    if (m && /\d/.test(m[1])) { fuite = m; break; }
  }
  verifier(
    "aucun code d'accès en clair dans " + nom,
    !fuite,
    fuite ? "« " + fuite[1] + " » est écrit en clair — le dépôt est public, "
            + "cette valeur doit être tenue pour exposée et changée hors du dépôt"
          : ""
  );
}

/* ═══ 5. CE QUE LA DOC DÉCLARE SUPPRIMÉ DOIT L'ÊTRE ═══
   Une note qui annonce un retrait pendant que le code applique encore la
   règle est le pire des deux mondes : on croit la chose partie, et elle
   facture. Le +20 % de nuit et de week-end a été retiré en septembre. */
if(/IL N'Y A PLUS DE MAJORATION/i.test(courant)){
  verifier(
    "aucune majoration de nuit ne subsiste dans le code du site",
    !/function\s+nuitOuWeekend/.test(page),
    "CLAUDE.md annonce la majoration supprimée, mais nuitOuWeekend() est encore là. " +
    "Un cinquième de plus sur le prix, sans que rien ne se voie à l'écran."
  );
}

/* ═══ 6. LES FICHIERS QUE LA DOC NOMME EXISTENT ═══
   Un document qui renvoie à une marche à suivre disparue envoie Barbaros
   dans le vide au moment précis où il cherche quoi faire.

   LA CONVENTION D'ÉCRITURE QUI VA AVEC, et il n'y en a qu'une : les accents
   graves DÉSIGNENT un fichier, ils ne le RACONTENT pas. Pour dire qu'un
   fichier a disparu, l'écrire en clair — « le fichier untel est parti avec
   l'ancien site ». Un nom entre accents graves est une adresse, et une
   adresse doit mener quelque part.
   Pourquoi pas une liste d'exceptions : elle rote. Pourquoi pas une
   heuristique sur la prose (« excuser tout paragraphe contenant supprimé »)
   : elle excuserait un vrai renvoi mort le jour où le mot apparaît à côté
   pour une autre raison. Une règle d'écriture ne rote pas et se relit. */
const cites = new Set();
for(const m of vivant.matchAll(/`([A-Za-z0-9_.-]+\.(?:md|sh|mjs|js|ts|webmanifest))`/g)) cites.add(m[1]);
for(const f of [...cites].sort()){
  /* a-coller.ts et composer.py sont fabriqués ou vivent hors du dépôt —
     CLAUDE.md le dit explicitement pour chacun. */
  if(/^(a-coller\.ts|composer\.py|message\.js)$/.test(f)) continue;
  const trouve = existsSync(f) ||
    existsSync("supabase/functions/nouvelle-demande/" + f) ||
    execSync("git ls-files | grep -c '/" + f + "$' || true").toString().trim() !== "0";
  verifier("le fichier « " + f + " » que CLAUDE.md nomme existe", trouve,
    "CLAUDE.md y renvoie, il n'est nulle part dans le dépôt. Si la note voulait " +
    "seulement dire qu'il a DISPARU, l'écrire sans accents graves : un nom entre " +
    "accents graves est une adresse, et une adresse doit mener quelque part.");
}

/* ═══ 7. LES BRANCHES QUE LA DOC NOMME EXISTENT ═══
   Le tableau d'en-tête envoie sur une branche de travail. Après l'audit
   du 15 septembre — 53 branches ramenées à 15 — il en nommait une qui
   n'existait plus. Une consigne de travail qui vise le vide fait repartir
   d'un endroit quelconque. */
/* ON DEMANDE AU SERVEUR, PAS AU CLONE LOCAL — et ça a coûté une publication
   en échec, le soir même où ce fichier est né. `git branch -r` lit les refs
   que la machine possède ; GitHub Actions ne clone QU'UNE branche, donc en
   CI toutes les autres paraissaient supprimées et la publication s'arrêtait
   sur un mensonge du contrôle lui-même.
   C'est exactement la faute que cette suite existe pour empêcher : affirmer
   à partir de ce qu'on a sous la main plutôt que de la source. `ls-remote`
   interroge le dépôt distant — même réponse en CI et ici.
   Sans réseau, on SAUTE au lieu d'accuser : un contrôle qui ne peut pas
   mesurer se tait, il n'invente pas un verdict. */
let refs = "";
try { refs = execSync("git ls-remote --heads origin", {stdio:["ignore","pipe","ignore"], timeout:20000}).toString(); }
catch(e){ refs = ""; }
if(refs){
  const nommees = new Set();
  for(const m of vivant.matchAll(/`(claude\/[a-z0-9-]{6,})`/g)) nommees.add(m[1]);
  for(const b of [...nommees].sort()){
    verifier("la branche « " + b + " » que CLAUDE.md nomme existe encore",
      refs.includes("refs/heads/" + b),
      "elle a été supprimée. Une consigne qui vise une branche morte fait repartir d'ailleurs.");
  }
} else {
  console.log("  (dépôt distant injoignable : le contrôle des branches est sauté)");
}

/* =====================================================================
   LA SECTION « TESTS » NE RECOPIE PAS LA LISTE DES SUITES
   ---------------------------------------------------------------------
   Le 16 septembre 2026, elle annonçait « vingt-trois suites Playwright,
   957 contrôles » et recopiait les vingt-trois noms dans une boucle. Il y
   en avait vingt-huit. Cinq suites n'étaient dans aucune des deux
   affirmations : qui suivait la documentation ne les lançait jamais, et
   rien ne le signalait -- une suite absente d'une liste ne proteste pas.

   ON NE VERROUILLE PAS UN COMPTE. Un test qui fige un nombre se met en
   travers de la première suite légitimement ajoutée, et c'est lui qu'on
   « répare » en le supprimant. On verrouille les deux choses qui ne
   vieillissent pas : aucun nom cité ne doit avoir disparu, et la section
   ne doit pas se remettre à énumérer au lieu de pointer la recette.
   ===================================================================== */
{
  /* LES ACCENTS GRAVES FONT LA DIFFÉRENCE, et c'est la convention déjà
     posée dans CLAUDE.md : une suite qu'on doit LANCER s'écrit entre
     accents graves, une suite DISPARUE s'écrit sans. Le fichier garde le
     souvenir des neuf suites de l'ancien site — c'est utile et ça ne doit
     pas faire tomber le contrôle. Ce qu'on interdit, c'est de désigner
     comme exécutable quelque chose qui n'existe pas. */
  const suites = new Set();
  for(const m of doc.matchAll(/`(test-[a-z0-9-]*\.mjs)`/g)) suites.add(m[1]);
  const morte = [...suites].sort().filter(f => !existsSync(f));
  verifier("CLAUDE.md ne nomme aucune suite à lancer qui n'existe plus",
    morte.length === 0,
    "introuvable(s) : " + morte.join(", ") + " — une consigne qui vise le vide fait chercher.");

  const iTests  = doc.indexOf("\n## Tests\n");
  const section = iTests < 0 ? "" : doc.slice(iTests, iTests + 4000);
  /* ON NE LIT QUE LE BLOC DE COMMANDES, jamais la section entière. Le
     premier jet cherchait le nom du lanceur dans tout le texte : il le
     trouvait dans la PHRASE qui l'explique, et passait au vert alors que la
     commande à taper avait été remplacée. Même faute que le premier
     contrôle de construire.sh, qui trouvait « carte » dans un commentaire.
     Éprouvé : sans ce resserrement, la falsification ne tombe pas. */
  const bloc = (section.match(/```bash\n([\s\S]*?)```/) || [,""])[1];
  verifier("la COMMANDE de la section « Tests » appelle la recette",
    bloc.includes(".claude/outils/tests.sh"),
    "le bloc à taper doit lancer tests.sh : deux recettes pour une seule chose finissent toujours par diverger.");
  verifier("…et ne réénumère pas les suites dans une boucle",
    !/for\s+f\s+in\s+test-/.test(bloc),
    "une liste recopiée à la main oublie la suite suivante, en silence — c'est exactement ce qui est arrivé.");

  /* Le lanceur, lui, ne doit pas se remettre à filtrer sur « nouveau » :
     une suite écrite aujourd'hui ne porte pas ce préfixe hérité. */
  if(existsSync(".claude/outils/tests.sh")){
    const lanceur = readFileSync(".claude/outils/tests.sh", "utf8");
    verifier("le lanceur ramasse « test-*.mjs », pas le seul préfixe « nouveau »",
      /ls\s+test-\*\.mjs/.test(lanceur),
      "il ignorerait en silence toute suite qui ne s'appelle pas test-nouveau-*.");
  }
}

/* --------------------------------------------------------------- */
console.log("");
if(echecs.length){
  console.log("=== ÉCHECS (" + echecs.length + ") ===");
  console.log(echecs.join("\n"));
  console.log("");
  console.log("=== " + ok + " contrôles au vert, " + echecs.length + " en échec ===");
  console.log("");
  console.log("LE CODE A RAISON. Ne pas modifier index.html pour faire taire ce");
  console.log("contrôle : c'est le DOCUMENT qu'il faut corriger. Et si c'est le");
  console.log("code qui a tort, alors la correction est un vrai correctif, pas");
  console.log("une ligne de doc.");
  process.exit(1);
}
console.log("=== " + ok + " contrôles au vert ===");
