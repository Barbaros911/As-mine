/* =====================================================================
   TEST-NOUVEAU-GEOLOC.MJS — « Me localiser »
   ---------------------------------------------------------------------
   Le client est à Roissy, téléphone dans une main, valise dans l'autre.
   Lui faire taper « Aéroport Charles-de-Gaulle, Terminal 2E » est le
   moment où l'on perd une réservation.

   CE QUI EST VERROUILLÉ, ET POURQUOI CHAQUE POINT COMPTE :

   — LE BOUTON N'EST QU'AU DÉPART. L'arrivée est là où l'on va, pas là où
     l'on est.
   — LES COORDONNÉES RETENUES SONT CELLES DE L'ADRESSE, PAS DU GPS. Le
     prix se calcule sur le trajet que le chauffeur fera vraiment, et le
     bon annonce le lieu écrit dessus. On donne donc au faux GPS et à la
     fausse BAN des points DIFFÉRENTS, et on vérifie lequel ressort.
   — LE TEXTE ET LES COORDONNÉES NE DOIVENT JAMAIS SE DÉSACCORDER. C'est
     le contrôle le plus important du fichier : le client se localise,
     puis corrige son adresse à la main. Sans la prise « poser() », la
     garde qui invalide les coordonnées ne s'armerait pas — elle ne se
     déclenche que si une adresse a été retenue — et la course partirait
     avec les coordonnées d'un endroit et le nom d'un autre. Le prix est
     ferme : il serait faux et opposable.
   — UN REFUS N'EST PAS UNE PANNE, et un endroit sans adresse non plus :
     trois messages distincts, qui disent chacun quoi faire.
   — LA ZONE DES 90 KM S'APPLIQUE AUSSI À UNE ADRESSE GÉOLOCALISÉE. Se
     localiser à Lille ne doit pas ouvrir une porte dérobée.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-geoloc.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Le GPS rend un point ; la BAN rend une adresse à un point LÉGÈREMENT
   DIFFÉRENT — c'est le cas réel, le téléphone se trompe de quelques
   dizaines de mètres. Les deux doivent rester distinguables. */
const GPS = { latitude:48.8600, longitude:2.3380 };
const BAN = { lat:48.8606, lon:2.3376, label:"12 Place Vendôme, 75001 Paris" };

async function page({ position=GPS, permission='granted', reverse=BAN } = {}){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
    locale:'fr-FR', geolocation:position ? {latitude:position.latitude, longitude:position.longitude} : undefined,
    permissions: permission==='granted' ? ['geolocation'] : []});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));

  const appels = [];
  await p.route('**://api-adresse.data.gouv.fr/**', route => {
    const u = route.request().url();
    appels.push(u);
    if(u.includes('/reverse/')){
      if(!reverse) return route.fulfill({contentType:'application/json',
        body:JSON.stringify({features:[]})});
      return route.fulfill({contentType:'application/json', body:JSON.stringify({features:[
        {geometry:{coordinates:[reverse.lon, reverse.lat]},
         properties:{label:reverse.label}}]})});
    }
    return route.fulfill({contentType:'application/json', body:JSON.stringify({features:[
      {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})});
  });
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({features:[]})}));
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  const routes = [];
  await p.route('**://router.project-osrm.org/**', r => {
    routes.push(r.request().url());
    return r.fulfill({contentType:'application/json',
      body:JSON.stringify({routes:[{distance:24300,duration:2040}]})});
  });
  await p.route('**supabase.co/**', r => r.abort());

  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  return { ctx, p, appels, routes };
}

/* --- 1. Le bouton est là, et seulement au départ -------------------- */
let { ctx, p, appels, routes } = await page();
check('le bouton « me localiser » est sur le champ de départ',
  await p.locator('#btnGeoloc').isVisible());
check('il n\'y en a qu\'UN dans toute la page',
  (await p.locator('.geoloc').count())===1,
  (await p.locator('.geoloc').count())+' trouvé(s)');
check('il est bien dans le bloc du départ, pas ailleurs',
  await p.locator('#depart').locator('xpath=ancestor::div[contains(@class,"champ-bloc")]')
        .locator('#btnGeoloc').count()===1);
/* 44 px : sous cette taille, un pouce rate sa cible — et on s'en sert en
   marchant, une valise à la main. */
const bt = await p.locator('#btnGeoloc').boundingBox();
check('sa zone tactile fait au moins 44 px', bt.width>=44 && bt.height>=44,
  Math.round(bt.width)+'×'+Math.round(bt.height));

/* --- 2. Le cas nominal ---------------------------------------------- */
await p.locator('#btnGeoloc').click();
await p.waitForTimeout(1200);
check('le champ de départ est rempli avec l\'adresse',
  (await p.locator('#depart').inputValue())===BAN.label,
  await p.locator('#depart').inputValue());
check('la position est relue par la Base Adresse Nationale',
  appels.some(u=>u.includes('/reverse/')),
  appels.filter(u=>u.includes('/reverse/'))[0]);
check('le point envoyé est bien celui du GPS',
  appels.some(u=>u.includes('lat='+GPS.latitude) && u.includes('lon='+GPS.longitude)),
  appels.filter(u=>u.includes('/reverse/'))[0]);
check('on invite le client à vérifier l\'adresse',
  !(await p.locator('#geoEtat').isHidden())
  && (await p.locator('#geoEtat').textContent()).includes('Vérifiez'),
  await p.locator('#geoEtat').textContent());
check('la liste des suggestions ne s\'ouvre pas par-dessus',
  await p.locator('#departList').isHidden());

