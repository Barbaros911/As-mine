/* =====================================================================
   TEST-ADMIN-CODE-ADMIN.MJS — un mot de passe seul n'ouvre plus l'admin
   ---------------------------------------------------------------------
   24 octobre 2026, P1 sécurité. Le serveur ne reconnaît plus un compte qui a
   choisi son code admin à 6 chiffres sans une session où ce code a été tapé
   juste : 20261024020000_code_admin.sql, éprouvée sur un vrai PostgreSQL par
   supabase/tests/code-admin.sh. Ici on éprouve l'ÉCRAN, sur le site
   construit (la connexion n'existe que là), face à un faux Supabase qui
   applique LA MÊME règle que la base (session_id du jeton, 5 essais puis
   15 minutes de blocage, changement du code réservé à une session
   confirmée).

   Ce qu'on éprouve :
   1. compte avec code : mot de passe → étape « code », espace FERMÉ ; mauvais
      code → refusé, toujours fermé ; bon code → espace ouvert ;
   2. ancienne session au mot de passe seul, même sur un appareil déjà
      reconnu : le code est demandé, rien ne s'ouvre ;
   3. compte sans code : le choix est proposé (deux champs), les deux codes
      doivent être pareils, l'espace s'ouvre ; Réglages dit « Actif » ; le
      code se change ; « Plus tard » ouvre ;
   4. le serveur exige le code pour tous : le choix est obligatoire ;
   5. un compte qui n'est pas opérateur : refusé, session effacée ;
   6. 5 codes faux de suite : l'écran dit le blocage de 15 minutes ;
   7. se déconnecter révoque la session chez Supabase (scope=local) ;
   8. serveur sans la mise à jour : l'admin s'ouvre comme avant ;
   9. aucune donnée de course n'arrive tant que le code n'est pas tapé ;
      le code n'est jamais écrit dans la page ni gardé sur l'appareil.
   Port 8179, propre à cette suite.

   Lancer :  node test-admin-code-admin.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
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
await new Promise(r => serveur.listen(8179, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8179';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
await mkdir('captures-admin', { recursive: true });

/* Un jeton comme ceux de Supabase : seule la partie lisible compte ici.
   « session_id » change à chaque connexion, pas au renouvellement. */
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jeton = (sub, sid) => b64({ alg: 'HS256' }) + '.' + b64({ sub, session_id: sid, role: 'authenticated' }) + '.signature';
const lire = auth => { try { return JSON.parse(Buffer.from(auth.replace(/^Bearer /, '').split('.')[1], 'base64url').toString()); } catch { return {}; } };
const COURSE = { ref: 'ELA-26-10-SECRT', statut: 'attente', version: 1, modifie_le: '2026-10-24T08:00:00Z',
  bon: { ref: 'ELA-26-10-SECRT', statut: 'attente', cree: '2026-10-24T08:00:00Z',
    client: { nom: 'Client-Confidentiel', telephone: '+33600000000' },
    course: { depart: 'Adresse-Confidentielle', arrivee: 'Orly', date: '2026-10-25', heure: '10:00' },
    prix: { total: 50 } } };
const CODE = '480512';

const erreurs = [];
const nav = await chromium.launch();

/* LE FAUX SUPABASE. « comptes » : par identifiant, la ligne operateurs (ou
   null) et le code. « exigee » : le cliquet. « confirmees » : les sessions
   où le code a été tapé juste. est_exploitant() et les trois fonctions du
   code rendent exactement ce que rend la base après la migration. */
