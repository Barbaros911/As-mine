/* =====================================================================
   TEST-PUBLIC-ICONES.MJS — une seule famille d'icônes, une couleur par sujet
   ---------------------------------------------------------------------
   24 octobre 2026, Barbaros : « je veux 10/10 », « c'est trop fade, il faut
   mettre de la couleur ». Mesuré avant : chaque icône de la page était un
   dessin fait main, chacun à sa façon, presque toutes au même bleu que les
   boutons.

   CE QUI EST VERROUILLÉ, SUR LE SITE CONSTRUIT (la façade n'existe que là) :
   — PLUS UN DESSIN FAIT MAIN À L'ÉCRAN : sur l'accueil, le seul dessin de
     la page encore visible est le logo de WhatsApp (une marque).
   — CHAQUE ICÔNE VIENT DE LA MÊME FAMILLE (Material Symbols, reconnue à sa
     grille de 960) : formulaire, « Qui sommes-nous », « Inclus », « Au-delà
     du trajet », pied de page, barre du bas, « Nous joindre ».
   — UNE COULEUR PAR SUJET : dans chaque bloc, deux icônes voisines n'ont
     pas la même teinte, aucune n'est le bleu des boutons, et le dessin se
     lit sur son fond (3:1 au moins, le minimum d'une icône).
   — L'ONGLET ALLUMÉ EST PLEIN, les autres au trait.

   Lancer :  node test-public-icones.mjs   (construit le site d'abord)
   ===================================================================== */
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
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8187, '127.0.0.1', r));
const SITE = 'http://127.0.0.1:8187/';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

