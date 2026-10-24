/* =====================================================================
   TEST-RECEPTION-CHOIX.MJS — au comptoir, le véhicule choisi survit au
   calcul du prix
   ---------------------------------------------------------------------
   24 octobre 2026, mesuré : choisir la destination lance le calcul 450 ms
   plus tard ; une réception rapide touche le véhicule AVANT qu'il réponde,
   et le redessin de la liste effaçait son choix. « Valider la réservation »
   restait éteint (5 fois sur 6 sur un poste lent), et
   test-public-depot-fiable tombait en CI au même endroit.
   Ici le calcul du trajet répond EXPRÈS 1,5 s plus tard : le cas se produit
   à tous les coups, sans dépendre de la vitesse de la machine.
   ÉPROUVÉ CONTRE L'ANCIEN CODE : les contrôles 1 à 4 tombent.
   Lancer :  node test-reception-choix.mjs
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
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${serveur.address().port}`;
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const erreurs = [];
const nav = await chromium.launch();

try {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const deposes = [];
  await ctx.route('**/*', async r => {
    const u = r.request().url();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/functions/v1/courses-hotel'))
      return r.fulfill(J({ hotel: 'easyhotel-aeroville', courses: [], session: 's.sig', expire: Date.now() + 864e5 }));
    if (u.includes('/functions/v1/deposer-course')) {
      deposes.push(r.request().postDataJSON().bon);
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, numero: 1042 }) });
    }
    if (u.includes('.supabase.co/')) return r.fulfill(J([]));
    /* Le calcul du trajet répond tard : c'est tout le sujet. ORS est coupé
       (une suite qui simule OSRM ne doit pas joindre le vrai service). */
    if (u.includes('router.project-osrm.org')) {
      await new Promise(f => setTimeout(f, 1500));
      return r.fulfill(J({ routes: [{ distance: 24300, duration: 2040 }] })).catch(() => {});
    }
    return r.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/reception/easyhotel-aeroville/');
  await p.fill('#recCode', 'code-de-test'); await p.click('#btnRecEntrer'); await p.click('#btnRecReserver');
  const etat = () => p.evaluate(() => {
    const c = document.querySelector('#listeVehicules .veh-carte.choisi'), b = document.getElementById('btnVoirPrix');
    return { choisi: c ? c.dataset.cle : null, prixCarte: c ? c.querySelector('.veh-prix').textContent.trim() : '',
      eteint: b.disabled, bouton: b.textContent.replace(/\s+/g, ' ').trim() };
  });
  const apresCalcul = async () => { await p.waitForTimeout(2600); return etat(); };

  /* 0. Sans choix, le calcul ne choisit rien à sa place. */
  await p.selectOption('#hotelDest', 'orly');
  let e = await apresCalcul();
  check('0. destination seule : aucun véhicule n\'est choisi d\'office, « Valider » reste éteint', !e.choisi && e.eteint, JSON.stringify(e));

  /* 1–2. Le véhicule touché AVANT la fin du calcul reste choisi. */
  await p.selectOption('#hotelDest', 'cdg');
  const cartes = await p.locator('#listeVehicules .veh-carte').count();
  await p.locator('#listeVehicules .veh-carte').first().click();
  const tout = await etat();
  e = await apresCalcul();
  check('1. le véhicule touché pendant le calcul reste choisi après lui', cartes > 0 && tout.choisi && e.choisi === tout.choisi, JSON.stringify({ cartes, tout, e }));
  /* Sur une page d'hôtel partenaire, la finition commune écrit « Valider la
     réservation » sans prix (hotel-engine-polish.js) : le prix se lit sur la
     carte choisie, et c'est elle qu'on juge. */
  check('2. « Valider la réservation » s\'allume, et la carte choisie porte un prix', !e.eteint && /\d/.test(e.prixCarte), JSON.stringify(e));

  /* 3. Changer de destination garde le véhicule, et sa carte prend le prix de la nouvelle. */
  await p.selectOption('#hotelDest', 'orly');
  const e2 = await apresCalcul();
  check('3. une autre destination garde le même véhicule, et sa carte change de prix',
    e2.choisi === e.choisi && !e2.eteint && /\d/.test(e2.prixCarte) && e2.prixCarte !== e.prixCarte, JSON.stringify({ avant: e.prixCarte, apres: e2 }));

  /* 4. La réservation part, une seule fois, avec ce véhicule. */
  await p.fill('#clientNom', 'M. Dupont'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.locator('#blocContact [data-contact="whatsapp"]').click().catch(() => {});
  await p.locator('#btnVoirPrix').click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const titre = await p.locator('#bcTitre').textContent().catch(() => '');
  check('4. « Valider » réserve : une seule demande part, avec le véhicule choisi',
    titre === 'Réservation enregistrée' && deposes.length === 1 && !!deposes[0] && /berline|van/i.test(JSON.stringify(deposes[0])), JSON.stringify({ titre, n: deposes.length }));

  /* 5. « Réserver une autre course » repart toujours sans véhicule. */
  await p.click('#btnNouvelleCourse', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(800);
  e = await apresCalcul();
  check('5. « Réserver une autre course » : aucun véhicule ne reste coché, même après le calcul', !e.choisi, JSON.stringify(e));

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
} catch (e) {
  ko.push('la suite a planté : ' + (e.message || e).toString().split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(k => console.log('  ✘ ' + k)); }
console.log(`=== RÉUSSIS (${ok.length}) ===`);
ok.forEach(k => console.log('  ✓ ' + k));
process.exit(ko.length ? 1 : 0);
