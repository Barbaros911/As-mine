/* =====================================================================
   TEST-ADMIN-ARRIVEE.MJS — une réservation client arrive dans l'admin
   ---------------------------------------------------------------------
   23 septembre 2026, Barbaros : « il faut absolument que je puisse recevoir
   les réservations des clients sur la page admin, et Telegram, même si le
   client ne m'envoie pas par WhatsApp ». L'admin retenu est l'espace
   historique (admin.html), plus Admin v2.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT (la connexion par e-mail n'existe
   que là) :
   - une demande déposée sur le serveur APPARAÎT et est ANNONCÉE pendant
     qu'il regarde — sans que rien ne passe par WhatsApp ;
   - arrivé par une alerte (« ?ref= »), l'espace OUVRE cette course ;
   - le lien de l'alerte Telegram vise l'entrée dédiée /ela-admin/.
   Le déclenchement de Telegram lui-même est côté serveur (webhook INSERT) :
   il ne s'éprouve pas d'ici, il a été vu marcher le 11 septembre 2026.

   Lancer :  node test-admin-arrivee.mjs
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
await new Promise(r => serveur.listen(8098, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8098';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));


import { readFileSync } from 'node:fs';
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});
const course = (ref, nom) => ({ ref, statut:"attente", cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
    date:"2026-12-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
    passagers:"2 passagers", vol:"" },
  client:{ nom, telephone:"06 12 34 56 78" }, prix:{ total:70 } });

let sondes = 0, lectures = 0, poussees = [];
let serveurCourses = [course('ELA-26-09-0100','Jean Martin')];
const nav = await chromium.launch();
async function espace(chemin){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session',
    JSON.stringify({access_token:'JETON', refresh_token:'R'})));
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('supabase.co')) {
      if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
      /* La sonde ne demande que la dernière référence : on lui répond comme
         le vrai serveur, UNE ligne, sinon elle lirait « undefined ». */
      if ((u.includes('/rest/v1/courses?select=ref&') || u.includes('/rest/v1/courses?select=ref,version&'))) { sondes++; return route.fulfill(J(serveurCourses.slice(0,1).map(b => ({ref:b.ref})))); }
      if (u.includes('/rest/v1/courses') && route.request().method() === 'POST') {
        poussees.push(JSON.parse(route.request().postData() || '{}')); return route.fulfill({status:201, body:''}); }
      if (u.includes('/rest/v1/courses')) { lectures++; return route.fulfill(J(serveurCourses.map(bon => ({bon, statut:bon.statut})))); }
      if (u.includes('/rest/v1/')) return route.fulfill(J([]));
      return route.fulfill(J({}));
    }
    return route.abort();
  });
  await p.goto(BASE + chemin);
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  return {ctx, p, erreurs};
}

