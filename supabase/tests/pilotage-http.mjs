/* =====================================================================
   LE PILOTAGE, DE BOUT EN BOUT — pilotage.js → PostgREST → PostgreSQL
   ---------------------------------------------------------------------
   Issue #197, bloc 1 (6 octobre 2026). Les épreuves SQL (pilotage-apres.sql)
   jouent les rôles DANS la base. Celle-ci passe par la porte qu'emprunte le
   navigateur : PostgREST, le serveur que Supabase place devant la base, avec
   de vrais jetons signés. Elle prouve trois choses qu'aucune autre ne voit :

   1. LA PORTE PUBLIQUE EST FERMÉE pour de vrai : sans jeton (la clé du site),
      lire, créer, modifier, supprimer → refusé. Un compte connecté qui n'est
      pas admin lit une liste VIDE et n'écrit rien.
   2. pilotage.js PARLE LA BONNE LANGUE : ses filtres, son en-tête « Prefer »,
      sa condition de version, ses champs. Une faute de syntaxe PostgREST ne
      se voit pas en relisant — elle se voit en appelant.
   3. LE MIROIR DIT VRAI : chaque cas d'un corpus est jugé par valider() ET
      envoyé à la vraie base ; les deux verdicts doivent être identiques. Le
      jour où l'écran accepterait ce que la base refuse (ou l'inverse), cette
      épreuve tombe en nommant le cas.

   PRÉREQUIS : un PostgreSQL joignable par psql (variables PGHOST, PGPORT,
   PGUSER, PGPASSWORD) et le binaire PostgREST (variable POSTGREST). La CI
   le télécharge, version et empreinte figées. S'il manque, l'épreuve
   ÉCHOUE — elle ne saute jamais en silence.
   Lancer : POSTGREST=/chemin/postgrest node supabase/tests/pilotage-http.mjs
   ===================================================================== */
import { spawn, execFileSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import '../../pilotage.js';

const P = globalThis.ELA_PILOTAGE;
const BIN = process.env.POSTGREST || 'postgrest';
const BASE_DE_DONNEES = 'pilotage_http';
const PORT = Number(process.env.PILOTAGE_PORT || 3517);
const URL_API = `http://127.0.0.1:${PORT}`;
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

if (BIN.includes('/') && !existsSync(BIN)) {
  console.error(`PostgREST introuvable (${BIN}) : l'épreuve ne saute pas, elle échoue.`);
  process.exit(1);
}

/* ── La base : le même décor et la même migration que l'épreuve SQL ── */
const psql = (base, ...args) => execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-d', base, ...args],
  { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, PGOPTIONS: '-c client_min_messages=warning' } });
psql('postgres', '-c', `drop database if exists ${BASE_DE_DONNEES}`, '-c', `create database ${BASE_DE_DONNEES}`);
const motDePasse = randomBytes(12).toString('hex');
psql('postgres', '-c', `do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if; end $$;`, '-c', `alter role authenticator password '${motDePasse}'`);
psql(BASE_DE_DONNEES,
  '-f', 'supabase/tests/socle.sql',
  '-f', 'supabase/tests/role-agent-avant.sql',
  '-f', 'supabase/migrations/20260929030000_role_agent_serveur.sql',
  '-f', 'supabase/tests/pilotage.sql',
  // auth.uid() comme chez Supabase : l'identifiant vient du JETON, pas d'un réglage de test.
  '-c', `create or replace function auth.uid() returns uuid language sql stable as $$
           select nullif(nullif(current_setting('request.jwt.claims', true), '')::json->>'sub', '')::uuid $$`,
  '-f', 'supabase/migrations/20261006010000_pilotage.sql',
  '-c', 'grant anon, authenticated to authenticator');

/* ── Le serveur HTTP, et des jetons signés comme ceux de Supabase ── */
const secret = randomBytes(32).toString('hex');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function jeton(sub) {
  const corps = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 });
  return corps + '.' + createHmac('sha256', secret).update(corps).digest('base64url');
}
const hote = process.env.PGHOST || '/var/run/postgresql';
const uri = hote.startsWith('/')
  ? `postgres://authenticator:${motDePasse}@/${BASE_DE_DONNEES}?host=${encodeURIComponent(hote)}&port=${process.env.PGPORT || 5432}`
  : `postgres://authenticator:${motDePasse}@${hote}:${process.env.PGPORT || 5432}/${BASE_DE_DONNEES}`;