function serveurSupabase(etat) {
  const sessionDe = (id, sid) => ({ access_token: jeton(id, sid), refresh_token: 'R-' + id + '-' + sid, token_type: 'bearer', expires_in: 3600, user: { id } });
  const confirmee = c => etat.confirmees.has(c.sub + '|' + c.session_id);
  const exploitant = c => {
    const compte = etat.comptes[c.sub];
    if (!compte || !compte.operateur || !compte.operateur.actif) return false;
    if (etat.sansMigration) return true;
    return confirmee(c) || (!compte.code && !etat.exigee);
  };
  const actif = c => { const k = etat.comptes[c.sub]; return !!(k && k.operateur && k.operateur.actif && c.session_id); };
  return async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    const c = lire(req.headers()['authorization'] || '');
    const compte = etat.comptes[c.sub];
    const corps = (() => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } })();
    if (u.includes('grant_type=password')) {
      const id = etat.parEmail[corps.email];
      etat.vus.push('connexion');
      return route.fulfill(id ? J(sessionDe(id, 'S' + (++etat.n))) : J({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400));
    }
    if (u.includes('/auth/v1/logout')) { etat.vus.push('logout:' + u.split('logout')[1] + ':' + (c.sub || '')); return route.fulfill({ status: 204, body: '' }); }
    const rpc = (u.match(/\/rpc\/(ela_code_admin_\w+)/) || [])[1];
    if (rpc) {
      etat.vus.push(rpc + ':' + JSON.stringify(corps));
      if (etat.sansMigration) return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function' }, 404));
      if (!compte || !compte.operateur) return route.fulfill(J('non'));
      if (rpc === 'ela_code_admin_etat') {
        if (!compte.operateur.actif) return route.fulfill(J('suspendu'));
        if (!compte.code) return route.fulfill(J(etat.exigee ? 'a_choisir' : 'aucun'));
        if (confirmee(c)) return route.fulfill(J('ok'));
        return route.fulfill(J(compte.bloque ? 'bloque' : 'a_saisir'));
      }
      if (!actif(c)) return route.fulfill(J('non'));
      if (rpc === 'ela_code_admin_verifier') {
        if (!compte.code) return route.fulfill(J('aucun'));
        if (compte.bloque) return route.fulfill(J('bloque'));
        if (corps.p_code === compte.code) { compte.essais = 0; etat.confirmees.add(c.sub + '|' + c.session_id); return route.fulfill(J('ok')); }
        if (++compte.essais >= 5) { compte.essais = 0; compte.bloque = true; return route.fulfill(J('bloque')); }
        return route.fulfill(J('faux'));
      }
      if (rpc === 'ela_code_admin_choisir') {
        if (!/^[0-9]{6}$/.test(corps.p_code || '')) return route.fulfill(J('format'));
        if (compte.code && !confirmee(c)) return route.fulfill(J('code_requis'));
        compte.code = corps.p_code;
        for (const k of [...etat.confirmees]) if (k.startsWith(c.sub + '|')) etat.confirmees.delete(k);
        etat.confirmees.add(c.sub + '|' + c.session_id);
        return route.fulfill(J('ok'));
      }
    }
    if (u.includes('grant_type=refresh_token')) return route.fulfill(J({ msg: 'non' }, 400));
    if (u.includes('/rpc/est_exploitant')) { etat.vus.push('est_exploitant'); return route.fulfill(J(exploitant(c))); }
    if (u.includes('/rest/v1/operateurs')) return route.fulfill(J(compte && compte.operateur ? [{ actif: compte.operateur.actif }] : []));
    if (u.includes('/rpc/role_operateur')) return route.fulfill(J(exploitant(c) ? 'admin' : ''));
    if (u.includes('/rest/v1/courses')) {
      /* La RLS : une course ne sort que pour un exploitant reconnu. */
      if (exploitant(c)) { etat.vus.push('courses:servies'); return route.fulfill(J(u.includes('limit=1') ? [{ ref: COURSE.ref, version: 1 }] : [COURSE])); }
      return route.fulfill(J([]));
    }
    if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J(exploitant(c) ? { ok: true } : null));
    return route.fulfill(J([]));
  };
}
function nouvelEtat(code = null, { exigee = false, sansMigration = false } = {}) {
  return {
    exigee, sansMigration, n: 0, vus: [], confirmees: new Set(),
    parEmail: { 'barbaros@exemple.com': 'u-barbaros', 'intrus@exemple.com': 'u-intrus' },
    comptes: {
      'u-barbaros': { operateur: { actif: true, role: 'admin' }, code, essais: 0, bloque: false },
      'u-intrus': { operateur: null, code: null, essais: 0, bloque: false },
    },
  };
}
async function ouvrir(etat, { session, acces } = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  await ctx.addInitScript(({ session, acces }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    if (session) localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    if (acces) localStorage.setItem('ela_acces_verifie', acces);
  }, { session, acces });
  await ctx.route('**/*', serveurSupabase(etat));
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  return { ctx, p };
}
const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
const espace = p => p.evaluate(() => document.body.classList.contains('espace'));
const session = p => p.evaluate(() => JSON.parse(localStorage.getItem('ela_nuage_session') || 'null'));
const message = p => p.evaluate(() => { const e = document.getElementById('codeErreur'); return e && !e.hidden ? e.textContent.trim() : ''; });
const texteDOM = p => p.evaluate(() => document.body.innerText);
const stockage = p => p.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage));
const attendre = (p, f, arg) => p.waitForFunction(f, arg, { timeout: 8000 }).catch(() => {});
async function seConnecter(p, email = 'barbaros@exemple.com') {
  await p.fill('#exploitantEmail', email);
  await p.fill('#exploitantMdp', 'motdepasse-juste');
  await p.click('#btnDeverrouiller');
  await attendre(p, () => {
    const vis = id => { const e = document.getElementById(id); return e && !e.hidden; };
    return vis('etapeCode') || vis('etapeActiver') || vis('codeErreur') || document.body.classList.contains('espace');
  });
}
async function taperCode(p, code) {
  await p.click('#mfaCodeSaisie');
  await p.fill('#mfaCodeSaisie', code);
  await p.click('#btnMfaValider');
  await attendre(p, () => document.body.classList.contains('espace') || !document.getElementById('codeErreur').hidden);
}
async function choisir(p, zone, code, confirme = code) {
  await p.click(zone + ' .mfa-saisie');
  await p.fill(zone + ' .mfa-saisie', code);
  await p.click(zone + ' .mfa-confirme');
  await p.fill(zone + ' .mfa-confirme', confirme);
  await p.click(zone + ' .mfa-activer');
}

