/* =====================================================================
   TEST-NOUVEAU-RECEPTION.MJS — le comptoir d'un hôtel partenaire
   ---------------------------------------------------------------------
   Ce qu'il verrouille, et pourquoi chacun coûte quelque chose de réel :

   1. L'ADRESSE DU FLYER N'OUVRE JAMAIS LE COMPTOIR. C'est la moitié de la
      réponse à sa question — « personne ne verra les réservations des
      autres ? ». Le QR est scanné par les CLIENTS ; si le bouton d'accès y
      apparaissait, n'importe quel client verrait la liste de l'hôtel.

   2. LE LIEN NE SUFFIT PAS, IL FAUT LE CODE — et il est vérifié PAR LE
      SERVEUR. Un contrôle cherche qu'aucun code ne traîne dans la page :
      écrit ici, même en empreinte, il s'attaquerait hors ligne.

   3. RIEN NE S'ANNULE TOUT SEUL. Le bouton transmet et pose un drapeau ;
      il ne change jamais le statut. Une course annulée à 5 h du matin
      libère un chauffeur déjà engagé, et Barbaros seul peut le rappeler.

   4. CE QU'UNE RÉSERVATION PORTE, à sa demande : la chambre ou le nom, LE
      NUMÉRO du client, le trajet, LE PRIX et le MODE DE PAIEMENT.

   5. LE PRIX NE SE FAIT JAMAIS TRONQUER par une adresse longue — c'est le
      chiffre que la réception a annoncé au client. Le contrôle MESURE des
      rectangles plutôt que de relire le CSS.

   6. L'ORANGE DU PARTENAIRE NE FUIT PAS SUR LE SITE PUBLIC, et il ne
      descend pas dans la liste : il est à 24° de teinte du rouge de
      l'attente, et les deux côte à côte ne se distingueraient plus.

   Le serveur est simulé : la fonction « courses-hotel » n'est joignable
   d'ici sous aucune forme, et c'est très bien — ce qu'on éprouve est ce
   que la PAGE fait de ses réponses.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-reception.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, locale:'fr-FR' });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const CODE = 'easyhotel-9F3K2Q';
const jour = n => { const d=new Date(Date.now()+n*864e5); const z=x=>String(x).padStart(2,'0');
  return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); };

/* LA GÉNÉRIQUE EN PREMIER, LA SPÉCIFIQUE ENSUITE : Playwright consulte la
   DERNIÈRE route posée en premier. Posée dans l'autre sens, la générique
   avalait les appels au faux serveur et la suite mesurait une panne réseau
   en croyant mesurer un refus de code — piège rencontré, une demi-heure. */
await ctx.route('**://*/**', r => r.request().url().startsWith('http://127.0.0.1:8099')
  ? r.continue() : r.abort());

let appels = [];
const COURSES = () => ([
  { ref:'ELA-26-09-0042', statut:'confirmee', date:jour(1), heure:'06:00',
    depart:'easyHotel Aéroville, 10 rue de la Belle Borne', arrivee:'Orly 1 — Aéroport de Paris-Orly',
    vehicule:'Berline', prix:100, client:'M. Dupont', tel:'06 12 34 56 78', chambre:'214',
    paiement:'Espèces', annulationDemandee:false, chauffeur:{nom:'Mehmet', telephone:'0612345678'} },
  { ref:'ELA-26-09-0043', statut:'attente', date:jour(1), heure:'14:30',
    depart:'easyHotel Aéroville, 10 rue de la Belle Borne',
    arrivee:'Parc des Expositions de Paris-Nord Villepinte, 93420 Villepinte',
    vehicule:'Van', prix:120, client:'Famille Chen', tel:'06 98 76 54 32', chambre:'302',
    paiement:'Carte bancaire', annulationDemandee:false, chauffeur:{nom:'',telephone:''} },
  { ref:'ELA-26-09-0031', statut:'attente', date:jour(-1), heure:'07:00',
    depart:'easyHotel Aéroville, 10 rue de la Belle Borne', arrivee:'Beauvais',
    vehicule:'Van', prix:240, client:'Groupe Silva', tel:'07 11 22 33 44', chambre:'',
    paiement:'Carte bancaire', annulationDemandee:false, chauffeur:{nom:'',telephone:''} }
]);
await ctx.route('**/functions/v1/courses-hotel', r => {
  const c = JSON.parse(r.request().postData() || '{}');
  appels.push(c);
  if(c.code !== CODE)
    return r.fulfill({status:401, contentType:'application/json', body:'{"refuse":true}'});
  if(c.action === 'annulation')
    return r.fulfill({contentType:'application/json', body:JSON.stringify({ok:true, ref:c.ref})});
  return r.fulfill({contentType:'application/json',
    body:JSON.stringify({ hotel:c.hotel, courses:COURSES() })});
});

