/* =====================================================================
   TEST-NOUVEAU-SANS-BLOCAGE.MJS — une demande réelle trouve toujours une
   sortie
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros : « je veux recevoir une
   demande même lorsque le client souhaite partir immédiatement », « la
   règle des 90 km ne doit plus empêcher d'envoyer », « un client avec une
   demande réelle doit toujours disposer d'une sortie ».

   CE QUI EST VERROUILLÉ, côté client puis côté admin :
   — longue distance, groupe de plus de 7, adresse tapée à la main : la
     demande PART, sans prix inventé (« Tarif à confirmer »), et le serveur
     reçoit les drapeaux qui le disent ;
   — « Dès que possible » part avec « immediat » ;
   — dans l'admin, une demande sans prix porte ses pastilles, et
     « Confirmer » est REFUSÉ tant que le prix n'est pas fixé — un VTC doit
     annoncer son prix avant le départ. Une fois le prix posé par
     « Modifier la course », la confirmation passe, et « Prévenir le
     client » lui annonce ce prix.

   ÉPROUVÉ SUR LE SITE CONSTRUIT : c'est lui que voient les clients (le
   dépôt passe par « deposer-course » et l'admin par la connexion e-mail).

   Lancer :  node test-nouveau-sans-blocage.mjs
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
await new Promise(r => serveur.listen(8087, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8087';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const erreurs = [];
const nav = await chromium.launch();

/* ═══ CÔTÉ CLIENT ═══ */
const LIEUX = {
  vendome: { geometry:{coordinates:[2.3292,48.8675]}, properties:{label:'Place Vendôme, 75001 Paris', name:'Place Vendôme', type:'street', city:'Paris'} },
  argenteuil: { geometry:{coordinates:[2.2467,48.9478]}, properties:{label:'Argenteuil, 95100 Argenteuil', name:'Argenteuil', type:'municipality', city:'Argenteuil'} },
  lille: { geometry:{coordinates:[3.0573,50.6292]}, properties:{label:'Place du Général de Gaulle, 59000 Lille', name:'Place du Général de Gaulle', type:'street', city:'Lille'} },
};
async function client() {
  const ctx = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR', timezoneId:'Europe/Paris' });
  const depots = [];
  await ctx.addInitScript(() => { window.open = () => null; });
  await ctx.route('**/*', async route => {
    const req = route.request(), u = req.url(), d = decodeURIComponent(u).toLowerCase();
    if (u.startsWith(BASE)) return route.continue();
    if (d.includes('api-adresse.data.gouv.fr')) {
      const q = (d.match(/[?&]q=([^&]*)/) || [, ''])[1];
      const k = Object.keys(LIEUX).find(k => q.includes(k.slice(0, 5)));
      return route.fulfill(J({ features: k ? [LIEUX[k]] : [] }));
    }
    if (d.includes('photon.komoot.io')) return route.fulfill(J({ features: [] }));
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes:[{ distance:24300, duration:2040 }] }));
    if (u.includes('supabase.co') && req.method() === 'POST') {
      let c = {}; try { c = JSON.parse(req.postData() || '{}'); } catch {}
      if (c.bon) { depots.push(c.bon); return route.fulfill({ status:201, contentType:'application/json', body:'{"ok":true}' }); }
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/');
  await p.waitForTimeout(500);
  return { ctx, p, depots };
}
async function adresse(p, champ, q, choix) {
  await p.fill('#' + champ, ''); await p.type('#' + champ, q, { delay: 15 });
  await p.waitForTimeout(700);
  const l = choix === 'manuel'
    ? p.locator('#' + champ + 'List .suggest-manuel')
    : p.locator('#' + champ + 'List [role=option]', { hasText: choix }).first();
  if (await l.count()) await l.click(); else ko.push('« ' + q + ' » : la ligne « ' + choix + ' » manque dans la liste');
  await p.waitForTimeout(250);
}
async function jusquAuBon(p, nom = 'Jean Martin') {
  await p.locator('.veh-carte').first().click().catch(() => {});
  await p.locator('#btnContinuer').click().catch(() => {}); await p.waitForTimeout(300);
  await p.fill('#clientNom', nom).catch(() => {});
  await p.fill('#clientTel', '06 12 34 56 78').catch(() => {});
  await p.locator('[data-paiement="especes"]').click().catch(() => {});
  /* « Où recevoir votre confirmation ? » est obligatoire depuis le 4/10/2026 (masquée au comptoir). */
  await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
  await p.locator('#btnConfirmer').click().catch(() => {});
  await p.waitForTimeout(1200);
}
const prixVeh = p => p.locator('.veh-carte .veh-prix').allInnerTexts().catch(() => []);
const demain = () => new Date(Date.now() + 864e5).toLocaleString('sv-SE', { timeZone:'Europe/Paris' }).slice(0, 10);

