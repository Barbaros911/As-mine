/* =====================================================================
   TEST-ADMIN-DONNEES-SERVEUR.MJS — le carnet, les règlements et les factures
   vivent sur le serveur, et deux appareils voient la même chose
   ---------------------------------------------------------------------
   24 octobre 2026, P1. Les règles du serveur sont éprouvées sur un vrai
   PostgreSQL (supabase/tests/donnees-metier.sh) ; ici on éprouve L'ÉCRAN,
   sur le site construit, face à un faux Supabase PARTAGÉ par deux
   navigateurs (« appareil A », « appareil B ») et qui suit le même contrat
   que les fonctions SQL : identifiants d'appareil, versions, numéro de
   facture pris par le serveur, import qui ajoute sans remplacer.

   Ce qu'on éprouve :
   1. l'appareil A, qui a des données anciennes, les ENVOIE au serveur, les
      RELIT, et ne bascule qu'ensuite — rien n'est effacé chez lui ;
   2. l'appareil B, vide (un téléphone neuf), retrouve tout ;
   3. une fiche créée sur B est vue par A ; une fiche changée sur A puis sur
      B depuis la même version : le second appareil est refusé, et le dit ;
   4. un règlement saisi par un double appui n'existe qu'une fois ;
   5. une facture émise par un double appui : une seule, numérotée par le
      serveur APRÈS le plus grand numéro de l'appareil — jamais une collision ;
   6. sans réseau, un règlement attend dans la file, puis part UNE fois ;
   7. restaurer une ancienne sauvegarde l'envoie au serveur ; la restaurer
      deux fois n'ajoute rien ;
   8. un serveur sans ces fonctions laisse l'appareil comme avant (la facture
      prend encore son numéro sur l'appareil).
   Port 8181, propre à cette suite.

   Lancer :  node test-admin-donnees-serveur.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
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
await new Promise(r => serveur.listen(8181, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8181';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = (b, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(b) });
const ERR = (message, status = 400) => J({ code: 'P0001', message, details: null, hint: null }, status);
await mkdir('captures-admin', { recursive: true });

const ANNEE = Number(new Intl.DateTimeFormat('en', { timeZone: 'Europe/Paris', year: 'numeric' }).format(new Date()));
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JETON = b64({ alg: 'HS256' }) + '.' + b64({ sub: 'u-barbaros', aal: 'aal2', role: 'authenticated' }) + '.s';
const SESSION = { access_token: JETON, refresh_token: 'R', token_type: 'bearer', user: { id: 'u-barbaros' } };
const auj = new Date().toISOString().slice(0, 10);
const bon = (ref, prix, extra = {}) => ({ ref, statut: 'realisee', cree: new Date().toISOString(),
  course: { depart: 'Place Vendôme, 75001 Paris', arrivee: 'Orly', date: auj, heure: '10:00', vehicule: 'Berline', vehiculeCle: 'berline' },
  client: { nom: 'Client ' + ref.slice(-2), telephone: '06 12 34 56 78' }, prix: { total: prix },
  chauffeur: { nom: 'Ayse', telephone: '0612345678' }, ...extra });

/* LE FAUX SUPABASE — un seul état, partagé par les deux appareils. */
function etatNeuf() {
  const courses = new Map();
  for (const [ref, prix] of [['ELA-26-10-AAA01', 100], ['ELA-26-10-AAA02', 200], ['ELA-26-10-AAA03', 50]])
    courses.set(ref, { ref, statut: 'realisee', version: 1, bon: bon(ref, prix), cree_le: new Date().toISOString() });
  return { chauffeurs: new Map(), reglements: new Map(), factures: new Map(), cles: new Map(),
    compteur: {}, params: {}, courses, panne: false, sansFonctions: false, appels: [] };
}
let S = etatNeuf();
const memeFiche = (a, p) => ['nom','telephone','siret','adresse','carte','carteFin','registre','registreFin','assurance','assuranceFin']
  .every(k => String(a[k] ?? '') === String(p[k] ?? '').trim()) && String(a.taux ?? '') === String(p.taux ?? '') && (a.tauxMode || 'pct') === (p.tauxMode === 'eur' ? 'eur' : 'pct');
