/* =====================================================================
   TEST-ADMIN-PILOTAGE-VUE.MJS — le Pilotage au quotidien (Issue #197, bloc 3)
   ---------------------------------------------------------------------
   6 octobre 2026. Sur le SITE CONSTRUIT (/ela-admin/), contre un faux
   serveur PostgREST du Pilotage, horloge du navigateur fixée au 6 octobre
   2026 à 18 h 45, heure de Paris. Ce que le bloc 3 ajoute, et ce qu'il ne
   doit jamais casser :

   1. ORDINATEUR (1280, 1366, 1440, 1920 px) : les cinq étapes de front, des
      colonnes lisibles, rien qui déborde, « Terminé » par date de fin, des
      cartes dans le premier écran à 1366×768.
   2. TÉLÉPHONE (320, 360, 390, 430 px) : une étape à la fois, comme au
      bloc 2 ; les filtres repliés ; rien qui déborde ; 44 px sous le pouce.
   3. LA RECHERCHE : instantanée, SANS AUCUNE requête, sans redessiner le
      champ (le clavier du téléphone ne saute pas), insensible aux
      majuscules et aux accents, qui dit où elle a trouvé, qui ne cherche
      jamais dans l'identifiant, et qui montre l'autre tableau.
   4. LES FILTRES : ils se combinent, se remettent à zéro, se voient, ne
      touchent à rien sur le serveur, ne survivent pas à un rechargement —
      et ne cachent jamais une alerte.
   5. L'HISTORIQUE : lu à la demande seulement, dit en phrases, à l'heure de
      Paris, et SEULEMENT à partir d'une liste fermée de champs : une ligne
      du journal qui porterait un contenu ne l'afficherait pas.
   6. UNE ERREUR D'AFFICHAGE DU PILOTAGE se dit dans son écran et s'arrête
      là : les courses et « Nouvelle course » répondent.
   7. AUCUNE PAGE HORS DE L'ADMIN ne connaît le Pilotage.

   Port 8153, propre à cette suite. Lancer : node test-admin-pilotage-vue.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import './pilotage.js';

const P = globalThis.ELA_PILOTAGE;
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

/* ── 0. CE QUE LE SOURCE NE DOIT JAMAIS FAIRE ───────────────────────── */
{
  const src = readFileSync('pilotage-ecran.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('0 l\'écran ne garde rien sur l\'appareil (ni filtres, ni recherche)', !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(src));
  check('0 aucune minuterie de relecture', !/setInterval/.test(src));
  check('0 aucun innerHTML', !/innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(src));
}

