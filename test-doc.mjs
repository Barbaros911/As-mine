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

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";

const page = readFileSync("index.html", "utf8");
const doc  = readFileSync("CLAUDE.md", "utf8");
/* TEAM_RULES peut ne pas exister sur une branche ancienne : on saute
   plutôt que de faire tomber la suite pour un fichier absent. */
const reglesTexte = existsSync("TEAM_RULES.md")
  ? readFileSync("TEAM_RULES.md", "utf8") : null;

/* LA SECTION QUI FAIT FOI. On ne lit la grille et les constantes que
   depuis « # LE SITE » : l'en-tête du mémo (règles de l'équipe, règles
   légales, conseils acquis) ne porte aucun tarif, et l'ANCIEN site — où
   l'on lit encore 1,75 €/km, quatre gammes et des packs — vit depuis le
   4 octobre 2026 dans memoire/ancien-site.md, hors de ce fichier. Cette
   archive nomme des fichiers disparus EXPRÈS (test6.mjs, styles.css…) :
   on ne lui applique donc pas le contrôle des fichiers cités, seulement
   celui des secrets, plus bas. */
const depart = doc.search(/^# LE SITE\b/m);
const courant = depart < 0 ? "" : doc.slice(depart);

/* LES ARCHIVES : un fichier par sujet dans memoire/, lus pour les secrets
   et pour vérifier qu'ils se retrouvent depuis le mémo. */
const memoire = existsSync("memoire")
  ? readdirSync("memoire").filter(f => f.endsWith(".md")).sort() : [];

/* `vivant` = ce qui, dans CLAUDE.md, désigne du présent — tout le fichier,
   moins la liste de ce qui a été SUPPRIMÉ à la bascule : elle nomme des
   fichiers précisément pour dire qu'ils n'existent plus. Les exiger
   reviendrait à demander qu'on ressuscite ce qu'on vient d'enterrer. Le
   retrait est nommé et borné, jamais deviné d'après la présence du mot
   « supprimé » : une heuristique sur la prose finirait par excuser un vrai
   oubli. */
let vivant = doc.replace(
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

/* ═══ 1 bis. LA GRILLE DU SITE PUBLIC (23 octobre 2026) ═══
   Depuis cette date, le tableau ci-dessus ne vaut plus que pour les pages des
   hôtels. Le site public facture par tranches, forfaits Paris et accueil :
   le tableau « Site public » de CLAUDE.md doit dire ce que la page facture
   (GRILLE_PUBLIQUE, FORFAITS_PUBLICS, ACCUEIL_EUR) — c'est ce chiffre-là
   qu'on annonce au téléphone. */
{
  const bloc = (page.match(/var GRILLE_PUBLIQUE\s*=\s*\{([\s\S]*?)\n\s*\};/) || [])[1] || "";
  const gamme = cle => {
    const m = bloc.match(new RegExp(cle + ":\\s*\\{\\s*tranches:\\[([^\\]]*)\\],\\s*auDela:([0-9.]+)"));
    return m ? { km: [...m[1].matchAll(/km:(\d+(?:\.\d+)?)/g)].map(x => x[1]).join(" / "),
                 prix: [...m[1].matchAll(/prix:(\d+)/g)].map(x => x[1]).join(" / "),
                 auDela: Number(m[2]) } : null;
  };
  const gb = gamme("berline"), gv = gamme("van");
  const forfaits = {};
  for (const m of page.matchAll(/\{ cle:"(orly|cdg|disney)"[^}]*?prix:\{ berline:(\d+), van:(\d+) \}/g)) forfaits[m[1]] = [m[2], m[3]];
  if (verifier("le code déclare la grille du site public (GRILLE_PUBLIQUE, FORFAITS_PUBLICS)",
        !!gb && !!gv && Object.keys(forfaits).length === 3)) {
    const sp = s => (s || "").replace(/\s+/g, " ").trim();
    const t1 = courant.match(/^\|\s*Jusqu'à ([0-9 /]+?) km\s*\|\s*([0-9 /]+?) €\s*\|\s*([0-9 /]+?) €\s*\|/m);
    verifier("CLAUDE.md : les tranches du site public sont celles du code",
      !!t1 && sp(t1[1]) === gb.km && sp(t1[2]) === gb.prix && sp(t1[3]) === gv.prix && gb.km === gv.km,
      t1 ? "CLAUDE.md dit " + t1[1] + " km → " + t1[2] + " € / " + t1[3] + " €, le code " + gb.km + " km → " + gb.prix + " € / " + gv.prix + " €"
         : "la ligne « Jusqu'à … km » du tableau « Site public » a disparu");
    const t2 = courant.match(/^\|\s*Au-delà, par km\s*\|\s*\+([0-9]+,[0-9]+) €\s*\|\s*\+([0-9]+,[0-9]+) €\s*\|/m);
    verifier("CLAUDE.md : le prix par km au-delà est celui du code",
      !!t2 && Number(t2[1].replace(",", ".")) === gb.auDela && Number(t2[2].replace(",", ".")) === gv.auDela,
      t2 ? "CLAUDE.md dit " + t2[1] + " / " + t2[2] + ", le code " + gb.auDela + " / " + gv.auDela : "la ligne « Au-delà, par km » a disparu");
    const t3 = courant.match(/^\|\s*Paris ↔ Orly \/ Roissy-CDG \/ Disneyland\s*\|\s*([0-9 /]+?) €\s*\|\s*([0-9 /]+?) €\s*\|/m);
    const fb = ["orly", "cdg", "disney"].map(k => forfaits[k][0]).join(" / "), fv = ["orly", "cdg", "disney"].map(k => forfaits[k][1]).join(" / ");
    verifier("CLAUDE.md : les forfaits Paris sont ceux du code",
      !!t3 && sp(t3[1]) === fb && sp(t3[2]) === fv,
      t3 ? "CLAUDE.md dit " + t3[1] + " / " + t3[2] + ", le code " + fb + " / " + fv : "la ligne des forfaits Paris a disparu");
    const t4 = courant.match(/^\|\s*Accueil[^|]*\|\s*\+(\d+) €\s*\|/m);
    verifier("CLAUDE.md : l'accueil est celui du code (ACCUEIL_EUR)",
      !!t4 && Number(t4[1]) === constante("ACCUEIL_EUR"),
      t4 ? "CLAUDE.md dit " + t4[1] + " €, le code " + constante("ACCUEIL_EUR") + " €" : "la ligne « Accueil » a disparu");
  }
}

/* ═══ 2. LES CONSTANTES QUE LA DOC CHIFFRE ═══
   Chaque entrée nomme la constante ET la phrase qui l'annonce. Une
   constante qui bouge sans que la phrase suive, c'est le site qui applique
   un délai en en annonçant un autre — déjà arrivé au passage de 20 à 15
   minutes, où la constante, deux phrases et une table d'exemples devaient
   bouger ensemble. */
const chiffres = [
  { nom:"RAYON_ZONE_KM",       motif:/(\d+)\s*km autour de Paris/i,
    quoi:"le rayon au-delà duquel les péages éventuels sont signalés" },
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
for (const [nom, texte] of [["CLAUDE.md", doc], ["TEAM_RULES.md", reglesTexte],
     ...memoire.map(f => ["memoire/" + f, readFileSync("memoire/" + f, "utf8")])]) {
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

/* ═══ 8. LE MÉMO A UN PLAFOND, ET SES ARCHIVES SE RETROUVENT ═══
   Le 4 octobre 2026, CLAUDE.md faisait 455 Ko — sept mille lignes, lues
   en entier au début de CHAQUE session avant le premier mot de Barbaros,
   et il grossissait de 16 Ko par jour. Un mémo de cette taille, c'est
   d'abord des notes qui vieillissent : ce fichier-là raconte six fois
   qu'une note périmée a fait perdre des heures.
   LA RÈGLE : une décision tient dans CLAUDE.md en trois lignes ; son
   histoire va dans memoire/, un fichier par sujet, lu seulement si le
   sujet revient. Pour écrire dans CLAUDE.md, on range d'abord.
   LE PLAFOND NE MONTE JAMAIS. Un contrôle qui bloque finit par être
   « réparé » en relevant son nombre — c'est écrit ici pour que la
   prochaine session ne le fasse pas : s'il tombe, on déplace l'histoire
   du sujet qu'on touche vers memoire/, dans la même PR, et il repasse.
   Il DESCEND à chaque rangement, jamais l'inverse. Il tourne sur chaque
   PR (quality-gate) : c'est là qu'il doit mordre, pas à la publication. */
const PLAFOND_MEMO = 55008; // octets — ne monte jamais, descend à chaque rangement (319000 → 316200 le 11/10/2026, rangement de l'itinéraire ; → 315950 le 14/10/2026, hébergement ; → 314950 le 14/10/2026, marque et Google ; → 311050 le 14/10/2026, tarif ; → 311045 le 15/10/2026, indexation ; → 309590 le 15/10/2026, avis et liens des partenaires ; → 309415 le 15/10/2026, programme partenaire ; → 308798 le 17/10/2026, branches ; → 303355 le 17/10/2026, sites vitrines et phrases périmées ; → 303086 le 18/10/2026, hébergement et vraie 404 ; → 303029 le 18/10/2026, trafic ; → 300524 le 18/10/2026, positionnement, programme partenaire, documents légaux et note Google ; → 299646 le 19/10/2026, prix à toutes les distances et péages ; → 299511 le 19/10/2026, réconciliation avec main : partenaire au conditionnel, lanceur des suites ; → 296017 le 19/10/2026, cinq services archivés, finition visuelle ; → 296002 le 19/10/2026, trafic : l'entonnoir dit où l'on perd ; → 295141 le 19/10/2026, registre et délai de confirmation ; → 295138 le 19/10/2026, référence : collision au dépôt ; → 294011 le 19/10/2026, voyant archivé, erreurs du site ; → 293603 le 19/10/2026, limite du registre, synchronisation archivée ; → 293588 le 19/10/2026, page client hôtel : le premier dessin est le bon ; → 293535 le 19/10/2026, secret de la relance, mesure du 29/09 archivée ; → 292115 le 20/10/2026, rôle agent archivé, accès agent suspendu ; → 288725 le 20/10/2026, accès de la réception archivé, seul Barbaros supprime ; → 285057 le 21/10/2026, thème du partenaire archivé, réception V2 ; → 285051 le 21/10/2026, la carte de la réception après une réservation ; → 284972 le 21/10/2026, réception 10/10 : rien de vert d'office, bon sans boutons sur PC ; → 284959 le 22/10/2026, marque et Google : pages françaises d'acquisition ; → 55308 le 22/10/2026, rangement général : toute l'histoire dans memoire/, ne restent que les règles vraies aujourd'hui ; → 55304 le 23/10/2026, courses de l'admin au départ de l'hôtel, détails du comptoir archivés ; → 55286 le 23/10/2026, arrivée à l'hôtel et rattachement à la main, quota partenaire archivé ; → 55281 le 23/10/2026, une centrale et un large réseau, textes publics resserrés ; → 55269 le 24/10/2026, double vérification de l'admin, connexion archivée ; → 55139 le 24/10/2026, grille par tranches, forfaits Paris et accueil, prix des pages retiré, fusion avec la double vérification ; → 55138 le 24/10/2026, données métier sur le serveur ; → 55137 le 24/10/2026, easyHotel refuse d'être cité : le co-marquage vit sur la fiche ; → 55134 le 24/10/2026, marche à 27 km, fusion avec les données métier et la fiche easyHotel ; → 55098 le 24/10/2026, messages au client : la trace et le pense-bête, notification resserrée, fusion avec la marche à 27 km ; → 55095 le 24/10/2026, code admin choisi au lieu de l'application de codes ; → 55091 le 24/10/2026, la recherche et « Me localiser » n'attendent plus le plus lent ; → 55080 le 24/10/2026, la liste des lieux : une pastille, le nom, l'adresse dessous ; → 55063 le 24/10/2026, la troisième couleur (l'or doux des pictogrammes), pièges des icônes archivés ; → 55061 le 24/10/2026, une seule famille d'icônes, une couleur par sujet ; → 55060 le 24/10/2026, la règle des priorités, section « Travailler avec Barbaros » resserrée ; → 55047 le 25/10/2026, P0 : une demande non vue ne se tait plus, « Vu » n'arrête que l'alarme ; → 55008 le 25/10/2026, étape 2 : battement de la relance, bandeau des non vues, alerte d'essai, réactivité ; annonce resserrée)
{
  const taille = Buffer.byteLength(doc, "utf8");
  verifier("CLAUDE.md tient sous son plafond (" + Math.round(PLAFOND_MEMO / 1000) + " Ko)",
    taille <= PLAFOND_MEMO,
    "il fait " + Math.round(taille / 1000) + " Ko. Ne pas relever PLAFOND_MEMO : déplacer " +
    "l'histoire du sujet touché vers memoire/, ne garder ici que la règle (trois lignes).");

  /* Les archives doivent se retrouver depuis le mémo, et le mémo ne doit
     renvoyer qu'à des archives qui existent : une archive que rien ne
     nomme est perdue, un renvoi vers un fichier absent fait chercher. */
  const citees = new Set([...doc.matchAll(/`memoire\/([A-Za-z0-9_.-]+\.md)`/g)].map(m => m[1]));
  for (const f of [...citees].sort())
    verifier("l'archive « memoire/" + f + " » que CLAUDE.md nomme existe", existsSync("memoire/" + f),
      "CLAUDE.md y renvoie et elle n'est pas dans le dépôt.");
  for (const f of memoire)
    verifier("l'archive « memoire/" + f + " » est nommée dans CLAUDE.md", citees.has(f),
      "une archive que le mémo ne nomme pas ne sera jamais relue : y renvoyer depuis la règle qu'elle explique.");
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

/* =====================================================================
   LA GRILLE DU CLIENT ET CELLE DU SERVEUR DOIVENT S'ACCORDER
   ---------------------------------------------------------------------
   Le site calcule le prix dans le navigateur (« GAMMES ») ; Admin v2
   s'appuie sur une source SERVEUR semée par une migration. Les deux
   portent aujourd'hui les mêmes nombres -- et RIEN ne vérifiait qu'ils le
   restent.

   CE QUE ÇA COÛTERAIT : Barbaros annonce un montant au téléphone depuis
   l'Admin, le client en voit un autre sur le site. Le prix d'Elatransfer
   est FERME, donc opposable : c'est le client qui aurait raison.
   « Deux calculs qui divergent ne se voient pas » -- ce fichier le répète
   partout, et l'écart traversait ici la frontière client/serveur sans que
   personne ne le garde.

   ON NE FIGE AUCUN CHIFFRE ICI : on éprouve l'ACCORD. Une baisse de tarif
   décidée par Barbaros touche les deux et reste verte ; n'en toucher qu'un
   seul tombe, et le message dit lequel.
   ===================================================================== */
{
  /* ON REJOUE TOUTES LES MIGRATIONS, PAS UNE SEULE. Le tarif général a été
     SEMÉ par « current_tariff_source.sql » (INSERT) puis CORRIGÉ par
     « tarif_unifie.sql » (UPDATE, 28/09/2026, unification du tarif hôtel
     et du tarif public) — ne lire que le premier fichier aurait comparé
     le client à une valeur que la base ne porte plus. Chaque forme capture
     sa clé ET son JSON dans le MÊME match, pour ne jamais recoller par
     proximité de texte la valeur d'une gamme au « where cle » d'une autre
     — piège déjà rencontré et corrigé dans verifier-tarif-hotel.mjs. */
  const migDir = "supabase/migrations";
  if(existsSync(migDir)){
    const sql = readdirSync(migDir).filter(f => f.endsWith(".sql")).sort()
      .map(f => readFileSync(migDir + "/" + f, "utf8")).join("\n");
    const lignes = [];
    for(const m of sql.matchAll(/\('(tarif_general_\w+)'\s*,\s*'(\{[^']*\})'::jsonb/g)){
      lignes.push({ i:m.index, cle:m[1].replace("tarif_general_", ""), json:m[2] });
    }
    for(const m of sql.matchAll(/update\s+public\.parametres_commerciaux\s+set\s+valeur\s*=\s*'(\{[^']*\})'[^;]*where\s+cle\s*=\s*'(tarif_general_\w+)'/gi)){
      lignes.push({ i:m.index, cle:m[2].replace("tarif_general_", ""), json:m[1] });
    }
    lignes.sort((a, b) => a.i - b.i);
    const serveur = {};
    for(const cle of ["berline", "van"]){
      const trouvees = lignes.filter(l => l.cle === cle);
      if(!trouvees.length) continue;
      try { const j = JSON.parse(trouvees[trouvees.length - 1].json);
            serveur[cle] = { km: j.par_km_centimes/100, mini: j.minimum_centimes/100 }; }
      catch(e){ /* la ligne a changé de forme : le contrôle suivant le dira */ }
    }
    const client = {};
    const bloc = (page.match(/var GAMMES = \[([\s\S]*?)\];/) || [,""])[1];
    for(const m of bloc.matchAll(/cle:"(\w+)"[^}]*parKm:([\d.]+)[^}]*mini:(\d+)/g)){
      client[m[1]] = { km: parseFloat(m[2]), mini: parseFloat(m[3]) };
    }

    verifier("les deux grilles sont lisibles (client et serveur)",
      Object.keys(client).length > 0 && Object.keys(serveur).length > 0,
      "client : " + JSON.stringify(client) + " · serveur : " + JSON.stringify(serveur));

    for(const cle of Object.keys(client)){
      const c = client[cle], v = serveur[cle];
      verifier("la gamme « " + cle + " » est déclarée côté serveur", !!v,
        "elle est dans GAMMES mais absente de la source tarifaire serveur");
      if(!v) continue;
      verifier("« " + cle + " » : le tarif au km est le même des deux côtés",
        c.km === v.km, "site " + c.km + " €/km · serveur " + v.km + " €/km");
      verifier("« " + cle + " » : le montant minimum est le même des deux côtés",
        c.mini === v.mini, "site " + c.mini + " € · serveur " + v.mini + " €");
    }
  }
}

/* =====================================================================
   LE FILTRE DE CHEMINS DU CONTRÔLE ADMIN V2 COUVRE-T-IL CE QUI EXISTE ?
   ---------------------------------------------------------------------
   Le workflow ne se déclenche que sur les chemins qu'il énumère. La liste
   d'origine nommait les quatre fichiers qui existaient le jour où elle a
   été écrite : « intake-demande.js » — le lecteur PARTAGÉ par les deux
   espaces — n'y était pas, ni « admin-v2-registre.js », ni deux des trois
   suites. Les modifier seuls n'aurait déclenché AUCUN contrôle, et rien
   ne l'aurait signalé.

   ON NE FIGE PAS UNE LISTE ICI NON PLUS — ce serait la même faute d'un
   cran plus loin. On vérifie la COUVERTURE : tout fichier du dépôt qui
   appartient à Admin v2 doit être attrapé par au moins un motif.
   ===================================================================== */
{
  const wf = ".github/workflows/admin-v2-regression.yml";
  if(!existsSync(wf)){
    verifier("le workflow de contrôle Admin v2 existe", false, wf + " est introuvable");
  } else {
    const bloc = (readFileSync(wf, "utf8").match(/paths:\n([\s\S]*?)\npermissions:/) || [,""])[1];
    const motifs = [...bloc.matchAll(/^\s*-\s*'([^']+)'/gm)].map(m => m[1]);
    verifier("le workflow Admin v2 déclare des chemins", motifs.length > 0);
    /* Un motif de workflow GitHub : « * » ne traverse pas les dossiers,
       « ** » oui. On le traduit en expression régulière. */
    const couvre = (motif, f) => new RegExp("^" + motif
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "\u0000")
        .replace(/\*/g, "[^/]*")
        .replace(/\u0000/g, ".*") + "$").test(f);
    const aCouvrir = readdirSync(".")
      .filter(f => /^admin-v2.*|^intake-demande\.js$|^telephone\.js$|^qr-affiche\.js$|^itineraire-partage\.js$|^test-admin-.*\.mjs$/.test(f));
    verifier("des fichiers Admin v2 ont été trouvés dans le dépôt",
      aCouvrir.length >= 4, aCouvrir.length + " fichier(s)");
    for(const f of aCouvrir){
      verifier("« " + f + " » déclenche le contrôle Admin v2",
        motifs.some(m => couvre(m, f)),
        "aucun motif ne l'attrape — le modifier seul ne lancerait aucune suite");
    }
  }
}

