/* =====================================================================
   TEST-NOUVEAU-OPTION.MJS — la pancarte à 10 €
   ---------------------------------------------------------------------
   Une option payante touche au PRIX, et le prix d'Elatransfer est ferme :
   annoncé, accepté, encaissé tel quel. Ce qui est verrouillé ici :

   — ELLE NE S'AFFICHE QUE LÀ OÙ ELLE A UN SENS : au départ d'un terminal
     ou d'une gare. Vendre une pancarte à quelqu'un qu'on prend en bas de
     chez lui, c'est vendre du vide.
   — ELLE EST ÉTEINTE À L'OUVERTURE. Une option cochée d'avance qui gonfle
     le total est un paiement supplémentaire non consenti (L224-76 Code
     conso.).
   — ELLE AJOUTE EXACTEMENT 10 €, ni plus ni moins, et le prix affiché sur
     le bouton sort de la même constante que le calcul : une étiquette
     périmée sur un prix ferme est opposable.
   — LE HT ET LA TVA SUIVENT. Ils sont tirés du total, pas du prix de la
     course : un total à 80 € avec une TVA calculée sur 70 est une facture
     fausse.
   — UNE OPTION QU'ON NE VOIT PLUS NE SE PAIE PLUS. Le client qui change
     son départ pour une adresse ordinaire ne doit pas garder 10 € sur un
     service qu'on ne peut plus lui rendre — il ne verrait même plus la
     ligne.
   — LA LIGNE DU MESSAGE EST AVANT LE PRIX. Le lecteur de demandes retient
     le DERNIER montant en euros comme prix de la course : une ligne
     « +10,00 € » posée après le prix le remplacerait, et la course serait
     recréée à 10 € au lieu de 80.
   — LES CGV DÉCRIVENT L'OPTION, dans les deux langues. Des CGV qui
     promettent gratuitement ce qu'on facture donnent au client un argument
     contre nous.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-option.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

const GARE = {features:[{geometry:{coordinates:[2.3553,48.8443]},
  properties:{name:"Gare de Lyon",osm_key:"railway",osm_value:"station",
              postcode:"75012",city:"Paris",countrycode:"FR"}}]};
const ARGENTEUIL = {features:[{geometry:{coordinates:[2.2467,48.9478]},
  properties:{label:"Argenteuil, 95100 Argenteuil"}}]};
const VERSAILLES = {features:[{geometry:{coordinates:[2.1301,48.8014]},
  properties:{label:"10 Avenue de Paris, 78000 Versailles"}}]};

async function ouvrir(photon){
  const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  const p = await ctx.newPage();
  p.on('pageerror', e=>errs.push(e.message));
  await ctx.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:JSON.stringify(photon)}));
  /* Départ et arrivée doivent être deux endroits différents : le site
     refuse les deux au même point, et le test tomberait sur ce refus au
     lieu de tomber sur son sujet. */
  await p.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify(/argenteuil/i.test(r.request().url()) ? ARGENTEUIL : VERSAILLES)}));
  /* ORS passe avant OSRM depuis qu'une clé est posée dans la page : sans ce
     refus, la suite interrogerait le vrai service depuis une machine reliée
     à Internet, avec une vraie distance, et les prix vérifiés au centime
     tomberaient à côté. */
  await p.route('**://api.openrouteservice.org/**', r=>r.abort());
  await p.route('**://router.project-osrm.org/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);
  return {p, ctx};
}
async function jusquAuxPrix(p, motDepart){
  await p.type('#depart', motDepart, {delay:12}); await p.waitForTimeout(850);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:12}); await p.waitForTimeout(850);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5);
  const z = n => String(n).padStart(2,"0");
  await p.fill('#date', d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate()));
  await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);
}
async function jusquAuRecap(p, motDepart){
  await jusquAuxPrix(p, motDepart);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
}
const nombre = t => Number(String(t).replace(/[^\d,.-]/g,'').replace(',','.'));
/* Les deux endroits où l'option vit. Elle se CHOISIT sous la liste des
   véhicules — là où l'on décide de ce qu'on achète — et se retrouve sur le
   récapitulatif, là où le client tape son nom et le voit s'écrire sur la
   pancarte. Un seul état, deux commandes. */
const VEH   = '.veh-option';
const RECAP = '#ecran-recap .bloc-pancarte';