/* ---------------------------------------------------------------------
   1. LE FLYER N'OUVRE PAS LE COMPTOIR
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html?h=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
check('l\'adresse du flyer ouvre bien l\'écran hôtel',
  await p.evaluate(()=>document.body.classList.contains('hotel')));
check('MAIS elle n\'ouvre PAS le comptoir : pas de classe « reception »',
  !(await p.evaluate(()=>document.body.classList.contains('reception'))));
check('et le bouton d\'accès y est INVISIBLE — sinon un client verrait la liste',
  await p.locator('#btnReception').isHidden());
/* ═══ DEUX PROTECTIONS, DONC DEUX CONTRÔLES ═══
   Le bouton est caché par l'attribut « hidden » ET par une règle CSS. C'est
   une bonne chose pour le site — il faut que les deux cèdent pour qu'un
   client voie la liste — mais c'est un piège pour ce test : éprouvé en
   cassant l'UNE des deux, il restait au vert et n'aurait donc signalé la
   première brèche qu'une fois la seconde ouverte aussi. On regarde donc
   chaque protection SÉPARÉMENT, pour que la première qui lâche se voie. */
check('protection 1 : l\'attribut « hidden » est bien posé',
  await p.evaluate(()=>document.getElementById('btnReception').hasAttribute('hidden')));
check('protection 2 : le CSS le masque aussi hors du mode réception',
  await p.evaluate(()=>{
    const b = document.getElementById('btnReception');
    b.removeAttribute('hidden');
    const masque = getComputedStyle(b).display === 'none';
    b.setAttribute('hidden','');
    return masque;
  }));
check('les onglets du client restent sur SON téléphone',
  await p.locator('.onglet[data-onglet="courses"]').isVisible());

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);
check('sur le site public, aucune trace du comptoir',
  await p.locator('#btnReception').isHidden()
  && await p.locator('#ecran-reception').isHidden());
/* L'ORANGE NE FUIT PAS. Mesuré sur la couleur réellement calculée, pas sur
   la feuille de style : une règle trop large se voit à l'écran, pas dans
   le CSS. */
const boutonPublic = await p.evaluate(()=>getComputedStyle(document.getElementById('btnVoirPrix')).backgroundColor);
check('le bouton du site public reste vert, pas orange',
  boutonPublic.replace(/\s/g,'') === 'rgb(31,111,107)', boutonPublic);

/* ---------------------------------------------------------------------
   2. L'ADRESSE DE LA RÉCEPTION, ET LE CODE
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html?reception=easyhotel-aeroville',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
check('l\'adresse de la réception ouvre le mode hôtel ET le comptoir',
  await p.evaluate(()=>document.body.classList.contains('hotel')
                    && document.body.classList.contains('reception')));
check('elle réserve aussi : le menu des destinations est là',
  await p.locator('#hotelDest').isVisible());
check('les deux listes de l\'appareil disparaissent — la tablette est PARTAGÉE',
  await p.locator('.onglet[data-onglet="courses"]').isHidden()
  && await p.locator('.onglet[data-onglet="trajets"]').isHidden());
check('la page porte noindex : la liste des clients ne sort pas dans Google',
  await p.evaluate(()=>{const m=document.querySelectorAll('meta[name="robots"]');
                        return m.length===1 && m[0].content.includes('noindex');}));

await p.locator('#btnReception').click();
await p.waitForTimeout(400);
check('le code est demandé avant toute liste',
  await p.locator('#recVerrou').isVisible() && await p.locator('#recCorps').isHidden());

appels = [];
await p.fill('#recCode','pas-le-bon');
await p.locator('#btnRecEntrer').click();
await p.waitForTimeout(700);
check('un mauvais code n\'affiche AUCUNE course',
  await p.locator('#recCorps').isHidden() && (await p.locator('.rec-course').count()) === 0);
check('et il le dit clairement, sans confondre avec une panne',
  /code/i.test(await p.locator('#recErreur').textContent()),
  await p.locator('#recErreur').textContent());
check('le code part bien au SERVEUR : c\'est lui qui juge',
  appels.length === 1 && appels[0].code === 'pas-le-bon', JSON.stringify(appels));

/* LE CODE N'EST NULLE PART DANS LA PAGE. C'est la différence assumée avec
   le code de l'espace exploitant, qui y vit en empreinte et s'attaque donc
   hors ligne, autant d'essais qu'on veut. */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
