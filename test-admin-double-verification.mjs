/* =====================================================================
   TEST-ADMIN-DOUBLE-VERIFICATION.MJS — un mot de passe seul n'ouvre plus l'admin
   ---------------------------------------------------------------------
   24 octobre 2026, P1 sécurité. Le serveur ne reconnaît plus un compte qui a
   activé son code à 6 chiffres sans une session confirmée par ce code
   (« aal2 ») : 20261024000000_double_verification_admin.sql, éprouvée sur un
   vrai PostgreSQL par supabase/tests/double-verification.sh. Ici on éprouve
   l'ÉCRAN, sur le site construit (la connexion n'existe que là), face à un
   faux Supabase qui applique LA MÊME règle que la base et les mêmes refus que
   l'API d'authentification (enrôler un second code ou en retirer un exige
   aal2 quand un code existe déjà).

   Ce qu'on éprouve :
   1. compte avec code : mot de passe → étape « code », espace FERMÉ ; mauvais
      code → refusé, toujours fermé ; bon code → session aal2, espace ouvert ;
   2. ancienne session au mot de passe seul (aal1), même sur un appareil déjà
      reconnu : le code est demandé, rien ne s'ouvre ;
   3. compte sans code : l'activation est proposée (lien otpauth, QR, clé),
      le code confirme, l'espace s'ouvre ; Réglages dit « Active sur 1
      appareil » ; un appareil de secours s'ajoute ; « Plus tard » ouvre ;
   4. le serveur exige le code pour tous : l'activation est obligatoire ;
   5. un compte qui n'est pas opérateur : refusé, session effacée ;
   6. l'appareil de secours ouvre l'admin avec SON code ;
   7. se déconnecter révoque la session chez Supabase (scope=local) ;
   8. aucune donnée de course n'arrive tant que le code n'est pas confirmé.
   Port 8179, propre à cette suite.

   Lancer :  node test-admin-double-verification.mjs
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

/* Un jeton comme ceux de Supabase : seule la partie lisible compte ici. */
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jeton = (sub, aal) => b64({ alg: 'HS256' }) + '.' + b64({ sub, aal, role: 'authenticated' }) + '.signature';
const lire = auth => { try { return JSON.parse(Buffer.from(auth.replace(/^Bearer /, '').split('.')[1], 'base64url').toString()); } catch { return {}; } };
const COURSE = { ref: 'ELA-26-10-SECRT', statut: 'attente', version: 1, modifie_le: '2026-10-24T08:00:00Z',
  bon: { ref: 'ELA-26-10-SECRT', statut: 'attente', cree: '2026-10-24T08:00:00Z',
    client: { nom: 'Client-Confidentiel', telephone: '+33600000000' },
    course: { depart: 'Adresse-Confidentielle', arrivee: 'Orly', date: '2026-10-25', heure: '10:00' },
    prix: { total: 50 } } };
/* Le code juste de chaque clé : la première, la seconde. */
const CODES = ['123456', '654321'];
const QR = 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>';

const erreurs = [];
const nav = await chromium.launch();

/* LE FAUX SUPABASE. « comptes » : par identifiant, la ligne operateurs (ou
   null) et les codes. « exigee » : le cliquet. est_exploitant() rend
   exactement ce que rend la base après la migration. */
