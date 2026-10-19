// ═══ LA FINITION VISUELLE DU SITE PUBLIC (19 octobre 2026) ═══
// Barbaros : « plus premium, plus simple, plus crédible », sans refonte. Le
// dessin est dans application-facade.css (« FINITION VISUELLE »), que seul
// construire.sh injecte : on éprouve donc le site CONSTRUIT. Ce qui est
// vérifié ici, ce sont des RÈGLES de système, pas des valeurs du jour :
//  · le haut de l'écran : la ligne des services est le sur-titre du grand
//    titre, sur une ligne ; le sous-titre se lit (15 px au moins) ;
//  · « Voir mon prix » garde de la marge au-dessus de la barre du bas, et
//    reste dans l'écran d'un portable 1366 × 657 ;
//  · UNE échelle : tous les titres de section de l'accueil ont la même taille,
//    et elle domine les intertitres des cartes ;
//  · UNE recette de carte : les cartes des services et d'« Au-delà du
//    trajet » ont le même arrondi et la même ombre ;
//  · l'encart des professionnels n'a qu'UN bouton plein ;
//  · le pied n'a plus le vert d'avant le 4 octobre ;
//  · l'ombre du formulaire ne tache plus le blanc sous la photo ;
//  · la page Professionnels parle la même langue (étapes en frise, guillemets) ;
//  · la page d'un hôtel et l'admin n'héritent de RIEN.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

execSync('sh construire.sh', { stdio: 'ignore' });
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
await new Promise(r => serveur.listen(8173, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8173/';

const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const b = await chromium.launch();

async function ouvrir(w, h, chemin = '', langue = 'fr') {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: langue === 'en' ? 'en-GB' : 'fr-FR',
    timezoneId: 'Europe/Paris', isMobile: w < 900, hasTouch: w < 900 });
  await ctx.addInitScript(l => { try { localStorage.setItem('ela_langue', l); } catch (e) {} }, langue);
  const p = await ctx.newPage();
  p._errs = []; p.on('pageerror', e => p._errs.push(e.message));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.clock.setFixedTime(new Date('2026-10-19T10:00:00+02:00'));
  await p.goto(SITE + chemin, { waitUntil: 'load' });
  await p.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  await p.waitForTimeout(300);
  return p;
}
const boite = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height }; }, s);