/* ─── 1. Compte avec code : le mot de passe seul ne suffit plus ─── */
{
  const etat = nouvelEtat(CODE);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  check('1a. mot de passe juste : l\'étape « code » s\'affiche', await visible(p, '#mfaCodeSaisie'));
  check('1b. l\'espace reste FERMÉ', !(await espace(p)));
  check('1c. la session du mot de passe est gardée, pour que le code la confirme', !!(await session(p)));
  check('1d. le formulaire e-mail / mot de passe est caché', !(await visible(p, '#exploitantEmail')));
  check('1e. aucune course n\'a été servie avant le code', !etat.vus.includes('courses:servies'));
  check('1f. rien de confidentiel à l\'écran', !/Client-Confidentiel|Adresse-Confidentielle/.test(await texteDOM(p)));
  check('1g. le code se tape masqué, au clavier numérique', await p.evaluate(() => { const e = document.getElementById('mfaCodeSaisie'); return e.type === 'password' && e.inputMode === 'numeric'; }));
  check('1h. plus d\'application de codes, ni QR, ni clé', !/application de codes|QR|otpauth/.test(await texteDOM(p)) && !(await p.locator('.mfa-qr, .mfa-lien').count()));
  const r = await p.locator('#btnMfaValider').boundingBox({ timeout: 2000 }).catch(() => null);
  check('1i. « Valider » est dans l\'écran du téléphone (390×844)', !!r && r.y >= 0 && r.y + r.height <= 844, JSON.stringify(r));
  await p.screenshot({ path: 'captures-admin/code-admin-saisie.png' });
  await taperCode(p, '000000');
  check('1j. mauvais code : « Code incorrect », et l\'écran prévient du blocage', /Code incorrect.*5 codes faux/.test(await message(p)), await message(p));
  check('1k. mauvais code : l\'espace reste fermé', !(await espace(p)));
  await taperCode(p, CODE);
  check('1l. bon code : l\'espace s\'ouvre', await espace(p));
  check('1m. le code a été envoyé au serveur, qui l\'a vérifié', etat.vus.includes('ela_code_admin_verifier:' + JSON.stringify({ p_code: CODE })));
  await attendre(p, () => /Client-Confidentiel/.test(document.body.innerText));
  check('1n. les courses arrivent, une fois le code tapé', etat.vus.includes('courses:servies'));
  check('1o. le code n\'est gardé nulle part sur l\'appareil', !(await stockage(p)).includes(CODE));
  await ctx.close();
}

/* ─── 2. Une ancienne session au mot de passe seul ne contourne rien ─── */
{
  const etat = nouvelEtat(CODE);
  const ancienne = { access_token: jeton('u-barbaros', 'S-ancienne'), refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };
  const { ctx, p } = await ouvrir(etat, { session: ancienne, acces: 'u-barbaros' });
  await attendre(p, () => { const e = document.getElementById('etapeCode'); return (e && !e.hidden) || document.body.classList.contains('espace'); });
  check('2a. appareil déjà reconnu, session sans code : le code est demandé', await visible(p, '#mfaCodeSaisie'));
  check('2b. l\'espace ne s\'ouvre pas', !(await espace(p)));
  check('2c. la session n\'est pas effacée (le code va la confirmer)', !!(await session(p)));
  check('2d. aucune course servie', !etat.vus.includes('courses:servies'));
  await taperCode(p, CODE);
  check('2e. le code tapé ouvre l\'espace', await espace(p));
  await ctx.close();
}

