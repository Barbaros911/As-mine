/* =====================================================================
   TEST-ADMIN-PROSPECTS.MJS — l'écran « Prospects » de l'admin
   (démo professionnels, bloc 5)
   ---------------------------------------------------------------------
   8 octobre 2026. Sur le SITE CONSTRUIT (/ela-admin/), contre un faux
   serveur qui se comporte comme PostgREST devant la table « prospects »
   (20261008000000_prospects.sql) : il refuse en 401 une colonne non
   accordée en lecture, et en 403 toute écriture qui n'est pas « statut »
   ou « note ». Les droits eux-mêmes sont éprouvés sur une vraie base par
   supabase/tests/prospects*.sql ; ici on éprouve CE QUE VOIT ET FAIT
   Barbaros :

   1. Rien n'est demandé au chargement de l'admin ; l'entrée du menu ouvre
      l'écran, qui lit UNE fois, les seules colonnes accordées.
   2. La liste : du plus récent au plus ancien, tout ce qu'il faut pour
      rappeler (tel:, WhatsApp vers SON numéro, mailto:), e-mail confirmé,
      démo ouverte, et la pastille interne « adresse pro / grand public ».
   3. Un établissement piégé reste du texte.
   4. Filtres, « Nouveaux » en tête.
   5. Seuls statut et note partent, et seulement ce qui a changé.
   6. Une erreur est DITE — jamais une liste vide qui ressemble à « aucun
      prospect ».
   7. L'agent ne voit ni l'entrée ni l'écran.
   8. Aucune page publique ne porte l'écran.
   9. 320, 390, 1366 px : rien ne déborde, tout se touche du pouce.

   Port 8164, propre à cette suite. Lancer : node test-admin-prospects.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

/* Les colonnes que la migration accorde en lecture : relues dans la
   migration elle-même, pas recopiées — recopiées, elles déplaceraient la
   faute dans le test. */
const migration = readFileSync('supabase/migrations/20261008000000_prospects.sql', 'utf8');
const ACCORDEES = /grant select \(([^)]*)\)\s*on table public\.prospects/i.exec(migration)[1]
  .split(',').map(s => s.trim()).filter(Boolean);
/* Le prénom (9 octobre 2026) est accordé par sa propre migration : relu là
   aussi, et ajouté aux colonnes que l'écran a le droit de demander. */
const migPrenom = readFileSync('supabase/migrations/20261009010000_prospects_prenom.sql', 'utf8');
for (const m of migPrenom.matchAll(/grant select \(([^)]*)\)\s*on table public\.prospects\s+to authenticated/gi))
  for (const c of m[1].split(',').map(x => x.trim()).filter(Boolean)) if (!ACCORDEES.includes(c)) ACCORDEES.push(c);
const ECRITES = /grant update \(([^)]*)\)\s*on table public\.prospects/i.exec(migration)[1]
  .split(',').map(s => s.trim());

