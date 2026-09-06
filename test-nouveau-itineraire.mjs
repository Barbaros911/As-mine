/* =====================================================================
   TEST-NOUVEAU-ITINERAIRE.MJS — les trois niveaux du calcul de distance
   ---------------------------------------------------------------------
   L'itinéraire fait le PRIX, et chez Elatransfer le prix est ferme : il
   est annoncé au client, accepté par lui, encaissé tel quel. Une distance
   fausse n'est donc pas une gêne d'affichage, c'est une course à perte ou
   un prix dont il faut se dédire.

   D'où trois niveaux, et ce qui compte ici est qu'ils s'enchaînent DANS
   CET ORDRE et que chacun rattrape le précédent :

     1. MAPBOX si une clé est posée dans la page — service avec engagement.
     2. OSRM sinon, ou si Mapbox refuse — serveur de démonstration, sans
        aucun engagement.
     3. Le vol d'oiseau × 1,3 en dernier recours, et la course est alors
        marquée « ≈ » : le client doit voir que c'est une estimation.

   CE QUI SE VÉRIFIE MAL À L'ŒIL, ET QUE CE FICHIER ÉPROUVE : un repli qui
   ne se déclenche pas se voit tout de suite (le prix n'arrive jamais),
   mais un repli qui se déclenche TROP TÔT ne se voit pas du tout — le
   prix s'affiche, il est simplement faux de quelques euros. On donne donc
   à chaque serveur une distance DIFFÉRENTE, et on lit à l'écran lequel a
   répondu.

   La clé Mapbox est injectée en réécrivant la page au vol : le dépôt est
   public et n'en contient aucune.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-itineraire.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Trois distances distinctes, et trois prix berline distincts qui en
   découlent — 2,95 €/km, arrondi à la dizaine, le 5 pile qui descend :
     Mapbox   10,0 km → 29,50 €  → 30 € (le plancher, atteint de justesse)
     OSRM     24,3 km → 71,69 €  → 70 €
     Vol d'oiseau : Vendôme → Argenteuil ≈ 12,6 km × 1,3 ≈ 16,4 km
                            → 48,3 €    → 50 €
   Aucun de ces trois prix n'est celui d'un autre : lire « 70 € » suffit
   donc à dire que c'est OSRM qui a répondu. */
const KM = { mapbox:10000, osrm:24300 };

async function course({ cle, mapbox, osrm }){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  const appels = [];

  /* La page est réécrite au vol pour y poser une fausse clé : le dépôt est
     public, aucune vraie clé n'y est écrite. */
  await p.route('**/index.html', async route => {
    const r = await route.fetch();
    let html = await r.text();
    if(cle) html = html.replace('var CLE_MAPBOX = "";', 'var CLE_MAPBOX = "pk.faux";');
    await route.fulfill({ response:r, body:html });
  });

  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));

  await p.route('**://api.mapbox.com/**', route => {
    appels.push(route.request().url());
    if(mapbox) return route.fulfill({contentType:'application/json',
      body:JSON.stringify({routes:[{distance:KM.mapbox, duration:900}]})});
    return route.abort();
  });
  await p.route('**://router.project-osrm.org/**', route => {
    appels.push(route.request().url());
    if(osrm) return route.fulfill({contentType:'application/json',
      body:JSON.stringify({routes:[{distance:KM.osrm, duration:2040}]})});
    return route.abort();
  });

  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(1500);

  /* Le « ≈ » est porté par le prix lui-même autant que par la mesure —
     c'est là qu'il sert : le client regarde le montant, pas la ligne de
     distance au-dessus. On le retire pour comparer les chiffres, et on le
     garde à part pour le vérifier. */
  const brut   = (await p.locator('.veh-prix').first().textContent()).replace(/\s/g,'');
  const prix   = brut.replace(/^≈/,'');
  const mesure = await p.locator('#resumeMesure').textContent();
  await ctx.close();
  return { prix, prixEstime: brut.startsWith('≈'), mesure, appels,
           versMapbox: appels.filter(u=>u.includes('mapbox')),
           versOSRM:   appels.filter(u=>u.includes('osrm')) };
}

