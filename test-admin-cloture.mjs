/* =====================================================================
   TEST-ADMIN-CLOTURE.MJS — fermer une course, la rouvrir, et voir celles
   qui n'ont pas de chauffeur
   ---------------------------------------------------------------------
   3 octobre 2026, audit de l'admin. Deux défauts pouvaient faire oublier
   une course :
   - « Terminée » fermait d'un seul appui une course À VENIR, collé à
     « Appeler », et rien ne la rouvrait ;
   - une course confirmée SANS chauffeur ne se distinguait pas des autres,
     et « Prévenir le client » partait avec un chauffeur vide.
   Décisions de Barbaros : « seconde appui » avant l'heure de départ, et
   une saisie sans chauffeur reste confirmée, avec un repère.

   ÉPROUVÉ SUR LE SITE CONSTRUIT : la connexion par e-mail et le
   cloisonnement n'existent que là. On lit ce qui PART au serveur, pas
   l'état interne : c'est ce que la réception et le client relisent.

   Lancer :  node test-admin-cloture.mjs
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
await new Promise(r => serveur.listen(8089, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8089';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

/* Les dates sont posées à l'heure de Paris, relatives à maintenant : une
   course « à venir » l'est quel que soit le jour où la suite tourne. */
const paris = min => { const s = new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); return [s.slice(0, 10), s.slice(11, 16)]; };
const jour = (n, h) => [paris(n * 1440)[0], h];
const course = (ref, statut, [date, heure], extra = {}) => Object.assign({ ref, statut, version: 1,
  cree: new Date(Date.now() - 3600e3).toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', date, heure, vehicule: 'Berline', vehiculeCle: 'berline',
    passagers: '2 passagers', vol: '' },
  client: { nom: 'Client ' + ref.slice(-5), telephone: '06 12 34 56 78' }, prix: { total: 70 }, langue: 'fr' }, extra);
const ALI = { nom: 'Ali Ben', telephone: '06 11 22 33 44' };
const JEU = [
  course('ELA-26-10-FUTUR', 'confirmee', jour(2, '10:00')),
  course('ELA-26-10-AVECC', 'confirmee', jour(3, '11:00'), { chauffeur: { nom: 'Mehmet Yilmaz', telephone: '06 98 76 54 32' } }),
  course('ELA-26-10-PASSE', 'confirmee', jour(-1, '09:00'), { chauffeur: ALI }),
  course('ELA-26-10-PASS2', 'confirmee', jour(-1, '15:00'), { chauffeur: ALI }),
  course('ELA-26-10-FAITE', 'realisee', jour(-2, '08:00'), { chauffeur: ALI,
    commissionFigee: { montant: 7, taux: 10, mode: 'pct', source: 'canal', le: '2026-10-01T08:00:00Z' } }),
  course('ELA-26-10-FACTU', 'realisee', jour(-3, '08:00'), { chauffeur: ALI, factureNum: 'F-2026-0001' }),
];

let ecritures = []; const erreurs = [];
const nav = await chromium.launch();
async function espace(chemin = '/ela-admin/') {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R' }));
    window.__liens = []; window.open = u => { window.__liens.push(u); return null; };
  });
  const donnees = JSON.parse(JSON.stringify(JEU));
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
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + chemin);
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p.waitForTimeout(700);
  return { ctx, p };
}
const surBon = p => p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, { timeout: 8000 }).catch(() => {});
const ecrit = (ref, statut) => ecritures.filter(e => e.ref === ref && (!statut || e.statut === statut));

