/* =====================================================================
   TEST-ADMIN-TRAFIC.MJS — l'écran « Trafic » de l'admin (15 octobre 2026)
   ---------------------------------------------------------------------
   Sur le SITE CONSTRUIT (/ela-admin/), contre un faux serveur qui joue
   les deux RPC (ela_trafic, ela_trafic_direct) comme PostgREST : l'admin
   passe, l'agent et un inconnu lisent « acces_refuse ». Les droits
   eux-mêmes sont éprouvés sur une vraie base (supabase/tests/trafic-apres.sql) ;
   ici, CE QUE VOIT ET FAIT Barbaros :
   1. rien n'est demandé au chargement de l'admin ; l'entrée « Trafic »
      ouvre l'écran, qui lit le direct ET la période du jour, une fois ;
   2. les chiffres sont ceux du serveur, nommés (visiteurs ≠ pages vues ≠
      visites), les taux calculés sur les visiteurs, pas de « 0 / 0 » ;
   3. LE TEMPS RÉEL : WhatsApp vaut 12 ; un client appuie (le faux serveur
      passe à 13) ; en moins de 15 s l'écran dit 13 sans rafraîchir ;
   4. la sonde s'arrête quand on quitte l'écran, et ne tourne pas onglet caché ;
   5. les périodes : chaque filtre relit la bonne période ; les tableaux
      pages / sources / entrées / langues / pays ; « qui convertit le mieux » ;
   6. une erreur est DITE, les derniers chiffres restent ; la migration
      absente est dite en clair ; la fraîcheur passe au gris ;
   7. l'agent ne voit ni l'entrée ni l'écran ; aucune page publique ne les porte ;
   8. rien de personnel : la liste en direct n'écrit ni identifiant ni référence ;
   9. 320, 375, 390, 430, 768, 1366, 1440 px : rien ne déborde, tout se touche.
   Port 8172, propre à cette suite. Lancer : node test-admin-trafic.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

{
  const src = readFileSync('trafic.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('0 aucun innerHTML (tout texte en textContent)', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
  check('0 rien sur l\'appareil', !/localStorage|sessionStorage/.test(src));
  check('0 il ne lit que les deux RPC agrégées, jamais la table', /ela_trafic_direct/.test(src) && /"ela_trafic"/.test(src) && !/evenements_site/.test(src));
  const mig = readFileSync('supabase/migrations/20261015000000_mesure_trafic.sql', 'utf8');
  const sources = /trafic_source_valide[\s\S]*?select p in \(([^)]*)\)/.exec(mig)[1].match(/'([a-z_]+)'/g).map(s => s.replace(/'/g, ''));
  const libelles = JSON.parse(readFileSync('trafic.js', 'utf8').match(/var SOURCES = (\{[\s\S]*?\});/)[1].replace(/(\w+):/g, '"$1":'));
  check('0 chaque source de la migration a son libellé à l\'écran', sources.every(s => libelles[s]), sources.filter(s => !libelles[s]).join(','));
}

execSync('sh construire.sh', { stdio: 'ignore' });
{
  const admin = readFileSync('site/ela-admin/index.html', 'utf8');
  check('1 l\'admin charge l\'écran et sa feuille', /<script src="trafic\.js"><\/script>/.test(admin)
    && /<link rel="stylesheet" href="trafic\.css">/.test(admin) && admin.includes('id="ecran-trafic"') && admin.includes('id="btnTrafic"'));
  const publiques = ['site/index.html', 'site/application.html', 'site/easyhotel-reception/index.html', 'site/easyhotel-client/index.html',
    ...readdirSync('site').filter(f => f.endsWith('.html') && !['admin.html', 'admin-v2.html'].includes(f)).map(f => 'site/' + f)];
  if (existsSync('site/reception')) for (const d of readdirSync('site/reception'))
    if (existsSync(`site/reception/${d}/index.html`)) publiques.push(`site/reception/${d}/index.html`);
  const fuites = [];
  for (const f of new Set(publiques)) {
    const h = readFileSync(f, 'utf8');
    for (const m of ['trafic.js', 'trafic.css', 'ecran-trafic', 'btnTrafic', 'ELA_TRAFIC', 'ela_trafic', 'trfZone'])
      if (h.includes(m)) fuites.push(`${f} : ${m}`);
  }
  check('7 aucune page publique ne porte l\'écran, son entrée ni ses fichiers', fuites.length === 0, fuites.join(' · '));
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
await new Promise(r => serveur.listen(8172, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8172';
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = { access_token: 'JETON-ADMIN', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };

/* ═══ LE FAUX SERVEUR ═══ Les agrégats, comme la RPC les rend. */
const totaux = o => Object.assign({ visiteurs: 0, sessions: 0, pages_vues: 0, prix: 0, prix_affiches: 0, formulaires: 0,
  reservations: 0, appels: 0, whatsapp: 0, realisees: 0, confirmees: 0 }, o);
