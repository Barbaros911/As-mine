/* =====================================================================
   TEST-NOUVEAU-LANGUES.MJS — français et anglais
   ---------------------------------------------------------------------
   Deux langues, et deux seulement. Ce que la suite verrouille :

   — LE REPLI EST L'ANGLAIS, pas le français. Un visiteur allemand,
     italien ou japonais qui atterrit à Roissy lit bien plus probablement
     l'anglais qu'un site en français. Un contrôle ouvre la page avec un
     navigateur allemand et exige de l'anglais.
   — LE CHOIX EXPLICITE l'emporte et survit au rechargement.
   — AUCUNE CLÉ NE MANQUE : chaque texte français a son équivalent
     anglais. C'est le contrôle qui attrape l'oubli d'une traduction.
   — LES FORMATS SUIVENT LA LANGUE : « 70,00 € » en français, « 70.00 € »
     en anglais. Une virgule décimale lue comme un séparateur de milliers,
     c'est un prix cent fois trop grand.
   — LE MESSAGE À L'EXPLOITANT RESTE FRANÇAIS quoi qu'il arrive, avec sa
     virgule décimale et sa date en JJ/MM/AAAA : Barbaros lit du français,
     et son lecteur de demandes attend ce format.
   — LA BARRE DU BAS porte ses libellés à côté d'une icône : c'est
     l'endroit qu'on oublie en traduisant, et celui où remplacer le texte
     de l'élément entier effacerait le dessin.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-langues.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

async function page(ctx){
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  /* OpenRouteService passe AVANT OSRM depuis qu'une clé est posée dans la
     page. Sans ce refus, la suite dépendrait du fait qu'il soit injoignable
     d'ici — et sur une machine reliée à Internet elle interrogerait le vrai
     service, avec une vraie distance, et les prix vérifiés plus bas ne
     tomberaient plus juste. On le coupe donc explicitement. */
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  // Serveur coupé : on veut le message WhatsApp de secours, qui est le seul
  // endroit où l'on peut vérifier que ce qui part à l'exploitant reste
  // français même quand le client lit l'anglais.
  await p.route('**supabase.co/**', r => r.abort());
  await p.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });
  return p;
}

