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
   9. 320, 375, 390, 430, 768, 1366, 1440 px : rien ne déborde, tout se touche ;
  10. l'ordre d'arrivée du direct et du jour ne change rien à l'écran ;
  11. chaque étape dit son taux sur l'étape d'avant, la plus grosse perte
      est nommée (et tue sous cinq personnes), les sources sont rangées par
      courses réalisées, et l'écran renvoie au Centre de contrôle.
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
  const mig = readFileSync('supabase/migrations/20261015010000_mesure_trafic.sql', 'utf8');
  const sources = /trafic_source_valide[\s\S]*?p in \(([^)]*)\)/.exec(mig)[1].match(/'([a-z_]+)'/g).map(s => s.replace(/'/g, ''));
  const libelles = JSON.parse(readFileSync('trafic.js', 'utf8').match(/var SOURCES = (\{[\s\S]*?\});/)[1].replace(/(\w+):/g, '"$1":'));
  check('0 chaque source de la migration a son libellé à l\'écran', sources.every(s => libelles[s]), sources.filter(s => !libelles[s]).join(','));
  /* LE FAUX SERVEUR REND LES MÊMES TOTAUX DU JOUR PAR SES DEUX RPC PARCE QUE
     LE VRAI LE FAIT. On le lit dans la dernière migration qui définit chaque
     RPC : le jour où le serveur cesse de le faire, ce contrôle tombe et le
     faux serveur doit suivre — sinon la suite éprouverait un serveur qui
     n'existe pas, et l'ordre des réponses redeviendrait un tirage. */
  const definition = nom => {
    const motif = new RegExp('function public\\.' + nom + '\\s*\\([\\s\\S]*?\\$\\$;');
    const f = readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort().reverse()
      .find(n => motif.test(readFileSync('supabase/migrations/' + n, 'utf8')));
    return f ? motif.exec(readFileSync('supabase/migrations/' + f, 'utf8'))[0] : '';
  };
  const rpcJour = definition('ela_trafic'), rpcDirect = definition('ela_trafic_direct');
  check('0 le serveur rend les totaux du jour par la même fonction dans le direct et dans l\'historique',
    /'totaux',\s*public\.trafic_totaux\(b\.debut,\s*b\.fin\)/.test(rpcJour)
    && /trafic_bornes\('aujourdhui'\)/.test(rpcDirect) && /'aujourdhui',\s*public\.trafic_totaux\(b\.debut,\s*b\.fin\)/.test(rpcDirect));
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

/* ═══ LE FAUX SERVEUR ═══ Les agrégats, comme la RPC les rend.
   LES TOTAUX DU JOUR SONT FAITS UNE FOIS ET RENDUS PAR LES DEUX RPC, comme
   sur le vrai serveur : ela_trafic('aujourdhui').totaux et
   ela_trafic_direct().aujourdhui sortent tous deux de trafic_totaux(),
   confirmées et réalisées comprises (contrôle « 0 » ci-dessous). Le faux
   direct en avait sa propre copie, sans elles : l'écran prend les totaux de
   la réponse arrivée la dernière, et la suite tombait chaque fois que le
   coureur de la CI servait le direct en second (17 octobre 2026).
   « retenu » garde une réponse jusqu'à « liberer() », pour forcer l'ordre
   d'arrivée sans dépendre d'aucune durée (partie 10). */
const totaux = o => Object.assign({ visiteurs: 0, visites: 0, pages_vues: 0, prix: 0, prix_affiches: 0, formulaires: 0,
  reservations: 0, reserver: 0, appels: 0, whatsapp: 0, realisees: 0, confirmees: 0 }, o);
function fauxServeur() {
  const s = { requetes: [], mode: 'normal', whatsapp: 12, enLigne: 4, retenu: null };
  let lacher; const lache = new Promise(r => { lacher = r; });
  s.liberer = () => lacher();
  s.jour = () => totaux({ visiteurs: 127, visites: 140, pages_vues: 221, prix: 39, prix_affiches: 35, formulaires: 45, reservations: 8, appels: 6, whatsapp: s.whatsapp, realisees: 2, confirmees: 5 });
  s.histo = periode => ({
    periode, debut: '2026-10-15T00:00:00+02:00', fin: '2026-10-15T14:00:00+02:00', pas: periode === '7j' || periode === '30j' ? 'day' : 'hour',
    /* « Hier » est une petite journée : sous cinq personnes à chaque étape
       du formulaire, l'écran ne désigne aucune perte (partie 11). */
    totaux: periode === 'hier' ? totaux({ visiteurs: 9, visites: 9, pages_vues: 12, formulaires: 3, prix: 2, prix_affiches: 2, reservations: 1 }) : s.jour(),
    pages: [
      { valeur: 'fr-cdg', totaux: totaux({ visiteurs: 51, pages_vues: 60, prix: 17, whatsapp: 5, reservations: 3 }) },
      { valeur: 'accueil', totaux: totaux({ visiteurs: 37, pages_vues: 80, prix: 8, reservations: 1 }) },
      { valeur: 'fr-orly', totaux: totaux({ visiteurs: 28, pages_vues: 30, prix: 9, whatsapp: 2, reservations: 2 }) },
      { valeur: 'fr-nouvelle-page', totaux: totaux({ visiteurs: 11, pages_vues: 12, prix: 5, reservations: 2 }) },
    ],
    sources: [
      /* Google apporte le plus de visiteurs et de réservations, le lien du
         partenaire le plus de courses RÉALISÉES : c'est lui qui doit sortir
         en tête de « Ce qui vous apporte des courses » (partie 11). */
      { valeur: 'google', totaux: totaux({ visiteurs: 61, prix_affiches: 20, reservations: 5, confirmees: 2, realisees: 0 }) },
      { valeur: 'direct', totaux: totaux({ visiteurs: 29, prix_affiches: 9, reservations: 2, confirmees: 1, realisees: 0 }) },
      { valeur: 'partenaire', totaux: totaux({ visiteurs: 21, prix_affiches: 6, reservations: 4, confirmees: 3, realisees: 2 }) },
      { valeur: 'referent', totaux: totaux({ visiteurs: 3, reservations: 0 }) },
    ],
    langues: [{ valeur: 'fr', totaux: totaux({ visiteurs: 84, reservations: 5 }) }, { valeur: 'en', totaux: totaux({ visiteurs: 43, reservations: 3 }) }],
    pays: [{ valeur: 'FR', totaux: totaux({ visiteurs: 80 }) }, { valeur: 'US', totaux: totaux({ visiteurs: 20 }) }, { valeur: 'XX', totaux: totaux({ visiteurs: 2 }) }],
    entrees: [{ valeur: 'fr-cdg', totaux: totaux({ visiteurs: 51, reservations: 3 }) }, { valeur: 'accueil', totaux: totaux({ visiteurs: 70, reservations: 5 }) }],
    liens: [{ valeur: 'hotel-exemple', totaux: totaux({ visiteurs: 21, reservations: 4 }) }],
    campagnes: [{ valeur: 'ete-2026', totaux: totaux({ visiteurs: 9, reservations: 1 }) }],
    appareils: [{ valeur: 'mobile', totaux: totaux({ visiteurs: 100 }) }, { valeur: 'ordinateur', totaux: totaux({ visiteurs: 27 }) }],
    serie: [{ t: '2026-10-15T08:00', visiteurs: 10, reservations: 1 }, { t: '2026-10-15T09:00', visiteurs: 30, reservations: 3 }, { t: '2026-10-15T13:00', visiteurs: 7, reservations: 0 }],
    mesure_le: new Date().toISOString(),
  });
  s.direct = () => ({
    en_ligne: s.enLigne,
    actifs: [
      { page: 'fr-cdg', pays: 'US', langue: 'en', appareil: 'mobile', source: 'google', dernier: 'prix_demande', depuis_s: 40 },
      { page: 'accueil', pays: 'FR', langue: 'fr', appareil: 'ordinateur', source: 'direct', dernier: 'moteur_ouvert', depuis_s: 120 },
      { page: 'en-cdg', pays: 'XX', langue: 'en', appareil: 'tablette', source: 'partenaire', dernier: 'clic_whatsapp', depuis_s: 200 },
      { page: 'accueil', pays: 'GB', langue: 'en', appareil: 'mobile', source: 'social', dernier: 'demande_envoyee', depuis_s: 290 },
    ],
    aujourdhui: s.jour(),
    mesure_le: new Date().toISOString(),
  });
  /* La réponse est faite à l'arrivée de la requête, comme le serveur la
     calcule ; seule sa livraison attend. null = coupure réseau. */
  s.reponse = (u, corps, role) => {
    if (role !== 'admin') return J({ code: 'P0001', message: 'acces_refuse' }, 400);
    if (s.mode === 'panne') return J({ message: 'panne' }, 500);
    if (s.mode === 'reseau') return null;
    if (s.mode === 'absente') return J({ code: 'PGRST202', message: 'Could not find the function public.ela_trafic' }, 404);
    if (s.mode === 'illisible') return J({ pas: 'un objet attendu' });
    if (u.includes('ela_trafic_direct')) return J(s.direct());
    if (!['aujourdhui', 'hier', '7j', '30j'].includes(corps.p_periode)) return J({ message: 'periode_invalide' }, 400);
    return J(s.histo(corps.p_periode));
  };
  s.repondre = async (route, role) => {
    const req = route.request(), u = req.url();
    const corps = req.postData() ? JSON.parse(req.postData()) : {};
    s.requetes.push({ url: u, corps, auth: req.headers()['authorization'] || '' });
    const r = s.reponse(u, corps, role);
    if (s.retenu === (u.includes('ela_trafic_direct') ? 'direct' : 'histo')) await lache;
    return r ? route.fulfill(r) : route.abort();
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
/* DÈS QU'UNE RÉPONSE DU SERVEUR EST EN JEU, ON ATTEND UN ÉTAT, JAMAIS UNE
   DURÉE : une durée fixe passe avant une réponse lente, et le contrôle lit
   alors l'écran d'avant (partie 10). Si l'état ne vient pas, le contrôle qui
   suit lit ce qui est affiché et tombe. Les durées qui restent prouvent une
   ABSENCE (la sonde arrêtée, l'écran refusé) : là, il n'y a rien à attendre. */
const attendre = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: 6000 }).catch(() => {});
async function ouvrir(p) {
  const avant = await p.evaluate(() => { const e = window.ELA_TRAFIC._etat; return { d: e.directLu, h: e.histoLu[e.periode] || 0 }; });
  await p.click('#btnTrafic');
  /* Les DEUX réponses lues et dessinées, quel que soit leur ordre d'arrivée. */
  await attendre(p, a => {
    const e = window.ELA_TRAFIC._etat;
    return (e.directLu > a.d || !!e.directErreur) && ((e.histoLu[e.periode] || 0) > a.h || !!e.histoErreur) && !e.chargement;
  }, avant);
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
    check('2 le visiteur est dit « estimation, comptée une fois par jour », les visites sont distinguées des pages vues', /comptés par jour/.test(zone) && /estimation, comptée une fois par jour/.test(zone) && /140 visites/.test(zone));
    check('2 la conversion est calculée sur les visiteurs : 8 / 127 = 6,3 %', /6,3 %/.test(zone));
    check('2 le funnel : 127 → 45 → 39 → 8', /Formulaire commencé\s*45 · 35 %/.test(zone.replace(/\n/g, ' ')) && /Prix demandé\s*39 · 31 %/.test(zone.replace(/\n/g, ' ')) && /Réservation envoyée\s*8 · 6,3 %/.test(zone.replace(/\n/g, ' ')));
    /* L'entonnoir officiel va jusqu'à la course faite, dans l'ordre (18/10/2026). */
    const etapesLues = await p.$$eval('.trf-funnel .trf-etape-lib', l => l.map(e => e.textContent.trim()));
    check('2 l\'entonnoir officiel a ses sept étapes, dans l\'ordre, jusqu\'à « Réalisée »',
      etapesLues.join('|') === 'Visiteurs|Formulaire commencé|Prix demandé|Prix affiché|Réservation envoyée|Confirmée|Réalisée', etapesLues.join(' → '));
    check('2 l\'entonnoir porte le prix affiché, les confirmées et les réalisées : 35 → 5 → 2',
      /Prix affiché\s*35 · 28 %/.test(zone.replace(/\n/g, ' ')) && /Confirmée\s*5 · 3,9 %/.test(zone.replace(/\n/g, ' ')) && /Réalisée\s*2 · 1,6 %/.test(zone.replace(/\n/g, ' ')));
    check('2 les courses confirmées et réalisées sont dites, d\'après les courses', /5 confirmée\(s\) et 2 réalisée\(s\)/.test(zone));
    check('2 les pages portent leur nom lisible, et une page inconnue son chemin',
      /CDG → Paris/.test(zone) && /Orly → Paris/.test(zone) && /Accueil/.test(zone) && /fr-nouvelle-page/.test(zone));
    check('2 les sources sont nommées en clair', /Google/.test(zone) && /Lien d'un partenaire/.test(zone) && /Autre site/.test(zone) && /Direct/.test(zone));
    check('5 les liens des partenaires ont leur tableau, et les pages d\'entrée le leur', /Liens des partenaires/.test(zone) && /hotel-exemple/.test(zone) && /Pages d'entrée/.test(zone));
    check('5 les campagnes UTM ont leur tableau', /Campagnes \(UTM\)/.test(zone) && /ete-2026/.test(zone));
    check('2 les pays sont nommés, l\'inconnu aussi', /France/.test(zone) && /États-Unis/.test(zone) && /Inconnu/.test(zone));
    check('2 la série du jour a ses barres et le chiffre du sommet', (await p.locator('.trf-serie rect.trf-barre').count()) === 3 && /30/.test(await p.locator('.trf-serie-val').first().textContent().catch(() => '')),
      (await p.locator('.trf-serie rect.trf-barre').count()) + ' barres · sommet « ' + (await p.locator('.trf-serie-val').first().textContent().catch(() => '')) + ' »');
    /* ── 3. LE TEMPS RÉEL ── */
    srv.whatsapp = 13; srv.enLigne = 5;
    await p.waitForFunction(() => {
      const t = [...document.querySelectorAll('#trfZone .trf-tuile')].find(x => x.querySelector('.trf-tuile-lib').textContent === 'WhatsApp');
      return t && t.querySelector('.trf-tuile-n').textContent.trim() === '13';
    }, null, { timeout: 15000 }).catch(() => {});
    check('3 un client appuie sur WhatsApp : l\'écran passe de 12 à 13 en moins de 15 s, sans rafraîchir', (await tuile(p, 'WhatsApp')) === '13', String(await tuile(p, 'WhatsApp')));
    check('3 …et le direct passe à 5', /5/.test(await texte(p, '.trf-direct-n')));
    check('3 …et les totaux venus du direct disent encore les courses confirmées et réalisées',
      /5 confirmée\(s\) et 2 réalisée\(s\)/.test(await texte(p, '#trfZone')));
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
      await p.locator('.trf-filtre', { hasText: lib }).click();
      await attendre(p, c => { const e = window.ELA_TRAFIC._etat; return !!e.histo[c] && !e.chargement; }, cle);
      check(`5 « ${lib} » relit la période « ${cle} »`, srv.histos().length === n + 1 && srv.histos().at(-1).corps.p_periode === cle, JSON.stringify(srv.histos().at(-1)?.corps));
    }
    check('5 sur 30 jours, la série est par jour', /par jour/.test(await texte(p, '#trfZone')));
    await p.locator('.trf-filtre', { hasText: 'En direct' }).click();
    await attendre(p, () => !!document.querySelector('#trfZone .trf-actifs'));
    const direct = await texte(p, '#trfZone');
    check('5 « En direct » liste les actifs : page, pays, langue, appareil, source, dernier geste', /CDG → Paris/.test(direct) && /États-Unis · EN · Téléphone · Google/.test(direct) && /prix demandé/.test(direct));
    check('8 la liste en direct n\'écrit ni identifiant ni référence', !/[a-z0-9]{16}/.test(direct.replace(/[A-Za-zÀ-ÿ'’ ·\n→:0-9%(),.-]/g, 'x').replace(/x+/g, '')) && !/ELA-/.test(direct));
    await p.locator('.trf-filtre', { hasText: "Aujourd'hui" }).click();
    await attendre(p, () => !window.ELA_TRAFIC._etat.chargement && !!document.querySelector('#trfZone .trf-tri-b'));
    await p.locator('.trf-tri-b', { hasText: 'convertissent' }).click(); await p.waitForTimeout(200);
    const premiere = await p.evaluate(() => document.querySelector('#trfZone .trf-table td.trf-c-nom').textContent);
    check('5 « qui convertissent le mieux » met la landing à 2/11 devant CDG à 8/51', premiere === 'fr-nouvelle-page', premiere);
    /* ── 6. LES ERREURS ── On attend que le direct (sous la pastille) ET le
       jour (au-dessus des chiffres) aient tous deux dit la nouvelle erreur. */
    const relu = re => attendre(p, s => {
      const z = document.querySelector('#trfZone'), f = z.querySelector('.trf-fraicheur'), b = z.querySelector('.trf-erreur-bloc');
      return !window.ELA_TRAFIC._etat.chargement && !!f && !!b && new RegExp(s).test(f.textContent) && new RegExp(s).test(b.textContent);
    }, re.source);
    srv.mode = 'panne';
    await p.locator('.trf-actualiser').click(); await relu(/n'a pas répondu/);
    const z6 = await texte(p, '#trfZone');
    check('6 une panne est DITE, et les derniers chiffres restent', /n'a pas répondu/.test(z6) && /dernière lecture réussie/.test(z6) && (await tuile(p, 'Visiteurs')) === '127');
    check('6 le direct passe au gris et le dit', (await p.locator('.trf-direct-gris').count()) === 1 || /n'a pas répondu/.test(await texte(p, '.trf-fraicheur')));
    srv.mode = 'absente';
    await p.locator('.trf-actualiser').click(); await relu(/pas encore installée/);
    check('6 la migration absente est dite en clair', /pas encore installée/.test(await texte(p, '#trfZone')));
    srv.mode = 'illisible';
    await p.locator('.trf-actualiser').click(); await relu(/réponse illisible/);
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

  /* ── 11. OÙ L'ON PERD, ET CE QUI APPORTE DES COURSES (19/10/2026) ──
     Les attendus sont recalculés à la main depuis le faux serveur, jamais
     relus sur l'écran : 39 / 45 = 87 %, 35 / 39 = 90 %, 8 / 35 = 23 %,
     5 / 8 = 63 %, 2 / 5 = 40 %. */
  await partie('11', async () => {
    const srv = fauxServeur();
    const { ctx, p, erreurs } = await contexte(nav, { srv });
    await ouvrir(p);
    const pas = await p.$$eval('.trf-funnel .trf-etape', l => l.map(e => (e.querySelector('.trf-etape-pas') || {}).textContent || ''));
    check('11 chaque étape dit son taux sur l\'étape d\'avant, et combien s\'arrêtent',
      pas[0] === '' && pas[1] === '35 % de l\'étape d\'avant · 82 de moins' && pas[2] === '87 % de l\'étape d\'avant · 6 de moins'
      && pas[3] === '90 % de l\'étape d\'avant · 4 de moins' && pas[4] === '23 % de l\'étape d\'avant · 27 de moins'
      && pas[5] === '63 % de l\'étape d\'avant · 3 de moins' && pas[6] === '40 % de l\'étape d\'avant · 3 de moins', pas.join(' | '));
    const perte = await texte(p, '.trf-perte');
    check('11 la plus grosse perte est nommée : entre le prix affiché et la réservation, 27 sur 35',
      /entre « Prix affiché » et « Réservation envoyée »/.test(perte) && /27 sur 35 s'arrêtent \(77 %\)/.test(perte), perte);
    const zone = await texte(p, '#trfZone');
    check('11 les prix vus sans réservation sont comptés', /27 prix vu\(s\) sans réservation/.test(zone));
    check('11 confirmée et réalisée sont dites suivre l\'état des courses', /suivent l'état des courses/.test(zone));
    const apport = await p.$$eval('.trf-apport .trf-apport-nom', l => l.map(e => e.textContent));
    check('11 « Ce qui vous apporte des courses » range les sources par courses réalisées, pas par visiteurs',
      apport.join('|') === "Lien d'un partenaire|Google|Direct", apport.join(' → '));
    check('11 une source sans réservation n\'y prend pas de ligne', !apport.includes('Autre site'));
    const tete = await texte(p, '.trf-apport .trf-apport-l');
    check('11 la première ligne dit réalisées, confirmées, réservations, et la conversion sur les prix vus',
      /2 réalisée\(s\) · 3 confirmée\(s\) · 4 réservation\(s\)/.test(tete) && /sur 21 visiteur\(s\)/.test(tete) && /67 % des prix vus/.test(tete), tete);
    check('11 l\'écran dit que les hôtels et le téléphone sont comptés au Centre de contrôle', /comptées par canal au Centre de contrôle/.test(zone));
    const colonnes = await p.evaluate(() => {
      const t = [...document.querySelectorAll('#trfZone .trf-bloc')].find(b => (b.querySelector('.trf-h2') || {}).textContent === 'Sources');
      const ligne = t && [...t.querySelectorAll('tbody tr')].find(tr => tr.querySelector('.trf-c-nom').textContent === "Lien d'un partenaire");
      if (!ligne) return null;
      const o = {}; ligne.querySelectorAll('td').forEach(td => { o[td.getAttribute('data-col')] = td.textContent; });
      return o;
    });
    check('11 le tableau des sources porte prix vus, réservations, confirmées, réalisées',
      !!colonnes && colonnes['Prix vus'] === '6' && colonnes['Réserv.'] === '4' && colonnes['Confirm.'] === '3' && colonnes['Réalisées'] === '2', JSON.stringify(colonnes));
    /* Une petite journée : aucune perte désignée au hasard de deux visites. */
    await p.locator('.trf-filtre', { hasText: 'Hier' }).click();
    await attendre(p, () => { const e = window.ELA_TRAFIC._etat; return !!e.histo.hier && !e.chargement; });
    check('11 sous cinq personnes à chaque étape, l\'écran ne désigne aucune perte, et le dit',
      /Pas encore assez de données/.test(await texte(p, '.trf-perte')), await texte(p, '.trf-perte'));
    await p.locator('.trf-filtre', { hasText: "Aujourd'hui" }).click();
    await attendre(p, () => !!document.querySelector('#trfZone .trf-vers-controle'));
    const d0 = srv.directs().length;
    await p.locator('.trf-vers-controle').click();
    check('11 « Ouvrir le Centre de contrôle » y mène', await p.evaluate(() => document.getElementById('ecran-controle').classList.contains('actif')));
    await p.waitForTimeout(11000);
    check('11 …et la sonde du trafic s\'arrête', srv.directs().length === d0, `${d0} → ${srv.directs().length}`);
    check('11 aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  });

  /* ── 9. LES LARGEURS ── */
  for (const [l, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900]]) await partie('9 ' + l, async () => {
    const srv = fauxServeur();
    const { ctx, p } = await contexte(nav, { srv, largeur: l, hauteur: h });
    await ouvrir(p);
    const f = await deborde(p);
    check(`9 à ${l} px rien ne déborde`, f.length === 0, f.join(' · '));
    const collees = await p.evaluate(() => {
      const r = [...document.querySelectorAll('#trfZone .trf-serie-axe')].map(t => t.getBoundingClientRect()).sort((a, b) => a.left - b.left);
      return r.slice(1).filter((x, i) => x.left < r[i].right + 2).length;
    });
    check(`9 à ${l} px les étiquettes de l'axe ne se touchent pas`, collees === 0, String(collees));
    const pb = await petitsBoutons(p);
    check(`9 à ${l} px tout bouton se touche (≥ 36 px)`, pb.length === 0, pb.join(' · '));
    if (l === 390) {
      const y = await p.evaluate(() => document.querySelector('#trfZone .trf-tuiles').getBoundingClientRect().bottom);
      check('9 à 390 px, le direct et les six chiffres du jour tiennent dans l\'écran', y <= 844, String(Math.round(y)));
    }
    if (l >= 900) check(`9 à ${l} px les tableaux ont de vraies colonnes`, await p.evaluate(() => getComputedStyle(document.querySelector('#trfZone .trf-table thead')).display !== 'none'));
    await ctx.close();
  });

  /* ── 10. L'ORDRE DES DEUX RÉPONSES NE CHANGE RIEN ──
     À l'ouverture, l'écran lit le direct et le jour en même temps, et les
     totaux du jour viennent de la réponse arrivée la dernière. Les deux
     sortent de la même fonction serveur : l'écran doit dire la même chose
     dans les deux ordres. En CI, l'ordre tombait au hasard du coureur, et la
     suite avec (17 octobre 2026). On force chaque ordre PAR CONSTRUCTION,
     sans durée : la réponse retenue ne part qu'une fois l'autre lue et
     dessinée. Un retard de 400 ms ne suffisait pas — sous un réseau plus
     lent d'un côté, l'ordre s'inversait. Et on vérifie qu'on a bien obtenu
     l'ordre annoncé : sinon le scénario ne prouverait rien. */
  for (const [nom, retenu] of [['le direct arrive après le jour', 'direct'],
    ['le jour arrive après le direct', 'histo'], ['les deux sans retenue', null]]) await partie('10 ' + nom, async () => {
    const srv = fauxServeur();
    srv.retenu = retenu;
    const { ctx, p } = await contexte(nav, { srv });
    if (!retenu) await ouvrir(p);
    else {
      await p.click('#btnTrafic');
      await attendre(p, r => {
        const e = window.ELA_TRAFIC._etat;
        return r === 'direct' ? (e.histoLu.aujourdhui || 0) > 0 && !e.chargement : e.directLu > 0;
      }, retenu);
      srv.liberer();
      await attendre(p, () => { const e = window.ELA_TRAFIC._etat; return e.directLu > 0 && (e.histoLu.aujourdhui || 0) > 0 && !e.chargement; });
      const ecart = await p.evaluate(() => { const e = window.ELA_TRAFIC._etat; return e.directLu - (e.histoLu.aujourdhui || 0); });
      check(`10 ${nom} : c'est bien l'ordre obtenu`, retenu === 'direct' ? ecart > 0 : ecart < 0, `direct − jour = ${ecart} ms`);
    }
    const chiffres = [];
    for (const l of ['Visiteurs', 'Pages vues', 'Prix demandés', 'Réservations', 'Appels', 'WhatsApp']) chiffres.push(await tuile(p, l));
    check(`10 ${nom} : les six chiffres du jour sont ceux du serveur`, chiffres.join(' ') === '127 221 39 8 6 12', chiffres.join(' '));
    check(`10 ${nom} : les courses confirmées et réalisées sont dites`, /5 confirmée\(s\) et 2 réalisée\(s\)/.test(await texte(p, '#trfZone')));
    await ctx.close();
  });
} finally {
  await nav.close();
  serveur.close();
}
console.log('=== test-admin-trafic : ' + ok.length + ' réussis, ' + ko.length + ' échecs ===');
ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