/* ── 0. CE QUE LE SOURCE NE DOIT JAMAIS FAIRE ───────────────────────── */
{
  const src = readFileSync('prospects.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('0 aucun innerHTML (tout texte en textContent)', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
  check('0 aucune suppression', !/["']DELETE["']|method:\s*["']delete["']/i.test(src));
  check('0 rien en tâche de fond, rien sur l\'appareil', !/setInterval|localStorage|sessionStorage/.test(src));
  check('0 la migration accorde bien statut et note, et rien d\'autre en écriture', ECRITES.join(',') === 'statut,note', ECRITES.join(','));
}

/* ── LE SITE CONSTRUIT ─────────────────────────────────────────────── */
execSync('sh construire.sh', { stdio: 'ignore' });
{
  const admin = readFileSync('site/ela-admin/index.html', 'utf8');
  check('1 l\'admin charge l\'écran et sa feuille', /<script src="prospects\.js"><\/script>/.test(admin)
    && /<link rel="stylesheet" href="prospects\.css">/.test(admin) && admin.includes('id="ecran-prospects"')
    && admin.includes('id="btnProspects"'));
  /* Toute page HTML publiée hors de l'admin : l'accueil, le flyer, la
     réception, la page cliente de l'hôtel, les pages de service. */
  const publiques = ['site/index.html', 'site/application.html', 'site/easyhotel-reception/index.html',
    'site/easyhotel-client/index.html', ...readdirSync('site').filter(f => f.endsWith('.html')
      && !['admin.html', 'admin-v2.html'].includes(f)).map(f => 'site/' + f)];
  if (existsSync('site/reception')) for (const d of readdirSync('site/reception'))
    if (existsSync(`site/reception/${d}/index.html`)) publiques.push(`site/reception/${d}/index.html`);
  const fuites = [];
  for (const f of new Set(publiques)) {
    const h = readFileSync(f, 'utf8');
    for (const m of ['prospects.js', 'prospects.css', 'ecran-prospects', 'btnProspects', 'ELA_PROSPECTS', '/rest/v1/prospects', 'prsZone'])
      if (h.includes(m)) fuites.push(`${f} : ${m}`);
  }
  check('8 aucune page publique ne porte l\'écran, son entrée ni ses fichiers', fuites.length === 0, fuites.join(' · '));
  const pub = readFileSync('site/prospects.js', 'utf8');
  check('8 le fichier publié n\'emporte pas ses notes de travail', !/\/\*[\s\S]*?LA BASE EST LA SEULE AUTORITÉ/.test(pub));
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
await new Promise(r => serveur.listen(8164, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8164';
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = { access_token: 'JETON-ADMIN', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };

/* ═══ LES FAUX PROSPECTS ═══ Volontairement dans le désordre : c'est le
   serveur qui trie, sur demande. */
const ID = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function prospects() {
  return [
    { id: ID(2), cree_le: '2026-10-07T09:15:00Z', type: 'agence', etablissement: 'Voyages Lumière', nom: 'Claire Dubois',
      fonction: null, email: 'claire.dubois@gmail.com', telephone: '+33698765432', langue: 'fr', domaine_pro: false,
      email_confirme_le: null, demo_ouverte_le: null, derniere_visite_le: null, nb_visites: 0, statut: 'contacte',
      note: 'Rappeler jeudi', dernier_contact_le: '2026-10-07T10:00:00Z' },
    { id: ID(1), cree_le: '2026-10-08T12:02:00Z', type: 'hotel', etablissement: 'Hôtel des Lilas', prenom: 'Marc', nom: 'Lefèvre',
      fonction: 'Directeur', email: 'direction@hotel-lilas.fr', telephone: '+33612345678', langue: 'fr', domaine_pro: true,
      email_confirme_le: '2026-10-08T12:10:00Z', demo_ouverte_le: '2026-10-08T12:03:00Z', derniere_visite_le: '2026-10-08T15:40:00Z',
      nb_visites: 3, statut: 'nouveau', note: null, dernier_contact_le: '2026-10-08T15:40:00Z' },
    { id: ID(3), cree_le: '2026-10-05T18:30:00Z', type: 'entreprise', etablissement: '<img src=x onerror="window.__xss=1">Société <b>Piège</b>',
      nom: '<script>window.__xss=2</script>Nina', fonction: 'Office manager', email: 'nina@piege.example', telephone: '+447911123456',
      langue: 'en', domaine_pro: true, email_confirme_le: null, demo_ouverte_le: '2026-10-05T18:31:00Z',
      derniere_visite_le: '2026-10-05T18:31:00Z', nb_visites: 1, statut: 'nouveau', note: null, dernier_contact_le: '2026-10-05T18:31:00Z' },
    { id: ID(4), cree_le: '2026-10-01T08:00:00Z', type: 'hotel', etablissement: 'Hôtel du Parc', nom: 'Paul Martin',
      fonction: 'Réception', email: 'direction@hotel-lilas.fr', telephone: '+33611112222', langue: 'fr', domaine_pro: true,
      email_confirme_le: '2026-10-01T08:05:00Z', demo_ouverte_le: null, derniere_visite_le: null, nb_visites: 0,
      statut: 'partenaire', note: null, dernier_contact_le: '2026-10-02T08:00:00Z' },
  ];
}

/* ═══ LE FAUX SERVEUR ═══ Comme PostgREST devant la table : une colonne non
   accordée en lecture → 401 (« permission denied for table ») ; une écriture
   sur autre chose que statut/note → 403. */
function fauxServeur() {
  const s = { lignes: prospects(), requetes: [], mode: 'normal', patchMode: 'normal' };
  s.repondre = (route) => {
    const req = route.request(), u = new URL(req.url()), q = u.searchParams, m = req.method();
    const corps = req.postData() ? JSON.parse(req.postData()) : null;
    s.requetes.push({ m, url: req.url(), corps, auth: req.headers()['authorization'] || '', prefer: req.headers()['prefer'] || '' });
    if (m === 'GET') {
      if (s.mode === 'panne') return route.fulfill(J({ message: 'panne' }, 500));
      if (s.mode === 'refus') return route.fulfill(J({ message: 'permission denied' }, 403));
      if (s.mode === 'reseau') return route.abort();
      if (s.mode === 'illisible') return route.fulfill(J({ pas: 'une liste' }));
      if (s.mode === 'vide') return route.fulfill(J([]));
      if (s.mode === 'expire') return route.fulfill(J({ message: 'JWT expired' }, 401));
      const cols = (q.get('select') || '*').split(',');
      /* Base pas encore migrée : PostgREST refuse la colonne inconnue (400). */
      if (s.mode === 'sansPrenom' && cols.includes('prenom'))
        return route.fulfill(J({ code: '42703', message: 'column prospects.prenom does not exist' }, 400));
      if (cols.some(c => !ACCORDEES.includes(c))) return route.fulfill(J({ message: 'permission denied' }, 401));
      let l = s.lignes.slice();
      if (q.get('order') === 'cree_le.desc') l.sort((a, b) => b.cree_le.localeCompare(a.cree_le));
      return route.fulfill(J(l.map(p => Object.fromEntries(cols.map(c => [c, p[c]])))));
    }
    if (m === 'PATCH') {
      if (s.patchMode === 'panne') return route.fulfill(J({ message: 'panne' }, 503));
      if (s.mode === 'sansPrenom' && (q.get('select') || '').split(',').includes('prenom'))
        return route.fulfill(J({ code: '42703', message: 'column prospects.prenom does not exist' }, 400));
      if (!corps || Object.keys(corps).some(k => !ECRITES.includes(k))) return route.fulfill(J({ message: 'permission denied' }, 403));
      const id = (q.get('id') || '').replace('eq.', '');
      const p = s.lignes.find(x => x.id === id);
      if (!p) return route.fulfill(J([]));
      Object.assign(p, corps);
      if (typeof p.note === 'string') p.note = p.note.trim() || null;
      return route.fulfill(J([p]));
    }
    return route.fulfill(J({ message: 'méthode refusée' }, 405));
  };
  s.lectures = () => s.requetes.filter(r => r.m === 'GET');
  s.ecritures = () => s.requetes.filter(r => r.m !== 'GET');
  return s;
}

async function contexte(nav, { role = 'admin', largeur = 390, hauteur = 844, srv, tokenRefuse = false, sansScript = false }) {
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
    if (u.includes('/rest/v1/prospects')) return srv.repondre(route);
    if (u.includes('/auth/v1/token')) return tokenRefuse ? route.fulfill(J({ error: 'invalid_grant' }, 400)) : route.fulfill(J(SESSION));
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/est_admin')) return route.fulfill(J(role === 'admin'));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J(role));
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J({ sans_alerte: 0, relance_active: true, derniere_relance_s: 5,
      relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 1, demandes_24h: 0 }));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    return route.fulfill(J([]));
  });
  if (sansScript) await ctx.route('**/prospects.js', r => r.abort());
  const p = await ctx.newPage();
  /* Un élément absent fait tomber le contrôle qui le cherche, pas toute la
     suite au bout de trente secondes. */
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
  await p.click('#btnProspects');
  await p.waitForFunction(() => {
    const r = document.querySelector('#prsZone .prs-resume');
    return r && !/Lecture/.test(r.textContent);
  }, null, { timeout: 6000 }).catch(() => {});
}
const carteDe = (p, n) => p.locator(`.prs-carte[data-id="${ID(n)}"]`);
async function deborde(p) {
  return p.evaluate(() => {
    const L = document.documentElement.clientWidth, fautes = [];
    if (document.documentElement.scrollWidth > L) fautes.push('page ' + document.documentElement.scrollWidth + '>' + L);
    document.querySelectorAll('#ecran-prospects *').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width && (r.right > L + 0.5 || r.left < -0.5)) fautes.push((e.className || e.tagName) + ' [' + Math.round(r.left) + '→' + Math.round(r.right) + ']');
    });
    return fautes.slice(0, 5);
  });
}
async function petitsBoutons(p) {
  return p.evaluate(() => [...document.querySelectorAll('#ecran-prospects button, #ecran-prospects a, #ecran-prospects select')]
    .filter(e => e.getBoundingClientRect().width)
    .filter(e => e.getBoundingClientRect().height < 43.5)
    .map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)));
}

