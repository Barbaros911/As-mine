/* =====================================================================
   TEST-MESURE.MJS — le collecteur de la mesure du trafic (15 octobre 2026)
   ---------------------------------------------------------------------
   Sur le SITE CONSTRUIT, contre une fausse fonction « mesure » qui note
   tout ce qu'elle reçoit. Ce qu'on éprouve, c'est ce que le navigateur
   ENVOIE — jamais ce qu'un commentaire promet :
   1. la page vue, avec ses deux identifiants, la page, l'entrée, l'espace ;
   2. la SOURCE EST CELLE DE L'ENTRÉE : arrivé de Google sur la page CDG,
      le client passe au moteur, et chaque événement porte encore
      « google.com » et l'entrée CDG — jamais « direct » ;
   3. le tunnel complet : prix demandé (avec l'aéroport), prix affiché,
      formulaire commencé (avec la gamme), demande envoyée (avec la SEULE
      référence) ; et AUCUN envoi ne porte le nom, le téléphone ni une adresse ;
   4. appel et WhatsApp, par délégation : le pied, la feuille WhatsApp ;
   5. une panne de la mesure (réseau coupé, 503) ne touche pas la
      réservation : le dépôt part, le bon dit « reçue » ;
   6. « ne plus me compter » : plus rien ne part ;
   7. ni l'admin, ni le mode exploitant, ni la réception, ni la démo ne
      chargent le collecteur ; la page des professionnels est l'espace « pro » ;
   8. le visiteur survit au rechargement, la session non à un nouvel onglet ;
   9. le collecteur ne lit aucun champ du formulaire (source relue).
   Port 8171, propre à cette suite. Lancer : node test-mesure.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });

/* ── 9. LA SOURCE DU COLLECTEUR ──────────────────────────────────────── */
{
  const src = readFileSync('mesure.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('9 aucun innerHTML, aucun accès au formulaire', !/innerHTML|clientNom|clientTel|getElementById\("depart|\.value\b/.test(src));
  check('9 seuls « ela_visiteur », « ela_session », « ela_mesure_non » sont stockés',
    (src.match(/(localStorage|sessionStorage)\.setItem\(([A-Z_]+)/g) || []).every(m => /CLE_(VISITEUR|SESSION|REFUS)/.test(m))
    && !/getItem\("ela_(courses|bookings|nuage)/.test(src));
  check('9 l\'envoi est « keepalive », en text/plain (pas de requête préalable), jamais attendu',
    /keepalive:\s*true/.test(src) && /"text\/plain"/.test(src) && !/await/.test(src));
  const sw = readFileSync('sw.js', 'utf8');
  check('9 sw.js garde le collecteur et l\'écran dans son SHELL', /"\.\/mesure\.js"/.test(sw) && /"\.\/trafic\.js"/.test(sw) && /"\.\/trafic\.css"/.test(sw));
}

/* ── LE SITE CONSTRUIT ─────────────────────────────────────────────── */
execSync('sh construire.sh', { stdio: 'ignore' });
{
  const avec = ['site/index.html', 'site/application.html', 'site/transfert-cdg-paris.html', 'site/transfert-orly-paris.html',
    'site/chauffeur-prive-paris.html', 'site/professionnels/index.html', 'site/easyhotel-client/index.html'];
  const sans = ['site/ela-admin/index.html', 'site/easyhotel-reception/index.html', 'site/reception/easyhotel-aeroville/index.html',
    'site/demo/hotel/index.html', 'site/demo/hotel/reception/index.html'];
  const porte = f => existsSync(f) && /<script\b[^>]*src="\/?mesure\.js"/.test(readFileSync(f, 'utf8'));
  check('7 toutes les pages publiques chargent le collecteur', avec.every(porte), avec.filter(f => !porte(f)).join(' · '));
  check('7 ni l\'admin, ni la réception, ni la démo ne le chargent', sans.every(f => !porte(f)), sans.filter(porte).join(' · '));
  check('7 le fichier publié n\'emporte pas ses notes de travail', !/LA SOURCE NE CHANGE PAS EN COURS DE VISITE/.test(readFileSync('site/mesure.js', 'utf8')));
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); } catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8171, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8171';
const LIEUX = {
  vendome: { geometry: { coordinates: [2.3292, 48.8675] }, properties: { label: 'Place Vendôme, 75001 Paris', name: 'Place Vendôme', type: 'street', city: 'Paris' } },
  argenteuil: { geometry: { coordinates: [2.2467, 48.9478] }, properties: { label: 'Argenteuil, 95100 Argenteuil', name: 'Argenteuil', type: 'municipality', city: 'Argenteuil' } },
};
const nav = await chromium.launch();
const erreurs = [];
/* mode : 'ok' (la fausse fonction note), 'reseau' (coupé), '503'. */
async function client({ largeur = 390, hauteur = 844, mode = 'ok', initial } = {}) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const mesures = [], depots = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  if (initial) await ctx.addInitScript(initial);
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/functions/v1/mesure')) {
      if (mode === 'reseau') return route.abort();
      if (mode === '503') return route.fulfill(J({ erreur: 'service indisponible' }, 503));
      let c = null; try { c = JSON.parse(req.postData() || 'null'); } catch {}
      mesures.push({ corps: c, brut: req.postData() || '', type: req.headers()['content-type'] || '' });
      return route.fulfill(J({ ok: true, compte: true }));
    }
    if (d.includes('api-adresse.data.gouv.fr')) {
      const q = (d.match(/[?&]q=([^&]*)/) || [, ''])[1];
      const k = Object.keys(LIEUX).find(k => q.includes(k.slice(0, 5)));
      return route.fulfill(J({ features: k ? [LIEUX[k]] : [] }));
    }
    if (d.includes('photon.komoot.io')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: 24300, duration: 2040 }] }));
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' }); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(6000);
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  return { ctx, p, mesures, depots };
}
async function adresse(p, champ, q, choix) {
  await p.fill('#' + champ, ''); await p.type('#' + champ, q, { delay: 15 });
  await p.waitForTimeout(700);
  const l = p.locator('#' + champ + 'List [role=option]', { hasText: choix }).first();
  if (await l.count()) await l.click(); else ko.push('« ' + q + ' » : la ligne « ' + choix + ' » manque dans la liste');
  await p.waitForTimeout(250);
}
const demain = () => new Date(Date.now() + 864e5).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const evts = (m, e) => m.filter(x => x.corps && x.corps.evenement === e);
async function partie(nom, fn) {
  try { await fn(); } catch (e) { ko.push(`${nom} — plantage : ${String(e && e.message || e).split('\n')[0]}`); }
}

