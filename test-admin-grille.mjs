/* =====================================================================
   TEST-ADMIN-GRILLE.MJS — les prix se modifient depuis l'admin
   ---------------------------------------------------------------------
   29 septembre 2026, Barbaros : « une case pour pouvoir modifier les prix
   au km, prix hôtel, prix flyer ». La grille vit sur le serveur ; le site,
   la page du flyer et l'admin la lisent.

   CE QU'ON ÉPROUVE, SUR LE SITE CONSTRUIT :
   - le prix monté au client suit la grille du SERVEUR, pas les nombres de
     secours de la page — et même si le serveur répond LENTEMENT : un
     client rapide ne doit pas voir l'ancien prix ;
   - serveur muet : le site donne quand même un prix (celui de secours) ;
   - l'admin affiche la grille lue, envoie ce qu'on change, et refuse une
     faute de frappe (« 265 » €/km) sans rien envoyer ;
   - la page du flyer affiche les forfaits du serveur.
   Les prix attendus sont calculés À LA MAIN : 24,3 km.
     serveur 3,00 €/km → 72,90 → 70 €   |   secours 2,65 €/km → 64,40 → 60 €
     van serveur 5,00  → 121,50 → 120 € |   van secours 4,00   → 97,20 → 100 €

   Lancer :  node test-admin-grille.mjs
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
const GRILLE = {
  berline:{par_km_centimes:300, minimum_centimes:3000}, van:{par_km_centimes:500, minimum_centimes:5000},
  hotel_km:{berline_par_km_centimes:260, van_par_km_centimes:420},
  forfaits:{'easyhotel-aeroville':{ cdg:{berline:3500,van:5000}, orly:{berline:9500,van:13000},
    bourget:{berline:3500,van:7000}, beauvais:{berline:18000,van:24000}, villepinte:{berline:3500,van:5000},
    disney:{berline:8000,van:12000}, paris:{berline:8000,van:12000} }} };
const nav = await chromium.launch();

async function client(grille, lent){
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rpc/grille_publique')) {
      if (!grille) return route.abort();
      if (lent) await new Promise(r => setTimeout(r, lent));
      return route.fulfill(J(grille));
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

/* ─── 1. Le client voit la grille du serveur ─── */
let r = await client(GRILLE, 0);
check('grille du serveur : berline 3 €/km → 70 €', /Berline=70,00\s€/.test(r.prix), r.prix);
check('grille du serveur : van 5 €/km → 120 €', /Van=120,00\s€/.test(r.prix), r.prix);
/* La page réécrit sa grille avant l'arrivée du client si le serveur est
   rapide ; le vrai risque est un serveur LENT : on le ralentit exprès. */
r = await client(GRILLE, 2500);
check('serveur lent (2,5 s) : le prix attend la grille, 70 € et pas 60', /Berline=70,00\s€/.test(r.prix), r.prix);
r = await client(null, 0);
check('serveur muet : le site donne quand même un prix (secours 60 €)', /Berline=60,00\s€/.test(r.prix), r.prix);
check('serveur muet : van de secours 100 €', /Van=100,00\s€/.test(r.prix), r.prix);
check('aucune erreur JavaScript côté client', r.erreurs.length === 0, r.erreurs.join(' | '));

/* ─── 2. L'admin modifie la grille ─── */
{
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  await ctx.addInitScript(() => localStorage.setItem('ela_nuage_session', JSON.stringify({access_token:'JETON', refresh_token:'R'})));
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', e => erreurs.push(e.message));
  const envois = [];
  await p.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rpc/est_exploitant')) return route.fulfill(J(true));
    if (u.includes('/rpc/grille_publique')) return route.fulfill(J(GRILLE));
    if (u.includes('/rpc/ela_modifier_grille')) {
      envois.push({ auth: route.request().headers()['authorization'], corps: JSON.parse(route.request().postData()) });
      return route.fulfill(J(GRILLE));
    }
    if (u.includes('supabase.co')) return route.fulfill(J([]));
    return route.abort();
  });
  await p.goto(BASE + '/admin.html');
  await p.waitForFunction(() => document.body.classList.contains('espace'), null, {timeout:10000});
  await p.click('#btnReglages');
  await p.waitForFunction(() => !document.getElementById('btnPrixEnregistrer').disabled, null, {timeout:6000}).catch(()=>{});
  check('admin : la grille LUE est affichée (berline 3 €/km)', await p.inputValue('#pk_berline') === '3', await p.inputValue('#pk_berline'));
  check('admin : le forfait Orly lu est affiché (95 €)', await p.inputValue('#pf_orly_berline') === '95');
  check('admin : le tarif hôtel au km lu est affiché (2,6)', await p.inputValue('#ph_berline') === '2,6');

  await p.fill('#pk_berline', '265');
  await p.click('#btnPrixEnregistrer');
  const avis = await p.textContent('#prixAvis');
  check('admin : « 265 » €/km est refusé, en nommant le champ', /Berline € \/ km/.test(avis), avis);
  check('admin : et rien n\'est envoyé au serveur', envois.length === 0);

  await p.fill('#pk_berline', '2,80');
  await p.fill('#pf_orly_berline', '100');
  await p.click('#btnPrixEnregistrer');
  await p.waitForFunction(() => /enregistrés/.test(document.getElementById('prixAvis').textContent), null, {timeout:5000}).catch(()=>{});
  const c = envois[0] && envois[0].corps.p_grille;
  check('admin : un seul envoi, avec le jeton de l\'exploitant', envois.length === 1 && envois[0].auth === 'Bearer JETON');
  check('admin : berline envoyée à 280 centimes', c && c.berline.par_km_centimes === 280, JSON.stringify(c && c.berline));
  check('admin : forfait Orly berline envoyé à 10 000 centimes', c && c.forfaits['easyhotel-aeroville'].orly.berline === 10000);
  check('admin : ce qu\'on n\'a pas touché part tel quel (van 500)', c && c.van.par_km_centimes === 500);
  check('aucune erreur JavaScript côté admin', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

/* ─── 3. La page du flyer ─── */
{
  const ctx = await nav.newContext({viewport:{width:390,height:844}, locale:'fr-FR'});
  const p = await ctx.newPage();
  await p.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE)) return route.continue();
    if (u.includes('/rpc/grille_publique')) return route.fulfill(J(GRILLE));
    return route.abort();
  });
  await p.goto(BASE + '/easyhotel-client/');
  await p.waitForFunction(() => /95/.test(document.querySelector('a.carte[data-dest="orly"] b[data-g="berline"]').textContent), null, {timeout:5000}).catch(()=>{});
  const orly = await p.textContent('a.carte[data-dest="orly"] b[data-g="berline"]');
  check('flyer : la carte Orly affiche le forfait du serveur (95 €)', orly.trim() === '95 €', orly);
  const cdg = await p.textContent('a.carte[data-dest="cdg"] b[data-g="van"]');
  check('flyer : les autres cartes restent justes (CDG van 50 €)', cdg.trim() === '50 €', cdg);
  await ctx.close();
}

await nav.close(); serveur.close();
console.log(`=== TEST ADMIN GRILLE : ${ok.length} OK, ${ko.length} échec(s) ===`);
ok.forEach(x => console.log('  ✓ ' + x)); ko.forEach(x => console.log('  ✗ ' + x));
process.exit(ko.length ? 1 : 0);
