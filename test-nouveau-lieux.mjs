/* =====================================================================
   TEST-NOUVEAU-LIEUX.MJS — le moteur de recherche de lieux, 4 octobre 2026
   ---------------------------------------------------------------------
   Mission « moteur de réservation 10/10 » : faire évoluer la recherche
   sans la refaire. Ce que cette suite éprouve, chaque point contre un
   faux service qui répond dans l'ordre le PLUS DÉFAVORABLE :

   1. UNE PANNE N'EST PLUS GARDÉE EN MÉMOIRE. Avant, une seconde de réseau
      perdue faisait mettre en cache une liste vide : la même adresse
      retapée répondait « Aucune adresse trouvée » jusqu'au rechargement.
   2. La panne et le vrai « rien trouvé » ne disent plus la même chose.
   3. LES FAUTES DE FRAPPE : « novotel roisy », « charle de gaule »,
      « volkano lounge » — et « tilly » ne fait PAS proposer Beauvais.
   4. Deux recherches rapides : la réponse lente de la première n'écrase
      pas la seconde.
   5. La langue suit le client (Photon en anglais pour un anglophone).
   6. LE BIAIS SUIT LE CONTEXTE : une fois le départ choisi, l'arrivée se
      cherche autour de lui — sans rien exclure.
   7. Clavier et ARIA : ↓, Entrée, Échap, aria-activedescendant.
   8. Téléphone 320 × 568 : la liste s'ouvre sans déborder.
   9. L'ADMIN CHOISIT SES LIEUX : « ibis » montre plusieurs Ibis, le prix
      part de celui qu'on a choisi — lu dans l'URL envoyée au calculateur
      d'itinéraire, pas dans le moteur. Un lieu pris d'office le dit.
  10. « Modifier la course » : une adresse retapée perd ses coordonnées.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-lieux.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[], ko=[];
const check=(n,c,d='')=> (c?ok:ko).push(n + (d?' — '+d:''));
const errs=[];

const P = (nom, lon, lat, extra={}) => ({ geometry:{coordinates:[lon,lat]},
  properties:Object.assign({ name:nom, osm_key:'tourism', osm_value:'hotel', city:'Paris',
    postcode:'75012', countrycode:'FR', osm_type:'N', osm_id:Math.round(lon*1e5+lat*1e3) }, extra) });

/* Les réponses du faux Photon, par mot-clé de la saisie. */
const PHOTON = [
  [/novotel/, [ P('Novotel Paris Gare de Lyon', 2.3735, 48.8443),
                P('Novotel Roissy CDG', 2.5560, 49.0090, {city:'Roissy-en-France', postcode:'95700'}) ]],
  [/volkano|lounge/, [ P('Lounge Bar Le Zinc', 2.3500, 48.8600, {osm_key:'amenity', osm_value:'bar'}),
                       P('Volcano Lounge', 2.3600, 48.8700, {osm_key:'amenity', osm_value:'bar'}) ]],
  [/ibis lent/, [ P('Ibis LENT', 2.30, 48.85) ]],
  [/ibis gare/, [ P('Ibis Gare de Lyon', 2.3740, 48.8440) ]],
  [/ibis/, [ P('Ibis Paris Bercy', 2.3860, 48.8380),
             P('Ibis Orly Aéroport', 2.3650, 48.7300, {city:'Paray-Vieille-Poste', postcode:'91550'}) ]],
  [/tilly/, [ P('Tilly', 1.7770, 48.8820, {osm_key:'place', osm_value:'village', city:'Tilly', postcode:'78790'}) ]],
  [/vendome/, [ P('Place Vendôme', 2.3292, 48.8675, {osm_key:'tourism', osm_value:'attraction', postcode:'75001'}) ]]
];
let panne = false;         // les deux services ne répondent plus
let urlsPhoton = [], urlsBan = [], urlsOsrm = [];

