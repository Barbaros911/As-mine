/* =====================================================================
   TEST-PUBLIC-PEAGES.MJS — le prix à toutes les distances, péages en plus
   ---------------------------------------------------------------------
   19 octobre 2026, décisions de Barbaros : le prix se calcule à toutes les
   distances en France (« je choisi b2 »), « péage non inclus », et
   l'étranger reste sur devis (décision du 30/09, gardée).

   CE QUI EST VERROUILLÉ, sur le site construit :
   — la page demande les péages à ORS (« extra_info: tollways »), y compris
     dans l'appel de repli à une seule route, celui des longs trajets ;
   — ORS voit un péage → « Péages non compris » avant le choix du véhicule,
     « + péages » au total, et la demande dit « oui » à l'admin ;
   — ORS répond sans péage → rien n'est écrit, même loin de Paris ;
   — ORS ne dit rien des péages → « éventuels » au-delà de 90 km, rien en
     deçà : un court trajet ne doit pas se lire comme plus cher ;
   — l'admin rappelle d'ajouter les péages au lien de paiement, et la carte
     de la demande porte la pastille « Péages en plus » ;
   — les CGV, dans les deux langues, disent que les péages ne sont pas
     compris et comment ils sont ajoutés.
   Le format de la réponse d'ORS n'a pas pu être éprouvé contre le vrai
   service depuis cette machine : il est rejoué tel que sa documentation le
   décrit (properties.extras.tollways.summary, valeur 1 = péage).

   Lancer :  node test-public-peages.mjs
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
await new Promise(r => serveur.listen(8148, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8148';
const ok = [], ko = []; const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const J = b => ({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
const erreurs = [];
const nav = await chromium.launch();

const LIEUX = {
  vendome: { geometry:{coordinates:[2.3292,48.8675]}, properties:{label:'Place Vendôme, 75001 Paris', name:'Place Vendôme', type:'street', city:'Paris'} },
  argenteuil: { geometry:{coordinates:[2.2467,48.9478]}, properties:{label:'Argenteuil, 95100 Argenteuil', name:'Argenteuil', type:'municipality', city:'Argenteuil'} },
  lille: { geometry:{coordinates:[3.0573,50.6292]}, properties:{label:'Place du Général de Gaulle, 59000 Lille', name:'Place du Général de Gaulle', type:'street', city:'Lille'} },
};
/* Une route ORS au format GeoJSON, avec ou sans le détail des péages. */
const routeORS = (km, peages) => ({ type:'FeatureCollection', features:[{ type:'Feature',
  geometry:{ type:'LineString', coordinates:[[2.3292,48.8675],[3.0573,50.6292]] },
  properties:{ summary:{ distance:km * 1000, duration:km * 40 },
    ...(peages === undefined ? {} : { extras:{ tollways:{ values:[[0,1,peages ? 1 : 0]],
      summary: peages ? [{ value:0, distance:20000, amount:9.5 }, { value:1, distance:(km - 20) * 1000, amount:90.5 }]
                      : [{ value:0, distance:km * 1000, amount:100 }] } } }) } }] });

/* orsMode : 'peage' | 'sans' | 'muet' (réponse sans extras) | 'refus-alternatives'
   (le POST à routes alternatives est refusé, le repli à une seule route répond). */