const fiche = c => { const { actif, ...f } = c; return f; };
function chauffeurEcrire(p) {
  if (!/^CH-[A-Za-z0-9_-]{1,60}$/.test(p.id || '')) return { erreur: 'identifiant_invalide' };
  const c = S.chauffeurs.get(p.id);
  if (c && c.actif && (p.version == null || p.version !== c.version)) {
    if (memeFiche(c, p)) return { j: fiche(c) };
    return { erreur: 'conflit_version' };
  }
  const n = { id: p.id, nom: p.nom, telephone: p.telephone || '', siret: p.siret || '', adresse: p.adresse || '', carte: p.carte || '',
    carteFin: p.carteFin || '', registre: p.registre || '', registreFin: p.registreFin || '', assurance: p.assurance || '',
    assuranceFin: p.assuranceFin || '', taux: p.taux ?? null, tauxMode: p.tauxMode === 'eur' ? 'eur' : 'pct',
    version: c ? c.version + 1 : 1, actif: true };
  S.chauffeurs.set(p.id, n);
  return { j: fiche(n) };
}
function reglementEcrire(p) {
  if (!/^P-[A-Za-z0-9_-]{1,60}$/.test(p.id || '')) return { erreur: 'identifiant_invalide' };
  const r = S.reglements.get(p.id);
  if (r) return (r.montant === Math.round(+p.montant * 100) / 100 && r.cle === p.cle) ? { j: r } : { erreur: 'identifiant_reutilise' };
  const n = { id: p.id, cle: p.cle, nom: p.nom || '', tel: p.tel || '', montant: Math.round(+p.montant * 100) / 100, date: p.date, mode: p.mode || '' };
  S.reglements.set(p.id, n);
  return { j: n };
}
const rangDe = num => /^F-\d{4}-\d+$/.test(num) ? +num.split('-')[2] : null;
function factureEmettre(p) {
  if (S.cles.has(p.cle)) return { j: S.factures.get(S.cles.get(p.cle)) };
  if (!p.emetteur?.nom || !p.emetteur?.siret || !p.emetteur?.adresse) return { erreur: 'emetteur_incomplet' };
  const ch = S.chauffeurs.get(p.client?.id);
  if (!ch || !ch.actif) return { erreur: 'chauffeur_inconnu' };
  for (const ref of p.refs) {
    const c = S.courses.get(ref);
    if (!c || c.statut !== 'realisee' || c.bon.factureNum) return { erreur: 'course_non_facturable' };
  }
  const ht = Math.round(p.lignes.reduce((s, l) => s + l.commission, 0) * 100) / 100;
  if (Math.abs(ht - p.ht) > 0.01) return { erreur: 'montants_incoherents' };
  S.compteur[ANNEE] = (S.compteur[ANNEE] || 0) + 1;
  const num = 'F-' + ANNEE + '-' + String(S.compteur[ANNEE]).padStart(4, '0');
  const doc = { ...p, num }; delete doc.cle;
  S.factures.set(num, doc); S.cles.set(p.cle, num);
  for (const ref of p.refs) { const c = S.courses.get(ref); c.bon = { ...c.bon, factureNum: num }; c.version++; c.modifie = Date.now(); }
  S.appels.push('emission:' + num);
  return { j: doc };
}
function importer(p) {
  const cr = { chauffeurs: { ajoutes: 0, deja: 0, conflits: [], refuses: [] }, reglements: { ajoutes: 0, deja: 0, conflits: [], refuses: [] },
    factures: { ajoutes: 0, deja: 0, conflits: [], refuses: [] }, emetteur: 'deja', lienAvis: 'deja' };
  for (const x of p.chauffeurs || []) {
    if (!/^CH-/.test(x.id || '') || !x.nom) { cr.chauffeurs.refuses.push(x.id || '?'); continue; }
    const c = S.chauffeurs.get(x.id);
    if (c) { (c.nom.toLowerCase() === String(x.nom).toLowerCase() ? cr.chauffeurs.deja++ : cr.chauffeurs.conflits.push(x.id)); continue; }
    const { version, ...sans } = x; chauffeurEcrire(sans); cr.chauffeurs.ajoutes++;
  }
  for (const x of p.paiementsChauffeurs || []) {
    const r = S.reglements.get(x.id);
    if (r) { (r.montant === Math.round(+x.montant * 100) / 100 && r.cle === x.cle ? cr.reglements.deja++ : cr.reglements.conflits.push(x.id)); continue; }
    reglementEcrire(x).erreur ? cr.reglements.refuses.push(x.id || '?') : cr.reglements.ajoutes++;
  }
  for (const x of p.factures || []) {
    if (rangDe(x.num) === null) { cr.factures.refuses.push(x.num || '?'); continue; }
    const f = S.factures.get(x.num);
    if (f) { (f.client?.id === x.client?.id && f.ttc === x.ttc ? cr.factures.deja++ : cr.factures.conflits.push(x.num)); continue; }
    S.factures.set(x.num, x); cr.factures.ajoutes++;
    for (const ref of x.refs || []) { const c = S.courses.get(ref); if (c && !c.bon.factureNum) { c.bon = { ...c.bon, factureNum: x.num }; c.version++; } }
  }
  const rg = typeof p.rangFacture === 'string' ? JSON.parse(p.rangFacture || 'null') : p.rangFacture;
  const maxi = {};
  for (const num of S.factures.keys()) { const a = +num.split('-')[1]; maxi[a] = Math.max(maxi[a] || 0, rangDe(num)); }
  if (rg && rg.annee) maxi[rg.annee] = Math.max(maxi[rg.annee] || 0, rg.rang);
  for (const a in maxi) S.compteur[a] = Math.max(S.compteur[a] || 0, maxi[a]);
  if (p.entreprise?.nom) { if (!S.params.entreprise_emettrice) { S.params.entreprise_emettrice = { ...p.entreprise, taux_tva: p.entreprise.tva || 0 }; cr.emetteur = 'ajoute'; } }
  else cr.emetteur = 'absent';
  if (/^https:\/\//.test(p.lienAvis || '')) { if (!S.params.lien_avis) { S.params.lien_avis = { url: p.lienAvis }; cr.lienAvis = 'ajoute'; } }
  else cr.lienAvis = 'absent';
  S.appels.push('import');
  return { j: cr };
}
const lignesCourses = () => [...S.courses.values()].map(c => ({ bon: c.bon, statut: c.statut, version: c.version, cree_le: c.cree_le }));

async function routeur(route) {
  const req = route.request(), u = req.url(), m = req.method();
  if (u.startsWith(BASE)) return route.continue();
  if (!u.includes('supabase.co')) return route.abort();
  const corps = (() => { try { return JSON.parse(req.postData() || '{}'); } catch { return {}; } })();
  const rpc = (u.match(/\/rpc\/([a-z_]+)/) || [])[1];
  if (rpc === 'est_exploitant') return route.fulfill(J(true));
  if (rpc === 'role_operateur') return route.fulfill(J('admin'));
  if (rpc && rpc.startsWith('ela_') && /chauffeur|reglement|facture|importer/.test(rpc)) {
    if (S.panne) return route.abort('internetdisconnected');
    if (S.sansFonctions) return route.fulfill(J({ code: 'PGRST202', message: 'Could not find the function' }, 404));
    S.appels.push(rpc);
    let r;
    if (rpc === 'ela_chauffeurs_lister') r = { j: [...S.chauffeurs.values()].filter(c => c.actif || corps.p_tous).map(c => ({ ...fiche(c), ...(c.actif ? {} : { retire: true }) })) };
    else if (rpc === 'ela_chauffeur_ecrire') r = chauffeurEcrire(corps.p);
    else if (rpc === 'ela_chauffeur_retirer') { const c = S.chauffeurs.get(corps.p_id); if (c) { c.actif = false; c.version++; } r = { j: true }; }
    else if (rpc === 'ela_reglements_lister') r = { j: [...S.reglements.values()].filter(x => !x.retire || corps.p_tous) };
    else if (rpc === 'ela_reglement_ecrire') r = reglementEcrire(corps.p);
    else if (rpc === 'ela_reglement_retirer') { const x = S.reglements.get(corps.p_id); if (x) x.retire = true; r = { j: true }; }
    else if (rpc === 'ela_factures_lister') r = { j: [...S.factures.values()].sort((a, b) => a.num.localeCompare(b.num)) };
    else if (rpc === 'ela_facture_emettre') r = factureEmettre(corps.p);
    else if (rpc === 'ela_importer_appareil') r = importer(corps.p);
    return route.fulfill(r.erreur ? ERR(r.erreur) : J(r.j));
  }
  if (u.includes('/rest/v1/parametres_commerciaux')) {
    if (m === 'POST') { S.params[corps.cle] = corps.valeur; S.appels.push('param:' + corps.cle); return route.fulfill({ status: 201, body: '' }); }
    const cle = (u.match(/cle=eq\.([a-z_]+)/) || [])[1];
    return route.fulfill(J(S.params[cle] ? [{ valeur: S.params[cle] }] : []));
  }
  if (u.includes('/rest/v1/courses')) {
    if (m === 'GET' && /limit=1(&|$)/.test(u) && /order=modifie_le/.test(u)) {
      const d = [...S.courses.values()].sort((a, b) => (b.modifie || 0) - (a.modifie || 0))[0];
      return route.fulfill(J(d ? [{ ref: d.ref, version: d.version }] : []));
    }
    const ref = (u.match(/ref=eq\.([^&]+)/) || [])[1];
    if (m === 'GET' && ref) { const c = S.courses.get(decodeURIComponent(ref)); return route.fulfill(J(c ? [{ bon: c.bon, statut: c.statut, version: c.version, cree_le: c.cree_le }] : [])); }
    if (m === 'GET') return route.fulfill(J(lignesCourses()));
    if (m === 'PATCH' && ref) {
      const c = S.courses.get(decodeURIComponent(ref)), v = +(u.match(/version=eq\.(\d+)/) || [])[1];
      if (!c || c.version !== v) return route.fulfill(J([]));
      c.bon = corps.bon; c.statut = corps.statut; c.version++;
      return route.fulfill(J([{ version: c.version, cree_le: c.cree_le }]));
    }
    return route.fulfill(J([]));
  }
  if (u.includes('/rest/v1/') || u.includes('/functions/v1/')) return route.fulfill(J([]));
  return route.fulfill(J({}));
}

const erreurs = [];
const nav = await chromium.launch();
async function appareil(nom, local = {}) {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', acceptDownloads: true });
  await ctx.addInitScript(({ session, local }) => {
    if (sessionStorage.getItem('__pose')) return;
    sessionStorage.setItem('__pose', '1');
    localStorage.setItem('ela_nuage_session', JSON.stringify(session));
    localStorage.setItem('ela_acces_verifie', 'u-barbaros');
    for (const [k, v] of Object.entries(local)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, { session: SESSION, local });
  await ctx.route('**/*', routeur);
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(nom + ' : ' + e.message.split('\n')[0]));
  await p.goto(BASE + '/ela-admin/');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout: 10000 });
  return { ctx, p };
}
const lire = (p, cle) => p.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return localStorage.getItem(k); } }, cle);
const attendre = (p, f, arg, t = 8000) => p.waitForFunction(f, arg, { timeout: t }).catch(() => {});
const bascule = p => attendre(p, () => !!localStorage.getItem('ela_metier_serveur'));
const resync = async p => { await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(600); };
async function aller(p, bouton, ecranId) {
  await p.click('#' + bouton);
  await attendre(p, id => document.getElementById(id).classList.contains('actif'), ecranId);
}