async function brancherFaux(p){
  p.on('pageerror', e => errs.push(e.message));
  await p.route('**/*', async r => {
    const u = r.request().url(), d = decodeURIComponent(u).toLowerCase();
    if(u.startsWith('http://127.0.0.1:8099')) return r.continue();
    if(d.includes('photon.komoot.io')){
      urlsPhoton.push(d);
      if(panne) return r.abort();
      const q = (d.match(/[?&]q=([^&]*)/) || [,''])[1];
      const trouve = PHOTON.find(([re]) => re.test(q));
      /* La première frappe « ibis lent » répond TARD : la seconde doit gagner. */
      if(/ibis lent/.test(q)) await new Promise(f => setTimeout(f, 1600));
      return r.fulfill({contentType:'application/json', body:JSON.stringify({features: trouve ? trouve[1] : []})});
    }
    if(d.includes('api-adresse.data.gouv.fr')){
      urlsBan.push(d);
      if(panne) return r.abort();
      return r.fulfill({contentType:'application/json', body:JSON.stringify({features:[]})});
    }
    if(d.includes('router.project-osrm.org')){
      urlsOsrm.push(d);
      return r.fulfill({contentType:'application/json', body:JSON.stringify({routes:[{distance:18000,duration:1500}]})});
    }
    return r.abort();
  });
}

/* UN CLIC GARDÉ : si la ligne n'existe pas, la suite le DIT et continue
   — une suite qui meurt sur un délai d'attente n'imprime pas son bilan. */
async function choisir(p, sel, texte){
  const o = p.locator(sel + ' [role=option]', {hasText:texte}).first();
  if(!(await o.count())){ check('la ligne « ' + texte + ' » est proposée dans ' + sel, false); return false; }
  await o.click(); await p.waitForTimeout(150); return true;
}
async function liste(p, champ, q, attendu){
  await p.fill(champ, '');
  await p.type(champ, q, {delay:15});
  /* On laisse passer le délai de 250 ms : avant lui, la liste affichée est
     encore celle de la saisie PRÉCÉDENTE, et la lire serait lire la réponse
     d'une autre question — piège rencontré ici même. */
  await p.waitForTimeout(350);
  const sel = champ + 'List';
  await p.waitForFunction(([s,a]) => {
    const l = document.querySelector(s);
    return l && !l.hidden && [...l.querySelectorAll('[role=option],.suggest-vide')]
      .some(o => o.textContent.includes(a));
  }, [sel, attendu], {timeout:5000}).catch(()=>{});
  await p.waitForTimeout(120);
  return (await p.locator(sel + ' [role=option], ' + sel + ' .suggest-vide').allTextContents()).map(t => t.trim());
}

// ================= LE SITE CLIENT, EN FRANÇAIS =================
let ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR' });
let p = await ctx.newPage();
await brancherFaux(p);
await p.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);

/* 1–2. LA PANNE N'EST PAS UN « RIEN TROUVÉ », ET ELLE N'EST PAS GARDÉE. */
panne = true;
let l = await liste(p, '#arrivee', 'ibis bercy', 'indisponible');
check('services muets : la liste dit « recherche indisponible », pas « aucune adresse »',
  l.some(t => /indisponible/.test(t)) && !l.some(t => /Aucune adresse/.test(t)), l.join(' | '));
panne = false;
l = await liste(p, '#arrivee', 'ibis bercy', 'Bercy');
check('le réseau revenu, LA MÊME saisie trouve ses résultats : la panne n\'a pas été gardée',
  l.some(t => /Ibis Paris Bercy/.test(t)), l.join(' | '));
l = await liste(p, '#arrivee', 'zzqx', 'Aucune');
check('un vrai « rien trouvé » dit toujours « Aucune adresse trouvée »',
  l.some(t => /Aucune adresse/.test(t)), l.join(' | '));

/* 3. LES FAUTES DE FRAPPE. */
l = await liste(p, '#arrivee', 'novotel roisy', 'Novotel');
const iRoissy = l.findIndex(t => /Novotel Roissy/.test(t)), iLyon = l.findIndex(t => /Gare de Lyon/.test(t));
check('« novotel roisy » : le Novotel de Roissy passe devant celui de la gare de Lyon',
  iRoissy > -1 && iLyon > -1 && iRoissy < iLyon, l.join(' | '));
check('…et « roisy » propose quand même les terminaux de CDG',
  l.some(t => /Terminal 2E/.test(t)), l.join(' | '));
/* On cherche un HÔTEL : il passe devant les neuf terminaux, qui restent
   proposés juste après. */
check('…mais le Novotel de Roissy passe DEVANT les terminaux : on cherche un hôtel',
  /Novotel Roissy/.test(l[0] || '') && l.findIndex(t => /Terminal/.test(t)) > 0, l.join(' | '));