/* LE CONTRÔLE QUI COMPTE LE PLUS, ET IL SE PROUVE DE BOUT EN BOUT : ce
   sont les coordonnées de l'ADRESSE qui partent au calculateur
   d'itinéraire, pas celles du GPS. L'URL de l'itinéraire les porte en
   clair — on la lit, plutôt que d'inspecter une variable interne. Un test
   qui regarde dans le moteur ne prouve pas ce que fait la voiture. */
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#arrivee','argenteuil'); await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1500);
check('le trajet part des coordonnées de l\'adresse',
  routes.length>0 && routes[0].includes(BAN.lon+','+BAN.lat), routes[0]);
check('et surtout PAS de celles du GPS',
  routes.length>0 && !routes[0].includes(GPS.longitude+','+GPS.latitude), routes[0]);
await ctx.close();

/* --- 3. LE DÉSACCORD TEXTE / COORDONNÉES.
   Le client se localise, puis corrige son adresse à la main sans rien
   choisir dans la liste. Le formulaire doit alors REFUSER : il n'a plus
   de coordonnées valides. S'il acceptait, la course partirait avec les
   coordonnées de l'ancienne adresse et le nom de la nouvelle — et le prix
   est ferme, donc opposable. */
({ ctx, p } = await page());
await p.locator('#btnGeoloc').click(); await p.waitForTimeout(1200);
await p.fill('#arrivee','argenteuil'); await p.waitForTimeout(900);
await p.locator('#arriveeList [role=option]').first().click();
await p.fill('#date', d); await p.fill('#heure','10:00');

await p.locator('#depart').fill('12 rue de la Paix');   // saisi, jamais choisi
await p.waitForTimeout(400);
/* Le bouton s'efface sous une liste de suggestions ouverte — c'est une
   règle du site, pas un incident. On referme la liste comme le ferait un
   client, sinon on éprouverait le mauvais comportement. */
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(1200);
check('corriger l\'adresse à la main invalide les coordonnées géolocalisées',
  await p.locator('#ecran-accueil').isVisible(),
  await p.locator('#ecran-vehicules').isVisible() ? 'l\'écran des prix s\'est ouvert !' : '');
await ctx.close();

/* --- 4. Le client refuse la localisation ---------------------------- */
({ ctx, p } = await page({ permission:'denied' }));
await p.locator('#btnGeoloc').click();
await p.waitForTimeout(1500);
let msg = await p.locator('#geoEtat').textContent();
check('un refus est annoncé comme un refus', /refus/i.test(msg), msg);
check('et le message dit QUOI FAIRE', /autoris|saisis/i.test(msg), msg);
check('le champ de départ reste vide', (await p.locator('#depart').inputValue())==='');
check('le bouton redevient utilisable', !(await p.locator('#btnGeoloc').isDisabled()));
await ctx.close();

/* --- 5. Un endroit sans adresse — une bretelle, un champ ------------ */
({ ctx, p } = await page({ reverse:null }));
await p.locator('#btnGeoloc').click();
await p.waitForTimeout(1500);
msg = await p.locator('#geoEtat').textContent();
check('« pas d\'adresse ici » n\'est pas confondu avec un refus',
  /aucune adresse/i.test(msg) && !/refus/i.test(msg), msg);
check('et le champ n\'est pas rempli avec des coordonnées nues',
  (await p.locator('#depart').inputValue())==='',
  await p.locator('#depart').inputValue());
await ctx.close();

/* --- 6. LA ZONE DES 90 KM S'APPLIQUE AUSSI ICI.
   Se localiser à Lille ne doit pas ouvrir une porte dérobée : avant la
   règle de zone, un Lille → Marseille passait sans un mot, à 1 900 € que
   le prix ferme rendait opposables. ---------------------------------- */
({ ctx, p } = await page({
  position:{latitude:50.6292, longitude:3.0573},
  reverse:{ lat:50.6292, lon:3.0573, label:"Place du Général de Gaulle, 59000 Lille" }}));
await p.locator('#btnGeoloc').click();
await p.waitForTimeout(1500);
check('une position hors zone est refusée comme une adresse hors zone',
  !(await p.locator('#horsZone').isHidden()));
check('et l\'écriteau nomme le lieu, pour qu\'on comprenne pourquoi',
  (await p.locator('#horsZoneLieu').textContent()).includes('Lille'),
  await p.locator('#horsZoneLieu').textContent());
/* Le bouton doit être éteint AUSSI : un écriteau seul laisserait croire
   qu'on peut quand même essayer. */
check('et le bouton du prix est éteint',
  await p.locator('#btnVoirPrix').isDisabled());
await ctx.close();

/* --- 7. Les deux langues -------------------------------------------- */
({ ctx, p } = await page());
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(250);
check('le bouton est décrit en anglais aux lecteurs d\'écran',
  (await p.locator('#btnGeoloc').getAttribute('aria-label'))==='Use my location',
  await p.locator('#btnGeoloc').getAttribute('aria-label'));
await p.locator('#btnGeoloc').click();
await p.waitForTimeout(1200);
msg = await p.locator('#geoEtat').textContent();
check('et son message aussi', /Check the address/i.test(msg), msg);
await ctx.close();

/* --- 8. Ce que la page promet par écrit ------------------------------
   La politique de confidentialité annonce « Me localiser » depuis
   toujours : elle décrivait une fonction qui n'existait pas. */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
check('la politique de confidentialité mentionne bien la localisation',
  /Données de localisation.*Me localiser/.test(source));
check('elle précise que c\'est volontaire',
  /uniquement si le Client active volontairement/.test(source));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