/* ─── 3. Compte sans code : le choix ─── */
{
  const etat = nouvelEtat(null);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const z = document.querySelector('#etapeActiver .mfa-saisie'); return z && z.getBoundingClientRect().height > 0; });
  check('3a. le choix du code est proposé à la connexion', await visible(p, '#etapeActiver .mfa-saisie') && await visible(p, '#etapeActiver .mfa-confirme'));
  check('3b. l\'espace n\'est pas encore ouvert', !(await espace(p)));
  check('3c. « Plus tard » existe tant que le serveur n\'exige pas le code pour tous', await visible(p, '#etapeActiver .mfa-plus-tard'));
  await p.screenshot({ path: 'captures-admin/code-admin-choix.png', fullPage: true });
  await choisir(p, '#etapeActiver', '4805', '4805');
  await attendre(p, () => { const e = document.querySelector('#etapeActiver .mfa-erreur'); return e && !e.hidden; });
  check('3d. moins de 6 chiffres : refusé avant le serveur', /6 chiffres/.test(await p.textContent('#etapeActiver .mfa-erreur')) && !etat.comptes['u-barbaros'].code);
  await choisir(p, '#etapeActiver', CODE, '480513');
  await attendre(p, () => /pas pareils/.test(document.querySelector('#etapeActiver .mfa-erreur').textContent));
  check('3e. deux codes différents : refusé, rien n\'est enregistré', /pas pareils/.test(await p.textContent('#etapeActiver .mfa-erreur')) && !etat.comptes['u-barbaros'].code);
  await choisir(p, '#etapeActiver', CODE);
  await attendre(p, () => document.body.classList.contains('espace'));
  check('3f. le code choisi est enregistré sur le serveur, et l\'espace s\'ouvre', await espace(p) && etat.comptes['u-barbaros'].code === CODE);
  check('3g. la session qui l\'a choisi reste ouverte (pas besoin de le retaper)', !etat.vus.some(v => v.startsWith('ela_code_admin_verifier')));
  await p.evaluate(() => { const b = document.getElementById('btnReglages') || document.querySelector('[data-admin-vers="ecran-reglages"]'); b && b.click(); });
  await attendre(p, () => document.getElementById('ecran-reglages').classList.contains('actif'));
  await attendre(p, () => /^Actif/.test((document.getElementById('dvEtat') || {}).textContent || ''));
  check('3h. Réglages : « Actif », et le bouton « Changer mon code »', /^Actif/.test(await p.textContent('#dvEtat')) && (await p.textContent('#btnDvAjouter')) === 'Changer mon code', await p.textContent('#dvEtat'));
  await p.locator('#blocDoubleVerif').scrollIntoViewIfNeeded().catch(() => {});
  await p.screenshot({ path: 'captures-admin/code-admin-reglages.png' });
  await p.click('#btnDvAjouter');
  await attendre(p, () => { const e = document.querySelector('#dvPanneau .mfa-saisie'); return e && e.getBoundingClientRect().height > 0; });
  await choisir(p, '#dvPanneau', '135790');
  await attendre(p, () => document.getElementById('dvPanneau').hidden);
  check('3i. le code se change depuis Réglages', etat.comptes['u-barbaros'].code === '135790');
  await ctx.close();
}
{
  const etat = nouvelEtat(null);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const b = document.querySelector('#etapeActiver .mfa-plus-tard'); return b && !b.hidden; });
  await p.click('#etapeActiver .mfa-plus-tard');
  await attendre(p, () => document.body.classList.contains('espace'));
  check('3j. « Plus tard » ouvre l\'espace (le serveur ne l\'exige pas encore)', await espace(p));
  await p.evaluate(() => { const b = document.getElementById('btnReglages') || document.querySelector('[data-admin-vers="ecran-reglages"]'); b && b.click(); });
  await attendre(p, () => /Pas encore de code/.test((document.getElementById('dvEtat') || {}).textContent || ''));
  check('3k. Réglages : « Pas encore de code », et « Choisir mon code »', /Pas encore de code/.test(await p.textContent('#dvEtat')) && (await p.textContent('#btnDvAjouter')) === 'Choisir mon code');
  await ctx.close();
}

