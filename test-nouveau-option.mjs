/* =====================================================================
   TEST-NOUVEAU-OPTION.MJS — l'accueil avec pancarte, compris dans le prix
   ---------------------------------------------------------------------
   Jusqu'au 23 octobre 2026, la pancarte était une OPTION à 10 € sur le
   site public. Barbaros : « les 10 comprennent la pancarte avec le
   chauffeur qui attend le client à la sortie des arrivées », « même pour
   les gares », seulement les grandes. Elle reste une option sur les pages
   des hôtels partenaires (test-nouveau-hotel). Ce qui est verrouillé ici,
   sur le site public :

   — L'ACCUEIL SUIT LE DÉPART D'UNE GRANDE GARE (ou d'un aéroport, voir
     test-grille-publique) : il est DANS le prix montré, sans case à cocher
     — une case qu'on ne peut pas décocher n'est pas une option.
   — LE RÉCAPITULATIF LE DIT, et montre la pancarte avec le nom du client.
   — LE HT ET LA TVA SONT TIRÉS DU TOTAL, accueil compris.
   — LA LIGNE DU MESSAGE EST AVANT LE PRIX, SANS MONTANT : le lecteur de
     demandes retient le DERNIER montant en euros comme prix de la course.
   — UN DÉPART QUI CHANGE EMPORTE L'ACCUEIL ET SES 10 €.
   — UNE GARE À L'ARRIVÉE NE COÛTE RIEN DE PLUS : on dépose, personne
     n'attend avec un nom.
   — LES CGV DÉCRIVENT L'ACCUEIL dans la formation du prix, et toute phrase
     qui parle du panneau est conditionnelle — jamais promis à tout le monde.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-option.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* La vraie Gare de Lyon (jeu de données des gares, celui de la page). */