const serveur = spawn(BIN, [], {
  env: { ...process.env, PGRST_DB_URI: uri, PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon',
         PGRST_JWT_SECRET: secret, PGRST_SERVER_PORT: String(PORT), PGRST_SERVER_HOST: '127.0.0.1',
         PGRST_LOG_LEVEL: 'error' },
  stdio: ['ignore', 'ignore', 'pipe'] });
let journalServeur = '';
serveur.stderr.on('data', d => { journalServeur += d; });
let pret = false;
for (let i = 0; i < 60 && !pret; i++) {
  pret = await fetch(URL_API + '/').then(r => r.ok, () => false);
  if (!pret) await new Promise(r => setTimeout(r, 250));
}
if (!pret) { console.error('PostgREST ne répond pas.\n' + journalServeur); serveur.kill(); process.exit(1); }

/* Une connexion « comme ELA_NUAGE » : même forme d'appel, même message
   d'erreur (« nuage <code> »), même lecture de la réponse. C'est ce que
   pilotage.js reçoit dans l'admin. */
function connexion(sub) {
  return {
    connecte: () => true,
    appel(chemin, options = {}) {
      const entetes = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (sub) entetes.Authorization = 'Bearer ' + jeton(sub);
      return fetch(URL_API + chemin.replace(/^\/rest\/v1/, ''), { method: options.method || 'GET', body: options.body, headers: entetes })
        .then(r => { if (!r.ok) throw new Error('nuage ' + r.status); return r.text(); })
        .then(t => (t ? JSON.parse(t) : null));
    }
  };
}
const ADMIN = 'aaaaaaaa-0000-0000-0000-000000000001';
const AGENT = 'aaaaaaaa-0000-0000-0000-000000000002';
const QUELCONQUE = 'aaaaaaaa-0000-0000-0000-000000000009';
const admin = P.client(connexion(ADMIN));
const agent = P.client(connexion(AGENT));
const quelconque = P.client(connexion(QUELCONQUE));
const brut = (sub, chemin, options = {}) => fetch(URL_API + chemin, {
  method: options.method || 'GET', body: options.body,
  headers: { 'Content-Type': 'application/json', ...(sub ? { Authorization: 'Bearer ' + jeton(sub) } : {}), ...(options.headers || {}) }
});
const code = async p => { try { await p; return 'ok'; } catch (e) { return e.code || e.message; } };