async function client(orsMode, km = 220) {
  const ctx = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR', timezoneId:'Europe/Paris' });
  const depots = [], corpsORS = [];
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
    if (d.includes('api.openrouteservice.org')) {
      if (req.method() !== 'POST') return route.fulfill({ status:500, body:'non' });
      let corps = {}; try { corps = JSON.parse(req.postData() || '{}'); } catch {}
      corpsORS.push(corps);
      if (orsMode === 'refus-alternatives' && corps.alternative_routes) return route.fulfill({ status:400, contentType:'application/json', body:'{"error":{"code":2004}}' });
      return route.fulfill(J(routeORS(km, orsMode === 'muet' ? undefined : orsMode !== 'sans')));
    }
    if (d.includes('router.project-osrm.org')) return route.fulfill(J({ routes:[{ distance:km * 1000, duration:km * 40 }] }));
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
  return { ctx, p, depots, corpsORS };
}
async function adresse(p, champ, q, choix) {
  await p.fill('#' + champ, ''); await p.type('#' + champ, q, { delay: 15 });
  await p.waitForTimeout(700);
  const l = p.locator('#' + champ + 'List [role=option]', { hasText: choix }).first();
  if (await l.count()) await l.click(); else ko.push('« ' + q + ' » : la ligne « ' + choix + ' » manque dans la liste');
  await p.waitForTimeout(250);
}
const demain = () => new Date(Date.now() + 864e5).toLocaleString('sv-SE', { timeZone:'Europe/Paris' }).slice(0, 10);
async function jusquAuxPrix(p, arrivee = ['lille', 'Lille']) {
  await adresse(p, 'depart', 'vendome', 'Vendôme');
  await adresse(p, 'arrivee', arrivee[0], arrivee[1]);
  await p.fill('#date', demain()); await p.fill('#heure', '10:00'); await p.waitForTimeout(200);
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1300);
}
async function jusquAuRecap(p) {
  await p.locator('.veh-carte').first().click().catch(() => {});
  await p.locator('#btnContinuer').click().catch(() => {}); await p.waitForTimeout(300);
}
async function envoyer(p) {
  await p.fill('#clientNom', 'Jean Martin').catch(() => {});
  await p.fill('#clientTel', '06 12 34 56 78').catch(() => {});
  await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
  await p.locator('#btnConfirmer').click().catch(() => {});
  await p.waitForTimeout(1200);
}
const lignePeages = async p => ({ vue: await p.locator('#resumePeages').isVisible(), texte: await p.locator('#resumePeages').innerText().catch(() => '') });