l = await liste(p, '#arrivee', 'roissy', 'Terminal');
check('« roissy » seul : les terminaux restent en tête', /Terminal 1 — /.test(l[0] || ''), l.join(' | '));
l = await liste(p, '#arrivee', 'charle de gaule', 'Terminal');
check('« charle de gaule » : les terminaux de Roissy sont proposés',
  l.some(t => /Terminal 2E — Aéroport Roissy/.test(t)), l.join(' | '));
l = await liste(p, '#arrivee', 'volkano lounge', 'Lounge');
check('« volkano lounge » : le Volcano Lounge passe devant un bar qui n\'a que « lounge »',
  /Volcano Lounge/.test(l[0] || ''), l.join(' | '));
l = await liste(p, '#arrivee', 'tilly', 'Tilly');
check('« tilly » (Yvelines) ne fait PAS proposer Beauvais-Tillé : la tolérance a une limite',
  !l.some(t => /Beauvais/.test(t)), l.join(' | '));

/* 4. DEUX RECHERCHES RAPIDES : la plus ancienne répond en dernier. */
await p.fill('#arrivee', '');
await p.type('#arrivee', 'ibis lent', {delay:10});
await p.waitForTimeout(450);                   // la première est partie
await p.fill('#arrivee', 'ibis gare');
await p.waitForTimeout(2300);                  // la lente a fini de répondre
l = (await p.locator('#arriveeList [role=option]').allTextContents()).map(t => t.trim());
check('la réponse lente d\'une saisie dépassée n\'écrase pas la plus récente',
  l.some(t => /Ibis Gare de Lyon/.test(t)) && !l.some(t => /LENT/.test(t)), l.join(' | '));

/* 5–6. LANGUE ET BIAIS. */
const derniere = arr => arr[arr.length - 1] || '';
check('en français, Photon est interrogé en français', /lang=fr/.test(derniere(urlsPhoton)), derniere(urlsPhoton));
check('sans départ choisi, la recherche est orientée vers Paris',
  /lat=48\.8566&lon=2\.3522/.test(derniere(urlsPhoton)) && /lat=48\.8566&lon=2\.3522/.test(derniere(urlsBan)),
  derniere(urlsPhoton));

/* 7. LE CLAVIER, sur le départ : « orly » → ↓ → Entrée. */
await p.fill('#depart', '');
await p.type('#depart', 'orly', {delay:15});
await p.waitForSelector('#departList [role=option]', {timeout:5000}).catch(()=>{});
await p.waitForTimeout(150);
check('la liste ouverte se déclare : aria-expanded = true',
  await p.getAttribute('#depart', 'aria-expanded') === 'true');
await p.keyboard.press('ArrowDown');
const actif = await p.getAttribute('#depart', 'aria-activedescendant');
check('↓ désigne une ligne : aria-activedescendant pointe une option sélectionnée',
  !!actif && await p.evaluate(id => document.getElementById(id)?.getAttribute('aria-selected') === 'true', actif), String(actif));
await p.keyboard.press('Enter');
await p.waitForTimeout(150);
const dep = await p.inputValue('#depart');
check('Entrée choisit la ligne : le champ porte le terminal d\'Orly', /^Orly 1 — Aéroport de Paris-Orly/.test(dep), dep);
check('…et la liste se referme (aria-expanded = false)', await p.getAttribute('#depart', 'aria-expanded') === 'false');

/* 6. LE BIAIS SUIT LE DÉPART CHOISI : l'arrivée se cherche autour d'Orly. */
await liste(p, '#arrivee', 'ibis', 'Ibis');
check('le départ choisi oriente la recherche de l\'arrivée (Photon et BAN, autour d\'Orly)',
  /lat=48\.7233&lon=2\.3794/.test(derniere(urlsPhoton)) && /lat=48\.7233&lon=2\.3794/.test(derniere(urlsBan)),
  derniere(urlsPhoton));
l = (await p.locator('#arriveeList [role=option]').allTextContents()).map(t => t.trim());
check('…sans rien exclure : l\'Ibis de Bercy reste proposé', l.some(t => /Bercy/.test(t)), l.join(' | '));
await p.keyboard.press('Escape');
check('Échap referme la liste', await p.locator('#arriveeList').isHidden());
await ctx.close();