/* ─── 4. Le serveur exige le code pour tous ─── */
{
  const etat = nouvelEtat(null, { exigee: true });
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const z = document.querySelector('#etapeActiver .mfa-saisie'); return z && z.getBoundingClientRect().height > 0; });
  check('4a. le choix du code est demandé', await visible(p, '#etapeActiver .mfa-saisie'));
  check('4b. il est obligatoire : pas de « Plus tard »', !(await visible(p, '#etapeActiver .mfa-plus-tard')));
  check('4c. l\'espace reste fermé, aucune course servie', !(await espace(p)) && !etat.vus.includes('courses:servies'));
  await choisir(p, '#etapeActiver', CODE);
  await attendre(p, () => document.body.classList.contains('espace'));
  check('4d. une fois choisi, l\'espace s\'ouvre', await espace(p));
  await ctx.close();
}

/* ─── 5. Un compte qui n'est pas opérateur ─── */
{
  const etat = nouvelEtat(CODE);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p, 'intrus@exemple.com');
  check('5a. refusé, avec le message ordinaire', /Connexion refusée/.test(await message(p)), await message(p));
  check('5b. ni étape code, ni choix proposé', !(await visible(p, '#mfaCodeSaisie')) && !(await visible(p, '#etapeActiver .mfa-saisie')));
  check('5c. session effacée, espace fermé', (await session(p)) === null && !(await espace(p)));
  await ctx.close();
}

/* ─── 6. Cinq codes faux de suite ─── */
{
  const etat = nouvelEtat(CODE);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  for (let i = 0; i < 5; i++) await taperCode(p, '00000' + i);
  check('6a. au cinquième, l\'écran dit le blocage de 15 minutes', /bloqué 15 minutes/.test(await message(p)), await message(p));
  await taperCode(p, CODE);
  check('6b. bloqué : même le bon code n\'ouvre rien', !(await espace(p)) && /bloqué 15 minutes/.test(await message(p)));
  await ctx.close();
}

/* ─── 7. Se déconnecter révoque la session chez Supabase ─── */
{
  const etat = nouvelEtat(CODE);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await taperCode(p, CODE);
  await p.evaluate(() => document.getElementById('btnNuageDeco').click());
  await attendre(p, () => !document.body.classList.contains('espace'));
  await p.waitForTimeout(300);
  check('7a. la session est révoquée chez Supabase, celle-ci seulement (scope=local)', etat.vus.some(v => v === 'logout:?scope=local:u-barbaros'), etat.vus.filter(v => v.startsWith('logout')).join(','));
  check('7b. la session est effacée du téléphone, retour à l\'e-mail et au mot de passe', (await session(p)) === null && await visible(p, '#exploitantEmail'));
  /* Se reconnecter ouvre une NOUVELLE session : le code est redemandé. */
  await seConnecter(p);
  check('7c. reconnecté : le code est redemandé', await visible(p, '#mfaCodeSaisie') && !(await espace(p)));
  await ctx.close();
}
{
  const etat = nouvelEtat(CODE);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await p.click('#btnMfaAnnuler');
  await p.waitForTimeout(300);
  check('7d. « Changer de compte » révoque la session du mot de passe et revient au formulaire',
    etat.vus.some(v => v.startsWith('logout:?scope=local')) && (await session(p)) === null && await visible(p, '#exploitantEmail'));
  await ctx.close();
}

/* ─── 8. Le serveur n'a pas encore la mise à jour ─── */
{
  const etat = nouvelEtat(null, { sansMigration: true });
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => document.body.classList.contains('espace'));
  check('8a. l\'admin s\'ouvre comme avant, sans rien proposer', await espace(p) && !(await visible(p, '#etapeActiver .mfa-saisie')));
  await p.evaluate(() => { const b = document.getElementById('btnReglages') || document.querySelector('[data-admin-vers="ecran-reglages"]'); b && b.click(); });
  await attendre(p, () => /État inconnu/.test((document.getElementById('dvEtat') || {}).textContent || ''));
  check('8b. Réglages le dit, sans bouton', /État inconnu/.test(await p.textContent('#dvEtat')) && !(await visible(p, '#btnDvAjouter')));
  await ctx.close();
}

/* ─── 9. Le code n'est jamais dans la page ─── */
{
  const page = await readFile('site/ela-admin/index.html', 'utf8');
  check('9a. aucune empreinte ni code dans la page publiée (le serveur vérifie)', !/bcrypt|crypt\(|codes_admin/.test(page) && page.includes('ela_code_admin_verifier'));
}

await nav.close();
serveur.close();
check('aucune erreur JavaScript dans la page', erreurs.length === 0, erreurs.join(' | '));
console.log(`=== test-admin-code-admin : ${ok.length} OK, ${ko.length} KO ===`);
ko.forEach(k => console.log('  ✗ ' + k));
process.exit(ko.length ? 1 : 0);
