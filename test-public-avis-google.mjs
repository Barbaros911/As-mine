// ═══ LA NOTE GOOGLE VIENT D'UN SEUL FICHIER (18 octobre 2026) ═══
// Barbaros a confirmé que les 25 avis de sa fiche viennent tous de clients
// d'Elatransfer. La note s'affiche sur l'accueil, les pages aéroport (français
// et anglais) et la page Professionnels, depuis avis-google.json seul, posée à
// la construction par .github/scripts/avis-google.mjs. Ce qui est verrouillé :
//  · aucune page n'écrit le chiffre elle-même : seul le repère vide existe
//    dans le dépôt ;
//  · jamais de note dans les données structurées (Google n'affiche pas
//    d'étoiles pour une entreprise qui se note elle-même) ;
//  · elle s'éteint PARTOUT — « afficher » à false, relevé de plus de 60 jours,
//    donnée mal formée — sans jamais bloquer la construction, et aussi chez le
//    visiteur quand le site n'est pas reconstruit ;
//  · jamais d'arrondi vers le haut ;
//  · elle ne repousse pas « Voir mon prix » sous la barre du bas ;
//  · un hôtel, sa réception, l'admin et la démo ne la portent pas ;
//  · les mentions légales disent d'où elle vient (L111-7-2 Code conso.).
// LE LIEN SEUL (25 octobre 2026, #426) : note éteinte, les mêmes pages portent
// « Voir nos avis sur Google » / « See our reviews on Google », sans aucun
// chiffre ; il n'est retiré que si le lien ne mène pas à Google.
// Rien ici ne tombe parce que la note a changé : le test lit le fichier.
import { chromium } from 'playwright';
import { execSync, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extname, join, normalize } from 'node:path';
import { juger, jugerLien, appliquer, JOURS_MAX, TEXTE_LIEN } from './.github/scripts/avis-google.mjs';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
// Le fichier tel quel décide si la note est en ligne ; les contrôles de forme
// et de rendu l'éprouvent allumée, pour rester utiles quand elle est éteinte.
const FICHIER = JSON.parse(fs.readFileSync('avis-google.json', 'utf8'));
const SOURCE = { ...FICHIER, afficher: true };
const PAGES = ['index.html', 'transfert-cdg-paris.html', 'transfert-orly-paris.html', 'chauffeur-prive-paris.html',
  'professionnels/index.html', 'en/index.html', ...fs.readdirSync('en', { withFileTypes: true })
    .filter(e => e.isDirectory()).map(e => `en/${e.name}/index.html`)];
const plusJours = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// ─── 1. Le fichier lui-même ─────────────────────────────────────────────
// Bien formé à sa propre date : une faute de frappe éteindrait la note sans
// bruit, c'est ici qu'on la voit. (Son âge, lui, ne fait jamais tomber la CI :
// une note périmée s'éteint, elle ne bloque pas une correction urgente.)
const j0 = juger(SOURCE, SOURCE.releve_le);
check('avis-google.json est bien formé (note, nombre, lien Google, date)', j0.ok, j0.raison || '');
const jAuj = juger(FICHIER);
const lAuj = jugerLien(FICHIER);
const lienSeul = !jAuj.ok && lAuj.ok;
console.log(`(note du fichier : ${jAuj.ok ? 'affichée, relevée il y a ' + jAuj.age + ' j' : 'éteinte — ' + jAuj.raison + (lienSeul ? ' ; lien seul posé' : ' ; lien refusé — ' + lAuj.raison)})`);