function serveurSupabase(etat) {
  const sessionDe = (id, aal) => ({ access_token: jeton(id, aal), refresh_token: 'R-' + id + '-' + aal, token_type: 'bearer', expires_in: 3600,
    user: { id, factors: etat.comptes[id].codes.map(f => ({ ...f })) } });
  const exploitant = c => {
    const compte = etat.comptes[c.sub];
    if (!compte || !compte.operateur || !compte.operateur.actif) return false;
    const verifies = compte.codes.some(f => f.status === 'verified');
    return c.aal === 'aal2' || (!verifies && !etat.exigee);
  };
  return async route => {
    const req = route.request(), u = req.url(), m = req.method();
    if (u.startsWith(BASE)) return route.continue();
    if (!u.includes('supabase.co')) return route.abort();
    const auth = req.headers()['authorization'] || '';
    const c = lire(auth);
    const compte = etat.comptes[c.sub];
    const corps = (() => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } })();
    if (u.includes('grant_type=password')) {
      const id = etat.parEmail[corps.email];
      etat.vus.push('connexion');
      return route.fulfill(id ? J(sessionDe(id, 'aal1')) : J({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400));
    }
    if (u.includes('/auth/v1/logout')) { etat.vus.push('logout:' + u.split('logout')[1] + ':' + (c.sub || '')); return route.fulfill({ status: 204, body: '' }); }
    if (u.endsWith('/auth/v1/user') && m === 'GET') {
      if (!compte) return route.fulfill(J({ msg: 'invalid JWT' }, 401));
      return route.fulfill(J({ id: c.sub, factors: compte.codes.map(f => ({ ...f })) }));
    }
    const mf = u.match(/\/auth\/v1\/factors(?:\/([^/?]+))?(?:\/(challenge|verify))?/);
    if (mf) {
      if (!compte) return route.fulfill(J({ msg: 'invalid JWT' }, 401));
      const verifies = compte.codes.some(f => f.status === 'verified');
      const [, id, action] = mf;
      if (!id && m === 'POST') {
        /* Comme l'API de Supabase : un second code exige aal2. */
        if (verifies && c.aal !== 'aal2') return route.fulfill(J({ msg: 'AAL2 required to enroll a new factor' }, 403));
        if (compte.codes.some(f => f.friendly_name === corps.friendly_name)) return route.fulfill(J({ msg: 'A factor with the friendly name already exists' }, 422));
        const f = { id: 'f' + (++etat.n), factor_type: 'totp', status: 'unverified', friendly_name: corps.friendly_name, code: CODES[Math.min(etat.n - 1, 1)] };
        compte.codes.push(f);
        etat.vus.push('enrolement:' + corps.issuer);
        return route.fulfill(J({ id: f.id, type: 'totp', friendly_name: f.friendly_name,
          totp: { qr_code: QR, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Elatransfer:barbaros?secret=JBSWY3DPEHPK3PXP&issuer=Elatransfer' } }));
      }
      const f = compte.codes.find(x => x.id === id);
      if (!f) return route.fulfill(J({ msg: 'Factor not found' }, 404));
      if (m === 'DELETE') {
        if (f.status === 'verified' && c.aal !== 'aal2') return route.fulfill(J({ msg: 'AAL2 required to unenroll verified factor' }, 403));
        compte.codes = compte.codes.filter(x => x !== f);
        return route.fulfill(J({ id }));
      }
      if (action === 'challenge') return route.fulfill(J({ id: 'ch-' + id, expires_at: 9999999999 }));
      if (action === 'verify') {
        etat.vus.push('verify:' + id);
        if (corps.challenge_id !== 'ch-' + id || corps.code !== f.code) return route.fulfill(J({ error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' }, 422));
        f.status = 'verified';
        return route.fulfill(J(sessionDe(c.sub, 'aal2')));
      }
    }
    if (u.includes('grant_type=refresh_token')) return route.fulfill(J({ msg: 'non' }, 400));
    if (u.includes('/rpc/est_exploitant')) { etat.vus.push('est_exploitant:' + (c.aal || '')); return route.fulfill(J(exploitant(c))); }
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
function nouvelEtat(codesBarbaros = [], { exigee = false } = {}) {
  return {
    exigee, n: codesBarbaros.length, vus: [],
    parEmail: { 'barbaros@exemple.com': 'u-barbaros', 'intrus@exemple.com': 'u-intrus' },
    comptes: {
      'u-barbaros': { operateur: { actif: true, role: 'admin' }, codes: codesBarbaros },
      'u-intrus': { operateur: null, codes: [] },
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
const niveau = s => (s ? lire('Bearer ' + s.access_token).aal : null);
const message = p => p.evaluate(() => { const e = document.getElementById('codeErreur'); return e && !e.hidden ? e.textContent.trim() : ''; });
const texteDOM = p => p.evaluate(() => document.body.innerText);
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
const VERIFIE = () => [{ id: 'f1', factor_type: 'totp', status: 'verified', friendly_name: 'Elatransfer téléphone', code: CODES[0] }];

/* ─── 1. Compte avec code : le mot de passe seul ne suffit plus ─── */
{
  const etat = nouvelEtat(VERIFIE());
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  check('1a. mot de passe juste : l\'étape « code » s\'affiche', await visible(p, '#mfaCodeSaisie'));
  check('1b. l\'espace reste FERMÉ', !(await espace(p)));
  check('1c. la session du mot de passe est gardée (aal1), pour que le code la confirme', niveau(await session(p)) === 'aal1');
  check('1d. le formulaire e-mail / mot de passe est caché', !(await visible(p, '#exploitantEmail')));
  check('1e. aucune course n\'a été servie avant le code', !etat.vus.includes('courses:servies'));
  check('1f. rien de confidentiel à l\'écran', !/Client-Confidentiel|Adresse-Confidentielle/.test(await texteDOM(p)));
  const r = await p.locator('#btnMfaValider').boundingBox({ timeout: 2000 }).catch(() => null);
  check('1g. « Valider » est dans l\'écran du téléphone (390×844)', !!r && r.y >= 0 && r.y + r.height <= 844, JSON.stringify(r));
  await p.screenshot({ path: 'captures-admin/double-verification-code.png' });
  await taperCode(p, '000000');
  check('1h. mauvais code : refusé, et l\'écran dit quoi faire', /Code refusé/.test(await message(p)), await message(p));
  check('1i. mauvais code : l\'espace reste fermé', !(await espace(p)));
  await taperCode(p, CODES[0]);
  check('1j. bon code : l\'espace s\'ouvre', await espace(p));
  check('1k. la session gardée est désormais de niveau aal2', niveau(await session(p)) === 'aal2');
  await attendre(p, () => /Client-Confidentiel/.test(document.body.innerText));
  check('1l. les courses arrivent, une fois le code confirmé', etat.vus.includes('courses:servies'));
  await ctx.close();
}

/* ─── 2. Une ancienne session au mot de passe seul ne contourne rien ─── */
{
  const etat = nouvelEtat(VERIFIE());
  const ancienne = { access_token: jeton('u-barbaros', 'aal1'), refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };
  const { ctx, p } = await ouvrir(etat, { session: ancienne, acces: 'u-barbaros' });
  await attendre(p, () => { const e = document.getElementById('etapeCode'); return (e && !e.hidden) || document.body.classList.contains('espace'); });
  check('2a. appareil déjà reconnu, session aal1 : le code est demandé', await visible(p, '#mfaCodeSaisie'));
  check('2b. l\'espace ne s\'ouvre pas', !(await espace(p)));
  check('2c. la session n\'est pas effacée (le code va la confirmer)', niveau(await session(p)) === 'aal1');
  check('2d. aucune course servie', !etat.vus.includes('courses:servies'));
  await taperCode(p, CODES[0]);
  check('2e. le code confirmé ouvre l\'espace', await espace(p));
  await ctx.close();
}

/* ─── 3. Compte sans code : l'activation ─── */
{
  const etat = nouvelEtat([]);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const z = document.querySelector('#etapeActiver .mfa-cle'); return z && !z.hidden; });
  check('3a. l\'activation est proposée à la connexion', await visible(p, '#etapeActiver .mfa-saisie'));
  check('3b. l\'espace n\'est pas encore ouvert', !(await espace(p)));
  const lien = await p.getAttribute('#etapeActiver .mfa-lien', 'href');
  check('3c. le lien ouvre l\'application de codes (otpauth://)', /^otpauth:\/\/totp\//.test(lien || ''), lien);
  check('3d. le QR est une image locale (data:), jamais un service tiers', /^data:image\/svg\+xml/.test(await p.getAttribute('#etapeActiver .mfa-qr', 'src') || ''));
  check('3e. la clé est lisible, par groupes de 4', (await p.textContent('#etapeActiver .mfa-secret')) === 'JBSW Y3DP EHPK 3PXP');
  check('3f. « Plus tard » existe tant que le serveur n\'exige pas le code pour tous', await visible(p, '#etapeActiver .mfa-plus-tard'));
  check('3g. l\'émetteur affiché dans l\'application est « Elatransfer »', etat.vus.includes('enrolement:Elatransfer'));
  await p.screenshot({ path: 'captures-admin/double-verification-activation.png', fullPage: true });
  await p.fill('#etapeActiver .mfa-saisie', '999999');
  await p.click('#etapeActiver .mfa-activer');
  await attendre(p, () => { const e = document.querySelector('#etapeActiver .mfa-erreur'); return e && !e.hidden; });
  check('3h. un mauvais code n\'active rien', etat.comptes['u-barbaros'].codes.every(f => f.status !== 'verified') && !(await espace(p)));
  await p.fill('#etapeActiver .mfa-saisie', CODES[0]);
  await p.click('#etapeActiver .mfa-activer');
  await attendre(p, () => document.body.classList.contains('espace'));
  check('3i. le bon code active et ouvre l\'espace', await espace(p) && etat.comptes['u-barbaros'].codes.some(f => f.status === 'verified'));
  check('3j. la session est désormais aal2', niveau(await session(p)) === 'aal2');
  await p.evaluate(() => { const b = document.getElementById('btnReglages') || document.querySelector('[data-admin-vers="ecran-reglages"]'); b && b.click(); });
  await attendre(p, () => /Active sur 1 appareil/.test((document.getElementById('dvEtat') || {}).textContent || ''));
  check('3k. Réglages : « Active sur 1 appareil », et le conseil d\'un appareil de secours', /Active sur 1 appareil.*secours/.test(await p.textContent('#dvEtat')), await p.textContent('#dvEtat'));
  await p.click('#btnDvAjouter');
  await attendre(p, () => { const z = document.querySelector('#dvPanneau .mfa-cle'); return z && !z.hidden; });
  check('3l. un appareil de secours s\'ajoute (la session aal2 l\'autorise)', await visible(p, '#dvPanneau .mfa-saisie'));
  await p.fill('#dvPanneau .mfa-saisie', CODES[1]);
  await p.click('#dvPanneau .mfa-activer');
  await attendre(p, () => /Active sur 2 appareils/.test(document.getElementById('dvEtat').textContent));
  check('3m. Réglages : « Active sur 2 appareils »', /Active sur 2 appareils/.test(await p.textContent('#dvEtat')), await p.textContent('#dvEtat'));
  check('3n. chaque appareil peut être retiré (il en reste un autre)', (await p.locator('#dvListe button').count()) === 2);
  await p.screenshot({ path: 'captures-admin/double-verification-reglages.png', fullPage: false });
  const premier = p.locator('#dvListe button').first();
  await premier.click();
  check('3o. retirer demande deux appuis', (await premier.textContent()) === 'Confirmer le retrait' && etat.comptes['u-barbaros'].codes.length === 2);
  await premier.click();
  await attendre(p, () => /Active sur 1 appareil/.test(document.getElementById('dvEtat').textContent));
  check('3p. retiré : il en reste un, qui ne se retire pas d\'ici', etat.comptes['u-barbaros'].codes.length === 1 && (await p.locator('#dvListe button').count()) === 0);
  await ctx.close();
}
{
  const etat = nouvelEtat([]);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const b = document.querySelector('#etapeActiver .mfa-plus-tard'); return b && !b.hidden; });
  await p.click('#etapeActiver .mfa-plus-tard');
  await attendre(p, () => document.body.classList.contains('espace'));
  check('3q. « Plus tard » ouvre l\'espace (le serveur ne l\'exige pas encore)', await espace(p));
  await ctx.close();
}

/* ─── 4. Le serveur exige le code pour tous ─── */
{
  const etat = nouvelEtat([], { exigee: true });
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await attendre(p, () => { const z = document.querySelector('#etapeActiver .mfa-cle'); return z && !z.hidden; });
  check('4a. l\'activation est demandée', await visible(p, '#etapeActiver .mfa-saisie'));
  check('4b. elle est obligatoire : pas de « Plus tard »', !(await visible(p, '#etapeActiver .mfa-plus-tard')));
  check('4c. l\'espace reste fermé, aucune course servie', !(await espace(p)) && !etat.vus.includes('courses:servies'));
  await p.fill('#etapeActiver .mfa-saisie', CODES[0]);
  await p.click('#etapeActiver .mfa-activer');
  await attendre(p, () => document.body.classList.contains('espace'));
  check('4d. une fois activé, l\'espace s\'ouvre', await espace(p));
  await ctx.close();
}

/* ─── 5. Un compte qui n'est pas opérateur ─── */
{
  const etat = nouvelEtat(VERIFIE());
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p, 'intrus@exemple.com');
  check('5a. refusé, avec le message ordinaire', /Connexion refusée/.test(await message(p)), await message(p));
  check('5b. ni étape code, ni activation proposée', !(await visible(p, '#mfaCodeSaisie')) && !(await visible(p, '#etapeActiver .mfa-saisie')));
  check('5c. session effacée, espace fermé', (await session(p)) === null && !(await espace(p)));
  await ctx.close();
}

/* ─── 6. L'appareil de secours ouvre avec SON code ─── */
{
  const etat = nouvelEtat([...VERIFIE(), { id: 'f2', factor_type: 'totp', status: 'verified', friendly_name: 'Elatransfer secours', code: CODES[1] }]);
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await taperCode(p, CODES[1]);
  check('6a. le code de l\'appareil de secours est accepté', await espace(p), await message(p));
  check('6b. il a été essayé sur la première clé, puis sur la seconde', etat.vus.includes('verify:f1') && etat.vus.includes('verify:f2'));
  await ctx.close();
}

/* ─── 7. Se déconnecter révoque la session chez Supabase ─── */
{
  const etat = nouvelEtat(VERIFIE());
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await taperCode(p, CODES[0]);
  await p.evaluate(() => document.getElementById('btnNuageDeco').click());
  await attendre(p, () => !document.body.classList.contains('espace'));
  await p.waitForTimeout(300);
  check('7a. la session est révoquée chez Supabase, celle-ci seulement (scope=local)', etat.vus.some(v => v === 'logout:?scope=local:u-barbaros'), etat.vus.filter(v => v.startsWith('logout')).join(','));
  check('7b. la session est effacée du téléphone, retour à l\'e-mail et au mot de passe', (await session(p)) === null && await visible(p, '#exploitantEmail'));
  await ctx.close();
}
/* ─── 7c. « Changer de compte » depuis l'étape code révoque aussi ─── */
{
  const etat = nouvelEtat(VERIFIE());
  const { ctx, p } = await ouvrir(etat);
  await seConnecter(p);
  await p.click('#btnMfaAnnuler');
  await p.waitForTimeout(300);
  check('7c. « Changer de compte » révoque la session du mot de passe et revient au formulaire',
    etat.vus.some(v => v.startsWith('logout:?scope=local')) && (await session(p)) === null && await visible(p, '#exploitantEmail'));
  await ctx.close();
}

await nav.close();
serveur.close();
check('aucune erreur JavaScript dans la page', erreurs.length === 0, erreurs.join(' | '));
console.log(`=== test-admin-double-verification : ${ok.length} OK, ${ko.length} KO ===`);
ko.forEach(k => console.log('  ✗ ' + k));
process.exit(ko.length ? 1 : 0);
