/* =====================================================================
   TEST-MESURE.MJS — la mesure d'audience, vue du navigateur (15/10/2026)
   ---------------------------------------------------------------------
   Sur le SITE CONSTRUIT, contre une fausse fonction « mesure » qui note ce
   qu'elle reçoit. On éprouve ce que le navigateur ENVOIE, jamais ce qu'un
   commentaire promet. test-seo-en et test-liens-suivi éprouvent déjà les
   pages d'acquisition et le lien des partenaires ; ici, le reste :
   1. de Google à la réservation : la page d'arrivée porte le référent et
      les UTM, le moteur porte la page d'origine ; prix demandé (avec
      l'aéroport), prix affiché, formulaire commencé, demande envoyée (avec
      la SEULE référence), dans l'ordre du parcours ;
   2. AUCUN identifiant, aucun cookie, rien d'écrit sur l'appareil, et aucun
      envoi ne porte le nom, le téléphone, une adresse ni un prix ;
   3. appel et WhatsApp depuis le moteur, par délégation ;
   4. une panne de la mesure (réseau coupé, 503) ne touche pas la réservation ;
      4 bis : une demande REFUSÉE par le serveur n'envoie aucune
      « demande_envoyee » ;
   5. « Ne plus me compter » : le bouton de la politique de confidentialité,
      puis plus rien ne part, ni du moteur ni des pages ;
   6. ni l'admin, ni la réception, ni la démo, ni la page d'un hôtel
      n'envoient rien ;
   7. un ordinateur est un ordinateur, une page anglaise est en anglais.
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

{
  const src = readFileSync('mesure.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('0 mesure.js n\'écrit rien sur l\'appareil (seul le refus est LU)', !/setItem|document\.cookie/.test(src) && /getItem\("ela_mesure_non"\)/.test(src));
  check('0 l\'envoi est « keepalive », en text/plain, sans clé, jamais attendu',
    /keepalive:\s*true/.test(src) && /"text\/plain"/.test(src) && !/SUPABASE_CLE|apikey|await/.test(src));
}

execSync('sh construire.sh', { stdio: 'ignore' });
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const serveur = createServer(async (req, res) => {
  try {
    const chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { try { await stat(f + '.html'); f = f + '.html'; } catch { res.writeHead(404).end('non'); return; } }
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
/* UN VRAI NAVIGATEUR : le Chromium de test se dit « HeadlessChrome », et la
   page écarte à raison tout robot. Téléphone sous 768 px, ordinateur au-delà. */
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
async function client({ largeur = 390, hauteur = 844, mode = 'ok', depot = 'ok', initial } = {}) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Europe/Paris',
    userAgent: largeur < 768 ? UA_IPHONE : UA_PC });
  const mesures = [], depots = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  if (initial) await ctx.addInitScript(initial);
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/functions/v1/mesure')) {
      mesures.push({ corps: (() => { try { return JSON.parse(req.postData() || 'null'); } catch { return null; } })(),
        depuis: (() => { try { return req.frame().url(); } catch { return ''; } })(), brut: req.postData() || '', type: req.headers()['content-type'] || '', cle: req.headers()['apikey'] || req.headers()['authorization'] || '' });
      if (mode === 'reseau') return route.abort();
      if (mode === '503') return route.fulfill(J({ erreur: 'service indisponible' }, 503));
      return route.fulfill(J({ ok: true, compte: true }));
    }
    if (u.includes('/rpc/ela_mesurer')) { mesures.push({ ancienne: true }); return route.fulfill({ status: 204, body: '' }); }
    if (d.includes('api-adresse.data.gouv.fr')) {
      const q = (d.match(/[?&]q=([^&]*)/) || [, ''])[1];
      const k = Object.keys(LIEUX).find(k => q.includes(k.slice(0, 5)));
      return route.fulfill(J({ features: k ? [LIEUX[k]] : [] }));
    }
    if (d.includes('photon.komoot.io')) return route.fulfill(J({ features: [] }));
    if (d.includes('openrouteservice')) return route.abort();
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes: [{ distance: 24300, duration: 2040 }] }));
    if (u.includes('/functions/v1/deposer-course') || (u.includes('/rest/v1/courses') && req.method() === 'POST')) {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) depots.push(c.bon);
      if (depot === 'refuse') return route.fulfill({ status: 400, contentType: 'application/json', body: '{"erreur":"refusé"}' });
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
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
const gestes = m => m.filter(x => x.corps).map(x => x.corps.page + ':' + x.corps.evenement);
async function reserver(p) {
  await adresse(p, 'depart', 'vendome', 'Vendôme');
  await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
  await p.fill('#date', demain()); await p.fill('#heure', '10:00'); await p.waitForTimeout(200);
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
  await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
  await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1500);
}
async function partie(nom, fn) {
  try { await fn(); } catch (e) { ko.push(`${nom} — plantage : ${String(e && e.message || e).split('\n')[0]}`); }
}