try {
  /* 1. ORS VOIT UN PÉAGE : Paris → Lille. */
  {
    const { ctx, p, depots, corpsORS } = await client('peage');
    await jusquAuxPrix(p);
    check('la page demande les péages à ORS (« extra_info: tollways »)',
      corpsORS.length > 0 && corpsORS.every(c => Array.isArray(c.extra_info) && c.extra_info.includes('tollways')), JSON.stringify(corpsORS));
    const l = await lignePeages(p);
    check('péage vu : « Péages non compris » avant le choix du véhicule', l.vue && /^Péages non compris/.test(l.texte) && /lien de paiement/.test(l.texte), JSON.stringify(l));
    const prix = await p.locator('.veh-carte .veh-prix').allInnerTexts();
    check('péage vu : le prix du véhicule reste un vrai montant (220 km × 2,90 € = 640 €)', prix.some(t => /^640,00\s*€$/.test(t.trim())), prix.join(' | '));
    await jusquAuRecap(p);
    const total = await p.locator('#recapTotal').innerText().catch(() => '');
    check('péage vu : le total dit « 640,00 € + péages »', /640,00\s*€\s*\+ péages/.test(total), total);
    check('péage vu : la note du récapitulatif le redit', await p.locator('#recapPeages').isVisible()
      && /Péages non compris/.test(await p.locator('#recapPeages').innerText()));
    await envoyer(p);
    const b = depots[0] || {};
    check('péage vu : la demande part avec son prix et « péages : oui »',
      depots.length === 1 && b.prix?.total === 640 && b.course?.peages === 'oui' && b.course?.tarifAConfirmer === false,
      JSON.stringify({ n:depots.length, p:b.prix?.total, g:b.course?.peages, t:b.course?.tarifAConfirmer }));
    await ctx.close();
  }

  /* 2. ORS RÉPOND SANS PÉAGE : rien n'est écrit, même loin de Paris. */
  {
    const { ctx, p, depots } = await client('sans');
    await jusquAuxPrix(p);
    const l = await lignePeages(p);
    check('pas de péage sur la route : aucune mention, même à 220 km', !l.vue, JSON.stringify(l));
    await jusquAuRecap(p);
    const total = await p.locator('#recapTotal').innerText().catch(() => '');
    check('pas de péage : le total ne dit pas « + péages »', /\d+,\d{2}\s*€/.test(total) && !/péages/.test(total), total);
    await envoyer(p);
    check('pas de péage : la demande ne porte aucune mention', (depots[0] || {}).course?.peages === '', String((depots[0] || {}).course?.peages));
    await ctx.close();
  }

  /* 3. ORS NE DIT RIEN DES PÉAGES : « éventuels » au-delà de 90 km… */
  {
    const { ctx, p } = await client('muet');
    await jusquAuxPrix(p);
    const l = await lignePeages(p);
    check('calcul muet sur les péages, loin de Paris : « Péages éventuels non compris »', l.vue && /^Péages éventuels non compris/.test(l.texte), JSON.stringify(l));
    await ctx.close();
  }
  /* … et rien sur un court trajet : il ne doit pas se lire plus cher. */
  {
    const { ctx, p } = await client('muet', 18);
    await jusquAuxPrix(p, ['argenteuil', 'Argenteuil']);
    const l = await lignePeages(p);
    check('calcul muet, Paris → Argenteuil : aucune mention de péages', !l.vue, JSON.stringify(l));
    await ctx.close();
  }

  /* 4. LES LONGS TRAJETS : ORS refuse les routes alternatives, le repli à
     une seule route garde « tollways » — c'est lui qui sert loin de Paris. */
  {
    const { ctx, p, corpsORS } = await client('refus-alternatives');
    await jusquAuxPrix(p);
    const repli = corpsORS.find(c => !c.alternative_routes);
    check('routes alternatives refusées : le repli à une seule route demande encore les péages',
      !!repli && repli.extra_info?.includes('tollways'), JSON.stringify(corpsORS));
    const l = await lignePeages(p);
    check('routes alternatives refusées : « Péages non compris » est quand même dit', l.vue && /^Péages non compris/.test(l.texte), JSON.stringify(l));
    await ctx.close();
  }

  /* 5. EN ANGLAIS. */
  {
    const { ctx, p } = await client('peage');
    await p.evaluate(() => { try { localStorage.setItem('ela_langue', 'en'); } catch (e) {} });
    await p.goto(BASE + '/?lang=en'); await p.waitForTimeout(500);
    await jusquAuxPrix(p);
    const l = await lignePeages(p);
    check('EN : « Tolls not included » avant le choix du véhicule', l.vue && /^Tolls not included/.test(l.texte), JSON.stringify(l));
    await ctx.close();
  }

  /* 6. LES CGV, DANS LES DEUX LANGUES. */
  {
    const { ctx, p } = await client('sans');
    const T = await p.evaluate(() => ({ fr: window.ELA_TEXTES.fr.legal_cgv_body, en: window.ELA_TEXTES.en.legal_cgv_body }));
    check('CGV FR : les péages ne sont pas compris, et leur montant est ajouté avant la confirmation',
      /Les péages ne sont pas compris dans le prix calculé au kilomètre/.test(T.fr) && /ajouté au prix avant toute confirmation/.test(T.fr));
    check('CGV EN : the same', /Tolls are not included in the per-kilometre price/.test(T.en) && /added to the price before any confirmation/.test(T.en));
    check('CGV : plus aucune limite de 90 km ; seule l\'adresse hors de France reste sans prix',
      !/90 km/.test(T.fr) && !/90 km/.test(T.en) && /hors de France/.test(T.fr) && /outside France/.test(T.en));
    check('CGV : le forfait d\'un partenaire comprend les péages', /Il comprend les péages éventuels/.test(T.fr) && /It includes any tolls/.test(T.en));
    await ctx.close();
  }

  /* 7. CÔTÉ ADMIN : la pastille et le rappel avant de confirmer. */
  {
    const paris = min => new Date(Date.now() + min * 60000).toLocaleString('sv-SE', { timeZone:'Europe/Paris' });
    const BON = { ref:'ELA-26-10-PEAG1', statut:'attente', version:1, cree:new Date(Date.now() - 600e3).toISOString(),
      course:{ depart:'Place Vendôme, 75001 Paris', departPublic:'Place Vendôme, 75001 Paris',
        arrivee:'Place du Général de Gaulle, 59000 Lille', arriveePublic:'Place du Général de Gaulle, 59000 Lille',
        date:paris(2880).slice(0, 10), heure:'10:00', vehicule:'Berline', vehiculeCle:'berline', passagers:'2 passagers',
        distanceKm:220, tarifAConfirmer:false, motifsTarif:[], peages:'oui' },
      client:{ nom:'Jean Martin', telephone:'06 12 34 56 78' }, prix:{ total:640 }, paiementNom:'Lien de paiement', paiement:'lien', langue:'fr',
      securite:{ empreinteDepot:'x' } };
    const ctx = await nav.newContext({ viewport:{width:390,height:844}, locale:'fr-FR', timezoneId:'Europe/Paris' });
    await ctx.addInitScript(() => { localStorage.setItem('ela_nuage_session', JSON.stringify({ access_token:'JETON', refresh_token:'R' })); window.open = () => null; });
    const donnees = [JSON.parse(JSON.stringify(BON))];
    await ctx.route('**/*', async route => {
      const req = route.request(), u = req.url(), m = req.method();
      if (u.startsWith(BASE)) return route.continue();
      if (!u.includes('supabase.co')) return route.abort();
      if (u.includes('/rpc/est_exploitant') || u.includes('/rpc/est_admin')) return route.fulfill(J(true));
      if (u.includes('/rpc/role_operateur')) return route.fulfill(J('admin'));
      if (u.includes('/rpc/') || u.includes('/functions/v1/')) return route.fulfill(J({ ok:true }));
      if (u.includes('/auth/v1/')) return route.fulfill(J({ access_token:'JETON2', refresh_token:'R2' }));
      if (u.includes('/rest/v1/courses')) {
        if (u.includes('select=ref')) return route.fulfill(J(donnees.map(c => ({ ref:c.ref, version:c.version, modifie_le:'2026-10-19T10:00:00Z' }))));
        if (m === 'GET') return route.fulfill(J(donnees.map(c => ({ bon:c, statut:c.statut, version:c.version, modifie_le:'2026-10-19T10:00:00Z', cree_le:c.cree }))));
        return route.fulfill(J([{ version:2, cree_le:new Date().toISOString() }]));
      }
      return route.fulfill(J([]));
    });
    const p = await ctx.newPage();
    p.on('pageerror', e => erreurs.push(e.message.split('\n')[0]));
    await p.goto(BASE + '/ela-admin/');
    await p.waitForFunction(() => document.body.classList.contains('espace'), null, { timeout:15000 }).catch(() => {});
    await p.waitForTimeout(800);
    const txt = await p.locator('#listeBord .demande').filter({ hasText:'PEAG1' }).first().innerText({ timeout:4000 }).catch(() => '');
    check('admin : la carte de la demande porte « Péages en plus »', /Péages en plus/.test(txt), txt.replace(/\n/g, ' | '));
    await p.goto(BASE + '/ela-admin/?ref=ELA-26-10-PEAG1');
    await p.waitForFunction(() => document.getElementById('ecran-bord-bon')?.classList.contains('actif'), null, { timeout:8000 }).catch(() => {});
    await p.waitForTimeout(400);
    const rappel = await p.locator('#bbPeages').innerText().catch(() => '');
    check('admin : le bon rappelle d\'ajouter les péages au prix avant de confirmer',
      await p.locator('#bbPeages').isVisible() && /Ajoutez leur montant au prix/.test(rappel) && /lien de paiement/.test(rappel), rappel);
    await ctx.close();
  }
} catch (e) {
  ko.push('la suite s\'est arrêtée : ' + (e && e.message ? e.message.split('\n')[0] : e));
}

check('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
await nav.close(); serveur.close();
console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(t => console.log('  ✔ ' + t));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(t => console.log('  ✘ ' + t)); }
process.exit(ko.length ? 1 : 0);