const rvb = c => (String(c).match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
const lum = c => { const [r, g, b] = rvb(c).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const BLEU_BOUTONS = 'rgb(14, 111, 199)';

/* Ce que porte une icône : le masque de son pseudo-élément, sa couleur, le
   fond de sa pastille (le premier fond opaque en remontant). */
function lire(selecteurs) {
  const fondOpaque = e => { for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/rgba\(.*, 0\)$/.test(c) && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; };
  return selecteurs.map(([sel, pseudo]) => {
    const e = document.querySelector(sel);
    if (!e) return { sel, absent: true };
    const s = getComputedStyle(e, '::' + pseudo);
    return { sel, masque: s.webkitMaskImage || s.maskImage || '', teinte: s.backgroundColor, fond: fondOpaque(e), visible: e.getBoundingClientRect().width > 0 };
  });
}
const MATERIAL = /viewBox='0 -960 960 960'/;

const b = await chromium.launch();
try {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', route => route.request().url().startsWith(SITE) ? route.continue()
    : route.request().url().includes('supabase.co') ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : route.abort());
  await p.goto(SITE); await p.waitForTimeout(700);

  /* 1. Plus un dessin fait main à l'écran, hors marques. */
  const dessins = await p.evaluate(() => [...document.querySelectorAll('#ecran-accueil svg, .barre svg, .pied svg')]
    .filter(s => { const r = s.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(s).visibility !== 'hidden'; })
    .map(s => (s.closest('[id],[class]') || s).className + (s.getAttribute('fill') === '#25D366' ? ' (WhatsApp)' : '')));
  check('sur l\'accueil, plus aucun dessin fait main visible : seul le logo WhatsApp reste',
    dessins.length >= 1 && dessins.every(d => d.endsWith('(WhatsApp)')), dessins.join(' | '));

  /* 2. La même famille partout. */
  const ICONES = [['#blocArrivee .champ', 'before'], ['.reserver .geoloc', 'before'], ['#btnVoirPrix', 'after'], ['.reserver .rassure', 'before'],
    ['.piliers li:nth-child(1) .pilier-ic', 'before'], ['.piliers li:nth-child(2) .pilier-ic', 'before'], ['.piliers li:nth-child(3) .pilier-ic', 'before'],
    ['.inclus-l:nth-of-type(1) .inclus-ic', 'before'], ['.inclus-l:nth-of-type(2) .inclus-ic', 'before'],
    ['.inclus-l:nth-of-type(3) .inclus-ic', 'before'], ['.inclus-l:nth-of-type(4) .inclus-ic', 'before'],
    ['.plus-carte:nth-of-type(1) .plus-icone', 'before'], ['.plus-carte:nth-of-type(2) .plus-icone', 'before'], ['.plus-carte:nth-of-type(3) .plus-icone', 'before'],
    ['.pied-tel:not(.pied-mail)', 'before'], ['.pied-mail', 'before'],
    ['.barre .onglet[data-onglet="accueil"]', 'before'], ['.barre .onglet[data-onglet="courses"]', 'before'], ['.barre .onglet[data-onglet="trajets"]', 'before']];
  const lues = await p.evaluate(lire, ICONES);
  const horsFamille = lues.filter(i => i.absent || !MATERIAL.test(i.masque));
  check('chaque icône de l\'accueil vient de la même famille (Material Symbols)', lues.length === ICONES.length && horsFamille.length === 0,
    horsFamille.map(i => i.sel).join(' | ') || lues.length + ' icônes');

  /* 3. Une couleur par sujet, jamais le bleu des boutons, et lisible. */
  const blocs = { 'Qui sommes-nous': lues.filter(i => i.sel.includes('pilier-ic')), 'Inclus': lues.filter(i => i.sel.includes('inclus-ic')),
    'Au-delà du trajet': lues.filter(i => i.sel.includes('plus-icone')) };
  for (const [nom, l] of Object.entries(blocs)) {
    const teintes = l.map(i => i.fond + '/' + i.teinte);
    check(`« ${nom} » : une couleur par sujet`, l.length >= 3 && new Set(teintes).size === l.length, teintes.join(' | '));
    check(`« ${nom} » : aucune icône au bleu des boutons`, l.every(i => i.teinte !== BLEU_BOUTONS && i.fond !== BLEU_BOUTONS), l.map(i => i.teinte).join(' | '));
    const faibles = l.map(i => ({ sel: i.sel, r: ratio(i.teinte, i.fond) })).filter(x => !(x.r >= 3));
    check(`« ${nom} » : chaque dessin se lit sur son fond (3:1 au moins)`, faibles.length === 0, faibles.map(x => x.sel + ' ' + x.r.toFixed(1)).join(' | '));
  }

  /* 4. L'onglet allumé est plein : son dessin change quand il s'allume. */
  const masqueAccueil = () => p.evaluate(() => { const s = getComputedStyle(document.querySelector('.barre .onglet[data-onglet="accueil"]'), '::before'); return s.webkitMaskImage || s.maskImage; });
  const allume = await masqueAccueil();
  await p.locator('.barre .onglet[data-onglet="courses"]').click(); await p.waitForTimeout(400);
  const eteint = await masqueAccueil();
  check('l\'onglet allumé est plein, et redevient au trait quand on le quitte', MATERIAL.test(allume) && MATERIAL.test(eteint) && allume !== eteint);

  /* 5. « Nous joindre » : la même famille ; WhatsApp garde son logo. */
  await p.evaluate(() => document.querySelector('[data-ecran="ecran-contact"]').click()); await p.waitForTimeout(400);
  const contact = await p.evaluate(lire, [['.contact-lien[href^="tel:"]', 'before'], ['.contact-lien[href^="mailto:"]', 'before'], ['.legal-lien', 'after']]);
  check('« Nous joindre » : appeler, écrire et les documents légaux dans la même famille',
    contact.every(i => !i.absent && MATERIAL.test(i.masque)), contact.map(i => i.sel + (MATERIAL.test(i.masque || '') ? '' : ' ✘')).join(' | '));
  const logoWa = await p.evaluate(() => { const s = document.querySelector('#ecran-contact svg[fill="#25D366"]'); return !!s && s.getBoundingClientRect().width > 0; });
  check('« Nous joindre » : WhatsApp garde son logo', logoWa);
  check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  await ctx.close();
} finally {
  await b.close(); serveur.close();
}
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); console.log(''); }
process.exit(ko.length ? 1 : 0);