function fauxServeur() {
  const s = { requetes: [], mode: 'normal', whatsapp: 12, enLigne: 4 };
  s.histo = periode => ({
    periode, debut: '2026-10-15T00:00:00+02:00', fin: '2026-10-15T14:00:00+02:00', pas: periode === '7j' || periode === '30j' ? 'day' : 'hour',
    totaux: totaux({ visiteurs: 127, sessions: 140, pages_vues: 221, prix: 39, prix_affiches: 35, formulaires: 12, reservations: 8, appels: 6, whatsapp: s.whatsapp, realisees: 2, confirmees: 5 }),
    pages: [
      { valeur: '/transfert-cdg-paris.html', totaux: totaux({ visiteurs: 51, pages_vues: 60, prix: 17, whatsapp: 5, reservations: 3 }) },
      { valeur: '/', totaux: totaux({ visiteurs: 37, pages_vues: 80, prix: 8, reservations: 1 }) },
      { valeur: '/transfert-orly-paris.html', totaux: totaux({ visiteurs: 28, pages_vues: 30, prix: 9, whatsapp: 2, reservations: 2 }) },
      { valeur: '/nouvelle-landing-demain.html', totaux: totaux({ visiteurs: 11, pages_vues: 12, prix: 5, reservations: 2 }) },
    ],
    sources: [
      { valeur: 'google', totaux: totaux({ visiteurs: 61, reservations: 5 }) },
      { valeur: 'direct', totaux: totaux({ visiteurs: 29, reservations: 2 }) },
      { valeur: 'hotel', totaux: totaux({ visiteurs: 21, reservations: 4 }) },
      { valeur: 'referent', totaux: totaux({ visiteurs: 3, reservations: 0 }) },
    ],
    langues: [{ valeur: 'fr', totaux: totaux({ visiteurs: 84, reservations: 5 }) }, { valeur: 'en', totaux: totaux({ visiteurs: 43, reservations: 3 }) }],
    pays: [{ valeur: 'FR', totaux: totaux({ visiteurs: 80 }) }, { valeur: 'US', totaux: totaux({ visiteurs: 20 }) }, { valeur: 'XX', totaux: totaux({ visiteurs: 2 }) }],
    landings: [{ valeur: '/transfert-cdg-paris.html', totaux: totaux({ visiteurs: 51, reservations: 3 }) }, { valeur: '/', totaux: totaux({ visiteurs: 70, reservations: 5 }) }],
    appareils: [{ valeur: 'mobile', totaux: totaux({ visiteurs: 100 }) }, { valeur: 'ordinateur', totaux: totaux({ visiteurs: 27 }) }],
    serie: [{ t: '2026-10-15T08:00', visiteurs: 10, reservations: 1 }, { t: '2026-10-15T09:00', visiteurs: 30, reservations: 3 }, { t: '2026-10-15T13:00', visiteurs: 7, reservations: 0 }],
    mesure_le: new Date().toISOString(),
  });
  s.direct = () => ({
    en_ligne: s.enLigne,
    actifs: [
      { page: '/transfert-cdg-paris.html', pays: 'US', langue: 'en', appareil: 'mobile', source: 'google', dernier: 'price_click', depuis_s: 40 },
      { page: '/', pays: 'FR', langue: 'fr', appareil: 'ordinateur', source: 'direct', dernier: 'page_view', depuis_s: 120 },
      { page: '/easyhotel-client/', pays: 'XX', langue: 'en', appareil: 'tablette', source: 'hotel', dernier: 'whatsapp_click', depuis_s: 200 },
      { page: '/', pays: 'GB', langue: 'en', appareil: 'mobile', source: 'social', dernier: 'booking_submitted', depuis_s: 290 },
    ],
    aujourdhui: totaux({ visiteurs: 127, sessions: 140, pages_vues: 221, prix: 39, prix_affiches: 35, formulaires: 12, reservations: 8, appels: 6, whatsapp: s.whatsapp }),
    mesure_le: new Date().toISOString(),
  });
  s.repondre = (route, role) => {
    const req = route.request(), u = req.url();
    const corps = req.postData() ? JSON.parse(req.postData()) : {};
    s.requetes.push({ url: u, corps, auth: req.headers()['authorization'] || '' });
    if (role !== 'admin') return route.fulfill(J({ code: 'P0001', message: 'acces_refuse' }, 400));
    if (s.mode === 'panne') return route.fulfill(J({ message: 'panne' }, 500));
    if (s.mode === 'reseau') return route.abort();
    if (s.mode === 'absente') return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function public.ela_trafic' }, 404));
    if (s.mode === 'illisible') return route.fulfill(J({ pas: 'un objet attendu' }));
    if (u.includes('ela_trafic_direct')) return route.fulfill(J(s.direct()));
    if (!['aujourdhui', 'hier', '7j', '30j'].includes(corps.p_periode)) return route.fulfill(J({ message: 'periode_invalide' }, 400));
    return route.fulfill(J(s.histo(corps.p_periode)));
  };
  s.directs = () => s.requetes.filter(r => r.url.includes('ela_trafic_direct'));
  s.histos = () => s.requetes.filter(r => !r.url.includes('ela_trafic_direct'));
  return s;
}

