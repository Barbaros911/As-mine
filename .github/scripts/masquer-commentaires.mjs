// MASQUER-COMMENTAIRES.MJS — retire les commentaires du site PUBLIÉ, jamais du dépôt.
//
// Ce fichier ne change RIEN dans le dépôt : il ne s'applique qu'aux copies
// posées dans site/ par construire.sh, APRÈS toutes les autres étapes. Les
// commentaires restent intacts dans index.html, itineraire-partage.js, etc. —
// c'est la mémoire du projet, elle continue de servir aux prochaines sessions.
//
// POURQUOI : 145 commentaires (~68 Ko) dans le seul index.html publié
// expliquaient en clair, dans le code source visible par « Afficher la
// page », comment fonctionne la sécurité de l'espace exploitant, d'anciennes
// failles trouvées et corrigées, et la logique commerciale interne (grille
// hôtel, commission). Un client ordinaire n'a besoin d'aucune de ces lignes
// pour que le site fonctionne — les retirer ne change rien à l'écran.
//
// AUCUNE DÉPENDANCE AJOUTÉE, ET C'EST DÉLIBÉRÉ — même règle que pour la
// régression visuelle de ce dépôt. Un premier jet s'appuyait sur le paquet
// « typescript » pour lire vraiment le JavaScript plutôt que de le deviner
// par expression régulière. Ça fonctionnait ici, mais « typescript » n'est
// déclaré nulle part dans package.json et « pages.yml » — le workflow qui
// publie réellement le site — ne fait AUCUN `npm install` avant de lancer
// la construction : le paquet n'existe que sur cette machine, où je l'avais
// posé à la main. Publié tel quel, ça aurait cassé la mise en ligne à la
// prochaine fusion, en silence, le jour où personne n'a de symlink local à
// portée de main. Ce module ne dépend donc que de « node:fs ».
//
// COMMENT ON ÉVITE DE CASSER LE JAVASCRIPT SANS UN VRAI ANALYSEUR : une
// expression régulière naïve pour retirer « // » ou « /* */ » se fait
// piéger par une chaîne de caractères ou une expression régulière du code
// qui contient elle-même un « / » — ce dépôt en a (`/\D/g`, `/^\s+|\s+$/g`…).
// `nettoyerJs()` relit donc le texte caractère par caractère et retient CE
// QUI PRÉCÈDE chaque « / » : après une parenthèse ouvrante, une virgule, un
// opérateur ou un mot-clé comme `return`, un « / » ouvre presque toujours
// une expression régulière — après un nom de variable, un nombre ou une
// parenthèse fermante, c'est une division. C'est la même règle qu'utilisent
// les vrais analyseurs JavaScript, ramenée à ce dont on a besoin ici.
// Les chaînes (', ", `) sont recopiées telles quelles, échappements compris,
// pour qu'un « // » ou un « /* » qui s'y trouve ne soit jamais pris pour un
// commentaire.
//
// LES COMMENTAIRES HTML (<!-- -->) ET CSS (/* */ dans <style>) N'ONT PAS CE
// PROBLÈME : leur syntaxe ne peut pas se cacher dans une chaîne de la même
// façon. Une expression régulière simple suffit pour eux.
//
// GARDE-FOU : si un bloc <script> ou <style> contient littéralement la
// séquence "<!--" (le vieux truc pour cacher du JS aux navigateurs
// préhistoriques), le nettoyage HTML global qui vient ensuite pourrait la
// prendre pour un commentaire et supprimer du vrai code. On vérifie AVANT
// et on s'arrête plutôt que de deviner.
//
// VALIDÉ CONTRE LA VRAIE SUITE : `.claude/outils/tests.sh` tourne sur le
// site construit avec cette étape en place — c'est elle qui a débusqué le
// problème de la dépendance manquante en CI, pas une relecture.

import fs from 'node:fs';

const MOTS_CLES_AVANT_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'throw', 'yield', 'case', 'do', 'else', 'await',
]);
const PONCTUATION_AVANT_REGEX = new Set([
  '', '(', '[', '{', ',', ';', ':', '=', '&', '|', '!', '?', '+', '-',
  '*', '%', '^', '~', '<', '>',
]);

function regexAutorisee(dernierToken) {
  if (/^[$A-Za-z_][$A-Za-z0-9_]*$/.test(dernierToken)) {
    return MOTS_CLES_AVANT_REGEX.has(dernierToken);
  }
  return PONCTUATION_AVANT_REGEX.has(dernierToken);
}

