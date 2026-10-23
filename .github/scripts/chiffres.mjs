// « ELATRANSFER EN CHIFFRES » — UNE STRUCTURE PRÊTE, ÉTEINTE (23 octobre 2026).
//
// Barbaros veut pouvoir montrer un jour des chiffres VÉRIFIÉS (courses
// réalisées, taux de confirmation, destinations…), jamais un chiffre
// inventé ni gonflé. Aucune page n'écrit un chiffre elle-même : la page
// Professionnels porte un repère vide,
//
//   <section class="bloc chiffres" id="chiffres" … data-chiffres hidden>…</section>
//
// et ce script le remplit ici, à la construction, depuis chiffres.json (qui
// n'est pas publié) — ou le RETIRE. Le jour où les données suffisent, on
// remplit le fichier et on passe « afficher » à true : rien d'autre à toucher.
//
// CE QUI L'ÉTEINT (le bloc est retiré, la construction CONTINUE : un bloc
// absent ne doit jamais empêcher une correction urgente d'être publiée) :
// - « afficher » qui n'est pas à true — c'est le cas aujourd'hui ;
// - une date de relevé illisible, dans le futur, ou de plus de 90 jours ;
// - aucun chiffre valable.
// UN CHIFFRE N'EST VALABLE QU'AVEC SA SOURCE (« d'où il sort », en clair :
// « Registre de l'admin, courses réalisées »), un nombre positif, et ses deux
// libellés, français et anglais, sans chiffre dedans. Un chiffre sans source
// est écarté, nommé dans le journal de construction, et les autres restent.
// Un pourcentage (« unite »: "%") ne dépasse pas 100.
//
// CE QUE CE SCRIPT NE PEUT PAS VÉRIFIER, ET QUE LA RÈGLE DIT : le nombre de
// partenaires n'est jamais publié (consigne du 23/10/2026), et un « nombre de
// chauffeurs » ne compte que des chauffeurs dont le carnet a les papiers,
// jamais les membres d'un groupe WhatsApp. Jamais dans les données
// structurées.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const JOURS_MAX = 90;
const REPERE = /<section class="bloc chiffres"[^>]*\sdata-chiffres hidden>[\s\S]*?<\/section>\n?/;
const JOUR = 86400000;
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const jourUTC = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return NaN;
  const t = Date.parse(s + 'T00:00:00Z');
  return new Date(t).toISOString().slice(0, 10) === s ? t : NaN;
};
const libelle = s => typeof s === 'string' && s.trim().length >= 3 && s.length <= 60 && !/\d/.test(s);

// Un chiffre : { ok, raison } et, si ok, ce qu'il faut écrire.
export function jugerChiffre(c) {
  if (!c || typeof c !== 'object') return { ok: false, raison: 'entrée illisible' };
  const nom = c.cle || '(sans clé)';
  if (typeof c.valeur !== 'number' || !Number.isFinite(c.valeur) || c.valeur <= 0) return { ok: false, raison: `${nom} : pas de valeur positive` };
  if (c.unite !== undefined && c.unite !== '' && c.unite !== '%') return { ok: false, raison: `${nom} : unité inconnue` };
  if (c.unite === '%' && c.valeur > 100) return { ok: false, raison: `${nom} : pourcentage au-dessus de 100` };
  if (!libelle(c.fr) || !libelle(c.en)) return { ok: false, raison: `${nom} : libellé français ou anglais manquant (ou avec un chiffre)` };
  if (typeof c.source !== 'string' || c.source.trim().length < 8) return { ok: false, raison: `${nom} : pas de source` };
  return { ok: true, cle: nom, valeur: c.valeur, unite: c.unite || '', fr: c.fr.trim(), en: c.en.trim() };
}