/* Un plantage au milieu d'une partie la fait tomber EN LE NOMMANT, et les
   parties suivantes tournent quand même. */
async function partie(nom, fn) {
  try { await fn(); } catch (e) { ko.push(`${nom} — plantage : ${String(e && e.message || e).split('\n')[0]}`); }
}

const nav = await chromium.launch();
try {
  await partie('1 à 6', async () => {
  /* ── 1. L'ENTRÉE ─────────────────────────────────────────────────── */
  const srv = fauxServeur();
  const { ctx, p, erreurs } = await contexte(nav, { srv });
  check('1 l\'admin s\'ouvre sur le tableau de bord des courses', await p.evaluate(() =>
    document.getElementById('ecran-bord').classList.contains('actif')));
  check('1 RIEN n\'est demandé aux prospects au chargement de l\'admin', srv.requetes.length === 0, srv.requetes.map(r => r.url).join(' '));
  check('1 l\'entrée « Prospects » est dans le menu, visible', await p.locator('#btnProspects').isVisible()
    && (await texte(p, '#btnProspects')).includes('Prospects'));
  await ouvrir(p);
  check('1 elle ouvre l\'écran et allume son entrée', await p.evaluate(() =>
    document.getElementById('ecran-prospects').classList.contains('actif')
    && document.getElementById('btnProspects').classList.contains('actif')));
  const l0 = srv.lectures();
  const sel0 = l0[0] ? new URL(l0[0].url).searchParams.get('select').split(',') : [];
  check('1 il lit UNE fois, avec le jeton de la session', l0.length === 1 && l0[0].auth === 'Bearer JETON-ADMIN', String(l0.length));
  check('1 il ne demande QUE des colonnes accordées, et toutes', sel0.length === ACCORDEES.length && sel0.every(c => ACCORDEES.includes(c)), sel0.join(','));
  check('1 il demande le plus récent d\'abord', l0[0] && new URL(l0[0].url).searchParams.get('order') === 'cree_le.desc');

  /* ── 2. LA LISTE ─────────────────────────────────────────────────── */
  const ordre = await p.$$eval('.prs-carte', l => l.map(c => c.dataset.id));
  check('2 une carte par prospect, du plus récent au plus ancien', ordre.join(',') === [1, 2, 3, 4].map(ID).join(','), ordre.join(','));
  const c1 = carteDe(p, 1);
  const t1 = await c1.innerText();
  check('2 établissement, type, nom et fonction', t1.includes('Hôtel des Lilas') && t1.includes('Hôtel')
    && t1.includes('Marc Lefèvre · Directeur'), t1.slice(0, 120));
  check('2 le téléphone se compose (tel:) et se lit en clair',
    await c1.locator('a.prs-tel').getAttribute('href') === 'tel:+33612345678' && t1.includes('+33 6 12 34 56 78'));
  check('2 WhatsApp vers SON numéro, dans un nouvel onglet',
    await c1.locator('a.prs-wa').getAttribute('href') === 'https://wa.me/33612345678'
    && await c1.locator('a.prs-wa').getAttribute('target') === '_blank'
    && /noopener/.test(await c1.locator('a.prs-wa').getAttribute('rel')));
  check('2 l\'e-mail s\'écrit (mailto:)', await c1.locator('a.prs-mail').getAttribute('href') === 'mailto:direction@hotel-lilas.fr');
  check('2 la date de la demande, à l\'heure de Paris', t1.includes('08/10/2026 à 14:02'), t1);
  check('2 e-mail confirmé : oui, avec sa date', /E-mail confirmé\s*oui, le 08\/10\/2026 à 14:10/.test(t1));
  check('2 démo : première ouverture, nombre de visites, dernière visite',
    /ouverte le 08\/10\/2026 à 14:03 · 3 visites/.test(t1) && /Dernière visite\s*08\/10\/2026 à 17:40/.test(t1));
  check('2 pastille « Adresse pro »', (await c1.locator('.prs-pastille.prs-pro').innerText()) === 'Adresse pro');
  const t2 = await carteDe(p, 2).innerText();
  check('2 pastille « Grand public », e-mail non confirmé, démo jamais ouverte',
    (await carteDe(p, 2).locator('.prs-pastille.prs-gp').count()) === 1
    && /E-mail confirmé\s*non/.test(t2) && /Démo\s*jamais ouverte/.test(t2));
  check('2 deux demandes à la même adresse se signalent', /Même adresse\s*1 autre demande/.test(await carteDe(p, 4).innerText()));
  check('2 le statut et la note de la base sont repris', await carteDe(p, 2).locator('select').inputValue() === 'contacte'
    && await carteDe(p, 2).locator('textarea').inputValue() === 'Rappeler jeudi');
  check('2 les cinq statuts, avec leurs libellés', (await c1.locator('select option').allInnerTexts()).join('|')
    === 'Nouveau|Contacté|Rendez-vous|Partenaire|Sans suite');
  check('2 aucun bouton de suppression', await p.locator('#ecran-prospects').getByText(/supprim/i).count() === 0);

  /* ── 3. LE PIÈGE ─────────────────────────────────────────────────── */
  const c3 = carteDe(p, 3);
  check('3 l\'établissement piégé s\'affiche en TEXTE, chevrons compris',
    (await c3.locator('.prs-etab').innerText()) === '<img src=x onerror="window.__xss=1">Société <b>Piège</b>');
  check('3 le nom piégé aussi', (await c3.locator('.prs-qui').innerText()).startsWith('<script>window.__xss=2</script>Nina'));
  check('3 aucune balise n\'est née de la donnée, rien ne s\'est exécuté', await p.evaluate(() =>
    !document.querySelector('#prsZone img, #prsZone b, #prsZone script') && window.__xss === undefined));
  check('3 un numéro étranger garde son lien WhatsApp', await c3.locator('a.prs-wa').getAttribute('href') === 'https://wa.me/447911123456');

  /* ── 4. LES FILTRES ──────────────────────────────────────────────── */
  const filtres = await p.$$eval('.prs-filtre', l => l.map(b => b.dataset.filtre + ':' + b.querySelector('.prs-filtre-nb').textContent));
  check('4 « Nouveaux » est le premier filtre, avec son nombre', filtres[0] === 'nouveau:2', filtres.join(' '));
  check('4 tous les statuts ont leur filtre, avec leur nombre', filtres.join(' ') === 'nouveau:2 tous:4 contacte:1 rendez_vous:0 partenaire:1 sans_suite:0', filtres.join(' '));
  await p.click('.prs-filtre[data-filtre="nouveau"]');
  check('4 « Nouveaux » ne montre que les nouveaux', (await p.$$eval('.prs-carte', l => l.map(c => c.dataset.id))).join(',') === [ID(1), ID(3)].join(','));
  await p.click('.prs-filtre[data-filtre="rendez_vous"]');
  check('4 un filtre sans prospect le dit', (await texte(p, '.prs-vide')).includes('Aucun prospect avec ce statut'));
  check('4 filtrer ne relit pas le serveur', srv.lectures().length === 1);

  /* ── 5. LE STATUT ET LA NOTE ─────────────────────────────────────── */
  await p.click('.prs-filtre[data-filtre="nouveau"]');
  check('5 « Enregistrer » est éteint tant que rien n\'a changé', await c1.locator('.prs-enregistrer').isDisabled());
  await c1.locator('select').selectOption('contacte');
  check('5 une modification non enregistrée se dit', (await c1.locator('.prs-msg').innerText()).includes('non enregistrée'));
  await c1.locator('.prs-enregistrer').click();
  await p.waitForFunction(id => document.querySelector(`.prs-carte[data-id="${id}"] .prs-msg`)?.textContent === 'Enregistré.', ID(1), { timeout: 4000 }).catch(() => {});
  let w = srv.ecritures();
  check('5 le statut seul part, en PATCH sur CE prospect', w.length === 1 && w[0].m === 'PATCH'
    && JSON.stringify(w[0].corps) === '{"statut":"contacte"}' && new URL(w[0].url).searchParams.get('id') === 'eq.' + ID(1)
    && w[0].auth === 'Bearer JETON-ADMIN', JSON.stringify(w.map(x => x.corps)));
  check('5 la réponse est demandée (rien ne s\'enregistre en silence)', /return=representation/.test(w[0]?.prefer || ''));
  check('5 la carte reste sous les yeux sous « Nouveaux », marquée « Enregistré. »',
    await carteDe(p, 1).count() === 1 && (await carteDe(p, 1).locator('.prs-msg').innerText()) === 'Enregistré.');
  check('5 les compteurs suivent', (await p.$eval('.prs-filtre[data-filtre="nouveau"] .prs-filtre-nb', e => e.textContent)) === '1');
  await carteDe(p, 1).locator('textarea').fill('  Rendez-vous lundi 10 h  ');
  await carteDe(p, 1).locator('.prs-enregistrer').click();
  await p.waitForTimeout(400);
  w = srv.ecritures();
  check('5 la note seule part, sans ses espaces', JSON.stringify(w[1]?.corps) === '{"note":"Rendez-vous lundi 10 h"}', JSON.stringify(w[1]?.corps));
  await carteDe(p, 1).locator('textarea').fill('');
  await carteDe(p, 1).locator('select').selectOption('rendez_vous');
  await carteDe(p, 1).locator('.prs-enregistrer').click();
  await p.waitForTimeout(400);
  w = srv.ecritures();
  check('5 statut ET note vidée : les deux partent, la note vide devient null',
    JSON.stringify(w[2]?.corps) === '{"statut":"rendez_vous","note":null}', JSON.stringify(w[2]?.corps));
  check('5 rien d\'autre que statut et note n\'est jamais parti', w.every(r => r.m === 'PATCH' && Object.keys(r.corps).every(k => ECRITES.includes(k))));
  check('5 la note est bornée à 2000 caractères', await carteDe(p, 1).locator('textarea').getAttribute('maxlength') === '2000');
  /* Un brouillon survit à « Actualiser ». */
  await p.click('.prs-filtre[data-filtre="tous"]');
  await carteDe(p, 4).locator('textarea').fill('Contrat à envoyer');
  await p.click('#prsActualiser');
  await p.waitForTimeout(500);
  check('5 « Actualiser » relit le serveur', srv.lectures().length === 2);
  check('5 une note en cours de saisie survit à « Actualiser »', await carteDe(p, 4).locator('textarea').inputValue() === 'Contrat à envoyer'
    && !(await carteDe(p, 4).locator('.prs-enregistrer').isDisabled()));
  /* Une écriture refusée se dit et garde la saisie. */
  srv.patchMode = 'panne';
  await carteDe(p, 4).locator('.prs-enregistrer').click();
  await p.waitForTimeout(500);
  check('5 une écriture en panne se DIT sur la carte, la saisie reste',
    /ne répond pas correctement \(503\)/.test(await carteDe(p, 4).locator('.prs-msg').innerText())
    && await carteDe(p, 4).locator('textarea').inputValue() === 'Contrat à envoyer'
    && !(await carteDe(p, 4).locator('.prs-enregistrer').isDisabled()));
  srv.patchMode = 'normal';
  check('5 aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

  /* ── 6. LES ERREURS SONT DITES ──────────────────────────────────── */
  srv.mode = 'panne';
  await p.click('#prsActualiser');
  await p.waitForTimeout(500);
  check('6 un serveur en panne à l\'actualisation : dit, et la liste précédente reste, signalée comme telle',
    /ne répond pas correctement \(500\)/.test(await texte(p, '.prs-erreur')) && (await texte(p, '.prs-erreur')).includes('dernière lecture réussie')
    && await p.locator('.prs-carte').count() > 0);
  await ctx.close();
  });

  const cas = [
    ['panne', /ne répond pas correctement \(500\)/],
    ['refus', /Accès refusé par le serveur \(403\)/],
    ['reseau', /Serveur injoignable/],
    ['illisible', /illisible/],
  ];
  for (const [mode, attendu] of cas) await partie('6 ' + mode, async () => {
    const s = fauxServeur(); s.mode = mode;
    const c = await contexte(nav, { srv: s });
    await ouvrir(c.p);
    const msg = await texte(c.p, '.prs-erreur');
    check(`6 ${mode} : l'erreur est dite, jamais « aucune demande »`, attendu.test(msg)
      && await c.p.locator('.prs-vide').count() === 0 && await c.p.locator('.prs-carte').count() === 0, msg);
    check(`6 ${mode} : la région d'erreur est annoncée`, await c.p.locator('.prs-erreur[role="alert"]').count() === 1);
    await c.ctx.close();
  });
  await partie('6-7', async () => {
    const s = fauxServeur(); s.mode = 'expire';
    const c = await contexte(nav, { srv: s, tokenRefuse: true });
    await ouvrir(c.p);
    const msg = await texte(c.p, '.prs-erreur');
    check('6 session expirée (renouvellement refusé) : « reconnectez-vous »', /Session expirée/.test(msg) && await c.p.locator('.prs-vide').count() === 0, msg);
    await c.ctx.close();
  });
  /* LA BASE N'A PAS ENCORE LE PRÉNOM : la fusion déploie l'écran avant que
     la migration soit appliquée. L'écran relit sans la colonne, et les
     prospects s'affichent quand même — jamais « accès refusé ». */
  await partie('6-7', async () => {
    const s = fauxServeur(); s.mode = 'sansPrenom';
    for (const l of s.lignes) delete l.prenom;
    s.lignes.find(l => l.id === ID(1)).nom = 'Marc Lefèvre';
    const c = await contexte(nav, { srv: s });
    await ouvrir(c.p);
    const sel = s.lectures().map(r => new URL(r.url).searchParams.get('select'));
    check('6 base sans prénom : la liste s\'affiche quand même, sans erreur',
      await c.p.locator('.prs-carte').count() === 4 && await c.p.locator('.prs-erreur').count() === 0, sel.join(' | '));
    check('6 base sans prénom : une relecture SANS la colonne, une seule',
      sel.length === 2 && sel[0].split(',').includes('prenom') && !sel[1].split(',').includes('prenom'), sel.join(' | '));
    check('6 base sans prénom : le nom complet s\'affiche tel quel',
      (await carteDe(c.p, 1).locator('.prs-qui').innerText()) === 'Marc Lefèvre · Directeur');
    await carteDe(c.p, 1).locator('select').selectOption('contacte');
    await carteDe(c.p, 1).locator('.prs-enregistrer').click();
    await c.p.waitForTimeout(500);
    const w = s.ecritures();
    check('6 base sans prénom : l\'enregistrement ne redemande pas la colonne absente',
      w.length === 1 && !new URL(w[0].url).searchParams.get('select').split(',').includes('prenom'), w.map(x => x.url).join(' '));
    await c.ctx.close();
  });
  await partie('6-7', async () => {
    const s = fauxServeur(); s.mode = 'vide';
    const c = await contexte(nav, { srv: s });
    await ouvrir(c.p);
    check('6 une réponse lue et vide, elle seule, dit « aucune demande »',
      (await texte(c.p, '.prs-vide')).includes('Aucune demande de démo') && await c.p.locator('.prs-erreur').count() === 0);
    await c.ctx.close();
  });
  await partie('6-7', async () => {
    const s = fauxServeur();
    const c = await contexte(nav, { srv: s, sansScript: true });
    await c.p.click('#btnProspects');
    check('6 script absent : l\'écran le dit au lieu de rester vide',
      (await texte(c.p, '#prsZone')).includes('n\'a pas pu se charger') && s.requetes.length === 0);
    await c.ctx.close();
  });

  /* ── 7. L'AGENT ──────────────────────────────────────────────────── */
  await partie('6-7', async () => {
    const s = fauxServeur();
    const c = await contexte(nav, { srv: s, role: 'agent_reservation' });
    await c.p.waitForFunction(() => window.ELA_ROLE === 'agent_reservation', null, { timeout: 5000 }).catch(() => {});
    check('7 l\'agent ne voit pas l\'entrée « Prospects »', !(await c.p.locator('#btnProspects').isVisible()));
    await c.p.evaluate(() => document.getElementById('btnProspects').click());
    await c.p.waitForTimeout(300);
    check('7 un clic forcé n\'ouvre pas l\'écran, et rien n\'est lu', !(await c.p.locator('#ecran-prospects').isVisible()) && s.requetes.length === 0);
    await c.p.evaluate(() => window.ELA_PROSPECTS.ouvrir(document.getElementById('prsZone')));
    await c.p.waitForTimeout(200);
    check('7 même ouvert de force, il ne lit rien et dit que c\'est réservé à l\'administrateur',
      s.requetes.length === 0 && (await c.p.evaluate(() => document.getElementById('prsZone').textContent)).includes('réservés au compte administrateur'));
    await c.ctx.close();
  });

  /* ── 9. LES LARGEURS ─────────────────────────────────────────────── */
  for (const [l, h] of [[320, 700], [390, 844], [1366, 768]]) await partie('9 ' + l + ' px', async () => {
    const s = fauxServeur();
    const c = await contexte(nav, { srv: s, largeur: l, hauteur: h });
    check(`9 ${l} px : l'entrée du menu est visible`, await c.p.locator('#btnProspects').isVisible());
    await ouvrir(c.p);
    await c.p.click('.prs-filtre[data-filtre="tous"]');
    const f = await deborde(c.p);
    check(`9 ${l} px : rien ne déborde`, f.length === 0, f.join(' · '));
    const pb = await petitsBoutons(c.p);
    check(`9 ${l} px : tout ce qui se touche fait 44 px au moins`, pb.length === 0, pb.join(' '));
    if (l === 1366) {
      const colonnes = await c.p.$eval('.prs-liste', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      check('9 1366 px : deux cartes de front, à côté de la colonne du menu', colonnes === 2
        && await c.p.evaluate(() => document.querySelector('.prs-carte').getBoundingClientRect().left
          > document.querySelector('#btnProspects').getBoundingClientRect().right), String(colonnes));
    }
    check(`9 ${l} px : aucune erreur JavaScript`, c.erreurs.length === 0, c.erreurs.join(' | '));
    await c.ctx.close();
  });
} finally {
  await nav.close();
  serveur.close();
}

console.log(ok.map(x => '  ✓ ' + x).join('\n'));
if (ko.length) {
  console.log(`\n=== ÉCHECS (${ko.length}) ===\n` + ko.map(x => '  ✗ ' + x).join('\n'));
  process.exit(1);
}
console.log(`\n=== PROSPECTS DE L'ADMIN : ${ok.length} contrôles au vert ===`);