/* L'appareil A : des mois de travail, seulement chez lui. */
const LOCAL_A = {
  ela_chauffeurs: [{ id: 'CH-ayse', nom: 'Ayse', telephone: '0612345678', siret: '11122233300011', adresse: 'Paris',
    carteFin: '2027-06-30', registreFin: '2027-06-30', assuranceFin: '2027-06-30', taux: 10, tauxMode: 'pct' }],
  ela_paiements_chauffeurs: [{ id: 'P-ancien', cle: 'id:CH-ayse', nom: 'Ayse', tel: '0612345678', montant: 5, date: '2026-09-02', mode: 'especes' }],
  ela_factures: [{ num: 'F-' + ANNEE + '-0007', date: ANNEE + '-09-30', du: ANNEE + '-09-01', au: ANNEE + '-09-30',
    emetteur: { nom: 'Elatransfer', siret: '12345678900011', adresse: 'Paris' }, client: { id: 'CH-ayse', nom: 'Ayse' },
    lignes: [], ht: 12, tauxTva: 0, tva: 0, ttc: 12, refs: [] }],
  ela_rang_facture: { annee: ANNEE, rang: 7 },
  ela_entreprise: { nom: 'Elatransfer', siret: '12345678900011', adresse: '1 rue de Paris', contact: 'contact@elatransfer.com', tva: 0 },
  ela_lien_avis: 'https://g.page/r/exemple/review',
};

