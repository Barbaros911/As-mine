/* =====================================================================
   TEST-NOUVEAU-ITINERAIRE.MJS — les quatre niveaux du calcul de distance
   ---------------------------------------------------------------------
   L'itinéraire fait le PRIX, et chez Elatransfer le prix est ferme : il
   est annoncé au client, accepté par lui, encaissé tel quel. Une distance
   fausse n'est donc pas une gêne d'affichage, c'est une course à perte ou
   un prix dont il faut se dédire.

   D'où quatre niveaux, et ce qui compte ici est qu'ils s'enchaînent DANS
   CET ORDRE et que chacun rattrape le précédent :

     1. MAPBOX si une clé est posée — la seule qui se restreigne au domaine.
     2. OPENROUTESERVICE si une clé est posée — engagement de service,
        2 000 itinéraires par jour.
     3. OSRM sinon, ou si les deux refusent — serveur de démonstration,
        sans aucun engagement.
     4. Le vol d'oiseau × 1,3 en dernier recours, et la course est alors
        marquée « ≈ » : le client doit voir que c'est une estimation.

   CE QUI SE VÉRIFIE MAL À L'ŒIL, ET QUE CE FICHIER ÉPROUVE : un repli qui
   ne se déclenche pas se voit tout de suite (le prix n'arrive jamais),
   mais un repli qui se déclenche TROP TÔT ne se voit pas du tout — le
   prix s'affiche, il est simplement faux de quelques euros. On donne donc
   à chaque serveur une distance DIFFÉRENTE, et on lit à l'écran lequel a
   répondu.

   La clé Mapbox est injectée en réécrivant la page au vol ; celle d'ORS
   est dans la page, et une des vérifications porte justement là-dessus.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-itineraire.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Quatre distances distinctes, et quatre prix berline distincts qui en
   découlent — 2,95 €/km, arrondi à la dizaine, le 5 pile qui descend :
     Mapbox   10,0 km → 29,50 €  → 30 € (le plancher, atteint de justesse)
     ORS      40,0 km → 118,00 € → 120 €
     OSRM     24,3 km → 71,69 €  → 70 €
     Vol d'oiseau : Vendôme → Argenteuil ≈ 12,6 km × 1,3 ≈ 16,4 km
                            → 48,3 €    → 50 €
   Aucun de ces quatre prix n'est celui d'un autre : lire « 70 € » suffit
   donc à dire que c'est OSRM qui a répondu. */
const KM = { mapbox:10000, ors:40000, osrm:24300 };

