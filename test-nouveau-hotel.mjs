/* =====================================================================
   TEST-NOUVEAU-HOTEL.MJS — le mode hôtel partenaire (« ?hotel= »)
   ---------------------------------------------------------------------
   CE QUE CETTE SUITE PROTÈGE, ET POURQUOI CHACUN COÛTERAIT CHER :

   1. LE FORFAIT NE DOIT PAS FUIR SUR LE SITE PUBLIC. La grille d'un
      partenaire est négociée et, sur les longues courses en van, elle est
      VOLONTAIREMENT sous le tarif public — c'est un prix d'appel, il l'a
      tranché. Le jour où elle s'appliquerait à un client ordinaire, on
      perdrait de l'argent sur chaque course sans que rien ne le signale :
      le prix s'affiche, il est simplement plus bas. D'où les contrôles qui
      éprouvent le site SANS le paramètre, et avec une clé inconnue.

   2. LE FORFAIT PASSE PAR « prix() », ET NULLE PART AILLEURS. C'est la
      décision de ce mode : un second calcul dans son coin serait la
      deuxième grille de prix du projet, et deux calculs qui divergent ne
      se voient pas — on le découvre le jour où un client compare, sur un
      montant ferme donc opposable.

   3. LES MONTANTS NE SONT PAS RECOPIÉS ICI. La suite lit la table
      « HOTELS » DANS la page et compare ce qui s'affiche à ce qu'elle
      contient. Recopier les nombres déplacerait simplement la faute dans
      le test, et il faudrait les tenir à deux endroits le jour où l'hôtel
      renégocie. Ce qui est éprouvé, c'est le CHEMIN — pas les chiffres.
      Pour que le contrôle ait des dents, on éprouve DEUX destinations et
      le jour ET la nuit : un code qui rendrait toujours la même valeur
      tomberait.

   4. LE DÉPART EST L'ADRESSE POSTALE COMPLÈTE. Plusieurs easyHotel
      entourent Roissy : un nom de marque seul envoie le chauffeur au
      mauvais, à 5 h du matin, avec un vol à prendre.

   Les services extérieurs sont injoignables depuis la machine de
   développement ; OpenRouteService est coupé explicitement, sinon la
   suite dépendrait de son injoignabilité.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-hotel.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8099/index.html';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

await ctx.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}
]})}));
await ctx.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
  {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}
]})}));
await ctx.route('**://api.openrouteservice.org/**', r => r.abort());
await ctx.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
  body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
await ctx.route('**supabase.co/**', r => r.abort());
await ctx.addInitScript(() => {
  window.__liens = [];
  window.open = (url) => { window.__liens.push(url); return null; };
});

/* LA TABLE EST LUE DANS LA SOURCE, pas recopiée. C'est la référence des
   montants attendus : si l'hôtel renégocie, la suite suit toute seule —
   ce qu'elle éprouve est que le forfait ARRIVE À L'ÉCRAN, pas sa valeur. */
const source = await (await fetch(BASE)).text();
const CLE = 'easyhotel-aeroville';
function tableHotel(){
  const i = source.indexOf('var HOTELS = {');
  const j = source.indexOf('\n  };', i);
  const bloc = source.slice(i, j);
  const lire = (gamme, moment) => {
    const m = new RegExp(gamme + ':\\s*\\{[\\s\\S]*?' + moment + ':\\{([^}]*)\\}').exec(bloc);
    const o = {};
    if(!m) return o;
    m[1].split(',').forEach(c => {
      const [k,v] = c.split(':');
      if(k && v) o[k.trim()] = Number(v.trim());
    });
    return o;
  };
  return { berline:{ jour:lire('berline','jour'), nuit:lire('berline','nuit') },
           van:    { jour:lire('van','jour'),     nuit:lire('van','nuit') } };
}
const TARIFS = tableHotel();
check('la table des forfaits se lit dans la page',
  TARIFS.berline.jour.cdg > 0 && TARIFS.van.nuit.beauvais > 0,
  JSON.stringify(TARIFS.berline.jour));

const euros = n => n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}).replace(/\s/g,'')+'€';
const lus = async () => p.evaluate(() => [...document.querySelectorAll('.veh-carte')].map(c => ({
  cle: c.dataset.cle,
  prix: (c.querySelector('.veh-prix')?.textContent||'').replace(/\s/g,'')
})));