/* ─── 1. L'appareil A envoie, relit, vérifie, puis bascule ─── */
const A = await appareil('A', LOCAL_A);
await bascule(A.p);
const bA = await lire(A.p, 'ela_metier_serveur');
check('1a. A bascule sur le serveur, pour CE compte', bA && bA.id === 'u-barbaros', JSON.stringify(bA));
check('1b. ses données sont sur le serveur : fiche, règlement, facture, émetteur, lien d\'avis',
  S.chauffeurs.has('CH-ayse') && S.reglements.has('P-ancien') && S.factures.has('F-' + ANNEE + '-0007')
  && S.params.entreprise_emettrice?.siret === '12345678900011' && S.params.lien_avis?.url === LOCAL_A.ela_lien_avis);
const ordre = S.appels.filter(a => /import|lister/.test(a)).slice(0, 4).join(',');
check('1c. dans cet ordre : envoyer, PUIS relire le serveur (carnet, règlements, factures)', /^import,ela_chauffeurs_lister,ela_reglements_lister,ela_factures_lister/.test(S.appels.slice(S.appels.indexOf('import')).join(',')), ordre);
check('1d. le compteur des factures part au-dessus du plus grand numéro de l\'appareil (7)', S.compteur[ANNEE] === 7, JSON.stringify(S.compteur));
const avant = await lire(A.p, 'ela_metier_avant_import');
check('1e. rien n\'est effacé : la copie d\'avant l\'import est gardée sur l\'appareil', avant && avant.donnees && avant.donnees.chauffeurs.length === 1 && avant.donnees.factures.length === 1);
check('1f. la copie de l\'appareil est toujours là', (await lire(A.p, 'ela_chauffeurs')).length === 1 && (await lire(A.p, 'ela_factures')).length === 1);
await A.p.evaluate(() => document.getElementById('btnReglages').click());
await attendre(A.p, () => !document.getElementById('metierEtat').hidden);
check('1g. Réglages le dit : les données sont sur le serveur', /sont sur le serveur/.test(await A.p.textContent('#metierEtat')), await A.p.textContent('#metierEtat'));

