/* =====================================================================
   TEST-ADMIN-SUSPENDU.MJS — l'accès agent est suspendu, et l'écran le dit
   ---------------------------------------------------------------------
   20 octobre 2026, décision de Barbaros. Le compte agent est passé en
   « actif = false » côté serveur (20261020000000_suspendre_acces_agent.sql) :
   est_exploitant() le refuse, et c'est le seul verrou. L'écran de connexion
   lit alors sa propre ligne « operateurs » et dit POURQUOI, au lieu de
   « vérifiez vos identifiants » — un mot de passe juste retapé dix fois.

   Ce qu'on éprouve, sur le site construit (la connexion par e-mail n'existe
   que là) :
   - mot de passe accepté, serveur qui refuse, ligne « actif = false » →
     le bloc « Accès agent suspendu » est visible, l'espace ne s'ouvre pas,
     la session est effacée, le message ordinaire est caché ;
   - même refus sans ligne lisible → le message ordinaire, pas le bloc ;
   - une session déjà ouverte que le serveur ferme → même bloc, espace fermé ;
   - un admin accepté → l'espace s'ouvre, le bloc reste caché ;
   - le motif se lit AVEC la session (en-tête Authorization), avant qu'elle
     soit effacée.
   Port 8134, propre à cette suite.

   Lancer :  node test-admin-suspendu.mjs
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
await new Promise(r => serveur.listen(8134, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8134';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const SESSION = (id = 'u-ami') => ({ access_token: 'JETON', refresh_token: 'R', token_type: 'bearer', user: { id } });

const erreurs = [];
const nav = await chromium.launch();

/* Le faux serveur. « exploitant » : ce que répond est_exploitant().
   « ligne » : ce que rend la lecture de « operateurs » (la ligne du compte,
   filtrée par le serveur), ou un code d'erreur. */
async function ouvrir({ session, acces, etat }) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session, acces }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    if (session) localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    if (acces) localStorage.setItem('ela_acces_verifie', acces);
  }, { session, acces });
  etat.vus = [];
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    const auth = req.headers()['authorization'] || '';
    if (u.includes('grant_type=password')) {
      etat.vus.push('connexion');
      return route.fulfill(J(SESSION()));
    }
    if (u.includes('/rpc/est_exploitant')) { etat.vus.push('est_exploitant:' + auth); return route.fulfill(J(etat.exploitant === true)); }
    if (u.includes('/rest/v1/operateurs')) {
      etat.vus.push('operateurs:' + auth + ':' + u.split('/rest/v1/')[1]);
      if (typeof etat.ligne === 'number') return route.fulfill({ status: etat.ligne, body: '' });
      return route.fulfill(J(etat.ligne));
    }
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok: true }));
    if (u.includes('/rest/v1/courses')) return route.fulfill(J([]));
    return route.fulfill(J([]));
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  return { ctx, p };
}
const bloc = p => p.evaluate(() => { const b = document.getElementById('accesSuspendu'); return b && !b.hidden && getComputedStyle(b).display !== 'none' ? b.innerText.replace(/\s+/g, ' ').trim() : ''; });
const ordinaire = p => p.evaluate(() => { const e = document.getElementById('codeErreur'); return e && !e.hidden ? e.textContent.trim() : ''; });
const espace = p => p.evaluate(() => document.body.classList.contains('espace'));
const session = p => p.evaluate(() => JSON.parse(localStorage.getItem('ela_nuage_session') || 'null'));
async function seConnecter(p) {
  await p.fill('#exploitantEmail', 'ami@exemple.com');
  await p.fill('#exploitantMdp', 'motdepasse');
  await p.click('#btnDeverrouiller');
  await p.waitForFunction(() => {
    const b = document.getElementById('accesSuspendu'), e = document.getElementById('codeErreur');
    return (b && !b.hidden) || (e && !e.hidden) || document.body.classList.contains('espace');
  }, null, { timeout: 8000 }).catch(() => {});
}

