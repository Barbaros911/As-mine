/* =====================================================================
   TEST-NOUVEAU.MJS — la recherche d'adresse du nouveau site
   ---------------------------------------------------------------------
   Trois choses : la recherche d'adresse, le numéro de chambre demandé
   quand le départ est un hôtel, et le numéro de vol demandé quand l'un
   des deux bouts est un terminal.

   Les deux services d'adresses (Base Adresse Nationale et Photon) sont
   injoignables depuis la machine de développement : on répond à leur
   place. Ce n'est pas un pis-aller — ça éprouve AUSSI la lecture de leurs
   réponses, ce qu'un appel réel ne ferait pas de façon reproductible.
   Les terminaux d'aéroport, eux, sont écrits en dur dans la page : ils se
   testent sans le moindre réseau.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[], ko=[];
const check=(n,c,d='')=> (c?ok:ko).push(n + (d?' — '+d:''));

// Les deux services d'adresses sont injoignables depuis cette machine :
// on répond à leur place, ce qui éprouve AUSSI la lecture des réponses.
await p.route('**://photon.komoot.io/**', route => route.fulfill({
  contentType:'application/json',
  body: JSON.stringify({ features:[
    { geometry:{coordinates:[2.3841,48.8395]},
      properties:{ name:"ibis Paris Bercy Village", osm_key:"tourism", osm_value:"hotel",
                   street:"Rue Baron le Roy", housenumber:"77", postcode:"75012",
                   city:"Paris", countrycode:"FR" } },
    { geometry:{coordinates:[2.3522,48.8566]},
      properties:{ name:"Gare de Lyon", osm_key:"railway", osm_value:"station",
                   postcode:"75012", city:"Paris", countrycode:"FR" } }
  ]})
}));
await p.route('**://api-adresse.data.gouv.fr/**', route => route.fulfill({
  contentType:'application/json',
  body: JSON.stringify({ features:[
    { geometry:{coordinates:[2.3300,48.8690]},
      properties:{ label:"12 Rue de la Paix, 75002 Paris" } }
  ]})
}));

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);

const bouton = p.locator('.reserver .bouton');

// --- 1. Les terminaux d'aéroport, sans aucun réseau ---
await p.fill('#depart','');
await p.type('#depart','cdg',{delay:30});
await p.waitForTimeout(700);
const opts = await p.locator('#departList [role=option]').allTextContents();
check('taper « cdg » propose les terminaux', opts.length>0 && opts[0].includes('Terminal'), opts[0]||'(vide)');
// L'icône est un span à part : on lit le libellé seul, pas le texte concaténé.
const libelle0 = await p.locator('#departList [role=option] span:not(.ico)').first().textContent();
check('le terminal est écrit EN PREMIER dans la ligne', /^Terminal/.test(libelle0||''), libelle0);
check('le bouton s\'efface pendant qu\'une liste est ouverte',
  (await bouton.getAttribute('class')).includes('efface'));

await p.locator('#departList [role=option]', {hasText:'Terminal 2E'}).first().click();
await p.waitForTimeout(300);
check('le numéro de vol est demandé au départ d\'un terminal',
  await p.locator('#blocVol').isVisible());
check('le texte d\'aide parle du retard du vol',
  (await p.locator('#aideVol').textContent()).includes('retard'));
check('aucun numéro de chambre pour un aéroport',
  !(await p.locator('#blocChambre').isVisible()));
check('le bouton revient une fois la liste fermée',
  !(await bouton.getAttribute('class')).includes('efface'));

// --- 2. Un mot entier, jamais un début de mot ---
await p.fill('#depart','');
await p.type('#depart','rouen',{delay:20});
await p.waitForTimeout(900);
const rouen = await p.locator('#departList [role=option]').allTextContents();
check('« rouen » ne déclenche pas Roissy',
  !rouen.some(t=>t.includes('Roissy')), rouen.join(' | ').slice(0,60));

// --- 3. Un hôtel au départ demande la chambre ---
await p.fill('#depart','');
await p.type('#depart','ibis bercy',{delay:20});
await p.waitForTimeout(900);
await p.locator('#departList [role=option]').first().click();
await p.waitForTimeout(300);
check('un hôtel au départ demande le numéro de chambre',
  await p.locator('#blocChambre').isVisible());
check('le vol n\'est plus demandé', !(await p.locator('#blocVol').isVisible()));

// --- 4. La chambre se vide dès qu'on change d'adresse ---
await p.fill('#chambre','214');
await p.fill('#depart','');
await p.type('#depart','12 rue de la paix',{delay:15});
await p.waitForTimeout(900);
await p.locator('#departList [role=option]').first().click();
await p.waitForTimeout(300);
check('le champ chambre disparaît sur une adresse ordinaire',
  !(await p.locator('#blocChambre').isVisible()));
check('et il est VIDÉ — le chauffeur ne doit pas recevoir l\'ancienne chambre',
  (await p.locator('#chambre').inputValue()) === '');

// --- 5. Un terminal à l'ARRIVÉE demande aussi le vol, autre texte ---
await p.type('#arrivee','orly',{delay:25});
await p.waitForTimeout(700);
await p.locator('#arriveeList [role=option]').first().click();
await p.waitForTimeout(300);
check('un terminal à l\'arrivée demande le vol', await p.locator('#blocVol').isVisible());
check('le texte d\'aide parle du bon terminal',
  (await p.locator('#aideVol').textContent()).includes('terminal'));

// --- 6. Corriger le texte après un choix invalide la position ---
await p.fill('#arrivee','orl');
await p.waitForTimeout(600);
check('modifier le texte après un choix retire le vol',
  !(await p.locator('#blocVol').isVisible()));

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)) === 0);

/* =====================================================================
   7. LE BANDEAU D'ACCUEIL — CE QU'IL DIT ET CE QU'IL FAIT
   ---------------------------------------------------------------------
   Septembre 2026, à sa demande : « Je veux une vraie Hero ». Elle porte
   maintenant une promesse, un prix ferme, un bouton et une réassurance.
   CE QUI SE VÉRIFIE ICI N'EST PAS LA PRÉSENCE DES LIGNES — un bandeau
   peut porter les cinq et n'en montrer aucune, si le texte déborde d'une
   hauteur fixe ou si le bouton tombe sous le premier écran. On mesure
   donc : le bouton est-il visible sans descendre, mène-t-il au
   formulaire, et le sous-titre tient-il sur UNE ligne.
   ===================================================================== */