/* --- AU DÉPART D'UNE GARE : tout le cycle ----------------------------- */
{
  const {p, ctx} = await ouvrir(GARE);
  await jusquAuxPrix(p, 'gare de lyon');
  check('l\'option est proposée SOUS la sélection du véhicule',
    !(await p.locator(VEH).isHidden()));
  /* Elle doit être APRÈS la liste : au-dessus, elle se vendrait avant que
     le client sache ce qu'il achète. */
  const ordre = await p.evaluate(()=>{
    const l = document.getElementById("listeVehicules").getBoundingClientRect();
    const o = document.querySelector(".veh-option").getBoundingClientRect();
    return { liste:Math.round(l.bottom), option:Math.round(o.top) };
  });
  check('elle est bien EN DESSOUS de la liste, pas au-dessus',
    ordre.option >= ordre.liste, 'liste finit à '+ordre.liste+', option commence à '+ordre.option);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check('on la retrouve sur le récapitulatif',
    !(await p.locator(RECAP).isHidden()));
  check('elle est ÉTEINTE à l\'ouverture',
    (await p.locator(RECAP+' .opt-pancarte').getAttribute('aria-pressed'))==='false'
    && (await p.locator(VEH+' .opt-pancarte').getAttribute('aria-pressed'))==='false');
  check('l\'aperçu de la pancarte n\'est pas encore montré',
    await p.locator('#apercuPancarte').isHidden());
  check('la phrase parle de la sortie des trains, pas d\'un terminal',
    /sortie des trains/i.test(await p.locator(RECAP+' .opt-sous').innerText()),
    await p.locator(RECAP+' .opt-sous').innerText());
  check('le prix de l\'option est affiché avant tout choix',
    nombre(await p.locator(RECAP+' .opt-prix').innerText())===10,
    await p.locator(RECAP+' .opt-prix').innerText());
  const sans = nombre(await p.locator('#recapTotal').innerText());
  check('sans l\'option, le total est celui de la course', sans===60, String(sans));
  check('et aucune ligne d\'option n\'encombre le récapitulatif',
    await p.locator('#ligneOption').isHidden());

  await p.locator(RECAP+' .opt-pancarte').click(); await p.waitForTimeout(250);
  const avec = nombre(await p.locator('#recapTotal').innerText());
  check('l\'option ajoute EXACTEMENT 10 €', avec - sans === 10, sans+' → '+avec);
  /* Un seul état pour deux commandes : le bouton de l'écran des prix a
     suivi celui du récapitulatif, sans qu'on y touche. */
  check('les deux boutons disent la même chose',
    (await p.locator(VEH+' .opt-pancarte').getAttribute('aria-pressed'))==='true',
    await p.locator(VEH+' .opt-pancarte').getAttribute('aria-pressed'));
  check('l\'aperçu apparaît une fois l\'option prise',
    !(await p.locator('#apercuPancarte').isHidden()));
  check('la ligne d\'option s\'affiche, à son prix',
    !(await p.locator('#ligneOption').isHidden())
    && nombre(await p.locator('#recapOption').innerText())===10,
    await p.locator('#recapOption').innerText());

  await p.fill('#clientNom','Jean Martin'); await p.waitForTimeout(200);
  check('la pancarte porte le nom du client, en capitales',
    (await p.locator('#pancarteNom').innerText()).trim()==='JEAN MARTIN',
    await p.locator('#pancarteNom').innerText());

  await p.fill('#clientTel','06 12 34 56 78');
  await p.locator('[data-paiement="especes"]').click();
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(600);
  const msg = await p.evaluate(()=> decodeURIComponent(
    (window.__liens.find(u=>/wa\.me|whatsapp/.test(u))||'').split('text=')[1]||''));
  const lignes = msg.split('\n');
  const iOption = lignes.findIndex(l=>/^Option/.test(l));
  const iPrix   = lignes.findIndex(l=>/^Prix/.test(l));
  check('le message porte la ligne d\'option', iOption > -1, lignes[iOption]||'absente');
  check('elle est AVANT le prix — le lecteur retient le dernier montant',
    iOption > -1 && iPrix > iOption, 'option '+iOption+', prix '+iPrix);
  const montants = msg.match(/[\d\s]+[,.]\d\d\s*€/g) || [];
  check('le dernier montant du message est bien le prix total',
    nombre(montants[montants.length-1])===avec, montants.join(' / '));
  /* La course ENREGISTRÉE porte l'option, et pas seulement l'écran : sans
     ce champ, le bon relu trois jours plus tard porte 10 € que personne ne
     sait expliquer — ni le client, ni le chauffeur qui encaisse. */
  const garde = await p.evaluate(()=>{
    try{
      const l = JSON.parse(localStorage.getItem("ela_courses")||"[]");
      const c = l[0] || {};
      return { pancarte: (c.course||{}).pancarte, total: (c.prix||{}).total,
               ht: (c.prix||{}).ht, tva: (c.prix||{}).tva };
    }catch(e){ return {erreur:String(e)}; }
  });
  check('la course enregistrée garde l\'option et son prix',
    garde.pancarte === true && garde.total === avec, JSON.stringify(garde));
  /* ═══ LE HT ET LA TVA SE LISENT SUR LA COURSE, PLUS À L'ÉCRAN ═══
     Ce contrôle visait « #recapHT » et « #recapTVA ». Les deux lignes ont
     été RETIRÉES du récapitulatif quand les tarifs publics ont été
     clarifiés — changement légitime — et la suite entière s'arrêtait
     alors sur un délai d'attente, **sans rien afficher**. Vingt-cinq
     contrôles sur une option PAYANTE ont cessé de tourner sans que
     personne ne le voie : une suite muette est un échec, pas une suite
     « pas concernée ».
     La garantie, elle, n'a pas bougé : la TVA se calcule sur le total
     option COMPRISE. On la vérifie donc là où la donnée vit toujours —
     la course enregistrée, celle qui sert à relire un bon trois jours
     plus tard. Viser la RÈGLE, jamais la balise. */
  check('le HT et la TVA sont tirés du total, option comprise',
    Math.abs(garde.ht + garde.tva - avec) < 0.011
    && Math.abs(garde.ht - avec/1.1) < 0.011,
    garde.ht+' + '+garde.tva+' = '+avec);
  await ctx.close();
}

