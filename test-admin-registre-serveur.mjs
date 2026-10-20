/* =====================================================================
   TEST-ADMIN-REGISTRE-SERVEUR.MJS — le Registre compte sur le serveur
   ---------------------------------------------------------------------
   20 octobre 2026, mission de finalisation (« Elatransfer doit pouvoir
   fonctionner proprement avec des dizaines de milliers de courses »).
   L'appareil ne garde que les 1 000 courses les plus récentes ; le Registre
   y calculait tout. Il lit maintenant ses chiffres (ela_registre_resume) et
   sa recherche (ela_registre_courses) sur le serveur.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT (/ela-admin/) :
   1. le serveur répond : les chiffres affichés sont LES SIENS (différents
      exprès de ce que l'appareil calculerait), l'écran dit d'où ils
      viennent, et l'écriteau des 1 000 courses se tait même avec un
      appareil plein ;
   2. la recherche : le vrai total du serveur, 20 lignes, « Afficher les
      suivantes » demande la page d'après ; les filtres (statut, chauffeur,
      source, période) partent dans la requête ; aucune réponse lente d'une
      frappe ancienne ne remplace la dernière ;
   3. le serveur ne répond pas (fonction absente, ou réponse sans la bonne
      forme) : l'appareil compte, et l'écran le DIT ; jamais « 0 € ».
   Les attendus sont posés à la main, jamais relus sur l'écran.

   Port 8176, propre à cette suite. Lancer : node test-admin-registre-serveur.mjs
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
await new Promise(r => serveur.listen(8176, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8176';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });

/* L'appareil : 1 000 courses (la liste est donc « tronquée »), toutes
   réalisées cette semaine à 10 € — l'appareil dirait 1 000 courses et
   10 000 €. Le serveur, lui, dira 37 courses et 4 321 € : si l'écran
   affiche 10 000 €, c'est qu'il calcule encore sur l'appareil. */
const auj = new Date();
const jour = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const LOCAL = Array.from({ length: 1000 }, (_, i) => ({ ref: 'ELA-26-10-L' + String(i).padStart(4, '0'), statut: 'realisee', version: 1,
  course: { depart: 'Rue ' + i, arrivee: 'CDG', date: iso(jour), heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline' },
  client: { nom: 'Local ' + i, telephone: '06 00 00 00 00' }, prix: { total: 10 }, chauffeur: { nom: 'Local' }, langue: 'fr' }));

const RESUME = (periode) => ({
  genere: new Date().toISOString(), periode, total: 52340,
  par_statut: { realisee: 30000, confirmee: 12000, attente: 340, refusee: 10000 },
  semaine: { n: 37, total: 4321 }, semaine_avant: { n: 30, total: 3000 },
  periodes: [{ cle: periode === 'mois' ? '2026-10' : periode === 'annee' ? '2026' : iso(jour), n: 37, total: 4321 }],
  chauffeurs: [{ nom: 'Serveur Ahmed', n: 900, total: 81000, commission: 12150, sans_commission: 3 }],
  chauffeurs_periode: [{ nom: 'Serveur Ahmed', n: 21, total: 2100, commission: 315, sans_commission: 0 }],
  provenances: [{ nom: 'Affiche · Ibis CDG', demandes: 812, realisees: 400, total: 36000 }],
  delai: { n: 120, mediane_ms: 7 * 60000, vite: 90, en_attente: 2, pire: { ref: 'ELA-26-10-LONG1', numero: 4242, ms: 3 * 3600000 } },
  options: { chauffeurs: ['Serveur Ahmed', 'Serveur Bilal'], sources: ['Affiche · Ibis CDG'], annees: [2026, 2025] },
});
/* La base du faux serveur pour la recherche : 1 234 courses « Dupont ». */
const TROUVES = Array.from({ length: 1234 }, (_, i) => ({ ref: 'ELA-25-01-D' + String(i).padStart(4, '0'), numero: 9000 + i,
  statut: 'realisee', date: '2025-01-15', heure: '09:00', client: 'Dupont ' + i, depart: 'Gare du Nord', arrivee: 'Orly',
  prix: 55, chauffeur: 'Serveur Bilal', provenance: '', essai: false }));

const erreurs = [];
const nav = await chromium.launch();
async function espace({ resume = 'ok', recherche = 'ok', lenteur = 0 } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    window.open = () => null;
  });
  const appels = { resume: [], courses: [] };
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/ela_registre_resume')) {
      const corps = JSON.parse(req.postData() || '{}'); appels.resume.push(corps);
      if (resume === 'absente') return route.fulfill(J({ message: 'absente' }, 404));
      if (resume === 'informe') return route.fulfill(J({ ok: true }));
      return route.fulfill(J(RESUME(corps.p_periode)));
    }
    if (u.includes('/rpc/ela_registre_courses')) {
      const corps = JSON.parse(req.postData() || '{}'); appels.courses.push(corps);
      if (recherche === 'absente') return route.fulfill(J({ message: 'absente' }, 404));
      /* La PREMIÈRE frappe répond lentement : sa réponse arrive après celle
         de la frappe suivante et doit être jetée. */
      if (lenteur && corps.p_q === 'dup') await new Promise(r => setTimeout(r, lenteur));
      const liste = corps.p_q === 'dup' ? TROUVES.slice(0, 3) : TROUVES;
      const d = corps.p_decalage || 0, l = corps.p_limite || 20;
      return route.fulfill(J({ total: corps.p_q === 'dup' ? 3 : liste.length, limite: l, decalage: d, courses: liste.slice(d, d + l) }));
    }
    if (u.includes('/rest/v1/courses')) {
      if (u.includes('select=ref')) return route.fulfill(J([{ ref: LOCAL[0].ref, version: 1, modifie_le: '2026-10-03T10:00:00Z' }]));
      if (m === 'GET') return route.fulfill(J(LOCAL.map(c => ({ bon: c, statut: c.statut, version: 1, modifie_le: '2026-10-03T10:00:00Z', cree_le: '2026-10-01T10:00:00Z' }))));
    }
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J([]));
    if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token: 'JETON2', refresh_token: 'R2' }));
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForFunction(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]').length >= 1000, null, { timeout: 15000 }).catch(() => {});
  await p.click('#btnRegistre');
  return { ctx, p, appels };
}
const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);