async function course({ mapbox, ors, osrm, sansCles, jours }){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  const appels = [];

  /* La page est réécrite au vol : on y pose la clé Mapbox que le dépôt ne
     contient pas, et on peut au contraire retirer les deux clés pour
     éprouver le comportement d'un site qui n'en aurait aucune. */
  await p.route('**/index.html', async route => {
    const r = await route.fetch();
    let html = await r.text();
    if(mapbox !== undefined)
      html = html.replace('var CLE_MAPBOX = "";', 'var CLE_MAPBOX = "pk.faux";');
    if(sansCles)
      html = html.replace(/var CLE_ORS = "[^"]*";/, 'var CLE_ORS = "";')
                 .replace(/var CLE_MAPBOX = "[^"]*";/, 'var CLE_MAPBOX = "";');
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
  /* ORS répond en GeoJSON : la mesure est ailleurs que chez les deux
     autres, et c'est précisément ce que son lecteur doit savoir lire. */
  await p.route('**://api.openrouteservice.org/**', route => {
    appels.push(route.request().url());
    if(ors) return route.fulfill({contentType:'application/json',
      body:JSON.stringify({features:[{properties:{summary:{distance:KM.ors, duration:2700}}}]})});
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
  const d = new Date(Date.now()+(jours===undefined?3:jours)*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(2000);

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
           versORS:    appels.filter(u=>u.includes('openrouteservice')),
           versOSRM:   appels.filter(u=>u.includes('osrm')) };
}

/* --- 1. TEL QUE LE SITE EST PUBLIÉ : clé ORS, pas de clé Mapbox ------- */
let r = await course({ ors:true, osrm:true });
check('en ligne aujourd\'hui, c\'est ORS qui donne la distance', r.prix==='120,00€', r.prix);
check('et OSRM n\'est pas dérangé', r.versOSRM.length===0, r.versOSRM.join(' '));
check('la clé part en « api_key »',
  r.versORS[0] && r.versORS[0].includes('api_key='), r.versORS[0]);
check('la course n\'est pas marquée « ≈ »', !r.mesure.includes('≈') && !r.prixEstime, r.mesure);
/* ORS prend « lon,lat » — l'ordre inverse de l'habitude. Inversé, la
   course partirait dans l'océan Indien sans le moindre message. */
check('les points sont envoyés en lon,lat, dans le bon sens',
  r.versORS[0] && r.versORS[0].includes('start=2.3376,48.8606')
               && r.versORS[0].includes('end=2.2467,48.9478'), r.versORS[0]);

/* --- 2. LE RATTRAPAGE, le contrôle qui compte le plus.
   ORS tombe — quota épuisé, clé reprise par un tiers, panne. Le site NE
   DOIT PAS retomber sur le vol d'oiseau alors qu'OSRM répond encore : ce
   serait facturer une estimation là où une vraie route était disponible.
   --------------------------------------------------------------------- */
r = await course({ ors:false, osrm:true });
check('ORS en panne : OSRM reprend la main', r.prix==='70,00€', r.prix);
check('il a bien été essayé d\'abord', r.versORS.length>0);
check('et le prix n\'est pas une estimation', !r.mesure.includes('≈') && !r.prixEstime, r.mesure);

/* --- 3. Les deux en panne : le vol d'oiseau, annoncé comme tel -------- */
r = await course({ ors:false, osrm:false });
check('les deux en panne : le vol d\'oiseau', r.prix==='50,00€', r.prix);
check('les deux ont été essayés',
  r.versORS.length>0 && r.versOSRM.length>0,
  r.versORS.length+' ors / '+r.versOSRM.length+' osrm');
check('et la course est marquée « ≈ », sur la mesure ET sur le prix',
  r.mesure.includes('≈') && r.prixEstime, r.mesure);

/* --- 4. Le jour où la clé Mapbox est posée, elle passe devant --------- */
r = await course({ mapbox:true, ors:true, osrm:true });
check('avec la clé Mapbox, c\'est elle qui donne la distance', r.prix==='30,00€', r.prix);
check('ORS n\'est alors pas appelé', r.versORS.length===0, r.versORS.join(' '));
check('OSRM non plus', r.versOSRM.length===0, r.versOSRM.join(' '));
check('la clé Mapbox part en « access_token »',
  r.versMapbox[0] && r.versMapbox[0].includes('access_token=pk.faux'), r.versMapbox[0]);
/* ═══ LE PROFIL EST « driving-traffic », PAS « driving » ═══
   Les deux noms se ressemblent ; le résultat non. « driving » rend un temps
   théorique, comme ORS et OSRM ; « driving-traffic » regarde la
   circulation. C'est toute la demande de Barbaros — « elle doit prendre en
   compte le trafic actuel » — et c'est un seul mot dans l'URL : exactement
   le genre de chose qui se perd à la première réécriture sans qu'un test le
   voie. Sur un Roissy → Paris un mardi à 8 h, l'écart se compte en dizaines
   de minutes, donc en vols ratés. */
check('l\'appel demande le profil qui tient compte du trafic',
  r.versMapbox[0] && r.versMapbox[0].includes('/directions/v5/mapbox/driving-traffic/')
  && !/mapbox\/driving\//.test(r.versMapbox[0]), r.versMapbox[0]);
/* LE TRAFIC DEMANDÉ EST CELUI DE L'HEURE DE LA COURSE, pas celui du clic.
   Une course commandée à 23 h pour demain 8 h n'a rien à voir avec la
   circulation de 23 h. Sans « depart_at », la mention « trafic pris en
   compte » serait vraie mais inutile. */
check('et le trafic est demandé pour l\'heure de la course',
  r.versMapbox[0] && /depart_at=\d{4}-\d{2}-\d{2}T10%3A00/.test(r.versMapbox[0]),
  r.versMapbox[0]);
/* La mention n'est portée QUE par le niveau qui la mérite. */
check('« trafic pris en compte » est écrit au client',
  r.mesure.includes('trafic pris en compte'), r.mesure);
/* LE TRACÉ EST MAINTENANT RÉCLAMÉ, et en version SIMPLIFIÉE. C'était
   « overview=false », délibérément, tant que le site n'affichait aucune
   carte. La raison est tombée avec l'arrivée de la carte du trajet ; le
   contrôle suit la décision au lieu de figer l'ancienne.
   « simplified » plutôt que « full » : à l'échelle d'un écran de téléphone
   le tracé complet pèse dix fois plus pour un trait identique à l'œil. */
check('le tracé est réclamé, en version simplifiée',
  r.versMapbox[0] && r.versMapbox[0].includes('overview=simplified')
  && r.versMapbox[0].includes('geometries=geojson')
  && !r.versMapbox[0].includes('overview=full'), r.versMapbox[0]);

/* --- 5. LES TROIS NIVEAUX S'ENCHAÎNENT, sans en sauter un.
   Mapbox tombe, ORS répond : c'est ORS qui doit parler, pas OSRM et
   surtout pas le vol d'oiseau. --------------------------------------- */
r = await course({ mapbox:false, ors:true, osrm:true });
check('Mapbox en panne : ORS prend la suite, pas OSRM', r.prix==='120,00€', r.prix);
check('OSRM reste au repos', r.versOSRM.length===0, r.versOSRM.join(' '));
/* ET SURTOUT : ORS NE CONNAÎT PAS LE TRAFIC. Écrire la mention quand même
   ferait d'elle une décoration — et un client qui se fie à une heure
   d'arrivée la vérifie une fois, une seule. */
check('sans Mapbox, on ne prétend PAS tenir compte du trafic',
  !r.mesure.includes('trafic'), r.mesure);

/* --- 5 bis. UNE COURSE TROP LOINTAINE : on n'envoie pas « depart_at ».
   Mapbox refuse une date hors de sa fenêtre de prévision, et un refus
   ferait retomber le site sur ORS — une panne invisible qui coûterait
   justement la précision qu'on est venu chercher. Sans le paramètre,
   Mapbox rend la circulation du moment : moins juste, mais l'appel
   aboutit. ------------------------------------------------------------ */
r = await course({ mapbox:true, ors:true, osrm:true, jours:30 });
check('une course dans un mois : Mapbox est appelé sans « depart_at »',
  r.versMapbox[0] && !r.versMapbox[0].includes('depart_at'), r.versMapbox[0]);
check('et elle passe quand même par Mapbox', r.prix==='30,00€', r.prix);

/* --- 6. Les trois en panne : le vol d'oiseau, et les trois essayés ---- */
r = await course({ mapbox:false, ors:false, osrm:false });
check('les trois en panne : le vol d\'oiseau', r.prix==='50,00€', r.prix);
check('et les trois ont été essayés',
  r.versMapbox.length>0 && r.versORS.length>0 && r.versOSRM.length>0,
  r.versMapbox.length+' / '+r.versORS.length+' / '+r.versOSRM.length);

/* --- 7. Aucune clé du tout : le site reste utilisable.
   C'est l'état d'un dépôt où les deux clés auraient été retirées — par
   exemple le jour où le quota ORS est vidé et où Barbaros efface la clé
   en attendant d'en régénérer une. Rien ne doit casser. --------------- */
r = await course({ sansCles:true, ors:true, osrm:true });
check('sans aucune clé, OSRM suffit', r.prix==='70,00€', r.prix);
check('et aucun service à clé n\'est appelé',
  r.versMapbox.length===0 && r.versORS.length===0);

/* --- 8. Ce qui est écrit dans le dépôt.
   La clé ORS y est, en clair, et c'est assumé : une page statique envoie
   de toute façon sa clé au navigateur. Ce qui compte est qu'elle soit
   RESTREIGNABLE ou remplaçable — ORS ne sait pas restreindre, donc la
   sortie de secours est de la régénérer, et les niveaux tiennent le site
   debout entre-temps. Ce contrôle sert à ce qu'on ne colle jamais ici,
   par mégarde, une clé d'une autre nature. -------------------------- */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
check('la clé Mapbox n\'est pas dans le dépôt',
  /var CLE_MAPBOX = "";/.test(source) && !/pk\.ey/.test(source));
/* La clé ORS, elle, DOIT être là — sans elle le niveau 2 n'existe plus et
   le site retombe sur le serveur de démonstration sans que rien ne le
   dise. Un jour où on l'aura retirée pour la régénérer, ce contrôle
   tombera : c'est exactement ce qu'on veut qu'il fasse. */
check('la clé ORS est bien posée dans la page',
  /var CLE_ORS = "[^"]+";/.test(source));

/* --- 9. Une réponse d'itinéraire ne se met JAMAIS en cache.
   Le service worker resservirait la distance d'une course à une autre. -- */
const sw = await (await fetch('http://127.0.0.1:8099/sw.js')).text();
check('api.openrouteservice.org est hors cache dans le service worker',
  sw.includes('"api.openrouteservice.org"'));
check('api.mapbox.com aussi', sw.includes('"api.mapbox.com"'));
check('router.project-osrm.org aussi', sw.includes('"router.project-osrm.org"'));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
