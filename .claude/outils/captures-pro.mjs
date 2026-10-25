#!/usr/bin/env node
/* =====================================================================
   CAPTURES-PRO.MJS — les douze captures de la démo pour /professionnels/
   ---------------------------------------------------------------------
   « À quoi ça ressemble » (page des professionnels) montre la démo, page
   client et espace équipe, sur téléphone, tablette et ordinateur, en
   français et en anglais. Ces images ne se refont pas toutes seules : la
   démo a changé d'aspect le 25/10/2026 et les captures du 23/10 la
   montraient encore telle qu'avant. La règle (memoire/demo-pro.md) :
   REFAIRE LES CAPTURES SI LA DÉMO CHANGE D'ASPECT — c'est ce fichier.

   Comme les précédentes : sur le site CONSTRUIT, un faux demande-demo
   (« Hôtel Exemple Roissy »), le bandeau, les onglets, la consigne et la
   phrase du flyer de la démo masqués, l'horloge fixée à 10 h (sans elle,
   une course d'exemple peut s'afficher « En retard »). Rien ne sort sur
   Internet. Le WebP est fabriqué par Chromium lui-même (aucun module).

   Lancer :  sh construire.sh && node .claude/outils/captures-pro.mjs
   Les images sont écrites dans professionnels/ ; les regarder avant de
   les montrer, et test-pro-page.mjs avant de pousser.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const RACINE = join(process.cwd(), 'site');
const SORTIE = process.argv[2] || join(process.cwd(), 'professionnels');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(RACINE, chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + serveur.address().port;

/* Les mesures des images posées dans professionnels/index.html. */
const ECRANS = [
  { nom: 'telephone', width: 390, height: 760, dpr: 2, largeur: 540 },
  { nom: 'tablette', width: 820, height: 1100, dpr: 1, largeur: 820 },
  { nom: 'ordinateur', width: 1280, height: 760, dpr: 1, largeur: 1280 },
];
const VUES = { client: '/demo/hotel/', equipe: '/demo/hotel/reception/' };
const LANGUES = { fr: 'fr-FR', en: 'en-GB' };
/* 10 h à Paris aujourd'hui, heure d'été ou d'hiver. */
const JOUR = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const DIX_HEURES = ['+02:00', '+01:00'].map(o => new Date(`${JOUR}T10:00:00${o}`))
  .find(d => d.toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(11, 16) === '10:00');

const nav = await chromium.launch();
const encodeur = await (await nav.newContext()).newPage();
const erreurs = [];
for (const [vue, chemin] of Object.entries(VUES)) for (const e of ECRANS) for (const [langue, locale] of Object.entries(LANGUES)) {
  const ctx = await nav.newContext({ viewport: { width: e.width, height: e.height }, deviceScaleFactor: e.dpr, locale, timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(() => { try { localStorage.setItem('ela_demo_session', 'capture'); } catch (x) {} });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(BASE) || u.includes('fonts.g')) return r.continue();
    if (u.includes('/functions/v1/demande-demo')) return r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, etablissement: 'Hôtel Exemple Roissy', type: 'hotel', expire: new Date(Date.now() + 6048e5).toISOString() }) });
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', x => erreurs.push(`${vue}-${e.nom}-${langue} : ${x.message}`));
  await p.clock.setFixedTime(DIX_HEURES);
  await p.goto(BASE + chemin);
  await p.waitForTimeout(1500);
  await p.addStyleTag({ content: '#demoBandeau,#demoCadre,#demoCartesAide,#demoCartesFlyer{display:none!important}' });
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(500);
  const png = (await p.screenshot()).toString('base64');
  await ctx.close();
  const webp = await encodeur.evaluate(async ([png, largeur]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
    const c = document.createElement('canvas'); c.width = largeur; c.height = Math.round(img.height * largeur / img.width);
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', 0.8).split(',')[1];
  }, [png, e.largeur]);
  const fichier = join(SORTIE, `apercu-${vue}-${e.nom}-${langue}.webp`);
  await writeFile(fichier, Buffer.from(webp, 'base64'));
  console.log(`${fichier} : ${Math.round(Buffer.from(webp, 'base64').length / 1024)} Ko`);
}
await nav.close(); serveur.close();
if (erreurs.length) { console.error('ERREURS JavaScript :\n  ' + erreurs.join('\n  ')); process.exit(1); }