try {
  /* 1. LE TABLEAU DE BORD MONTRE CE QUI N'A PAS DE CHAUFFEUR. */
  {
    const { ctx, p } = await espace();
    const ec = p.locator('#bordSansChauffeur');
    const texte = (await ec.textContent().catch(() => '')) || '';
    check('un écriteau signale la course confirmée sans chauffeur', await ec.isVisible() && /^1 course/.test(texte), texte);
    await ec.click().catch(() => {}); await p.waitForTimeout(250);
    check('il emmène aux courses à assurer',
      await p.locator('.compteur[data-filtre="confirmee"]').evaluate(b => b.classList.contains('actif')));
    /* La suite ne dépend pas de l'écriteau pour continuer : sans lui (ancien
       code), chaque contrôle qui suit doit tomber pour SA raison, pas sur un
       délai d'attente qui cacherait les autres. */
    await p.click('.compteur[data-filtre="confirmee"]'); await p.waitForTimeout(250);
    const carte = ref => p.locator('#listeBord .demande').filter({ hasText: ref }).first();
    const texteDe = l => l.innerText({ timeout: 3000 }).catch(() => '');
    check('la carte sans chauffeur porte « Sans chauffeur »',
      (await carte('ELA-26-10-FUTUR').locator('.d-ch-manque').count()) === 1);
    check('la carte avec chauffeur porte son nom',
      /Mehmet Yilmaz/.test(await texteDe(carte('ELA-26-10-AVECC'))) && (await carte('ELA-26-10-AVECC').locator('.d-ch-manque').count()) === 0);
    /* La pastille est À CÔTÉ de la référence, pas dedans : `.d-ref` se lit
       comme la référence seule (test-nouveau-exploitant la lit ainsi). */
    const refLue = await carte('ELA-26-10-FUTUR').locator('.d-ref').textContent({ timeout: 3000 }).catch(() => '');
    check('la référence reste seule dans son champ', refLue === 'ELA-26-10-FUTUR', refLue);

    /* 2. « TERMINÉE » AVANT L'HEURE : DEUX APPUIS, ET UN DOUBLE APPUI NE COMPTE PAS. */
    ecritures = [];
    const b = carte('ELA-26-10-FUTUR').locator('.d-clore');
    await b.dblclick({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(300);
    check('avant l\'heure, un double appui sur « Terminée » ne ferme rien', ecrit('ELA-26-10-FUTUR').length === 0,
      JSON.stringify(ecritures.map(e => e.ref + ':' + e.statut)));
    const libelle = await b.textContent({ timeout: 3000 }).catch(() => '(bouton absent)');
    check('il demande un second appui, en clair', /Confirmer/.test(libelle), libelle);
    /* La liste se redessine seule (sonde, relecture) : l'armement doit y
       survivre, sinon le second appui ré-arme au lieu de fermer. */
    await p.click('.compteur[data-filtre="confirmee"]', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    const apres = await b.textContent({ timeout: 3000 }).catch(() => '(bouton absent)');
    check('l\'armement survit à un redessin de la liste', /Confirmer/.test(apres), apres);
    await p.waitForTimeout(500);
    await b.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    check('un second appui délibéré la ferme', ecrit('ELA-26-10-FUTUR', 'realisee').length === 1);

    /* 3. APRÈS L'HEURE, UN SEUL APPUI SUFFIT : LE GESTE DU SOIR. MAIS UN
       DOUBLE APPUI NE FERME PAS DEUX COURSES : mesuré sur l'ancien code, la
       carte fermée disparaît et le second appui tombe sur le « Terminée »
       d'une autre course, qui se fermait aussi. */
    await p.waitForTimeout(800);
    ecritures = [];
    await carte('ELA-26-10-PASSE').locator('.d-clore').dblclick({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    check('après l\'heure de départ, un appui ferme la course', ecrit('ELA-26-10-PASSE', 'realisee').length === 1);
    check('un double appui ne ferme aucune autre course', ecritures.filter(e => e.ref !== 'ELA-26-10-PASSE').length === 0,
      JSON.stringify(ecritures.map(e => e.ref + ':' + e.statut)));
    await p.waitForTimeout(800);
    ecritures = [];
    await carte('ELA-26-10-PASS2').locator('.d-clore').click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    check('l\'appui suivant, délibéré, ferme la course visée', ecrit('ELA-26-10-PASS2', 'realisee').length === 1);
    await ctx.close();
  }
  /* 4. SUR LA FICHE : « PRÉVENIR LE CLIENT » ATTEND UN CHAUFFEUR. */
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-FUTUR'); await surBon(p);
    check('sans chauffeur, « Prévenir le client » est caché', await p.locator('#btnPrevenirClient').isHidden());
    await p.fill('#bbChauffeurNom', 'Mehmet Yilmaz'); await p.fill('#bbChauffeurTel', '06 98 76 54 32'); await p.waitForTimeout(200);
    check('dès qu\'un chauffeur est saisi, il apparaît', await p.locator('#btnPrevenirClient').isVisible());
    ecritures = [];
    await p.click('#btnPrevenirClient', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    const lien = decodeURIComponent(await p.evaluate(() => window.__liens[0] || ''));
    check('le message porte le nom du chauffeur', lien.includes('Mehmet Yilmaz'), lien.slice(0, 120));
    const e = ecrit('ELA-26-10-FUTUR').pop();
    check('et le chauffeur est enregistré sur la course avant l\'envoi',
      !!e && e.bon && e.bon.chauffeur && e.bon.chauffeur.nom === 'Mehmet Yilmaz', JSON.stringify(e && e.bon && e.bon.chauffeur));

    /* 5. « MARQUER COMME RÉALISÉE » AVANT L'HEURE : DEUX APPUIS AUSSI. */
    ecritures = [];
    await p.click('#btnRealisee', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    check('avant l\'heure, « Marquer comme réalisée » demande un second appui',
      ecrit('ELA-26-10-FUTUR', 'realisee').length === 0 && await p.locator('#realEtat').isVisible());
    await p.waitForTimeout(800);
    await p.click('#btnRealisee', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    check('le second appui la marque réalisée', ecrit('ELA-26-10-FUTUR', 'realisee').length === 1);
    await ctx.close();
  }
  /* 6. UNE COURSE FERMÉE PAR ERREUR SE ROUVRE, SAUF SI ELLE EST FACTURÉE. */
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-FAITE'); await surBon(p);
    check('une course réalisée propose « Remettre en confirmée »', await p.locator('#btnRouvrir').isVisible());
    ecritures = [];
    await p.dblclick('#btnRouvrir', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    check('un double appui ne rouvre rien', ecrit('ELA-26-10-FAITE').length === 0,
      JSON.stringify(ecritures.map(e => e.ref + ':' + e.statut)));
    await p.waitForTimeout(800);
    await p.click('#btnRouvrir', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400);
    const e = ecrit('ELA-26-10-FAITE').filter(x => x.statut === 'confirmee').pop();
    check('le second appui la remet en confirmée, même référence', !!e && e.statut === 'confirmee', JSON.stringify(e && e.statut));
    check('la commission figée est levée, elle se refigera à la vraie fin',
      !!e && e.bon && !e.bon.commissionFigee, JSON.stringify(e && e.bon && e.bon.commissionFigee));
    check('la fiche dit « Confirmée »', (await p.textContent('#bbEtat')) === 'Confirmée');
    await ctx.close();
  }
  {
    const { ctx, p } = await espace('/ela-admin/?ref=ELA-26-10-FACTU'); await surBon(p);
    ecritures = [];
    await p.click('#btnRouvrir', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(800);
    await p.click('#btnRouvrir', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
    check('une course déjà facturée ne se rouvre pas, et on le dit',
      ecrit('ELA-26-10-FACTU').length === 0 && /facture/.test(await p.textContent('#rouvrirEtat', { timeout: 3000 }).catch(() => '')), await p.textContent('#rouvrirEtat', { timeout: 3000 }).catch(() => ''));
    await ctx.close();
  }
  check('aucune erreur JavaScript', !erreurs.length, erreurs.slice(0, 3).join(' | '));
} catch (e) {
  ko.push('PLANTAGE — ' + e.message.split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
for (const x of ok) console.log('  ok  ' + x);
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); for (const x of ko) console.log('  KO  ' + x); }
console.log('\n=== ' + ok.length + ' contrôles au vert, ' + ko.length + ' en échec ===');
process.exit(ko.length ? 1 : 0);
