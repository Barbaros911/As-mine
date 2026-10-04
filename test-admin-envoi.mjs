/* =====================================================================
   TEST-ADMIN-ENVOI.MJS — ce que le bon envoie au serveur, et quand
   ---------------------------------------------------------------------
   4 octobre 2026, audit de l'admin, trois défauts de la même famille :
   - P1-2 : une course modifiée PENDANT son propre envoi perdait la seconde
     modification — l'accusé du premier envoi la retirait de la file ;
   - P1-3 : « Retour » réécrivait la course même sans aucun changement ;
   - P1-4 : changer le chauffeur d'une course CONFIRMÉE par « Retour »
     contournait le contrôle des papiers (et de la dette) de « Confirmer ».
   Plus un constat de la relecture : un refus restait affiché sous le bon
   après qu'on avait corrigé le nom.

   On lit ce qui PART au serveur, pas l'état interne : c'est ce que la
   réception, le client et les autres appareils relisent. Le faux serveur
   tient des versions, comme le vrai (PATCH « version=eq.N »).

   ÉPROUVÉ SUR LE SITE CONSTRUIT (port 8132, propre à cette suite).
   Lancer :  node test-admin-envoi.mjs
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
await new Promise(r => serveur.listen(8132, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8132';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const attendre = ms => new Promise(r => setTimeout(r, ms));

const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const course = (ref, statut, chauffeur) => ({ ref, statut,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', date: paris(2 * 1440), heure: '10:00',
    vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr',
  ...(chauffeur ? { chauffeur } : {}) });
const ALI = { nom: 'Ali Ben', telephone: '06 11 22 33 44' };
const DEPART = [
  course('ELA-26-10-CONF1', 'confirmee', ALI),
  course('ELA-26-10-ATTN1', 'attente'),
  course('ELA-26-10-LENT1', 'attente'),
  course('ELA-26-10-SANSC', 'confirmee'),
];
const AN_PROCHAIN = paris(400 * 1440), HIER = paris(-1440);
const CARNET = [
  { id: 'c1', nom: 'Ali Ben', telephone: '06 11 22 33 44', carteFin: AN_PROCHAIN, registreFin: AN_PROCHAIN, assuranceFin: AN_PROCHAIN },
  { id: 'c2', nom: 'Mehmet Valide', telephone: '06 55 66 77 88', carteFin: AN_PROCHAIN, registreFin: AN_PROCHAIN, assuranceFin: AN_PROCHAIN },
  { id: 'c3', nom: 'Pierre Perime', telephone: '06 99 88 77 66', carteFin: AN_PROCHAIN, registreFin: AN_PROCHAIN, assuranceFin: HIER },
];

/* Le faux serveur, avec ses versions. */
const base = {}; for (const c of DEPART) base[c.ref] = { bon: JSON.parse(JSON.stringify(c)), statut: c.statut, version: 1 };
const ecritures = []; const lenteur = {};
const erreurs = [];
const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
await ctx.addInitScript(({ c, ch }) => {
  if (sessionStorage.getItem('__pose')) return;
  sessionStorage.setItem('__pose', '1');
  localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R', user: { id: 'u-barbaros' } }));
  localStorage.setItem('ela_chauffeurs', JSON.stringify(ch));
  localStorage.setItem('ela_bookings', JSON.stringify(c));
}, { c: DEPART, ch: CARNET });
await ctx.addInitScript(() => { window.__liens = []; window.open = u => { window.__liens.push(u); return null; }; });
await ctx.route('**/*', async route => {
  const req = route.request(), u = req.url(), m = req.method();
  if (u.startsWith(BASE)) return route.continue();
  if (!u.includes('supabase.co')) return route.abort();
  if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
  if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
  if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J([]));
  if (!u.includes('/rest/v1/courses')) return route.fulfill(J([]));
  const ref = decodeURIComponent((u.match(/ref=eq\.([^&]+)/) || [])[1] || '');
  if (m === 'GET') {
    const lignes = Object.values(base).map(l => ({ bon: l.bon, statut: l.statut, version: l.version, modifie_le: '2026-10-04T08:00:00Z', cree_le: l.bon.cree }));
    if (u.includes('select=ref')) return route.fulfill(J(lignes.slice(0, 1).map(l => ({ ref: l.bon.ref, version: l.version }))));
    if (ref) return route.fulfill(J(lignes.filter(l => l.bon.ref === ref)));
    return route.fulfill(J(lignes));
  }
  let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
  if (m === 'PATCH') {
    const v = Number((u.match(/version=eq\.(\d+)/) || [])[1]);
    ecritures.push({ ref, bon: corps.bon, statut: corps.statut, version: v, t: Date.now() });
    if (lenteur[ref]) { const d = lenteur[ref]; delete lenteur[ref]; await attendre(d); }
    const l = base[ref];
    if (!l || l.version !== v) return route.fulfill(J([]));
    l.bon = corps.bon; l.statut = corps.statut; l.version++;
    return route.fulfill(J([{ version: l.version, cree_le: l.bon.cree }]));
  }
  return route.fulfill(J([]));
});
const p = await ctx.newPage();
p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
await p.goto(BASE + '/ela-admin/');
await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
await p.waitForTimeout(1500);