// ─── 2. Le dépôt n'écrit le chiffre nulle part ──────────────────────────
const suivis = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
  .filter(f => /\.(html|js|mjs|css|json|webmanifest|xml|txt)$/.test(f))
  .filter(f => f !== 'avis-google.json' && !/^test-|^memoire\/|^\.github\/scripts\/avis-google\.mjs$|^supabase\//.test(f));
const enDur = [];
for (const f of suivis) {
  let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (/[1-5][,.]\d\s*(?:\/\s*5\s*)?(?:sur|on) Google/i.test(t) || /★\s*[1-5][,.]\d/.test(t)) enDur.push(f);
}
check('aucun fichier du dépôt n\'écrit la note en dur', enDur.length === 0, enDur.join(', '));
const lienEnDur = suivis.filter(f => { try { return /Voir nos avis sur Google|See our reviews on Google/.test(fs.readFileSync(f, 'utf8')); } catch { return false; } });
check('ni le lien seul : il ne vient que du script, comme la note', lienEnDur.length === 0, lienEnDur.join(', '));
const reperes = PAGES.map(f => [f, (fs.readFileSync(f, 'utf8').match(/<p class="note-google"[^>]*>[\s\S]*?<\/p>/g) || [])]);
check('chacune des pages qui l\'affichent porte un seul repère, vide et caché',
  reperes.every(([, r]) => r.length === 1 && /data-avis-google="[a-z ]+"(?: data-forme="pro")? hidden><\/p>$/.test(r[0])),
  reperes.filter(([, r]) => r.length !== 1 || !/hidden><\/p>$/.test(r[0] || '')).map(([f]) => f).join(', '));

// ─── 3. Le site construit ───────────────────────────────────────────────
execSync('sh construire.sh', { stdio: 'ignore' });
const toutes = [];
(function lister(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) lister(p); else if (e.name.endsWith('.html')) toutes.push(p);
  }
})('site');
const notes = Object.fromEntries(toutes.map(f => [path.relative('site', f), (fs.readFileSync(f, 'utf8').match(/class="note-google"/g) || []).length]));
const avec = Object.keys(notes).filter(f => notes[f] > 0).sort();
if (jAuj.ok || lienSeul) {
  const quoi = jAuj.ok ? 'la note' : 'le lien seul';
  check(`${quoi} est posé(e) sur les pages prévues, une fois chacune`, PAGES.every(f => notes[f] === 1), PAGES.filter(f => notes[f] !== 1).join(', '));
  check('et sur aucune autre (hôtel, réception, admin, démo)', avec.length === PAGES.length, avec.filter(f => !PAGES.includes(f)).join(', '));
  if (lienSeul) {
    // Ce qui vieillit ne doit pas paraître : ni chiffre, ni étoile, ni date.
    const avecChiffre = avec.filter(f => (fs.readFileSync(path.join('site', f), 'utf8').match(/<p class="note-google"[^>]*>[\s\S]*?<\/p>/g) || [])
      .some(b => /\d|★|data-expire/.test(b.replace(/href="[^"]*"/g, ''))));
    check('note éteinte : le lien seul ne porte ni chiffre, ni étoile, ni date', avecChiffre.length === 0, avecChiffre.join(', '));
  }
} else {
  check('note et lien refusés : aucune page publiée ne porte le repère', avec.length === 0, avec.join(', '));
}
const ld = [];
for (const f of toutes) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    if (/aggregateRating|ratingValue|reviewCount|"@type"\s*:\s*"Review"/.test(m[1])) ld.push(path.relative('site', f));
  }
}
check('aucune note dans les données structurées du site publié', ld.length === 0, ld.join(', '));

// ─── 4. Ce qui l'éteint, et l'arrondi ───────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'avis-'));
const pose = (donnees, jour) => {
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'demo'), { recursive: true });
  const r = '<p class="note-google" data-avis-google="fr en" hidden></p>';
  fs.writeFileSync(path.join(tmp, 'a.html'), `<html lang="fr"><body>${r}</body></html>`);
  fs.writeFileSync(path.join(tmp, 'pro.html'), `<html lang="fr"><body><p class="note-google" data-avis-google="fr" data-forme="pro" hidden></p></body></html>`);
  fs.writeFileSync(path.join(tmp, 'admin.html'), `<html lang="fr" data-ela-space="admin"><body>${r}</body></html>`);
  fs.writeFileSync(path.join(tmp, 'demo', 'd.html'), `<html lang="fr" data-ela-space="public"><body>${r}</body></html>`);
  appliquer(tmp, donnees, jour);
  return n => fs.readFileSync(path.join(tmp, n), 'utf8');
};
const J = SOURCE.releve_le;
let lu = pose(SOURCE, J);
check('posée : le chiffre, le nombre et le lien du fichier, dans les deux langues',
  lu('a.html').includes(`${j0.note.fr} sur Google · ${SOURCE.nombre} avis`) && lu('a.html').includes(`${j0.note.en} on Google · ${SOURCE.nombre} review`)
  && lu('a.html').includes(`href="${SOURCE.lien.replace(/&/g, '&amp;')}"`), lu('a.html').slice(0, 300));