/* Une date de semaine : le week-end entier est majoré, et un samedi ferait
   lire la colonne « nuit » sur un contrôle qui dit « jour ». */
const jourOuvre = () => {
  const x = new Date(Date.now()+3*864e5);
  while (x.getDay()===0 || x.getDay()===6) x.setDate(x.getDate()+1);
  const q = n => String(n).padStart(2,'0');
  return `${x.getFullYear()}-${q(x.getMonth()+1)}-${q(x.getDate())}`;
};
const DATE = jourOuvre();

/* ───────────────────────── LE MODE S'OUVRE ───────────────────────── */
await p.goto(BASE + '?hotel=' + CLE, {waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);

check('le mode hôtel s\'ouvre sur la clé du partenaire',
  await p.evaluate(()=>document.body.classList.contains('hotel')));

/* PAS D'INDEXATION. Une adresse trouvée dans Google et n'importe qui
   réserve au tarif négocié du partenaire. Ce n'est pas un secret, c'est
   une porte qu'on ne met pas dans un moteur de recherche. */
check('la page partenaire n\'est pas indexable',
  (await p.getAttribute('meta[name="robots"]','content')).includes('noindex'),
  await p.getAttribute('meta[name="robots"]','content'));

/* LE DÉPART EST L'ADRESSE COMPLÈTE, pas le nom de la marque : plusieurs
   easyHotel entourent Roissy. Le libellé de l'écran est le sien, l'adresse
   est celle du chauffeur — on a besoin des deux. */
const depart = await p.inputValue('#depart');
check('le départ porte le nom que la réception emploie',
  depart.toLowerCase().includes('easyhotel aéroville'), depart);
check('et l\'adresse postale complète, pour le chauffeur',
  /10 rue de la Belle Borne/i.test(depart) && /93410/.test(depart), depart);
check('le départ ne se modifie pas',
  await p.evaluate(()=>document.getElementById('depart').readOnly));
check('« me localiser » disparaît — on sait où l\'on est',
  await p.locator('#btnGeoloc').isHidden());

/* L'ARRIVÉE EST UN MENU FERMÉ. Une réception ne cherche pas une adresse
   entre deux clients : elle choisit dans une liste. */
check('l\'arrivée devient un menu', await p.locator('#hotelDest').count()===1);
check('et la recherche libre d\'adresse est fermée',
  !(await p.locator('#arrivee').isVisible()));
const dests = await p.locator('#hotelDest option').count();
check('le menu porte les destinations du partenaire, plus l\'invite',
  dests >= 4, dests+' entrées');

/* LA PROVENANCE, comme pour l'affiche QR : sans elle, le partenariat amène
   des clients et personne ne sait ce qu'il rapporte. */
check('la provenance est retenue dès l\'ouverture',
  (await p.evaluate(()=>sessionStorage.getItem('ela_provenance'))||'').includes('easyHotel'),
  await p.evaluate(()=>sessionStorage.getItem('ela_provenance')));

/* CE QUI DIT À LA RÉCEPTION QU'ELLE EST AU BON ENDROIT. Sans cette ligne,
   rien ne distingue la page partenaire du site public, et la seule façon
   de s'en assurer serait de comparer un prix qu'elle n'a pas sous les yeux. */
check('la page se nomme comme la page du partenaire',
  (await p.locator('#hotelTag').textContent()).includes('easyHotel Aéroville'),
  await p.locator('#hotelTag').textContent());

/* ───────────────── LE FORFAIT ARRIVE À L'ÉCRAN ───────────────── */
async function prixAffiches(destination, heure){
  await p.selectOption('#hotelDest', destination);
  await p.waitForTimeout(250);
  if(await p.locator('#blocChambre').isVisible()) await p.fill('#chambre','214');
  await p.fill('#date', DATE);
  await p.fill('#heure', heure);
  await p.waitForTimeout(250);
  await p.locator('#btnVoirPrix').click();
  await p.waitForSelector('.veh-carte', {timeout:15000});
  await p.waitForTimeout(500);
  const v = await lus();
  await p.locator('#btnRetourAccueil').click();
  await p.waitForTimeout(250);
  return v;
}

const cdgJour = await prixAffiches('cdg','10:00');
check('le forfait de jour sort du tableau, en berline',
  (cdgJour.find(v=>v.cle==='berline')||{}).prix === euros(TARIFS.berline.jour.cdg),
  JSON.stringify(cdgJour));
check('et en van',
  (cdgJour.find(v=>v.cle==='van')||{}).prix === euros(TARIFS.van.jour.cdg));

/* LA NUIT A SA PROPRE COLONNE, ce n'est pas une majoration appliquée au
   forfait : ce sont des montants négociés, pas un calcul à corriger. Les
   remajorer ferait payer autre chose que ce qui a été convenu. */
const cdgNuit = await prixAffiches('cdg','22:00');
check('la nuit prend la colonne « nuit » du tableau',
  (cdgNuit.find(v=>v.cle==='berline')||{}).prix === euros(TARIFS.berline.nuit.cdg)
  && (cdgNuit.find(v=>v.cle==='van')||{}).prix === euros(TARIFS.van.nuit.cdg),
  JSON.stringify(cdgNuit));
check('et la nuit n\'est pas le jour — sinon le contrôle serait aveugle',
  TARIFS.berline.nuit.cdg !== TARIFS.berline.jour.cdg
  && (cdgNuit.find(v=>v.cle==='berline')||{}).prix !== (cdgJour.find(v=>v.cle==='berline')||{}).prix);

/* ═══ LA NUIT DE L'HÔTEL N'EST PAS CELLE DU SITE ═══
   Le site majore de 21 h à 6 h ET TOUT LE WEEK-END ; la grille remise à la
   réception ne porte que deux colonnes définies par l'HEURE. Un samedi à
   midi doit donc se facturer au tarif de JOUR : lire la colonne « nuit »
   ferait payer autre chose que le papier qu'ils ont sous les yeux, sur un
   prix ferme donc opposable.
   C'est le contrôle le plus discret de la suite, et celui qui se casserait
   sans bruit — les deux colonnes ne diffèrent que de cinq euros. */
const samedi = (()=>{
  const x = new Date(Date.now()+2*864e5);
  while (x.getDay()!==6) x.setDate(x.getDate()+1);
  const q = n => String(n).padStart(2,'0');
  return `${x.getFullYear()}-${q(x.getMonth()+1)}-${q(x.getDate())}`;
})();
await p.selectOption('#hotelDest','cdg');
await p.waitForTimeout(200);
await p.fill('#date', samedi);
await p.fill('#heure','12:00');
await p.waitForTimeout(250);
await p.locator('#btnVoirPrix').click();
await p.waitForSelector('.veh-carte',{timeout:15000});
await p.waitForTimeout(500);
const weekEnd = await lus();
await p.locator('#btnRetourAccueil').click();
await p.waitForTimeout(250);
check('un samedi à midi reste au tarif de JOUR de l\'hôtel',
  (weekEnd.find(v=>v.cle==='berline')||{}).prix === euros(TARIFS.berline.jour.cdg),
  JSON.stringify(weekEnd));

/* UNE SECONDE DESTINATION, pour la même raison : un code qui rendrait
   toujours le même montant passerait sur une seule. */
const beauvaisJour = await prixAffiches('beauvais','10:00');
check('chaque destination a son forfait',
  (beauvaisJour.find(v=>v.cle==='berline')||{}).prix === euros(TARIFS.berline.jour.beauvais)
  && (beauvaisJour.find(v=>v.cle==='van')||{}).prix === euros(TARIFS.van.jour.beauvais),
  JSON.stringify(beauvaisJour));
check('et ce n\'est pas le forfait de la précédente',
  (beauvaisJour.find(v=>v.cle==='berline')||{}).prix !== (cdgJour.find(v=>v.cle==='berline')||{}).prix);

/* LA DISTANCE N'ENTRE PLUS DANS LE PRIX, et c'est le vrai piège : le faux
   routeur rend 24,3 km pour TOUTES les destinations. Si le forfait ne
   passait pas, les deux destinations afficheraient exactement le même
   montant — celui du kilométrage. Le contrôle du dessus le dirait ; celui-ci
   le dit autrement, en éprouvant que le prix n'est PAS celui de la grille
   kilométrique. */
check('le prix n\'est pas celui du kilométrage',
  (cdgJour.find(v=>v.cle==='berline')||{}).prix !== '60,00€',
  (cdgJour.find(v=>v.cle==='berline')||{}).prix);

/* REVENIR SUR L'INVITE REPREND TOUT. Laisser la destination précédente en
   place ferait réserver vers un endroit qui n'est plus affiché nulle part. */
await p.selectOption('#hotelDest','');
await p.waitForTimeout(250);
await p.locator('#btnVoirPrix').click();
await p.waitForTimeout(400);
check('sans destination choisie, on ne va nulle part',
  await p.locator('#ecran-accueil').isVisible());

/* ─────────── LE RESTE DU SITE EST CELUI DE TOUT LE MONDE ─────────── */
/* LE PRÉAVIS DE 15 MINUTES N'A PAS DE PORTE DÉROBÉE. Un mode qui refait
   les règles à sa façon les referait mal : il faut toujours trouver un
   chauffeur et qu'il roule jusqu'à l'hôtel. */
await p.selectOption('#hotelDest','cdg');
await p.waitForTimeout(200);
const maintenant = await p.evaluate(()=>{
  const x = new Date(); const q = n => String(n).padStart(2,'0');
  return { d:`${x.getFullYear()}-${q(x.getMonth()+1)}-${q(x.getDate())}`,
           h:`${q(x.getHours())}:${q(x.getMinutes())}` };
});
await p.fill('#date', maintenant.d);
await p.fill('#heure', maintenant.h);
await p.waitForTimeout(350);
check('le préavis de 15 minutes s\'applique aussi au comptoir',
  !(await p.isEnabled('#btnVoirPrix')) || await p.locator('#tropTot').isVisible()
  || await p.locator('#heurePassee').isVisible());

/* LA COURSE PART COMME UNE AUTRE — même récapitulatif, même mode de
   règlement, même message. Et elle emporte la provenance : c'est elle qui
   dira ce que le partenariat rapporte. */
await p.fill('#date', DATE);
await p.fill('#heure','10:00');
await p.waitForTimeout(250);
await p.locator('#btnVoirPrix').click();
await p.waitForSelector('.veh-carte',{timeout:15000});
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click();
await p.waitForTimeout(400);
check('le récapitulatif s\'atteint depuis le comptoir',
  await p.locator('#ecran-recap').isVisible());
check('et il annonce le forfait, pas le kilométrage',
  (await p.locator('#recapTotal').textContent()).replace(/\s/g,'') === euros(TARIFS.berline.jour.cdg),
  await p.locator('#recapTotal').textContent());

await p.fill('#clientNom','Jean Martin');
await p.fill('#clientTel','06 12 34 56 78');
await p.locator('[data-paiement="carte"]').click();
await p.locator('#btnConfirmer').click();
await p.waitForTimeout(700);
check('le bon s\'affiche', await p.locator('#ecran-bon').isVisible());
const bon = await p.evaluate(()=>{
  try{ return (JSON.parse(localStorage.getItem('ela_courses'))||[])[0] || null; }catch(e){ return null; }
});
check('la course garde d\'où elle vient',
  !!bon && String(bon.provenance||'').includes('easyHotel'),
  bon ? String(bon.provenance) : 'aucune course');
check('et le prix enregistré est le forfait',
  !!bon && Number(bon.prix.total) === TARIFS.berline.jour.cdg,
  bon ? JSON.stringify(bon.prix) : '—');
check('le départ enregistré porte l\'adresse complète',
  !!bon && /10 rue de la Belle Borne/i.test(String(bon.course.depart)),
  bon ? String(bon.course && bon.course.depart) : '—');
/* LA CHAMBRE EST DANS LE DÉPART, PAS À PART, et elle ne doit PAS se
   retrouver dans la version publique : c'est celle qui peut partir à un
   chauffeur qui n'a pas encore accepté la course. */
check('le numéro de chambre est dans le départ du bon',
  !!bon && /ch\. ?214/.test(String(bon.course.depart)),
  bon ? String(bon.course && bon.course.depart) : '—');
check('mais jamais dans la version publique',
  !!bon && !/214/.test(String(bon.course.departPublic)),
  bon ? String(bon.course && bon.course.departPublic) : '—');

/* ══════════ LE CONTRÔLE QUI COMPTE LE PLUS : AUCUNE FUITE ══════════
   La grille est sous le tarif public sur les longues courses en van. Le
   jour où elle s'appliquerait à un client ordinaire, on perdrait de
   l'argent sur chaque course SANS QUE RIEN NE LE SIGNALE — le prix
   s'affiche, il est simplement plus bas. On éprouve donc le site sans le
   paramètre, et avec une clé inconnue. */
const q = await ctx.newPage();
q.on('pageerror', e=>errs.push(e.message));
for (const [nom, adresse] of [['sans le paramètre', BASE],
                              ['avec une clé inconnue', BASE + '?hotel=pas-un-partenaire']]) {
  await q.goto(adresse, {waitUntil:'domcontentloaded'});
  await q.waitForTimeout(500);
  check('le site reste le site public ' + nom,
    !(await q.evaluate(()=>document.body.classList.contains('hotel')))
    && await q.locator('#hotelDest').count()===0
    && await q.locator('#hotelTag').count()===0);
  check('il reste indexable ' + nom,
    !(await q.getAttribute('meta[name="robots"]','content')).includes('noindex'),
    await q.getAttribute('meta[name="robots"]','content'));
}
/* Et le prix y reste le kilométrage : 24,3 km en berline à 2,35 €/km font
   57,105 € — arrondi à la dizaine, 60 €. Le nombre est recalculé à la main
   depuis la grille lue dans la page, jamais recopié de ce que la page
   affiche : un test qui prend la sortie pour référence ne vérifie rien. */
const grille = (()=>{
  const m = /\{\s*cle:"berline"[^}]*parKm:([\d.]+)[^}]*mini:(\d+)/.exec(source);
  return { parKm:Number(m[1]), mini:Number(m[2]) };
})();
const attendu = (()=>{
  const brut = grille.parKm * 24.3;
  const bas = Math.floor(brut/10)*10;
  return Math.max((brut-bas>5)?bas+10:bas, grille.mini);
})();
await q.type('#depart','vendome',{delay:12}); await q.waitForTimeout(850);
await q.locator('#departList [role=option]').first().click();
await q.type('#arrivee','argenteuil',{delay:12}); await q.waitForTimeout(850);
await q.locator('#arriveeList [role=option]').first().click();
await q.fill('#date', DATE); await q.fill('#heure','10:00');
await q.locator('#btnVoirPrix').click();
await q.waitForSelector('.veh-carte',{timeout:15000});
await q.waitForTimeout(500);
const prixPublic = (await q.evaluate(()=>{
  const c = document.querySelector('.veh-carte[data-cle="berline"]');
  return c ? c.querySelector('.veh-prix').textContent : '';
})).replace(/\s/g,'');
check('le client ordinaire paie toujours le kilométrage',
  prixPublic === euros(attendu), prixPublic + ' au lieu de ' + euros(attendu));

/* L'ESPACE EXPLOITANT NE PREND JAMAIS LE FORFAIT. Sa saisie de course
   partage volontairement « prix() » avec le client — c'est ce qui garantit
   qu'il annonce au téléphone le prix que le site donne. Si Barbaros ouvrait
   « ?exploitant=1&hotel=… » sur son propre téléphone, une course saisie
   pour n'importe qui sortirait au tarif du partenaire. */
await q.goto(BASE + '?exploitant=1&hotel=' + CLE, {waitUntil:'domcontentloaded'});
await q.waitForTimeout(500);
check('le mode hôtel ne s\'ouvre pas dans l\'espace exploitant',
  !(await q.evaluate(()=>document.body.classList.contains('hotel')))
  && await q.locator('#hotelDest').count()===0);

check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));

console.log('=== ' + ok.length + ' contrôles passés, ' + ko.length + ' échec(s)');
if(ko.length){ console.log('=== ÉCHECS'); ko.forEach(l=>console.log('  ✗ ' + l)); }
await b.close();
process.exit(ko.length ? 1 : 0);
