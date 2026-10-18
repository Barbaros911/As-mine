// LA NOTE GOOGLE — UNE SEULE SOURCE, « avis-google.json » (18 octobre 2026).
//
// Barbaros a confirmé que les 25 avis de sa fiche Google viennent tous de
// clients d'Elatransfer. La note s'affiche donc sur l'accueil, les pages
// aéroport (français et anglais) et la page Professionnels — mais AUCUNE
// page n'écrit le chiffre elle-même. Chacune porte un repère vide :
//
//   <p class="note-google" data-avis-google="fr en" hidden></p>
//
// (« fr », « en » ou les deux ; data-forme="pro" pour la phrase de la page
// Professionnels), et ce script le remplit ici, à la construction, depuis
// avis-google.json. Le jour où la note change, on modifie UNE ligne.
//
// CE QUI L'ÉTEINT, PARTOUT À LA FOIS :
// - « afficher » à false — le jour où la fiche est suspendue ;
// - un relevé de plus de 60 jours : un chiffre périmé finit par mentir ;
// - une donnée mal formée (note hors de 1–5, nombre nul, lien étranger à
//   Google, date illisible ou dans le futur).
// Dans ces trois cas le repère est RETIRÉ et la construction CONTINUE : une
// note absente ne doit jamais empêcher une correction urgente d'être publiée.
//
// Le même délai est recopié sur la page (data-expire) avec trois lignes de
// script : un site qu'on ne reconstruit pas pendant deux mois retire sa note
// tout seul, chez le visiteur.
//
// JAMAIS D'ARRONDI VERS LE HAUT : 4,86 s'écrit 4,8. JAMAIS DANS LES DONNÉES
// STRUCTURÉES : Google n'affiche pas d'étoiles pour une entreprise qui se
// note elle-même, et test-avis-google le vérifie sur tout le site construit.
// Les pages construites depuis index.html pour un hôtel, sa réception,
// l'admin ou la démo ne portent pas la note : leur repère est retiré.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const JOURS_MAX = 60;
const LIEN_GOOGLE = /^https:\/\/(?:www\.google\.com\/maps\/|maps\.google\.com\/|g\.page\/|maps\.app\.goo\.gl\/)/;
const REPERE = /<p class="note-google" data-avis-google="([a-z ]+)"((?: data-forme="[a-z]+")?) hidden><\/p>/g;

const JOUR = 86400000;
const jourUTC = s => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return NaN;
  const t = Date.parse(s + 'T00:00:00Z');
  return new Date(t).toISOString().slice(0, 10) === s ? t : NaN;
};

// Rend { ok, raison } et, si ok, ce qu'il faut écrire.
export function juger(d, aujourdhui = new Date().toISOString().slice(0, 10)) {
  if (!d || typeof d !== 'object') return { ok: false, raison: 'fichier illisible' };
  if (d.afficher !== true) return { ok: false, raison: '« afficher » n’est pas à true' };
  if (typeof d.note !== 'number' || !(d.note >= 1 && d.note <= 5)) return { ok: false, raison: 'note hors de 1 à 5' };
  if (!Number.isInteger(d.nombre) || d.nombre < 1) return { ok: false, raison: 'nombre d’avis invalide' };
  if (typeof d.lien !== 'string' || !LIEN_GOOGLE.test(d.lien)) return { ok: false, raison: 'lien qui ne mène pas à Google' };
  const releve = jourUTC(d.releve_le), jour = jourUTC(aujourdhui);
  if (Number.isNaN(releve)) return { ok: false, raison: 'date de relevé illisible' };
  if (releve > jour) return { ok: false, raison: 'date de relevé dans le futur' };
  const age = Math.round((jour - releve) / JOUR);
  if (age > JOURS_MAX) return { ok: false, raison: `relevé vieux de ${age} jours (plus de ${JOURS_MAX})` };
  const dixiemes = Math.floor(d.note * 10 + 1e-9) / 10;
  return {
    ok: true, age,
    note: { fr: dixiemes.toFixed(1).replace('.', ','), en: dixiemes.toFixed(1) },
    nombre: d.nombre,
    lien: d.lien,
    expire: new Date(releve + JOURS_MAX * JOUR).toISOString().slice(0, 10),
  };
}

const echapper = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function rendre(j, langues, forme) {
  const lien = langue => {
    const n = langue === 'fr' ? `${j.nombre} avis` : `${j.nombre} ${j.nombre > 1 ? 'reviews' : 'review'}`;
    const texte = langue === 'fr'
      ? (forme === 'pro' ? `${j.note.fr} sur Google (${n})` : `${j.note.fr} sur Google · ${n}`)
      : (forme === 'pro' ? `${j.note.en} on Google (${n})` : `${j.note.en} on Google · ${n}`);
    return `<a href="${echapper(j.lien)}" target="_blank" rel="noopener"><span class="note-google-etoile" aria-hidden="true">★</span> ${texte}</a>`;
  };
  const phrase = langue => forme === 'pro'
    ? (langue === 'fr' ? `Nos clients voyageurs nous notent ${lien('fr')}.` : `Our travellers rate us ${lien('en')}.`)
    : lien(langue);
  const corps = langues.map(l => `<span lang="${l}">${phrase(l)}</span>`).join('');
  return `<p class="note-google" data-expire="${j.expire}">${corps}</p>`
    + `<script>(function(e){if(e&&Date.now()>Date.parse(e.getAttribute("data-expire")+"T23:59:59"))e.remove()})(document.currentScript&&document.currentScript.previousElementSibling)</script>`;
}

// Les pages tirées d'index.html pour un autre espace que le site public.
const autreEspace = html => {
  const m = /<html[^>]*\sdata-ela-space="([^"]*)"/.exec(html);
  return m && m[1] !== 'public';
};

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
  const demo = path.join(dossier, 'demo') + path.sep;
  for (const f of pages(dossier)) {
    const html = fs.readFileSync(f, 'utf8');
    if (!html.includes('class="note-google"')) continue;
    const poser = j.ok && !f.startsWith(demo) && !autreEspace(html);
    const neuf = html.replace(REPERE, (_, langues, forme) =>
      poser ? rendre(j, langues.trim().split(/\s+/), /pro/.test(forme) ? 'pro' : 'court') : '');
    if (neuf === html) continue;
    fs.writeFileSync(f, neuf);
    (poser ? bilan.remplies : bilan.retirees).push(path.relative(dossier, f));
  }
  return bilan;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dossier = process.argv[2] || 'site';
  const source = process.env.ELA_AVIS_GOOGLE || 'avis-google.json';
  let donnees = null;
  try { donnees = JSON.parse(fs.readFileSync(source, 'utf8')); } catch (e) { donnees = null; }
  const { j, remplies, retirees } = appliquer(dossier, donnees, process.env.ELA_AUJOURDHUI || undefined);
  if (j.ok) console.log(`Note Google : ${j.note.fr} · ${j.nombre} avis, relevée il y a ${j.age} j, posée sur ${remplies.length} page(s)`);
  else console.log(`Note Google ÉTEINTE (${j.raison}) : retirée de ${retirees.length} page(s). La publication continue.`);
}
