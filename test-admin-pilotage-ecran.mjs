/* =====================================================================
   TEST-ADMIN-PILOTAGE-ECRAN.MJS — l'écran du Pilotage (Issue #197, bloc 2)
   ---------------------------------------------------------------------
   6 octobre 2026. Sur le SITE CONSTRUIT (/ela-admin/), contre un faux
   serveur qui se comporte comme PostgREST devant la base du Pilotage :
   identifiant, version et dates posés par lui seul, écriture refusée (zéro
   ligne) quand la version a bougé, règles refusées en 400. Les règles
   elles-mêmes sont éprouvées sur une vraie base par supabase/tests/
   pilotage*.sql et pilotage-http.mjs ; ici on éprouve CE QUE VOIT ET FAIT
   Barbaros :

   1. Rien n'est demandé au Pilotage au chargement de l'admin ; l'entrée du
      menu ouvre l'écran, qui lit UNE fois.
   2. Créer, modifier, changer d'étape, bloquer, terminer, archiver,
      restaurer — en lisant ce qui PART au serveur : seulement les champs
      changés, toujours sous condition de version, jamais l'identifiant ni
      les dates, jamais de suppression.
   3. Les règles sont dites AVANT d'envoyer (« Terminé » sans tous les
      critères, une étape sans catégorie, un blocage sans raison) : rien ne
      part, et l'écran dit quoi faire.
   4. Rien n'est écrasé : une carte changée ailleurs, et le serveur gagne,
      et l'écran le dit.
   5. Une saisie non enregistrée ne se perd pas d'un appui.
   6. Un titre tapé à la main reste du texte (aucune balise).
   7. L'agent ne voit ni l'entrée ni l'écran.
   8. 320 px, 390 px, ordinateur : rien ne déborde, tout se touche du pouce.

   Port 8152, propre à cette suite. Lancer : node test-admin-pilotage-ecran.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import './pilotage.js';

const P = globalThis.ELA_PILOTAGE;
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

/* ── 0. CE QUE LE SOURCE NE DOIT JAMAIS FAIRE ───────────────────────── */
{
  /* On lit le CODE, pas les commentaires : une note qui dit « jamais
     innerHTML » ne doit ni faire tomber ni faire passer le contrôle. */
  const src = readFileSync('pilotage-ecran.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('0 aucun innerHTML dans l\'écran (tout texte en textContent)', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
  check('0 aucune suppression : ni méthode DELETE ni appel de suppression', !/["']DELETE["']|method:\s*["']delete["']|\.supprimer\(/i.test(src));
  check('0 l\'écran ne lit ni n\'écrit aucune course ni la sauvegarde locale',
    !/\/rest\/v1\/courses|ela_bookings|localStorage|sessionStorage/.test(src));
  check('0 aucune minuterie de relecture (rien en tâche de fond)', !/setInterval/.test(src));
}

/* ── LE SITE CONSTRUIT ─────────────────────────────────────────────── */
execSync('sh construire.sh', { stdio: 'ignore' });
{
  const admin = readFileSync('site/ela-admin/index.html', 'utf8');
  check('1 l\'admin charge l\'écran et sa feuille', /<script src="pilotage-ecran\.js"><\/script>/.test(admin)
    && /<link rel="stylesheet" href="pilotage\.css">/.test(admin) && admin.includes('id="ecran-pilotage"'));
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
await new Promise(r => serveur.listen(8152, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8152';
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = { access_token: 'JETON-ADMIN', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };

/* ═══ LE FAUX SERVEUR DU PILOTAGE ═══
   Il fait ce que fait la base : il pose identifiant, version et dates,
   refuse une écriture dont la version a bougé (zéro ligne rendue), refuse
   en 400 ce que ses règles refusent, et n'accepte AUCUNE colonne réservée. */
const RESERVEES = ['id', 'version', 'cree_le', 'modifie_le', 'archivee_le', 'termine_le'];
function fauxServeur() {
  const s = { cartes: new Map(), requetes: [], panne: 0, horloge: Date.parse('2026-10-06T08:00:00Z') };
  const maintenant = () => new Date(s.horloge += 1000).toISOString();
  s.poser = (carte) => { s.cartes.set(carte.id, carte); return carte; };
  s.repondre = (route) => {
    const req = route.request(), u = new URL(req.url()), q = u.searchParams, m = req.method();
    const corps = req.postData() ? JSON.parse(req.postData()) : null;
    s.requetes.push({ m, url: req.url(), corps, auth: req.headers()['authorization'] || '' });
    if (s.panne) { s.panne--; return route.fulfill(J({ message: 'panne' }, 500)); }
    if (u.pathname.endsWith('/pilotage_journal')) return route.fulfill(J([]));
    if (m === 'GET') {
      let l = [...s.cartes.values()];
      if (q.get('id')) l = l.filter(c => c.id === q.get('id').replace('eq.', ''));
      if (q.get('archivee')) l = l.filter(c => String(c.archivee) === q.get('archivee').replace('is.', ''));
      return route.fulfill(J(l));
    }
    if (m === 'POST') {
      if (RESERVEES.some(k => k in corps)) return route.fulfill(J({ message: 'colonne réservée' }, 403));
      const t = maintenant();
      const carte = Object.assign({ description: '', statut: 'idee', priorite: 'P2', categorie: null, responsable: null,
        prochaine_action: null, impacts: [], echeance: null, bloque: false, raison_blocage: null, dependances: [],
        checklist: [], lien_github: null, archivee: false }, corps,
        { id: randomUUID(), version: 1, cree_le: t, modifie_le: t, archivee_le: null, termine_le: null });
      if (P.valider(carte).length) return route.fulfill(J({ message: 'règle' }, 400));
      return route.fulfill(J([s.poser(carte)]));
    }
    if (m === 'PATCH') {
      if (RESERVEES.some(k => k in corps)) return route.fulfill(J({ message: 'colonne réservée' }, 403));
      const id = (q.get('id') || '').replace('eq.', ''), version = Number((q.get('version') || '').replace('eq.', ''));
      const c = s.cartes.get(id);
      if (!c || c.version !== version) return route.fulfill(J([]));
      if (c.archivee && corps.archivee !== false) return route.fulfill(J({ message: 'archivée' }, 400));
      const apres = Object.assign({}, c, P.normaliser(corps));
      if (P.valider(apres).length) return route.fulfill(J({ message: 'règle' }, 400));
      const t = maintenant();
      apres.version = c.version + 1; apres.modifie_le = t;
      if (apres.archivee && !c.archivee) apres.archivee_le = t;
      if (!apres.archivee) apres.archivee_le = null;
      if (apres.statut === 'termine' && c.statut !== 'termine') apres.termine_le = t;
      return route.fulfill(J([s.poser(apres)]));
    }
    return route.fulfill(J({ message: 'méthode refusée' }, 405));
  };
  s.ecritures = () => s.requetes.filter(r => r.m !== 'GET');
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
  const courses = [];
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rest/v1/pilotage_')) return srv.repondre(route);
    if (u.includes('/rest/v1/courses')) courses.push(u);
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/est_admin')) return route.fulfill(J(role === 'admin'));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J(role));
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J({ sans_alerte: 0, relance_active: true, derniere_relance_s: 5,
      relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 1, demandes_24h: 0 }));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(900);
  return { ctx, p, erreurs, courses };
}
const pause = (p, ms) => p.waitForTimeout(ms);
const texte = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
async function ouvrirPilotage(p) {
  await p.click('#btnPilotage');
  await p.waitForSelector('#ecran-pilotage.actif .pil-etapes', { timeout: 5000 });
  await p.waitForFunction(() => !document.querySelector('#pilZone .pil-vide[role="status"]'), null, { timeout: 5000 });
}
async function majeure(p, sel) { await p.click(sel); await pause(p, 250); }
const dernier = (srv) => srv.ecritures().slice(-1)[0];

const nav = await chromium.launch();
try {
  /* ── 1. L'ENTRÉE ─────────────────────────────────────────────────── */
  const srv = fauxServeur();
  const { ctx, p, erreurs, courses } = await contexte(nav, { srv });
  check('1 l\'admin s\'ouvre sur le tableau de bord des courses', await p.evaluate(() =>
    document.getElementById('ecran-bord').classList.contains('actif')));
  check('1 le tableau des courses a interrogé le serveur, comme avant', courses.length > 0);
  check('1 RIEN n\'est demandé au Pilotage au chargement de l\'admin', srv.requetes.length === 0, srv.requetes.map(r => r.url).join(' '));
  check('1 l\'entrée « Pilotage » est dans le menu, visible', await p.locator('#btnPilotage').isVisible()
    && (await texte(p, '#btnPilotage')).includes('Pilotage'));
  await ouvrirPilotage(p);
  check('1 elle ouvre l\'écran Pilotage et allume son entrée', await p.evaluate(() =>
    document.getElementById('ecran-pilotage').classList.contains('actif')
    && document.getElementById('btnPilotage').classList.contains('actif')));
  check('1 l\'écran dit qu\'il n\'est pas le traitement des courses', (await texte(p, '#ecran-pilotage .pil-intro')).includes('courses'));
  check('1 il lit UNE fois, les cartes actives, avec le jeton de la session', srv.requetes.length === 1
    && /pilotage_cartes\?select=\*&archivee=is\.false/.test(srv.requetes[0].url) && srv.requetes[0].auth === 'Bearer JETON-ADMIN');
  check('1 deux tableaux, cinq étapes, compteurs à zéro', await p.evaluate(() => {
    const t = [...document.querySelectorAll('.pil-tableau')].map(b => b.dataset.tableau).join(',');
    const e = [...document.querySelectorAll('.pil-etape')].map(b => b.dataset.statut + ':' + b.querySelector('.pil-etape-nb').textContent).join(',');
    return t === 'produit,operations' && e === 'idee:0,a_faire:0,en_cours:0,a_valider:0,termine:0';
  }));
  check('1 aucune carte inventée : la liste vide le dit', (await texte(p, '#pilZone .pil-vide')).length > 0);
  check('1 aucun appel aux courses depuis le Pilotage', srv.requetes.every(r => r.url.includes('/rest/v1/pilotage_')));

  /* ── 2. CRÉER ────────────────────────────────────────────────────── */
  await majeure(p, '#pilNouvelle');
  check('2 « Nouvelle carte » ouvre la fiche', (await texte(p, '.pil-fiche-titre')) === 'Nouvelle carte');
  check('2 en fiche, le retour de l\'écran ne mène plus au tableau de bord (un seul retour visible)', await p.evaluate(() =>
    getComputedStyle(document.querySelector('#ecran-pilotage > .bord-tete')).display === 'none'));
  await majeure(p, '#pilEnregistrer');
  check('2 sans titre, rien ne part et l\'écran le dit', srv.ecritures().length === 0
    && (await texte(p, '.pil-fiche .pil-message.erreur, .pil-fiche .pil-erreurs')).length > 0
    && await p.evaluate(() => document.getElementById('pilTitre').getAttribute('aria-invalid') === 'true'));
  await p.fill('#pilTitre', 'Déclarer l\'activité au ministère');
  await majeure(p, '#pilEnregistrer');
  let w = dernier(srv);
  check('2 « Créer la carte » envoie un POST', w && w.m === 'POST', JSON.stringify(w));
  check('2 …sans identifiant, version ni date (la base les pose)', w && !['id', 'version', 'cree_le', 'modifie_le'].some(k => k in w.corps));
  check('2 …dans le tableau et l\'étape affichés, priorité P2 par défaut', w && w.corps.tableau === 'produit'
    && w.corps.statut === 'idee' && w.corps.priorite === 'P2' && w.corps.titre === 'Déclarer l\'activité au ministère');
  check('2 retour au tableau, la carte y est, le compteur suit', await p.evaluate(() =>
    document.querySelectorAll('.pil-carte').length === 1
    && document.querySelector('.pil-etape[data-statut="idee"] .pil-etape-nb').textContent === '1'
    && document.querySelector('.pil-tableau[data-tableau="produit"] .pil-nb').textContent === '1'));
  check('2 « Carte créée. » est dit', (await texte(p, '#pilZone .pil-message')).includes('créée'));
  const id = [...srv.cartes.keys()][0];

  /* ── 3. MODIFIER : seulement ce qui change, sous condition de version ── */
  await majeure(p, `.pil-carte[data-id="${id}"]`);
  check('3 la carte s\'ouvre en fiche', (await texte(p, '.pil-fiche-titre')) === 'Modifier la carte');
  await majeure(p, '[data-priorite="P0"]');
  await majeure(p, '[data-f="resp-Claude"]');
  await p.fill('#pilNouveauCritere', 'Attestation RC Pro reçue');
  await majeure(p, '#pilAjouterCritere');
  await p.fill('#pilNouveauCritere', 'Mail envoyé au ministère');
  await p.press('#pilNouveauCritere', 'Enter'); await pause(p, 200);
  await p.fill('#pilEcheance', '2026-10-01');
  await p.dispatchEvent('#pilEcheance', 'change'); await pause(p, 150);
  check('3 l\'écran dit qu\'il y a des modifications non enregistrées', (await texte(p, '#pilEtatSaisie')).includes('non enregistrées'));
  const avantModif = srv.ecritures().length;
  await majeure(p, '#pilEnregistrer');
  w = dernier(srv);
  check('3 « Enregistrer » envoie UNE écriture PATCH sous condition de version', srv.ecritures().length === avantModif + 1
    && w.m === 'PATCH' && w.url.includes(`id=eq.${id}`) && w.url.includes('version=eq.1'), w && w.url);
  check('3 …seulement les champs changés (pas le titre)', w && JSON.stringify(Object.keys(w.corps).sort())
    === JSON.stringify(['checklist', 'echeance', 'priorite', 'responsable']), w && Object.keys(w.corps).join(','));
  check('3 …les critères ajoutés, non cochés', w && JSON.stringify(w.corps.checklist) === JSON.stringify([
    { texte: 'Attestation RC Pro reçue', fait: false }, { texte: 'Mail envoyé au ministère', fait: false }]));
  check('3 « Enregistré. » est dit, et plus rien n\'est en attente', (await texte(p, '.pil-fiche .pil-message')).includes('Enregistré')
    && (await texte(p, '#pilEtatSaisie')).includes('Tout est enregistré'));

  /* ── 4. LES RÈGLES SONT DITES AVANT D'ENVOYER ─────────────────────── */
  let n = srv.ecritures().length;
  await majeure(p, '.pil-etape-choix[data-statut="a_faire"]');
  check('4 « À faire » sans catégorie : rien ne part, l\'écran demande une catégorie', srv.ecritures().length === n
    && /catégorie/i.test(await texte(p, '.pil-fiche .pil-message.erreur, .pil-fiche .pil-erreurs')));
  await p.selectOption('#pilCategorie', 'admin'); await pause(p, 150);
  await majeure(p, '.pil-etape-choix[data-statut="a_faire"]');
  w = dernier(srv);
  check('4 la catégorie choisie part AVEC le changement d\'étape, en une écriture', srv.ecritures().length === n + 1
    && w.corps.categorie === 'admin' && w.corps.statut === 'a_faire', w && JSON.stringify(w.corps));
  check('4 « Carte passée à « À faire » » est dit', (await texte(p, '.pil-fiche .pil-message')).includes('À faire'));
  n = srv.ecritures().length;
  await majeure(p, '.pil-etape-choix[data-statut="termine"]');
  const dit = await texte(p, '.pil-fiche .pil-message.erreur, .pil-fiche .pil-erreurs');
  check('4 « Terminé » sans tous les critères : rien ne part', srv.ecritures().length === n);
  check('4 …et l\'écran dit LESQUELS restent à cocher', dit.includes('Attestation RC Pro reçue') && dit.includes('Mail envoyé au ministère'), dit);

  /* ── 5. BLOQUER, DÉBLOQUER, TERMINER ─────────────────────────────── */
  await majeure(p, '#pilBloquer');
  await p.fill('#pilRaison', 'ab');
  await majeure(p, '#pilConfirmerBlocage');
  check('5 une raison trop courte ne part pas', srv.ecritures().length === n
    && /bloque|attend/i.test(await texte(p, '.pil-fiche .pil-message.erreur, .pil-fiche .pil-erreurs')));
  await p.fill('#pilRaison', 'En attente du SIRET');
  await majeure(p, '#pilConfirmerBlocage');
  w = dernier(srv);
  check('5 « Confirmer le blocage » envoie le blocage et sa raison', w.corps.bloque === true && w.corps.raison_blocage === 'En attente du SIRET');
  check('5 la fiche affiche « Bloquée ou en attente : … »', (await texte(p, '.pil-bandeau.bloque')).includes('En attente du SIRET'));
  n = srv.ecritures().length;
  await p.check('#pilCrit0'); await pause(p, 120); await p.check('#pilCrit1'); await pause(p, 120);
  await majeure(p, '.pil-etape-choix[data-statut="termine"]');
  check('5 bloquée, elle ne passe pas à « Terminé » : rien ne part, l\'écran dit de débloquer', srv.ecritures().length === n
    && /débloquez/i.test(await texte(p, '.pil-fiche .pil-message.erreur, .pil-fiche .pil-erreurs')));
  /* Retour à la liste sans enregistrer les coches : deux appuis. */
  await majeure(p, '#pilRetourFiche');
  check('5 Retour avec des coches non enregistrées : l\'écran prévient et reste sur la fiche', await p.locator('.pil-fiche').count() === 1
    && (await texte(p, '.pil-fiche .pil-message.erreur')).includes('non enregistrées'));
  await majeure(p, '#pilRetourFiche');
  check('5 un second appui trop rapide ne vaut pas accord', await p.locator('.pil-fiche').count() === 1);
  await pause(p, 800);
  await majeure(p, '#pilRetourFiche');
  check('5 le second appui posé quitte la fiche, sans rien envoyer', await p.locator('.pil-fiche').count() === 0 && srv.ecritures().length === n);
  await majeure(p, '.pil-etape[data-statut="a_faire"]');
  check('5 la carte bloquée et en retard ressort dans la liste', await p.evaluate((i) => {
    const c = document.querySelector(`.pil-carte[data-id="${i}"]`);
    return !!c && c.classList.contains('retard') && c.textContent.includes('Bloquée : En attente du SIRET')
      && c.textContent.includes('En retard') && c.querySelector('.pil-prio').textContent === 'P0';
  }, id));
  check('5 un point signale l\'étape et le tableau', await p.evaluate(() =>
    !!document.querySelector('.pil-etape[data-statut="a_faire"] .pil-point')
    && !!document.querySelector('.pil-tableau[data-tableau="produit"] .pil-point')
    && !document.querySelector('.pil-etape[data-statut="idee"] .pil-point')));
  check('5 le résumé du tableau le dit en mots', /en retard/.test(await texte(p, '.pil-resume')) && /bloquée/.test(await texte(p, '.pil-resume')));
  await majeure(p, `.pil-carte[data-id="${id}"]`);
  await majeure(p, '#pilDebloquer');
  w = dernier(srv);
  check('5 « Débloquer » envoie bloque=false', w.corps.bloque === false);
  await p.check('#pilCrit0'); await pause(p, 120); await p.check('#pilCrit1'); await pause(p, 120);
  n = srv.ecritures().length;
  await majeure(p, '.pil-etape-choix[data-statut="termine"]');
  w = dernier(srv);
  check('5 tous les critères cochés : « Terminé » part avec les coches, en une écriture', srv.ecritures().length === n + 1
    && w.corps.statut === 'termine' && w.corps.checklist.every(x => x.fait));
  check('5 la carte est terminée sur le serveur', srv.cartes.get(id).statut === 'termine' && !!srv.cartes.get(id).termine_le);

  /* ── 6. RIEN N'EST ÉCRASÉ ───────────────────────────────────────── */
  const ailleurs = Object.assign({}, srv.cartes.get(id), { titre: 'Titre changé sur l\'ordinateur',
    version: srv.cartes.get(id).version + 1 });
  srv.poser(ailleurs);
  await p.fill('#pilDescription', 'Une note tapée sur le téléphone');
  n = srv.ecritures().length;
  await majeure(p, '#pilEnregistrer');
  /* On laisse le temps à un éventuel second envoi « de rattrapage » : c'est
     lui qui écraserait la base, pas le premier. */
  await pause(p, 900);
  const conflit = await texte(p, '.pil-fiche .pil-message');
  check('6 carte changée ailleurs : l\'écriture est refusée et la base n\'est pas écrasée',
    srv.cartes.get(id).titre === 'Titre changé sur l\'ordinateur' && srv.cartes.get(id).description === '');
  check('6 l\'écran le dit et nomme le changement non appliqué', /autre appareil/.test(conflit) && /description/.test(conflit), conflit);
  check('6 la fiche montre la version à jour du serveur', await p.inputValue('#pilTitre') === 'Titre changé sur l\'ordinateur'
    && await p.inputValue('#pilDescription') === '');

  /* ── 7. ARCHIVER, RESTAURER ─────────────────────────────────────── */
  n = srv.ecritures().length;
  await majeure(p, '#pilArchiver');
  check('7 premier appui sur « Archiver » : il demande confirmation, rien ne part', (await texte(p, '#pilArchiver')).includes('Confirmer')
    && srv.ecritures().length === n);
  await p.click('#pilArchiver');
  check('7 un second appui immédiat (double appui) ne vaut pas accord', srv.ecritures().length === n);
  await pause(p, 800);
  await majeure(p, '#pilArchiver');
  w = dernier(srv);
  check('7 le second appui posé archive (archivee=true, aucune suppression)', w.m === 'PATCH' && w.corps.archivee === true
    && srv.requetes.every(r => r.m !== 'DELETE'));
  check('7 la carte quitte le tableau, le compteur suit', await p.evaluate(() =>
    document.querySelector('.pil-tableau[data-tableau="produit"] .pil-nb').textContent === '0'));
  await majeure(p, '#pilArchives');
  await pause(p, 300);
  check('7 « Archives » relit les cartes archivées', srv.requetes.some(r => /archivee=is\.true/.test(r.url))
    && await p.locator(`.pil-carte[data-id="${id}"]`).count() === 1);
  await majeure(p, `.pil-carte[data-id="${id}"]`);
  check('7 une carte archivée est figée : ses champs ne se modifient pas', await p.evaluate(() =>
    document.getElementById('pilTitre').disabled && !document.getElementById('pilEnregistrer')
    && !!document.getElementById('pilRestaurer')));
  await majeure(p, '#pilRestaurer');
  w = dernier(srv);
  check('7 « Restaurer » envoie archivee=false, seul', w.m === 'PATCH' && JSON.stringify(w.corps) === '{"archivee":false}');
  check('7 la carte revient à son étape, dans le tableau', await p.locator(`.pil-carte[data-id="${id}"]`).count() === 1
    && await p.evaluate(() => document.querySelector('.pil-etape[aria-pressed="true"]').dataset.statut === 'termine'));

  /* ── 8. UN TITRE RESTE DU TEXTE ─────────────────────────────────── */
  await majeure(p, '.pil-etape[data-statut="idee"]');
  await majeure(p, '#pilNouvelle');
  await p.fill('#pilTitre', '<img src=x onerror="window.__xss=1"> Idée');
  await majeure(p, '#pilEnregistrer');
  await pause(p, 200);
  check('8 un titre avec des chevrons s\'affiche tel quel, sans balise', await p.evaluate(() =>
    !document.querySelector('#pilZone img') && !window.__xss
    && [...document.querySelectorAll('.pil-carte-titre')].some(t => t.textContent.includes('<img src=x'))));

  /* ── 9. UNE FICHE ENTAMÉE SURVIT À UN DÉTOUR PAR LES COURSES ─────── */
  const idee = [...srv.cartes.values()].find(c => c.titre.includes('Idée'));
  await majeure(p, `.pil-carte[data-id="${idee.id}"]`);
  await p.fill('#pilProchaine', 'Demander à Mehmet');
  await majeure(p, '#btnAdminBord');
  check('9 on peut aller voir les courses', await p.evaluate(() => document.getElementById('ecran-bord').classList.contains('actif')));
  const lectures = srv.requetes.filter(r => r.m === 'GET').length;
  await p.click('#btnPilotage'); await pause(p, 300);
  check('9 au retour, la fiche et la saisie sont là', await p.locator('.pil-fiche').count() === 1
    && await p.inputValue('#pilProchaine') === 'Demander à Mehmet');
  check('9 …sans relecture qui l\'écraserait', srv.requetes.filter(r => r.m === 'GET').length === lectures);
  await pause(p, 800);
  await majeure(p, '#pilRetourFiche'); await pause(p, 800); await majeure(p, '#pilRetourFiche');

  /* ── 10. UNE PANNE SE DIT, ET SE RÉESSAIE ───────────────────────── */
  srv.panne = 1;
  await majeure(p, '#pilActualiser');
  await pause(p, 300);
  check('10 serveur en panne : l\'écran le dit (rien d\'inventé)', /serveur/i.test(await texte(p, '.pil-erreur')));
  await majeure(p, '.pil-erreur .bouton-fantome');
  await pause(p, 300);
  check('10 « Réessayer » relit, et la liste revient', await p.locator('.pil-carte').count() >= 1 && await p.locator('.pil-erreur').count() === 0);

  /* ── 11. TOUT EST PASSÉ PAR LE SERVEUR DU PILOTAGE, AVEC LE JETON ── */
  check('11 chaque requête vise pilotage_* avec le jeton de la session', srv.requetes.every(r =>
    r.url.includes('/rest/v1/pilotage_') && r.auth === 'Bearer JETON-ADMIN'));
  check('11 aucune écriture n\'a jamais porté de colonne réservée', srv.ecritures().every(r =>
    !['id', 'version', 'cree_le', 'modifie_le', 'archivee_le', 'termine_le'].some(k => r.corps && k in r.corps)));
  check('11 toute modification part sous condition de version', srv.ecritures().filter(r => r.m === 'PATCH').every(r => /version=eq\.\d+/.test(r.url)));
  check('11 aucune erreur de page', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();

  /* ── 12. L'AGENT NE VOIT NI L'ENTRÉE NI L'ÉCRAN ─────────────────── */
  const srvA = fauxServeur();
  const a = await contexte(nav, { role: 'agent_reservation', srv: srvA });
  await pause(a.p, 600);
  check('12 agent : l\'entrée « Pilotage » est cachée', !(await a.p.locator('#btnPilotage').isVisible()));
  await a.p.evaluate(() => document.getElementById('btnPilotage').click());
  await pause(a.p, 300);
  check('12 agent : même forcé, l\'écran ne s\'ouvre pas et rien n\'est demandé', !(await a.p.locator('#ecran-pilotage').isVisible())
    && srvA.requetes.length === 0);
  await a.ctx.close();

  /* ── 13. 320 px, 390 px, ORDINATEUR ─────────────────────────────── */
  const etat = fauxServeur();
  const t = '2026-10-06T07:00:00Z';
  const base = { tableau: 'produit', categorie: 'admin', description: '', responsable: 'Claude', prochaine_action: 'Relire la PR',
    impacts: ['client'], echeance: null, bloque: false, raison_blocage: null, dependances: [], checklist: [], lien_github: null,
    archivee: false, archivee_le: null, termine_le: null, cree_le: t, modifie_le: t, version: 1 };
  etat.poser(Object.assign({}, base, { id: randomUUID(), statut: 'en_cours', priorite: 'P0',
    titre: 'Un titre très long qui doit passer à la ligne sans jamais pousser la page de côté sur un petit téléphone',
    echeance: '2026-09-30', bloque: true, raison_blocage: 'En attente de la validation de Barbaros sur la capture mobile',
    checklist: [{ texte: 'Capture 320 px', fait: true }, { texte: 'Capture ordinateur', fait: false }],
    lien_github: 'https://github.com/Barbaros911/As-mine/issues/197' }));
  etat.poser(Object.assign({}, base, { id: randomUUID(), statut: 'en_cours', priorite: 'P2', titre: 'Deuxième carte' }));
  for (const [largeur, hauteur] of [[320, 640], [390, 844], [1280, 800]]) {
    const v = await contexte(nav, { largeur, hauteur, srv: etat });
    await ouvrirPilotage(v.p);
    await majeure(v.p, '.pil-etape[data-statut="en_cours"]');
    const mesure = () => v.p.evaluate(() => {
      const trop = document.documentElement.scrollWidth - window.innerWidth;
      const petits = [...document.querySelectorAll('#ecran-pilotage button, #ecran-pilotage input, #ecran-pilotage select, #ecran-pilotage label.pil-coche')]
        .filter(e => e.offsetParent !== null && !e.disabled)
        .map(e => { const r = e.getBoundingClientRect(); return { e, h: r.height, w: r.width }; })
        .filter(x => x.e.type !== 'checkbox' && (x.h < 44 || x.w < 44))
        .map(x => (x.e.id || x.e.className || x.e.tagName) + ' ' + Math.round(x.w) + '×' + Math.round(x.h));
      const etapes = [...document.querySelectorAll('.pil-etape')].map(b => Math.round(b.getBoundingClientRect().top));
      return { trop, petits, uneLigne: new Set(etapes).size === 1 };
    });
    let m = await mesure();
    check(`13 ${largeur} px, liste : aucun débordement de côté`, m.trop <= 0, String(m.trop));
    check(`13 ${largeur} px, liste : tout ce qui se touche fait au moins 44 px`, m.petits.length === 0, m.petits.join(', '));
    check(`13 ${largeur} px : les cinq étapes tiennent sur une ligne`, m.uneLigne);
    await majeure(v.p, '.pil-carte');
    m = await mesure();
    check(`13 ${largeur} px, fiche : aucun débordement de côté`, m.trop <= 0, String(m.trop));
    check(`13 ${largeur} px, fiche : tout ce qui se touche fait au moins 44 px`, m.petits.length === 0, m.petits.join(', '));
    check(`13 ${largeur} px : aucune erreur de page`, v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 14. LA PAGE PUBLIQUE NE CONNAÎT PAS L'ÉCRAN ────────────────── */
  const pub = await nav.newContext();
  const pp = await pub.newPage();
  await pp.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await pp.goto(BASE + '/');
  check('14 la page publique ne charge ni l\'écran ni sa feuille', await pp.evaluate(() =>
    typeof window.ELA_PILOTAGE_ECRAN === 'undefined' && !document.getElementById('ecran-pilotage')
    && ![...document.styleSheets].some(s => /pilotage/.test(s.href || ''))));
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
console.log(`\n=== PILOTAGE (écran) : ${ok.length} contrôles au vert ===`);