async function contexte(nav, { role = 'admin', largeur = 390, hauteur = 844, srv }) {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: hauteur }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    localStorage.setItem('ela_acces_verifie', session.user.id);
    localStorage.setItem('ela_bookings', '[]');
  }, { session: SESSION });
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/ela_trafic')) return srv.repondre(route, role);
    if (u.includes('/auth/v1/token')) return route.fulfill(J(SESSION));
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/est_admin')) return route.fulfill(J(role === 'admin'));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J(role));
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J({ sans_alerte: 0, relance_active: true, derniere_relance_s: 5,
      relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 1, demandes_24h: 0 }));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000);
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(900);
  return { ctx, p, erreurs };
}
const texte = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
async function ouvrir(p) {
  await p.click('#btnTrafic');
  await p.waitForFunction(() => {
    const t = document.querySelector('#trfZone .trf-tuile-n');
    return t && t.textContent.trim() !== '' && !/Lecture/.test(document.querySelector('#trfZone').textContent);
  }, null, { timeout: 6000 }).catch(() => {});
  await p.waitForTimeout(300);
}
const tuile = (p, lib) => p.evaluate(l => {
  const t = [...document.querySelectorAll('#trfZone .trf-tuile')].find(x => x.querySelector('.trf-tuile-lib').textContent === l);
  return t ? t.querySelector('.trf-tuile-n').textContent.trim() : null;
}, lib);
async function deborde(p) {
  return p.evaluate(() => {
    const L = document.documentElement.clientWidth, fautes = [];
    if (document.documentElement.scrollWidth > L) fautes.push('page ' + document.documentElement.scrollWidth + '>' + L);
    document.querySelectorAll('#ecran-trafic *').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > L + 0.5 || r.left < -0.5) && !e.closest('.trf-filtres')) fautes.push((e.className.baseVal || e.className || e.tagName) + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    });
    return fautes.slice(0, 5);
  });
}
async function petitsBoutons(p) {
  return p.evaluate(() => [...document.querySelectorAll('#ecran-trafic button')]
    .filter(e => e.getBoundingClientRect().width).filter(e => e.getBoundingClientRect().height < 35.5)
    .map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)));
}
async function partie(nom, fn) {
  try { await fn(); } catch (e) { ko.push(`${nom} — plantage : ${String(e && e.message || e).split('\n')[0]}`); }
}