const cx7 = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const p7  = await cx7.newPage();
p7.on('pageerror', e=>errs.push(e.message));
await p7.route('**://api.openrouteservice.org/**', r=>r.abort());
await p7.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p7.waitForTimeout(500);

/* LE BOUTON EST DANS LE PREMIER ÉCRAN, ET C'EST TOUT L'INTÉRÊT DU
   BANDEAU. Un bandeau plus haut repousse le formulaire ; s'il ne rend pas
   une action en échange, il a seulement éloigné la réservation. */
const cta = await p7.locator('#btnHeroReserver').boundingBox();
check('le bouton du bandeau tient dans le premier écran',
  !!cta && cta.y + cta.height <= 844, cta ? Math.round(cta.y+cta.height)+' px' : 'absent');
check('le bouton du bandeau est assez grand pour le doigt',
  !!cta && cta.height >= 44, cta ? Math.round(cta.height)+' px' : 'absent');

/* LE SOUS-TITRE EST UNE LISTE DE DESTINATIONS : cassée en deux, elle se
   lit comme deux listes. C'est exactement ce que faisait le « max-width »
   hérité de la phrase qu'elle a remplacée. */
const lignesSous = await p7.evaluate(()=>{
  const e = document.querySelector('.hero-sous');
  return Math.round(e.getBoundingClientRect().height /
                    parseFloat(getComputedStyle(e).lineHeight));
});
check('le sous-titre du bandeau tient sur une ligne', lignesSous === 1, lignesSous+' ligne(s)');

/* LE BANDEAU N'A PLUS DE HAUTEUR FIXE : le titre est passé à trois
   lignes, et une hauteur écrite à la main aurait laissé le texte sortir
   par le bas sans le moindre signe. On vérifie que tout ce qu'il porte
   reste DEDANS. */
const dedans = await p7.evaluate(()=>{
  const h = document.querySelector('.hero').getBoundingClientRect();
  return [...document.querySelectorAll('.hero-texte > *')]
    .every(e => e.getBoundingClientRect().bottom <= h.bottom + 1);
});
check('rien ne sort du bandeau par le bas', dedans);

/* LE BOUTON MÈNE AU FORMULAIRE ET POSE LE CURSEUR DANS LE DÉPART. Sans
   ça, c'est une image de bouton : le client appuie, rien ne bouge, et il
   en conclut que le site est cassé — exactement ce qui avait fait retirer
   l'onglet « Réserver ». */
await p7.click('#btnHeroReserver');
await p7.waitForTimeout(900);
check('le bouton du bandeau pose le curseur dans le départ',
  await p7.evaluate(()=>document.activeElement && document.activeElement.id === 'depart'));
const champVisible = await p7.locator('#depart').boundingBox();
check('le champ de départ est alors à l\'écran',
  !!champVisible && champVisible.y >= 0 && champVisible.y < 844,
  champVisible ? Math.round(champVisible.y)+' px' : 'absent');

/* Il ne remplit rien et ne devine rien : une adresse posée d'office
   enverrait le chauffeur au mauvais endroit. */
check('le bouton du bandeau ne remplit aucune adresse',
  (await p7.inputValue('#depart')) === '');

/* 320 px — un iPhone SE. Le titre y casserait en quatre lignes à sa
   taille normale ; c'est là qu'un bandeau déborde. */
const cx8 = await b.newContext({ viewport:{width:320,height:568}, locale:'fr-FR' });
const p8  = await cx8.newPage();
await p8.route('**://api.openrouteservice.org/**', r=>r.abort());
await p8.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p8.waitForTimeout(400);
check('aucun débordement horizontal à 320 px',
  (await p8.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)) === 0);
const titre320 = await p8.evaluate(()=>{
  const e = document.querySelector('.hero h1');
  return Math.round(e.getBoundingClientRect().height /
                    parseFloat(getComputedStyle(e).lineHeight));
});
check('le titre reste sur trois lignes à 320 px', titre320 === 3, titre320+' ligne(s)');

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ===');
ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){ console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t)); }
if(errs.length){ console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e)); }
process.exit(ko.length||errs.length?1:0);