/* ─── 2. L'appareil B, neuf, retrouve tout ─── */
const B = await appareil('B');
await bascule(B.p);
await attendre(B.p, () => (JSON.parse(localStorage.getItem('ela_chauffeurs') || '[]')).length === 1);
const chB = await lire(B.p, 'ela_chauffeurs');
check('2a. B (téléphone neuf) retrouve le carnet, papiers et taux compris',
  chB.length === 1 && chB[0].id === 'CH-ayse' && chB[0].assuranceFin === '2027-06-30' && chB[0].taux === 10, JSON.stringify(chB));
check('2b. B retrouve le règlement et la facture', (await lire(B.p, 'ela_paiements_chauffeurs')).length === 1
  && (await lire(B.p, 'ela_factures')).some(f => f.num === 'F-' + ANNEE + '-0007'));
check('2c. B retrouve l\'émetteur et le lien d\'avis', (await lire(B.p, 'ela_entreprise')).siret === '12345678900011'
  && (await B.p.evaluate(() => localStorage.getItem('ela_lien_avis'))) === LOCAL_A.ela_lien_avis);
await aller(B.p, 'btnChauffeurs', 'ecran-chauffeurs');
check('2d. l\'écran Chauffeurs de B montre Ayse', /Ayse/.test(await B.p.textContent('#ecran-chauffeurs')));