const surBon = () => p.waitForFunction(() => { const e = document.getElementById('ecran-bord-bon'); return e && e.classList.contains('actif'); }, null, { timeout: 8000 }).then(() => true, () => false);
const surBord = () => p.waitForFunction(() => { const e = document.getElementById('ecran-bord'); return e && e.classList.contains('actif'); }, null, { timeout: 8000 }).then(() => true, () => false);
/* Ouvrir le bon comme Barbaros : appui sur la carte du tableau de bord. */
async function ouvrirBon(ref, filtre) {
  if (filtre) { await p.click(`.compteur[data-filtre="${filtre}"]`).catch(() => {}); await p.waitForTimeout(250); }
  await p.locator('#listeBord .demande').filter({ hasText: ref }).first().locator('.d-ref').click({ timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(800); /* la garde de 700 ms après une fermeture */
  return surBon();
}
const ecritesPour = ref => ecritures.filter(e => e.ref === ref);
const saisir = (sel, v) => p.fill(sel, v, { timeout: 5000 }).catch(() => {});
const etatMsg = () => p.evaluate(() => { const e = document.getElementById('confirmerEtat'); return e && !e.hidden ? e.textContent.trim() : ''; });

try {
  /* P1-3. RETOUR SANS CHANGEMENT : RIEN NE PART. */
  {
    check('P1-3 : le bon s\'ouvre', await ouvrirBon('ELA-26-10-ATTN1'));
    await p.click('#btnRetourBord'); await surBord(); await p.waitForTimeout(1500);
    check('P1-3 : « Retour » sans changement n\'écrit rien au serveur', ecritesPour('ELA-26-10-ATTN1').length === 0,
      String(ecritesPour('ELA-26-10-ATTN1').length) + ' écriture(s)');
  }

  /* P1-4. CHAUFFEUR CHANGÉ SUR UNE COURSE CONFIRMÉE : MÊME CONTRÔLE QUE « CONFIRMER ». */
  {
    check('P1-4 : le bon confirmé s\'ouvre', await ouvrirBon('ELA-26-10-CONF1', 'confirmee'));
    await saisir('#bbChauffeurNom', 'Pierre Perime');
    await saisir('#bbChauffeurTel', '06 99 88 77 66');
    await p.click('#btnRetourBord'); await p.waitForTimeout(1200);
    const resteSurBon = await p.evaluate(() => document.getElementById('ecran-bord-bon').classList.contains('actif'));
    check('P1-4 : un chauffeur aux papiers périmés n\'est pas enregistré par « Retour »',
      !ecritesPour('ELA-26-10-CONF1').some(e => e.bon && e.bon.chauffeur && /Pierre/.test(e.bon.chauffeur.nom)),
      JSON.stringify(ecritesPour('ELA-26-10-CONF1').map(e => e.bon && e.bon.chauffeur && e.bon.chauffeur.nom)));
    check('P1-4 : on reste sur le bon', resteSurBon);
    const msg = await etatMsg();
    check('P1-4 : et on dit pourquoi', /périmé/i.test(msg), msg);
    /* Sur l'ancien code le bon s'est refermé : on le rouvre, pour que la
       suite éprouve encore les points suivants au lieu de s'arrêter ici. */
    if (!resteSurBon) await ouvrirBon('ELA-26-10-CONF1', 'confirmee');
    /* Relecture : le refus s'efface dès qu'on change le nom. */
    await saisir('#bbChauffeurNom', 'Mehmet Valide'); await p.waitForTimeout(150);
    check('le refus s\'efface dès qu\'on change le nom', !(await etatMsg()), await etatMsg());
    await saisir('#bbChauffeurTel', '06 55 66 77 88');
    await p.click('#btnRetourBord'); await surBord(); await p.waitForTimeout(1500);
    check('P1-4 : un chauffeur en règle passe, et part au serveur',
      ecritesPour('ELA-26-10-CONF1').some(e => e.bon && e.bon.chauffeur && e.bon.chauffeur.nom === 'Mehmet Valide'));
  }

  /* Sur une course EN ATTENTE, le nom n'est qu'une note : pas de contrôle. */
  {
    await ouvrirBon('ELA-26-10-ATTN1', 'attente');
    await saisir('#bbChauffeurNom', 'Pierre Perime');
    await p.click('#btnRetourBord'); await surBord(); await p.waitForTimeout(1500);
    check('sur une course en attente, le nom est enregistré (une note, pas une attribution)',
      ecritesPour('ELA-26-10-ATTN1').some(e => e.bon && e.bon.chauffeur && e.bon.chauffeur.nom === 'Pierre Perime'));
  }

  /* LE CAS EXACT DE LA RELECTURE : « Prévenir le client » refuse un
     chauffeur aux papiers périmés, on corrige, et le refus restait affiché
     sous le bouton alors que le message était parti. */
  {
    await ouvrirBon('ELA-26-10-SANSC', 'confirmee');
    await saisir('#bbChauffeurNom', 'Pierre Perime');
    await saisir('#bbChauffeurTel', '06 99 88 77 66');
    await p.click('#btnPrevenirClient', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(300);
    const refus = await etatMsg();
    check('« Prévenir » refuse le chauffeur aux papiers périmés', /périmé/i.test(refus) && (await p.evaluate(() => window.__liens.length)) === 0, refus);
    await saisir('#bbChauffeurNom', 'Mehmet Valide');
    await saisir('#bbChauffeurTel', '06 55 66 77 88');
    await p.click('#btnPrevenirClient', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(300);
    check('après correction, le message part', (await p.evaluate(() => window.__liens.length)) === 1);
    check('et le refus n\'est plus affiché', !(await etatMsg()), await etatMsg());
    await p.click('#btnRetourBord').catch(() => {}); await surBord();
  }

  /* P1-2. UNE COURSE MODIFIÉE PENDANT SON PROPRE ENVOI. */
  {
    lenteur['ELA-26-10-LENT1'] = 3000;
    await ouvrirBon('ELA-26-10-LENT1', 'attente');
    await saisir('#bbChauffeurNom', 'Ali Ben');
    await saisir('#bbChauffeurTel', '06 11 22 33 44');
    await p.click('#btnRetourBord'); await surBord();
    await p.waitForTimeout(300); /* le premier envoi est parti, et il traîne */
    check('P1-2 : le premier envoi est bien en route', ecritesPour('ELA-26-10-LENT1').length === 1);
    await ouvrirBon('ELA-26-10-LENT1', 'attente');
    await saisir('#bbComValeur', '15');
    await p.click('#btnRetourBord'); await surBord();
    /* On laisse le temps au premier envoi de revenir, puis au second. */
    await p.waitForTimeout(7000);
    const l = base['ELA-26-10-LENT1'];
    const commission = l.bon && l.bon.commission;
    check('P1-2 : la modification faite pendant l\'envoi arrive au serveur',
      !!commission && Number(commission.valeur) === 15, JSON.stringify(commission));
    check('P1-2 : la première aussi', l.bon && l.bon.chauffeur && l.bon.chauffeur.nom === 'Ali Ben');
    const file = await p.evaluate(() => localStorage.getItem('ela_file'));
    check('P1-2 : la file est vide à la fin', !file || file === '{}', file);
  }

  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
} catch (e) {
  ko.push('PLANTAGE : ' + (e && e.message ? e.message.split('\n')[0] : e));
} finally {
  await nav.close();
  serveur.close();
}

console.log(`\n=== ${ok.length} contrôles au vert, ${ko.length} en échec ===`);
for (const k of ko) console.log('  ✘ ' + k);
for (const o of ok) console.log('  ✔ ' + o);
process.exit(ko.length ? 1 : 0);