// ================= EN ANGLAIS =================
ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'en-GB' });
p = await ctx.newPage();
await brancherFaux(p);
await p.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await liste(p, '#arrivee', 'vendome', 'Vend');
check('un client anglophone interroge Photon en anglais', /lang=en/.test(derniere(urlsPhoton)), derniere(urlsPhoton));
l = await liste(p, '#arrivee', 'zzqx', 'No address');
check('…et lit « No address found » dans sa langue', l.some(t => /No address found/.test(t)), l.join(' | '));
await ctx.close();

// ================= TÉLÉPHONE 320 × 568 =================
ctx = await b.newContext({ viewport:{width:320,height:568}, deviceScaleFactor:2, locale:'fr-FR', hasTouch:true, isMobile:true });
p = await ctx.newPage();
await brancherFaux(p);
await p.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await liste(p, '#depart', 'ibis', 'Ibis');
const mes = await p.evaluate(() => {
  const l = document.getElementById('departList'), r = l.getBoundingClientRect();
  return { visible:!l.hidden && r.height > 40, gauche:r.left, droite:r.right,
           page:document.documentElement.scrollWidth, fenetre:innerWidth };
});
check('à 320 px, la liste s\'ouvre dans l\'écran, sans débordement horizontal',
  mes.visible && mes.gauche >= 0 && mes.droite <= mes.fenetre && mes.page <= mes.fenetre, JSON.stringify(mes));
const ligneBercy = p.locator('#departList [role=option]', {hasText:'Bercy'}).first();
if(await ligneBercy.count()){ await ligneBercy.tap(); await p.waitForTimeout(150); }
check('un appui du doigt choisit la ligne', /Ibis Paris Bercy/.test(await p.inputValue('#depart')));
await ctx.close();

// ================= L'ADMIN : LA SAISIE AU TÉLÉPHONE =================
ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, locale:'fr-FR' });
p = await ctx.newPage();
await brancherFaux(p);
/* Une course déposée par le site, que le SERVEUR a signalée : prix sous le
   minimum de la ligne droite. Posée une seule fois (pas à chaque chargement). */
await p.goto('http://127.0.0.1:8099/index.html', {waitUntil:'domcontentloaded'});
await p.evaluate(() => localStorage.setItem('ela_bookings', JSON.stringify([{
  ref:'ELA-26-10-SUSP1', statut:'attente', cree:new Date().toISOString(),
  course:{ depart:'Place Vendôme, 75001 Paris', arrivee:'Terminal 2E — Aéroport Roissy-Charles de Gaulle',
           departPublic:'Place Vendôme, 75001 Paris', arriveePublic:'Terminal 2E — Aéroport Roissy-Charles de Gaulle',
           date:'2026-10-25', heure:'10:00', vehicule:'Berline', vehiculeCle:'berline', passagers:'1 passager' },
  client:{ nom:'Test', telephone:'06 12 34 56 78' }, prix:{ total:5, ht:4.55, tva:0.45 },
  securite:{ prixSousLigneDroite:{ minimum:60, ligneDroiteKm:23.2 } } }])));