check('la page Professionnels a sa phrase', /Nos clients voyageurs nous notent <a [^>]+>.*sur Google \(\d+ avis\)<\/a>\./.test(lu('pro.html')), lu('pro.html').slice(0, 300));
check('ni l\'admin ni la démo ne la portent, même à partir du même repère',
  !lu('admin.html').includes('note-google') && !lu('demo/d.html').includes('note-google'));
check(`le délai de ${JOURS_MAX} jours voyage avec la page (data-expire)`, lu('a.html').includes(`data-expire="${plusJours(J, JOURS_MAX)}"`));
// Note éteinte, lien valable : le lien seul, sans rien qui vieillisse.
const lienSeulPose = (html, langues) => {
  const b = (html.match(/<p class="note-google"[^>]*>[\s\S]*?<\/p>/g) || []);
  return b.length === 1 && !/\d|★|data-expire|<script/.test(b[0].replace(/href="[^"]*"/g, '')) && !html.includes('<script>(function(e)')
    && langues.every(l => b[0].includes(`<span lang="${l}"><a href="${SOURCE.lien.replace(/&/g, '&amp;')}" target="_blank" rel="noopener">${TEXTE_LIEN[l]}</a></span>`));
};
for (const [nom, d, jour] of [
  ['« afficher » à false', { ...SOURCE, afficher: false }, J],
  [`un relevé de ${JOURS_MAX + 1} jours`, SOURCE, plusJours(J, JOURS_MAX + 1)],
  ['un relevé daté du futur', SOURCE, plusJours(J, -2)],
  ['une note de 6', { ...SOURCE, note: 6 }, J],
  ['un nombre d\'avis nul', { ...SOURCE, nombre: 0 }, J],
  ['une date illisible', { ...SOURCE, releve_le: '18/10/2026' }, J],
]) {
  lu = pose(d, jour);
  check(`éteinte par ${nom} : « ${TEXTE_LIEN.fr} » seul, sans note ni nombre, dans les deux langues`,
    lienSeulPose(lu('a.html'), ['fr', 'en']) && lienSeulPose(lu('pro.html'), ['fr']), lu('a.html').slice(0, 400));
  check(`éteinte par ${nom} : ni l'admin ni la démo ne portent le lien`,
    !lu('admin.html').includes('note-google') && !lu('demo/d.html').includes('note-google'));
}
for (const [nom, d] of [
  ['un lien qui ne mène pas à Google', { ...SOURCE, lien: 'https://exemple.com/avis' }],
  ['un lien qui ne mène pas à Google, note éteinte', { ...SOURCE, afficher: false, lien: 'https://exemple.com/avis' }],
  ['un fichier illisible', null],
]) {
  lu = pose(d, J);
  check(`${nom} : le repère est retiré, rien n'est posé`, !lu('a.html').includes('note-google') && !lu('pro.html').includes('note-google'));
}
lu = pose(SOURCE, plusJours(J, JOURS_MAX));
check(`encore posée au ${JOURS_MAX}e jour`, lu('a.html').includes('note-google'));
lu = pose({ ...SOURCE, note: 4.86, nombre: 1 }, J);
check('jamais d\'arrondi vers le haut : 4,86 s\'écrit 4,8', lu('a.html').includes('4,8 sur Google · 1 avis') && lu('a.html').includes('4.8 on Google · 1 review'),
  (lu('a.html').match(/[\d,.]+ (?:sur|on) Google[^<]*/g) || []).join(' | '));
// Un fichier cassé ne bloque jamais la construction.
fs.writeFileSync(path.join(tmp, 'casse.json'), '{ "note": 5,');
pose(SOURCE, J); fs.writeFileSync(path.join(tmp, 'a.html'), '<html><body><p class="note-google" data-avis-google="fr" hidden></p></body></html>');
let sortie = 0;
try { execFileSync('node', ['.github/scripts/avis-google.mjs', tmp], { env: { ...process.env, ELA_AVIS_GOOGLE: path.join(tmp, 'casse.json') }, stdio: 'pipe' }); }
catch (e) { sortie = e.status || 1; }
check('un fichier cassé éteint la note sans arrêter la construction', sortie === 0 && !fs.readFileSync(path.join(tmp, 'a.html'), 'utf8').includes('note-google'), 'sortie ' + sortie);
fs.rmSync(tmp, { recursive: true, force: true });

// ─── 5. Dans le navigateur, sur le site construit ───────────────────────
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png',
  '.webp':'image/webp','.jpg':'image/jpeg','.txt':'text/plain','.xml':'application/xml'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { try { await stat(f + '.html'); f += '.html'; } catch { res.writeHead(404).end('non'); return; } }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8147, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8147/';
const b = await chromium.launch();
async function ouvrir(chemin, { langue = 'fr', w = 390, h = 844, jour = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: langue === 'en' ? 'en-US' : 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_langue', l); } catch (e) {} }, langue);
  const p = await ctx.newPage();
  if (jour) await p.clock.setFixedTime(new Date(jour + 'T12:00:00+02:00'));
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(SITE + chemin, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  return p;
}
const lue = p => p.evaluate(() => {
  const e = document.querySelector('.note-google');
  if (!e) return null;
  const r = e.getBoundingClientRect(), a = [...e.querySelectorAll('a')].find(x => x.offsetParent);
  return { texte: e.innerText.trim(), vue: r.height > 0 && getComputedStyle(e).display !== 'none', droite: r.right,
    href: a && a.href, cible: a && a.target, largeur: innerWidth, debord: document.documentElement.scrollWidth - innerWidth };
});
const rect = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }, s);

if (jAuj.ok || lienSeul) {
  // Ce que le visiteur doit lire, selon l'état du fichier : la note, ou le lien seul.
  const N = SOURCE.nombre, LIEN = SOURCE.lien;
  const A = jAuj.ok
    ? { fr: `★ ${jAuj.note.fr} sur Google · ${N} avis`, en: `★ ${jAuj.note.en} on Google · ${N} reviews`,
        proFr: `Nos clients voyageurs nous notent ★ ${jAuj.note.fr} sur Google (${N} avis).`,
        proEn: `Our travellers rate us ★ ${jAuj.note.en} on Google (${N} reviews).` }
    : { fr: TEXTE_LIEN.fr, en: TEXTE_LIEN.en, proFr: TEXTE_LIEN.fr, proEn: TEXTE_LIEN.en };
  let p = await ouvrir('');
  let n = await lue(p);
  check(`accueil FR : « ${A.fr} » sous les horaires, lien vers la fiche dans un nouvel onglet`,
    n && n.vue && n.texte === A.fr && n.href === LIEN && n.cible === '_blank', JSON.stringify(n));
  await p.context().close();
  p = await ouvrir('', { langue: 'en' });
  n = await lue(p);
  check('accueil EN : la ligne passe en anglais, la française est cachée', n && n.vue && n.texte === A.en, JSON.stringify(n));
  await p.context().close();

  // « Voir mon prix » entier au-dessus de la barre, et pas plus bas qu'avant.
  for (const [w, h] of [[360, 740], [390, 844], [320, 700]]) {
    p = await ouvrir('', { w, h });
    const avecNote = await rect(p, '#btnVoirPrix'), barre = await rect(p, '.barre');
    const ligne = await lue(p);
    await p.evaluate(() => { const e = document.querySelector('.note-google'); if (e) e.remove(); });
    await p.waitForTimeout(100);
    const sansNote = await rect(p, '#btnVoirPrix');
    if (w !== 320) check(`${w} × ${h} : « Voir mon prix » reste entier au-dessus de la barre du bas`, avecNote && barre && avecNote.bottom <= barre.top, JSON.stringify({ avecNote, barre }));
    check(`${w} × ${h} : la note ne déplace pas « Voir mon prix » (même place qu'éteinte)`, avecNote && sansNote && Math.abs(avecNote.top - sansNote.top) <= 1,
      JSON.stringify({ avec: avecNote && avecNote.top, sans: sansNote && sansNote.top }));
    check(`${w} × ${h} : la ligne tient dans l'écran, sans défilement de côté`, ligne && ligne.droite <= ligne.largeur && ligne.debord <= 0, JSON.stringify(ligne));
    await p.context().close();
  }
  for (const [w, h] of [[1366, 768], [1280, 800]]) {
    p = await ouvrir('', { w, h });
    const avecNote = await rect(p, '#btnVoirPrix');
    await p.evaluate(() => { const e = document.querySelector('.note-google'); if (e) e.remove(); });
    await p.waitForTimeout(100);
    const sansNote = await rect(p, '#btnVoirPrix');
    check(`ordinateur ${w} × ${h} : la note ne déplace pas « Voir mon prix »`, avecNote && sansNote && Math.abs(avecNote.top - sansNote.top) <= 1,
      JSON.stringify({ avec: avecNote && avecNote.top, sans: sansNote && sansNote.top }));
    await p.context().close();
  }

  // Page Professionnels, dans les deux langues de la page.
  p = await ouvrir('professionnels/');
  n = await lue(p);
  check(`Professionnels FR : « ${A.proFr} »`, n && n.vue && n.texte === A.proFr && n.href === LIEN && n.cible === '_blank', JSON.stringify(n));
  const bascule = await p.$('#langue');
  if (bascule) {
    await bascule.click(); await p.waitForTimeout(300);
    n = await lue(p);
    check('Professionnels EN : la ligne passe en anglais', n && n.vue && n.texte === A.proEn, JSON.stringify(n));
  } else check('Professionnels : le bouton FR / EN est trouvé', false);
  await p.context().close();

  // Pages aéroport : français sur les françaises, anglais sur les anglaises.
  for (const [chemin, attendu] of [['transfert-cdg-paris', A.fr], ['transfert-orly-paris', A.fr], ['en/cdg-airport-transfer-paris/', A.en], ['en/', A.en], ['chauffeur-prive-paris', A.fr]]) {
    p = await ouvrir(chemin, { w: 320, h: 700 });
    n = await lue(p);
    check(`${chemin} : la ligne, dans sa langue, sans débordement à 320 px`, n && n.vue && n.texte === attendu && n.debord <= 0 && n.href === LIEN, JSON.stringify(n));
    await p.context().close();
  }

  // Le site n'est pas reconstruit pendant deux mois : la page retire sa note.
  // Le lien seul, lui, ne vieillit pas : il est encore là bien après.
  const apres = plusJours(SOURCE.releve_le, JOURS_MAX + 1);
  for (const chemin of ['', 'transfert-cdg-paris', 'professionnels/']) {
    p = await ouvrir(chemin, { jour: apres });
    if (jAuj.ok) check(`/${chemin} au ${apres} : la note périmée disparaît chez le visiteur`, (await lue(p)) === null);
    else check(`/${chemin} au ${apres} : le lien seul est toujours là (rien n'y vieillit)`, !!(await lue(p)));
    await p.context().close();
  }
  if (jAuj.ok) {
    p = await ouvrir('', { jour: plusJours(SOURCE.releve_le, JOURS_MAX) });
    check(`au ${JOURS_MAX}e jour, elle est encore là`, !!(await lue(p)));
    await p.context().close();
  }
  p = await ouvrir('');
  check('aucune erreur de script sur l\'accueil', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();

  // Les autres espaces tirés d'index.html ne la montrent pas.
  for (const chemin of ['application.html?h=easyhotel-aeroville', 'easyhotel-client/', 'reception/easyhotel-aeroville/']) {
    p = await ouvrir(chemin);
    const vue = await p.evaluate(() => /sur Google|on Google/.test(document.body.innerText));
    check(`/${chemin} : ni note ni lien Google à l'écran`, !vue);
    await p.context().close();
  }
}

// ─── 6. Les mentions légales disent d'où vient la note ──────────────────
{
  const p = await ouvrir('');
  const T = await p.evaluate(() => ({ fr: window.ELA_TEXTES.fr.legal_mentions_body, en: window.ELA_TEXTES.en.legal_mentions_body }));
  check('mentions FR : le site renvoie vers la fiche Google, ni contrôle ni tri, et le relevé de 60 jours si une note s\'affiche',
    /renvoie vers la fiche Google/.test(T.fr) && new RegExp(`${JOURS_MAX} jours`).test(T.fr) && /ne les trie pas/.test(T.fr) && /sans faire de tri/.test(T.fr));
  check('mentions EN : the same, in English',
    /links to Elatransfer's Google profile/.test(T.en) && new RegExp(`${JOURS_MAX} days`).test(T.en) && /does not check, sort or edit/.test(T.en));
  // Une note éteinte ne se dit plus « affichée » : le texte légal suit ce que voit le visiteur.
  check('mentions : aucune ne dit qu\'une note est affichée tant qu\'elle peut être éteinte',
    !/La note Google affichée sur ce site/.test(T.fr) && !/The Google rating shown on this site/.test(T.en));
  await p.context().close();
}

await b.close(); serveur.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
