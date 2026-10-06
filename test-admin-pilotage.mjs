/* =====================================================================
   TEST-ADMIN-PILOTAGE.MJS — le Pilotage (Issue #197, bloc 1)
   ---------------------------------------------------------------------
   6 octobre 2026. La fondation du cockpit interne : la base (migration
   20261006010000_pilotage.sql, éprouvée sur un vrai PostgreSQL par
   supabase/tests/pilotage*.sql et en HTTP par pilotage-http.mjs) et le
   module de données pilotage.js. Cette suite éprouve ce qui se voit SANS
   base de données, donc partout, à chaque PR :

   1. UNE SEULE LISTE DES DEUX CÔTÉS. Tableaux, étapes, priorités, impacts,
      catégories, limites et champs écrits : pilotage.js et la migration
      doivent dire la même chose. Deux listes qui divergent ne se voient pas,
      jusqu'au jour où l'écran propose ce que la base refuse.
   2. pilotage.js PARLE COMME IL FAUT au serveur : seulement les champs
      permis, jamais l'identifiant, la version ni les dates ; une écriture
      toujours sous condition de version ; rien ne part quand la carte est
      invalide, archivée, inchangée, ou sans session ; aucune suppression.
   3. LE CLOISONNEMENT, SUR LE SITE CONSTRUIT : le module est dans
      /ela-admin/ et dans AUCUNE page publique ; ses notes de travail ne
      partent pas en ligne.
   4. DANS L'ADMIN RÉEL : le module est chargé, il passe par la connexion de
      l'admin (ELA_NUAGE, son jeton), et il n'appelle RIEN au chargement —
      le tableau des courses ne paie pas pour le Pilotage.

   Port 8151, propre à cette suite.
   Lancer :  node test-admin-pilotage.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import './pilotage.js';

const P = globalThis.ELA_PILOTAGE;
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const MIGRATION = 'supabase/migrations/20261006010000_pilotage.sql';
const sql = readFileSync(MIGRATION, 'utf8');
const cles = l => l.map(x => x.cle);
const memes = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const liste = s => [...s.matchAll(/'([a-z0-9_]+)'/gi)].map(m => m[1]);

/* ── 1. UNE SEULE LISTE DES DEUX CÔTÉS ─────────────────────────────── */
{
  const contrainte = nom => (sql.match(new RegExp('constraint ' + nom + ' check \\(([\\s\\S]*?)\\),\\n')) || [, ''])[1];
  check('1 les tableaux sont les mêmes', memes(cles(P.TABLEAUX), liste(contrainte('pilotage_cartes_tableau'))),
    cles(P.TABLEAUX) + ' / ' + liste(contrainte('pilotage_cartes_tableau')));
  check('1 les étapes sont les mêmes, dans le même ordre', JSON.stringify(cles(P.STATUTS)) === JSON.stringify(liste(contrainte('pilotage_cartes_statut'))),
    cles(P.STATUTS) + ' / ' + liste(contrainte('pilotage_cartes_statut')));
  check('1 les priorités sont les mêmes', memes(cles(P.PRIORITES), liste(contrainte('pilotage_cartes_priorite'))));
  check('1 les impacts sont les mêmes', memes(cles(P.IMPACTS), liste(contrainte('pilotage_cartes_impacts')).filter(x => x !== 'text')));
  const fonction = (sql.match(/function public\.pilotage_categorie_valide[\s\S]*?\$\$;/) || [''])[0];
  for (const t of ['produit', 'operations']) {
    const base = liste((fonction.match(new RegExp("when '" + t + "' then p_categorie in \\(([\\s\\S]*?)\\)")) || [, ''])[1]);
    check(`1 les catégories « ${t} » sont les mêmes`, base.length > 0 && memes(cles(P.CATEGORIES[t]), base),
      cles(P.CATEGORIES[t]) + ' / ' + base);
  }
  check('1 « lancement » n\'est une catégorie nulle part', !/lancement/.test(fonction)
    && !Object.values(P.CATEGORIES).flat().some(c => c.cle === 'lancement'));
  const borne = (nom, re) => Number((contrainte(nom).match(re) || [])[1]);
  const L = P.LIMITES;
  check('1 les bornes du titre sont les mêmes', borne('pilotage_cartes_titre', /between (\d+)/) === L.titreMin
    && borne('pilotage_cartes_titre', /and (\d+) and/) === L.titreMax);
  check('1 la borne de la description est la même', borne('pilotage_cartes_description', /<= (\d+)/) === L.description);
  check('1 la borne du responsable est la même', borne('pilotage_cartes_responsable', /between 1 and (\d+)/) === L.responsable);
  check('1 la borne de la prochaine action est la même', borne('pilotage_cartes_prochaine_action', /between 1 and (\d+)/) === L.prochaineAction);
  check('1 les bornes de la raison sont les mêmes', borne('pilotage_cartes_blocage', /between (\d+)/) === L.raisonMin
    && borne('pilotage_cartes_blocage', /between \d+ and (\d+)/) === L.raisonMax);
  check('1 la borne des dépendances est la même', borne('pilotage_cartes_dependances', /<= (\d+)/) === L.dependances);
  check('1 les bornes de la checklist sont les mêmes', Number((sql.match(/jsonb_array_length\(p\) > (\d+)/) || [])[1]) === L.criteres
    && Number((sql.match(/not between 1 and (\d+) then return false/) || [])[1]) === L.critere);
  const accordes = cmd => ((sql.match(new RegExp('grant ' + cmd + ' \\(([\\s\\S]*?)\\)\\s*on public\\.pilotage_cartes')) || [, ''])[1])
    .split(',').map(s => s.trim()).filter(Boolean);
  check('1 pilotage.js n\'écrit à la création que ce que la base accorde', memes(P.CHAMPS_CREATION, accordes('insert')),
    P.CHAMPS_CREATION + ' / ' + accordes('insert'));
  check('1 pilotage.js n\'écrit en modification que ce que la base accorde', memes(P.CHAMPS_MODIFICATION, accordes('update')),
    P.CHAMPS_MODIFICATION + ' / ' + accordes('update'));
  for (const interdit of ['id', 'version', 'cree_le', 'modifie_le', 'archivee_le', 'termine_le'])
    check(`1 « ${interdit} » ne part jamais du navigateur`, !P.CHAMPS_MODIFICATION.includes(interdit) && !accordes('update').includes(interdit));
  const code = sql.replace(/--.*$/gm, '');
  check('1 la base n\'accorde aucune suppression', !/grant[^;]*\bdelete\b[^;]*pilotage/i.test(code) && !/for delete/i.test(code));
}