try {
  /* ── 1 + 2 + 3 : DE GOOGLE À LA RÉSERVATION ───────────────────────── */
  await partie('1-3', async () => {
    const { ctx, p, mesures, depots } = await client();
    await p.goto(BASE + '/transfert-cdg-paris?utm_source=google&utm_medium=gbp', { referer: 'https://www.google.com/' });
    await p.waitForTimeout(600);
    const pv = mesures[0]?.corps || {};
    check('1 la page de service envoie sa page vue, avec le domaine de Google et les UTM',
      pv.evenement === 'page_vue' && pv.page === 'fr-cdg' && pv.referent === 'www.google.com' && pv.utm_medium === 'gbp' && pv.langue === 'fr' && pv.appareil === 'mobile',
      JSON.stringify(pv));
    check('1 la page de service envoie le fuseau horaire (le serveur en déduit le pays)', pv.fuseau === 'Europe/Paris', JSON.stringify(pv.fuseau));
    check('1 l\'envoi part en text/plain, sans clé', /text\/plain/.test(mesures[0]?.type || '') && !mesures[0]?.cle, mesures[0]?.type);
    await p.locator('a[data-mesure="reserver"]').first().click();
    await p.waitForURL(/aeroport=cdg/); await p.waitForTimeout(900);
    check('1 « Book » puis le moteur ouvert, pour la page d\'origine fr-cdg', gestes(mesures).slice(1, 3).join(' ') === 'fr-cdg:clic_reserver fr-cdg:moteur_ouvert', gestes(mesures).join(' '));
    const mo = mesures.find(m => m.corps?.evenement === 'moteur_ouvert')?.corps || {};
    check('1 le moteur envoie aussi le fuseau horaire', mo.fuseau === 'Europe/Paris', JSON.stringify(mo.fuseau));
    check('1 le moteur, ouvert depuis notre page, n\'a pas de référent : la visite garde celui de Google (serveur)', !mo.referent, JSON.stringify(mo));
    await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
    if (!(await p.inputValue('#depart'))) await adresse(p, 'depart', 'vendome', 'Vendôme');
    else {
      /* Arrivé de la page CDG, le départ porte « CDG » et le client choisit
         son terminal dans la liste : on l'ouvre, on prend le premier. */
      await p.locator('#depart').scrollIntoViewIfNeeded(); await p.fill('#depart', ''); await p.locator('#depart').pressSequentially('CDG'); await p.waitForTimeout(500);
      await p.locator('#departList [role=option]', { hasText: 'Terminal' }).first().click(); await p.waitForTimeout(250);
    }
    await p.fill('#date', demain()); await p.fill('#heure', '10:00'); await p.waitForTimeout(200);
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1500);
    const pd = mesures.find(m => m.corps?.evenement === 'prix_demande')?.corps;
    check('1 « Voir mon prix » envoie « prix demandé », avec l\'aéroport', pd && pd.page === 'fr-cdg' && pd.detail?.aeroport === 'cdg', JSON.stringify(pd));
    check('1 l\'écran des prix envoie « prix affiché »', mesures.some(m => m.corps?.evenement === 'prix_affiche'));
    await p.locator('.veh-carte').first().click();
    await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
    await p.fill('#clientNom', 'Jean Martin'); await p.fill('#clientTel', '06 12 34 56 78');
    await p.evaluate(() => { if (document.querySelector('#blocContact [aria-pressed="true"]')) return; const b = [...document.querySelectorAll('#blocContact [data-contact]')].find(e => e.offsetParent); if (b) b.click(); });
    await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1500);
    const de = mesures.find(m => m.corps?.evenement === 'demande_envoyee')?.corps;
    check('1 la demande déposée envoie « demande envoyée », avec la référence du bon et rien d\'autre',
      depots.length === 1 && de && de.detail?.ref === depots[0].ref && Object.keys(de.detail).join() === 'ref', JSON.stringify(de?.detail));
    const ordre = gestes(mesures).map(g => g.split(':')[1]);
    const attendu = ['page_vue', 'clic_reserver', 'moteur_ouvert', 'formulaire_commence', 'prix_demande', 'prix_affiche', 'demande_envoyee'];
    check('1 l\'ordre des gestes est celui du parcours', attendu.every((e, i) => ordre.indexOf(e) >= 0 && (i === 0 || ordre.indexOf(e) > ordre.indexOf(attendu[i - 1]))), ordre.join(' '));
    /* 2. Rien qui identifie. */
    const tout = mesures.map(m => m.brut).join('\n');
    check('2 AUCUN envoi ne porte le nom, le téléphone, une adresse ni un prix',
      !/Jean|Martin|0612|06 12|34 56|Vendôme|Argenteuil|75001|"prix"|total/i.test(tout));
    check('2 AUCUN envoi ne porte d\'identifiant', mesures.every(m => m.corps && !['session', 'visiteur', 'id', 'empreinte'].some(k => k in m.corps)));
    check('2 plus rien ne passe par l\'ancienne porte', !mesures.some(m => m.ancienne));
    const stockage = await p.evaluate(() => ({ cookies: document.cookie, locaux: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    check('2 aucun cookie, et la mesure n\'a rien écrit sur l\'appareil',
      !stockage.cookies && !stockage.locaux.some(k => /mesure|visit|session|trafic/.test(k)) && !stockage.session.some(k => /mesure|visit|trafic/.test(k)), JSON.stringify(stockage));
    /* 3. Appel et WhatsApp depuis le moteur. */
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    const avant = mesures.length;
    await p.locator('.pied-tel').first().click().catch(() => {}); await p.waitForTimeout(400);
    check('3 le numéro du pied envoie « appel »', mesures.slice(avant).some(m => m.corps?.evenement === 'clic_appel'));
    await p.locator('#btnWa').click(); await p.waitForTimeout(200);
    await p.locator('[data-wa="infos"]').click(); await p.waitForTimeout(400);
    const wa = mesures.slice(avant).find(m => m.corps?.evenement === 'clic_whatsapp')?.corps;
    check('3 un choix de la feuille WhatsApp envoie « WhatsApp », avec le choix', wa && wa.detail?.choix_wa === 'infos' && wa.page === 'accueil', JSON.stringify(wa));
    const n = mesures.length;
    await p.locator('#btnWa').click(); await p.waitForTimeout(200);
    await p.locator('[data-wa="reserver"]').click(); await p.waitForTimeout(400);
    check('3 « Réserver un trajet » dans la feuille n\'est ni un appel ni un WhatsApp', mesures.length === n, String(mesures.length - n));
    await ctx.close();
  });

  /* ── 4. UNE PANNE DE LA MESURE NE TOUCHE PAS LA RÉSERVATION ───────── */
  for (const mode of ['reseau', '503']) await partie('4 ' + mode, async () => {
    const { ctx, p, depots } = await client({ mode });
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await reserver(p);
    check('4 (' + mode + ') la demande PART et le bon dit « reçue »', depots.length === 1 && (await p.locator('.envoi.ok').count()) === 1, String(depots.length));
    await ctx.close();
  });

  /* ── 4 bis. UNE DEMANDE REFUSÉE N'EST PAS UNE RÉSERVATION (18/10/2026) ─
     « demande_envoyee » ne part qu'après le « oui » du serveur. Rien ne
     l'éprouvait : un envoi au clic aurait gonflé les réservations du trafic
     de chaque demande refusée (quota, contrôle, panne). */
  await partie('4 bis', async () => {
    const { ctx, p, mesures, depots } = await client({ depot: 'refuse' });
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await reserver(p); await p.waitForTimeout(1000);
    const envoyees = mesures.filter(m => m.corps?.evenement === 'demande_envoyee');
    check('4 bis le serveur refuse la demande : elle a bien été tentée', depots.length >= 1, String(depots.length));
    check('4 bis une demande refusée n\'envoie aucune « demande_envoyee »', envoyees.length === 0, JSON.stringify(envoyees.map(m => m.corps)));
    check('4 bis la demande refusée garde ses gestes d\'avant (le prix affiché est compté)', mesures.some(m => m.corps?.evenement === 'prix_affiche'));
    await ctx.close();
  });

  /* ── 5. « NE PLUS ME COMPTER » ─────────────────────────────────────── */
  await partie('5', async () => {
    const { ctx, p, mesures } = await client();
    await p.goto(BASE + '/?doc=privacy'); await p.waitForTimeout(600);
    check('5 la politique de confidentialité porte le bouton « Ne plus me compter »', await p.locator('#btnMesureNon').isVisible());
    await p.locator('#btnMesureNon').click(); await p.waitForTimeout(200);
    check('5 l\'appui le confirme', await p.locator('#mesureNonFait').isVisible());
    const n = mesures.length;
    await p.goto(BASE + '/'); await p.waitForTimeout(500);
    await p.locator('.pied-tel').first().click().catch(() => {}); await p.waitForTimeout(300);
    await p.goto(BASE + '/transfert-orly-paris'); await p.waitForTimeout(500);
    check('5 ensuite, plus rien ne part — ni du moteur, ni des pages', mesures.length === n, String(mesures.length - n));
    await ctx.close();
  });

  /* ── 6. LES ESPACES QUI NE MESURENT PAS ───────────────────────────── */
  await partie('6', async () => {
    const { ctx, p, mesures } = await client();
    for (const u of ['/ela-admin/', '/easyhotel-reception/', '/demo/hotel/', '/easyhotel-client/', '/application.html?h=easyhotel-aeroville']) {
      await p.goto(BASE + u).catch(() => {}); await p.waitForTimeout(700);
    }
    /* La démo fermée renvoie vers /professionnels/#demo, une page publique
       MESURÉE (« pro ») : ce geste-là est le sien, pas celui de la démo. */
    const muets = mesures.filter(m => !/\/professionnels\//.test(m.depuis || ''));
    check('6 ni l\'admin, ni la réception, ni la démo, ni les pages d\'un hôtel n\'envoient rien', muets.length === 0, muets.map(m => (m.corps?.page || '') + ':' + (m.corps?.evenement || '') + ' depuis ' + m.depuis).join(' '));
    const fichiers = ['site/ela-admin/index.html', 'site/easyhotel-reception/index.html', 'site/demo/hotel/index.html', 'site/easyhotel-client/index.html'];
    check('6 aucune de ces pages ne charge le collecteur', fichiers.every(f => !existsSync(f) || !/<script\b[^>]*src="\/?mesure\.js"/.test(readFileSync(f, 'utf8'))));
    await ctx.close();
  });

  /* ── 7. L'APPAREIL ET LA LANGUE ───────────────────────────────────── */
  await partie('7', async () => {
    const { ctx, p, mesures } = await client({ largeur: 1366, hauteur: 768 });
    await p.goto(BASE + '/en/'); await p.waitForTimeout(500);
    const c = mesures[0]?.corps || {};
    check('7 à 1366 px « ordinateur », et une page anglaise est en anglais', c.appareil === 'ordinateur' && c.langue === 'en', JSON.stringify(c));
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
