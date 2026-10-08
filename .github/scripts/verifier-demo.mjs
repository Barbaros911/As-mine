// VERIFIER-DEMO.MJS — la construction ÉCHOUE si la démo peut toucher la production.
//
// Deuxième des trois défenses de /demo/ (la première est la règle CSP, la
// troisième test-demo-hotel.mjs). Elle tourne en DERNIER dans construire.sh,
// après masquer-commentaires : elle juge ce qui part réellement en ligne.
//
// Elle lit chaque fichier de site/demo/ ET chaque script local que ses pages
// chargent (telephone.js, itineraire-partage.js…) : un fichier partagé qui se
// mettrait demain à appeler le serveur serait servi à la démo aussi.
//
// Les montants interdits sont RELUS dans la grille des partenaires réels
// d'index.html, jamais recopiés ici : une grille renégociée demain reste
// surveillée sans que personne ne pense à ce fichier.
import fs from 'node:fs';
import path from 'node:path';

const sortie = process.argv[2] || 'site';
const dossier = path.join(sortie, 'demo');
const source = fs.readFileSync(process.argv[3] || 'index.html', 'utf8');

const MOTS = [
  '/rest/v1', 'deposer-course', 'courses-hotel', 'etat-course', 'nouvelle-demande',
  'prevenir-client', 'wa.me', 'api.telegram.org', 'sb_publishable_',
];
/* La clé publique Supabase réellement écrite dans le site, quelle que soit sa forme. */
const cle = /var SUPABASE_CLE = "([^"]+)"/.exec(source);
if (!cle) throw new Error('verifier-demo : clé publique introuvable dans index.html — le contrôle ne saurait plus quoi chercher');
MOTS.push(cle[1]);

/* Les forfaits des partenaires réels : chaque ligne « forfait:{ berline:X, van:Y } »
   de HOTELS. Le marqueur de la démo est la même forme ; un montant réel y
   ressortirait. */
const debut = source.indexOf('var HOTELS = {');
const fin = source.indexOf('Object.keys(HOTELS).forEach', debut);
if (debut < 0 || fin < 0) throw new Error('verifier-demo : grille HOTELS introuvable dans index.html');
const grille = source.slice(debut, fin);
const montants = new Set();
for (const m of grille.matchAll(/forfait\s*:\s*\{([^}]*)\}/g)) {
  for (const n of m[1].matchAll(/\d+(?:\.\d+)?/g)) montants.add(Number(n[0]));
}
if (!montants.size) throw new Error('verifier-demo : aucun forfait réel lu — le contrôle ne surveillerait rien');
/* Les clés et noms des partenaires réels. */
const partenaires = [...grille.matchAll(/^\s{4}"([a-z0-9-]+)"\s*:\s*\{/gm)].map((m) => m[1]);

function fichiersDemo() {
  const liste = [];
  (function parcourir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) parcourir(p); else liste.push(p);
    }
  })(dossier);
  /* Les scripts et feuilles locaux chargés par les pages de la démo. */
  for (const page of liste.filter((f) => f.endsWith('.html'))) {
    const html = fs.readFileSync(page, 'utf8');
    for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"'#?]+)["']/gi)) {
      const ref = m[1];
      if (/^(?:https?:)?\/\//.test(ref) || !/\.(?:js|css)$/.test(ref)) continue;
      const p = path.join(sortie, ref.replace(/^\//, ''));
      if (!fs.existsSync(p)) throw new Error(`verifier-demo : ${path.relative(sortie, page)} charge ${ref}, absent du site`);
      if (!liste.includes(p)) liste.push(p);
    }
  }
  return liste;
}

const fautes = [];
const fichiers = fichiersDemo();
if (fichiers.filter((f) => f.endsWith('.html')).length < 2) fautes.push('les deux pages de la démo ne sont pas toutes là');
for (const f of fichiers) {
  if (!/\.(?:html|js|css|json|txt|webmanifest|svg)$/.test(f)) continue;
  const t = fs.readFileSync(f, 'utf8');
  const nom = path.relative(sortie, f);
  for (const mot of MOTS) if (t.includes(mot)) fautes.push(`${nom} contient « ${mot} »`);
  if (/easy\s*hotel/i.test(t)) fautes.push(`${nom} nomme un partenaire réel (easyHotel)`);
  if (/cdn\.easyhotel|easyhotel\.com/i.test(t)) fautes.push(`${nom} charge une image d'un partenaire réel`);
  for (const p of partenaires) if (t.includes(p)) fautes.push(`${nom} contient la clé du partenaire réel « ${p} »`);
  for (const m of t.matchAll(/forfait\s*:\s*\{([^}]*)\}/g)) {
    for (const n of m[1].matchAll(/\d+(?:\.\d+)?/g)) {
      if (montants.has(Number(n[0]))) fautes.push(`${nom} : forfait à ${n[0]} €, montant de la grille d'un partenaire réel`);
    }
  }
  if (f.endsWith('.html')) {
    if (!/<meta name="robots" content="noindex,nofollow">/.test(t)) fautes.push(`${nom} : pas de noindex`);
    if (!/<meta http-equiv="Content-Security-Policy"/.test(t)) fautes.push(`${nom} : pas de règle CSP`);
    if (!/data-ela-space="demo"/.test(t)) fautes.push(`${nom} : l'espace n'est pas « demo »`);
  }
}

if (fautes.length) {
  console.error('ERREUR — la démo pourrait toucher la production :\n  - ' + fautes.join('\n  - '));
  process.exit(1);
}
console.log(`Démo vérifiée : ${fichiers.length} fichiers, aucune trace de la production.`);