/* ── LE SITE CONSTRUIT ─────────────────────────────────────────────── */
execSync('sh construire.sh', { stdio: 'ignore' });
{
  /* 7. Toute page construite hors de l'admin : aucune trace du Pilotage. */
  const pages = [];
  const parcourir = d => readdirSync(d).forEach(n => {
    const f = join(d, n);
    if (statSync(f).isDirectory()) { if (f !== join('site', 'ela-admin')) parcourir(f); }
    else if (/\.html$/.test(n)) pages.push(f);
  });
  parcourir('site');
  const traces = pages.filter(f => /pilotage|pilRecherche|pil-colonne/i.test(readFileSync(f, 'utf8')));
  check('7 aucune page publiée hors de l\'admin ne connaît le Pilotage', pages.length > 5 && traces.length === 0,
    pages.length + ' pages ; trouvé dans : ' + traces.join(', '));
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
await new Promise(r => serveur.listen(8153, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8153';
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = { access_token: 'JETON-ADMIN', refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };
const MAINTENANT = new Date('2026-10-06T18:45:00+02:00');

/* ═══ LES CARTES ═══ */
const t = '2026-10-05T16:00:00Z';
const base = { description: '', responsable: null, prochaine_action: null, impacts: [], echeance: null, bloque: false,
  raison_blocage: null, dependances: [], checklist: [], lien_github: null, archivee: false, archivee_le: null,
  termine_le: null, cree_le: t, modifie_le: t, version: 2 };
const C = o => Object.assign({}, base, { id: randomUUID() }, o);
const OPS = {
  siret: C({ tableau: 'operations', categorie: 'societe', statut: 'en_cours', priorite: 'P0', titre: 'Créer la micro-entreprise (SIRET)',
    responsable: 'Barbaros', prochaine_action: 'Déposer le dossier', echeance: '2026-10-09' }),
  ministere: C({ tableau: 'operations', categorie: 'conformite', statut: 'a_faire', priorite: 'P0',
    titre: 'Déclaration d\'activité au ministère', responsable: 'Barbaros', bloque: true, raison_blocage: 'En attente du SIRET', echeance: '2026-10-10' }),
  rcpro: C({ tableau: 'operations', categorie: 'finance', statut: 'a_faire', priorite: 'P1', titre: 'RC Pro de la centrale',
    responsable: 'Barbaros', echeance: '2026-10-04', description: 'Joindre le Kbis et trois devis.' }),
  papiers: C({ tableau: 'operations', categorie: 'chauffeurs', statut: 'en_cours', priorite: 'P1', titre: 'Papiers des chauffeurs dans le carnet',
    responsable: 'Barbaros', checklist: [{ texte: 'Mehmet', fait: true }, { texte: 'Yacine', fait: false }] }),
  mediateur: C({ tableau: 'operations', categorie: 'conformite', statut: 'idee', priorite: 'P2', titre: 'Désigner un médiateur de la consommation' }),
  flyer: C({ tableau: 'operations', categorie: 'marketing', statut: 'a_valider', priorite: 'P2', titre: 'Refaire le flyer easyHotel',
    responsable: 'ChatGPT', lien_github: 'https://github.com/Barbaros911/As-mine/issues/165' }),
  hotels: C({ tableau: 'operations', categorie: 'hotels', statut: 'idee', priorite: 'P3', titre: 'Démarcher deux hôtels de la zone CDG' }),
  ancienP0: C({ tableau: 'operations', categorie: 'commercial', statut: 'termine', priorite: 'P0', titre: 'Signer le partenariat easyHotel',
    termine_le: '2026-09-01T10:00:00Z' }),
  recentP2: C({ tableau: 'operations', categorie: 'hotels', statut: 'termine', priorite: 'P2', titre: 'Livrer les affiches QR',
    termine_le: '2026-10-05T10:00:00Z' })
};
const PROD = {
  stripe: C({ tableau: 'produit', categorie: 'paiement', statut: 'a_faire', priorite: 'P1', titre: 'Stripe Live', responsable: 'Claude' }),
  www: C({ tableau: 'produit', categorie: 'seo', statut: 'idee', priorite: 'P3', titre: 'Faire répondre www' })
};
const NB_OPS = Object.keys(OPS).length;

/* ═══ LE FAUX SERVEUR ═══ (identifiant, version et dates posés par lui ;
   écriture refusée si la version a bougé ; journal lu par carte). */
const RESERVEES = ['id', 'version', 'cree_le', 'modifie_le', 'archivee_le', 'termine_le'];
function fauxServeur() {
  const s = { cartes: new Map(), journal: new Map(), requetes: [], panneJournal: 0, horloge: Date.parse('2026-10-06T16:00:00Z') };
  [...Object.values(OPS), ...Object.values(PROD)].forEach(c => s.cartes.set(c.id, JSON.parse(JSON.stringify(c))));
  s.repondre = (route) => {
    const req = route.request(), u = new URL(req.url()), q = u.searchParams, m = req.method();
    const corps = req.postData() ? JSON.parse(req.postData()) : null;
    s.requetes.push({ m, url: req.url(), corps });
    if (u.pathname.endsWith('/pilotage_journal')) {
      if (s.panneJournal) { s.panneJournal--; return route.fulfill(J({ message: 'panne' }, 500)); }
      return route.fulfill(J(s.journal.get((q.get('carte_id') || '').replace('eq.', '')) || []));
    }
    if (m === 'GET') {
      let l = [...s.cartes.values()];
      if (q.get('id')) l = l.filter(c => c.id === q.get('id').replace('eq.', ''));
      if (q.get('archivee')) l = l.filter(c => String(c.archivee) === q.get('archivee').replace('is.', ''));
      return route.fulfill(J(l));
    }
    const maintenant = () => new Date(s.horloge += 60000).toISOString();
    if (m === 'POST') {
      if (RESERVEES.some(k => k in corps)) return route.fulfill(J({ message: 'colonne réservée' }, 403));
      const tt = maintenant();
      const carte = Object.assign({}, base, { categorie: null, statut: 'idee', priorite: 'P2' }, corps,
        { id: randomUUID(), version: 1, cree_le: tt, modifie_le: tt });
      if (P.valider(carte).length) return route.fulfill(J({ message: 'règle' }, 400));
      s.cartes.set(carte.id, carte);
      return route.fulfill(J([carte]));
    }
    if (m === 'PATCH') {
      if (RESERVEES.some(k => k in corps)) return route.fulfill(J({ message: 'colonne réservée' }, 403));
      const id = (q.get('id') || '').replace('eq.', ''), version = Number((q.get('version') || '').replace('eq.', ''));
      const c = s.cartes.get(id);
      if (!c || c.version !== version) return route.fulfill(J([]));
      const apres = Object.assign({}, c, P.normaliser(corps));
      if (P.valider(apres).length) return route.fulfill(J({ message: 'règle' }, 400));
      apres.version = c.version + 1; apres.modifie_le = maintenant();
      s.cartes.set(id, apres);
      return route.fulfill(J([apres]));
    }
    return route.fulfill(J({ message: 'méthode refusée' }, 405));
  };
  s.ecritures = () => s.requetes.filter(r => r.m !== 'GET');
  s.lectures = () => s.requetes.filter(r => r.m === 'GET');
  return s;
}

async function contexte(nav, { largeur = 390, hauteur = 844, srv }) {
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
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/ela_sante_alertes')) return route.fulfill(J({ sans_alerte: 0, relance_active: true, derniere_relance_s: 5,
      relances_echouees_15min: 0, telegram_echecs_1h: 0, telegram_ok_1h: 1, demandes_24h: 0 }));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  await p.clock.setFixedTime(MAINTENANT);
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  return { ctx, p, erreurs, courses };
}
const pause = (p, ms) => p.waitForTimeout(ms);
const texte = (p, sel) => p.locator(sel).first().innerText().catch(() => '');
async function ouvrirPilotage(p, tableau = 'operations') {
  await p.click('#btnPilotage');
  await p.waitForSelector('#ecran-pilotage.actif .pil-liste-vue', { timeout: 5000 });
  await p.waitForSelector('#ecran-pilotage.actif .pil-carte', { timeout: 5000 });
  if (tableau) { await p.click(`.pil-tableau[data-tableau="${tableau}"]`); await pause(p, 150); }
}
/* Les cartes que l'on VOIT, avec leur colonne. */
const vues = p => p.evaluate(() => [...document.querySelectorAll('#pilZone .pil-carte')].filter(c => c.offsetParent !== null)
  .map(c => ({ id: c.dataset.id, colonne: c.closest('.pil-colonne') && c.closest('.pil-colonne').dataset.colonne,
    titre: c.querySelector('.pil-carte-titre').textContent, trouve: (c.querySelector('.pil-trouve') || {}).textContent || '' })));