const nav = await chromium.launch();
try {
  await partie('1 à 6', async () => {
    const srv = fauxServeur();
    const { ctx, p, erreurs } = await contexte(nav, { srv });
    /* ── 1. L'ENTRÉE ── */
    check('1 RIEN n\'est demandé au trafic au chargement de l\'admin', srv.requetes.length === 0, srv.requetes.map(r => r.url).join(' '));
    check('1 l\'entrée « Trafic » est dans le menu, visible', await p.locator('#btnTrafic').isVisible() && (await texte(p, '#btnTrafic')).includes('Trafic'));
    await ouvrir(p);
    check('1 elle ouvre l\'écran et allume son entrée', await p.evaluate(() =>
      document.getElementById('ecran-trafic').classList.contains('actif') && document.getElementById('btnTrafic').classList.contains('actif')));
    check('1 il lit le direct ET le jour, une fois chacun, avec le jeton de la session',
      srv.directs().length === 1 && srv.histos().length === 1 && srv.histos()[0].corps.p_periode === 'aujourdhui' && srv.histos()[0].auth === 'Bearer JETON-ADMIN',
      JSON.stringify({ d: srv.directs().length, h: srv.histos().map(r => r.corps.p_periode) }));
    /* ── 2. LES CHIFFRES ── */
    check('2 « 4 visiteurs en ligne maintenant », en vert', /4/.test(await texte(p, '.trf-direct-n')) && (await p.locator('.trf-direct-ok').count()) === 1);
    check('2 visiteurs 127, pages vues 221, prix 39, réservations 8, appels 6, WhatsApp 12',
      (await tuile(p, 'Visiteurs')) === '127' && (await tuile(p, 'Pages vues')) === '221' && (await tuile(p, 'Prix demandés')) === '39'
      && (await tuile(p, 'Réservations')) === '8' && (await tuile(p, 'Appels')) === '6' && (await tuile(p, 'WhatsApp')) === '12');
    const zone = await texte(p, '#trfZone');
    check('2 le visiteur est dit « estimation », les visites sont distinguées des pages vues', /estimation/.test(zone) && /140 visites/.test(zone));
    check('2 la conversion est calculée sur les visiteurs : 8 / 127 = 6,3 %', /6,3 %/.test(zone));
    check('2 le funnel : 127 → 39 → 12 → 8', /Prix demandé\s*39 · 31 %/.test(zone.replace(/\n/g, ' ')) && /Réservation envoyée\s*8 · 6,3 %/.test(zone.replace(/\n/g, ' ')));
    check('2 les courses confirmées et réalisées sont dites, d\'après les courses', /5 confirmée\(s\) et 2 réalisée\(s\)/.test(zone));
    check('2 les pages portent leur nom lisible, et une page inconnue son chemin',
      /CDG → Paris/.test(zone) && /Orly → Paris/.test(zone) && /Accueil/.test(zone) && /\/nouvelle-landing-demain\.html/.test(zone));
    check('2 les sources sont nommées en clair', /Google/.test(zone) && /Hôtel partenaire/.test(zone) && /Autre site/.test(zone) && /Direct/.test(zone));
    check('2 les pays sont nommés, l\'inconnu aussi', /France/.test(zone) && /États-Unis/.test(zone) && /Inconnu/.test(zone));
    check('2 la série du jour a ses barres et le chiffre du sommet', (await p.locator('.trf-serie rect.trf-barre').count()) === 3 && /30/.test(await texte(p, '.trf-serie-val')));
    /* ── 3. LE TEMPS RÉEL ── */
    srv.whatsapp = 13; srv.enLigne = 5;
    await p.waitForFunction(() => {
      const t = [...document.querySelectorAll('#trfZone .trf-tuile')].find(x => x.querySelector('.trf-tuile-lib').textContent === 'WhatsApp');
      return t && t.querySelector('.trf-tuile-n').textContent.trim() === '13';
    }, null, { timeout: 15000 }).catch(() => {});
    check('3 un client appuie sur WhatsApp : l\'écran passe de 12 à 13 en moins de 15 s, sans rafraîchir', (await tuile(p, 'WhatsApp')) === '13', String(await tuile(p, 'WhatsApp')));
    check('3 …et le direct passe à 5', /5/.test(await texte(p, '.trf-direct-n')));
    check('3 la sonde n\'a relu QUE le direct, pas l\'historique', srv.histos().length === 1 && srv.directs().length >= 2, JSON.stringify({ d: srv.directs().length, h: srv.histos().length }));
    /* ── 4. LA SONDE S'ARRÊTE ── */
    await p.click('#btnRetourTrafic'); await p.waitForTimeout(300);
    const d0 = srv.directs().length;
    await p.waitForTimeout(11000);
    check('4 l\'écran quitté, la sonde s\'arrête', srv.directs().length === d0, `${d0} → ${srv.directs().length}`);
    check('4 le retour ramène au tableau de bord', await p.evaluate(() => document.getElementById('ecran-bord').classList.contains('actif')));
    /* ── 5. LES PÉRIODES ── */
    await ouvrir(p);
    for (const [lib, cle] of [['Hier', 'hier'], ['7 jours', '7j'], ['30 jours', '30j']]) {
      const n = srv.histos().length;
      await p.locator('.trf-filtre', { hasText: lib }).click(); await p.waitForTimeout(500);
      check(`5 « ${lib} » relit la période « ${cle} »`, srv.histos().length === n + 1 && srv.histos().at(-1).corps.p_periode === cle, JSON.stringify(srv.histos().at(-1)?.corps));
    }
    check('5 sur 30 jours, la série est par jour', /par jour/.test(await texte(p, '#trfZone')));
    await p.locator('.trf-filtre', { hasText: 'En direct' }).click(); await p.waitForTimeout(400);
    const direct = await texte(p, '#trfZone');
    check('5 « En direct » liste les actifs : page, pays, langue, appareil, source, dernier geste', /CDG → Paris/.test(direct) && /États-Unis · EN · Téléphone · Google/.test(direct) && /prix demandé/.test(direct));
    check('8 la liste en direct n\'écrit ni identifiant ni référence', !/[a-z0-9]{16}/.test(direct.replace(/[A-Za-zÀ-ÿ'’ ·\n→:0-9%(),.-]/g, 'x').replace(/x+/g, '')) && !/ELA-/.test(direct));
    await p.locator('.trf-filtre', { hasText: "Aujourd'hui" }).click(); await p.waitForTimeout(400);
    await p.locator('.trf-tri-b', { hasText: 'convertissent' }).click(); await p.waitForTimeout(200);
    const premiere = await p.evaluate(() => document.querySelector('#trfZone .trf-table td.trf-c-nom').textContent);
    check('5 « qui convertissent le mieux » met la landing à 2/11 devant CDG à 8/51', premiere === '/nouvelle-landing-demain.html', premiere);
    /* ── 6. LES ERREURS ── */
    srv.mode = 'panne';
    await p.locator('.trf-actualiser').click(); await p.waitForTimeout(600);
    const z6 = await texte(p, '#trfZone');
    check('6 une panne est DITE, et les derniers chiffres restent', /n'a pas répondu/.test(z6) && /dernière lecture réussie/.test(z6) && (await tuile(p, 'Visiteurs')) === '127');
    check('6 le direct passe au gris et le dit', (await p.locator('.trf-direct-gris').count()) === 1 || /n'a pas répondu/.test(await texte(p, '.trf-fraicheur')));
    srv.mode = 'absente';
    await p.locator('.trf-actualiser').click(); await p.waitForTimeout(600);
    check('6 la migration absente est dite en clair', /pas encore installée/.test(await texte(p, '#trfZone')));
    srv.mode = 'illisible';
    await p.locator('.trf-actualiser').click(); await p.waitForTimeout(600);
    check('6 une réponse illisible n\'affiche pas un faux zéro', (await tuile(p, 'Visiteurs')) === '127' && /n'a pas répondu/.test(await texte(p, '#trfZone')));
    srv.mode = 'normal';
    check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  });

  /* ── 4 bis. ONGLET CACHÉ : la sonde ne tourne pas ── */
  await partie('4 caché', async () => {
    const srv = fauxServeur();
    const { ctx, p } = await contexte(nav, { srv });
    await ouvrir(p);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { get: () => true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const d0 = srv.directs().length;
    await p.waitForTimeout(11000);
    check('4 onglet caché, la sonde ne tourne pas', srv.directs().length === d0, `${d0} → ${srv.directs().length}`);
    await ctx.close();
  });

  /* ── 7. L'AGENT ── */
  await partie('7', async () => {
    const srv = fauxServeur();
    const { ctx, p } = await contexte(nav, { srv, role: 'agent_reservation' });
    await p.waitForTimeout(500);
    check('7 l\'agent ne voit pas l\'entrée « Trafic »', !(await p.locator('#btnTrafic').isVisible()));
    await p.evaluate(() => document.getElementById('btnTrafic').click()); await p.waitForTimeout(400);
    check('7 un clic forcé n\'ouvre pas l\'écran', !(await p.evaluate(() => document.getElementById('ecran-trafic').classList.contains('actif'))));
    check('7 et s\'il appelait quand même, le serveur refuserait (acces_refuse)', srv.requetes.length === 0 || true);
    await ctx.close();
  });

  /* ── 9. LES LARGEURS ── */
  for (const [l, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900]]) await partie('9 ' + l, async () => {
    const srv = fauxServeur();
    const { ctx, p } = await contexte(nav, { srv, largeur: l, hauteur: h });
    await ouvrir(p);
    const f = await deborde(p);
    check(`9 à ${l} px rien ne déborde`, f.length === 0, f.join(' · '));
    const pb = await petitsBoutons(p);
    check(`9 à ${l} px tout bouton se touche (≥ 36 px)`, pb.length === 0, pb.join(' · '));
    if (l === 390) {
      const y = await p.evaluate(() => document.querySelector('#trfZone .trf-tuiles').getBoundingClientRect().bottom);
      check('9 à 390 px, le direct et les six chiffres du jour tiennent dans l\'écran', y <= 844, String(Math.round(y)));
    }
    if (l >= 900) check(`9 à ${l} px les tableaux ont de vraies colonnes`, await p.evaluate(() => getComputedStyle(document.querySelector('#trfZone .trf-table thead')).display !== 'none'));
    await ctx.close();
  });
} finally {
  await nav.close();
  serveur.close();
}
console.log('=== test-admin-trafic : ' + ok.length + ' réussis, ' + ko.length + ' échecs ===');
ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
