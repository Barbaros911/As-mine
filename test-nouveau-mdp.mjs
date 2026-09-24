/* =====================================================================
   TEST-NOUVEAU-MDP.MJS — changer son mot de passe depuis l'espace
   ---------------------------------------------------------------------
   Septembre 2026 : Barbaros veut changer ses accès depuis son téléphone.
   L'éditeur SQL de Supabase refuse le collage sur iPhone, et « Reset
   password » envoie un lien que ce site ne sait pas recevoir. Ce bloc est
   donc le seul chemin qui marche.

   CE QU'ON ÉPROUVE :
   - le bloc est dans les Réglages de l'espace CONNECTÉ, absent ailleurs ;
   - trop court et saisies différentes sont refusés SANS appel au serveur ;
   - le bon appel part (PUT /auth/v1/user, jeton de la session, le mot de
     passe dans le corps), puis la déconnexion des AUTRES appareils ;
   - un refus du serveur dit POURQUOI (son message, pas « erreur ») ;
   - aucun mot de passe ne reste dans les champs après un succès.

   IL ÉPROUVE LE SITE CONSTRUIT : la connexion par e-mail n'existe que dans
   la page publiée (harden-exploitant-auth.mjs).

   Lancer :  node test-nouveau-mdp.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { execSync } from 'node:child_process';

execSync('sh construire.sh', {stdio:'ignore'});
const TYPES = {'.html':'text/html','.css':'text/css','.js':'text/javascript',
  '.json':'application/json','.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const serveur = createServer(async (req, res) => {
  try {
    let chemin = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let f = join(process.cwd(), 'site', chemin);
    try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
    catch { res.writeHead(404).end('non'); return; }
    res.writeHead(200, {'Content-Type': TYPES[extname(f)] || 'application/octet-stream'});
    res.end(await readFile(f));
  } catch { res.writeHead(404).end('non'); }
});
await new Promise(r => serveur.listen(8097, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8097';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

const MDP = 'Nouveau-Mdp-2026!x';
let appels = [], refusSuivant = null;
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});

const nav = await chromium.launch();
try {
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const p = await ctx.newPage();
  const erreursJs = []; p.on('pageerror', e => erreursJs.push(e.message));
  /* UNE SEULE ROUTE qui décide de tout : deux routes obligent à connaître
     un ordre de priorité, qui a déjà changé d'une version de Playwright à
     l'autre. */
  await p.route('**/*', async route => {
    const r = route.request(), u = r.url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      appels.push({url:u, method:r.method(), auth:r.headers()['authorization']||'', body:r.postData()||''});
      if (u.includes('/auth/v1/token')) return route.fulfill(J({access_token:'JETON-TEST', refresh_token:'R', token_type:'bearer'}));
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      if (u.includes('/auth/v1/user') && r.method()==='PUT') {
        if (refusSuivant) { const x = refusSuivant; refusSuivant = null; return route.fulfill(J(x, 422)); }
        return route.fulfill(J({id:'u1'}));
      }
      if (u.includes('/auth/v1/logout')) return route.fulfill({status:204, body:''});
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });

  await p.goto(BASE + '/application.html?exploitant=1');
  await p.waitForSelector('#exploitantEmail', {state:'visible'});
  check('le bloc n\'est pas visible sur l\'écran de connexion',
    !(await p.locator('#btnMdpChanger').isVisible()));

  await p.fill('#exploitantEmail', 'test@exemple.com');
  await p.fill('#exploitantMdp', 'ancien');
  await p.click('#btnDeverrouiller');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:8000});

  /* Le bloc vit dans « Réglages », avec la connexion au serveur. */
  await p.click('#btnReglages');
  await p.locator('#btnMdpChanger').scrollIntoViewIfNeeded();
  check('une fois connecté, le bloc est visible', await p.locator('#btnMdpChanger').isVisible());
  const recu = await p.evaluate(() => { const b = document.getElementById('btnMdpChanger').getBoundingClientRect();
    const e = document.elementFromPoint(b.left + b.width/2, b.top + b.height/2); return e && e.closest('#btnMdpChanger') ? 'bouton' : (e ? e.tagName + '.' + e.className : 'rien'); });
  check('le bouton reçoit bien le doigt', recu === 'bouton', recu);

  const avant = appels.length;
  await p.fill('#mdpNouveau', 'court'); await p.fill('#mdpConfirme', 'court');
  await p.click('#btnMdpChanger');
  check('trop court : refusé', /12 caractères/.test(await p.textContent('#mdpAvis')));
  await p.fill('#mdpNouveau', MDP); await p.fill('#mdpConfirme', MDP + 'z');
  await p.click('#btnMdpChanger');
  check('saisies différentes : refusé', /pas identiques/.test(await p.textContent('#mdpAvis')));
  check('ces deux refus n\'appellent pas le serveur', appels.length === avant, (appels.length-avant)+' appel(s)');

  refusSuivant = {code:422, error_code:'same_password', msg:'New password should be different from the old password.'};
  await p.fill('#mdpConfirme', MDP);
  await p.click('#btnMdpChanger');
  await p.waitForFunction(() => /Refusé/.test(document.getElementById('mdpAvis').textContent));
  check('un refus du serveur donne SON message', /different from the old/.test(await p.textContent('#mdpAvis')));

  appels = [];
  await p.click('#btnMdpChanger');
  await p.waitForFunction(() => /changé/.test(document.getElementById('mdpAvis').textContent));
  const put = appels.find(a => a.method==='PUT' && a.url.includes('/auth/v1/user'));
  check('l\'appel PUT /auth/v1/user part', !!put);
  check('il porte le jeton de la session', put && put.auth === 'Bearer JETON-TEST', put && put.auth);
  check('il porte le nouveau mot de passe', put && JSON.parse(put.body).password === MDP);
  await p.waitForTimeout(300);
  const deco = appels.find(a => a.url.includes('/auth/v1/logout'));
  check('les AUTRES appareils sont déconnectés (scope=others)', deco && /scope=others/.test(deco.url), deco && deco.url);
  check('pas cet appareil : aucune déconnexion globale', !appels.some(a => /logout(\?scope=global)?$/.test(a.url)));
  check('les champs sont vidés après le succès',
    (await p.inputValue('#mdpNouveau')) === '' && (await p.inputValue('#mdpConfirme')) === '');
  check('toujours dans l\'espace après le changement', await p.evaluate(() => document.body.classList.contains('espace')));

  const larg = await p.evaluate(() => document.documentElement.scrollWidth);
  check('aucun débordement horizontal à 390 px', larg <= 390, larg + ' px');
  check('aucune erreur JavaScript', erreursJs.length === 0, erreursJs.join(' | '));

  /* Côté client, le bloc n'existe pas à l'écran. */
  const c = await ctx.newPage();
  await c.route('**/*', r => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
  await c.goto(BASE + '/');
  check('côté client, le bloc n\'est pas visible', !(await c.locator('#btnMdpChanger').isVisible()));
} catch (e) {
  ko.push('PLANTAGE — ' + e.message.split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
for (const x of ok) console.log('  ok  ' + x);
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); for (const x of ko) console.log('  KO  ' + x); }
console.log('\n=== ' + ok.length + ' contrôles au vert, ' + ko.length + ' en échec ===');
process.exit(ko.length ? 1 : 0);