// Retire // et /* */ d'un morceau de JavaScript, en laissant intacts les
// chaînes ('", `), les gabarits (`...`) et les expressions régulières.
function nettoyerJs(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  let dernierToken = ''; // dernier token significatif : un mot ou un caractère de ponctuation
  let mot = '';

  function clorMot() {
    if (mot) { dernierToken = mot; mot = ''; }
  }

  while (i < n) {
    const c = source[i];
    const c2 = i + 1 < n ? source[i + 1] : '';

    // Chaîne ou gabarit : recopié tel quel, échappements compris.
    if (c === '"' || c === "'" || c === '`') {
      clorMot();
      const quote = c;
      let j = i + 1;
      out += c;
      while (j < n) {
        if (source[j] === '\\' && j + 1 < n) { out += source[j] + source[j + 1]; j += 2; continue; }
        out += source[j];
        if (source[j] === quote) { j++; break; }
        j++;
      }
      i = j;
      dernierToken = quote;
      continue;
    }

    // Commentaire de fin de ligne.
    if (c === '/' && c2 === '/') {
      let j = i + 2;
      while (j < n && source[j] !== '\n') j++;
      i = j;
      continue;
    }

    // Commentaire sur plusieurs lignes.
    if (c === '/' && c2 === '*') {
      let j = i + 2;
      while (j < n && !(source[j] === '*' && source[j + 1] === '/')) j++;
      i = Math.min(j + 2, n);
      continue;
    }

    // Expression régulière — seulement là où un « / » ne peut pas être
    // une division, d'après ce qui précède.
    if (c === '/' && regexAutorisee(dernierToken)) {
      clorMot();
      let j = i + 1;
      let enClasse = false;
      let debut = i;
      let ok = false;
      while (j < n) {
        const cj = source[j];
        if (cj === '\\' && j + 1 < n) { j += 2; continue; }
        if (cj === '\n') break; // une regex ne traverse jamais une fin de ligne : ce n'en était pas une
        if (cj === '[') { enClasse = true; j++; continue; }
        if (cj === ']') { enClasse = false; j++; continue; }
        if (cj === '/' && !enClasse) { j++; ok = true; break; }
        j++;
      }
      if (ok) {
        while (j < n && /[a-z]/i.test(source[j])) j++; // drapeaux : g, i, m, u, y, s, d
        out += source.slice(debut, j);
        i = j;
        dernierToken = '/';
        continue;
      }
      // Pas une regex en fin de compte (ex. simple division suivie d'un
      // saut de ligne) : on retombe sur le traitement caractère par
      // caractère ci-dessous, sans avoir rien consommé.
    }

    out += c;
    if (/[$A-Za-z0-9_]/.test(c)) {
      mot += c;
    } else {
      clorMot();
      if (!/\s/.test(c)) dernierToken = c;
    }
    i++;
  }
  return out;
}

function nettoyerCss(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function nettoyerHtmlComments(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

const TYPES_JS = new Set(['', 'text/javascript', 'application/javascript', 'application/ecmascript']);

function traiterScriptsEtStyles(html) {
  let hors = false;

  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, corps) => {
    if (/\bsrc\s*=/.test(attrs)) return m; // fichier externe, rien à faire ici
    const typeMatch = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : '';
    if (!TYPES_JS.has(type)) return m; // ex. application/ld+json : on n'y touche pas
    if (corps.includes('<!--')) { hors = true; return m; }
    return `<script${attrs}>${nettoyerJs(corps)}</script>`;
  });

  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, corps) => {
    if (corps.includes('<!--')) { hors = true; return m; }
    return `<style${attrs}>${nettoyerCss(corps)}</style>`;
  });

  if (hors) throw new Error("garde-fou : un bloc <script> ou <style> contient '<!--' — nettoyage arrêté, rien n'a été touché sur ce fichier.");
  return html;
}

const cibles = process.argv.slice(2);
if (cibles.length === 0) {
  console.error('Usage: node masquer-commentaires.mjs <fichier1> [fichier2 ...]');
  process.exit(1);
}

for (const chemin of cibles) {
  if (!fs.existsSync(chemin)) { console.error(`Absent, ignoré : ${chemin}`); continue; }
  const avant = fs.readFileSync(chemin, 'utf8');
  let apres;
  if (chemin.endsWith('.js')) {
    apres = nettoyerJs(avant);
  } else if (chemin.endsWith('.html')) {
    apres = traiterScriptsEtStyles(avant);
    apres = nettoyerHtmlComments(apres);
  } else {
    console.error(`Type non pris en charge, ignoré : ${chemin}`);
    continue;
  }
  fs.writeFileSync(chemin, apres, 'utf8');
  const gain = avant.length - apres.length;
  console.log(`${chemin} : ${avant.length} → ${apres.length} octets (−${gain})`);
}
