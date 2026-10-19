/* =====================================================================
   TEST-ADMIN-DELAI.MJS — le délai de confirmation, au registre
   ---------------------------------------------------------------------
   19 octobre 2026, à la demande de Barbaros (audit des priorités : « le
   vrai levier de conversion après le formulaire, c'est la vitesse de
   réponse »). Le client ne paie qu'après la confirmation : une demande qui
   attend 40 minutes est un client qui réserve ailleurs.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT (/ela-admin/) :
   1. le registre dit le délai MÉDIAN, la part confirmée en moins de 15 min,
      la plus longue (par son N°) et les demandes encore sans réponse — sur
      la période en cours, et seulement pour les demandes DÉPOSÉES PAR LE
      SITE : une saisie de l'exploitant, une course d'essai, une course
      confirmée avant le 19/10 (sans heure) ne comptent pas ;
   2. « Confirmer » pose l'heure de la confirmation sur la course, et elle
      PART au serveur avec le bon ;
   3. « Remettre en confirmée » ne la touche pas : ni elle ne la réécrit,
      ni elle n'en invente une à une course rouverte qui n'en avait pas.
   Les attendus sont recalculés à la main, jamais relus sur l'écran.

   L'HORLOGE EST FIGÉE pour la partie 1 seulement (mercredi 21/10/2026,
   15 h à Paris) : « cette semaine » ne dépend plus du jour où la suite
   tourne. Les parties 2 et 3 gardent l'heure réelle — le double appui de
   « Remettre en confirmée » exige 700 ms entre deux appuis, qu'une horloge
   figée ne laisserait jamais passer.

   Port 8173, propre à cette suite. Lancer : node test-admin-delai.mjs
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
await new Promise(r => serveur.listen(8173, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8173';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

/* Une demande déposée par le site porte l'empreinte que pose
   « deposer-course » ; une saisie de l'exploitant n'en porte pas. */
const SITE = { securite: { empreinteDepot: 'e'.repeat(64), prixServeurVerifie: false } };
const min = (iso, m) => new Date(Date.parse(iso) + m * 60000).toISOString();
const course = (ref, statut, cree, extra = {}) => Object.assign({ ref, statut, version: 1, cree,
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: '2026-10-30', heure: '10:00',
    vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-4), telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr' }, extra);

/* Partie 1 : mercredi 21/10/2026, 15 h à Paris. Lundi 19/10 à 0 h ouvre la
   semaine ; le 1er octobre ouvre le mois. */
const MAINTENANT = new Date('2026-10-21T15:00:00+02:00');
const D1 = '2026-10-19T08:00:00+02:00', D2 = '2026-10-20T10:00:00+02:00', D3 = '2026-10-20T22:00:00+02:00',
      D4 = '2026-10-21T01:00:00+02:00', VX = '2026-10-18T20:00:00+02:00';
const JEU_REGISTRE = [
  course('ELA-26-10-DEL01', 'confirmee', D1, { ...SITE, confirmeeLe: min(D1, 4) }),
  course('ELA-26-10-DEL02', 'realisee', D2, { ...SITE, confirmeeLe: min(D2, 10) }),
  course('ELA-26-10-DEL03', 'confirmee', D3, { ...SITE, confirmeeLe: min(D3, 25) }),
  course('ELA-26-10-DEL04', 'confirmee', D4, { ...SITE, numero: 1042, confirmeeLe: min(D4, 130) }),
  // Ne comptent pas : une saisie de l'exploitant, une course d'essai, une
  // course confirmée avant la mesure (sans heure).
  course('ELA-26-10-SAISI', 'confirmee', D1, { confirmeeLe: min(D1, 300) }),
  course('ELA-26-10-ESSAI', 'confirmee', D1, { ...SITE, essai: true, confirmeeLe: min(D1, 540) }),
  course('ELA-26-10-AVANT', 'confirmee', D2, { ...SITE }),
  // Encore sans réponse.
  course('ELA-26-10-ATTEN', 'attente', '2026-10-21T14:50:00+02:00', { ...SITE }),
  // La semaine dernière, mais ce mois-ci : 7 h.
  course('ELA-26-10-VIEUX', 'confirmee', VX, { ...SITE, confirmeeLe: min(VX, 420) }),
];

let ecritures = []; const erreurs = [];
const nav = await chromium.launch();
async function espace(jeu, { horloge } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    window.open = () => null;
  });
  const donnees = JSON.parse(JSON.stringify(jeu));
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/presences_operateurs')) return route.fulfill(J([]));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token: 'JETON2', refresh_token: 'R2', email: 'test@ela.fr' }));
    if (u.includes('/rest/v1/courses')) {
      if (u.includes('select=ref')) return route.fulfill(J(donnees.slice(0, 1).map(c => ({ ref: c.ref, version: c.version, modifie_le: '2026-10-03T10:00:00Z' }))));
      if (m === 'GET') return route.fulfill(J(donnees.map(c => ({ bon: c, statut: c.statut, version: c.version, modifie_le: '2026-10-03T10:00:00Z', cree_le: c.cree }))));
      const ref = decodeURIComponent((u.match(/ref=eq\.([^&]+)/) || [])[1] || '');
      let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
      if (Array.isArray(corps)) corps = corps[0] || {};
      ecritures.push({ methode: m, ref: ref || corps.ref, statut: corps.statut, bon: corps.bon });
      const c = donnees.find(x => x.ref === (ref || corps.ref));
      if (m === 'PATCH' && c) { Object.assign(c, corps.bon || {}, { statut: corps.statut || c.statut }); c.version++; return route.fulfill(J([{ version: c.version, cree_le: c.cree }])); }
      return route.fulfill(J([{ version: 1, cree_le: new Date().toISOString() }]));
    }
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  if (horloge) await p.clock.setFixedTime(horloge);
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForTimeout(800);
  return { ctx, p };
}
/* Les lignes du bloc, nom → valeur, lues comme Barbaros les lit. */
const lignesDelai = p => p.$$eval('#regDelai .reg-ligne', l => l.map(d => ({
  nom: (d.querySelector('.reg-nom')?.firstChild?.textContent || '').trim(),
  sous: (d.querySelector('.reg-sous')?.textContent || '').trim(),
  val: (d.querySelector('.reg-val')?.textContent || '').trim() })));