/* ─── 3. Créée sur B, vue sur A ; deux modifications concurrentes ─── */
await B.p.fill('#chNom', 'Bruno');
await B.p.fill('#chTel', '0600000002');
await B.p.click('#btnChEnregistrer');
await attendre(B.p, () => true);
await B.p.waitForTimeout(600);
const bruno = [...S.chauffeurs.values()].find(c => c.nom === 'Bruno');
check('3a. la fiche créée sur B est sur le serveur', !!bruno);
await resync(A.p);
await attendre(A.p, () => (JSON.parse(localStorage.getItem('ela_chauffeurs') || '[]')).some(c => c.nom === 'Bruno'));
check('3b. A la voit, sans rien faire', (await lire(A.p, 'ela_chauffeurs')).some(c => c.nom === 'Bruno'));
/* A et B ouvrent la fiche d'Ayse dans la même version ; A enregistre, puis B. */
await resync(B.p);
await aller(A.p, 'btnChauffeurs', 'ecran-chauffeurs');
const ouvrirFiche = async (p, nom) => {
  await p.evaluate(n => { const b = [...document.querySelectorAll('#ecran-chauffeurs .ch-carte')].find(x => x.textContent.includes(n)); if (b) b.click(); }, nom);
  await attendre(p, n => document.getElementById('chNom').value === n, nom);
};
await ouvrirFiche(A.p, 'Ayse');
await ouvrirFiche(B.p, 'Ayse');
await A.p.fill('#chAdresse', 'Adresse vue par A');
await A.p.click('#btnChEnregistrer');
await A.p.waitForTimeout(600);
check('3c. la modification de A passe (version 2)', S.chauffeurs.get('CH-ayse').adresse === 'Adresse vue par A' && S.chauffeurs.get('CH-ayse').version === 2);
await B.p.fill('#chAdresse', 'Adresse vue par B');
await B.p.click('#btnChEnregistrer');
await B.p.waitForTimeout(900);
check('3d. B, parti de la version 1, ne l\'écrase PAS', S.chauffeurs.get('CH-ayse').adresse === 'Adresse vue par A');
await B.p.evaluate(() => document.getElementById('btnReglages').click());
await attendre(B.p, () => /autre appareil/.test(document.getElementById('metierEtat').textContent));
check('3e. B le dit, et affiche la version du serveur', /modifiée sur un autre appareil/.test(await B.p.textContent('#metierEtat'))
  && (await lire(B.p, 'ela_chauffeurs')).find(c => c.id === 'CH-ayse').adresse === 'Adresse vue par A', await B.p.textContent('#metierEtat'));

/* ─── 4. Un règlement, deux appuis : une fois ─── */
await aller(A.p, 'btnControle', 'ecran-controle');
await attendre(A.p, () => !!document.querySelector('[data-payer]'));
await A.p.click('[data-payer]');
await A.p.fill('#ccPaiementMontant', '20');
await A.p.dblclick('#btnCcPaiementOk');
await A.p.waitForTimeout(800);
const rg20 = [...S.reglements.values()].filter(r => r.montant === 20);
check('4a. double appui sur « Enregistrer le paiement » : UN règlement sur le serveur', rg20.length === 1, rg20.length + ' règlement(s)');
check('4b. et un seul sur l\'appareil', (await lire(A.p, 'ela_paiements_chauffeurs')).filter(r => r.montant === 20).length === 1);

/* ─── 5. Une facture, deux appuis : une seule, numérotée par le serveur ─── */
await aller(A.p, 'btnFactures', 'ecran-facture');
await A.p.selectOption('#facChauffeur', 'CH-ayse');
await A.p.fill('#facDu', auj.slice(0, 8) + '01');
await A.p.fill('#facAu', auj);
await A.p.click('#btnFacPreparer');
await attendre(A.p, () => !document.getElementById('btnFacEmettre').hidden);
await A.p.dblclick('#btnFacEmettre');
await attendre(A.p, () => /émise/.test(document.getElementById('facEmiseEtat').textContent));
const emises = S.appels.filter(a => a.startsWith('emission:'));
check('5a. double appui sur « Émettre » : UNE facture', emises.length === 1, emises.join(','));
check('5b. son numéro vient du serveur, après le plus grand de l\'appareil (0007 → 0008)', emises[0] === 'emission:F-' + ANNEE + '-0008', emises[0]);
check('5c. l\'écran affiche ce numéro', (await A.p.textContent('#facEmiseEtat')).includes('F-' + ANNEE + '-0008'), await A.p.textContent('#facEmiseEtat'));
check('5d. les courses sont marquées sur le serveur', ['ELA-26-10-AAA01', 'ELA-26-10-AAA02', 'ELA-26-10-AAA03'].every(r => S.courses.get(r).bon.factureNum === 'F-' + ANNEE + '-0008'));
check('5e. le rang de l\'appareil n\'a pas été consommé (le numéro n\'est plus pris ici)', (await lire(A.p, 'ela_rang_facture')).rang === 7);
await A.p.screenshot({ path: 'captures-admin/donnees-serveur-facture.png' });
/* B, qui préparerait la même facture, est refusé — pas de seconde facture. */
await resync(B.p);
check('5f. B voit la facture émise par A', (await lire(B.p, 'ela_factures')).some(f => f.num === 'F-' + ANNEE + '-0008'));