const ids = l => l.map(x => x.id).sort().join(',');
const attendu = (...cartes) => cartes.map(c => c.id).sort().join(',');
const compteurs = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.pil-etape')]
  .map(b => [b.dataset.statut, Number(b.querySelector('.pil-etape-nb').textContent)])));
const mesurer = p => p.evaluate(() => {
  const trop = document.documentElement.scrollWidth - window.innerWidth;
  const petits = [...document.querySelectorAll('#ecran-pilotage button, #ecran-pilotage input, #ecran-pilotage select')]
    .filter(e => e.offsetParent !== null && !e.disabled && e.type !== 'checkbox')
    .map(e => { const r = e.getBoundingClientRect(); return { e, h: r.height, w: r.width }; })
    .filter(x => x.h < 44 || x.w < 44).map(x => (x.e.id || x.e.className) + ' ' + Math.round(x.w) + '×' + Math.round(x.h));
  return { trop, petits };
});

const nav = await chromium.launch();
try {
  /* ── 1. ORDINATEUR : LES CINQ ÉTAPES DE FRONT ─────────────────────── */
  for (const [largeur, hauteur] of [[1280, 800], [1366, 768], [1440, 900], [1920, 1080]]) {
    const srv = fauxServeur();
    const v = await contexte(nav, { largeur, hauteur, srv });
    await ouvrirPilotage(v.p);
    const g = await v.p.evaluate(() => {
      const cols = [...document.querySelectorAll('.pil-colonne')].filter(c => c.offsetParent !== null);
      const r = cols.map(c => c.getBoundingClientRect());
      const debord = [...document.querySelectorAll('.pil-colonne .pil-carte')].filter(c => c.offsetParent !== null).filter(c => {
        const a = c.getBoundingClientRect(), b = c.closest('.pil-colonne').getBoundingClientRect();
        return a.left < b.left - 0.5 || a.right > b.right + 0.5;
      }).length;
      const tetes = cols.map(c => {
        const t = c.querySelector('.pil-colonne-tete');
        return { cle: c.dataset.colonne, visible: !!t && t.offsetParent !== null, nom: t ? t.querySelector('.pil-colonne-nom').textContent : '',
          nb: t ? Number(t.querySelector('.pil-nb').textContent) : -1, cartes: c.querySelectorAll('.pil-carte').length };
      });
      const premiere = [...document.querySelectorAll('.pil-colonne .pil-carte')][0];
      return { n: cols.length, cles: cols.map(c => c.dataset.colonne).join(','), hauts: new Set(r.map(x => Math.round(x.top))).size,
        gauches: r.map(x => Math.round(x.left)), larg: Math.min(...r.map(x => x.width)), droite: Math.max(...r.map(x => x.right)),
        selecteur: [...document.querySelectorAll('.pil-etape')].some(b => b.offsetParent !== null), debord, tetes,
        termine: [...document.querySelectorAll('.pil-colonne[data-colonne="termine"] .pil-carte')].map(c => c.dataset.id),
        bas: premiere ? Math.round(premiere.getBoundingClientRect().bottom) : 9999 };
    });
    const D = `1 ${largeur} px`;
    check(`${D} : cinq colonnes visibles, dans l'ordre des étapes`, g.n === 5 && g.cles === P.STATUTS.map(s => s.cle).join(','), g.cles);
    check(`${D} : les cinq de front, sur une ligne`, g.hauts === 1 && g.gauches.every((x, i) => i === 0 || x > g.gauches[i - 1]), g.gauches.join(','));
    check(`${D} : chaque colonne fait au moins 170 px`, g.larg >= 170, Math.round(g.larg) + ' px');
    check(`${D} : rien ne déborde de la page ni d'une colonne`, g.droite <= largeur && g.debord === 0, `droite ${Math.round(g.droite)}, cartes qui débordent ${g.debord}`);
    check(`${D} : le sélecteur des étapes du téléphone n'est pas affiché`, !g.selecteur);
    check(`${D} : chaque colonne dit son étape et compte ses cartes`, g.tetes.every(x => x.visible && x.nom === P.STATUTS.find(s => s.cle === x.cle).libelle && x.nb === x.cartes),
      JSON.stringify(g.tetes));
    check(`${D} : toutes les cartes du tableau sont visibles d'un coup`, g.tetes.reduce((a, x) => a + x.cartes, 0) === NB_OPS);
    check(`${D} : « Terminé » met la plus récemment terminée en tête (pas la plus prioritaire)`,
      g.termine.join(',') === [OPS.recentP2.id, OPS.ancienP0.id].join(','));
    if (largeur === 1366) check(`${D} × 768 : une carte entière dans le premier écran`, g.bas < 768, String(g.bas));
    const m = await mesurer(v.p);
    check(`${D} : aucun défilement de côté`, m.trop <= 0, String(m.trop));
    check(`${D} : tout ce qui se touche fait au moins 44 px`, m.petits.length === 0, m.petits.join(', '));
    check(`${D} : les filtres sont à plat, sans bouton à déplier`, await v.p.locator('#pilFiltres').isVisible()
      && !(await v.p.locator('#pilFiltrer').isVisible()));
    if (largeur === 1280) {
      /* Une carte s'ouvre en fiche ; on revient au tableau, la carte en vue. */
      await v.p.click(`.pil-carte[data-id="${OPS.flyer.id}"]`); await pause(v.p, 250);
      check(`${D} : une carte s'ouvre en fiche`, (await texte(v.p, '.pil-fiche-titre')) === 'Modifier la carte');
      await v.p.click('#pilRetourFiche'); await pause(v.p, 250);
      check(`${D} : retour au tableau, la carte surlignée et visible`, await v.p.evaluate((i) => {
        const c = document.querySelector(`.pil-carte[data-id="${i}"]`);
        const r = c && c.getBoundingClientRect();
        return !!c && c.classList.contains('surlignee') && r.top >= 0 && r.bottom <= innerHeight;
      }, OPS.flyer.id));
      /* Sur ordinateur, une carte neuve part des Idées, même si une recherche
         a fait « suivre » l'étape du téléphone ailleurs. */
      await v.p.fill('#pilRecherche', 'flyer'); await pause(v.p, 150);
      await v.p.fill('#pilRecherche', ''); await pause(v.p, 150);
      await v.p.click('#pilNouvelle'); await pause(v.p, 250);
      check(`${D} : une carte neuve part des « Idées »`, await v.p.evaluate(() =>
        document.querySelector('.pil-etape-choix[aria-pressed="true"]').dataset.statut === 'idee'));
    }
    check(`${D} : rien n'a été écrit, une seule lecture`, srv.ecritures().length === 0 && srv.lectures().length === 1,
      srv.requetes.map(r => r.m + ' ' + r.url).join(' | '));
    check(`${D} : aucune erreur de page`, v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 2. TÉLÉPHONE : UNE ÉTAPE À LA FOIS, COMME AU BLOC 2 ──────────── */
  for (const largeur of [320, 360, 390, 430]) {
    const srv = fauxServeur();
    const v = await contexte(nav, { largeur, hauteur: 844, srv });
    await ouvrirPilotage(v.p);
    await v.p.click('.pil-etape[data-statut="a_faire"]'); await pause(v.p, 150);
    const T = `2 ${largeur} px`;
    const g = await v.p.evaluate(() => ({
      cols: [...document.querySelectorAll('.pil-colonne')].filter(c => c.offsetParent !== null).map(c => c.dataset.colonne),
      tetes: [...document.querySelectorAll('.pil-colonne-tete')].some(t => t.offsetParent !== null),
      selecteur: [...document.querySelectorAll('.pil-etape')].filter(b => b.offsetParent !== null).length,
      police: parseFloat(getComputedStyle(document.getElementById('pilRecherche')).fontSize)
    }));
    check(`${T} : une seule étape visible, celle qu'on a choisie`, g.cols.join(',') === 'a_faire', g.cols.join(','));
    check(`${T} : le sélecteur des cinq étapes est là, sans en-têtes de colonnes`, g.selecteur === 5 && !g.tetes);
    check(`${T} : le champ de recherche est en 16 px (l'iPhone ne zoome pas)`, g.police >= 16, String(g.police));
    check(`${T} : les filtres sont repliés derrière un bouton`, !(await v.p.locator('#pilFiltres').isVisible())
      && await v.p.getAttribute('#pilFiltrer', 'aria-expanded') === 'false');
    let m = await mesurer(v.p);
    check(`${T} : aucun défilement de côté`, m.trop <= 0, String(m.trop));
    check(`${T} : tout ce qui se touche fait au moins 44 px`, m.petits.length === 0, m.petits.join(', '));
    await v.p.click('#pilFiltrer'); await pause(v.p, 150);
    check(`${T} : « Filtres » déplie les filtres`, await v.p.locator('#pilFiltres').isVisible()
      && await v.p.getAttribute('#pilFiltrer', 'aria-expanded') === 'true');
    m = await mesurer(v.p);
    check(`${T}, filtres dépliés : aucun débordement, 44 px partout`, m.trop <= 0 && m.petits.length === 0, m.trop + ' ' + m.petits.join(', '));
    check(`${T} : aucune erreur de page`, v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 3. LA RECHERCHE ─────────────────────────────────────────────── */
  {
    const srv = fauxServeur();
    const v = await contexte(nav, { largeur: 390, hauteur: 844, srv });
    const p = v.p;
    await ouvrirPilotage(p);
    await p.click('.pil-etape[data-statut="idee"]'); await pause(p, 120);
    const avant = srv.requetes.length;
    await p.click('#pilRecherche');
    await p.evaluate(() => { document.getElementById('pilRecherche').__meme = 1; });
    await p.keyboard.type('siret', { delay: 40 });
    await pause(p, 150);
    check('3 la recherche ne demande RIEN au serveur', srv.requetes.length === avant, String(srv.requetes.length - avant));
    check('3 le champ n\'est jamais redessiné : même élément, focus gardé (le clavier ne saute pas)', await p.evaluate(() => {
      const c = document.getElementById('pilRecherche');
      return c.__meme === 1 && document.activeElement === c && c.value === 'siret';
    }));
    check('3 les compteurs suivent la recherche', JSON.stringify(await compteurs(p)) === JSON.stringify({ idee: 0, a_faire: 1, en_cours: 1, a_valider: 0, termine: 0 }),
      JSON.stringify(await compteurs(p)));
    check('3 sur téléphone, l\'étape vide cède la place à la première qui a des résultats', await p.evaluate(() =>
      document.querySelector('.pil-etape[aria-pressed="true"]').dataset.statut === 'a_faire'));
    check('3 « siret » trouve le titre « SIRET » et la raison « En attente du SIRET »', ids(await vues(p)) === attendu(OPS.ministere), ids(await vues(p)));
    check('3 le bandeau dit combien de cartes la recherche laisse voir', /2 cartes sur 9 dans Opérations/.test(await texte(p, '#pilFiltreEtat')),
      await texte(p, '#pilFiltreEtat'));
    await p.fill('#pilRecherche', 'DESIGNER MEDIATEUR'); await pause(p, 150);
    check('3 ni majuscules ni accents ne comptent', ids(await vues(p)) === attendu(OPS.mediateur), ids(await vues(p)));
    await p.fill('#pilRecherche', '#165'); await pause(p, 150);
    check('3 le numéro d\'Issue retrouve la carte', ids(await vues(p)) === attendu(OPS.flyer));
    await p.fill('#pilRecherche', 'kbis'); await pause(p, 150);
    let l = await vues(p);
    check('3 un mot de la description retrouve la carte…', ids(l) === attendu(OPS.rcpro), ids(l));
    check('3 …et la carte dit où il a été trouvé', l[0] && l[0].trouve === 'Trouvé dans : description', l[0] && l[0].trouve);
    await p.fill('#pilRecherche', 'centrale'); await pause(p, 150);
    l = await vues(p);
    check('3 trouvé dans le titre : la carte ne dit rien de plus', ids(l) === attendu(OPS.rcpro) && l[0].trouve === '');
    await p.fill('#pilRecherche', 'siret barbaros'); await pause(p, 150);
    await p.click('.pil-etape[data-statut="en_cours"]'); await pause(p, 120);
    check('3 plusieurs mots : chacun doit se trouver (titre + responsable)', ids(await vues(p)) === attendu(OPS.siret));
    await p.fill('#pilRecherche', 'siret claude'); await pause(p, 150);
    check('3 un mot introuvable écarte la carte', (await vues(p)).length === 0
      && /Aucune carte ne correspond/.test(await texte(p, '#pilFiltreEtat')));
    await p.fill('#pilRecherche', OPS.siret.id.slice(0, 8)); await pause(p, 150);
    check('3 l\'identifiant interne n\'est jamais cherché', (await vues(p)).length === 0);
    await p.fill('#pilRecherche', 'stripe'); await pause(p, 150);
    check('3 rien ici, mais l\'autre tableau est signalé', /Aucune carte ne correspond dans Opérations/.test(await texte(p, '#pilFiltreEtat'))
      && (await texte(p, '#pilAilleurs')) === '1 dans Produit');
    await p.click('#pilAilleurs'); await pause(p, 200);
    check('3 un appui mène à l\'autre tableau, la carte en vue', ids(await vues(p)) === attendu(PROD.stripe)
      && await p.getAttribute('.pil-tableau[data-tableau="produit"]', 'aria-pressed') === 'true');
    await p.focus('#pilRecherche'); await p.keyboard.press('Escape'); await pause(p, 150);
    check('3 Échap vide la recherche, le bandeau s\'en va', await p.inputValue('#pilRecherche') === ''
      && await p.locator('#pilFiltreEtat').count() === 0);
    check('3 la recherche n\'a rien écrit ni relu', srv.ecritures().length === 0 && srv.requetes.length === avant);
    check('3 aucune erreur de page', v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 4. LES FILTRES ──────────────────────────────────────────────── */
  {
    const srv = fauxServeur();
    const v = await contexte(nav, { largeur: 1280, hauteur: 800, srv });
    const p = v.p;
    await ouvrirPilotage(p);
    const avant = srv.requetes.length;
    await p.click('#pilFiltres [data-filtre="bloquees"]'); await pause(p, 150);
    check('4 « Bloquées » ne laisse que les cartes bloquées', ids(await vues(p)) === attendu(OPS.ministere), ids(await vues(p)));
    check('4 le filtre se voit : bouton enfoncé, bandeau « 1 carte sur 9 »', await p.getAttribute('#pilFiltres [data-filtre="bloquees"]', 'aria-pressed') === 'true'
      && /1 carte sur 9/.test(await texte(p, '#pilFiltreEtat')));
    await p.click('#pilFiltres [data-filtre="retard"]'); await pause(p, 150);
    check('4 les filtres se COMBINENT : bloquée ET en retard → aucune ici', (await vues(p)).length === 0);
    await p.click('#pilFiltres [data-filtre="bloquees"]'); await pause(p, 150);
    check('4 « En retard » seul : l\'échéance passée', ids(await vues(p)) === attendu(OPS.rcpro));
    await p.click('#pilFiltres [data-filtre="retard"]'); await pause(p, 150);
    await p.click('#pilFiltres [data-filtre="prioritaires"]'); await pause(p, 150);
    check('4 « Prioritaires » : P0 et P1 seulement', ids(await vues(p)) === attendu(OPS.siret, OPS.ministere, OPS.rcpro, OPS.papiers, OPS.ancienP0));
    await p.click('#pilFiltres [data-filtre="prioritaires"]'); await pause(p, 150);
    await p.selectOption('#pilFiltreResp', 'ChatGPT'); await pause(p, 150);
    check('4 « Responsable » : ses cartes seulement', ids(await vues(p)) === attendu(OPS.flyer));
    check('4 UN FILTRE NE CACHE JAMAIS UNE ALERTE : le résumé et les points comptent toutes les cartes', await p.evaluate(() =>
      /1 carte en retard/.test(document.querySelector('.pil-resume').textContent)
      && /1 bloquée/.test(document.querySelector('.pil-resume').textContent)
      && !!document.querySelector('.pil-tableau[data-tableau="operations"] .pil-point')));
    await p.selectOption('#pilFiltreResp', '__aucun__'); await pause(p, 150);
    check('4 « Sans responsable »', ids(await vues(p)) === attendu(OPS.mediateur, OPS.hotels, OPS.ancienP0, OPS.recentP2));
    await p.fill('#pilRecherche', 'hôtels'); await pause(p, 150);
    check('4 recherche et filtres se combinent aussi', ids(await vues(p)) === attendu(OPS.hotels, OPS.recentP2), ids(await vues(p)));
    await p.click('#pilToutAfficher'); await pause(p, 150);
    check('4 « Tout afficher » remet TOUT à zéro', await p.evaluate(() =>
      document.getElementById('pilRecherche').value === '' && document.getElementById('pilFiltreResp').value === ''
      && ![...document.querySelectorAll('[data-filtre]')].some(b => b.getAttribute('aria-pressed') === 'true')
      && !document.getElementById('pilFiltreEtat')));
    check('4 …et toutes les cartes reviennent', (await vues(p)).length === NB_OPS);
    await p.click('.pil-resume [data-filtre="retard"]'); await pause(p, 150);
    check('4 « 1 carte en retard » du résumé pose le filtre', ids(await vues(p)) === attendu(OPS.rcpro)
      && await p.getAttribute('#pilFiltres [data-filtre="retard"]', 'aria-pressed') === 'true');
    check('4 filtrer n\'a rien écrit ni relu sur le serveur', srv.ecritures().length === 0 && srv.requetes.length === avant,
      srv.requetes.slice(avant).map(r => r.m + ' ' + r.url).join(' | '));
    /* Un détour par les courses : le filtre reste (mémoire de la page)… */
    await p.click('#btnAdminBord'); await pause(p, 200);
    await p.click('#btnPilotage'); await pause(p, 400);
    check('4 un détour par les courses garde le filtre', ids(await vues(p)) === attendu(OPS.rcpro));
    /* …une carte créée que le filtre cacherait lève les filtres, et le dit. */
    await p.click('#pilNouvelle'); await pause(p, 200);
    await p.fill('#pilTitre', 'Commander les cartes de visite');
    await p.click('#pilEnregistrer'); await pause(p, 400);
    const neuve = [...srv.cartes.values()].find(c => c.titre === 'Commander les cartes de visite');
    check('4 une carte créée sous filtre : les filtres sont levés pour l\'afficher', !!neuve
      && (await vues(p)).some(x => x.id === neuve.id) && /filtres ont été retirés/.test(await texte(p, '#pilZone .pil-message')));
    /* …et rien de tout cela ne survit à un rechargement : rien sur l'appareil. */
    await p.click('#pilFiltres [data-filtre="bloquees"]'); await pause(p, 150);
    await p.reload(); await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
    await pause(p, 600);
    await ouvrirPilotage(p);
    check('4 après rechargement, aucun filtre ne cache de carte', (await vues(p)).length === NB_OPS + 1
      && await p.locator('#pilFiltreEtat').count() === 0);
    check('4 aucune erreur de page', v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 5. L'HISTORIQUE ─────────────────────────────────────────────── */
  {
    const srv = fauxServeur();
    const id = OPS.siret.id;
    /* Une ligne de chaque action que la base sait écrire (relues dans la
       migration), plus des lignes HOSTILES : un contenu glissé là où il ne
       devrait pas être, une action inconnue, une valeur inconnue. */
    const sql = readFileSync('supabase/migrations/20261006010000_pilotage.sql', 'utf8');
    const actions = [...(sql.match(/constraint pilotage_journal_action check \(action in \(([\s\S]*?)\)\)/) || [, ''])[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    const ex = {
      creation: [null, { tableau: 'operations', statut: 'idee', priorite: 'P2', bloque: false, raison: null }],
      statut: [{ statut: 'en_cours' }, { statut: 'a_valider' }], priorite: [{ priorite: 'P2' }, { priorite: 'P0' }],
      responsable: [{ responsable: null }, { responsable: 'Barbaros' }], tableau: [{ tableau: 'produit' }, { tableau: 'operations' }],
      categorie: [{ categorie: null }, { categorie: 'societe' }], echeance: [{ echeance: null }, { echeance: '2026-10-09' }],
      blocage: [{ bloque: false, raison: null }, { bloque: true, raison: 'En attente de l\'URSSAF' }],
      deblocage: [{ bloque: true, raison: 'x' }, { bloque: false, raison: null }],
      archivage: [{ archivee: false }, { archivee: true }], restauration: [{ archivee: true }, { archivee: false }],
      contenu: [null, { champs: ['titre', 'checklist'] }]
    };
    let n = 100;
    const lignes = actions.map(a => ({ id: n--, carte_id: id, action: a, avant: (ex[a] || [])[0] ?? null, apres: (ex[a] || [])[1] ?? null,
      acteur: 'u-barbaros', cree_le: '2026-10-06T16:42:00Z' }));
    lignes.push(
      { id: 10, carte_id: id, action: 'contenu', avant: null, apres: { champs: ['titre', 'mot_de_passe'], titre: 'SECRET-TITRE-42' }, cree_le: '2026-10-05T20:14:00Z' },
      { id: 9, carte_id: id, action: 'statut', avant: { statut: 'a_faire' }, apres: { statut: 'en_cours', description: 'SECRET-DESC-42' }, cree_le: '2026-10-05T20:14:00Z' },
      { id: 8, carte_id: id, action: 'statut', avant: { statut: 'idee' }, apres: { statut: '<b>inconnu</b>' }, cree_le: '2026-10-05T20:10:00Z' },
      { id: 7, carte_id: id, action: 'piratage', avant: { x: 'SECRET-X-42' }, apres: { y: 'SECRET-Y-42' }, cree_le: '2025-06-15T10:00:00Z' });
    srv.journal.set(id, lignes);
    const v = await contexte(nav, { largeur: 390, hauteur: 844, srv });
    const p = v.p;
    await ouvrirPilotage(p);
    await p.click('.pil-etape[data-statut="en_cours"]'); await pause(p, 120);
    await p.click(`.pil-carte[data-id="${id}"]`); await pause(p, 250);
    const journal = () => srv.requetes.filter(r => r.url.includes('/pilotage_journal'));
    check('5 ouvrir une fiche ne lit PAS l\'historique', journal().length === 0);
    check('5 la dernière modification se lit sous le titre de la fiche', await p.evaluate(() => {
      const tr = document.getElementById('pilTrace'), ti = document.getElementById('pilTitre');
      return !!tr && /^Modifiée le/.test(tr.textContent) && tr.getBoundingClientRect().top < ti.getBoundingClientRect().top;
    }));
    await p.click('#pilHistorique'); await pause(p, 300);
    check('5 « Voir l\'historique » le lit UNE fois : cette carte, le plus récent d\'abord, borné', journal().length === 1
      && journal()[0].url.includes(`carte_id=eq.${id}`) && /order=id\.desc/.test(journal()[0].url) && /limit=100\b/.test(journal()[0].url),
      journal().map(r => r.url).join(' '));
    const h = await p.evaluate(() => [...document.querySelectorAll('#pilHistoriqueListe li')].map(li => ({
      quand: li.querySelector('.pil-hist-quand').textContent, quoi: li.querySelector('.pil-hist-quoi').textContent })));
    const tout = h.map(x => x.quand + ' ' + x.quoi).join('\n');
    check('5 une ligne par changement', h.length === lignes.length, h.length + ' / ' + lignes.length);
    check('5 chaque action de la base a sa phrase (aucune « Changement enregistré »)', actions.length >= 12
      && h.slice(0, actions.length).every(x => x.quoi && x.quoi !== 'Changement enregistré'), JSON.stringify(h.slice(0, actions.length)));
    check('5 « En cours → À valider »', h.some(x => x.quoi === 'En cours → À valider'));
    check('5 le blocage dit sa raison, la catégorie et la priorité leurs libellés', /Bloquée : En attente de l'URSSAF/.test(tout)
      && /Catégorie : aucune → Société/.test(tout) && /Priorité P2 → P0/.test(tout) && /Échéance fixée au 09\/10/.test(tout));
    check('5 un champ libre modifié : son NOM seulement', h.some(x => x.quoi === 'Carte modifiée : titre, critères'));
    check('5 à l\'heure de Paris, « 06/10 18:42 »', h[0].quand === '06/10 18:42', h[0].quand);
    check('5 une autre année se dit (heure d\'été de Paris)', h[h.length - 1].quand === '15/06/2025 12:00', h[h.length - 1].quand);
    check('5 LISTE FERMÉE : aucun contenu glissé dans le journal n\'est affiché', !/SECRET-/.test(tout), tout);
    check('5 aucune clé brute ni valeur inconnue recopiée', !/a_valider|en_cours|deblocage|mot_de_passe|prochaine_action|<b>|inconnu/.test(tout), tout);
    check('5 une action inconnue reste vague', h[h.length - 1].quoi === 'Changement enregistré');
    check('5 l\'historique est du texte (aucune balise)', await p.evaluate(() => !document.querySelector('#pilHistoriqueListe b')));
    /* Une écriture pendant que l'historique est ouvert : il est relu. */
    await p.click('[data-priorite="P1"]'); await pause(p, 100);
    await p.click('#pilEnregistrer'); await pause(p, 400);
    check('5 après un enregistrement, l\'historique ouvert est relu', journal().length === 2);
    /* Une panne se dit, et se réessaie. */
    await p.click('#pilHistoriqueMasquer'); await pause(p, 150);
    check('5 « Masquer l\'historique »', await p.locator('#pilHistoriqueListe').count() === 0 && await p.locator('#pilHistorique').count() === 1);
    srv.panneJournal = 1;
    await p.click('#pilHistorique'); await pause(p, 300);
    check('5 historique illisible : la fiche le dit', /serveur/i.test(await texte(p, '#pilHistoriqueBloc .pil-erreur')));
    await p.click('#pilHistoriqueReessayer'); await pause(p, 300);
    check('5 « Réessayer » le relit', await p.locator('#pilHistoriqueListe li').count() === lignes.length);
    check('5 aucune erreur de page', v.erreurs.length === 0, v.erreurs.join(' | '));
    await v.ctx.close();
  }

  /* ── 6. UNE ERREUR D'AFFICHAGE RESTE DANS LE PILOTAGE ────────────── */
  {
    const srv = fauxServeur();
    const v = await contexte(nav, { largeur: 390, hauteur: 844, srv });
    const p = v.p;
    await ouvrirPilotage(p);
    /* On casse ce que l'écran lit pour dessiner, puis on tape une lettre. */
    await p.evaluate(() => { window.ELA_PILOTAGE.STATUTS = null; });
    await p.fill('#pilRecherche', 's'); await pause(p, 200);
    check('6 l\'écran du Pilotage dit qu\'il a rencontré une erreur', /erreur d'affichage/.test(await texte(p, '#pilPanne')));
    check('6 l\'erreur ne remonte pas dans la page', v.erreurs.length === 0, v.erreurs.join(' | '));
    await p.click('#btnAdminBord'); await pause(p, 300);
    check('6 les courses s\'ouvrent', await p.evaluate(() => document.getElementById('ecran-bord').classList.contains('actif')) && v.courses.length > 0);
    /* « Nouvelle course » n'est plus une tuile du menu sur téléphone (10/10/2026) : on passe par le bouton du tableau de bord, comme Barbaros. */
    await p.click('#btnSaisirCourse'); await pause(p, 300);
    check('6 « Nouvelle course » s\'ouvre', await p.evaluate(() => document.getElementById('ecran-creer').classList.contains('actif')));
    check('6 aucune écriture n\'est partie', srv.ecritures().length === 0);
    await v.ctx.close();
  }
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
console.log(`\n=== PILOTAGE (vue, bloc 3) : ${ok.length} contrôles au vert ===`);
