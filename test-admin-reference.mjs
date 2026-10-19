/* =====================================================================
   TEST-ADMIN-REFERENCE.MJS — une collision de référence ne remplace pas
   la course saisie par l'exploitant
   ---------------------------------------------------------------------
   Audit du 19 octobre 2026, avant l'exploitation à plusieurs hôtels. La
   référence est tirée au sort sur l'appareil (28 millions par mois) : à
   cent demandes par jour, deux tirages identiques dans le mois ne sont
   plus rares. Une course saisie au téléphone (« Saisir par téléphone »,
   « Coller une demande ») part en POST « ignore-duplicates » ; si la
   référence est déjà prise par la course d'un client inconnu, le serveur
   ne rend rien, l'admin relit la ligne et… adoptait la course de
   l'inconnu à la place de la sienne, avec le message « modifiée sur un
   autre appareil ». La course saisie disparaissait, sans un mot juste.

   CE QU'ON ÉPROUVE, sur le site construit, contre un faux serveur à
   versions :
   · collision (même référence, autre date de création, autre client) → la
     course garde tout, change de référence, repart, et l'écran le dit ;
   · accusé perdu (même référence, MÊME course déjà écrite) → le serveur
     gagne comme avant : pas de nouvelle référence, une seule écriture.
   On lit ce qui PART au serveur et ce que GARDE l'appareil.
   Lancer :  node test-admin-reference.mjs   (port 8133, propre à la suite)
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
await new Promise(r => serveur.listen(8133, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8133';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });

const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }).slice(0, 10);
const course = (ref, nom, tel, cree) => ({ ref, statut: 'confirmee', cree,
  course: { type: 'Trajet simple', depart: 'Place Vendôme, 75001 Paris', departPublic: 'Place Vendôme, 75001 Paris',
    arrivee: 'Aéroport Charles-de-Gaulle, Terminal 2E', arriveePublic: 'Aéroport Charles-de-Gaulle, Terminal 2E',
    date: paris(2 * 1440), heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline', passagers: '2 passagers', vol: '' },
  client: { nom, telephone: tel }, prix: { total: 70 }, langue: 'fr', canal: 'admin', chauffeur: { nom: 'Ali Ben', telephone: '06 11 22 33 44' } });

/* Sur l'appareil : deux courses saisies au téléphone, jamais lues du serveur
   (pas de « _v »), toutes deux en file d'envoi. */
const IL_Y_A_UNE_HEURE = new Date(Date.now() - 3600e3).toISOString();
const SAISIE = course('ELA-26-10-COLL1', 'Mme Saisie Au Telephone', '06 12 34 56 78', IL_Y_A_UNE_HEURE);
const ACCUSE_PERDU = course('ELA-26-10-PERD1', 'M. Accuse Perdu', '06 98 76 54 32', IL_Y_A_UNE_HEURE);
/* Sur le serveur : COLL1 est la course d'un client inconnu, tirée au même
   signe ; PERD1 est NOTRE course, déjà écrite, dont l'accusé s'est perdu. */
const INCONNU = course('ELA-26-10-COLL1', 'Client Inconnu Du Site', '07 00 00 00 00', new Date(Date.now() - 7200e3).toISOString());
INCONNU.statut = 'attente'; delete INCONNU.chauffeur; INCONNU.securite = { empreinteDepot: 'e' };
/* LA DEMANDE COLLÉE (relecture indépendante du 19/10/2026) : le client a lu
   « non transmise » pour un dépôt qui avait ABOUTI, il a renvoyé son message
   WhatsApp, Barbaros l'a collé. La course collée garde la référence du client
   (intake-demande.js) et porte sa propre date de lecture ; sur le serveur, la
   ligne porte la date du serveur et l'empreinte de dépôt. Même téléphone, même
   date, même heure : c'est LA MÊME demande — le serveur doit gagner, jamais une
   référence neuve (ce serait une course en double). Le premier jet comparait
   la date de création et aurait doublé. */