try {
  /* ── 1. LE SERVEUR RÉPOND : SES CHIFFRES, PAS CEUX DE L'APPAREIL ── */
  {
    const { ctx, p, appels } = await espace();
    await p.waitForFunction(() => /serveur/.test(document.getElementById('regSource').textContent), null, { timeout: 8000 }).catch(() => {});
    check('1 la semaine vient du serveur : 37 courses, pas les 1 000 de l\'appareil', (await texte(p, '#regCourses')) === '37', await texte(p, '#regCourses'));
    check('1 l\'encaissé vient du serveur : 4 321 €, pas 10 000 €', /^4\s?321\s?€$/.test(await texte(p, '#regCA')), await texte(p, '#regCA'));
    check('1 les chauffeurs viennent du serveur (Serveur Ahmed, 81 000 €)', /Serveur Ahmed/.test(await texte(p, '#regChauffeurs')) && /81\s?000\s?€/.test(await texte(p, '#regChauffeurs')));
    check('1 la commission que le serveur ne connaît pas est COMPTÉE à part, pas mise à zéro', /3 sans commission figée/.test(await texte(p, '#regChauffeurs')), await texte(p, '#regChauffeurs'));
    check('1 la provenance vient du serveur (812 demandes)', /812 demandes · 400 réalisées/.test(await texte(p, '#regProvenance')), await texte(p, '#regProvenance'));
    check('1 le délai vient du serveur (7 min, N° 4242)', /7 min/.test(await texte(p, '#regDelai')) && /N° 4242/.test(await texte(p, '#regDelai')), await texte(p, '#regDelai'));
    check('1 l\'écran dit d\'où viennent ses chiffres : le serveur, 52 340 courses', /serveur/.test(await texte(p, '#regSource')) && /52\s?340/.test(await texte(p, '#regSource')), await texte(p, '#regSource'));
    check('1 l\'écriteau des 1 000 courses se tait : les chiffres couvrent tout', await p.evaluate(() => document.getElementById('registreTronque').hidden));
    check('1 la liste des chauffeurs du filtre vient du serveur', await p.evaluate(() => [...document.querySelectorAll('#regFChauffeur option')].some(o => o.value === 'Serveur Bilal')));
    /* Changer de période redemande au serveur, avec la période. */
    await p.click('.periode[data-periode="mois"]');
    await p.waitForTimeout(500);
    check('1 « Mois » redemande le résumé au serveur, avec la période', appels.resume.some(c => c.p_periode === 'mois'), JSON.stringify(appels.resume));
    check('1 le résultat par mois est celui du serveur (octobre 2026)', /octobre 2026/.test(await texte(p, '#regResultat')), await texte(p, '#regResultat'));

    /* ── 2. LA RECHERCHE SUR TOUTE LA BASE ── */
    await p.fill('#regRecherche', 'dupont');
    await p.waitForFunction(() => /sur le serveur/.test(document.getElementById('regResultatsCompte').textContent), null, { timeout: 8000 }).catch(() => {});
    check('2 le vrai total du serveur : 1 234 courses, dont 20 affichées', /1\s?234 courses trouvées sur le serveur · 20 affichées/.test(await texte(p, '#regResultatsCompte')), await texte(p, '#regResultatsCompte'));
    check('2 vingt lignes, pas mille', await p.locator('#regResultats .reg-ligne').count() === 20);
    check('2 une course que l\'appareil n\'a pas est trouvée (N° 9000 · Dupont 0), avec sa date', /N° 9000 · Dupont 0/.test(await texte(p, '#regResultats')) && /15\/01\/2025/.test(await texte(p, '#regResultats')));
    await p.click('#regPlus');
    await p.waitForFunction(() => document.querySelectorAll('#regResultats .reg-ligne').length >= 40, null, { timeout: 8000 }).catch(() => {});
    check('2 « Afficher les suivantes » demande la page d\'après (décalage 20)', appels.courses.some(c => c.p_decalage === 20 && c.p_q === 'dupont'), JSON.stringify(appels.courses.map(c => c.p_decalage)));
    check('2 … et l\'ajoute à la liste (40 lignes)', await p.locator('#regResultats .reg-ligne').count() === 40);
    /* Les filtres partent dans la requête. */
    await p.selectOption('#regFStatut', 'realisee');
    await p.selectOption('#regFChauffeur', 'Serveur Bilal');
    await p.selectOption('#regFPeriode', 'mois-1');
    await p.waitForTimeout(600);
    const der = appels.courses[appels.courses.length - 1] || {};
    const m1 = new Date(auj.getFullYear(), auj.getMonth() - 1, 1), f1 = new Date(auj.getFullYear(), auj.getMonth(), 0);
    check('2 statut, chauffeur et période partent au serveur', der.p_statut === 'realisee' && der.p_chauffeur === 'Serveur Bilal'
      && der.p_debut === iso(m1) && der.p_fin === iso(f1), JSON.stringify(der));
    await p.selectOption('#regFPeriode', 'un-mois');
    check('2 « Un mois précis » montre son champ', await p.isVisible('#regFMois'));
    await p.fill('#regFMois', '2025-01');
    await p.dispatchEvent('#regFMois', 'change');
    await p.waitForTimeout(600);
    const der2 = appels.courses[appels.courses.length - 1] || {};
    check('2 … et part en bornes du 1er au 31 janvier 2025', der2.p_debut === '2025-01-01' && der2.p_fin === '2025-01-31', JSON.stringify(der2));
    const pr = await p.evaluate(() => ({ larg: document.documentElement.scrollWidth, vue: window.innerWidth }));
    check('2 aucun débordement horizontal à 390 px avec les filtres', pr.larg <= pr.vue, JSON.stringify(pr));
    check('2 aucun téléphone dans la liste trouvée', !/06 00 00/.test(await texte(p, '#regResultats')));
    await ctx.close();
  }
  /* ── 2 bis. UNE RÉPONSE LENTE D'UNE FRAPPE ANCIENNE EST JETÉE ── */
  {
    const { ctx, p } = await espace({ lenteur: 1500 });
    await p.fill('#regRecherche', 'dup');
    await p.waitForTimeout(400);
    await p.fill('#regRecherche', 'dupont');
    await p.waitForTimeout(2200);
    check('2b la réponse lente de « dup » (3) ne remplace pas celle de « dupont » (1 234)', /1\s?234 courses/.test(await texte(p, '#regResultatsCompte')), await texte(p, '#regResultatsCompte'));
    await ctx.close();
  }
  /* ── 3. LE SERVEUR NE RÉPOND PAS : L'APPAREIL, ET L'ÉCRAN LE DIT ── */
  for (const cas of ['absente', 'informe']) {
    const { ctx, p } = await espace({ resume: cas, recherche: 'absente' });
    await p.waitForTimeout(1500);
    check(`3 (${cas}) la semaine vient de l'appareil : 1 000 courses, 10 000 €`, (await texte(p, '#regCourses')) === '1000' && /^10\s?000\s?€$/.test(await texte(p, '#regCA')),
      (await texte(p, '#regCourses')) + ' / ' + (await texte(p, '#regCA')));
    check(`3 (${cas}) l'écran dit que l'appareil a compté`, /cet appareil/.test(await texte(p, '#regSource')), await texte(p, '#regSource'));
    check(`3 (${cas}) l'écriteau des 1 000 courses parle`, await p.evaluate(() => !document.getElementById('registreTronque').hidden));
    await p.fill('#regRecherche', 'local 99');
    await p.waitForTimeout(800);
    check(`3 (${cas}) la recherche reste sur l'appareil et le dit`, /sur cet appareil/.test(await texte(p, '#regResultatsCompte')) && /Local 99/.test(await texte(p, '#regResultats')),
      await texte(p, '#regResultatsCompte'));
    await ctx.close();
  }
} finally {
  await nav.close(); serveur.close();
}
check('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
console.log(`\n=== test-admin-registre-serveur : ${ok.length} réussis, ${ko.length} échecs ===`);
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
