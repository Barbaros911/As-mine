/* =====================================================================
   TEST-ADMIN-FORFAITS.MJS — les prix du flyer se règlent hôtel par hôtel
   ---------------------------------------------------------------------
   29 septembre 2026, à sa demande : « je veux pouvoir changer les prix des
   flyer par hôtel ». Réglages → « Prix du flyer, par hôtel » : on choisit
   l'hôtel, un tableau Destination × Berline / Van, et SEULS les prix
   modifiés partent au serveur.
   On éprouve le SITE CONSTRUIT (la connexion n'existe que là), et on lit
   ce qui part vraiment au serveur plutôt que ce que dit l'écran.
   Lancer :  node test-admin-forfaits.mjs
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
await new Promise(r => serveur.listen(8123, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8123';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});

const nav = await chromium.launch();
const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session',
  JSON.stringify({access_token:'JETON', refresh_token:'R'})));
const p = await ctx.newPage();
const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
const envois = [];
await p.route('**/*', async route => {
  const req = route.request(), u = req.url();
  if (u.startsWith(BASE)) return route.continue();
  if (u.includes('supabase.co')) {
    if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
    if (u.includes('/rest/v1/partenaires?')) return route.fulfill(J([{id:'p1'}]));
    if (u.includes('/rest/v1/tarifs_partenaires') && req.method() === 'PATCH') {
      envois.push({url:u, corps:JSON.parse(req.postData() || '{}')});
      return route.fulfill(J([{ok:1}]));
    }
    if (u.includes('/rest/v1/')) return route.fulfill(J([]));
    return route.fulfill(J({}));
  }
  return route.abort();
});

try {
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  await p.click('#btnReglages');
  await p.waitForSelector('#tarifForfaits .forfait-ligne input', {timeout:5000});

  const hotels = await p.$$eval('#forfaitHotel option', o => o.map(x => x.value));
  check('le menu propose l\'hôtel partenaire', hotels.includes('easyhotel-aeroville'), hotels.join(','));
  const lignes = await p.$$eval('#tarifForfaits .forfait-ligne:not(.forfait-tete)', l => l.length);
  check('une ligne par destination du flyer (7)', lignes === 7, String(lignes));
  const champs = await p.$$eval('#tarifForfaits input', l => l.length);
  check('deux prix par ligne, berline et van (14)', champs === 14, String(champs));
  check('le nom de l\'hôtel n\'est plus répété sur chaque ligne',
    !(await p.textContent('#tarifForfaits')).includes('easyHotel'));
  check('le bouton nomme l\'hôtel', /easyHotel/.test(await p.textContent('#btnForfaitsEnregistrer')));

  /* Rien de modifié : rien ne part. */
  await p.click('#btnForfaitsEnregistrer'); await p.waitForTimeout(400);
  check('sans modification, aucun envoi', envois.length === 0, String(envois.length));
  check('et on le dit', /Aucun prix modifié/.test(await p.textContent('#forfaitsEtat')));

  /* Un montant vide est refusé et nommé. */
  const orly = '#forfait_easyhotel-aeroville_orly_berline';
  await p.fill(orly, '');
  await p.click('#btnForfaitsEnregistrer'); await p.waitForTimeout(400);
  check('un montant vide ne part pas', envois.length === 0, String(envois.length));
  check('le message nomme la destination fautive', /Orly/.test(await p.textContent('#forfaitsEtat')),
    await p.textContent('#forfaitsEtat'));

  /* Un seul prix modifié : UN seul envoi, au bon endroit, au bon montant. */
  await p.fill(orly, '95');
  check('le prix modifié est marqué', await p.$eval(orly, e => e.classList.contains('modifie')));
  await p.click('#btnForfaitsEnregistrer');
  await p.waitForFunction(() => /enregistré/.test(document.getElementById('forfaitsEtat').textContent), null, {timeout:5000}).catch(() => {});
  check('un seul prix modifié → un seul envoi', envois.length === 1, String(envois.length));
  const e = envois[0] || {url:'', corps:{}};
  check('envoi sur Orly berline', /destination_cle=eq\.orly/.test(e.url) && /vehicule_cle=eq\.berline/.test(e.url), e.url);
  check('montant en centimes : 9500', e.corps.montant_centimes === 9500, String(e.corps.montant_centimes));
  check('après l\'enregistrement, plus rien n\'est marqué', !(await p.$eval(orly, e => e.classList.contains('modifie'))));
  check('le message dit que le flyer imprimé ne change pas', /imprimé/.test(await p.textContent('#forfaitsEtat')));
  check('la mémoire de la page suit (95 € en réouvrant)', await p.evaluate(() => {
    document.getElementById('btnAdminBord').click(); document.getElementById('btnReglages').click();
    return document.getElementById('forfait_easyhotel-aeroville_orly_berline').value;
  }) === '95');
  check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
} catch (x) { ko.push('PLANTAGE — ' + x.message.split('\n')[0]); }

await nav.close(); serveur.close();
console.log(`=== ${ok.length} réussis ===`); ok.forEach(x => console.log('  ✓ ' + x));
if (ko.length) { console.log(`=== ÉCHECS (${ko.length}) ===`); ko.forEach(x => console.log('  ✗ ' + x)); process.exit(1); }