const COLLEE = course('ELA-26-10-COLL2', 'Mme Collee Depuis Whatsapp', '06 44 55 66 77', new Date(Date.now() - 600e3).toISOString());
COLLEE.statut = 'attente'; delete COLLEE.chauffeur; delete COLLEE.canal;
const COLLEE_SERVEUR = JSON.parse(JSON.stringify(COLLEE));
COLLEE_SERVEUR.cree = new Date(Date.now() - 900e3).toISOString(); COLLEE_SERVEUR.securite = { empreinteDepot: 'abc' };
COLLEE_SERVEUR.client.telephone = '+33 6 44 55 66 77'; /* le serveur a le numéro tel que tapé par le client */
const base = {
  'ELA-26-10-COLL1': { bon: JSON.parse(JSON.stringify(INCONNU)), statut: 'attente', version: 3 },
  'ELA-26-10-PERD1': { bon: JSON.parse(JSON.stringify(ACCUSE_PERDU)), statut: 'confirmee', version: 1 },
  'ELA-26-10-COLL2': { bon: COLLEE_SERVEUR, statut: 'attente', version: 2 },
};
const ecritures = []; const erreurs = [];
let erreursSite = { n24h: 3, n1h: 1, derniere: new Date().toISOString(), messages: [{ message: 'TypeError: x is undefined', espace: 'public', n: 2 }, { message: 'promesse perdue', espace: 'hotel', n: 1 }] };

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
await ctx.addInitScript(({ c, file }) => {
  if (sessionStorage.getItem('__pose')) return;
  sessionStorage.setItem('__pose', '1');
  localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token: 'JETON', refresh_token: 'R', user: { id: 'u-barbaros' } }));
  localStorage.setItem('ela_bookings', JSON.stringify(c));
  localStorage.setItem('ela_file', JSON.stringify(file));
}, { c: [SAISIE, ACCUSE_PERDU, COLLEE], file: { 'ELA-26-10-COLL1': { depuis: Date.now(), essais: 0, gen: 1 }, 'ELA-26-10-PERD1': { depuis: Date.now(), essais: 0, gen: 1 }, 'ELA-26-10-COLL2': { depuis: Date.now(), essais: 0, gen: 1 } } });
/* Les deux courses en file se vident l'une après l'autre et le même écriteau
   (#bordConflit) sert aux deux : on relève CHAQUE phrase qu'il a affichée,
   pas seulement la dernière. */
await ctx.addInitScript(() => {
  window.__ecriteaux = [];
  const noter = () => {
    const e = document.getElementById('bordConflit');
    const t = e && !e.hidden ? e.textContent : '';
    if (t && window.__ecriteaux[window.__ecriteaux.length - 1] !== t) window.__ecriteaux.push(t);
  };
  /* Un observateur de mutations voit CHAQUE écriture, même deux à quelques
     millisecondes d'écart ; un simple minuteur en manquait une. */
  const observer = new MutationObserver(noter);
  const brancher = () => { if (document.documentElement) observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true }); else setTimeout(brancher, 0); };
  brancher();
  setInterval(noter, 40);
});
await ctx.route('**/*', async route => {
  const req = route.request(), u = req.url(), m = req.method();
  if (u.startsWith(BASE)) return route.continue();
  if (!u.includes('supabase.co')) return route.abort();
  if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
  /* Les erreurs du site (19/10/2026) : trois en 24 h dont une dans l'heure,
     ou une RPC absente (migration pas encore appliquée). */
  if (u.includes('/rpc/ela_erreurs_client_recentes')) {
    if (!erreursSite) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"code":"PGRST202"}' });
    return route.fulfill(J(erreursSite));
  }
  if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
  if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J([]));
  if (!u.includes('/rest/v1/courses')) return route.fulfill(J([]));
  const ref = decodeURIComponent((u.match(/ref=eq\.([^&]+)/) || [])[1] || '');
  if (m === 'GET') {
    const lignes = Object.values(base).map(l => ({ bon: l.bon, statut: l.statut, version: l.version, modifie_le: '2026-10-19T08:00:00Z', cree_le: l.bon.cree }));
    if (u.includes('select=ref')) return route.fulfill(J(lignes.slice(0, 1).map(l => ({ ref: l.bon.ref, version: l.version }))));
    if (ref) return route.fulfill(J(lignes.filter(l => l.bon.ref === ref)));
    return route.fulfill(J(lignes));
  }
  let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
  if (m === 'POST') {
    ecritures.push({ ref: corps.ref, bon: corps.bon, statut: corps.statut, prefer: req.headers()['prefer'] || '' });
    /* « resolution=ignore-duplicates » : une référence déjà prise ne rend
       RIEN — ni erreur, ni ligne — exactement comme PostgREST. */
    if (base[corps.ref]) return route.fulfill(J([]));
    base[corps.ref] = { bon: corps.bon, statut: corps.statut, version: 1 };
    return route.fulfill(J([{ version: 1, cree_le: corps.bon && corps.bon.cree }]));
  }
  if (m === 'PATCH') {
    const v = Number((u.match(/version=eq\.(\d+)/) || [])[1]);
    ecritures.push({ ref, bon: corps.bon, statut: corps.statut, version: v, patch: true });
    const l = base[ref];
    if (!l || l.version !== v) return route.fulfill(J([]));
    l.bon = corps.bon; l.statut = corps.statut; l.version++;
    return route.fulfill(J([{ version: l.version, cree_le: l.bon.cree }]));
  }
  return route.fulfill(J([]));
});
const p = await ctx.newPage();
p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));