/* --- LE DÉPART CHANGE : l'option ne peut pas rester payée -------------- */
{
  const {p, ctx} = await ouvrir(GARE);
  await jusquAuRecap(p, 'gare de lyon');
  await p.locator(RECAP+' .opt-pancarte').click(); await p.waitForTimeout(250);
  const avec = nombre(await p.locator('#recapTotal').innerText());
  /* Photon ne rend plus de gare : le nouveau départ est une adresse
     ordinaire, servie par la Base Adresse Nationale. */
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.locator('#btnRetourVehicules').click(); await p.waitForTimeout(200);
  await p.locator('#btnRetourAccueil').click(); await p.waitForTimeout(200);
  await p.fill('#depart',''); await p.type('#depart','versailles',{delay:12});
  await p.waitForTimeout(900);
  await p.locator('#departList [role=option]').first().click();
  await p.waitForTimeout(400);
  await p.locator('#btnVoirPrix').click({force:true}); await p.waitForTimeout(1400);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check('sur une adresse ordinaire, l\'option disparaît',
    await p.locator(RECAP).isHidden() && await p.locator(VEH).isHidden());
  const apres = nombre(await p.locator('#recapTotal').innerText());
  check('et ses 10 € avec elle', avec - apres === 10, avec+' → '+apres);
  await ctx.close();
}

/* --- LE SENS COMPTE : une gare À L'ARRIVÉE ne vend rien ---------------
   On vend une pancarte à qui l'on VA CHERCHER, pas à qui l'on dépose. Le
   code ne regarde que « choix.depart » et il a raison ; ce contrôle existe
   parce qu'une réécriture qui lirait « l'une des deux adresses » passerait
   sans que rien ne tombe — et on facturerait 10 € une pancarte brandie
   devant un client qu'on laisse à Roissy.
   La Base Adresse Nationale ne rend RIEN sur la question « gare de lyon » :
   sans ça, ses résultats et ceux de Photon se mélangeraient dans la même
   liste et le premier choisi ne serait plus celui qu'on croit. */
{
  const ctx = await b.newContext({viewport:{width:390,height:844},locale:'fr-FR',
    timezoneId:'Europe/Paris'});
  const p = await ctx.newPage();
  p.on('pageerror', e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify(/lyon|gare/i.test(decodeURIComponent(r.request().url())) ? GARE : {features:[]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify(/lyon|gare/i.test(decodeURIComponent(r.request().url())) ? {features:[]} : VERSAILLES)}));
  await p.route('**://api.openrouteservice.org/**', r=>r.abort());
  await p.route('**://router.project-osrm.org/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(500);

  await p.type('#depart','versailles',{delay:12}); await p.waitForTimeout(900);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','gare de lyon',{delay:12}); await p.waitForTimeout(900);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5), z = n => String(n).padStart(2,"0");
  await p.fill('#date', d.getFullYear()+"-"+z(d.getMonth()+1)+"-"+z(d.getDate()));
  await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1100);

  /* On éprouve d'abord que la scène est bien celle qu'on croit : sans ça,
     une arrivée qui ne serait PAS une gare rendrait le contrôle vert sans
     rien prouver. */
  const arrivee = await p.locator('#arrivee').inputValue();
  check("la scène est bien un trajet VERS une gare",
    /gare/i.test(arrivee), 'arrivée retenue : '+arrivee);

  check("une gare à l'ARRIVÉE ne propose pas la pancarte",
    await p.locator(VEH).isHidden());
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check("…et le récapitulatif ne la propose pas non plus",
    await p.locator(RECAP).isHidden());
  const total = nombre(await p.locator('#recapTotal').innerText());
  check("le total ne porte donc aucun supplément", total === 60, String(total));
  await ctx.close();
}

