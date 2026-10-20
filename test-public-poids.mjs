/* =====================================================================
   TEST-PUBLIC-POIDS.MJS — ce que l'accueil télécharge, sur le site construit
   ---------------------------------------------------------------------
   20 octobre 2026, mission de finalisation (performance mesurée, pas
   supposée). Mesuré : l'accueil téléchargeait le logo du BON (1038 × 457,
   141 Ko), caché jusqu'à « Confirmer » — 18 % de tout ce que la page
   prenait sur le forfait du client. Une règle, pas un chiffre du jour :
   aucune image d'un écran caché n'est prise au chargement, et l'accueil ne
   fait aucun appel au serveur de réservation tant que personne ne réserve.
   Port 8178.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json',
  '.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8178, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8178';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const nav = await chromium.launch();
try {
  for (const [w, h] of [[390, 844], [1366, 768]]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, locale: 'fr-FR', serviceWorkers: 'block' });
    const p = await ctx.newPage();
    const images = [], serveurResa = [];
    await ctx.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    p.on('request', r => {
      if (r.resourceType() === 'image' && r.url().startsWith(BASE)) images.push(r.url().replace(BASE, ''));
      if (/supabase\.co\/(functions\/v1\/deposer-course|rest\/v1\/courses)/.test(r.url())) serveurResa.push(r.url());
    });
    await p.goto(BASE + '/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    /* Toute image <img> demandée doit appartenir à un élément AFFICHÉ. */
    const cachees = await p.evaluate(liste => [...document.querySelectorAll('img')].filter(i => {
      const src = new URL(i.currentSrc || i.src, location.href).pathname;
      return liste.includes(src) && !i.getClientRects().length;
    }).map(i => i.getAttribute('src')), images);
    check(`${w} px : aucune image d'un écran caché n'est téléchargée au chargement`, cachees.length === 0, cachees.join(', '));
    check(`${w} px : le logo du bon (141 Ko) n'est pas pris sur l'accueil`, !images.some(u => /\/brand-logo\.webp$/.test(u)), images.join(', '));
    check(`${w} px : l'accueil ne touche pas au serveur des réservations`, serveurResa.length === 0, serveurResa.join(', '));
    await ctx.close();
  }
} finally { await nav.close(); serveur.close(); }
console.log(`\n=== test-public-poids : ${ok.length} réussis, ${ko.length} échecs ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