try {
  /* 1. Une demande arrive pendant qu'il regarde. */
  {
    const {ctx, p, erreurs} = await espace('/ela-admin/');
    await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:8000})
      .catch(() => {});
    check('à l\'ouverture, la course du serveur est là', (await p.locator('.demande').count()) === 1,
      String(await p.locator('.demande').count()));
    check('le rattrapage n\'est pas annoncé comme une arrivée', await p.locator('#bordArrivee').isHidden());
    serveurCourses = [course('ELA-26-09-0101','Sophie Girard'), ...serveurCourses];
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await p.waitForFunction(() => document.querySelectorAll('.demande').length === 2, null, {timeout:8000})
      .catch(() => {});
    check('la nouvelle demande client entre dans la liste', (await p.locator('.demande').count()) === 2,
      String(await p.locator('.demande').count()));
    check('et elle est ANNONCÉE', await p.locator('#bordArrivee').isVisible());
    check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  }
  /* 1 bis. SANS rien toucher, une demande apparaît en quelques secondes
     (29/09/2026 : « je reçois les demandes sur admin 1 minute après »).
     Avant, seule une relecture complète toutes les 45 s existait. On
     n'attend que 15 s : la sonde passe toutes les 8 s. Et elle ne doit
     PAS relire toute la liste à chaque passage, sinon on ferait
     télécharger 1000 courses toutes les 8 s sur un téléphone. */
  {
    serveurCourses = [course('ELA-26-09-0110','Ali Ben')];
    const {ctx, p} = await espace('/admin.html');
    await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:8000}).catch(() => {});
    const base = lectures;
    await p.waitForTimeout(9000);                       // une sonde passe, rien n'a changé
    const lecturesAvant = lectures - base;
    serveurCourses = [course('ELA-26-09-0111','Nina Roy'), ...serveurCourses];
    const t0 = Date.now();
    const vu = await p.waitForFunction(() => document.querySelectorAll('.demande').length === 2, null, {timeout:15000})
      .then(() => true, () => false);
    check('une demande arrivée apparaît seule en moins de 15 s', vu, vu ? Math.round((Date.now()-t0)/1000)+' s' : 'jamais');
    check('la sonde tourne (question minuscule)', sondes >= 1, String(sondes));
    check('sans changement, la sonde ne relit pas toute la liste', lecturesAvant === 0, 'relectures avant l\'arrivée : ' + lecturesAvant);
    await ctx.close();
  }
  /* 2. Arrivé par l'alerte : la course s'ouvre. */
  {
    serveurCourses = [course('ELA-26-09-0102','Paul Durand'), ...serveurCourses];
    const {ctx, p} = await espace('/ela-admin/?ref=ELA-26-09-0102');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon')
      && document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
    const actif = await p.evaluate(() => (document.querySelector('.ecran.actif')||{}).id);
    check('le lien de l\'alerte ouvre le bon de CETTE course', actif === 'ecran-bord-bon', actif);
    check('et c\'est la bonne', (await p.locator('#ecran-bord-bon').textContent()).includes('ELA-26-09-0102'));
    check('« ref » est retiré de l\'adresse (un rafraîchissement ne la rouvre pas)',
      !(await p.evaluate(() => location.search)).includes('ref='));
    await ctx.close();
  }
  /* 2 bis. Sur le bon, un seul geste principal : celui de l'étape suivante. */
  {
    const conf = course('ELA-26-09-0103','Confirmé'); conf.statut = 'confirmee';
    const fait = course('ELA-26-09-0104','Réalisé'); fait.statut = 'realisee';
    serveurCourses = [course('ELA-26-09-0105','Attente'), conf, fait];
    const vis = async (p, id) => p.evaluate(i => { const e = document.getElementById(i);
      return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, id);
    for (const [ref, attendu] of [['ELA-26-09-0105','attente'],['ELA-26-09-0103','confirmee'],['ELA-26-09-0104','realisee']]) {
      const {ctx, p} = await espace('/ela-admin/?ref=' + ref);
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      const c = await vis(p,'btnConfirmerCourse'), r = await vis(p,'btnRealisee'), f = await vis(p,'btnRefuser');
      if (attendu === 'attente') check('en attente : « Confirmer » seul, pas « Marquer comme réalisée »', c && !r && f, `c=${c} r=${r} f=${f}`);
      if (attendu === 'confirmee') check('confirmée : « Marquer comme réalisée » seul, plus « Confirmer »', !c && r && f, `c=${c} r=${r} f=${f}`);
      if (attendu === 'realisee') check('réalisée : ni confirmer, ni réaliser, ni refuser', !c && !r && !f, `c=${c} r=${r} f=${f}`);
      await ctx.close();
    }
  }
  /* 2 ter. ANNULER ET MODIFIER DEPUIS L'ADMIN (30/09/2026, à sa demande : la
     réception ne peut plus annuler, elle appelle ; Barbaros annule ou
     modifie). On lit ce qui PART au serveur — c'est ce que la réception
     relira — pas l'état interne. */
  {
    const conf = course('ELA-26-09-0106','Mme Annule'); conf.statut = 'confirmee';
    conf.chauffeur = { nom:'Mehmet', telephone:'0612345678' };
    const fait = course('ELA-26-09-0107','Réalisé'); fait.statut = 'realisee';
    const att = course('ELA-26-09-0108','M. Modif');
    att.course.depart = 'easyHotel Aéroville, 10 rue de la Belle Borne (ch. 118)';
    att.course.departPublic = 'easyHotel Aéroville, 10 rue de la Belle Borne';
    att.course.chambre = '118';
    serveurCourses = [conf, fait, att];
    const vis = async (p, id) => p.evaluate(i => { const e = document.getElementById(i);
      return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, id);
    const ouvrir = async ref => {
      const x = await espace('/ela-admin/?ref=' + ref);
      await x.p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      return x;
    };
    { const {ctx, p} = await ouvrir('ELA-26-09-0107');
      check('réalisée : ni « Annuler », ni « Modifier » (elle est au registre)',
        !(await vis(p,'btnAnnulerCourse')) && !(await vis(p,'btnModifierCourse')));
      await ctx.close(); }
    { const {ctx, p, erreurs} = await ouvrir('ELA-26-09-0106');
      check('confirmée : « Annuler la course » et « Modifier la course » sont là',
        await vis(p,'btnAnnulerCourse') && await vis(p,'btnModifierCourse'));
      poussees = [];
      await p.click('#btnAnnulerCourse');
      check('un premier appui n\'annule RIEN, il demande confirmation',
        poussees.length === 0 && (await p.locator('#btnAnnulerCourse').textContent()).trim() === 'Confirmer l\'annulation');
      await p.click('#btnAnnulerCourse');
      await p.waitForTimeout(300);
      const envoi = poussees.filter(x => x.ref === 'ELA-26-09-0106').pop();
      check('le second appui l\'annule : « annulee » part au serveur, même référence',
        !!envoi && envoi.statut === 'annulee', JSON.stringify(envoi && envoi.statut));
      check('le bon dit « Annulée », et les boutons d\'action se retirent',
        (await p.locator('#bbEtat').textContent()) === 'Annulée' && !(await vis(p,'btnAnnulerCourse'))
        && !(await vis(p,'btnRefuser')) && !(await vis(p,'btnRealisee')));
      check('un chauffeur était attribué : on rappelle de le prévenir',
        /Prévenez le chauffeur/.test(await p.locator('#bbModifNote').textContent()));
      check('aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      await ctx.close(); }
    { const {ctx, p, erreurs} = await ouvrir('ELA-26-09-0108');
      await p.click('#btnModifierCourse');
      check('« Modifier » ouvre le formulaire, prérempli',
        await vis(p,'bbModif') && (await p.inputValue('#mdHeure')) === '10:00'
        && (await p.inputValue('#mdChambre')) === '118'
        && (await p.inputValue('#mdDepart')) === 'easyHotel Aéroville, 10 rue de la Belle Borne'
        && (await p.inputValue('#mdPrix')) === '70');
      await p.fill('#mdPrix', '');
      poussees = [];
      await p.click('#btnMdEnregistrer');
      check('un prix vide est refusé, et rien ne part',
        await vis(p,'mdErreur') && /prix/i.test(await p.locator('#mdErreur').textContent()) && poussees.length === 0);
      await p.fill('#mdPrix', '85');
      await p.fill('#mdHeure', '11:30');
      await p.fill('#mdChambre', '214');
      await p.click('#btnMdEnregistrer');
      await p.waitForTimeout(300);
      const envoi = poussees.filter(x => x.ref === 'ELA-26-09-0108').pop();
      const co = envoi && envoi.bon && envoi.bon.course || {};
      check('la modification part au serveur, SOUS LA MÊME RÉFÉRENCE', !!envoi && envoi.bon.ref === 'ELA-26-09-0108');
      check('…avec la nouvelle heure, le nouveau prix et la nouvelle chambre',
        co.heure === '11:30' && envoi.bon.prix.total === 85 && co.chambre === '214'
        && /\(ch\. 214\)$/.test(co.depart) && co.departPublic === 'easyHotel Aéroville, 10 rue de la Belle Borne',
        JSON.stringify({h:co.heure, p:envoi && envoi.bon.prix, d:co.depart}));
      check('…et la marque « modifieLe » que la réception affiche',
        !!(envoi && envoi.bon.modifieLe) && !isNaN(Date.parse(envoi.bon.modifieLe)));
      check('le statut ne change pas en modifiant', envoi && envoi.statut === 'attente');
      check('le bon affiché suit : 11:30 et 85,00 €',
        /11:30/.test(await p.locator('#bbDate').textContent()) && /85,00/.test(await p.locator('#bbPrix').textContent()));
      check('aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      await ctx.close(); }
  }
  /* 4. LE SERVEUR EST LA SEULE VÉRITÉ (2 octobre 2026 : « je valide une
     course, ça revient ; je refuse, ça revient »). Un faux serveur qui tient
     des VERSIONS, comme le vrai depuis la migration 20261002000000 :
     - une course changée AILLEURS remplace la copie de l'appareil ;
     - une modification d'ici qui échoue est réessayée, et l'écran le dit ;
     - une modification faite sur une copie périmée est refusée : le serveur
       gagne, et l'écran le dit ;
     - une course supprimée ailleurs disparaît ici ;
     - un serveur d'AVANT la migration (pas de colonne version) est encore
       lu, et écrit à l'ancienne.
     On regarde l'état réel (localStorage, faux serveur), pas la mécanique. */
  {
    const serveur = new Map();           // ref → {bon, statut, version, cree_le, modifie_le}
    let t = 1000;
    const poser = (bon, version = 1) => serveur.set(bon.ref, { bon:{...bon}, statut:bon.statut, version,
      cree_le:new Date(Date.now()-t).toISOString(), modifie_le: ++t });
    const changer = (ref, statut) => { const r = serveur.get(ref); r.statut = statut; r.bon = {...r.bon, statut}; r.version++; r.modifie_le = ++t; };
    const ligne = r => ({ bon:r.bon, statut:r.statut, version:r.version, cree_le:r.cree_le, modifie_le:String(r.modifie_le) });
    let panne = false, sondeFigee = null, sansVersion = false, patchs = [], posts = [];
    async function espaceV(chemin){
      const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
      await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session',
        JSON.stringify({access_token:'JETON', refresh_token:'R'})));
      const p = await ctx.newPage();
      const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
      await p.route('**/*', async route => {
        const u = route.request().url(), m = route.request().method();
        if (u.startsWith(BASE)) return route.continue();
        if (!u.includes('supabase.co')) return route.abort();
        if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
        if (u.includes('/rpc/')) return route.fulfill(J(null));
        if (!u.includes('/rest/v1/courses')) return route.fulfill(J([]));
        const q = new URL(u).searchParams, sel = q.get('select') || '';
        if (sansVersion && /version|modifie_le/.test(sel + (q.get('order')||'') + (q.get('version')||'')))
          return route.fulfill(J({message:'column courses.version does not exist'}, 400));
        const rows = [...serveur.values()];
        if (m === 'GET') {
          if (q.get('ref')) { const r = serveur.get(q.get('ref').replace('eq.','')); return route.fulfill(J(r ? [ligne(r)] : [])); }
          if ((q.get('order')||'').startsWith('modifie_le')) {
            if (sondeFigee) return route.fulfill(J([sondeFigee]));
            const r = rows.sort((a,b) => b.modifie_le - a.modifie_le)[0];
            return route.fulfill(J(r ? [{ref:r.bon.ref, version:r.version}] : []));
          }
          if (sel === 'ref') { const r = rows.sort((a,b) => (a.cree_le < b.cree_le ? 1 : -1))[0]; return route.fulfill(J(r ? [{ref:r.bon.ref}] : [])); }
          return route.fulfill(J(rows.sort((a,b) => (a.cree_le < b.cree_le ? 1 : -1)).map(ligne)));
        }
        if (panne) return route.fulfill({status:500, body:'panne'});
        const corps = JSON.parse(route.request().postData() || '{}');
        if (m === 'PATCH') {
          patchs.push({u, corps});
          const ref = q.get('ref').replace('eq.',''), v = Number(q.get('version').replace('eq.',''));
          const r = serveur.get(ref);
          if (!r || r.version !== v) return route.fulfill(J([]));
          r.statut = corps.statut; r.bon = corps.bon; r.version++; r.modifie_le = ++t;
          return route.fulfill(J([{version:r.version, cree_le:r.cree_le}]));
        }
        if (m === 'POST') {
          posts.push({u, corps, prefer: route.request().headers()['prefer'] || ''});
          if (serveur.has(corps.ref)) {
            if (sansVersion) { const r = serveur.get(corps.ref); r.statut = corps.statut; r.bon = corps.bon; return route.fulfill({status:201, body:''}); }
            return route.fulfill(J([]));
          }
          poser({...corps.bon, statut:corps.statut}, 1);
          return route.fulfill(J([{version:1, cree_le:serveur.get(corps.ref).cree_le}], 201));
        }
        return route.fulfill(J([]));
      });
      await p.goto(BASE + chemin);
      await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
      return {ctx, p, erreurs};
    }
    const local = (p, ref) => p.evaluate(r => (JSON.parse(localStorage.getItem('ela_bookings')||'[]').find(c => c.ref === r) || null), ref);
    const file = p => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ela_file')||'{}')));
    const texteCarte = (p, ref) => p.evaluate(r => { const e = [...document.querySelectorAll('.demande')].find(x => x.textContent.includes(r)); return e ? e.textContent : ''; }, ref);

    /* a) Confirmée sur un autre appareil → ici aussi, sans rien toucher. */
    {
      serveur.clear(); poser(course('ELA-26-10-SYNA1','Léa Marchand'));
      const {ctx, p, erreurs} = await espaceV('/ela-admin/');
      await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:8000}).catch(() => {});
      check('a) la course est lue avec sa version', (await local(p,'ELA-26-10-SYNA1') || {})._v === 1);
      changer('ELA-26-10-SYNA1', 'confirmee');
      const t0 = Date.now();
      const vu = await p.waitForFunction(() => (JSON.parse(localStorage.getItem('ela_bookings')||'[]')[0]||{}).statut === 'confirmee', null, {timeout:15000}).then(() => true, () => false);
      check('a) confirmée AILLEURS → confirmée ICI en moins de 15 s, sans un geste', vu, vu ? Math.round((Date.now()-t0)/1000)+' s' : 'toujours « attente »');
      check('a) …et les compteurs le disent : 0 en attente, 1 confirmée',
        (await p.locator('#cptAttente').textContent()) === '0' && (await p.locator('#cptConfirmee').textContent()) === '1',
        'attente=' + await p.locator('#cptAttente').textContent() + ' confirmee=' + await p.locator('#cptConfirmee').textContent());
      check('a) la version suit (2)', (await local(p,'ELA-26-10-SYNA1') || {})._v === 2);
      check('a) aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      await ctx.close();
    }
    /* b) Refusée ici, serveur en panne : l'écran le DIT, et ça repart tout seul. */
    {
      serveur.clear(); poser(course('ELA-26-10-SYNB1','Marc Petit')); patchs = [];
      const {ctx, p, erreurs} = await espaceV('/ela-admin/?ref=ELA-26-10-SYNB1');
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      panne = true;
      await p.click('#btnRefuser'); await p.click('#btnRefuser');
      await p.waitForTimeout(600);
      check('b) l\'écran dit « refusée » tout de suite', (await local(p,'ELA-26-10-SYNB1') || {}).statut === 'refusee');
      check('b) la modification est EN FILE, pas perdue', (await file(p)).includes('ELA-26-10-SYNB1'));
      check('b) le témoin « en cours d\'envoi » est visible', await p.locator('#bordSynchro').isVisible(), await p.locator('#bordSynchro').textContent());
      check('b) le serveur, lui, dit encore « attente »', serveur.get('ELA-26-10-SYNB1').statut === 'attente');
      const essais0 = patchs.length;
      panne = false;
      const parti = await p.waitForFunction(() => !Object.keys(JSON.parse(localStorage.getItem('ela_file')||'{}')).length, null, {timeout:20000}).then(() => true, () => false);
      check('b) le réseau revient → l\'envoi repart SEUL et la file se vide', parti, parti ? '' : 'file : ' + (await file(p)).join(','));
      check('b) …sous condition de version (PATCH version=eq.1)', patchs.some(x => /version=eq\.1/.test(x.u)) && patchs.length > essais0, String(patchs.length));
      check('b) le serveur dit maintenant « refusée », version 2', serveur.get('ELA-26-10-SYNB1').statut === 'refusee' && serveur.get('ELA-26-10-SYNB1').version === 2);
      check('b) le témoin disparaît', await p.locator('#bordSynchro').isHidden());
      check('b) la copie locale porte la version 2', (await local(p,'ELA-26-10-SYNB1') || {})._v === 2);
      check('b) aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      await ctx.close();
    }
    /* c) Geste sur une copie PÉRIMÉE : refusé, le serveur gagne, et on le dit. */
    {
      serveur.clear(); poser(course('ELA-26-10-SYNC1','Inès Dubois'));
      const {ctx, p, erreurs} = await espaceV('/ela-admin/?ref=ELA-26-10-SYNC1');
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      /* La sonde est figée : l'appareil ne verra pas le changement avant son geste. */
      sondeFigee = {ref:'ELA-26-10-SYNC1', version:1};
      changer('ELA-26-10-SYNC1', 'confirmee'); changer('ELA-26-10-SYNC1', 'confirmee');   // version 3 ailleurs
      await p.click('#btnRefuser'); await p.click('#btnRefuser');
      const fini = await p.waitForFunction(() => !Object.keys(JSON.parse(localStorage.getItem('ela_file')||'{}')).length, null, {timeout:10000}).then(() => true, () => false);
      check('c) la file se vide (le conflit est tranché, pas réessayé en boucle)', fini);
      check('c) le refus périmé N\'A PAS écrasé le serveur : toujours « confirmée », version 3',
        serveur.get('ELA-26-10-SYNC1').statut === 'confirmee' && serveur.get('ELA-26-10-SYNC1').version === 3);
      const l = await local(p,'ELA-26-10-SYNC1');
      check('c) la copie locale est REMPLACÉE par celle du serveur (confirmée, v3)', l && l.statut === 'confirmee' && l._v === 3, JSON.stringify({statut:l&&l.statut, v:l&&l._v}));
      check('c) et l\'écran le DIT, sur le bon ouvert', await p.locator('#bbModifNote').isVisible() && /autre appareil/.test(await p.locator('#bbModifNote').textContent()), await p.locator('#bbModifNote').textContent());
      sondeFigee = null;
      check('c) aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      await ctx.close();
    }
    /* d) Supprimée ailleurs → disparaît ici. */
    {
      serveur.clear(); poser(course('ELA-26-10-SYND1','Omar Saidi')); poser(course('ELA-26-10-SYND2','Julie Blanc'));
      const {ctx, p} = await espaceV('/ela-admin/');
      await p.waitForFunction(() => document.querySelectorAll('.demande').length === 2, null, {timeout:8000}).catch(() => {});
      serveur.delete('ELA-26-10-SYND1'); changer('ELA-26-10-SYND2', 'attente');
      const partie = await p.waitForFunction(() => document.querySelectorAll('.demande').length === 1, null, {timeout:15000}).then(() => true, () => false);
      check('d) une course supprimée sur le serveur disparaît de cet appareil', partie && !(await local(p,'ELA-26-10-SYND1')));
      await ctx.close();
    }
    /* e) Serveur d'AVANT la migration : lu et écrit à l'ancienne, rien ne casse. */
    {
      serveur.clear(); poser(course('ELA-26-10-SYNE1','Ancien Serveur')); sansVersion = true; posts = [];
      const {ctx, p, erreurs} = await espaceV('/ela-admin/?ref=ELA-26-10-SYNE1');
      await p.waitForFunction(() => document.getElementById('ecran-bord-bon').classList.contains('actif'), null, {timeout:8000}).catch(() => {});
      check('e) sans colonne version, la course est quand même lue', !!(await local(p,'ELA-26-10-SYNE1')));
      await p.click('#btnRefuser'); await p.click('#btnRefuser');
      const parti = await p.waitForFunction(() => !Object.keys(JSON.parse(localStorage.getItem('ela_file')||'{}')).length, null, {timeout:10000}).then(() => true, () => false);
      check('e) …et écrite à l\'ancienne (dépôt-ou-mise-à-jour)', parti && posts.some(x => /merge-duplicates/.test(x.prefer)) && serveur.get('ELA-26-10-SYNE1').statut === 'refusee');
      check('e) aucune erreur JavaScript', !erreurs.length, erreurs.join(' | '));
      sansVersion = false;
      await ctx.close();
    }
  }
  /* 3. L'alerte Telegram vise l'admin retenu. */
  for (const f of ['supabase/functions/nouvelle-demande/index.ts', 'supabase/functions/nouvelle-demande/a-coller.ts']) {
    const t = readFileSync(f, 'utf8');
    check(f.split('/').pop() + ' : l\'alerte ouvre l’Admin dédié', /"https:\/\/elatransfer\.com\/ela-admin\/"/.test(t));
  }
} catch (e) {
  ko.push('PLANTAGE — ' + e.message.split('\n')[0]);
} finally {
  await nav.close(); serveur.close();
}
for (const x of ok) console.log('  ok  ' + x);
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); for (const x of ko) console.log('  KO  ' + x); }
console.log('\n=== ' + ok.length + ' contrôles au vert, ' + ko.length + ' en échec ===');
process.exit(ko.length ? 1 : 0);