try {
  /* ── 1 + 2 + 3 + 4 : UNE VISITE COMPLÈTE, DE GOOGLE À LA RÉSERVATION ─── */
  await partie('1-4', async () => {
    const { ctx, p, mesures, depots } = await client();
    await p.goto(BASE + '/transfert-cdg-paris.html', { referer: 'https://www.google.com/' });
    await p.waitForTimeout(600);
    const pv = evts(mesures, 'page_view');
    check('1 la page de service envoie UNE page vue', pv.length === 1, String(pv.length));
    const e1 = pv[0]?.corps || {};
    check('1 elle porte session, visiteur (8–32 signes), page, entrée, espace public, langue fr, téléphone',
      /^[a-z0-9]{8,32}$/.test(e1.session || '') && /^[a-z0-9]{8,32}$/.test(e1.visiteur || '') && e1.page === '/transfert-cdg-paris.html'
      && e1.landing === '/transfert-cdg-paris.html' && e1.espace === 'public' && e1.langue === 'fr' && e1.appareil === 'mobile', JSON.stringify(e1));
    check('1 le référent est le domaine de Google, sans le chemin', e1.referent === 'google.com', String(e1.referent));
    check('1 l\'envoi est en text/plain (une seule requête, pas d\'OPTIONS)', /text\/plain/.test(pv[0]?.type || ''), pv[0]?.type);
    /* Le client suit l'appel à l'action vers le moteur. */
    await p.locator('a[href^="/?aeroport=cdg"]').first().click();
    await p.waitForURL(/\?aeroport=cdg/); await p.waitForTimeout(800);
    const pv2 = evts(mesures, 'page_view');
    check('2 le moteur envoie sa page vue, « / » sans la chaîne de requête', pv2.length === 2 && pv2[1].corps.page === '/', pv2[1]?.corps?.page);
    check('2 MÊME session, MÊME visiteur, MÊME entrée, MÊME référent : la source ne change pas en route',
      pv2[1].corps.session === e1.session && pv2[1].corps.visiteur === e1.visiteur && pv2[1].corps.landing === '/transfert-cdg-paris.html'
      && pv2[1].corps.referent === 'google.com', JSON.stringify(pv2[1].corps));
    /* Le tunnel. */
    await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
    const dep = await p.inputValue('#depart');
    if (!dep) await adresse(p, 'depart', 'vendome', 'Vendôme');
    else { await p.locator('#departList [role=option]').first().click().catch(() => {}); await p.waitForTimeout(250); }
    await p.fill('#date', demain()); await p.fill('#heure', '10:00'); await p.waitForTimeout(200);
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
    const pc = evts(mesures, 'price_click'), pd = evts(mesures, 'price_displayed');
    check('3 « Voir mon prix » envoie « prix demandé », avec l\'aéroport de l\'entrée', pc.length === 1 && pc[0].corps.detail?.aeroport === 'cdg', JSON.stringify(pc[0]?.corps?.detail));
    check('3 l\'écran des prix envoie « prix affiché »', pd.length === 1, String(pd.length));
    await p.locator('.veh-carte').first().click();
    await p.locator('#btnContinuer').click(); await p.waitForTimeout(400);
    const bs = evts(mesures, 'booking_started');
    check('3 le récapitulatif envoie « formulaire commencé », avec la gamme', bs.length === 1 && /^(berline|van)$/.test(bs[0].corps.detail?.gamme || ''), JSON.stringify(bs[0]?.corps?.detail));
    await p.fill('#clientNom', 'Jean Martin');
    await p.fill('#clientTel', '06 12 34 56 78');
    await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
    await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1500);
    const bsub = evts(mesures, 'booking_submitted');
    check('3 la demande déposée envoie « réservation envoyée », avec la référence du bon et rien d\'autre',
      depots.length === 1 && bsub.length === 1 && bsub[0].corps.detail?.ref === depots[0].ref && Object.keys(bsub[0].corps.detail).join() === 'ref',
      JSON.stringify({ depots: depots.length, detail: bsub[0]?.corps?.detail, ref: depots[0]?.ref }));
    const tout = mesures.map(m => m.brut).join('\n');
    check('3 AUCUN envoi ne porte le nom, le téléphone, une adresse ni un prix',
      !/Jean|Martin|0612|06 12|34 56|Vendôme|Argenteuil|75001|prix|total/i.test(tout));
    check('3 l\'ordre des événements est celui du parcours',
      mesures.map(m => m.corps.evenement).join(' ') === 'page_view page_view price_click price_displayed booking_started booking_submitted',
      mesures.map(m => m.corps.evenement).join(' '));
    /* 4. Appel et WhatsApp. */
    const avant = mesures.length;
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await p.locator('.pied-tel').first().evaluate(a => a.scrollIntoView());
    await p.locator('.pied-tel').first().click().catch(() => {});
    await p.waitForTimeout(400);
    check('4 le numéro du pied envoie « appel »', evts(mesures, 'call_click').length === 1, String(evts(mesures, 'call_click').length));
    await p.locator('#btnWa').click(); await p.waitForTimeout(200);
    await p.locator('[data-wa="infos"]').click(); await p.waitForTimeout(400);
    const wa = evts(mesures, 'whatsapp_click');
    check('4 un choix de la feuille WhatsApp envoie « WhatsApp », avec le choix', wa.length === 1 && wa[0].corps.detail?.choix_wa === 'infos', JSON.stringify(wa[0]?.corps?.detail));
    await p.locator('#btnWa').click(); await p.waitForTimeout(200);
    await p.locator('[data-wa="appel"]').click().catch(() => {}); await p.waitForTimeout(400);
    check('4 « Nous appeler » dans la feuille envoie « appel », pas WhatsApp', evts(mesures, 'call_click').length === 2 && evts(mesures, 'whatsapp_click').length === 1);
    await p.locator('#btnWa').click(); await p.waitForTimeout(200);
    await p.locator('[data-wa="reserver"]').click(); await p.waitForTimeout(400);
    check('4 « Réserver un trajet » dans la feuille n\'est ni un appel ni un WhatsApp', mesures.length === avant + 1 + 1 + 1 + 1, String(mesures.length - avant));
    /* 8. Le visiteur survit au rechargement ; un nouvel onglet est une nouvelle session. */
    await p.reload(); await p.waitForTimeout(500);
    const dernier = mesures.at(-1).corps;
    check('8 après rechargement : même visiteur, même session', dernier.visiteur === e1.visiteur && dernier.session === e1.session);
    const p2 = await ctx.newPage(); p2.on('pageerror', e => erreurs.push(e.message));
    await p2.goto(BASE + '/'); await p2.waitForTimeout(500);
    const nouv = mesures.at(-1).corps;
    check('8 un nouvel onglet : même visiteur, AUTRE session, entrée « / », sans référent',
      nouv.visiteur === e1.visiteur && nouv.session !== e1.session && nouv.landing === '/' && !nouv.referent, JSON.stringify(nouv));
    await ctx.close();
  });

  /* ── 5. UNE PANNE DE LA MESURE NE TOUCHE PAS LA RÉSERVATION ──────── */
  for (const mode of ['reseau', '503']) await partie('5 ' + mode, async () => {
    const { ctx, p, depots } = await client({ mode });
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await adresse(p, 'depart', 'vendome', 'Vendôme');
    await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
    await p.fill('#date', demain()); await p.fill('#heure', '10:00');
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
    check('5 (' + mode + ') le prix s\'affiche malgré la mesure en panne', (await p.locator('.veh-carte').count()) > 0);
    await p.locator('.veh-carte').first().click();
    await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
    await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
    await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
    await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1500);
    check('5 (' + mode + ') la demande PART et le bon dit « reçue »', depots.length === 1 && (await p.locator('.envoi.ok').count()) === 1, String(depots.length));
    await ctx.close();
  });

  /* ── 6. « NE PLUS ME COMPTER » ──────────────────────────────────────── */
  await partie('6', async () => {
    const { ctx, p, mesures } = await client({ initial: () => { try { localStorage.setItem('ela_mesure_non', '1'); } catch {} } });
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await p.locator('.pied-tel').first().click().catch(() => {}); await p.waitForTimeout(300);
    check('6 avec « ela_mesure_non », RIEN ne part', mesures.length === 0, String(mesures.length));
    check('6 la page propose le refus (ELA_MESURE.refuser existe)', await p.evaluate(() => !!(window.ELA_MESURE && typeof window.ELA_MESURE.refuser === 'function' && !window.ELA_MESURE.actif())));
    await ctx.close();
  });

  /* ── 7. LES ESPACES QUI NE MESURENT PAS, ET L'ESPACE « pro » ──────── */
  await partie('7', async () => {
    const { ctx, p, mesures } = await client();
    await p.goto(BASE + '/?exploitant=1'); await p.waitForTimeout(700);
    check('7 le mode exploitant sur le dépôt n\'envoie rien', mesures.length === 0, String(mesures.length));
    await p.goto(BASE + '/ela-admin/'); await p.waitForTimeout(700);
    check('7 l\'admin n\'envoie rien', mesures.length === 0, String(mesures.length));
    await p.goto(BASE + '/professionnels/'); await p.waitForTimeout(700);
    const pro = mesures.at(-1)?.corps;
    check('7 la page des professionnels mesure dans l\'espace « pro »', mesures.length === 1 && pro?.espace === 'pro' && pro?.page === '/professionnels/', JSON.stringify(pro));
    await p.goto(BASE + '/easyhotel-client/?h=easyhotel-aeroville'); await p.waitForTimeout(900);
    const eh = mesures.at(-1)?.corps;
    check('7 la page du flyer mesure dans l\'espace « hotel-client », avec le marqueur hôtel', mesures.length === 2 && eh?.espace === 'hotel-client' && eh?.hotel === true, JSON.stringify(eh));
    await ctx.close();
  });

  /* ── Un ordinateur est un ordinateur. ───────────────────────────────── */
  await partie('appareil', async () => {
    const { ctx, p, mesures } = await client({ largeur: 1366, hauteur: 768 });
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    check('1 à 1366 px l\'appareil est « ordinateur »', mesures[0]?.corps?.appareil === 'ordinateur', mesures[0]?.corps?.appareil);
    await ctx.close();
  });
} finally {
  await nav.close();
  serveur.close();
}
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
console.log('=== test-mesure : ' + ok.length + ' réussis, ' + ko.length + ' échecs ===');
ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
