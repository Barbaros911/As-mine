import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const S='/tmp/claude-0/-home-user-As-mine/4bad491f-f7fd-5fb8-ac80-285f0ac64a0c/scratchpad';
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('console', m => { if(m.type()==='error') errs.push('console: '+m.text()); });

await p.route('**://cdnjs.cloudflare.com/**/leaflet.js', r =>
  r.fulfill({contentType:'application/javascript', body: readFileSync(S+'/package/dist/leaflet.js','utf8')}));
await p.route('**://cdnjs.cloudflare.com/**/leaflet.css', r =>
  r.fulfill({contentType:'text/css', body: readFileSync(S+'/package/dist/leaflet.css','utf8')}));
await p.route('**://tile.openstreetmap.org/**', r => r.fulfill({contentType:'image/svg+xml',
  body:'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#eae6df"/></svg>'}));

await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));

// LA VRAIE FORME D'UNE RÉPONSE ORS : GeoJSON, geometry au niveau de la feature.
const urlsORS=[];
await p.route('**://api.openrouteservice.org/**', r => {
  urlsORS.push(r.request().url());
  r.fulfill({contentType:'application/json', body: JSON.stringify({
    type:"FeatureCollection",
    features:[{ type:"Feature", bbox:[2.33,48.86,2.55,49.01],
      properties:{ segments:[{distance:24300,duration:2040}],
                   summary:{ distance:24300, duration:2040 } },
      geometry:{ type:"LineString", coordinates:[
        [2.3376,48.8606],[2.3520,48.8720],[2.3690,48.8830],
        [2.3900,48.8980],[2.4200,48.9180],[2.2467,48.9478]] } }]
  })});
});
await p.route('**://router.project-osrm.org/**', r => r.abort());

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(2600);
console.log('ORS appelé   :', urlsORS.length, urlsORS[0] ? '('+urlsORS[0].slice(0,60)+'…)' : '');
console.log('prix affiché :', (await p.locator('.veh-prix').allTextContents()).join(' / '));
console.log('carte visible:', await p.locator('#carteTrajet').isVisible());
console.log('tuiles       :', await p.locator('#carteTrajet img.leaflet-tile').count());
console.log('traits       :', await p.locator('#carteTrajet path').count());
console.log('erreurs      :', errs.length?errs.join(' | '):'aucune');
await p.screenshot({path:S+'/ors.png'});
await b.close();