await p.goto('http://127.0.0.1:8099/index.html?exploitant=1', {waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.fill('#codeExploitant', '12345678');
await p.locator('#btnDeverrouiller').click(); await p.waitForTimeout(400);
const carteSusp = p.locator('#listeBord .demande', {hasText:'ELA-26-10-SUSP1'}).first();
if(await carteSusp.count()){ await carteSusp.click(); await p.waitForTimeout(300); }
const susp = p.locator('#bbPrixSuspect');
check('le bon d\'une course signalée par le serveur dit « Prix à vérifier », avec le minimum',
  await susp.isVisible() && /Prix à vérifier/.test(await susp.textContent()) && /60,00/.test(await susp.textContent())
  && /23,2 km/.test(await susp.textContent()), await susp.textContent().catch(()=>''));
await p.locator('#btnRetourBord').click(); await p.waitForTimeout(250);
await p.locator('#btnSaisirCourse').click(); await p.waitForTimeout(350);
l = await liste(p, '#crDepart', 'ibis', 'Ibis');
check('« ibis » dans l\'admin montre PLUSIEURS Ibis à choisir, plus le premier d\'office',
  l.filter(t => /Ibis/.test(t)).length >= 2, l.join(' | '));
check('le champ de l\'admin est un vrai combobox (ARIA)',
  await p.getAttribute('#crDepart', 'role') === 'combobox'
  && await p.getAttribute('#crDepart', 'aria-expanded') === 'true');
const adminOk = await choisir(p, '#crDepartList', 'Ibis Orly');
if(adminOk){
await liste(p, '#crArrivee', 'vendome', 'Vend');
await choisir(p, '#crArriveeList', 'Vendôme');
await p.fill('#crDate', '2026-10-20'); await p.fill('#crHeure', '12:00');
urlsOsrm = [];
await p.locator('#btnCalculerPrix').click(); await p.waitForTimeout(1500);
const calc = await p.locator('#crCalcul').textContent();
check('le prix part de l\'Ibis CHOISI (Orly), lu dans l\'URL du calculateur d\'itinéraire',
  /2\.365,48\.73;2\.3292,48\.8675/.test(derniere(urlsOsrm)), derniere(urlsOsrm));
check('un lieu choisi ne porte pas l\'avertissement « pris d\'office »', !/prise d'office/.test(calc), calc);
check('le prix est calculé (18 km en berline)', (await p.inputValue('#crPrix')) === '50', await p.inputValue('#crPrix'));

/* Un texte tapé sans choisir : le premier trouvé, comme avant, MAIS dit. */
await p.fill('#crDepart', 'ibis');
await p.keyboard.press('Escape');
await p.locator('#btnCalculerPrix').click(); await p.waitForTimeout(1500);
const calc2 = await p.locator('#crCalcul').textContent();
check('une adresse non choisie est prise d\'office ET l\'écran le dit', /prise d'office/.test(calc2), calc2);
check('…et le champ porte le lieu retenu, pour qu\'on le voie', /Ibis Paris Bercy/.test(await p.inputValue('#crDepart')),
  await p.inputValue('#crDepart'));

/* On revient à l'Ibis d'Orly et on crée la course. */
await liste(p, '#crDepart', 'ibis', 'Ibis');
await choisir(p, '#crDepartList', 'Ibis Orly');
await p.locator('#btnCalculerPrix').click(); await p.waitForTimeout(1500);
await p.fill('#crNom', 'Hôtel Ibis Orly'); await p.fill('#crTel', '06 11 22 33 44');
await p.locator('#btnCreerCourse').click(); await p.waitForTimeout(600);
const cree = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')[0]);
const lieu = cree && cree.course && cree.course.departLieu;
check('la course créée garde le lieu structuré CHOISI (coordonnées de l\'Ibis d\'Orly)',
  !!lieu && lieu.latitude === 48.73 && lieu.longitude === 2.365 && lieu.provider === 'photon'
  && /Ibis Orly/.test(lieu.adresse), JSON.stringify(lieu));
check('…avec la distance mesurée et sa source, plus « 0 km estimés »',
  cree.course.distanceKm === 18 && cree.course.estimee === false && cree.course.itineraireSource === 'osrm',
  JSON.stringify({ km:cree.course.distanceKm, e:cree.course.estimee, s:cree.course.itineraireSource }));

/* 10. MODIFIER LA COURSE : une adresse retapée perd ses coordonnées. */
check('le bon de la course créée est ouvert', await p.locator('#ecran-bord-bon').isVisible());
await p.locator('#btnModifierCourse').click(); await p.waitForTimeout(250);
await p.fill('#mdDepart', 'Ibis Paris Bercy, 75012 Paris');
await p.locator('#btnMdEnregistrer').click(); await p.waitForTimeout(500);
const modif = await p.evaluate(() => JSON.parse(localStorage.getItem('ela_bookings') || '[]')
  .filter(c => c.course && /Bercy/.test(c.course.departPublic || ''))[0]);
check('un départ retapé dans « Modifier » efface les coordonnées de l\'ancien lieu',
  !!modif && !modif.course.departLieu, JSON.stringify(modif && modif.course.departLieu));
check('…mais l\'arrivée, inchangée, garde les siennes',
  !!modif && !!modif.course.arriveeLieu && /Vendôme/.test(modif.course.arriveeLieu.adresse),
  JSON.stringify(modif && modif.course.arriveeLieu));
}
await ctx.close();

check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x => console.log('  ✔ ' + x));
if(ko.length){ console.log('=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); process.exit(1); }