/* ═══ AUCUN MODULE D'ADMIN V2 NE S'ACCROCHE À UN CLIC SUR « #nav » ═══
   Un module accroché à un ENDROIT meurt quand l'endroit bouge ; accroché à un
   ÉVÉNEMENT, il survit. Quatre modules écoutaient un clic sur la barre du bas
   pour savoir qu'on ouvrait leur écran. Le jour où « Finances », « Tarifs »,
   « Registre » et « Hôtels » ont quitté la barre pour l'écran « Gestion »,
   ces gestionnaires n'ont plus JAMAIS été appelés : liste des chauffeurs
   vide, lien d'avis jamais écrit, factures jamais lues — et rien à l'écran
   pour le dire. Deux des quatre ne faisaient tomber aucune suite.
   On éprouve donc la RÈGLE, pas la liste des onglets du jour : « ela:ecran »
   est le seul point de rendez-vous, et il survit à toute réorganisation de la
   navigation. */
for(const f of readdirSync(".").filter(n => /^admin-v2-.*\.js$/.test(n))){
  const src = readFileSync(f, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  verifier(`« ${f} » n'écoute pas un clic sur la barre du bas`,
    !/(getElementById\(['"]nav['"]\)|querySelector\(['"]#nav['"]\))[\s\S]{0,120}addEventListener\(\s*['"]click['"]/.test(src),
    "il s'accroche à #nav : le jour où son onglet change de place, il ne sera "
    + "plus jamais appelé, sans le moindre message. Écouter « ela:ecran ».");
}

/* ADMIN V2 NE PART PAS EN LIGNE (3 octobre 2026, à la demande de
   Barbaros). Premier jet : un drapeau à POSER pour le retirer, dans
   pages.yml. Or elatransfer.com est servi par Cloudflare (Workers Builds),
   dont la commande se règle hors du dépôt : le drapeau n'y était pas, et
   Admin v2 serait resté en ligne sans que rien ne le dise. Le retrait est
   donc la RÈGLE PAR DÉFAUT de la recette, et seul ELA_AVEC_ADMIN_V2=1 —
   réservé aux suites qui éprouvent Admin v2 — le garde. On vérifie les
   deux faces : la recette retire par défaut, et aucune configuration de
   PUBLICATION ne pose le drapeau qui le garderait. On lit les seules lignes
   de commande : un contrôle qui trouve son mot dans une phrase
   d'explication ne vérifie rien. */
{
  const sansCommentaires = t => t.split("\n").filter(l => !/^\s*(#|\/\/)/.test(l)).join("\n");
  const recette = sansCommentaires(readFileSync("construire.sh", "utf8"));
  verifier("construire.sh retire Admin v2 PAR DÉFAUT (sauf ELA_AVEC_ADMIN_V2=1)",
    /if \[ "\$\{ELA_AVEC_ADMIN_V2:-\}" != "1" \]; then\s*\n\s*rm -f site\/admin-v2-\*\.js site\/admin-v2-responsive\.css\s*\n\s*cp site\/admin\.html site\/admin-v2\.html/.test(recette),
    "la recette ne retire plus Admin v2 par défaut, ou son ancienne adresse ne renvoie plus vers l'admin.");
  const publication = [
    [".github/workflows/pages.yml", sansCommentaires(readFileSync(".github/workflows/pages.yml", "utf8"))],
    ["wrangler.jsonc", sansCommentaires(readFileSync("wrangler.jsonc", "utf8"))],
    ["CLOUDFLARE.md (commande de construction)",
      (readFileSync("CLOUDFLARE.md", "utf8").match(/^.*Build command.*$/m) || [""])[0]],
  ];
  for(const [nom, texte] of publication){
    verifier(`${nom} ne garde pas Admin v2 en ligne`,
      !/ELA_AVEC_ADMIN_V2/.test(texte),
      "ce drapeau n'existe que pour les suites de test : posé ici, il remettrait Admin v2 en ligne.");
  }
  verifier("la commande de construction Cloudflare reste la recette, seule",
    /Build command \| `sh construire\.sh` \|/.test(readFileSync("CLOUDFLARE.md", "utf8")),
    "CLOUDFLARE.md ne donne plus « sh construire.sh » comme commande de construction.");
  /* L'AUTRE FACE (relecture du 4 octobre 2026) : tout script qui OUVRE
     Admin v2 dans un navigateur doit le construire avec le drapeau. Sans
     lui, /admin-v2.html est la redirection vers l'admin historique, et le
     script mesure la mauvaise page en disant que tout va bien — c'est ce
     que faisait qui-deborde.mjs. On cherche le geste (« goto » vers la
     page), pas le mot : une suite qui relit le fichier source d'Admin v2
     n'a pas besoin du drapeau. */
  for(const f of readdirSync(".").filter(n => /\.mjs$/.test(n))){
    const texte = readFileSync(f, "utf8");
    if(!/goto\([^)]*admin-v2\.html/.test(texte)) continue;
    verifier(`${f} construit Admin v2 avant de l'ouvrir`,
      /ELA_AVEC_ADMIN_V2/.test(texte),
      "il ouvre /admin-v2.html sans ELA_AVEC_ADMIN_V2=1 : il mesurerait la redirection vers l'admin historique.");
  }
}

/* LA PRODUCTION NE SE DÉPLOIE AVEC AUCUN OUTIL QUI CHANGE TOUT SEUL
   (17 octobre 2026). fonctions.yml installait la CLI Supabase « latest »
   par l'action « supabase/setup-cli@v1 » : les mêmes lignes ont déployé
   avec la CLI 2.120.0 le 11 octobre et 2.121.0 le 15, sans un commit, et
   l'étiquette « v1 » a changé de SHA entre septembre et octobre. Dans tout
   workflow qui entre dans l'environnement « production » — c'est lui qui
   porte le jeton — une action qui n'est pas de GitHub (« actions/… ») est
   épinglée par son SHA complet, rien ne s'installe en « latest », et toute
   entrée « version: » est un numéro exact. On lit TOUS les workflows de
   production, pas une liste : le prochain y entre d'office. Les
   commentaires sont retirés avant lecture — un « latest » dans une phrase
   d'explication n'installe rien. */
{
  const dossier = ".github/workflows";
  const prod = readdirSync(dossier).filter(f => /\.ya?ml$/.test(f))
    .map(f => [f, readFileSync(dossier + "/" + f, "utf8").split("\n")
      .filter(l => !/^\s*#/.test(l)).map(l => l.replace(/\s+#.*$/, ""))])
    .filter(([, lignes]) => lignes.some(l => /^\s*environment:\s*production\s*$/.test(l)));
  verifier("des workflows entrent dans l'environnement « production »", prod.length > 0,
    "aucun trouvé : le jeton de production n'est plus rangé dans l'environnement, ou ce contrôle ne sait plus le lire.");
  for(const [f, lignes] of prod){
    for(const l of lignes){
      const m = /uses:\s*([^\s@]+)@(\S+)/.exec(l);
      if(m && !/^actions\//.test(m[1])){
        verifier(`${f} : l'action « ${m[1]} » est épinglée par son SHA`, /^[0-9a-f]{40}$/.test(m[2]),
          "trouvé « @" + m[2] + " » : une étiquette se déplace sans commit, dans un job qui porte le jeton de production.");
      }
      const v = /^\s*version:\s*["']?([^"'\s]+)/.exec(l);
      if(v){
        verifier(`${f} : la version « ${v[1]} » est un numéro exact`, /^\d+\.\d+\.\d+$/.test(v[1]),
          "un numéro flottant fait déployer le même commit avec un autre outil d'un jour à l'autre.");
      }
    }
    const flottant = lignes.filter(l => !/^\s*runs-on:/.test(l) && /(:\s*["']?latest["']?\s*$|@latest\b)/.test(l));
    verifier(`${f} n'installe rien en « latest »`, flottant.length === 0, flottant.map(l => l.trim()).join(" · "));
  }
}

/* ═══ 9. LA RÈGLE DES PRIORITÉS RESTE COMMUNE, ET SE LIT SUR GITHUB ═══
   24 octobre 2026. Barbaros dispersait le développement sur des retouches
   pendant qu'un P0 restait ouvert. La règle (TEAM_RULES.md §11) doit rester
   là où TOUS les agents la lisent — ChatGPT ne lit pas .claude/ — et
   l'état des priorités doit rester sur GitHub (étiquettes P0…P3), jamais
   dans un fichier recopié à la main : PROJECT_STATE.md a montré, le
   16 septembre, ce que devient un état écrit.
   On verrouille les ANCRES DURABLES de la règle (les quatre niveaux, le
   plafond, le 8/10, la décision de Barbaros, l'urgence jamais retardée),
   pas une formulation du jour. Le comportement de /etat est éprouvé à part,
   par test-etat.mjs. */
if (reglesTexte !== null) {
  const debut = reglesTexte.search(/^## \d+\. Les priorités/m);
  const fin = debut < 0 ? -1 : reglesTexte.indexOf("\n## ", debut + 4);
  const p11 = debut < 0 ? "" : reglesTexte.slice(debut, fin < 0 ? undefined : fin);
  verifier("TEAM_RULES.md porte la section « Les priorités »", p11.length > 500,
    "la règle commune de priorisation a disparu de TEAM_RULES.md : ChatGPT et les autres agents ne la liront plus nulle part.");
  if (p11) {
    for (const n of ["P0", "P1", "P2", "P3"])
      verifier("TEAM_RULES §priorités définit " + n, new RegExp("^\\|\\s*\\*\\*" + n + "\\*\\*", "m").test(p11),
        "la ligne « | **" + n + "** … | » du tableau des niveaux manque.");
    verifier("TEAM_RULES §priorités : la priorité est l'ÉTIQUETTE de l'Issue, pas un fichier",
      /étiquette/i.test(p11) && /jamais dans un fichier/i.test(p11),
      "l'état des priorités doit se lire sur GitHub ; un fichier recopié à la main finit faux.");
    const plafond = (p11.match(/\*\*(un|deux|trois|quatre|cinq) au plus\*\*/) || [])[1];
    const enChiffre = { un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5 }[plafond];
    const outil = existsSync(".claude/outils/etat-github.mjs")
      ? readFileSync(".claude/outils/etat-github.mjs", "utf8") : "";
    const code = Number((outil.match(/ACTIVES_MAX\s*=\s*(\d+)/) || [])[1]);
    verifier("le plafond écrit dans TEAM_RULES est celui que /etat applique",
      enChiffre && enChiffre === code,
      "TEAM_RULES dit « " + plafond + " au plus », etat-github.mjs compte ACTIVES_MAX = " + code + ".");
    verifier("TEAM_RULES §priorités : Barbaros décide, et une urgence n'attend pas",
      /décision de Barbaros/.test(p11) && /P0 s'annonce en une ligne/.test(p11),
      "la règle ne doit ni retirer la décision à Barbaros, ni retarder un P0.");
    verifier("TEAM_RULES §priorités : la règle du 8/10, hors domaines critiques",
      /8\/10/.test(p11) && /ne s'applique pas aux domaines du P0/.test(p11), "");
  }
  for (const f of ["CLAUDE.md", "AGENTS.md", ".github/copilot-instructions.md"]) {
    const t = existsSync(f) ? readFileSync(f, "utf8") : "";
    verifier(f + " renvoie à la règle des priorités", /TEAM_RULES\.md`?\s*§11/.test(t),
      "chaque porte d'entrée d'un agent doit mener à TEAM_RULES §11.");
  }
  const etat = existsSync(".claude/outils/etat.sh") ? readFileSync(".claude/outils/etat.sh", "utf8")
    .split("\n").filter(l => !/^\s*#/.test(l)).join("\n") : "";
  verifier("etat.sh lit les priorités par etat-github.mjs", /etat-github\.mjs/.test(etat), "");
  verifier("etat.sh n'appelle plus « gh issue list » ni « gh pr list » (GraphQL, refusé dans le cloud)",
    !/gh\s+(issue|pr)\s+list/.test(etat),
    "ces commandes échouent en silence dans une session cloud : la liste s'affiche vide alors que des Issues sont ouvertes.");
  const formulaire = existsSync(".github/ISSUE_TEMPLATE/ai-task.yml")
    ? readFileSync(".github/ISSUE_TEMPLATE/ai-task.yml", "utf8") : "";
  verifier("le modèle d'Issue ne recrée pas un menu « Priorité » à côté des étiquettes",
    !/^\s*id:\s*priority\s*$/m.test(formulaire),
    "deux sources pour la même priorité finissent par se contredire : la priorité est l'étiquette.");
  const modelePr = existsSync(".github/pull_request_template.md")
    ? readFileSync(".github/pull_request_template.md", "utf8") : "";
  verifier("le modèle de PR demande problème, priorité et critère de fin",
    /Problème résolu/.test(modelePr) && /Priorité/.test(modelePr) && /Critère de fin/.test(modelePr), "");
  const etatProjet = existsSync("PROJECT_STATE.md") ? readFileSync("PROJECT_STATE.md", "utf8") : "";
  verifier("PROJECT_STATE.md ne tient pas de liste de priorités P0…P3",
    !/^\s*(?:[-*|]|\d+\.).*\bP[0-3]\b/m.test(etatProjet),
    "les priorités du moment sont les étiquettes des Issues (TEAM_RULES §11), jamais un état recopié.");
}

/* ═══ 10. AUCUNE FUSION SANS LE « OUI » ÉCRIT DE BARBAROS POUR CETTE PR ═══
   29 octobre 2026, sa décision, définitive (TEAM_RULES.md §2). GitHub ne
   l'impose pas : zéro approbation exigée, les PR sont sous son compte. La
   règle ne tient donc que par les consignes que lisent les agents — et une
   seule phrase suffit à la défaire : « /nouveau-site » disait encore « on
   fusionne sans redemander », et CLAUDE.md « une fois l'accord donné :
   ouvrir la PR et la fusionner », sans dire quel accord. La PR #404 est
   partie sur un « Ok fait le ».
   DEUX CONTRÔLES. (a) Les ancres de la règle : TEAM_RULES la porte en
   entier (pour qui, ce qui n'est pas un accord, ce qui est interdit avant),
   et chaque porte d'entrée d'un agent y renvoie en disant « cette PR ».
   (b) Aucune consigne active ne dit de fusionner, pousser sur main ou
   publier sans demander, ni n'active une fusion automatique.
   ON LIT LES CONSIGNES ACTIVES, PAS L'HISTOIRE : memoire/ raconte au passé
   et n'est pas lu. Les compétences de .claude/skills/ sont des paquets
   tiers qui décrivent d'autres projets ; seul leur README, écrit ici, est
   lu. UNE PHRASE QUI INTERDIT N'AUTORISE PAS : une phrase qui porte
   « jamais », « aucun », « interdit », « ni », « never »… AVANT ou DANS la
   formule passe. Éprouvé contre l'ancien code : « /nouveau-site » et
   l'ancien CLAUDE.md tombent. */
{
  const lire = (f) => existsSync(f) ? readFileSync(f, "utf8") : "";
  const dossier = (d, motif) => existsSync(d)
    ? readdirSync(d).filter((n) => motif.test(n)).map((n) => d + "/" + n) : [];
  const consignes = [
    ...readdirSync(".").filter((n) => /\.md$/.test(n)),
    ...dossier(".github", /\.(md|txt|json|yml)$/),
    ...dossier(".github/ISSUE_TEMPLATE", /\.(md|yml)$/),
    ...dossier(".github/workflows", /\.ya?ml$/),
    ...dossier(".ai", /\.md$/), ...dossier(".ai/scripts", /\.sh$/), ...dossier(".ai/validation", /\.md$/),
    ...dossier(".claude/commands", /\.md$/), ...dossier(".claude/hooks", /\.(mjs|js|sh)$/),
    ...dossier(".claude/outils", /\.(mjs|js|sh)$/),
    ".claude/settings.json", ".claude/skills/README.md", "opencode.json", "package.json",
  ].filter((f) => existsSync(f));
  verifier("le garde-fou des fusions lit les consignes des agents",
    ["TEAM_RULES.md", "AGENTS.md", "CLAUDE.md", ".claude/commands/nouveau-site.md", ".ai/README.md"]
      .every((f) => consignes.includes(f)) && consignes.length >= 20,
    "liste des fichiers lus vide ou amputée : un garde-fou qui ne lit rien passe toujours au vert.");

  /* (a) Les ancres durables de la règle, pas une formulation du jour. */
  const regle = reglesTexte || "";
  verifier("TEAM_RULES §2 : la décision de fusionner n'appartient qu'à Barbaros",
    /décision de fusionner n'appartient qu'à Barbaros/i.test(regle), "");
  verifier("TEAM_RULES §2 : un accord nomme la PR et ne vaut que pour elle",
    /fusionner la PR #N/.test(regle) && /ne vaut que pour\s+cette PR/i.test(regle), "");
  verifier("TEAM_RULES §2 : « ok », « vas-y », « continue », « fais-le » ne sont pas des accords",
    ["ok", "vas-y", "continue", "fais-le"].every((m) => regle.includes("« " + m + " »")), "");
  verifier("TEAM_RULES §2 : interdits avant l'accord — Squash, Rebase, main, publication à la main",
    /Squash/.test(regle) && /Rebase/.test(regle) && /pousser\s+ou écrire sur `main`/.test(regle)
      && /publication en\s+production/.test(regle), "");
  verifier("TEAM_RULES §2 : la règle vaut pour tous les agents",
    ["Claude Code", "Codex", "ChatGPT", "Agent\nlocal", "commande automatisée"]
      .every((m) => regle.replace(/\s+/g, " ").includes(m.replace(/\s+/g, " "))), "");
  for (const f of ["CLAUDE.md", "AGENTS.md", ".github/copilot-instructions.md", ".ai/README.md"]) {
    const t = lire(f);
    verifier(f + " dit qu'un accord de fusion vaut pour CETTE PR, et renvoie à TEAM_RULES §2",
      /TEAM_RULES\.md`?\s*§2\b/.test(t) && /pour cette PR/i.test(t),
      "chaque porte d'entrée d'un agent doit porter la règle : pas de fusion sans le « oui » écrit de Barbaros pour cette PR précise.");
  }
  const equipe = lire(".ai/agents.yml");
  verifier(".ai/agents.yml : ni fusion ni production automatique, validation humaine obligatoire",
    /^\s*fusion_automatique:\s*false\s*$/m.test(equipe) && /^\s*production_automatique:\s*false\s*$/m.test(equipe)
      && /^\s*validation_humaine_main:\s*obligatoire\s*$/m.test(equipe), "");

  /* (b) Les formules qui autorisent sans accord. */
  const DANGER = [
    /\bfusionn\w*\b[^.;!?]{0,60}?\b(directement|automatiquement|tout de suite|aussitôt|d'office|sans (?:re)?demander|sans (?:attendre|son accord|l'accord|accord|validation|confirmation|relecture))/i,
    /\bmerg\w*\b[^.;!?]{0,60}?\b(directly|automatically|right away|immediately|without (?:asking|approval|review|confirmation|waiting))/i,
    /\bsans (?:re)?demander\b[^.;!?]{0,40}?\b(fusion\w*|merg\w*|publi\w*)/i,
    // Les VERBES seulement : « 122 commits sur main » raconte, il n'ordonne rien.
    /\b(?:pousse[rz]?|poussons|push(?:er|ez)?|écrire)\b[^.;!?]{0,30}?\b(?:sur|dans|vers|to|on|into)\s+`?(?:origin\/)?main\b/i,
    /\bgit\s+push\b[^;\n]{0,40}?\b(?:origin\s+)?(?:HEAD:)?(?:refs\/heads\/)?main\b/i,
    /\bpubli(?:er|e|ez|ons)\b[^.;!?]{0,40}?\b(directement|sans (?:re)?demander|sans (?:attendre|son accord|l'accord|accord|validation))/i,
    /\bpublish\w*\b[^.;!?]{0,40}?\b(directly|without (?:asking|approval|review|confirmation))/i,
    /\bgh\s+pr\s+merge\b|\bauto-?merge\b|enablePullRequestAutoMerge|merge_pull_request|\bpulls\.merge\s*\(/i,
  ];
  const NEGATION = /\b(?:jamais|aucun\w*|interdi\w*|ni|never|refus\w*|ne\s+pas|ne\s+\S+\s+pas|n'\S+\s+pas|pas\s+d[eu]|pas\s+d'|not|don't|do\s+not|must\s+not|no)\b/i;
  const fautes = [];
  for (const f of consignes) {
    const phrases = lire(f).replace(/\r/g, "")
      .split(/\n\s*\n|\n(?=\s*(?:[-*]|\d+\.)\s)/)
      .flatMap((bloc) => bloc.replace(/\s+/g, " ").split(/(?<=[.!?;])\s+/));
    for (const p of phrases) for (const motif of DANGER) {
      const m = p.match(motif);
      if (m && !NEGATION.test(p.slice(0, m.index + m[0].length))) fautes.push(f + " : « " + p.trim().slice(0, 140) + " »");
    }
  }
  verifier("aucune consigne d'agent n'autorise une fusion, un push sur main ou une publication sans accord",
    fautes.length === 0,
    fautes.join("\n      ") + "\n      La fusion attend le « oui » écrit de Barbaros pour cette PR précise (TEAM_RULES.md §2).");
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
