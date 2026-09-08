/* =====================================================================
   TEST-NOUVEAU-CARTE.MJS — la carte du trajet
   ---------------------------------------------------------------------
   À la demande de Barbaros : « une belle carte comme Maps ». Le client voit
   la route qu'on lui facture, et c'est ce qui rend le prix compréhensible.

   ═══ CE QUE CETTE SUITE PROTÈGE, DANS L'ORDRE ═══

   1. QU'ELLE NE PUISSE JAMAIS EMPÊCHER DE RÉSERVER. La bibliothèque vient
      d'un service extérieur, les tuiles d'un autre, et le client d'un
      parking d'aéroport n'a parfois aucun réseau. Une carte absente doit
      coûter la carte, jamais la course. C'est le contrôle le plus important
      de cette suite, et c'est aussi celui qui tourne toujours : cette
      machine est hors ligne, donc Leaflet n'y arrive jamais.

   2. QUE LES COORDONNÉES SOIENT DANS LE BON ORDRE. Les calculateurs
      d'itinéraire rendent « lon, lat » ; Leaflet veut « lat, lon ».
      Inversé, le tracé part dans l'océan Indien — et ça ne se voit pas en
      relisant le code, seulement sur une carte qu'on regarde. On pose donc
      un faux Leaflet qui ENREGISTRE ce qu'on lui donne, et on vérifie que
      les points tombent bien en Île-de-France.

   3. QUE LA CARTE S'AFFICHE VRAIMENT, avec le VRAI Leaflet. Cette machine
      n'a pas accès au CDN ; si la bibliothèque a été récupérée dans le bac
      à sable (« npm pack leaflet@1.9.4 »), on la sert à sa place et on
      compte les tuiles, les traits et les repères. Sinon on le DIT — un
      contrôle sauté en silence est pire qu'un contrôle absent.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-carte.mjs
   ===================================================================== */
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';

const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

const BAC = '/tmp/claude-0/-home-user-As-mine/'
          + '4bad491f-f7fd-5fb8-ac80-285f0ac64a0c/scratchpad/package/dist/';

/* Un vrai tracé Paris → Roissy, en « lon, lat » comme le rendent les
   services. C'est la matière première du contrôle sur l'ordre des points. */
const TRACE = [[2.3376,48.8606],[2.3520,48.8720],[2.3690,48.8830],
               [2.3900,48.8980],[2.4200,48.9180],[2.4600,48.9400],
               [2.5000,48.9700],[2.5300,48.9900],[2.5479,49.0097]];

async function reserver(reglages = {}){
  const ctx = await b.newContext({viewport:{width:390,height:844},
                                  deviceScaleFactor:2, locale:'fr-FR'});
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:[{geometry:{coordinates:[2.3376,48.8606]},
      properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",
                  postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:[{geometry:{coordinates:[2.5479,49.0097]},
      properties:{label:"Aéroport Charles-de-Gaulle, 95700 Roissy"}}]})}));
  /* ORS est coupé explicitement, comme dans toutes les autres suites : sinon
     elles dépendraient du fait qu'il soit injoignable depuis cette machine. */
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:29400,duration:2280,
      geometry:{type:"LineString",coordinates:TRACE}}]})}));

  if(reglages.vraiLeaflet){
    await p.route('**://cdnjs.cloudflare.com/**/leaflet.js', r => r.fulfill(
      {contentType:'application/javascript', body:readFileSync(BAC+'leaflet.js','utf8')}));
    await p.route('**://cdnjs.cloudflare.com/**/leaflet.css', r => r.fulfill(
      {contentType:'text/css', body:readFileSync(BAC+'leaflet.css','utf8')}));
    /* De vraies images, fabriquées ici : on ne sort pas sur le réseau, et la
       politique d'OpenStreetMap interdit de toute façon qu'une suite de
       tests tape sur leurs serveurs. */
    await p.route('**://tile.openstreetmap.org/**', r => r.fulfill({
      contentType:'image/svg+xml',
      body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">'
         + '<rect width="256" height="256" fill="#eae6df"/></svg>'}));
  } else if(reglages.faux){
    /* UN FAUX LEAFLET QUI NOTE TOUT. On ne vérifie pas que Leaflet dessine —
       c'est son métier — mais que NOUS lui parlons correctement. */
    await p.addInitScript(() => {
      const j = { polylignes:[], marqueurs:[], tuiles:[], options:null,
                  prefixe:null, cadre:false };
      window.__carte = j;
      const couche = { addTo(){ return this; } };
      window.L = {
        map(el, opts){
          j.options = opts;
          j.cadre = !!(el && el.id === 'carteTrajet');
          const m = {
            attributionControl:{ setPrefix(v){ j.prefixe = v; } },
            removeLayer(){}, invalidateSize(){},
            fitBounds(bb){ j.cadre_ajuste = bb; }
          };
          return m;
        },
        tileLayer(url, opts){ j.tuiles.push({url, opts}); return couche; },
        layerGroup(){ return { addTo(){ return this; } }; },
        polyline(pts, opts){ j.polylignes.push({pts, opts}); return couche; },
        marker(pos, opts){ j.marqueurs.push({pos, opts}); return couche; },
        divIcon(o){ return o; },
        latLngBounds(pts){ return pts; }
      };
    });
    await p.route('**://cdnjs.cloudflare.com/**', r => r.abort());
  }

  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','roissy',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(reglages.vraiLeaflet ? 2500 : 1200);
  return { p, ctx, errs };
}

