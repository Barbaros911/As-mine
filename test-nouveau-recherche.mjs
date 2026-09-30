/* =====================================================================
   TEST-NOUVEAU-RECHERCHE.MJS — ce qu'on cherche par son nom arrive en tête
   ---------------------------------------------------------------------
   30 septembre 2026, à la demande de Barbaros : « je tape sacré coeur, il
   me propose des adresses de bars alors que je parle de la basilique ;
   pareil pour champs élysées ; et si je tape amst, je veux la rue
   d'Amsterdam à Paris mais aussi Amsterdam aux Pays-Bas ».

   Trois causes, lues dans le code, chacune éprouvée ici :
   1. « œ » n'était pas ramené à « oe » : « coeur » ne retrouvait pas
      « Cœur », et le bar écrit « Coeur » passait devant la basilique.
   2. Un lieu de culte n'était classé dans aucune catégorie, et une avenue
      n'avait pas le bonus de « lieu nommé » des commerces qui portent son
      nom.
   3. OpenStreetMap était filtré sur la France : Amsterdam n'apparaissait
      jamais.

   Les deux services répondent ICI dans l'ordre le plus défavorable (le bar
   et l'hôtel d'abord, Amsterdam aux Pays-Bas avant la rue) : si la page
   n'avait pas son propre classement, le test tomberait. On lit ce que le
   client voit, dans l'ordre où il le voit.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-recherche.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR' });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[], ko=[];
const check=(n,c,d='')=> (c?ok:ko).push(n + (d?' — '+d:''));

const PHOTON = {
  sacre: [
    { geometry:{coordinates:[2.3440,48.8850]}, properties:{ name:"Le Sacré Coeur", osm_key:"amenity",
      osm_value:"bar", street:"Rue Lepic", housenumber:"12", postcode:"75018", city:"Paris", countrycode:"FR" } },
    { geometry:{coordinates:[2.3431,48.8867]}, properties:{ name:"Basilique du Sacré-Cœur de Montmartre",
      osm_key:"amenity", osm_value:"place_of_worship", postcode:"75018", city:"Paris", countrycode:"FR" } }
  ],
  champs: [
    { geometry:{coordinates:[2.3040,48.8720]}, properties:{ name:"Hôtel Champs-Élysées Plaza", osm_key:"tourism",
      osm_value:"hotel", street:"Rue de Berri", housenumber:"35", postcode:"75008", city:"Paris", countrycode:"FR" } }
  ],
  amst: [
    { geometry:{coordinates:[4.8952,52.3702]}, properties:{ name:"Amsterdam", osm_key:"place", osm_value:"city",
      state:"Noord-Holland", country:"Pays-Bas", countrycode:"NL" } }
  ]
};
const BAN = {
  sacre: [ { geometry:{coordinates:[2.3440,48.8840]}, properties:{ label:"Rue du Sacré-Cœur 75018 Paris", type:"street" } } ],
  champs: [ { geometry:{coordinates:[2.3070,48.8700]}, properties:{ label:"Avenue des Champs Élysées 75008 Paris", type:"street" } } ],
  amst: [ { geometry:{coordinates:[2.3270,48.8790]}, properties:{ label:"Rue d'Amsterdam 75008 Paris", type:"street" } } ]
};
const cle = u => /sacr/i.test(u) ? 'sacre' : /champs/i.test(u) ? 'champs' : /amst/i.test(u) ? 'amst' : null;
await p.route('**/*', r => {
  const u = decodeURIComponent(r.request().url());
  if(u.startsWith('http://127.0.0.1:8099')) return r.continue();
  if(u.includes('photon.komoot.io')) return r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:PHOTON[cle(u)] || []})});
  if(u.includes('api-adresse.data.gouv.fr')) return r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:BAN[cle(u)] || []})});
  return r.abort();
});

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);

/* On attend la liste de CETTE recherche, reconnue à un mot attendu : la
   liste précédente reste affichée le temps que la nouvelle arrive, et la
   lire serait lire la réponse d'une autre question. */
async function liste(q, attendu){
  await p.fill('#arrivee','');
  await p.type('#arrivee', q, {delay:20});
  await p.waitForFunction(a => [...document.querySelectorAll('#arriveeList [role=option]')]
    .some(o => o.textContent.includes(a)), attendu, {timeout:4000}).catch(()=>{});
  await p.waitForTimeout(150);
  return (await p.locator('#arriveeList [role=option]').allTextContents()).map(t => t.trim());
}

let l = await liste('sacré coeur', 'Sacr');
check('« sacré coeur » : la BASILIQUE arrive en tête', /Basilique/.test(l[0] || ''), l.join(' | '));
check('…le bar homonyme passe derrière, mais reste dans la liste',
  l.findIndex(t => /Le Sacré Coeur/.test(t)) > 0, l.join(' | '));
check('…et la rue du Sacré-Cœur passe devant le bar',
  l.findIndex(t => /Rue du Sacré/.test(t)) < l.findIndex(t => /Le Sacré Coeur/.test(t)), l.join(' | '));

l = await liste('champs elysee', 'Champs');
check('« champs elysee » : l\'AVENUE arrive en tête, avant l\'hôtel qui porte son nom',
  /Avenue des Champs/.test(l[0] || ''), l.join(' | '));
check('…et l\'hôtel reste proposé', l.some(t => /Plaza/.test(t)), l.join(' | '));

l = await liste('amst', 'Amsterdam');
check('« amst » : la rue d\'Amsterdam à Paris en tête', /Rue d'Amsterdam/.test(l[0] || ''), l.join(' | '));
check('…ET Amsterdam aux Pays-Bas apparaît (plus de filtre « France seulement »)',
  l.some(t => /Amsterdam, .*Pays-Bas/.test(t)), l.join(' | '));

/* LA ZONE TIENT TOUJOURS : choisir Amsterdam ne donne pas de prix en
   ligne, ça dit « hors zone » avec l'appel et WhatsApp. */
/* Gardé : si Amsterdam manque, la suite doit le DIRE, pas mourir sur un
   délai d'attente sans imprimer son bilan. */
const amsterdam = p.locator('#arriveeList [role=option]', {hasText:'Pays-Bas'}).first();
if(await amsterdam.count()) await amsterdam.click();
await p.waitForTimeout(300);
const horsZone = await p.evaluate(() => {
  const e = document.getElementById('horsZone');
  return !!e && !e.hidden && e.offsetParent !== null;
});
check('choisir Amsterdam affiche « hors zone » : pas de réservation en ligne à 430 km', horsZone);

check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if(ko.length){ console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