/* --- LES CGV DISENT CE QU'ON FACTURE, DANS LES DEUX LANGUES ------------ */
{
  const {p, ctx} = await ouvrir(GARE);
  /* LE MONTANT SORT DE LA PAGE, IL N'EST PAS RECOPIÉ ICI. Écrit « 10 € »
     à la main, ce contrôle déplacerait simplement la faute dans le test :
     le jour où l'option changerait de prix, il faudrait penser à le
     corriger à deux endroits, et celui qu'on oublie est toujours celui qui
     compte. On lit OPTION_PANCARTE_EUR et on le cherche dans les CGV.
     ON VISE LA RÈGLE POUR LE RESTE (16 septembre 2026). Ces contrôles
     cherchaient « souscrit l'option » et « sortie des trains » mot pour
     mot ; les documents ont été réécrits le 12 septembre et disent la même
     chose autrement (« Lorsque l'option a été choisie et confirmée »). Ils
     tombaient tous les jours sans qu'il y ait de défaut — et à force, on
     ne les lit plus.
     CE QUI EST VERROUILLÉ, et qui engage vraiment : les CGV NOMMENT
     l'option ET SON MONTANT dans la formation du prix, et la pancarte y
     est CONDITIONNELLE, jamais promise à tout le monde. Le prix est ferme
     donc opposable : des CGV qui décrivent une autre formation du prix que
     celle appliquée donnent au client un argument contre nous. */
  /* ON LIT LA CONSTANTE DANS LA SOURCE, on n'expose rien sur « window »
     pour les besoins d'un test : une porte ouverte dans la page pour la
     commodité du banc finit par servir à autre chose. */
  const src = await (await p.request.get('http://127.0.0.1:8099/index.html')).text();
  const euro = Number((src.match(/OPTION_PANCARTE_EUR\s*=\s*(\d+)/) || [])[1]);
  check('le montant de l\'option est lisible dans la page, pour qu\'on le compare',
    Number.isFinite(euro) && euro > 0, String(euro));
  for (const [langue, motPancarte, motCondition] of [
        ['fr', /panneau à son nom/i, /lorsque|si le Client|dès lors que|sur demande/i],
        ['en', /sign bearing the Client's name/i, /where the option|where the Client|if the Client|when the option|once the option/i]]) {
    await p.locator('.langues button[data-langue="'+langue+'"]').click();
    await p.waitForTimeout(250);
    const cgv = await p.evaluate(l => window.ELA_TEXTES[l].legal_cgv_body, langue);
    /* Le montant, écrit comme la langue l'écrit : « 10 € » en français,
       « €10 » en anglais. On accepte les deux plutôt que de figer un
       format de nombre qui n'est pas le sujet. */
    const montant = new RegExp('(' + euro + '\\s*€|€\\s*' + euro + ')');
    check('en '+langue+', les CGV décrivent l\'option dans la formation du prix',
      /option/i.test(cgv) && montant.test(cgv),
      montant.test(cgv) ? 'le mot « option » est absent'
                        : 'le montant ' + euro + ' n\'est écrit nulle part');
    /* TOUTES les phrases qui parlent de la pancarte, pas la première.
       ÉPROUVÉ, ET LE PREMIER JET NE TOMBAIT PAS : avec « find », le
       contrôle s'arrêtait sur la phrase de l'article 4 — qui nomme la
       pancarte elle aussi depuis qu'on y a écrit l'option — et l'article 8
       pouvait la promettre gratuitement à tout le monde sans que rien ne
       bronche. Une seule promesse inconditionnelle suffit à engager :
       on les veut donc TOUTES conditionnelles. */
    const phrases = cgv.split(/(?<=\.)\s+/).filter(x => motPancarte.test(x));
    const libres = phrases.filter(x => !motCondition.test(x));
    check('en '+langue+', elles ne promettent plus la pancarte à tout le monde',
      phrases.length > 0 && libres.length === 0,
      phrases.length === 0 ? 'la pancarte n\'est décrite nulle part'
                           : libres.map(x => x.slice(0, 90)).join(' | '));
  }
  await ctx.close();
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
