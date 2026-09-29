/* =====================================================================
   TEST-TARIFS-SERVEUR.MJS — le prix montré est celui du serveur, même lent
   ---------------------------------------------------------------------
   29 septembre 2026. Les prix se modifient depuis l'admin (« UN SEUL TARIF
   AU KILOMÈTRE ») et la page les lit au chargement. Deux trous restaient :
   - un client RAPIDE voyait le prix de repli si le serveur répondait après
     son clic sur « Voir mon prix » — prix ferme, donc opposable ;
   - la page du QR easyHotel gardait ses montants écrits en dur, pendant
     que le moteur facturait le nouveau forfait un clic plus loin.

   Les prix attendus sont calculés À LA MAIN, 24,3 km :
     serveur 3,50 €/km → 85,05 → 90 €   |   repli 2,90 €/km → 70,47 → 70 €

   Lancer :  node test-tarifs-serveur.mjs
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
await new Promise(r => serveur.listen(8094, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:8094';
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const J = (b, s=200) => ({status:s, contentType:'application/json', body:JSON.stringify(b)});
const TARIF = [{gamme:'berline', par_km_centimes:350, minimum_centimes:3000},
               {gamme:'van', par_km_centimes:600, minimum_centimes:5000}];
const FORFAITS = [{partenaire_cle:'easyhotel-aeroville', destination_cle:'orly', vehicule_cle:'berline', montant_centimes:9500},
                  {partenaire_cle:'easyhotel-aeroville', destination_cle:'orly', vehicule_cle:'van', montant_centimes:13000}];
const nav = await chromium.launch();

async function client(repond, lent){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rest/v1/tarif_public') || u.includes('/rest/v1/forfaits_partenaires_publics')) {
      if (!repond) return route.abort();
      if (lent) await new Promise(r => setTimeout(r, lent));
      return route.fulfill(J(u.includes('tarif_public') ? TARIF : FORFAITS));
    }
    if (u.includes('photon.komoot.io')) {
      const loin = u.toLowerCase().includes('argenteuil');
      return route.fulfill(J({features:[ loin
        ? {geometry:{coordinates:[2.2467,48.9478]},properties:{name:'Argenteuil',osm_key:'place',osm_value:'town',postcode:'95100',city:'Argenteuil',countrycode:'FR'}}
        : {geometry:{coordinates:[2.3376,48.8606]},properties:{name:'Place Vendôme',osm_key:'tourism',osm_value:'attraction',postcode:'75001',city:'Paris',countrycode:'FR'}} ]}));
    }
    if (u.includes('api-adresse.data.gouv.fr')) return route.fulfill(J({features:[]}));
    if (u.includes('router.project-osrm.org')) return route.fulfill(J({routes:[{distance:24300,duration:2040}]}));
    return route.abort();
  });
  await p.goto(BASE + '/', {waitUntil:'domcontentloaded'});
  await p.type('#depart', 'vendome', {delay:8}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee', 'argenteuil', {delay:8}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d3 = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d3); await p.fill('#heure', '10:00');
  await p.locator('#btnVoirPrix').click();
  await p.waitForSelector('.veh-prix', {timeout:8000}).catch(()=>{});
  await p.waitForTimeout(300);
  const prix = await p.$$eval('.veh-carte', l => l.map(c => c.querySelector('.veh-nom').textContent + '=' + c.querySelector('.veh-prix').textContent));
  await ctx.close();
  return { prix: prix.join(' | '), erreurs };
}

let r = await client(true, 0);
check('tarif du serveur : berline 3,50 €/km → 90 €', /Berline=90,00\s€/.test(r.prix), r.prix);
/* Le vrai risque : un serveur LENT. On le ralentit exprès au-delà du temps
   que met un client à remplir le formulaire dans ce test. */
r = await client(true, 3500);
check('serveur lent (3,5 s) : le prix attend le tarif, 90 € et pas 70', /Berline=90,00\s€/.test(r.prix), r.prix);
r = await client(false, 0);
check('serveur muet : le site donne quand même un prix (repli 70 €)', /Berline=70,00\s€/.test(r.prix), r.prix);
check('aucune erreur JavaScript', r.erreurs.length === 0, r.erreurs.join(' | '));

/* La page du QR easyHotel */
{
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const p = await ctx.newPage();
  await p.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rest/v1/forfaits_partenaires_publics')) return route.fulfill(J(FORFAITS));
    return route.abort();
  });
  await p.goto(BASE + '/easyhotel-client/');
  await p.waitForFunction(() => /95/.test(document.querySelector('a.carte[data-dest="orly"] b[data-g="berline"]').textContent), null, {timeout:5000}).catch(()=>{});
  const orly = (await p.textContent('a.carte[data-dest="orly"] b[data-g="berline"]')).trim();
  check('page du QR : Orly affiche le forfait du serveur (95 €)', orly === '95 €', orly);
  const cdg = (await p.textContent('a.carte[data-dest="cdg"] b[data-g="van"]')).trim();
  check('page du QR : une carte absente de la réponse garde son secours (CDG van 50 €)', cdg === '50 €', cdg);
  await ctx.close();
}

await nav.close(); serveur.close();
console.log(`=== TEST TARIFS SERVEUR : ${ok.length} OK, ${ko.length} échec(s) ===`);
ok.forEach(x => console.log('  ✓ ' + x)); ko.forEach(x => console.log('  ✗ ' + x));
process.exit(ko.length ? 1 : 0);
