/* ═══ LE DÉPÔT PUBLIC, DANS LE SOURCE, ÉPROUVÉ SANS NAVIGATEUR ═══
   Depuis le 2 novembre 2026, index.html porte LUI-MÊME le dépôt qui tourne
   en production (/functions/v1/deposer-course, corps { bon, sessionReception },
   destinationCle sur le bon, accusé JSON jugé) ; public-booking-gateway.mjs
   ne le réécrit plus au build, il le vérifie. Cette suite éprouve les deux :
     1. le source respecte chaque exigence du garde ;
     2. le garde TOMBE sur chaque régression connue — on mute une copie du
        source, une mutation à la fois, et le garde doit la nommer. Un
        contrôle qui ne tombe sur rien ne surveille rien.
     3. le garde n'écrit rien (l'ancien script réécrivait le fichier).
   Les mutations sont celles qu'une reprise maladroite produirait : retour à
   la REST, keepalive perdu, destinationCle ou sessionReception perdues,
   accusé accepté sans « ok », autre référence acceptée, accusé illisible
   pris pour un succès, cause d'échec effacée, 409 traité comme une erreur. */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { manquements, EXIGENCES } from './.github/scripts/public-booking-gateway.mjs';

const ok = [], ko = [];
const check = (nom, oui, detail) => { (oui ? ok : ko).push(nom); console.log((oui ? '✔ ' : '✘ ') + nom + (oui || !detail ? '' : '  — ' + detail)); };

const source = readFileSync('index.html', 'utf8');
const compter = (h, motif) => h.split(motif).length - 1;

/* 1. Le source respecte le garde, exigence par exigence. */
const manques = manquements(source);
check('le source index.html respecte les ' + EXIGENCES.length + ' exigences du dépôt public', manques.length === 0, manques.join(' ; '));
check('le dépôt public du source appelle deposer-course, et jamais la REST des courses en POST',
  source.includes('fetch(SUPABASE_URL + "/functions/v1/deposer-course", {') && !source.includes('fetch(SUPABASE_URL + "/rest/v1/courses"'));

/* 2. Chaque mutation est attrapée, et nommée. On exige que la mutation ait
   réellement changé le texte : une mutation qui ne touche rien ne prouve rien. */
const MUTATIONS = [
  ['retour du dépôt public vers /rest/v1/courses',
   h => h.replace('fetch(SUPABASE_URL + "/functions/v1/deposer-course", {', 'fetch(SUPABASE_URL + "/rest/v1/courses", {'),
   'fetch(SUPABASE_URL + "/rest/v1/courses"'],
  ['dépôt routé vers une autre fonction',
   h => h.replace('fetch(SUPABASE_URL + "/functions/v1/deposer-course", {', 'fetch(SUPABASE_URL + "/functions/v1/autre", {'),
   'fetch(SUPABASE_URL + "/functions/v1/deposer-course"'],
  ['keepalive retiré du dépôt',
   h => h.replace(/(deposer-course", \{[\s\S]{0,2000}?)keepalive: true,\n/, '$1'),
   'keepalive: true,'],
  ['destinationCle retirée du bon',
   h => h.replace('        destinationCle: (function(d){ return d ? d.cle : null; })(destHotelRetenue()),\n', ''),
   'destinationCle: (function(d)'],
  ['sessionReception toujours vide',
   h => h.replace('sessionReception: recHotel ? codeRetenu(recHotel.cle) : "" })', 'sessionReception: "" })'),
   'sessionReception: recHotel'],
  ['corps de la REST remis ({ ref, statut, bon })',
   h => h.replace('body: JSON.stringify({ bon: bon,\n          sessionReception: recHotel ? codeRetenu(recHotel.cle) : "" })',
                  'body: JSON.stringify({ ref: bon.ref, statut: bon.statut || "attente", bon: bon })'),
   'sessionReception:'],
  ['en-tête Prefer de la REST remis',
   h => h.replace('headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json" },',
                  'headers: { apikey: SUPABASE_CLE, "Content-Type": "application/json", Prefer: "return=minimal" },'),
   'Prefer: "return=minimal"'],
  ['accusé accepté sans « ok » vrai',
   h => h.replace('if(!j || j.ok !== true){ nuage.causeDepot = "accusé refusé"; return false; }\n', ''),
   '"accusé refusé"'],
  ['accusé portant une autre référence accepté',
   h => h.replace(`if(j.ref && j.ref !== bon.ref){ nuage.causeDepot = "référence différente dans l'accusé"; return false; }\n`, ''),
   '"référence différente dans l\'accusé"'],
  ['accusé illisible pris pour un succès',
   h => h.replace('function(){ nuage.causeDepot = "accusé illisible"; return false; }', 'function(){ return true; }'),
   '"accusé illisible"'],
  ['N° court de l\'accusé ignoré',
   h => h.replace('if(Number(j.numero) > 0) poserNumeroClient(bon, Number(j.numero));', ''),
   'poserNumeroClient(bon, Number(j.numero))'],
  ['cause d\'un refus HTTP effacée',
   h => h.replace('if(!r.ok){ nuage.causeDepot = "http " + r.status; return false; }', 'if(!r.ok) return false;'),
   'causeDepot = "http "'],
  ['causes délai / réseau effacées',
   h => h.replace('nuage.causeDepot = (e && e.name === "AbortError") ? "délai de 8 s dépassé" : "réseau";', ''),
   '"délai de 8 s dépassé"'],
  ['409 traité comme un refus ordinaire (plus de rejeu)',
   h => h.replace('if(r.status === 409) return "reference";\n', ''),
   'r.status === 409'],
];
for (const [nom, muter, temoin] of MUTATIONS) {
  const mute = muter(source);
  const aChange = mute !== source;
  const attrape = manquements(mute);
  check('mutation « ' + nom + ' » : le texte a bien changé', aChange);
  check('mutation « ' + nom + ' » : le garde tombe et la nomme', aChange && attrape.length > 0, attrape.join(' ; '));
  /* Le témoin dit ce que la mutation visait : son nombre d'occurrences a
     bougé (un motif disparu, ou l'ancien revenu), donc c'est bien ce
     défaut-là qui est éprouvé, pas un effet de bord. */
  check('mutation « ' + nom + ' » : le défaut visé est présent dans la copie mutée',
    compter(mute, temoin) !== compter(source, temoin));
}

/* 3. Le garde, lancé comme au build, n'écrit rien et rend 0 sur le source,
   1 sur une copie mutée, avec la cause sur la sortie d'erreur. */
const dossier = mkdtempSync(join(tmpdir(), 'ela-depot-'));
try {
  const copie = join(dossier, 'index.html');
  writeFileSync(copie, source);
  let accepte = true;
  try { execFileSync('node', ['.github/scripts/public-booking-gateway.mjs', copie], { stdio: 'pipe' }); }
  catch (e) { accepte = false; }
  check('lancé comme au build, le garde accepte le source et ne le réécrit pas', accepte && readFileSync(copie, 'utf8') === source);
  writeFileSync(copie, MUTATIONS[0][1](source));
  let code = 0, erreur = '';
  try { execFileSync('node', ['.github/scripts/public-booking-gateway.mjs', copie], { stdio: 'pipe' }); }
  catch (e) { code = e.status; erreur = String(e.stderr); }
  check('lancé sur une copie revenue à la REST, il rend 1 et nomme la cause', code === 1 && /rest\/v1\/courses/.test(erreur), erreur.slice(0, 200));
} finally { rmSync(dossier, { recursive: true, force: true }); }

console.log('=== ' + ok.length + ' ok, ' + ko.length + ' ko');
process.exit(ko.length ? 1 : 0);