try {
  /* 1. LONGUE DISTANCE : Paris → Lille. */
  {
    const { ctx, p, depots } = await client();
    await adresse(p, 'depart', 'vendome', 'Vendôme');
    await adresse(p, 'arrivee', 'lille', 'Lille');
    await p.fill('#date', demain()); await p.fill('#heure', '10:00'); await p.waitForTimeout(200);
    check('longue distance : l\'écriteau informe', await p.locator('#infoLongue').isVisible());
    check('longue distance : le bouton du prix reste ALLUMÉ', !(await p.locator('#btnVoirPrix').isDisabled()));
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
    const prix = await prixVeh(p);
    check('longue distance : la liste s\'ouvre, sans montant inventé', prix.length > 0 && prix.every(t => /confirmer/i.test(t) && !/\d+,\d{2}\s*€/.test(t)), prix.join(' | '));
    await jusquAuBon(p);
    const b = depots[0] || {};
    check('longue distance : la demande PART', depots.length === 1, String(depots.length));
    check('longue distance : elle part « tarif à confirmer », motif « longue », prix 0',
      b.course?.tarifAConfirmer === true && JSON.stringify(b.course?.motifsTarif) === '["longue"]' && !(b.prix?.total > 0),
      JSON.stringify({ t: b.course?.tarifAConfirmer, m: b.course?.motifsTarif, p: b.prix?.total }));
    check('longue distance : le bon du client dit « tarif à confirmer »', /confirmer/i.test(await p.locator('#bonPrix').innerText().catch(() => '')),
      await p.locator('#bonPrix').innerText().catch(() => ''));
    await ctx.close();
  }

  /* 2. UN GROUPE DE 9 : plus de 7 passagers, plusieurs véhicules. */
  {
    const { ctx, p, depots } = await client();
    await adresse(p, 'depart', 'vendome', 'Vendôme');
    await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
    await p.fill('#date', demain()); await p.fill('#heure', '10:00');
    await p.fill('#passagers', '9'); await p.locator('#passagers').dispatchEvent('change');
    check('9 passagers : le bouton du prix reste allumé', !(await p.locator('#btnVoirPrix').isDisabled()));
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
    const noms = await p.locator('.veh-carte .veh-nom').allInnerTexts().catch(() => []);
    check('9 passagers : une offre « Plusieurs véhicules », et aucune autre', noms.length === 1 && /Plusieurs véhicules/.test(noms[0]), noms.join(' | '));
    const prix = await prixVeh(p);
    check('9 passagers : aucun prix inventé', prix.length === 1 && /confirmer/i.test(prix[0]), prix.join(' | '));
    await jusquAuBon(p);
    const b = depots[0] || {};
    check('9 passagers : la demande part, « plusieurs véhicules », 9 passagers',
      depots.length === 1 && b.course?.multiVehicules === true && /^9 /.test(b.course?.passagers || ''), JSON.stringify(b.course?.passagers));
    await ctx.close();
  }

  /* 3. ADRESSE INTROUVABLE : envoyée telle quelle, sans coordonnées. */
  {
    const { ctx, p, depots } = await client();
    await adresse(p, 'depart', 'vendome', 'Vendôme');
    await adresse(p, 'arrivee', 'Hangar 12 zone de fret sud', 'manuel');
    check('adresse introuvable : la dernière ligne permet de l\'envoyer telle quelle',
      (await p.locator('#arrivee').inputValue()) === 'Hangar 12 zone de fret sud', await p.locator('#arrivee').inputValue());
    await p.fill('#date', demain()); await p.fill('#heure', '10:00');
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
    check('adresse introuvable : on avance jusqu\'aux véhicules', await p.locator('#ecran-vehicules').isVisible());
    await jusquAuBon(p);
    const b = depots[0] || {};
    check('adresse introuvable : la demande part « adresse à vérifier », sans prix',
      depots.length === 1 && b.course?.adresseAVerifier === true && !(b.prix?.total > 0), JSON.stringify({ a: b.course?.adresseAVerifier, p: b.prix?.total }));
    check('adresse introuvable : aucune coordonnée inventée', !b.course?.arriveeLieu || b.course.arriveeLieu.latitude == null,
      JSON.stringify(b.course?.arriveeLieu));
    await ctx.close();
  }

  /* 4. DÈS QUE POSSIBLE. */
  {
    const { ctx, p, depots } = await client();
    await adresse(p, 'depart', 'vendome', 'Vendôme');
    await adresse(p, 'arrivee', 'argenteuil', 'Argenteuil');
    /* Le lien « Maintenant » est retiré de la case Date (8/10/2026) : on entre
       en mode immédiat par la sortie « Partir dès que possible ». */
    await p.evaluate(() => document.getElementById('btnPasseAsap').click()); await p.waitForTimeout(200);
    check('« Dès que possible » : la date et l\'heure s\'effacent', await p.locator('#blocDateHeure').isHidden());
    check('…et la note dit « soumise à disponibilité »', /disponibilit/i.test(await p.locator('#noteAsap').innerText()), await p.locator('#noteAsap').innerText());
    await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1200);
    const prix = await prixVeh(p);
    check('« Dès que possible » : un trajet ordinaire garde son prix', prix.length > 0 && prix.every(t => /\d/.test(t) && !/confirmer/i.test(t)), prix.join(' | '));
    await jusquAuBon(p);
    const b = depots[0] || {};
    const maintenant = new Date().toLocaleString('sv-SE', { timeZone:'Europe/Paris' });
    check('« Dès que possible » : la demande part « immédiate », datée de maintenant',
      b.course?.immediat === true && b.course?.date === maintenant.slice(0, 10) && b.prix?.total > 0,
      JSON.stringify({ i: b.course?.immediat, d: b.course?.date, h: b.course?.heure }));
    await ctx.close();
  }

  /* ═══ 5. CÔTÉ ADMIN : une demande sans prix ne se confirme pas. ═══ */
  {
    const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone:'Europe/Paris' });
    const BON = { ref:'ELA-26-10-LONG1', statut:'attente', version:1, cree:new Date(Date.now() - 600e3).toISOString(),
      course:{ depart:'Place Vendôme, 75001 Paris', departPublic:'Place Vendôme, 75001 Paris',
        arrivee:'Place du Général de Gaulle, 59000 Lille', arriveePublic:'Place du Général de Gaulle, 59000 Lille',
        date:paris(2880).slice(0, 10), heure:'10:00', vehicule:'Berline', vehiculeCle:'berline', passagers:'2 passagers',
        immediat:true, tarifAConfirmer:true, motifsTarif:['longue'], adresseAVerifier:false, multiVehicules:false },
      client:{ nom:'Jean Martin', telephone:'06 12 34 56 78' }, prix:{ total:0 }, paiementNom:'Espèces', langue:'fr',
      securite:{ empreinteDepot:'x' } };
    const ctx = await nav.newContext({ viewport:{width:390,height:844}, locale:'fr-FR', timezoneId:'Europe/Paris' });
    await ctx.addInitScript(() => {
      localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token:'JETON', refresh_token:'R' }));
      window.__liens = []; window.open = u => { window.__liens.push(u); return null; };
    });
    const donnees = [JSON.parse(JSON.stringify(BON))]; const ecritures = [];
    await ctx.route('**/*', async route => {
      const req = route.request(), u = req.url(), m = req.method();
      if (u.startsWith(BASE)) return route.continue();
      if (!u.includes('supabase.co')) return route.abort();
      if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
      if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
      if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok:true }));
      if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token:'JETON2', refresh_token:'R2' }));
      if (u.includes('/rest/v1/courses')) {
        if (u.includes('select=ref')) return route.fulfill(J(donnees.map(c => ({ ref:c.ref, version:c.version, modifie_le:'2026-10-03T10:00:00Z' }))));
        if (m === 'GET') return route.fulfill(J(donnees.map(c => ({ bon:c, statut:c.statut, version:c.version, modifie_le:'2026-10-03T10:00:00Z', cree_le:c.cree }))));
        let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
        if (Array.isArray(corps)) corps = corps[0] || {};
        ecritures.push({ statut:corps.statut, bon:corps.bon });
        const c = donnees[0];
        if (m === 'PATCH') { Object.assign(c, corps.bon || {}, { statut:corps.statut || c.statut }); c.version++; return route.fulfill(J([{ version:c.version, cree_le:c.cree }])); }
        return route.fulfill(J([{ version:1, cree_le:new Date().toISOString() }]));
      }
      return route.fulfill(J([]));
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
    await p.goto(BASE + '/ela-admin/');
    await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout:15000 }).catch(() => {});
    await p.waitForTimeout(800);
    const carte = p.locator('#listeBord .demande').filter({ hasText:'LONG1' }).first();
    const txt = await carte.innerText({ timeout:4000 }).catch(() => '');
    check('admin : la carte porte « Immédiat » et « Tarif à confirmer »', /Immédiat/.test(txt) && /Tarif à confirmer/.test(txt), txt.replace(/\n/g, ' | '));
    check('admin : la carte annonce « À confirmer », jamais « 0,00 € »', /À confirmer/.test(txt) && !/0,00/.test(txt), txt.replace(/\n/g, ' | '));
    await p.goto(BASE + '/ela-admin/?ref=ELA-26-10-LONG1');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon')?.classList.contains('actif'), null, { timeout:8000 }).catch(() => {});
    await p.waitForTimeout(400);
    check('admin : le bon dit pourquoi il manque un prix', /longue distance/.test(await p.locator('#bbTarifAConfirmer').innerText().catch(() => '')));
    await p.fill('#bbChauffeurNom', 'Ali Ben'); await p.fill('#bbChauffeurTel', '06 11 22 33 44');
    await p.locator('#btnConfirmerCourse').click(); await p.waitForTimeout(500);
    check('admin : « Confirmer » est REFUSÉ tant que le prix n\'est pas fixé',
      !ecritures.some(e => e.statut === 'confirmee') && donnees[0].statut === 'attente', JSON.stringify(ecritures.map(e => e.statut)));
    /* Le prix se fixe par « Modifier la course ». */
    await p.locator('#btnModifierCourse').click(); await p.waitForTimeout(300);
    await p.fill('#mdPrix', '420');
    await p.locator('#btnMdEnregistrer').click(); await p.waitForTimeout(600);
    const apres = ecritures.at(-1)?.bon || {};
    check('admin : le prix fixé lève « tarif à confirmer »',
      apres.prix?.total === 420 && apres.course?.tarifAConfirmer === false && apres.course?.prixFixeApres === true,
      JSON.stringify({ p:apres.prix?.total, t:apres.course?.tarifAConfirmer, f:apres.course?.prixFixeApres }));
    await p.fill('#bbChauffeurNom', 'Ali Ben'); await p.fill('#bbChauffeurTel', '06 11 22 33 44');
    await p.locator('#btnConfirmerCourse').click(); await p.waitForTimeout(600);
    check('admin : avec un prix, la confirmation passe', ecritures.some(e => e.statut === 'confirmee'), JSON.stringify(ecritures.map(e => e.statut)));
    await p.locator('#btnPrevenirClient').click().catch(() => {}); await p.waitForTimeout(400);
    const lien = decodeURIComponent((await p.evaluate(() => window.__liens.at(-1) || '')));
    check('admin : « Prévenir le client » lui annonce le prix fixé', /Prix : 420,00\s*€/.test(lien), lien.slice(0, 300));
    await ctx.close();
  }
} catch (e) { ko.push('la suite s\'est arrêtée : ' + String(e).split('\n')[0]); }

check('aucune erreur JavaScript', erreurs.length === 0, [...new Set(erreurs)].join(' | '));
await nav.close(); serveur.close();
console.log('=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