check('aucun code de réception n\'est écrit dans la page',
  !source.includes(CODE) && !/HOTEL_[A-Z0-9_]+_CODE\s*[:=]\s*["']/.test(source));

await p.fill('#recCode', CODE);
await p.locator('#btnRecEntrer').click();
await p.waitForTimeout(800);
check('le bon code ouvre la liste', await p.locator('#recCorps').isVisible());
check('les trois courses sont là', (await p.locator('.rec-course').count()) === 3);

/* IL N'EST DEMANDÉ QU'UNE FOIS. Un comptoir qui retape un code à chaque
   client cesse d'utiliser l'outil au bout de trois jours. */
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
await p.locator('#btnReception').click();
await p.waitForTimeout(800);
check('le code n\'est PAS redemandé au rechargement',
  await p.locator('#recCorps').isVisible() && await p.locator('#recVerrou').isHidden());

/* ---------------------------------------------------------------------
   3. CE QU'UNE RÉSERVATION PORTE
   --------------------------------------------------------------------- */
const carte = p.locator('.rec-course').filter({ hasText:'ELA-26-09-0042' });
const texte = await carte.textContent();
check('la chambre et le nom du client', /Chambre 214/.test(texte) && /Dupont/.test(texte), texte);
check('LE NUMÉRO du client, et il est cliquable',
  (await carte.locator('.rec-tel a').getAttribute('href')) === 'tel:06 12 34 56 78');
check('le trajet, avec le SENS écrit', /l'hôtel\s+→\s+Orly 1/.test(texte), texte);
check('LE PRIX annoncé', /100,00/.test(await carte.locator('.rec-prix').textContent()));
check('LE MODE DE PAIEMENT', /Espèces/.test(texte));
check('le véhicule et la référence', /Berline/.test(texte) && /ELA-26-09-0042/.test(texte));
check('le chauffeur et son numéro, la course étant confirmée',
  /Mehmet/.test(texte) && (await carte.locator('.rec-chauffeur a').count()) === 1);

/* SUR UNE COURSE EN ATTENTE, PAS DE CHAUFFEUR. Un nom écrit pour mémoire
   promettrait une voiture qui n'a rien accepté. */
const attente = p.locator('.rec-course').filter({ hasText:'ELA-26-09-0043' });
check('sur une course en attente, aucun chauffeur n\'est promis',
  (await attente.locator('.rec-chauffeur').count()) === 0);

/* LE PRIX NE SE FAIT PAS TRONQUER PAR UNE ADRESSE LONGUE. On MESURE : une
   règle de mise en page se casse sans bruit. */
const mesure = await attente.evaluate(el => {
  const prix = el.querySelector('.rec-prix').getBoundingClientRect();
  const carte = el.getBoundingClientRect();
  return { largeur: Math.round(prix.width), dedans: prix.right <= carte.right + 1 };
});
check('le prix garde sa place entière malgré une adresse longue',
  mesure.largeur >= 55 && mesure.dedans, JSON.stringify(mesure));

/* ---------------------------------------------------------------------
   4. GROUPÉ PAR JOUR, ET « EN RETARD » EN PREMIER
   --------------------------------------------------------------------- */
const jours = await p.locator('.rec-jour').allTextContents();
check('« En retard » passe avant les autres jours',
  jours[0] === 'En retard', jours.join(' | '));
check('le titre « En retard » est le seul en rouge',
  await p.locator('.rec-jour.retard').count() === 1);
const chiffres = await p.locator('.rec-chiffre b').allTextContents();
check('deux courses en attente sont comptées', chiffres[1] === '2', chiffres.join('/'));
check('et ce compteur-là s\'allume, seul', await p.locator('.rec-chiffre.chaud').count() === 1);

/* ═══ L'ORANGE NE DESCEND PAS DANS LA LISTE ═══
   Il est à 24° de teinte du rouge de l'attente. S'il habillait aussi les
   pastilles d'état, « confirmée » dirait la MARQUE et non plus l'ÉTAT. */
const pastille = await p.locator('.rec-etat.confirmee').first()
  .evaluate(el => getComputedStyle(el).color);
check('« confirmée » reste verte, distincte de la marque orange',
  pastille.replace(/\s/g,'') === 'rgb(24,87,84)', pastille);
const aide = await p.locator('.rec-aide').evaluate(el => getComputedStyle(el).backgroundColor);
check('le bloc d\'aide, lui, porte bien l\'orange du partenaire',
  aide.replace(/\s/g,'') === 'rgb(255,241,232)', aide);

/* « UN IMPRÉVU ? » EST TOUJOURS VISIBLE, à sa demande — pas dans un menu. */
check('« Un imprévu ? » est à l\'écran en permanence',
  await p.locator('.rec-aide').isVisible());
check('avec le téléphone ET WhatsApp',
  (await p.locator('.rec-aide a[href^="tel:"]').count()) === 1
  && (await p.locator('#recAideWa').getAttribute('href')).includes('wa.me'));

/* ---------------------------------------------------------------------
   5. RIEN NE S'ANNULE TOUT SEUL
   --------------------------------------------------------------------- */
appels = [];
await p.context().grantPermissions([]);
/* On empêche l'ouverture réelle de WhatsApp : ce qu'on éprouve est ce que
   la page ENVOIE au serveur, pas le comportement de l'onglet. */
await p.evaluate(() => { window.__wa = []; window.open = (u) => { window.__wa.push(u); return null; }; });
await attente.locator('button', { hasText:"Demander l'annulation" }).click();
await p.waitForTimeout(700);
const envoye = appels.filter(a => a.action === 'annulation');
check('la demande part au serveur avec la bonne référence',
  envoye.length === 1 && envoye[0].ref === 'ELA-26-09-0043', JSON.stringify(envoye));
check('elle ne demande JAMAIS de changer le statut',
  envoye.length === 1 && !('statut' in envoye[0]), JSON.stringify(envoye[0]));
const wa = await p.evaluate(()=>window.__wa || []);
check('et Barbaros est prévenu par WhatsApp — seul canal tant que Telegram dort',
  wa.length === 1 && wa[0].includes('wa.me') && decodeURIComponent(wa[0]).includes('ELA-26-09-0043'),
  wa.join(' '));
check('la course affiche « annulation demandée », pas « annulée »',
  /Annulation demandée/.test(await attente.textContent())
  && !/Annulée/.test(await attente.textContent()));

/* ---------------------------------------------------------------------
   6. « FERMER LA SESSION » — LE GESTE D'UNE TABLETTE QU'ON PRÊTE
   --------------------------------------------------------------------- */
await p.locator('#btnRecFermer').click();
await p.waitForTimeout(300);
check('la liste se referme et le code est redemandé',
  await p.locator('#recVerrou').isVisible() && await p.locator('#recCorps').isHidden());
check('plus aucune course n\'est à l\'écran',
  (await p.locator('.rec-course').count()) === 0);
await p.reload({waitUntil:'domcontentloaded'});
await p.waitForTimeout(900);
await p.locator('#btnReception').click();
await p.waitForTimeout(700);
check('et il ne revient pas tout seul au rechargement : le code est oublié',
  await p.locator('#recVerrou').isVisible());

/* ---------------------------------------------------------------------
   7. UN HÔTEL INCONNU NE DIT PAS QU'IL EST INCONNU
   --------------------------------------------------------------------- */
await p.goto('http://127.0.0.1:8099/index.html?reception=hotel-qui-nexiste-pas',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(800);
check('une clé inconnue retombe sur le site ordinaire, sans rien révéler',
  !(await p.evaluate(()=>document.body.classList.contains('reception')))
  && !(await p.evaluate(()=>document.body.classList.contains('hotel'))));

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