try {
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  /* La file se vide au premier passage de la sonde ; on laisse le temps aux
     deux envois, à la relecture et au renvoi. */
  await p.waitForFunction(() => { try { return Object.keys(JSON.parse(localStorage.getItem('ela_file') || '{}')).length === 0; } catch { return false; } }, null, { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(800);

  const posts = ecritures.filter(e => !e.patch);
  const pourColl = posts.filter(e => e.ref === 'ELA-26-10-COLL1');
  const neuves = posts.filter(e => !['ELA-26-10-COLL1', 'ELA-26-10-PERD1', 'ELA-26-10-COLL2'].includes(e.ref));
  check('collision : la course saisie part UNE fois sous sa référence d\'origine', pourColl.length === 1, pourColl.length + ' envoi(s)');
  check('collision : puis UNE fois sous une référence neuve', neuves.length === 1, neuves.map(e => e.ref).join(','));
  const neuve = neuves[0] && neuves[0].ref;
  check('collision : la référence neuve a la forme du site', /^ELA-\d\d-\d\d-[23456789A-HJKMNP-Z]{5}$/.test(neuve || ''), neuve);
  check('collision : ce qui repart est la course SAISIE, pas celle de l\'inconnu',
    !!neuves[0] && neuves[0].bon.client.nom === 'Mme Saisie Au Telephone' && neuves[0].bon.chauffeur && neuves[0].bon.chauffeur.nom === 'Ali Ben' && neuves[0].bon.ref === neuve,
    neuves[0] && JSON.stringify(neuves[0].bon.client));
  check('collision : la course de l\'inconnu n\'est pas touchée sur le serveur',
    base['ELA-26-10-COLL1'].version === 3 && base['ELA-26-10-COLL1'].bon.client.nom === 'Client Inconnu Du Site');

  const registre = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]'));
  const locale = registre.find(c => c.ref === neuve);
  const inconnuLocal = registre.find(c => c.ref === 'ELA-26-10-COLL1');
  check('collision : l\'appareil garde la course saisie sous la référence neuve, avec sa version serveur',
    !!locale && locale.client.nom === 'Mme Saisie Au Telephone' && locale._v === 1, JSON.stringify(locale && { ref: locale.ref, nom: locale.client.nom, _v: locale._v }));
  check('collision : aucune course saisie ne reste sous l\'ancienne référence (celle-ci est celle de l\'inconnu, lue du serveur)',
    !inconnuLocal || inconnuLocal.client.nom === 'Client Inconnu Du Site', inconnuLocal && inconnuLocal.client.nom);
  check('collision : le registre ne compte pas la course saisie en double',
    registre.filter(c => c.client && c.client.nom === 'Mme Saisie Au Telephone').length === 1);
  const ecriteaux = await p.evaluate(() => window.__ecriteaux || []);
  const ecriteau = ecriteaux.find(t => /déjà prise/.test(t)) || '';
  check('collision : l\'écran dit que la référence a changé, et laquelle',
    ecriteau.includes('ELA-26-10-COLL1') && ecriteau.includes(neuve || '§'), ecriteaux.map(t => t.slice(0, 60)).join(' | '));

  /* L'ACCUSÉ PERDU : la ligne du serveur EST notre course (même « cree »).
     Le serveur gagne, comme avant : aucune référence neuve, une seule
     écriture, et la copie locale porte la version du serveur. */
  const pourPerd = posts.filter(e => e.ref === 'ELA-26-10-PERD1');
  check('accusé perdu : une seule écriture, aucune référence neuve', pourPerd.length === 1 && neuves.length === 1, pourPerd.length + ' / ' + neuves.length);
  const perd = registre.find(c => c.ref === 'ELA-26-10-PERD1');
  check('accusé perdu : la copie locale adopte la version du serveur', !!perd && perd._v === 1 && perd.client.nom === 'M. Accuse Perdu', JSON.stringify(perd && { _v: perd._v }));
  /* LA DEMANDE COLLÉE : même téléphone (écrit autrement), même date, même
     heure, autre date de création → c'est la nôtre, le serveur gagne. */
  const pourColl2 = posts.filter(e => e.ref === 'ELA-26-10-COLL2');
  check('demande collée : une seule écriture, aucune référence neuve (pas de course en double)', pourColl2.length === 1 && neuves.length === 1, pourColl2.length + ' / ' + neuves.length);
  const coll2 = registre.find(c => c.ref === 'ELA-26-10-COLL2');
  check('demande collée : la copie locale adopte la ligne du serveur (version, empreinte de dépôt)',
    !!coll2 && coll2._v === 2 && coll2.securite && coll2.securite.empreinteDepot === 'abc', JSON.stringify(coll2 && { _v: coll2._v, s: coll2.securite }));
  check('demande collée : le serveur n\'a pas été réécrit', base['ELA-26-10-COLL2'].version === 2);
  const file = await p.evaluate(() => localStorage.getItem('ela_file'));
  check('la file est vide à la fin', !file || file === '{}', file);

  /* LES ERREURS DU SITE SOUS LE VOYANT (19/10/2026) : comptées quand il y en
     a, cachées quand la RPC manque — jamais un « 0 » qui ne se lirait plus. */
  const ligneErreurs = await p.evaluate(() => { const e = document.getElementById('adminErreurs'); return e && !e.hidden ? { texte: e.textContent.trim(), titre: e.title, recente: e.classList.contains('recente') } : null; });
  check('erreurs du site : la ligne compte 3 en 24 h et 1 dans l\'heure', !!ligneErreurs && /3 erreurs du site en 24 h \(1 dans l'heure\)/.test(ligneErreurs.texte), ligneErreurs && ligneErreurs.texte);
  check('erreurs du site : les messages les plus fréquents sont dans l\'infobulle, avec leur espace', !!ligneErreurs && /2 × \[public\] TypeError/.test(ligneErreurs.titre) && ligneErreurs.recente, ligneErreurs && ligneErreurs.titre);
  erreursSite = null;
  const p2 = await ctx.newPage();
  await p2.goto(BASE + '/ela-admin/');
  await p2.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 15000 });
  await p2.waitForTimeout(1500);
  check('erreurs du site : RPC absente (migration pas appliquée) → la ligne reste cachée', await p2.evaluate(() => { const e = document.getElementById('adminErreurs'); return !e || e.hidden; }));
  await p2.close();
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
