/* =====================================================================
   TEST-NOUVEAU-TARIFS.MJS — la grille de prix réglable
   ---------------------------------------------------------------------
   Septembre 2026. Barbaros règle son prix au kilomètre et son montant
   minimum depuis l'espace exploitant, et LE SITE PUBLIC DOIT SUIVRE.

   LE CONTRÔLE QUI COMPTE LE PLUS est le premier : on pose une grille sur
   le faux serveur, on fait une VRAIE course côté client, et on lit le
   prix à l'écran. Vérifier que « appliquerTarifs » a été appelée ne
   prouverait rien — c'est le montant que voit le client qui engage.

   LES DEUX SUIVANTS SONT L'ENVERS, et ils comptent autant : serveur muet
   et grille absurde doivent rendre la grille écrite dans la page, sans
   que le client s'aperçoive de quoi que ce soit. Un site qui n'affiche
   plus de prix parce qu'un serveur ne répond pas ne vend rien.

   Les valeurs attendues sont RECALCULÉES À LA MAIN depuis la grille,
   jamais recopiées de ce que la page affiche : un test qui prend la
   sortie pour référence ne vérifie plus rien.
     24,3 km — la distance rendue par le faux OSRM.
     berline 2,35 → 57,105 → reste 7,105 > 5 → 60 €   (grille de la page)
     van     4,08 → 99,144 → reste 9,144 > 5 → 100 €
     berline 3,00 → 72,90  → reste 2,90 ≤ 5 → 70 €    (grille du serveur)
     van     5,00 → 121,50 → reste 1,50 ≤ 5 → 120 €

   Lancer :  npx http-server . -s -p 8099
             node test-nouveau-tarifs.mjs
   ===================================================================== */
import { chromium } from 'playwright';

const b = await chromium.launch();
const ok=[], ko=[];
const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));

/* Un tunnel de réservation complet, avec la grille qu'on veut sur le faux
   serveur. « reglages » est la seule table que le site lit sans session. */
async function coursePour(reponseReglages){
  const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}
  ]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}
  ]})}));
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.route('**/rest/v1/reglages**', reponseReglages);

  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);
  await p.type('#depart','vendome',{delay:15});
  await p.waitForTimeout(900);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:15});
  await p.waitForTimeout(900);
  await p.locator('#arriveeList [role=option]').first().click();
  await p.waitForTimeout(200);
  await p.locator('#btnVoirPrix').click();
  await p.waitForTimeout(1600);
  const prix = await p.locator('.veh-prix').allTextContents();
  await p.close();
  return prix.map(x => x.replace(/\s/g,''));
}

const grille = v => (r => r.fulfill({contentType:'application/json',
  body:JSON.stringify([{valeur:v}])}));

/* ─── 1. LA GRILLE DU SERVEUR ARRIVE JUSQU'AU CLIENT ───────────────── */
const duServeur = await coursePour(grille([
  {cle:'berline', parKm:3.00, mini:40},
  {cle:'van',     parKm:5.00, mini:60}
]));
check('la berline suit la grille du serveur', duServeur[0]==='70,00€', duServeur[0]);
check('le van aussi',                          duServeur[1]==='120,00€', duServeur[1]);

/* ─── 2. SERVEUR MUET : LA GRILLE DE LA PAGE PREND LE RELAIS ───────── */
const sansServeur = await coursePour(r => r.abort());
check('serveur muet : la berline garde le tarif de la page', sansServeur[0]==='60,00€', sansServeur[0]);
check('serveur muet : le van aussi',                          sansServeur[1]==='100,00€', sansServeur[1]);

/* ─── 3. UNE GRILLE ABSURDE EST REFUSÉE EN ENTIER ──────────────────── */
/* Pas à moitié : une grille dont une gamme seulement aurait été reprise
   serait pire qu'une grille inchangée, parce que personne ne la relit. */
const absurde = await coursePour(grille([
  {cle:'berline', parKm:3.00, mini:40},
  {cle:'van',     parKm:'beaucoup', mini:60}
]));
check('une valeur illisible fait rejeter TOUTE la grille', absurde[0]==='60,00€', absurde[0]);
check('le van reste lui aussi au tarif de la page',        absurde[1]==='100,00€', absurde[1]);

