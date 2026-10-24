/* =====================================================================
   TEST-RECHERCHE-RAPIDE.MJS — la liste et « Me localiser » n'attendent
   plus le plus lent
   ---------------------------------------------------------------------
   24 octobre 2026, Barbaros : « quand on clique sur la géolocalisation ça
   prend trop de temps, et quand on met une adresse la recherche prend trop
   de temps ».

   MESURÉ AVANT : la liste n'apparaissait qu'une fois TOUS les appels
   revenus (la BAN et un ou deux Photon). Photon à 3 s : liste à 3,1 s,
   alors que la BAN avait l'adresse en 0,15 s ; Photon muet : 6 s. « Me
   localiser » demandait d'emblée les satellites (jusqu'à 10 s), et une
   BAN muette s'annonçait « Aucune adresse trouvée à cet endroit ».

   CE QUI EST VERROUILLÉ :
   — LA LISTE S'AFFICHE DÈS QUE LE SERVICE QUI FAIT AUTORITÉ A RÉPONDU (la
     BAN pour une adresse qui commence par un chiffre), même si Photon
     traîne ou ne répond jamais.
   — UNE LIGNE VISIBLE NE BOUGE PAS quand la liste se complète : les
     lignes nouvelles s'ajoutent en dessous. Et une liste que le client a
     touchée n'est plus redessinée du tout : une ligne qui glisse sous le
     doigt, c'est l'adresse d'à côté, et son prix.
   — UN CHOIX FAIT DANS LA LISTE PARTIELLE TIENT : la réponse tardive ne
     rouvre pas la liste.
   — « ME LOCALISER » demande d'abord la position rapide (sans les
     satellites) ; les satellites seulement si elle est trop imprécise ou
     absente ; la position rapide sert si les satellites échouent ; un
     refus arrête tout, sans seconde demande ; un service d'adresse muet
     se dit PANNE, pas « aucune adresse ».

   Le GPS est simulé par un faux « navigator.geolocation » qui note chaque
   demande et ses options : on lit ce que la page demande au téléphone.

   Lancer :  npx http-server -p 8099 -s .
             node test-recherche-rapide.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));
const errs = [];
const J = o => ({ contentType: 'application/json', body: JSON.stringify(o) });
const attendre = ms => new Promise(r => setTimeout(r, ms));

const LIGNE_BAN = '8 Rue de la Paix 75002 Paris';
const BAN = { features: [{ geometry: { coordinates: [2.3315, 48.869] },
  properties: { label: LIGNE_BAN, type: 'housenumber', id: 'b1', postcode: '75002', city: 'Paris' } }] };
const PHOTON = { features: [{ geometry: { coordinates: [2.3294, 48.8675] },
  properties: { name: 'Place Vendôme', osm_key: 'place', osm_value: 'square', type: 'house',
    postcode: '75001', city: 'Paris', countrycode: 'FR' } }] };

/* msPhoton : délai de Photon ; null = Photon ne répond jamais. */
async function page({ msBan = 100, msPhoton = 100, geo = null, reverse = 'ok' } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR' });
  if (geo) await ctx.addInitScript(scenario => {
    /* Le faux GPS : chaque demande est notée, et la réponse suit le
       scénario, demande après demande. */
    window.__geo = [];
    const faux = {
      getCurrentPosition(succes, echec, options) {
        const n = window.__geo.length, r = scenario[Math.min(n, scenario.length - 1)];
        window.__geo.push(options || {});
        setTimeout(() => r.code
          ? echec({ code: r.code, message: 'simulé' })
          : succes({ coords: { latitude: r.lat, longitude: r.lon, accuracy: r.acc }, timestamp: Date.now() }), 30);
      }
    };
    Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => faux });
  }, geo);
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  const reverses = [];
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1:8099')) return route.continue();
    if (u.includes('api-adresse.data.gouv.fr/reverse')) {
      reverses.push(u);
      if (reverse === 'panne') return route.abort();
      return route.fulfill(J(BAN));
    }
    if (u.includes('api-adresse.data.gouv.fr')) { await attendre(msBan); return route.fulfill(J(BAN)).catch(() => {}); }
    if (u.includes('photon.komoot.io')) {
      if (msPhoton === null) return;          // jamais de réponse
      await attendre(msPhoton); return route.fulfill(J(PHOTON)).catch(() => {});
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  await p.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  return { ctx, p, reverses };
}
const options = p => p.locator('#departList [role=option]:not(.suggest-manuel)');
async function taper(p) {
  await p.click('#depart');
  await p.type('#depart', '8 rue de la paix', { delay: 60 });
  return Date.now();
}
async function quandListe(p, t0) {
  await p.waitForFunction(() => document.querySelectorAll('#departList [role=option]:not(.suggest-manuel)').length > 0,
    null, { timeout: 10000 }).catch(() => {});
  return Date.now() - t0;
}

