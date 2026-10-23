/* =====================================================================
   TEST-ADMIN-HOTEL-DEPART.MJS — 23 octobre 2026
   ---------------------------------------------------------------------
   À sa demande : une course saisie dans l'admin au départ de l'easyHotel
   de Tremblay doit apparaître chez sa réception. La réception ne lit que
   les courses dont le bon porte la clé de l'hôtel (« provenanceCle »,
   filtre de « courses-hotel ») : c'est donc elle qu'on éprouve.

   1. Un départ CHOISI à l'hôtel (point de la BAN, pas celui de secours)
      fait choisir l'hôtel tout seul ; la course enregistrée porte sa clé.
   2. Un départ ailleurs (1 km plus loin) ne rattache rien.
   3. Un choix fait à la main n'est pas défait par la détection.
   4. Le canal reste « Saisie au téléphone » (commission inchangée), et le
      tableau de bord la marque « easyHotel ».
   5. Les courses déjà saisies : le bloc les compte, un appui les rattache,
      celle d'ailleurs reste telle quelle, le bloc disparaît.

   Lancer :  npx http-server -p 8099 -s .
             node test-admin-hotel-depart.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[], ko=[];
const check=(n,c,d='')=> (c?ok:ko).push(n + (d?' — '+d:''));
const errs=[];

/* Le point de l'adresse selon la (fausse) BAN : volontairement à ~400 m du
   point de secours écrit dans HOTELS (48.9640, 2.5480). Si l'admin jugeait
   sur le secours, l'hôtel choisi ci-dessous (à 30 m de la BAN) tomberait
   hors du rayon : le test prouve que la BAN est lue. */
const BAN_HOTEL = { lat:48.9676, lon:2.5480 };
const P = (nom, lon, lat) => ({ geometry:{coordinates:[lon,lat]},
  properties:{ name:nom, osm_key:'tourism', osm_value:'hotel', city:'Tremblay-en-France',
    postcode:'93410', countrycode:'FR', osm_type:'N', osm_id:Math.round(lon*1e5+lat*1e3) } });
const PHOTON = [
  [/easyhotel/, [ P('easyHotel Paris CDG Aéroville', 2.5482, 48.9678) ]],
  [/novotel/,   [ P('Novotel Paris Nord', 2.5480, 48.9766) ]],
  [/vendome/,   [ P('Place Vendôme', 2.3292, 48.8675) ]]
];

async function brancherFaux(p){
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', async r => {
    const u = r.request().url(), d = decodeURIComponent(u).toLowerCase();
    if(u.startsWith('http://127.0.0.1:8099')) return r.continue();
    if(d.includes('photon.komoot.io')){
      const q = (d.match(/[?&]q=([^&]*)/) || [,''])[1];
      const t = PHOTON.find(([re]) => re.test(q));
      return r.fulfill({contentType:'application/json', body:JSON.stringify({features: t ? t[1] : []})});
    }
    if(d.includes('api-adresse.data.gouv.fr')){
      const f = /belle borne/.test(d) ? [{ geometry:{coordinates:[BAN_HOTEL.lon, BAN_HOTEL.lat]},
        properties:{ label:'10 Rue de la Belle Borne 93410 Tremblay-en-France', type:'housenumber',
          name:'10 Rue de la Belle Borne', postcode:'93410', city:'Tremblay-en-France', score:0.9 } }] : [];
      return r.fulfill({contentType:'application/json', body:JSON.stringify({features:f})});
    }
    if(d.includes('router.project-osrm.org'))
      return r.fulfill({contentType:'application/json', body:JSON.stringify({routes:[{distance:30000,duration:2400}]})});
    return r.abort();
  });
}
async function choisir(p, champ, q, texte){
  await p.fill(champ, '');
  await p.type(champ, q, {delay:15});
  await p.waitForTimeout(400);
  const o = p.locator(champ + 'List [role=option]', {hasText:texte}).first();
  await o.waitFor({timeout:5000}).catch(()=>{});
  if(!(await o.count())){ check('la ligne « ' + texte + ' » est proposée', false); return false; }
  await o.click(); await p.waitForTimeout(300); return true;
}
/* Lectures gardées : sur un code qui n'a pas l'élément, la suite le DIT
   au lieu de mourir sur un délai d'attente. */
const val = (p, sel) => p.inputValue(sel, {timeout:2000}).catch(() => '(absent)');
const texte = (p, sel) => p.locator(sel).textContent({timeout:2000}).catch(() => '(absent)');
const lieu = (lat, lon, adresse) => ({ nom:'', adresse, latitude:lat, longitude:lon, provider:'photon', categorie:'hotel' });
const ancienne = (ref, l) => ({ ref, statut:'realisee', cree:'2026-10-15T10:00:00.000Z', canal:'admin',
  course:{ depart:l.adresse, arrivee:'Orly', departPublic:l.adresse, arriveePublic:'Orly', departLieu:l,
           date:'2026-10-16', heure:'08:00', vehicule:'Berline', vehiculeCle:'berline', passagers:'1 passager' },
  client:{ nom:'Client Ancien', telephone:'06 12 34 56 78' }, prix:{ total:90, ht:81.82, tva:8.18 } });

const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR' });
const p = await ctx.newPage();
await brancherFaux(p);
await p.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
await p.evaluate(([a, b]) => localStorage.setItem('ela_bookings', JSON.stringify([a, b])), [
  ancienne('ELA-26-10-HOTA1', lieu(48.9677, 2.5481, 'easyHotel Paris CDG Aéroville')),
  ancienne('ELA-26-10-LOIN1', lieu(48.9766, 2.5480, 'Novotel Paris Nord'))]);