/* ── 2. CE QUE pilotage.js ENVOIE ─────────────────────────────────── */
function fausseConnexion(reponses = [], connecte = true) {
  const appels = [];
  return { appels, connecte: () => connecte,
    appel(chemin, options = {}) {
      appels.push({ chemin, methode: options.method || 'GET', corps: options.body ? JSON.parse(options.body) : null, entetes: options.headers || {} });
      const r = reponses.shift();
      return r instanceof Error ? Promise.reject(r) : Promise.resolve(r === undefined ? [] : r);
    } };
}
const ID = '4b7be2f6-1feb-4ec9-b2bd-205507e4f807';
const CARTE = { id: ID, version: 3, tableau: 'produit', categorie: 'admin', titre: 'Carte', statut: 'en_cours', priorite: 'P1',
  description: '', responsable: null, prochaine_action: null, impacts: [], echeance: null, bloque: false, raison_blocage: null,
  dependances: [], checklist: [{ texte: 'Vérifié en production', fait: false }], lien_github: null, archivee: false };
const codeDe = async p => { try { await p; return 'ok'; } catch (e) { return e.code || e.message; } };
{
  let c = fausseConnexion([[]]);
  await P.client(c).lister();
  check('2 la liste ne lit que les cartes actives, la plus pressante d\'abord',
    c.appels.length === 1 && c.appels[0].methode === 'GET' && /^\/rest\/v1\/pilotage_cartes\?select=\*&archivee=is\.false&order=priorite\.asc/.test(c.appels[0].chemin),
    c.appels[0] && c.appels[0].chemin);
  c = fausseConnexion([[]]);
  await P.client(c).lister({ archives: true });
  check('2 les archives se lisent à part', /archivee=is\.true/.test(c.appels[0].chemin));

  c = fausseConnexion([[{ ...CARTE }]]);
  await P.client(c).creer({ id: 'pirate', version: 9, cree_le: '2020-01-01', archivee: true, termine_le: 'x',
    tableau: 'produit', titre: '  Nouvelle carte  ', impacts: ['ca', 'ca'], inconnu: 1 });
  const corps = c.appels[0] && c.appels[0].corps;
  check('2 créer : POST avec la carte rendue par le serveur', c.appels[0].methode === 'POST'
    && c.appels[0].entetes.Prefer === 'return=representation' && c.appels[0].chemin.startsWith('/rest/v1/pilotage_cartes'));
  check('2 créer : ni identifiant, ni version, ni dates, ni archivage, ni champ inconnu', corps
    && Object.keys(corps).every(k => P.CHAMPS_CREATION.includes(k)), JSON.stringify(corps));
  check('2 créer : la carte part nettoyée', corps && corps.titre === 'Nouvelle carte' && corps.impacts.join() === 'ca');

  c = fausseConnexion();
  check('2 créer une carte invalide : rien ne part', await codeDe(P.client(c).creer({ tableau: 'produit', titre: 'ab' })) === 'invalide'
    && c.appels.length === 0);
  c = fausseConnexion([], false);
  check('2 sans session : rien ne part, et on le dit', await codeDe(P.client(c).lister()) === 'session' && c.appels.length === 0);

  c = fausseConnexion([[{ ...CARTE, version: 4, priorite: 'P0' }]]);
  const modifiee = await P.client(c).modifier(CARTE, { priorite: 'P0', version: 99, cree_le: 'x', id: 'autre' });
  check('2 modifier : PATCH sous condition de version', c.appels[0].methode === 'PATCH'
    && c.appels[0].chemin === `/rest/v1/pilotage_cartes?select=*&id=eq.${ID}&version=eq.3`, c.appels[0].chemin);
  check('2 modifier : seul le changement part', JSON.stringify(c.appels[0].corps) === '{"priorite":"P0"}', JSON.stringify(c.appels[0].corps));
  check('2 modifier : la carte rendue est celle du serveur', modifiee.version === 4);

  c = fausseConnexion();
  await P.client(c).modifier(CARTE, {});
  check('2 modifier sans changement : rien ne part', c.appels.length === 0);
  c = fausseConnexion();
  check('2 terminer avec un critère ouvert : rien ne part', await codeDe(P.client(c).deplacer(CARTE, 'termine')) === 'invalide' && c.appels.length === 0);
  c = fausseConnexion();
  check('2 bloquer sans raison : rien ne part', await codeDe(P.client(c).bloquer(CARTE, '  ')) === 'invalide' && c.appels.length === 0);
  c = fausseConnexion([[{ ...CARTE, version: 4, bloque: true, raison_blocage: 'Attente hôtel' }]]);
  await P.client(c).bloquer(CARTE, ' Attente hôtel ');
  check('2 bloquer : la raison part nettoyée', JSON.stringify(c.appels[0].corps) === '{"bloque":true,"raison_blocage":"Attente hôtel"}');
  c = fausseConnexion([[{ ...CARTE, version: 4 }]]);
  await P.client(c).debloquer({ ...CARTE, bloque: true, raison_blocage: 'Attente hôtel' });
  check('2 débloquer efface la raison', JSON.stringify(c.appels[0].corps) === '{"bloque":false,"raison_blocage":null}');
  c = fausseConnexion();
  check('2 une archivée ne se modifie pas : rien ne part',
    await codeDe(P.client(c).modifier({ ...CARTE, archivee: true }, { titre: 'Retouche' })) === 'archivee' && c.appels.length === 0);
  c = fausseConnexion([[{ ...CARTE, version: 4, archivee: false }]]);
  await P.client(c).restaurer({ ...CARTE, archivee: true });
  check('2 restaurer : seul « archivee » part', JSON.stringify(c.appels[0].corps) === '{"archivee":false}');

  c = fausseConnexion([[], [{ ...CARTE, version: 5, priorite: 'P0' }]]);
  let conflit = null;
  try { await P.client(c).modifier(CARTE, { priorite: 'P3' }); } catch (e) { conflit = e; }
  check('2 une version dépassée : conflit, et la version du serveur est rendue',
    conflit && conflit.code === 'conflit' && conflit.serveur.version === 5 && c.appels[1].chemin.includes(`id=eq.${ID}`));
  c = fausseConnexion([[], []]);
  check('2 une carte invisible (accès retiré) : « introuvable », pas un conflit',
    await codeDe(P.client(c).modifier(CARTE, { priorite: 'P3' })) === 'introuvable');
  c = fausseConnexion([[]]);
  await P.client(c).journal(ID);
  check('2 le journal se lit pour UNE carte, le plus récent d\'abord',
    c.appels[0].chemin === `/rest/v1/pilotage_journal?select=*&carte_id=eq.${ID}&order=id.desc`);
  c = fausseConnexion();
  check('2 un identifiant qui n\'en est pas un ne part pas dans l\'adresse',
    await codeDe(P.client(c).journal('1&or=(id.gt.0)')) === 'introuvable' && c.appels.length === 0);

  const cli = P.client(fausseConnexion());
  check('2 aucune fonction de suppression', !Object.keys(cli).some(k => /suppr|delete|effac|purg/i.test(k)));
  const source = readFileSync('pilotage.js', 'utf8');
  /* Un motif par ligne : « Contrôle sécurité » (CI) refuse toute ligne où
     le nom du rôle de service précède une clé secrète — y compris dans un
     test qui vérifie justement leur absence. */
  const interdits = [
    /service_role/i,
    /sb_secret_/i,
    /ghp_|github_pat_/i,
    /api\.github\.com/i,
  ];
  check('2 aucune méthode DELETE, aucune clé de service, aucun jeton GitHub dans pilotage.js',
    !/["']DELETE["']/.test(source) && !interdits.some(re => re.test(source)));
  check('2 pilotage.js ne touche ni aux courses ni à la sauvegarde locale',
    !/\/rest\/v1\/courses|ela_bookings|localStorage|sessionStorage/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')));

  for (const [message, attendu] of [['nuage 401', 'acces'], ['nuage 403', 'acces'], ['nuage 400', 'refuse'], ['nuage 409', 'refuse'],
    ['nuage 503', 'serveur'], ['session expiree', 'session'], ['renouvellement impossible', 'serveur'], ['Failed to fetch', 'reseau']])
    check(`2 « ${message} » se dit « ${attendu} »`, P.traduireErreur(new Error(message)).code === attendu);

  check('2 en retard : échéance passée', P.enRetard({ echeance: '2026-10-05', statut: 'en_cours' }, '2026-10-06'));
  check('2 pas en retard le jour même', !P.enRetard({ echeance: '2026-10-06', statut: 'en_cours' }, '2026-10-06'));
  check('2 jamais en retard une fois terminée ou archivée', !P.enRetard({ echeance: '2026-10-01', statut: 'termine' }, '2026-10-06')
    && !P.enRetard({ echeance: '2026-10-01', statut: 'a_faire', archivee: true }, '2026-10-06'));
  check('2 le jour se compose en local, pas en UTC', P.dateLocale(new Date(2026, 9, 7, 0, 30)) === '2026-10-07');
}

/* ── 3. LE CLOISONNEMENT, SUR LE SITE CONSTRUIT ───────────────────── */
execSync('sh construire.sh', { stdio: 'ignore' });
{
  check('3 le module est publié', existsSync('site/pilotage.js'));
  const admin = readFileSync('site/ela-admin/index.html', 'utf8');
  check('3 l\'admin le charge', /<script src="pilotage\.js"><\/script>/.test(admin));
  for (const page of ['site/index.html', 'site/application.html', 'site/easyhotel-reception/index.html',
    'site/reception/easyhotel-aeroville/index.html', 'site/exploitant/index.html', 'site/easyhotel-client/index.html',
    'site/admin.html', 'site/admin-v2.html', 'site/chauffeur-prive-paris.html', 'site/transfert-cdg-paris.html']) {
    if (!existsSync(page)) { check(`3 ${page} existe`, false); continue; }
    const html = readFileSync(page, 'utf8');
    check(`3 ${page.replace('site/', '/')} ne porte rien du Pilotage`, !/pilotage/i.test(html));
  }
  const publie = existsSync('site/pilotage.js') ? readFileSync('site/pilotage.js', 'utf8') : '/* absent */';
  check('3 ses notes de travail ne partent pas en ligne', !publie.includes('/*') && !publie.includes('LA BASE EST LA SEULE AUTORITÉ'));
  /* Le module publié est le même, moins ses notes : on le charge et on
     compare ses verdicts à ceux du dépôt. Un nettoyage qui casserait une
     expression régulière changerait un verdict. */
  const avant = globalThis.ELA_PILOTAGE;
  delete globalThis.ELA_PILOTAGE;
  try { new Function(publie)(); } catch (e) { /* module publié illisible : le contrôle suivant le dira */ }
  const Q = globalThis.ELA_PILOTAGE;
  globalThis.ELA_PILOTAGE = avant;
  const cas = [{ tableau: 'produit', titre: 'ok carte' }, { tableau: 'produit', titre: 'ab' },
    { tableau: 'produit', titre: 'Lien', lien_github: 'https://github.com/Barbaros911/As-mine/issues/1' },
    { tableau: 'produit', titre: 'Lien', lien_github: 'http://github.com/Barbaros911/As-mine/issues/1' },
    { tableau: 'produit', titre: 'Deux\nlignes' }, { tableau: 'operations', categorie: 'societe', statut: 'termine', titre: 'Fin',
      checklist: [{ texte: 'a', fait: false }] }];
  check('3 le module publié rend les mêmes verdicts que le dépôt', !!Q && cas.every(x =>
    JSON.stringify(Q.valider(x)) === JSON.stringify(P.valider(x))));
}

/* ── 4. DANS L'ADMIN RÉEL ─────────────────────────────────────────── */
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
await new Promise(r => serveur.listen(8151, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8151';
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = { access_token: 'JETON-ADMIN', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };
const nav = await chromium.launch();
try {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    localStorage.setItem('ela_acces_verifie', session.user.id);
    localStorage.setItem('ela_bookings', '[]');
  }, { session: SESSION });
  const pilotage = [], courses = [];
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rest/v1/pilotage_')) {
      pilotage.push({ url: u, methode: req.method(), auth: req.headers()['authorization'] || '' });
      return route.fulfill(J([]));
    }
    if (u.includes('/rest/v1/courses')) courses.push(u);
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J({ sans_alerte: 0, relance_active: true, derniere_relance_s: 5,
      relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 1, demandes_24h: 0 }));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    return route.fulfill(J([]));
  });
  const erreurs = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  check('4 l\'admin s\'ouvre comme avant (tableau de bord des courses)', await p.evaluate(() =>
    document.body.classList.contains('espace') && !!document.getElementById('ecran-bord')));
  check('4 le tableau des courses a bien interrogé le serveur', courses.length > 0, String(courses.length));
  check('4 le module est chargé dans l\'admin', await p.evaluate(() => !!window.ELA_PILOTAGE && typeof window.ELA_PILOTAGE.client === 'function'));
  check('4 RIEN n\'est demandé au Pilotage au chargement', pilotage.length === 0, pilotage.map(x => x.url).join(' '));
  const lu = await p.evaluate(() => window.ELA_PILOTAGE.client(window.ELA_NUAGE).lister().then(r => Array.isArray(r), e => 'erreur ' + e.code));
  check('4 sur demande, il lit par la connexion de l\'admin', lu === true && pilotage.length === 1
    && pilotage[0].methode === 'GET' && /\/rest\/v1\/pilotage_cartes\?select=\*&archivee=is\.false/.test(pilotage[0].url), JSON.stringify(pilotage));
  check('4 …avec le jeton de la session, jamais une clé de service', pilotage[0] && pilotage[0].auth === 'Bearer JETON-ADMIN');
  check('4 aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  const pub = await nav.newContext();
  const pp = await pub.newPage();
  await pp.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await pp.goto(BASE + '/');
  check('4 la page publique ne connaît pas le Pilotage', await pp.evaluate(() => typeof window.ELA_PILOTAGE === 'undefined'));
  await pub.close();
} catch (e) {
  check('la suite s\'est déroulée jusqu\'au bout', false, e.stack || String(e));
} finally {
  await nav.close();
  serveur.close();
}

console.log(ok.map(n => '  ok  ' + n).join('\n'));
if (ko.length) {
  console.log('\n=== ÉCHECS (' + ko.length + ') ===\n' + ko.map(n => '  KO  ' + n).join('\n'));
  process.exit(1);
}
console.log(`\n=== PILOTAGE (admin) : ${ok.length} contrôles au vert ===`);
