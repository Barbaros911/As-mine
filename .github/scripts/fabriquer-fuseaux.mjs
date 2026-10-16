/* =====================================================================
   FABRIQUER LA TABLE « FUSEAU HORAIRE → PAYS » (16 octobre 2026)
   ---------------------------------------------------------------------
   Pourquoi : en production, le serveur Supabase ne transmet pas l'en-tête
   « cf-ipcountry » (mesuré le 16/10/2026 : l'écran Trafic disait
   « Inconnu »). Le navigateur, lui, connaît son fuseau horaire
   (« Europe/Paris ») ; la base officielle des fuseaux (IANA, tzdata) dit à
   quel pays il appartient. On ne devine rien : on recopie la table.

   Source : /usr/share/zoneinfo/zone.tab (un pays par fuseau) et les liens
   « L cible alias » de tzdata.zi, pour les anciens noms qu'un navigateur
   rend encore (« Europe/Kiev », « Asia/Calcutta »). Un fuseau sans pays
   (« UTC », « Etc/… ») n'est pas dans la table : pays inconnu.

   Usage : node .github/scripts/fabriquer-fuseaux.mjs
   Écrit supabase/functions/mesure/fuseaux.js — jamais à la main.
   ===================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';

const DOSSIER = process.env.ZONEINFO || '/usr/share/zoneinfo';
const version = (readFileSync(`${DOSSIER}/tzdata.zi`, 'utf8').match(/^# version (\S+)/m) || [, '?'])[1];
const table = {};
for (const ligne of readFileSync(`${DOSSIER}/zone.tab`, 'utf8').split('\n')) {
  if (!ligne || ligne.startsWith('#')) continue;
  const [pays, , fuseau] = ligne.split('\t');
  if (/^[A-Z]{2}$/.test(pays) && fuseau) table[fuseau] = pays;
}
let liens = 0;
for (const ligne of readFileSync(`${DOSSIER}/tzdata.zi`, 'utf8').split('\n')) {
  const m = /^L (\S+) (\S+)$/.exec(ligne);
  if (!m) continue;
  const [, cible, alias] = m;
  if (!table[alias] && table[cible]) { table[alias] = table[cible]; liens++; }
}
const cles = Object.keys(table).sort();
if (cles.length < 400 || table['Europe/Paris'] !== 'FR') throw new Error('table des fuseaux incomplète');
const corps = cles.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])}`).join(',\n');
writeFileSync('supabase/functions/mesure/fuseaux.js',
`/* FABRIQUÉ par .github/scripts/fabriquer-fuseaux.mjs — ne pas modifier à la main.
   Base des fuseaux IANA (tzdata ${version}) : ${cles.length - liens} fuseaux de zone.tab
   et ${liens} anciens noms. Fuseau horaire → code pays ISO à deux lettres. */
export const FUSEAU_PAYS = {
${corps}
};
`);
console.log(`fuseaux.js : ${cles.length} fuseaux (tzdata ${version}, dont ${liens} anciens noms)`);