const GARE = {features:[{geometry:{coordinates:[2.373520,48.844888]},
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
  await p.route('**://api-adresse.data.gouv.fr/**', r=>r.fulfill({contentType:'application/json',
    body:JSON.stringify(/argenteuil/i.test(r.request().url()) ? ARGENTEUIL : VERSAILLES)}));
  /* ORS coupé, OSRM simulé : sans ça, la suite interrogerait le vrai
     service, avec une vraie distance, et les prix vérifiés au centime
     tomberaient à côté. 24,3 km : la tranche « jusqu'à 27 km », 60 €. */
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
const VEH   = '.veh-option';
const RECAP = '#ecran-recap .bloc-pancarte';

/* --- AU DÉPART D'UNE GRANDE GARE : tout le cycle ----------------------- */
let avec = 0;
{
  const {p, ctx} = await ouvrir(GARE);
  await jusquAuxPrix(p, 'gare de lyon');
  check('écran des prix : plus de case « pancarte » à cocher', await p.locator(VEH).isHidden());
  const acc = await p.locator('#resumeAccueil').isVisible() ? await p.locator('#resumeAccueil').innerText() : '';
  check('écran des prix : « Accueil compris », à l\'arrivée du train', /^Accueil compris/.test(acc) && /arrivée de votre train/.test(acc), acc);
  const prixBerline = nombre(await p.locator('.veh-carte .veh-prix').first().innerText());
  check('le prix montré comprend déjà l\'accueil : 60 + 10 = 70 €', prixBerline === 70, String(prixBerline));
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check('récapitulatif : le bloc « À votre arrivée » est là', !(await p.locator(RECAP).isHidden()));
  check('récapitulatif : sans case à cocher, avec la phrase « accueil compris »',
    await p.locator(RECAP+' .opt-pancarte').isHidden() && await p.locator('#accueilNote').isVisible());
  check('récapitulatif : l\'aperçu de la pancarte est montré', !(await p.locator('#apercuPancarte').isHidden()));
  avec = nombre(await p.locator('#recapTotal').innerText());
  check('le total est celui de l\'écran des prix, 70 €', avec === 70, String(avec));
  check('aucune ligne d\'option n\'encombre le récapitulatif', await p.locator('#ligneOption').isHidden());

  await p.fill('#clientNom','Jean Martin'); await p.waitForTimeout(200);
  check('la pancarte porte le nom du client, en capitales',
    (await p.locator('#pancarteNom').innerText()).trim()==='JEAN MARTIN',
    await p.locator('#pancarteNom').innerText());
  await p.fill('#clientTel','06 12 34 56 78');
  await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(600);
  await p.locator('#btnRenvoyer').click(); await p.waitForTimeout(300);
  const msg = await p.evaluate(()=> decodeURIComponent(
    (window.__liens.find(u=>/wa\.me|whatsapp/.test(u))||'').split('text=')[1]||''));
  const lignes = msg.split('\n');
  const iAcc  = lignes.findIndex(l=>/^Accueil/.test(l));
  const iPrix = lignes.findIndex(l=>/^Prix/.test(l));
  check('le message porte la ligne d\'accueil', iAcc > -1, lignes[iAcc]||'absente');
  check('elle est AVANT le prix, et sans montant',
    iAcc > -1 && iPrix > iAcc && !/€/.test(lignes[iAcc]), 'accueil '+iAcc+', prix '+iPrix);
  const montants = msg.match(/[\d\s]+[,.]\d\d\s*€/g) || [];
  check('le dernier montant du message est bien le prix total',
    nombre(montants[montants.length-1])===avec, montants.join(' / '));
  /* La course ENREGISTRÉE dit pourquoi le prix comprend 10 € de plus, et
     au chauffeur qu'il faut une pancarte. */
  const garde = await p.evaluate(()=>{
    try{
      const l = JSON.parse(localStorage.getItem("ela_courses")||"[]");
      const c = l[0] || {};
      return { pancarte: (c.course||{}).pancarte, accueil: (c.course||{}).accueil, total: (c.prix||{}).total,
               ht: (c.prix||{}).ht, tva: (c.prix||{}).tva };
    }catch(e){ return {erreur:String(e)}; }
  });
  check('la course enregistrée porte « pancarte », « accueil » et le prix montré',
    garde.pancarte === true && garde.accueil === true && garde.total === avec, JSON.stringify(garde));
  check('le HT et la TVA sont tirés du total, accueil compris',
    Math.abs(garde.ht + garde.tva - avec) < 0.011
    && Math.abs(garde.ht - avec/1.1) < 0.011,
    garde.ht+' + '+garde.tva+' = '+avec);
  await ctx.close();
}

/* --- LE DÉPART CHANGE : l'accueil part, et ses 10 € avec lui ------------ */
{
  const {p, ctx} = await ouvrir(GARE);
  await jusquAuRecap(p, 'gare de lyon');
  const avant = nombre(await p.locator('#recapTotal').innerText());
  await p.route('**://photon.komoot.io/**', r=>r.fulfill({contentType:'application/json',body:'{"features":[]}'}));
  await p.locator('#btnRetourVehicules').click(); await p.waitForTimeout(200);
  await p.locator('#btnRetourAccueil').click(); await p.waitForTimeout(200);
  await p.fill('#depart',''); await p.type('#depart','versailles',{delay:12});
  await p.waitForTimeout(900);
  await p.locator('#departList [role=option]').first().click();
  await p.waitForTimeout(400);
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1400);
  check('sur une adresse ordinaire, plus de phrase « accueil compris »', await p.locator('#resumeAccueil').isHidden());
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check('…ni de bloc pancarte au récapitulatif', await p.locator(RECAP).isHidden());
  const apres = nombre(await p.locator('#recapTotal').innerText());
  check('et le total perd exactement 10 €', avant - apres === 10, avant+' → '+apres);
  await ctx.close();
}

/* --- LE SENS COMPTE : une gare À L'ARRIVÉE ne coûte rien de plus -------- */
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
  const arrivee = await p.locator('#arrivee').inputValue();
  check("la scène est bien un trajet VERS une gare", /gare/i.test(arrivee), 'arrivée retenue : '+arrivee);
  check("une gare à l'ARRIVÉE : pas d'accueil", await p.locator('#resumeAccueil').isHidden());
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(350);
  check("…ni au récapitulatif", await p.locator(RECAP).isHidden());
  const total = nombre(await p.locator('#recapTotal').innerText());
  check("le total ne porte donc aucun supplément", total === 60, String(total));
  await ctx.close();
}

/* --- LES CGV DISENT CE QU'ON FACTURE, DANS LES DEUX LANGUES ------------ */
{
  const {p, ctx} = await ouvrir(GARE);
  for (const [langue, motAccueil, motPancarte, motCondition] of [
        ['fr', /comprend un accueil/i, /panneau à son nom/i, /lorsque|si le Client|dès lors que|sur demande/i],
        ['en', /includes a meet-and-greet/i, /sign bearing (the Client's|their) name/i, /where the option|where the Client|where a meet-and-greet|where the pickup|if the Client|when the option|once the option/i]]) {
    await p.locator('.langues button[data-langue="'+langue+'"]').click();
    await p.waitForTimeout(250);
    const cgv = await p.evaluate(l => window.ELA_TEXTES[l].legal_cgv_body, langue);
    check('en '+langue+', les CGV décrivent l\'accueil compris dans la formation du prix', motAccueil.test(cgv));
    /* TOUTES les phrases qui parlent du panneau : une seule promesse
       inconditionnelle suffit à engager. */
    const phrases = cgv.split(/(?<=\.)\s+/).filter(x => motPancarte.test(x));
    const libres = phrases.filter(x => !motCondition.test(x));
    check('en '+langue+', le panneau n\'est jamais promis à tout le monde',
      phrases.length > 0 && libres.length === 0,
      phrases.length === 0 ? 'le panneau n\'est décrit nulle part'
                           : libres.map(x => x.slice(0, 90)).join(' | '));
  }
  await ctx.close();
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