const ligne = (l, nom) => l.find(x => x.nom === nom) || {};
async function partie(nom, fn) {
  try { await fn(); } catch (e) { ko.push(`${nom} — plantage : ${String(e && e.message || e).split('\n')[0]}`); }
}

try {
  /* ── 1. LE REGISTRE DIT LE DÉLAI, SUR LES SEULES DEMANDES DU SITE ──
     Cette semaine : 4, 10, 25 et 130 min. Médiane (10 + 25) / 2 = 17,5 →
     18 min. En moins de 15 min : 2 sur 4. La plus longue : 2 h 10, N° 1042.
     Ce mois-ci, la course de dimanche s'ajoute (7 h) : 4, 10, 25, 130, 420
     → médiane 25 min, 2 sur 5, la plus longue 7 h. */
  await partie('1', async () => {
    const { ctx, p } = await espace(JEU_REGISTRE, { horloge: MAINTENANT });
    await p.click('#btnRegistre');
    await p.waitForFunction(() => document.getElementById('ecran-registre').classList.contains('actif'), null, { timeout: 8000 });
    await p.waitForTimeout(300);
    let l = await lignesDelai(p);
    check('1 le registre porte le bloc « Délai de confirmation »', await p.locator('#blocDelai').isVisible() && l.length > 0, JSON.stringify(l));
    check('1 cette semaine, le délai médian est de 18 min (4, 10, 25, 130)', ligne(l, 'Délai médian').val === '18 min', JSON.stringify(ligne(l, 'Délai médian')));
    check('1 il dit sur combien de demandes, et la période', /sur 4 demandes confirmées cette semaine/.test(ligne(l, 'Délai médian').sous), ligne(l, 'Délai médian').sous);
    check('1 2 sur 4 sont confirmées en moins de 15 min', ligne(l, 'Confirmées en moins de 15 min').val === '2 sur 4', JSON.stringify(l));
    check('1 la plus longue : 2 h 10, nommée par son N°', ligne(l, 'La plus longue').val === '2 h 10' && ligne(l, 'La plus longue').sous === 'N° 1042', JSON.stringify(ligne(l, 'La plus longue')));
    check('1 la demande encore sans réponse est comptée', ligne(l, 'Encore en attente').val === '1', JSON.stringify(ligne(l, 'Encore en attente')));
    check('1 ni la saisie, ni l\'essai, ni la course d\'avant la mesure ne comptent (aucune ne fait 5 h, 9 h ni 0 min)',
      !l.some(x => /5 h|9 h|moins d'1 min/.test(x.val)), JSON.stringify(l));
    await p.locator('.periode[data-periode="mois"]').first().click(); await p.waitForTimeout(300);
    l = await lignesDelai(p);
    check('1 ce mois-ci, la course de dimanche s\'ajoute : médiane 25 min, 2 sur 5, la plus longue 7 h',
      ligne(l, 'Délai médian').val === '25 min' && ligne(l, 'Confirmées en moins de 15 min').val === '2 sur 5' && ligne(l, 'La plus longue').val === '7 h',
      JSON.stringify(l));
    for (const L of [390, 320]) {
      await p.setViewportSize({ width: L, height: 844 }); await p.waitForTimeout(200);
      const deborde = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      check(`1 à ${L} px rien ne déborde`, !deborde);
    }
    await ctx.close();
  });

  /* ── 2. « CONFIRMER » POSE L'HEURE, ET ELLE PART AU SERVEUR ── */
  await partie('2', async () => {
    const cree = new Date(Date.now() - 12 * 60000).toISOString();
    const { ctx, p } = await espace([course('ELA-26-10-CONF1', 'attente', cree, { ...SITE })]);
    await p.goto(BASE + '/ela-admin/?ref=ELA-26-10-CONF1');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 10000 });
    await p.fill('#bbChauffeurNom', 'Ali Ben'); await p.fill('#bbChauffeurTel', '06 11 22 33 44');
    ecritures = [];
    const avant = Date.now();
    await p.click('#btnConfirmerCourse');
    await p.waitForTimeout(1500);
    const apres = Date.now();
    const local = await p.evaluate(() => (JSON.parse(localStorage.getItem('ela_bookings') || '[]').find(c => c.ref === 'ELA-26-10-CONF1') || {}).confirmeeLe || '');
    const t = Date.parse(local);
    check('2 « Confirmer » pose l\'heure de la confirmation sur la course', !isNaN(t) && t >= avant - 2000 && t <= apres + 2000, local);
    const partie2 = ecritures.filter(e => e.ref === 'ELA-26-10-CONF1' && e.statut === 'confirmee');
    check('2 elle part au serveur avec le bon', partie2.some(e => e.bon && e.bon.confirmeeLe === local), JSON.stringify(partie2.map(e => e.bon && e.bon.confirmeeLe)));
    await ctx.close();
  });

  /* ── 3. « REMETTRE EN CONFIRMÉE » NE TOUCHE PAS À L'HEURE ── */
  await partie('3', async () => {
    const cree = new Date(Date.now() - 3 * 864e5).toISOString();
    const heure = new Date(Date.parse(cree) + 6 * 60000).toISOString();
    const jeu = [
      course('ELA-26-10-ROUV1', 'realisee', cree, { ...SITE, confirmeeLe: heure, chauffeur: { nom: 'Ali Ben', telephone: '06 11 22 33 44' } }),
      course('ELA-26-10-ROUV2', 'realisee', cree, { ...SITE, chauffeur: { nom: 'Ali Ben', telephone: '06 11 22 33 44' } }),
    ];
    const { ctx, p } = await espace(jeu);
    for (const [ref, attendu] of [['ELA-26-10-ROUV1', heure], ['ELA-26-10-ROUV2', undefined]]) {
      await p.goto(BASE + '/ela-admin/?ref=' + ref);
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 10000 });
      ecritures = [];
      await p.click('#btnRouvrir'); await p.waitForTimeout(900); await p.click('#btnRouvrir'); await p.waitForTimeout(1500);
      const parti = ecritures.filter(e => e.ref === ref && e.statut === 'confirmee');
      const lu = parti.length ? parti[parti.length - 1].bon.confirmeeLe : '(rien n\'est parti)';
      check(`3 ${ref.slice(-5)} : rouverte, elle part « confirmée »`, parti.length > 0, JSON.stringify(ecritures.map(e => e.ref + ':' + e.statut)));
      check(`3 ${ref.slice(-5)} : ${attendu ? 'son heure de confirmation reste celle d\'origine' : 'aucune heure n\'est inventée'}`, lu === attendu, String(lu));
    }
    await ctx.close();
  });

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
} finally {
  await nav.close();
  serveur.close();
}

console.log(`\n=== test-admin-delai : ${ok.length} réussis, ${ko.length} échecs ===`);
ok.forEach(n => console.log('  ✓ ' + n));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(n => console.log('  ✗ ' + n)); }
process.exit(ko.length ? 1 : 0);