/* ─── 6. Sans réseau, le règlement attend, puis part une fois ─── */
S.panne = true;
await aller(B.p, 'btnControle', 'ecran-controle');
await B.p.evaluate(() => { /* la dette d'Ayse est sur les courses : relire */ });
await attendre(B.p, () => !!document.querySelector('[data-payer]'));
const payable = await B.p.$('[data-payer]');
if (payable) {
  await payable.click();
  await B.p.fill('#ccPaiementMontant', '7');
  await B.p.click('#btnCcPaiementOk');
  await B.p.waitForTimeout(500);
  check('6a. sans réseau, le règlement est gardé dans la file de l\'appareil', (await lire(B.p, 'ela_metier_file')).length === 1);
  check('6b. il n\'est pas (encore) sur le serveur', ![...S.reglements.values()].some(r => r.montant === 7));
  S.panne = false;
  await B.p.evaluate(() => window.dispatchEvent(new Event('online')));
  await B.p.waitForTimeout(800);
  await B.p.evaluate(() => window.dispatchEvent(new Event('online')));
  await B.p.waitForTimeout(800);
  check('6c. le réseau revenu, il part UNE fois', [...S.reglements.values()].filter(r => r.montant === 7).length === 1);
  check('6d. la file est vide', (await lire(B.p, 'ela_metier_file')).length === 0);
} else check('6. une dette à régler sur B', false, 'aucun bouton « Paiement reçu »');
S.panne = false;

/* ─── 7. Restaurer une ancienne sauvegarde, deux fois ─── */
const sauvegarde = { format: 'elatransfer-1', courses: [], chauffeurs: [{ id: 'CH-carla', nom: 'Carla', telephone: '0600000003' }],
  paiementsChauffeurs: [{ id: 'P-vieux', cle: 'id:CH-carla', nom: 'Carla', montant: 15, date: '2026-08-01' }],
  factures: [], rangFacture: { annee: ANNEE, rang: 3 } };
await writeFile('/tmp/elatransfer-sauvegarde-test.json', JSON.stringify(sauvegarde));
await B.p.evaluate(() => document.getElementById('btnRegistre') && document.getElementById('btnRegistre').click());
for (let i = 0; i < 2; i++) {
  await B.p.setInputFiles('#fichierRestaurer', '/tmp/elatransfer-sauvegarde-test.json');
  await B.p.waitForTimeout(1200);
}
check('7a. la sauvegarde restaurée est sur le serveur', S.chauffeurs.has('CH-carla') && S.reglements.has('P-vieux'));
check('7b. restaurée deux fois : rien en double', [...S.chauffeurs.values()].filter(c => c.nom === 'Carla').length === 1
  && [...S.reglements.keys()].filter(k => k === 'P-vieux').length === 1);
check('7c. un rang plus petit (3) ne fait jamais reculer le compteur (8)', S.compteur[ANNEE] === 8, JSON.stringify(S.compteur));

await A.ctx.close(); await B.ctx.close();

/* ─── 8. Un serveur sans ces fonctions : l'appareil reste comme avant ─── */
S = etatNeuf(); S.sansFonctions = true;
const C = await appareil('C', LOCAL_A);
await C.p.waitForTimeout(1500);
check('8a. pas de bascule tant que le serveur n\'a pas les fonctions', (await lire(C.p, 'ela_metier_serveur')) === null);
check('8b. la copie de l\'appareil reste la source, intacte', (await lire(C.p, 'ela_chauffeurs')).length === 1);
await aller(C.p, 'btnFactures', 'ecran-facture');
await C.p.selectOption('#facChauffeur', 'CH-ayse');
await C.p.fill('#facDu', auj.slice(0, 8) + '01');
await C.p.fill('#facAu', auj);
await C.p.click('#btnFacPreparer');
await attendre(C.p, () => !document.getElementById('btnFacEmettre').hidden);
await C.p.click('#btnFacEmettre');
await attendre(C.p, () => /émise/.test(document.getElementById('facEmiseEtat').textContent));
check('8c. la facture s\'émet encore, numérotée sur l\'appareil comme avant (0008)', (await C.p.textContent('#facEmiseEtat')).includes('F-' + ANNEE + '-0008'), await C.p.textContent('#facEmiseEtat'));
await C.ctx.close();

await nav.close();
serveur.close();
check('aucune erreur JavaScript dans la page', erreurs.length === 0, erreurs.join(' | '));
console.log(`=== test-admin-donnees-serveur : ${ok.length} OK, ${ko.length} KO ===`);
ko.forEach(k => console.log('  ✗ ' + k));
process.exit(ko.length ? 1 : 0);