try {
  /* ── 1. L'admin : créer, relire, modifier, journal ── */
  const a = await admin.creer({ tableau: 'operations', categorie: 'societe', titre: '  Créer la micro-entreprise  ',
    statut: 'a_faire', priorite: 'P0', responsable: 'Barbaros', impacts: ['conformite', 'ca'],
    echeance: '2026-10-12', checklist: [{ texte: 'SIRET reçu', fait: false }],
    lien_github: 'https://github.com/Barbaros911/As-mine/issues/197' });
  check('1 l\'admin crée une carte, que la base rend nettoyée', a && a.titre === 'Créer la micro-entreprise' && a.version === 1
    && a.statut === 'a_faire' && a.priorite === 'P0' && a.impacts.join() === 'ca,conformite', JSON.stringify(a));
  check('1 les dates et la version viennent du serveur', a && /^\d{4}-\d\d-\d\dT/.test(a.cree_le) && a.cree_le === a.modifie_le);
  const b = await admin.creer({ tableau: 'produit', titre: 'Idée : version espagnole', dependances: [a.id] });
  check('1 une idée sans catégorie, qui dépend d\'une carte de l\'autre tableau', b && b.statut === 'idee' && b.categorie === null
    && b.dependances[0] === a.id && b.priorite === 'P2');
  const liste = await admin.lister();
  check('1 la liste rend les deux cartes, la plus pressante d\'abord', liste.length === 2 && liste[0].id === a.id,
    liste.map(c => c.priorite + ' ' + c.titre).join(' | '));

  const a2 = await admin.deplacer(a, 'en_cours');
  check('1 déplacer : nouvelle étape, version 2', a2.statut === 'en_cours' && a2.version === 2);
  const perime = await code(admin.modifier(a, { priorite: 'P3' }));
  check('1 une copie périmée (version 1) ne peut rien écraser', perime === 'conflit');
  let conflit = null;
  try { await admin.modifier(a, { priorite: 'P3' }); } catch (e) { conflit = e; }
  check('1 le conflit rend la version du serveur', conflit && conflit.serveur && conflit.serveur.version === 2
    && conflit.serveur.priorite === 'P0');
  const a3 = await admin.bloquer(a2, '  En attente de l\'URSSAF ');
  check('1 bloquer garde la raison, nettoyée', a3.bloque === true && a3.raison_blocage === 'En attente de l\'URSSAF' && a3.version === 3);
  check('1 terminer une carte bloquée : refusé avant tout envoi', await code(admin.deplacer(a3, 'termine')) === 'invalide');
  const a4 = await admin.debloquer(a3);
  check('1 débloquer efface la raison', a4.bloque === false && a4.raison_blocage === null);
  check('1 terminer sans la checklist cochée : refusé', await code(admin.deplacer(a4, 'termine')) === 'invalide');
  const a5 = await admin.modifier(a4, { checklist: [{ texte: 'SIRET reçu', fait: true }], statut: 'termine' });
  check('1 checklist cochée : « Terminé », avec sa date', a5.statut === 'termine' && !!a5.termine_le);
  const a6 = await admin.archiver(a5);
  check('1 archiver : la carte quitte la liste active', a6.archivee === true && !!a6.archivee_le
    && !(await admin.lister()).some(c => c.id === a.id) && (await admin.lister({ archives: true })).some(c => c.id === a.id));
  check('1 une archivée ne se modifie pas (refus avant envoi)', await code(admin.modifier(a6, { titre: 'Retouche' })) === 'archivee');
  const brutArchive = await brut(ADMIN, `/pilotage_cartes?id=eq.${a.id}`, { method: 'PATCH', body: JSON.stringify({ titre: 'Retouche directe' }) });
  check('1 …et la base la refuse aussi en direct', brutArchive.status === 400, String(brutArchive.status));
  const a7 = await admin.restaurer(a6);
  check('1 restaurer', a7.archivee === false && a7.archivee_le === null);
  const journal = await admin.journal(a.id);
  check('1 le journal rend l\'historique, le plus récent d\'abord',
    journal.map(j => j.action).join(',') === 'restauration,archivage,contenu,statut,deblocage,blocage,statut,creation',
    journal.map(j => j.action).join(','));
  check('1 chaque ligne du journal porte l\'auteur', journal.every(j => j.acteur === ADMIN));

  /* ── 2. Ce que même l'admin ne peut pas faire ── */
  const suppr = await brut(ADMIN, `/pilotage_cartes?id=eq.${b.id}`, { method: 'DELETE' });
  check('2 supprimer une carte : refusé, même à l\'admin', suppr.status === 403, String(suppr.status));
  check('2 …et la carte est toujours là', !!(await admin.lire(b.id)));
  const date = await brut(ADMIN, '/pilotage_cartes', { method: 'POST', body: JSON.stringify({ tableau: 'produit', titre: 'Datée', cree_le: '2020-01-01' }) });
  check('2 imposer une date de création : refusé', date.status === 403, String(date.status));
  const version = await brut(ADMIN, `/pilotage_cartes?id=eq.${b.id}`, { method: 'PATCH', body: JSON.stringify({ version: 99 }) });
  check('2 imposer une version : refusé', version.status === 403, String(version.status));
  const journalEcrit = await brut(ADMIN, '/pilotage_journal', { method: 'POST', body: JSON.stringify({ carte_id: b.id, action: 'statut' }) });
  check('2 écrire au journal : refusé', journalEcrit.status === 403, String(journalEcrit.status));
  const journalEfface = await brut(ADMIN, `/pilotage_journal?carte_id=eq.${a.id}`, { method: 'DELETE' });
  check('2 effacer le journal : refusé', journalEfface.status === 403, String(journalEfface.status));
  check('2 aucune fonction de suppression dans pilotage.js', !Object.keys(admin).some(k => /suppr|delete|effac/i.test(k)));
  // pilotage.js envoie une liste vide ; un autre client pourrait envoyer null.
  const nuls = await brut(ADMIN, '/pilotage_cartes', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ tableau: 'produit', titre: 'Valeurs nulles', checklist: null, bloque: null, impacts: null, dependances: null, description: null }) });
  const n = nuls.status === 201 ? (await nuls.json())[0] : null;
  check('2 la base lit une liste nulle comme vide, et « bloqué » nul comme non', !!n && JSON.stringify(n.checklist) === '[]'
    && n.bloque === false && n.impacts.length === 0 && n.dependances.length === 0 && n.description === '', String(nuls.status));

  /* ── 3. La porte publique (la clé du site, sans jeton) ── */
  for (const [nom, chemin, options] of [
    ['lire les cartes', '/pilotage_cartes', {}],
    ['lire le journal', '/pilotage_journal', {}],
    ['créer', '/pilotage_cartes', { method: 'POST', body: JSON.stringify({ tableau: 'produit', titre: 'Anonyme' }) }],
    ['modifier', `/pilotage_cartes?id=eq.${b.id}`, { method: 'PATCH', body: JSON.stringify({ titre: 'Anonyme' }) }],
    ['supprimer', `/pilotage_cartes?id=eq.${b.id}`, { method: 'DELETE' }],
    ['appeler un contrôle', '/rpc/pilotage_categorie_valide', { method: 'POST', body: JSON.stringify({ p_tableau: 'produit', p_categorie: 'admin' }) }],
  ]) {
    const r = await brut(null, chemin, options);
    check(`3 public : ${nom} → refusé`, r.status === 401, String(r.status));
  }

  /* ── 4. L'agent et un compte quelconque : rien à lire, rien à écrire ── */
  for (const [nom, cli, sub] of [['l\'agent de réservation', agent, AGENT], ['un compte connecté non opérateur', quelconque, QUELCONQUE]]) {
    check(`4 ${nom} lit une liste vide`, (await cli.lister()).length === 0 && (await cli.lister({ archives: true })).length === 0);
    check(`4 ${nom} ne lit pas le journal`, (await cli.journal(a.id)).length === 0);
    check(`4 ${nom} ne crée rien`, await code(cli.creer({ tableau: 'produit', titre: 'Intrusion' })) === 'acces');
    check(`4 ${nom} ne modifie rien (la carte lui est invisible)`,
      await code(cli.modifier(a7, { priorite: 'P3' })) === 'introuvable');
    const r = await brut(sub, `/pilotage_cartes?id=eq.${b.id}`, { method: 'PATCH', body: JSON.stringify({ titre: 'Réécrite' }),
      headers: { Prefer: 'return=representation' } });
    check(`4 ${nom} en direct : zéro ligne touchée`, r.status === 200 && (await r.json()).length === 0);
  }
  check('4 rien n\'a bougé chez l\'admin', (await admin.lire(b.id)).titre === 'Idée : version espagnole'
    && (await admin.lire(a.id)).priorite === 'P0');

  /* ── 5. Le miroir : valider() et la base rendent le même verdict ── */
  const base = { tableau: 'produit', categorie: 'admin', statut: 'a_faire', titre: 'Carte du corpus' };
  const x = n => 'x'.repeat(n);
  const crit = (n, fait = false) => Array.from({ length: n }, (_, i) => ({ texte: 'critère ' + i, fait }));
  const corpus = [
    ['titre de 2', { titre: 'ab' }], ['titre de 3', { titre: 'abc' }], ['titre de 120', { titre: x(120) }],
    ['titre de 121', { titre: x(121) }], ['titre de 120 emojis', { titre: '😀'.repeat(120) }],
    ['titre de 121 emojis', { titre: '😀'.repeat(121) }], ['titre sur deux lignes', { titre: 'Deux\nlignes' }],
    ['titre avec tabulation', { titre: 'Avec\ttab' }], ['titre en espaces', { titre: '     ' }],
    ['description de 4000', { description: x(4000) }], ['description de 4001', { description: x(4001) }],
    ['description sur plusieurs lignes', { description: 'Un\nDeux\nTrois' }],
    ['responsable de 40', { responsable: x(40) }], ['responsable de 41', { responsable: x(41) }],
    ['responsable vide', { responsable: '   ' }],
    ['prochaine action de 200', { prochaine_action: x(200) }], ['prochaine action de 201', { prochaine_action: x(201) }],
    ['tous les impacts', { impacts: P.IMPACTS.map(i => i.cle) }], ['impact inconnu', { impacts: ['ca', 'licorne'] }],
    ['impacts en double', { impacts: ['ca', 'ca'] }],
    ['tableau inconnu', { tableau: 'finance' }], ['statut inconnu', { statut: 'a_tester' }],
    ['priorité P0', { priorite: 'P0' }], ['priorité P4', { priorite: 'P4' }],
    ['idée sans catégorie', { statut: 'idee', categorie: null }], ['à faire sans catégorie', { categorie: null }],
    ['catégorie de l\'autre tableau', { categorie: 'societe' }], ['« lancement »', { tableau: 'operations', categorie: 'lancement' }],
    ['« supports »', { tableau: 'operations', categorie: 'supports' }],
    ['bloqué sans raison', { bloque: true }], ['bloqué, raison de 2', { bloque: true, raison_blocage: 'ab' }],
    ['bloqué, raison de 3', { bloque: true, raison_blocage: 'abc' }], ['bloqué, raison de 201', { bloque: true, raison_blocage: x(201) }],
    ['débloqué avec une raison', { bloque: false, raison_blocage: 'reste' }],
    ['terminé, checklist vide', { statut: 'termine' }], ['terminé, checklist cochée', { statut: 'termine', checklist: crit(3, true) }],
    ['terminé, un critère ouvert', { statut: 'termine', checklist: [...crit(2, true), { texte: 'ouvert', fait: false }] }],
    ['terminé et bloqué', { statut: 'termine', bloque: true, raison_blocage: 'Attente' }],
    ['20 critères', { checklist: crit(20) }], ['21 critères', { checklist: crit(21) }],
    ['critère de 200', { checklist: [{ texte: x(200), fait: false }] }], ['critère de 201', { checklist: [{ texte: x(201), fait: false }] }],
    ['critère vide', { checklist: [{ texte: '  ', fait: false }] }], ['checklist en objet', { checklist: { texte: 'a', fait: true } }],
    ['critère en texte nu', { checklist: ['juste un texte'] }],
    ['lien Issue', { lien_github: 'https://github.com/Barbaros911/As-mine/issues/197' }],
    ['lien PR en minuscules', { lien_github: 'https://github.com/barbaros911/as-mine/pull/326' }],
    ['lien en http', { lien_github: 'http://github.com/Barbaros911/As-mine/issues/1' }],
    ['lien avec barre finale', { lien_github: 'https://github.com/Barbaros911/As-mine/issues/1/' }],
    ['lien vers un autre dépôt', { lien_github: 'https://github.com/autre/depot/issues/1' }],
    ['lien vers l\'Issue 0', { lien_github: 'https://github.com/Barbaros911/As-mine/issues/0' }],
    ['lien javascript', { lien_github: 'javascript:alert(1)' }],
    ['échéance 2020-01-01', { echeance: '2020-01-01' }], ['échéance 2019-12-31', { echeance: '2019-12-31' }],
    ['échéance 2100-12-31', { echeance: '2100-12-31' }], ['échéance 2101-01-01', { echeance: '2101-01-01' }],
    ['dix dépendances', 'DIX'], ['onze dépendances', 'ONZE'],
    // Une valeur NULLE envoyée exprès n'est pas une valeur absente : la base
    // n'applique alors aucun défaut. Trouvé en relisant le miroir.
    ['statut nul', { statut: null }], ['priorité nulle', { priorite: null }], ['tableau nul', { tableau: null }],
    ['checklist nulle', { checklist: null }], ['impacts nuls', { impacts: null }],
    ['dépendances nulles', { dependances: null }], ['« bloqué » nul', { bloque: null }],
    ['description nulle', { description: null }], ['catégorie en espaces', { categorie: '   ' }],
  ];
  // Des cartes qui EXISTENT pour les dépendances : l'existence, elle, ne se
  // juge qu'au serveur, et ce corpus n'éprouve que les règles du miroir.
  const existantes = [];
  for (let i = 0; i < 11; i++) existantes.push((await admin.creer({ tableau: 'produit', titre: 'Dépendance ' + i })).id);
  for (const [nom, cas] of corpus) {
    const carte = P.normaliser({ ...base, ...(cas === 'DIX' ? { dependances: existantes.slice(0, 10) }
      : cas === 'ONZE' ? { dependances: existantes } : cas) });
    const miroir = P.valider(carte).length === 0;
    const envoi = Object.fromEntries(Object.entries(carte).filter(([k]) => P.CHAMPS_CREATION.includes(k)));
    const r = await brut(ADMIN, '/pilotage_cartes', { method: 'POST', body: JSON.stringify(envoi) });
    const serveurAccepte = r.status === 201;
    if (!serveurAccepte && r.status !== 400) check(`5 ${nom} : réponse inattendue du serveur`, false, String(r.status));
    check(`5 miroir « ${nom} » : même verdict des deux côtés`, miroir === serveurAccepte,
      `pilotage.js ${miroir ? 'accepte' : 'refuse'}, la base ${serveurAccepte ? 'accepte' : 'refuse (' + ((await r.json().catch(() => ({}))).message || r.status) + ')'}`);
  }
  check('5 le corpus éprouve les deux verdicts', corpus.length > 40);
} catch (e) {
  check('l\'épreuve s\'est déroulée jusqu\'au bout', false, e.stack || String(e));
} finally {
  serveur.kill();
}

console.log(ok.map(n => '  ok  ' + n).join('\n'));
if (ko.length) {
  console.log('\n=== ÉCHECS (' + ko.length + ') ===\n' + ko.map(n => '  KO  ' + n).join('\n'));
  process.exit(1);
}
console.log(`\n=== PILOTAGE EN HTTP : ${ok.length} contrôles au vert ===`);