await p.goto('http://127.0.0.1:8099/index.html?exploitant=1', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.fill('#codeExploitant', '12345678');
await p.locator('#btnDeverrouiller').click(); await p.waitForTimeout(400);
await p.locator('#btnSaisirCourse').click(); await p.waitForTimeout(800);

/* 5. Les courses déjà saisies. */
const bloc = p.locator('#crRattacher');
check('le bloc compte UNE ancienne course au départ de l\'hôtel (pas celle d\'à côté)',
  await bloc.isVisible() && /^1 course/.test(await texte(p, '#crRattacherTexte')),
  await texte(p, '#crRattacherTexte'));
await p.locator('#btnRattacher').click({timeout:2000}).catch(()=>{}); await p.waitForTimeout(400);
let l = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]'));
const hA = l.find(c => c.ref === 'ELA-26-10-HOTA1'), lo = l.find(c => c.ref === 'ELA-26-10-LOIN1');
check('un appui la rattache : elle porte la clé de l\'hôtel et son nom',
  hA && hA.provenanceCle === 'easyhotel-aeroville' && hA.provenance === 'easyHotel Aéroville' && hA.canal === 'admin',
  JSON.stringify(hA && { k:hA.provenanceCle, p:hA.provenance, c:hA.canal }));
check('la course d\'à côté (1 km) reste sans hôtel', lo && !lo.provenanceCle, JSON.stringify(lo && lo.provenanceCle));
check('le bloc disparaît une fois tout rattaché', await bloc.count() > 0 && await bloc.isHidden());

/* 2. Un départ ailleurs ne rattache rien. */
await choisir(p, '#crDepart', 'novotel', 'Novotel');
await p.waitForTimeout(300);
check('un départ à 1 km de l\'hôtel ne choisit aucun hôtel', (await val(p, '#crHotel')) === '',
  await val(p, '#crHotel'));

/* 1. Un départ choisi à l'hôtel. */
await choisir(p, '#crDepart', 'easyhotel', 'easyHotel');
await p.waitForTimeout(300);
check('un départ choisi à l\'hôtel (point de la BAN) le choisit tout seul',
  (await val(p, '#crHotel')) === 'easyhotel-aeroville', await val(p, '#crHotel'));
await choisir(p, '#crArrivee', 'vendome', 'Vendôme');
await p.fill('#crDate', '2026-10-25'); await p.fill('#crHeure', '09:00');
await p.fill('#crPrix', '80');
await p.fill('#crNom', 'Client Hôtel'); await p.fill('#crTel', '06 11 22 33 44');
await p.locator('#btnCreerCourse').click(); await p.waitForTimeout(600);
l = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]'));
const cree = l[0];
check('la course enregistrée porte la clé de l\'hôtel : sa réception la lira',
  cree && cree.client.nom === 'Client Hôtel' && cree.provenanceCle === 'easyhotel-aeroville'
  && cree.provenance === 'easyHotel Aéroville', JSON.stringify(cree && { k:cree.provenanceCle, p:cree.provenance }));
check('…et reste une saisie au téléphone (canal « admin »), jamais « par la réception »',
  cree && cree.canal === 'admin' && !cree.parReception);

/* 4. Le canal de la commission et le tableau de bord. */
await p.locator('#btnRetourBord').click().catch(()=>{}); await p.waitForTimeout(300);
await p.locator('.compteur[data-filtre="confirmee"]').click(); await p.waitForTimeout(300);
const carte = p.locator('#listeBord .demande', {hasText:'Client Hôtel'}).first();
const prov = await carte.locator('.d-prov').textContent({timeout:2000}).catch(()=> '');
check('le tableau de bord la marque « easyHotel »', /^easyHotel$/.test((prov || '').trim()), prov);

/* 3. Un choix à la main n'est pas défait. */
await p.locator('#btnSaisirCourse').click(); await p.waitForTimeout(500);
check('le formulaire rouvre sans hôtel', (await val(p, '#crHotel')) === '');
await p.selectOption('#crHotel', 'easyhotel-aeroville', {timeout:2000}).catch(()=>{});
await choisir(p, '#crDepart', 'novotel', 'Novotel');
await p.waitForTimeout(300);
check('un hôtel choisi à la main reste choisi après un départ ailleurs',
  (await val(p, '#crHotel')) === 'easyhotel-aeroville', await val(p, '#crHotel'));
await ctx.close();

/* Le canal de commission, jugé par la fonction elle-même : la clé d'hôtel
   ne fait pas passer une saisie au téléphone dans « Flyer hôtel ». */
const src = (await import('node:fs')).readFileSync('index.html', 'utf8');
const corps = src.slice(src.indexOf('function canalDe(c){'), src.indexOf('}', src.indexOf('return "public";\n  }', src.indexOf('function canalDe(c){'))) + 1);
const canalDe = new Function('return ' + corps)();
check('canalDe : une saisie au téléphone rattachée à l\'hôtel reste « admin »',
  canalDe({ canal:'admin', provenanceCle:'easyhotel-aeroville' }) === 'admin');
check('canalDe : le flyer reste « hotel », le comptoir « reception »',
  canalDe({ provenanceCle:'easyhotel-aeroville' }) === 'hotel'
  && canalDe({ parReception:true, provenanceCle:'easyhotel-aeroville' }) === 'reception');

check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if(ko.length){ console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