const horsBornes = await coursePour(grille([
  {cle:'berline', parKm:900, mini:40},
  {cle:'van',     parKm:5.00, mini:60}
]));
check('un tarif hors bornes fait rejeter la grille', horsBornes[0]==='60,00€', horsBornes[0]);

/* ─── 4. LE PANNEAU DE L'EXPLOITANT ────────────────────────────────── */
const e = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const errs=[]; e.on('pageerror',x=>errs.push(x.message));
await e.route('**://api.openrouteservice.org/**', r => r.abort());
await e.route('**/rest/v1/reglages**', r => r.abort());

await e.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await e.waitForTimeout(400);
check('le panneau des tarifs n\'existe pas côté client',
  await e.locator('#blocTarifs').isHidden());

await e.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
await e.waitForTimeout(400);
await e.fill('#codeExploitant','12345678');
await e.locator('#btnDeverrouiller').click();
await e.waitForTimeout(400);

/* LE PANNEAU VIT DANS L'ÉCRAN « RÉGLAGES », pas sur le tableau de bord.
   C'est sa place : le tableau de bord ne sert qu'à traiter et à créer des
   courses, un tarif se règle ailleurs. Il faut donc y aller — et c'est le
   premier jet de ce test qui l'a appris, en butant sur un champ présent
   mais invisible. */
await e.locator('#btnReglages').click();
await e.waitForTimeout(400);
check('le panneau des tarifs est dans l\'écran Réglages',
  await e.locator('#blocTarifs').isVisible());

/* LES CHAMPS SORTENT DE « GAMMES », ils ne sont pas écrits à la main :
   une troisième gamme apparaîtrait ici sans une ligne de plus. */
const attendus = await e.evaluate(()=>({
  km: document.getElementById('tarifKm-berline')?.value,
  mini: document.getElementById('tarifMini-berline')?.value,
  vanKm: document.getElementById('tarifKm-van')?.value
}));
check('les champs portent la grille en vigueur',
  attendus.km==='2.35' && attendus.mini==='30' && attendus.vanKm==='4.08',
  JSON.stringify(attendus));

/* LE COURSE-TÉMOIN EST CALCULÉ PAR LA MÊME FONCTION QUE LE SITE.
   25 km : 2,35 → 58,75 → reste 8,75 > 5 → 60 €.
           4,00 → 100,00 → reste 0 → 100 €. */
check('l\'aperçu chiffre la grille en vigueur',
  (await e.locator('#tarifsApercu').textContent()).includes('60,00'),
  await e.locator('#tarifsApercu').textContent());

await e.fill('#tarifKm-berline','4.00');
await e.waitForTimeout(200);
check('l\'aperçu suit la saisie',
  (await e.locator('#tarifsApercu').textContent()).includes('100,00'),
  await e.locator('#tarifsApercu').textContent());

/* « 2,35 » et « 23,5 » se ressemblent, et la seconde forme multiplie par
   dix le prix de toutes les courses du site. */
await e.fill('#tarifKm-berline','23.5');
await e.waitForTimeout(200);
check('un écart du simple au double avertit', await e.locator('#tarifsAlerte').isVisible());

await e.fill('#tarifKm-berline','2.35');
await e.waitForTimeout(200);
check('l\'avertissement se retire quand on revient à la normale',
  await e.locator('#tarifsAlerte').isHidden());

await e.fill('#tarifKm-berline','0');
await e.waitForTimeout(200);
check('un tarif à zéro interdit l\'enregistrement',
  await e.locator('#btnTarifs').isDisabled());

await e.fill('#tarifKm-berline','2.35');
await e.waitForTimeout(200);
check('le bouton revient dès que la grille est valable',
  await e.locator('#btnTarifs').isEnabled());

/* SANS SESSION, RIEN NE PART, et on le DIT. Enregistrer dans le seul
   téléphone donnerait à Barbaros un prix que ses clients ne voient pas. */
await e.locator('#btnTarifs').click();
await e.waitForTimeout(400);
const etat = await e.locator('#tarifsEtat').textContent();
check('sans serveur, l\'écran dit pourquoi rien n\'a changé',
  /connect/i.test(etat), etat);

check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));
await e.close();
await b.close();

console.log('=== RÉUSSIS (' + ok.length + ') ===');
ok.forEach(x=>console.log('  ✔ ' + x));
if(ko.length){ console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x=>console.log('  ✘ ' + x)); }
process.exit(ko.length ? 1 : 0);