// --- Un visiteur français ---
let ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
let p = await page(ctx);
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('un navigateur français ouvre en français',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');

// --- Un visiteur allemand : ni français ni anglais → anglais ---
await ctx.close();
ctx = await b.newContext({viewport:{width:390,height:844},locale:'de-DE'});
p = await page(ctx);
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('un navigateur allemand ouvre en anglais, pas en français',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Book a ride',
  await p.locator('[data-t="reserver_titre"]').textContent());

/* LE BANDEAU D'ACCUEIL BASCULE EN ENTIER — ses CINQ lignes.
   C'est la première chose que voit un client anglophone, et c'est
   exactement le genre d'endroit où une ligne oubliée survit des mois :
   « Prix ferme » et « 24 h/24 » ont été ajoutés après coup, et la
   vérification des clés manquantes ne dit rien d'un « data-t » qu'on
   aurait oublié de poser sur la balise. On lit donc ce qui est à
   l'écran. */
const bandeau = await p.evaluate(()=>[...document.querySelectorAll('.hero-texte > *')]
  .map(e=>e.textContent.trim()).join(' | '));
check('tout le bandeau d\'accueil parle anglais',
  !/[àéèêîôûç]/i.test(bandeau.replace(/Île-de-France/g,'')) && /private chauffeur/i.test(bandeau),
  bandeau);

// --- Il n'existe que deux langues ---
const boutons = await p.locator('.langues button').allTextContents();
check('deux langues et deux seulement', boutons.join('/')==='FR/EN', boutons.join('/'));

// --- Le choix explicite l'emporte et se mémorise ---
await p.locator('.langues button[data-langue="fr"]').click();
await p.waitForTimeout(200);
check('le choix explicite bascule la page',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(500);
check('et il survit au rechargement, malgré un navigateur allemand',
  (await p.locator('[data-t="reserver_titre"]').textContent())==='Réserver un trajet');

// --- Aucune clé ne manque : rien ne doit rester en français en anglais ---
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(250);
const oublis = await p.evaluate(()=>{
  const fr = window.ELA_TEXTES.fr, en = window.ELA_TEXTES.en;
  return Object.keys(fr).filter(k => !(k in en));
});
check('chaque texte français a son équivalent anglais', oublis.length===0, oublis.join(', '));

/* UN « data-t » POSÉ SUR UNE BALISE FERMANTE NE TRADUIT RIEN, ET RIEN NE LE
   SIGNALE. « </svg data-t="annulation"> » a laissé « Annulation gratuite
   jusqu'à 24h avant le trajet » en français pour tous les clients anglophones,
   sous le bouton principal de l'accueil. Le navigateur avale l'attribut sans
   un mot : ni erreur, ni clé manquante — la vérification d'au-dessus passait
   au vert. On lit donc la SOURCE, la seule où la faute est visible.
   On retire d'abord les commentaires HTML : celui qui explique cette faute-là,
   dans la page, en cite la forme exacte — sans ça le test tomberait sur sa
   propre explication. */
const source = (await (await fetch('http://127.0.0.1:8099/index.html')).text())
                 .replace(/<!--[\s\S]*?-->/g, '');
const fermantes = source.match(/<\/[a-zA-Z]+[^>]*\sdata-t=[^>]*>/g) || [];
check('aucun « data-t » sur une balise fermante', fermantes.length===0, fermantes.join(' '));

/* Et le cas réel, mesuré à l'écran plutôt que dans le code : la ligne qui
   rassure sous le bouton parle bien anglais. */
check('la ligne sous le bouton est traduite elle aussi',
  (await p.locator('p.rassure').first().innerText()).trim()
    === 'Availability confirmed by WhatsApp or SMS',
  (await p.locator('p.rassure').first().innerText()).trim());
check('et son icône n\'a pas été effacée par la traduction',
  (await p.locator('p.rassure svg').first().count())===1);

/* ELLE NE PROMET PLUS D'ANNULATION GRATUITE (septembre 2026, à sa demande :
   « le client ne paie que le chauffeur »). C'est la deuxième fois que cet
   argument est retiré de la vitrine — il était déjà parti de l'ancien site,
   et il est revenu à la refonte. D'où ce contrôle, dans les DEUX langues :
   le barème d'annulation reste dans les CGV, où il engage, mais la ligne
   sous le bouton n'en parle plus. */
for (const [langue, mot] of [['fr','nnulation'], ['en','ancellation']]) {
  await p.locator('.langues button[data-langue="'+langue+'"]').click();
  await p.waitForTimeout(250);
  const ligne = (await p.locator('p.rassure').first().innerText()).trim();
  check('en '+langue+', la ligne sous le bouton ne promet plus d\'annulation gratuite',
    !ligne.includes(mot), ligne);
}

/* LES CARTES DE SERVICES SONT PASSÉES DE TROIS À CINQ, et elles
   changeront encore : ce contrôle FIGEAIT LA LISTE (« Airport
   transfer|Hourly hire|Business travel ») et serait tombé sur une simple
   réorganisation, alors que rien n'aurait été cassé.
   Ce qui compte est qu'AUCUNE ne reste en français — le titre comme le
   sous-titre, celui-ci étant le plus facile à oublier. On lit donc le
   bloc entier et on y cherche des accents français. */
const cartesEn = await p.locator('.services').innerText();
check('aucune carte de services ne reste en français',
  !/[àéèêîôûç]/i.test(cartesEn.replace(/Île-de-France|Roissy-CDG/g,'')),
  cartesEn.replace(/\n/g,' | '));
check('et il y a bien une carte par service annoncé',
  (await p.locator('.service b').allTextContents()).length ===
  (await p.locator('.service .service-icone').count()),
  (await p.locator('.service b').allTextContents()).join(' | '));

// --- Un tunnel complet en anglais ---
await p.type('#depart','vendome',{delay:12}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
check('l\'écran des prix parle anglais',
  (await p.locator('.veh-detail').first().textContent()).startsWith('Up to'),
  await p.locator('.veh-detail').first().textContent());
const prixEn = await p.locator('.veh-prix').first().textContent();
check('le prix suit le format anglais', prixEn.replace(/\s/g,'')==='70.00€', prixEn);

await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(400);
// La barre du bas porte son libellé À CÔTÉ d'une icône : remplacer le texte
// de tout l'élément effacerait le dessin. Ces trois-là sont donc les plus
// faciles à oublier en traduisant.
check('la barre du bas parle anglais elle aussi',
  (await p.locator('[data-t="nav_accueil"]').textContent())==='Home'
  && (await p.locator('[data-t="nav_courses"]').textContent())==='Bookings'
  && (await p.locator('[data-t="nav_trajets"]').textContent())==='Rides',
  await p.locator('[data-t="nav_accueil"]').textContent());
/* ON NE FIGE PAS LE COMPTE. Un test qui écrivait « trois » est tombé le
   jour où WhatsApp est devenu le quatrième onglet, alors que rien n'était
   cassé — même leçon que la barre figée sur quatre colonnes. Ce qui compte
   est que CHAQUE onglet garde son dessin : un libellé traduit qui efface
   l'icône se verrait ici. */
const nOnglets = await p.locator('.onglet').count();
check('et chaque onglet garde son dessin',
  (await p.locator('.onglet svg').count())===nOnglets && nOnglets>=3,
  (await p.locator('.onglet svg').count())+' dessins pour '+nOnglets+' onglets');
check('le récapitulatif parle anglais',
  (await p.locator('[data-t="total"]').textContent())==='Total to pay');

// --- Basculer en français réécrit ce qui est déjà affiché ---
await p.locator('.langues button[data-langue="fr"]').click();
await p.waitForTimeout(300);
check('basculer réécrit le récapitulatif déjà rempli',
  (await p.locator('[data-t="total"]').textContent())==='Total à régler');
check('et le prix repasse au format français',
  (await p.locator('#recapTotal').textContent()).replace(/\s/g,'')==='70,00€',
  await p.locator('#recapTotal').textContent());

// --- Le message à l'exploitant reste français quoi qu'il arrive ---
await p.locator('.langues button[data-langue="en"]').click();
await p.waitForTimeout(200);
await p.fill('#clientNom','John Smith'); await p.fill('#clientTel','+44 7700 900000');
await p.locator('[data-paiement="carte"]').click();
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(500);
await p.locator('#btnRenvoyer').click();
await p.waitForTimeout(200);
const msg = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
check('le message à l\'exploitant reste en français', msg.includes('Départ :') && msg.includes('Véhicule :'),
  msg.split('\n')[1]);
check('et son prix garde la virgule décimale française',
  /70,00\s*€/.test(msg), (msg.match(/[\d.,]+\s*€/g)||[]).join(' '));
check('et sa date reste JJ/MM/AAAA', /Date : \d{2}\/\d{2}\/\d{4}/.test(msg),
  msg.split('\n')[3]);

await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