/* --- 1. Aucune clé : c'est OSRM, et Mapbox n'est jamais appelé --------- */
let r = await course({ cle:false, mapbox:true, osrm:true });
check('sans clé, c\'est OSRM qui donne la distance', r.prix==='70,00€', r.prix);
check('et Mapbox n\'est pas appelé du tout', r.versMapbox.length===0, r.versMapbox.join(' '));
check('la course n\'est pas marquée « ≈ »', !r.mesure.includes('≈') && !r.prixEstime, r.mesure);

/* --- 2. Aucune clé, OSRM en panne : le vol d'oiseau, et il le dit ------ */
r = await course({ cle:false, mapbox:true, osrm:false });
check('sans clé et sans OSRM, on retombe sur le vol d\'oiseau', r.prix==='50,00€', r.prix);
check('et la course est marquée « ≈ », sur la mesure ET sur le prix',
  r.mesure.includes('≈') && r.prixEstime, r.mesure);

/* --- 3. Avec la clé : Mapbox passe devant, OSRM n'est pas dérangé ------ */
r = await course({ cle:true, mapbox:true, osrm:true });
check('avec la clé, c\'est Mapbox qui donne la distance', r.prix==='30,00€', r.prix);
check('et OSRM n\'est pas appelé', r.versOSRM.length===0, r.versOSRM.join(' '));
check('la clé part en « access_token », pas ailleurs',
  r.versMapbox[0] && r.versMapbox[0].includes('access_token=pk.faux'), r.versMapbox[0]);
check('et l\'appel demande bien un itinéraire routier',
  r.versMapbox[0] && r.versMapbox[0].includes('/directions/v5/mapbox/driving/'), r.versMapbox[0]);
check('sans jamais réclamer le tracé, inutile ici',
  r.versMapbox[0] && r.versMapbox[0].includes('overview=false'), r.versMapbox[0]);

/* --- 4. LE RATTRAPAGE, le contrôle qui compte le plus.
   Mapbox tombe — quota épuisé, panne, clé révoquée. Le site NE DOIT PAS
   retomber sur le vol d'oiseau alors qu'OSRM répond encore : ce serait
   sauter un niveau, et facturer une estimation là où une vraie route
   était disponible. --------------------------------------------------- */
r = await course({ cle:true, mapbox:false, osrm:true });
check('Mapbox en panne : OSRM reprend la main', r.prix==='70,00€', r.prix);
check('il a bien été essayé d\'abord', r.versMapbox.length>0);
check('et le prix n\'est pas une estimation', !r.mesure.includes('≈') && !r.prixEstime, r.mesure);

/* --- 5. Les deux en panne : le vol d'oiseau, annoncé comme tel -------- */
r = await course({ cle:true, mapbox:false, osrm:false });
check('les deux en panne : le vol d\'oiseau', r.prix==='50,00€', r.prix);
check('les deux ont été essayés',
  r.versMapbox.length>0 && r.versOSRM.length>0,
  r.versMapbox.length+' mapbox / '+r.versOSRM.length+' osrm');
check('et la course est marquée « ≈ », sur la mesure ET sur le prix',
  r.mesure.includes('≈') && r.prixEstime, r.mesure);

/* --- 6. LA CLÉ NE DOIT PAS ÊTRE DANS LE DÉPÔT.
   Une clé Mapbox se restreint au domaine, donc une fuite ne coûte rien —
   à condition que la restriction soit posée, ce qui ne se vérifie pas
   d'ici. Tant que la ligne est vide, la question ne se pose pas ; le jour
   où Barbaros y colle son jeton, ce contrôle tombera et rappellera qu'il
   faut d'abord le restreindre dans le tableau de bord Mapbox. ---------- */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
check('aucune clé Mapbox écrite dans le dépôt',
  /var CLE_MAPBOX = "";/.test(source) && !/pk\.ey/.test(source));

/* --- 7. Une réponse d'itinéraire ne se met JAMAIS en cache.
   Le service worker resservirait la distance d'une course à une autre. -- */
const sw = await (await fetch('http://127.0.0.1:8099/sw.js')).text();
check('api.mapbox.com est hors cache dans le service worker',
  sw.includes('"api.mapbox.com"'));
check('router.project-osrm.org aussi', sw.includes('"router.project-osrm.org"'));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