/* ═════════ 1. SANS CARTE, ON RÉSERVE QUAND MÊME ═════════
   Le contrôle le plus important, et le seul qui tourne dans tous les cas :
   cette machine n'a pas accès au CDN, donc Leaflet n'arrive jamais. C'est
   exactement la situation d'un client dans un parking d'aéroport. */
{
  const { p, ctx, errs } = await reserver();
  check('l\'écran des prix s\'affiche même sans la bibliothèque de carte',
    await p.locator('#ecran-vehicules').isVisible());
  check('les prix sont là — la carte ne conditionne rien',
    (await p.locator('.veh-prix').count()) === 2,
    String(await p.locator('.veh-prix').count()));
  check('le cadre de la carte reste CACHÉ plutôt que vide',
    !(await p.locator('#carteTrajet').isVisible()));
  /* Un cadre replié n'occupe aucune place : la liste des prix ne doit pas
     être poussée par une carte qui n'existe pas. */
  check('et il ne laisse aucun trou dans la page',
    (await p.evaluate(()=>document.getElementById('carteTrajet').offsetHeight)) === 0);
  check('aucune erreur JavaScript — un échec de carte reste un non-événement',
    errs.length === 0, errs.join(' | '));
  /* ET ON PEUT ALLER JUSQU'AU BOUT. Sans ce contrôle, on prouverait
     seulement que l'écran s'affiche, pas qu'on peut encore réserver. */
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
  check('et la réservation continue jusqu\'au récapitulatif',
    await p.locator('#ecran-recap').isVisible());
  await ctx.close();
}