try {
  /* --- 1. Photon lent : la liste n'attend pas, puis se complète sans
          déplacer la ligne déjà visible ----------------------------------- */
  {
    const { ctx, p } = await page({ msPhoton: 2500 });
    const ms = await quandListe(p, await taper(p));
    check('Photon à 2,5 s : l\'adresse de la BAN s\'affiche en moins de 1,5 s', ms < 1500, ms + ' ms');
    const avant = await options(p).allTextContents();
    check('et c\'est bien elle, en tête', (avant[0] || '').includes(LIGNE_BAN), avant.join(' | '));
    await p.waitForTimeout(2800);
    const apres = await options(p).allTextContents();
    check('Photon arrivé : la ligne visible n\'a pas bougé', (apres[0] || '').includes(LIGNE_BAN), apres.join(' | '));
    check('et la réponse de Photon s\'ajoute en dessous',
      apres.length === avant.length + 1 && apres.some(t => t.includes('Place Vendôme')), apres.join(' | '));
    await ctx.close();
  }
  /* --- 2. Photon muet : la liste n'attend pas les 6 s du délai ---------- */
  {
    const { ctx, p } = await page({ msPhoton: null });
    const ms = await quandListe(p, await taper(p));
    check('Photon muet : l\'adresse s\'affiche en moins de 1,5 s (6 s avant)', ms < 1500, ms + ' ms');
    await ctx.close();
  }
  /* --- 3. Une liste touchée ne se redessine plus ------------------------ */
  {
    const { ctx, p } = await page({ msPhoton: 2500 });
    await quandListe(p, await taper(p));
    const avant = await options(p).allTextContents();
    await p.locator('#departList').dispatchEvent('pointerdown');
    await p.waitForTimeout(2800);
    const apres = await options(p).allTextContents();
    check('le client a posé le doigt sur la liste : elle ne change plus',
      JSON.stringify(apres) === JSON.stringify(avant), avant.join(' | ') + ' → ' + apres.join(' | '));
    await ctx.close();
  }
  /* --- 4. Un choix fait dans la liste partielle tient ------------------- */
  {
    const { ctx, p } = await page({ msPhoton: 2500 });
    await quandListe(p, await taper(p));
    await options(p).first().click();
    await p.waitForTimeout(2800);
    check('choisie dans la liste partielle, l\'adresse reste écrite',
      (await p.inputValue('#depart')) === LIGNE_BAN, await p.inputValue('#depart'));
    check('et la réponse tardive ne rouvre pas la liste', await p.locator('#departList').isHidden());
    await ctx.close();
  }

  /* --- 5. « Me localiser » : la position rapide d'abord ----------------- */
  const PRES = { lat: 48.869, lon: 2.3315, acc: 30 }, LOIN = { lat: 48.88, lon: 2.35, acc: 800 },
        SATELLITES = { lat: 48.8693, lon: 2.3318, acc: 8 };
  {
    const { ctx, p, reverses } = await page({ geo: [PRES] });
    await p.click('#btnGeoloc'); await p.waitForTimeout(800);
    const demandes = await p.evaluate(() => window.__geo);
    check('une seule demande au téléphone quand la position rapide est précise', demandes.length === 1, JSON.stringify(demandes));
    check('et c\'est la position RAPIDE (sans les satellites)', demandes[0] && demandes[0].enableHighAccuracy === false, JSON.stringify(demandes[0]));
    check('l\'adresse est écrite', (await p.inputValue('#depart')) === LIGNE_BAN, await p.inputValue('#depart'));
    check('relue au point donné', reverses.length === 1 && reverses[0].includes('lat=' + PRES.lat), reverses.join(' '));
    await ctx.close();
  }
  {
    const { ctx, p, reverses } = await page({ geo: [LOIN, SATELLITES] });
    await p.click('#btnGeoloc'); await p.waitForTimeout(800);
    const demandes = await p.evaluate(() => window.__geo);
    check('position rapide trop imprécise (800 m) : on demande les satellites',
      demandes.length === 2 && demandes[1].enableHighAccuracy === true, JSON.stringify(demandes));
    check('et c\'est le point des satellites qui est relu', reverses.length === 1 && reverses[0].includes('lat=' + SATELLITES.lat), reverses.join(' '));
    await ctx.close();
  }
  {
    const { ctx, p, reverses } = await page({ geo: [LOIN, { code: 3 }] });
    await p.click('#btnGeoloc'); await p.waitForTimeout(800);
    check('satellites muets : la position rapide sert quand même',
      reverses.length === 1 && reverses[0].includes('lat=' + LOIN.lat) && (await p.inputValue('#depart')) === LIGNE_BAN, reverses.join(' '));
    check('et le client est invité à vérifier', /Vérifiez/.test(await p.textContent('#geoEtat')), await p.textContent('#geoEtat'));
    await ctx.close();
  }
  {
    const { ctx, p } = await page({ geo: [{ code: 3 }, SATELLITES] });
    await p.click('#btnGeoloc'); await p.waitForTimeout(800);
    const demandes = await p.evaluate(() => window.__geo);
    check('pas de position rapide : les satellites prennent le relais',
      demandes.length === 2 && demandes[1].enableHighAccuracy === true && (await p.inputValue('#depart')) === LIGNE_BAN, JSON.stringify(demandes));
    await ctx.close();
  }
  {
    const { ctx, p } = await page({ geo: [{ code: 1 }, SATELLITES] });
    await p.click('#btnGeoloc'); await p.waitForTimeout(800);
    const demandes = await p.evaluate(() => window.__geo);
    check('un refus arrête tout : aucune seconde demande', demandes.length === 1, JSON.stringify(demandes));
    check('et il est annoncé comme un refus', /refus/i.test(await p.textContent('#geoEtat')), await p.textContent('#geoEtat'));
    await ctx.close();
  }
  {
    const { ctx, p } = await page({ geo: [PRES], reverse: 'panne' });
    await p.click('#btnGeoloc'); await p.waitForTimeout(1200);
    const msg = await p.textContent('#geoEtat');
    check('service d\'adresse muet : c\'est dit comme une panne', /indisponible/i.test(msg) && !/aucune adresse/i.test(msg), msg);
    check('le bouton redevient utilisable', !(await p.locator('#btnGeoloc').isDisabled()));
    await ctx.close();
  }
  check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
} finally {
  await b.close();
}
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); console.log(''); }
process.exit(ko.length ? 1 : 0);