// ── 1. Le haut de l'écran, au téléphone, dans les deux langues.
for (const [w, h] of [[320, 640], [360, 740], [390, 844]]) for (const langue of ['fr', 'en']) {
  const p = await ouvrir(w, h, '', langue);
  const tag = `${w} × ${h} ${langue.toUpperCase()}`;
  const m = await p.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect();
    const prix = document.querySelector('.hero-prix'), sous = document.querySelector('.hero-sous');
    return { prix: r('.hero-prix'), h1: r('.hero h1'), lh: parseFloat(getComputedStyle(prix).lineHeight),
      deborde: prix.scrollWidth > prix.clientWidth + 1 || r('.hero-prix').right > innerWidth,
      sous: parseFloat(getComputedStyle(sous).fontSize), sw: document.documentElement.scrollWidth };
  });
  check(`${tag} : la ligne des services est au-dessus du grand titre (sur-titre)`, m.prix.bottom <= m.h1.top, `${Math.round(m.prix.bottom)} / titre ${Math.round(m.h1.top)}`);
  check(`${tag} : le sur-titre tient sur une ligne, sans sortir de l'écran`, Math.round(m.prix.height / m.lh) === 1 && !m.deborde, JSON.stringify(m.prix));
  check(`${tag} : le sous-titre se lit (14,5 px au moins, 15 dès 361 px)`, m.sous >= (w > 360 ? 15 : 14.5), m.sous + ' px');
  check(`${tag} : aucun débordement horizontal`, m.sw === w, String(m.sw));
  if (w >= 360) {
    const cta = await boite(p, '#btnVoirPrix'), barre = await boite(p, '.barre');
    check(`${tag} : « Voir mon prix » finit à 16 px au moins au-dessus de la barre du bas`, cta.bottom <= barre.top - 16,
      `bouton ${Math.round(cta.bottom)}, barre ${Math.round(barre.top)}`);
  }
  check(`${tag} : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 2. Sur ordinateur : le bouton dans l'écran d'un portable, et la photo
//    ne laisse pas de tache sous elle (l'ombre de la carte débordait).
for (const [w, h] of [[1366, 657], [1440, 900]]) {
  const p = await ouvrir(w, h);
  const cta = await boite(p, '#btnVoirPrix'), hero = await boite(p, '.hero'), carte = await boite(p, '.reserver');
  const h1 = await boite(p, '.hero h1'), notes = await boite(p, '.hero-notes'), note = await boite(p, '.note-google');
  check(`${w} × ${h} : « Voir mon prix » est dans l'écran, avec 40 px de marge`, cta.bottom <= h - 40, `bouton ${Math.round(cta.bottom)} / ${h}`);
  check(`${w} × ${h} : la carte est dans la photo, sous la promesse, à moins de 60 px d'elle`,
    carte.top >= hero.top && carte.bottom <= hero.bottom && carte.top - Math.max(notes.bottom, note ? note.bottom : 0) <= 60,
    `promesse → ${Math.round(Math.max(notes.bottom, note ? note.bottom : 0))}, carte ${Math.round(carte.top)}`);
  if (note) check(`${w} × ${h} : les horaires et la note Google sont sur une seule ligne`, Math.abs(notes.top - note.top) < 2 && note.left >= notes.right - 1,
    JSON.stringify({ notes, note }));
  check(`${w} × ${h} : le sur-titre est au-dessus du grand titre`, (await boite(p, '.hero-prix')).bottom <= h1.top);
  const png = await p.screenshot({ fullPage: true, clip: { x: 0, y: hero.bottom + 1, width: Math.min(w, 760), height: 40 } });
  const lum = await p.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data;
    let min = 255; for (let i = 0; i < d.length; i += 4) min = Math.min(min, .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]);
    return Math.round(min);
  }, png.toString('base64'));
  check(`${w} × ${h} : le blanc sous la photo est blanc (aucune ombre qui déborde)`, lum >= 248, 'luminance minimale ' + lum);
  check(`${w} × ${h} : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 3. Le système : une échelle de titres, une recette de carte, un bouton
//    dans l'encart des professionnels, un pied sans vert.
for (const [w, h] of [[390, 844], [1366, 768]]) {
  const p = await ouvrir(w, h);
  const s = await p.evaluate(() => {
    const vu = e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const fs = e => parseFloat(getComputedStyle(e).fontSize);
    const titres = [...document.querySelectorAll('#ecran-accueil .section > h2, #ecran-accueil .services-tete h2, #ecran-accueil .inclus > h2')].filter(vu);
    const inter = [...document.querySelectorAll('#ecran-accueil .plus-carte > b, #ecran-accueil .modele-etapes b, #ecran-accueil .service b, #ecran-accueil .inclus-l b')].filter(vu);
    const cartes = [...document.querySelectorAll('#ecran-accueil .service, #ecran-accueil .plus-carte')].filter(vu)
      .map(e => { const c = getComputedStyle(e); return c.borderTopLeftRadius + ' | ' + c.boxShadow; });
    const pro = [...document.querySelectorAll('#modele .modele-pro a')].filter(vu);
    const pleins = pro.filter(a => { const c = getComputedStyle(a).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; });
    const titreCouleur = titres.length ? getComputedStyle(titres[0]).color : '';
    return { tailles: titres.map(e => e.textContent.trim().slice(0, 24) + '=' + fs(e)), uniques: [...new Set(titres.map(fs))],
      interMax: Math.max(...inter.map(fs)), nInter: inter.length, cartes: [...new Set(cartes)], nCartes: cartes.length,
      pro: pro.map(a => a.textContent.trim()), pleins: pleins.map(a => a.textContent.trim()),
      pied: [...document.querySelectorAll('.pied-tel')].map(e => getComputedStyle(e).color), titreCouleur };
  });
  check(`${w} px : les titres de section sont lus (sinon les règles suivantes ne prouvent rien)`, s.tailles.length >= 5, s.tailles.join(' · '));
  check(`${w} px : tous les titres de section ont la même taille`, s.uniques.length === 1, s.tailles.join(' · '));
  check(`${w} px : ils dominent les intertitres des cartes (25 % de plus au moins)`, s.nInter >= 8 && s.uniques[0] >= s.interMax * 1.25,
    `titres ${s.uniques.join(',')} / intertitres ${s.interMax}`);
  check(`${w} px : une seule recette de carte (arrondi et ombre) pour les services et « Au-delà du trajet »`,
    s.nCartes >= 8 && s.cartes.length === 1, s.cartes.join(' ‖ '));
  check(`${w} px : l'encart des professionnels n'a qu'un bouton plein, et garde la démo et l'e-mail`,
    s.pleins.length === 1 && s.pro.length >= 3, `pleins : ${s.pleins.join(', ')} · liens : ${s.pro.join(', ')}`);
  check(`${w} px : le pied prend l'encre des titres (plus le vert d'avant le 4 octobre)`,
    s.pied.length === 2 && s.pied.every(c => c === s.titreCouleur), s.pied.join(', ') + ' / ' + s.titreCouleur);
  check(`${w} px : aucune erreur JavaScript`, p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 4. Les étapes se lisent comme une suite : des chiffres reliés, pas trois
//    boîtes. Sur l'accueil et sur la page Professionnels.
for (const [w, h] of [[390, 844], [1366, 768]]) for (const [chemin, sel] of [['', '#comment .modele-etapes li'], ['professionnels/', '.etapes li']]) {
  const p = await ouvrir(w, h, chemin);
  const e = await p.evaluate(sel => [...document.querySelectorAll(sel)].map(li => {
    const c = getComputedStyle(li), a = getComputedStyle(li, '::before');
    return { cadre: c.borderTopWidth !== '0px' || (c.backgroundColor !== 'rgba(0, 0, 0, 0)' && c.backgroundColor !== 'rgb(255, 255, 255)'),
      trait: a.content !== 'none' && a.content !== '' };
  }), sel);
  check(`${chemin || 'accueil'} ${w} px : trois étapes, sans cadre de carte`, e.length === 3 && e.every(x => !x.cadre), JSON.stringify(e));
  check(`${chemin || 'accueil'} ${w} px : un trait relie chaque étape à la suivante`, e.length === 3 && e[0].trait && e[1].trait && !e[2].trait, JSON.stringify(e));
  await p.context().close();
}
{
  const p = await ouvrir(390, 844, 'professionnels/');
  const q = await p.evaluate(() => [...document.querySelectorAll('.vecu .carte')].map(c => getComputedStyle(c, '::before').content));
  check('professionnels : les trois phrases du comptoir portent des guillemets', q.length === 3 && q.every(c => /“|\\201C/.test(c)), q.join(' '));
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  check('professionnels 390 px : aucun débordement horizontal', sw === 390, String(sw));
  check('professionnels : aucune erreur JavaScript', p._errs.length === 0, p._errs.join(' | '));
  await p.context().close();
}

// ── 5. Rien ne déborde sur les autres espaces : la page d'un hôtel, son
//    comptoir et l'admin ne connaissent pas les jetons de la finition.
for (const chemin of ['application.html?h=easyhotel-aeroville', 'easyhotel-client/', 'ela-admin/']) {
  const p = await ouvrir(390, 844, chemin);
  const v = await p.evaluate(() => ({ jeton: getComputedStyle(document.body).getPropertyValue('--t-h2').trim(),
    sur: (() => { const e = document.querySelector('.hero-prix'); return e ? getComputedStyle(e).textTransform : 'absent'; })() }));
  check(`/${chemin} : aucun jeton de la finition publique`, v.jeton === '', v.jeton);
  check(`/${chemin} : la ligne des services n'y devient pas un sur-titre`, v.sur !== 'uppercase', v.sur);
  await p.context().close();
}

await b.close();
await new Promise(r => serveur.close(r));
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