/* ─── 1. Le compte suspendu lit pourquoi ─── */
{
  const etat = { exploitant: false, ligne: [{ actif: false }] };
  const { ctx, p } = await ouvrir({ etat });
  await seConnecter(p);
  const texte = await bloc(p);
  check('1a. compte suspendu : le bloc « Accès agent suspendu » est visible', /Accès agent suspendu/.test(texte), texte || '(caché)');
  check('1b. il dit la vraie raison : le cloisonnement des données clients', /cloisonnement des données clients/.test(texte) && /pas encore terminé/.test(texte));
  check('1c. il ne met personne en cause : ni nom, ni « votre faute », ni argent', !/Barbaros|faute|payer|abonnement|€/i.test(texte));
  check('1d. le message ordinaire « vérifiez vos identifiants » est caché', (await ordinaire(p)) === '', await ordinaire(p));
  check('1e. l\'espace ne s\'ouvre pas', !(await espace(p)));
  check('1f. la session est effacée (le verrou reste le serveur)', (await session(p)) === null);
  const lecture = etat.vus.find(v => v.startsWith('operateurs:'));
  check('1g. le motif a été lu AVEC la session, avant son effacement', !!lecture && lecture.includes('Bearer JETON'), lecture || 'jamais lu');
  check('1h. la lecture ne demande que « actif », sur sa propre ligne', !!lecture && /select=actif/.test(lecture));
  const r = await p.locator('#accesSuspendu').boundingBox({ timeout: 2000 }).catch(() => null);
  check('1i. le bloc est dans l\'écran du téléphone (390×844)', !!r && r.y >= 0 && r.y + r.height <= 844 && r.width <= 390, JSON.stringify(r));
  await p.screenshot({ path: 'site/capture-agent-suspendu.png' }).catch(() => {});
  await ctx.close();
}

/* ─── 2. Un refus sans ligne lisible garde le message ordinaire ─── */
for (const [nom, ligne] of [['aucune ligne', []], ['ligne active (un autre motif de refus)', [{ actif: true }]], ['lecture refusée (403)', 403]]) {
  const etat = { exploitant: false, ligne };
  const { ctx, p } = await ouvrir({ etat });
  await seConnecter(p);
  check('2. ' + nom + ' : pas le bloc suspendu', (await bloc(p)) === '', await bloc(p));
  check('2. ' + nom + ' : le message ordinaire', /Connexion refusée/.test(await ordinaire(p)), await ordinaire(p));
  check('2. ' + nom + ' : l\'espace reste fermé', !(await espace(p)));
  await ctx.close();
}

/* ─── 3. Une session déjà ouverte que le serveur ferme ─── */
{
  /* 3-0. L'application rouverte (rechargement) avec une session gardée :
     le serveur refuse dès l'ouverture, l'écran dit pourquoi. */
  const etat0 = { exploitant: false, ligne: [{ actif: false }] };
  const { ctx: c0, p: p0 } = await ouvrir({ session: SESSION(), acces: 'u-ami', etat: etat0 });
  await p0.waitForFunction(() => { const b = document.getElementById('accesSuspendu'); return b && !b.hidden; }, null, { timeout: 8000 }).catch(() => {});
  check('3-0a. session gardée, serveur qui refuse à l\'ouverture : le bloc suspendu', /Accès agent suspendu/.test(await bloc(p0)), (await bloc(p0)) || (await ordinaire(p0)));
  check('3-0b. l\'espace ne s\'ouvre pas et la session est effacée', !(await espace(p0)) && (await session(p0)) === null);
  await c0.close();
}
{
  const etat = { exploitant: true, ligne: [{ actif: true }] };
  const { ctx, p } = await ouvrir({ session: SESSION(), acces: 'u-ami', etat });
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 8000 }).catch(() => {});
  check('3a. avant la suspension, l\'espace est ouvert', await espace(p));
  etat.exploitant = false; etat.ligne = [{ actif: false }];
  /* Sur un téléphone, on ne recharge pas : on revient sur l'application.
     C'est le retour sur l'onglet qui fait reposer la question au serveur. */
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForFunction(() => !document.body.classList.contains('espace'), null, { timeout: 20000 }).catch(() => {});
  check('3b. le serveur refuse : l\'espace se ferme', !(await espace(p)));
  check('3c. l\'écran de connexion dit « Accès agent suspendu », pas « session expirée »', /Accès agent suspendu/.test(await bloc(p)) && !/expiré/.test(await ordinaire(p)), (await bloc(p)) || (await ordinaire(p)));
  check('3d. la marque « accès déjà vérifié » est oubliée', (await p.evaluate(() => localStorage.getItem('ela_acces_verifie'))) === null);
  await ctx.close();
}

/* ─── 4. L'admin n'est pas touché ─── */
{
  const etat = { exploitant: true, ligne: [{ actif: true }] };
  const { ctx, p } = await ouvrir({ etat });
  await seConnecter(p);
  check('4a. un compte accepté ouvre l\'espace', await espace(p));
  check('4b. le bloc suspendu reste caché', (await bloc(p)) === '');
  check('4c. le motif n\'est pas lu pour un compte accepté', !etat.vus.some(v => v.startsWith('operateurs:')));
  await ctx.close();
}

await nav.close();
serveur.close();
check('aucune erreur JavaScript dans la page', erreurs.length === 0, erreurs.join(' | '));
console.log(`=== test-admin-suspendu : ${ok.length} OK, ${ko.length} KO ===`);
ko.forEach(k => console.log('  ✗ ' + k));
process.exit(ko.length ? 1 : 0);