/* ═════════ 2. L'ORDRE DES COORDONNÉES ═════════
   Les calculateurs rendent « lon, lat », Leaflet veut « lat, lon ». Inversé,
   le tracé part dans l'océan Indien — sans message, sans erreur, avec une
   carte qui s'affiche très bien. C'est le genre de faute qu'on ne voit
   qu'en regardant, et un test qui relirait le code ne la verrait pas. */
{
  const { p, ctx, errs } = await reserver({ faux:true });
  const j = await p.evaluate(()=>window.__carte);
  check('la carte est créée dans SON cadre, pas ailleurs', j.cadre);
  check('deux traits superposés : un clair dessous, l\'accent dessus',
    j.polylignes.length === 2
    && j.polylignes[0].opts.weight > j.polylignes[1].opts.weight,
    j.polylignes.map(t=>t.opts.color+'/'+t.opts.weight).join(' '));
  const pts = (j.polylignes[0] || {}).pts || [];
  check('le tracé a autant de points que la route rendue',
    pts.length === 9, String(pts.length));
  /* LE CONTRÔLE QUI COMPTE : Paris est à 48,8° de latitude et 2,3° de
     longitude. Inversés, les points tomberaient à 2° de latitude — au large
     de l'Afrique. On vérifie donc les VALEURS, pas la forme. */
  check('les points sont en « lat, lon » — donc en Île-de-France',
    pts.every(pt => pt[0] > 48.5 && pt[0] < 49.3 && pt[1] > 1.8 && pt[1] < 3.2),
    JSON.stringify(pts[0]) + ' … ' + JSON.stringify(pts[pts.length-1]));
  check('le premier point est le départ, le dernier l\'arrivée',
    Math.abs(pts[0][0]-48.8606) < 0.001 && Math.abs(pts[8][0]-49.0097) < 0.001,
    JSON.stringify([pts[0], pts[8]]));
  /* LES REPÈRES SUIVENT L'ADRESSE RETENUE, pas celle qu'on croit avoir
     tapée. Ce contrôle a échoué au premier jet en comparant aux coordonnées
     de la fausse recherche d'adresse : le site avait reconnu Roissy et
     proposé un TERMINAL, qui a les siennes — 49,0067 au lieu de 49,0097.
     C'était le test qui se trompait, pas la page. On lit donc ce que la
     page a réellement retenu. */
  const [mA, mB] = j.marqueurs.map(m => m.pos);
  check('deux repères, dans le bon ordre : Paris puis Roissy',
    j.marqueurs.length === 2
    && Math.abs(mA[0]-48.8606) < 0.01 && Math.abs(mA[1]-2.3376) < 0.01
    && Math.abs(mB[0]-49.006)  < 0.01 && Math.abs(mB[1]-2.5479) < 0.01
    /* Roissy est au NORD de Paris : intervertir départ et arrivée
       retournerait le sens de la course sans rien casser d'autre. */
    && mB[0] > mA[0],
    JSON.stringify([mA, mB]));
  check('et eux aussi sont en « lat, lon »',
    [mA, mB].every(pt => pt[0] > 48.5 && pt[0] < 49.3 && pt[1] > 1.8 && pt[1] < 3.2),
    JSON.stringify([mA, mB]));
  /* Les repères ne se cliquent pas : ils n'ouvrent rien, et un élément qui
     réagit au doigt sans rien faire fait croire à une page cassée. */
  check('les repères ne sont pas cliquables',
    j.marqueurs.every(m => m.opts && m.opts.interactive === false));
  /* UNE CARTE DANS UN TUNNEL DE RÉSERVATION SE REGARDE. Un client qui fait
     glisser la page avec le pouce ne doit pas déplacer la carte au lieu de
     descendre à la liste des prix. */
  check('elle ne se manipule pas : ni glisser, ni zoomer',
    j.options && j.options.dragging === false && j.options.scrollWheelZoom === false
    && j.options.touchZoom === false && j.options.doubleClickZoom === false,
    JSON.stringify(j.options));
  /* L'ATTRIBUTION EST UNE OBLIGATION, PAS UN ORNEMENT : les données
     OpenStreetMap sont sous licence ODbL. */
  check('les tuiles viennent d\'OpenStreetMap et le citent',
    j.tuiles.length === 1
    && j.tuiles[0].url.indexOf('tile.openstreetmap.org') > 0
    && /OpenStreetMap/.test(j.tuiles[0].opts.attribution),
    JSON.stringify(j.tuiles[0] && j.tuiles[0].opts));
  /* LE DRAPEAU DE LEAFLET S'EN VA, et ce n'est pas la première fois dans ce
     projet : la version 1.9 glisse un drapeau ukrainien dans son
     attribution, et Barbaros l'avait déjà fait retirer de l'ancien site. Un
     site commercial n'affiche pas de position politique à l'insu de son
     exploitant — quelle qu'elle soit. */
  check('le préfixe de Leaflet est vidé — pas de drapeau ajouté par la bibliothèque',
    j.prefixe === '', JSON.stringify(j.prefixe));
  check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

/* ═════════ 3. AVEC LE VRAI LEAFLET ═════════
   Un faux prouve qu'on parle correctement à la bibliothèque, jamais qu'elle
   dessine. Le CDN étant injoignable d'ici, on sert la vraie bibliothèque
   depuis le bac à sable quand elle y est. */
if(existsSync(BAC + 'leaflet.js')){
  const { p, ctx, errs } = await reserver({ vraiLeaflet:true });
  check('AVEC LE VRAI LEAFLET, LA CARTE S\'AFFICHE',
    await p.locator('#carteTrajet').isVisible());
  check('des tuiles sont réellement chargées',
    (await p.locator('#carteTrajet img.leaflet-tile').count()) > 0,
    String(await p.locator('#carteTrajet img.leaflet-tile').count()));
  check('les deux traits du tracé sont dessinés',
    (await p.locator('#carteTrajet path').count()) === 2,
    String(await p.locator('#carteTrajet path').count()));
  check('et les deux repères posés',
    (await p.locator('#carteTrajet .leaflet-marker-icon').count()) === 2);
  const att = ((await p.locator('#carteTrajet .leaflet-control-attribution').textContent()) || '').trim();
  check('l\'attribution cite OpenStreetMap',  /OpenStreetMap/.test(att), att);
  check('et ne porte NI drapeau NI mention de Leaflet',
    !/Leaflet|🇺🇦/.test(att) && !(await p.locator('#carteTrajet .leaflet-attribution-flag').count()),
    att);
  check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
  await ctx.close();
} else {
  check('LE RENDU N\'A PAS PU ÊTRE ÉPROUVÉ : Leaflet absent du bac à sable', false,
    'npm pack leaflet@1.9.4 puis décompresser, ou lancer depuis une machine reliée au CDN');
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t)); }
process.exit(ko.length ? 1 : 0);
