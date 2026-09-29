/* =====================================================================
   TEST-ADMIN-PUSH.MJS — l'admin retenu sait s'abonner aux notifications ELA
   ---------------------------------------------------------------------
   29 septembre 2026, Barbaros : « comment faire pour recevoir une
   notification ela ». Le bouton n'existait que dans Admin v2, abandonné :
   l'admin retenu n'avait aucun moyen de s'abonner, et le serveur notait
   « push : indisponible » à chaque demande.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT :
   - le bouton est dans Réglages, et c'est bien lui qui reçoit le doigt ;
   - l'appui enregistre l'abonnement par ela_enregistrer_push_admin, avec
     la clé publique de la page — la même RPC qu'Admin v2, un seul chemin ;
   - sur un iPhone qui n'a pas installé le site, on EXPLIQUE, on ne demande
     rien : une autorisation demandée là échouerait sans un mot.

   Lancer :  node test-admin-push.mjs
   ===================================================================== */
import { chromium, devices } from 'playwright';
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
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});
const nav = await chromium.launch();

async function espace(opts){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR', ...opts});
  await ctx.addInitScript(() => {
    localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'}));
    /* Un Chrome piloté n'a ni service worker actif ni service de push : on
       pose les deux, et on COMPTE les demandes d'autorisation. */
    window.__demandes = 0;
    window.Notification = function(){}; window.Notification.permission = 'default';
    window.Notification.requestPermission = () => { window.__demandes++; return Promise.resolve('granted'); };
    window.PushManager = function(){};
    window.__cle = null; window.__ancien = true; window.__retire = false;
    const reg = { pushManager: {
      /* Un abonnement fait avec une AUTRE clé : il doit être retiré. */
      getSubscription: () => Promise.resolve(window.__ancien ? { options:{ applicationServerKey: new Uint8Array(65).buffer },
        unsubscribe: () => { window.__retire = true; window.__ancien = false; return Promise.resolve(true); } } : null),
      subscribe: o => { window.__cle = Array.from(o.applicationServerKey).length;
        return Promise.resolve({ toJSON: () => ({ endpoint:'https://push.example/abc',
          keys:{ p256dh:'P'.repeat(40), auth:'AUTH12345' } }) }); } } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable:true,
      value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg),
               addEventListener(){}, controller:null } });
  });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const rpc = [];
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      if (u.includes('/rpc/ela_enregistrer_push_admin')) {
        rpc.push({ auth: route.request().headers()['authorization'], corps: route.request().postData() });
        return route.fulfill(J(true));
      }
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });
  await p.goto(BASE + '/admin.html');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  await p.click('#btnReglages');
  await p.waitForSelector('#btnPushAdmin', {state:'visible', timeout:5000});
  return {ctx, p, erreurs, rpc};
}

/* ─── 1. Ordinateur / Android : l'appui abonne et enregistre ─── */
{
  const {ctx, p, erreurs, rpc} = await espace({});
  await p.locator('#btnPushAdmin').scrollIntoViewIfNeeded();
  const recoit = await p.evaluate(() => { const b = document.getElementById('btnPushAdmin');
    const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
    return !!e && (e === b || b.contains(e)); });
  check('le bouton reçoit bien le doigt', recoit);
  await p.click('#btnPushAdmin');
  await p.waitForFunction(() => !document.getElementById('pushAdminEtat').hidden, null, {timeout:5000}).catch(()=>{});
  const etat = await p.textContent('#pushAdminEtat');
  check('une seule demande d\'autorisation, sur l\'appui', await p.evaluate(() => window.__demandes) === 1);
  check('l\'ancien abonnement (autre clé) est retiré avant de se réabonner', await p.evaluate(() => window.__retire));
  check('la clé publique de la page est passée (65 octets)', await p.evaluate(() => window.__cle) === 65);
  check('l\'abonnement part par ela_enregistrer_push_admin', rpc.length === 1, 'appels : ' + rpc.length);
  const corps = rpc[0] ? JSON.parse(rpc[0].corps) : {};
  check('avec le jeton de l\'exploitant', rpc[0] && rpc[0].auth === 'Bearer JETON');
  check('et l\'adresse de push', corps.p_abonnement && corps.p_abonnement.endpoint === 'https://push.example/abc');
  check('l\'écran dit que c\'est activé', /activées/.test(etat), etat);
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

/* ─── 2. iPhone sans le site installé : on explique, on ne demande rien ─── */
{
  const {ctx, p, rpc} = await espace({ userAgent: devices['iPhone 13'].userAgent });
  await p.click('#btnPushAdmin');
  const etat = await p.textContent('#pushAdminEtat');
  check('iPhone non installé : l\'écran explique l\'écran d\'accueil', /écran d'accueil/.test(etat), etat);
  check('iPhone non installé : aucune autorisation demandée', await p.evaluate(() => window.__demandes) === 0);
  check('iPhone non installé : rien n\'est enregistré', rpc.length === 0);
  await ctx.close();
}


/* ─── 3. L'outil qui fabrique la paire : les deux moitiés vont ensemble ─── */
{
  const {ctx, p, erreurs} = await espace({});
  await p.click('#blocClesVapid summary');
  await p.click('#btnClesVapid');
  await p.waitForSelector('#clesVapid:not([hidden])', {timeout:5000}).catch(()=>{});
  const pub = await p.inputValue('#cleVapidPub'), priv = await p.inputValue('#cleVapidPriv');
  const bp = Buffer.from(pub, 'base64url'), bd = Buffer.from(priv, 'base64url');
  check('publique : 65 octets non compressés', bp.length === 65 && bp[0] === 4, bp.length + ' octets');
  check('privée : 32 octets', bd.length === 32, bd.length + ' octets');
  check('base64url, sans +, / ni =', !/[+/=]/.test(pub + priv));
  /* Signer avec la privée, vérifier avec la publique : c'est ce que fera
     le service de push, et deux moitiés dépareillées ne passent pas. */
  const { webcrypto: wc } = await import('node:crypto');
  let accord = false;
  try {
    const jwk = { kty:'EC', crv:'P-256', x: bp.subarray(1,33).toString('base64url'),
      y: bp.subarray(33).toString('base64url'), d: priv };
    const cle = await wc.subtle.importKey('jwk', jwk, {name:'ECDSA', namedCurve:'P-256'}, false, ['sign']);
    const pubCle = await wc.subtle.importKey('raw', bp, {name:'ECDSA', namedCurve:'P-256'}, false, ['verify']);
    const sig = await wc.subtle.sign({name:'ECDSA', hash:'SHA-256'}, cle, Buffer.from('ela'));
    accord = await wc.subtle.verify({name:'ECDSA', hash:'SHA-256'}, pubCle, sig, Buffer.from('ela'));
  } catch (e) { accord = false; }
  check('les deux moitiés vont ensemble (signature vérifiée)', accord);
  check('aucune erreur JavaScript (outil)', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

await nav.close(); serveur.close();
console.log(`=== TEST ADMIN PUSH : ${ok.length} OK, ${ko.length} échec(s) ===`);
ok.forEach(x => console.log('  ✓ ' + x)); ko.forEach(x => console.log('  ✗ ' + x));
process.exit(ko.length ? 1 : 0);