export function juger(d, aujourdhui = new Date().toISOString().slice(0, 10)) {
  if (!d || typeof d !== 'object') return { ok: false, raison: 'fichier illisible', ecartes: [] };
  if (d.afficher !== true) return { ok: false, raison: '« afficher » n’est pas à true', ecartes: [] };
  const releve = jourUTC(d.releve_le), jour = jourUTC(aujourdhui);
  if (Number.isNaN(releve)) return { ok: false, raison: 'date de relevé illisible', ecartes: [] };
  if (releve > jour) return { ok: false, raison: 'date de relevé dans le futur', ecartes: [] };
  const age = Math.round((jour - releve) / JOUR);
  if (age > JOURS_MAX) return { ok: false, raison: `relevé vieux de ${age} jours (plus de ${JOURS_MAX})`, ecartes: [] };
  const juges = (Array.isArray(d.chiffres) ? d.chiffres : []).map(jugerChiffre);
  const chiffres = juges.filter(c => c.ok), ecartes = juges.filter(c => !c.ok).map(c => c.raison);
  if (!chiffres.length) return { ok: false, raison: 'aucun chiffre valable', ecartes };
  const date = new Date(releve);
  return {
    ok: true, age, chiffres, ecartes,
    date: { fr: `${date.getUTCDate()} ${MOIS_FR[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
            en: `${date.getUTCDate()} ${MOIS_EN[date.getUTCMonth()]} ${date.getUTCFullYear()}` },
  };
}

const echapper = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Jamais d'arrondi vers le haut : 97,6 % s'écrit 97 %.
const nombre = (v, langue) => {
  const n = Math.floor(v);
  return langue === 'fr' ? n.toLocaleString('fr-FR').replace(/\s/g, ' ') : n.toLocaleString('en-GB');
};
// Deux langues sur chaque texte : la page montre le français, son bouton FR / EN
// recopie data-texte-en ou data-texte-fr.
const bilingue = (balise, fr, en) =>
  `<${balise} data-texte-fr="${echapper(fr)}" data-texte-en="${echapper(en)}">${echapper(fr)}</${balise}>`;

export function rendre(j) {
  const items = j.chiffres.map(c => {
    const fr = nombre(c.valeur, 'fr') + (c.unite === '%' ? ' %' : ''), en = nombre(c.valeur, 'en') + c.unite;
    return `<li>${bilingue('b', fr, en)}${bilingue('span', c.fr, c.en)}</li>`;
  }).join('');
  return `<section class="bloc chiffres" id="chiffres" aria-labelledby="t-chiffres">`
    + `<h2 id="t-chiffres" data-t="chiffres_titre">Elatransfer en chiffres</h2>`
    + `<ul class="chiffres-liste">${items}</ul>`
    + `<p class="chiffres-note">${bilingue('span', `Relevé du ${j.date.fr}.`, `As of ${j.date.en}.`)}</p>`
    + `</section>\n`;
}

function pages(dossier) {
  const out = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) out.push(...pages(p));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

export function appliquer(dossier, donnees, aujourdhui) {
  const j = juger(donnees, aujourdhui);
  const bilan = { j, remplies: [], retirees: [] };
  for (const f of pages(dossier)) {
    const html = fs.readFileSync(f, 'utf8');
    if (!REPERE.test(html)) continue;
    fs.writeFileSync(f, html.replace(REPERE, j.ok ? rendre(j) : ''));
    (j.ok ? bilan.remplies : bilan.retirees).push(path.relative(dossier, f));
  }
  return bilan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dossier = process.argv[2] || 'site';
  const source = process.env.ELA_CHIFFRES || 'chiffres.json';
  let donnees = null;
  try { donnees = JSON.parse(fs.readFileSync(source, 'utf8')); } catch (e) { donnees = null; }
  const { j, remplies, retirees } = appliquer(dossier, donnees, process.env.ELA_AUJOURDHUI || undefined);
  for (const r of j.ecartes) console.log(`En chiffres : écarté — ${r}`);
  if (j.ok) console.log(`En chiffres : ${j.chiffres.length} chiffre(s), relevés il y a ${j.age} j, posés sur ${remplies.length} page(s)`);
  else console.log(`En chiffres ÉTEINT (${j.raison}) : bloc retiré de ${retirees.length} page(s). La publication continue.`);
}
