/* =====================================================================
   TEST-NOUVEAU-SERVEUR.MJS — le dépôt de la demande
   ---------------------------------------------------------------------
   C'est le serveur qui fait la différence entre un site vitrine et un
   service : le client appuie sur « Confirmer » et c'est fini pour lui.

   Deux chemins, et le second compte autant que le premier :

   1. LE SERVEUR RÉPOND. La demande est déposée, le client lit qu'elle
      est arrivée, et AUCUN WhatsApp ne s'ouvre tout seul.
   2. LE SERVEUR NE RÉPOND PAS. Le bon s'affiche quand même, on dit sans
      détour que la demande n'est pas passée, et le renvoi par WhatsApp
      devient l'action principale — c'est alors le seul chemin par lequel
      elle peut parvenir à Barbaros. Ne jamais retirer ce repli : un
      « Confirmer » qui ne confirme rien, c'est un client qui attend une
      voiture à 5 h du matin pendant que personne ne sait rien.

   LA FORME DU BON EST VÉRIFIÉE CHAMP PAR CHAMP, parce que c'est elle que
   lit le tableau de bord de l'exploitant : prix.total, course.depart,
   client.nom, la date en AAAA-MM-JJ et l'heure à part. Un bon rangé
   autrement s'y afficherait vide.

   Un contrôle porte sur l'en-tête : la clé publique ne va QUE dans
   « apikey », jamais en « Bearer ». Supabase distribue deux formats de
   clé publique, et le nouveau n'est pas un JWT : présenté en Bearer, il
   est rejeté.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-serveur.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

async function reserver(serveurRepond){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
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
  const depots = [];
  await p.route('**yyhzutnuhuytokarynaw.supabase.co/**', async route => {
    depots.push({ url: route.request().url(), methode: route.request().method(),
                  entetes: route.request().headers(),
                  corps: JSON.parse(route.request().postData()||'{}') });
    if(serveurRepond) await route.fulfill({status:201, body:''});
    else await route.abort();
  });
  await ctx.addInitScript(()=>{ window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;}; });
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.locator('[data-paiement="especes"]').click();
  await p.locator('#btnConfirmer').click();
  return { p, ctx, depots };
}

// ================= LE SERVEUR RÉPOND =================
let { p, ctx, depots } = await reserver(true);
await p.waitForTimeout(1200);
check('le bon s\'affiche', await p.locator('#ecran-bon').isVisible());
check('une demande a bien été déposée', depots.length===1, String(depots.length));
const d0 = depots[0];
check('en POST sur la table des courses', d0.methode==='POST' && d0.url.includes('/rest/v1/courses'));
check('la clé publique ne va que dans « apikey », jamais en Bearer',
  !!d0.entetes['apikey'] && !d0.entetes['authorization'],
  Object.keys(d0.entetes).filter(k=>/apikey|authorization/.test(k)).join(','));

// La forme du bon : c'est elle que lit le tableau de bord de l'exploitant.
const bon = d0.corps.bon;
check('la course entre en « attente », jamais confirmée d\'office',
  d0.corps.statut==='attente' && bon.statut==='attente', d0.corps.statut);
check('le bon porte prix.total, que le tableau de bord affiche',
  typeof bon.prix.total === 'number' && Math.abs(bon.prix.total-70)<0.01, String(bon.prix.total));
check('la TVA est incluse, pas ajoutée',
  Math.abs(bon.prix.ht-63.64)<0.01 && Math.abs(bon.prix.tva-6.36)<0.01,
  bon.prix.ht+' / '+bon.prix.tva);
check('il porte course.depart et course.arrivee',
  !!bon.course.depart && !!bon.course.arrivee, bon.course.depart);
check('la date est en AAAA-MM-JJ et l\'heure à part — ce que lit l\'exploitant',
  /^\d{4}-\d{2}-\d{2}$/.test(bon.course.date) && bon.course.heure==='10:00',
  bon.course.date+' '+bon.course.heure);
check('il porte client.nom et client.telephone',
  bon.client.nom==='Jean Martin' && bon.client.telephone==='06 12 34 56 78');
check('et la clé technique du véhicule, jamais son nom commercial seul',
  bon.course.vehiculeCle==='berline', bon.course.vehiculeCle);

check('le client lit que sa demande est arrivée',
  (await p.locator('#envoiTexte').textContent()).includes('bien parvenue'),
  await p.locator('#envoiTexte').textContent());
// Le message WhatsApp part DANS TOUS LES CAS depuis que Barbaros a demandé
// à être prévenu sur son téléphone : le dépôt remplit le tableau de bord,
// le message le réveille. Les deux ne se remplacent pas.
check('le message WhatsApp part aussi, même quand le dépôt réussit',
  (await p.evaluate(()=>window.__liens)).length===1,
  String((await p.evaluate(()=>window.__liens)).length));
check('le renvoi reste en retrait',
  (await p.locator('#btnRenvoyer').getAttribute('class'))==='bouton-fantome');
await ctx.close();

// ================= LE SERVEUR NE RÉPOND PAS =================
({ p, ctx, depots } = await reserver(false));
await p.waitForTimeout(1500);
check('le bon s\'affiche quand même', await p.locator('#ecran-bon').isVisible());
check('on dit clairement que la demande n\'est pas passée',
  (await p.locator('#envoiTexte').textContent()).includes('seul moyen'),
  await p.locator('#envoiTexte').textContent());
check('le renvoi WhatsApp devient l\'action principale',
  (await p.locator('#btnRenvoyer').getAttribute('class'))==='bouton',
  await p.locator('#btnRenvoyer').getAttribute('class'));
check('la course reste enregistrée sur l\'appareil',
  (await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_courses')||'[]').length))===1);
await p.locator('#btnRenvoyer').click(); await p.waitForTimeout(200);
const msg = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
check('le message de secours garde sa forme lisible par l\'exploitant',
  msg.split('\n').length===9 && msg.includes('Départ : ')
  && msg.includes('Paiement : '), msg.split('\n').length+' lignes');
await ctx.close();

/* =====================================================================
   LES DEMANDES ARRIVENT DANS LE TABLEAU DE BORD PENDANT QU'IL REGARDE
   ---------------------------------------------------------------------
   Le dépôt seul ne suffit pas : jusqu'ici la demande n'apparaissait qu'à
   l'OUVERTURE de l'espace ou sur « Actualiser ». Un onglet laissé ouvert
   la nuit — c'est-à-dire la façon dont on travaille — ne montrait plus
   rien.
   SANS SESSION, RIEN N'ARRIVE, et il faut que ça se voie : le serveur
   refuse la lecture aux visiteurs anonymes, et il DOIT la refuser — une
   lecture ouverte exposerait les noms, téléphones et adresses de tous les
   clients. Le premier contrôle porte donc sur l'écriteau qui le dit.
   ===================================================================== */
function courseServeur(ref, nom){
  return { ref, statut:"attente", cree:new Date().toISOString(),
    course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
             date:"2026-09-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
             passagers:"2 passagers · 1 bagage", vol:"" },
    client:{ nom, telephone:"06 12 34 56 78" },
    prix:{ total:70, ht:63.64, tva:6.36 } };
}

async function espace(session){
  const c = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  await c.addInitScript((s)=>{
    if(s) localStorage.setItem('ela_nuage_session', JSON.stringify(s));
  }, session);
  const pg = await c.newPage();
  pg.on('pageerror',e=>errs.push(e.message));
  return { c, pg };
}

// ---- Sans session : on le DIT, on ne laisse pas croire que tout arrive ----
{
  const { c, pg } = await espace(null);
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(500);
  check('sans session, on dit que les demandes des clients n\'arrivent pas ici',
    await pg.locator('#bordHorsLigne').isVisible());
  check('et la pastille de la colonne le dit aussi',
    (await pg.locator('#adminEtatTexte').textContent()).includes('appareil'),
    await pg.locator('#adminEtatTexte').textContent());
  await c.close();
}

// ---- Avec session : une demande déposée pendant qu'il regarde arrive ----
{
  let liste = [courseServeur('ELA-26-09-0100','Jean Martin')];
  const { c, pg } = await espace({ access_token:'faux-jeton', token_type:'bearer' });
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', async route => {
    const u = route.request().url();
    if(route.request().method()==='GET' && u.includes('select=bon'))
      await route.fulfill({contentType:'application/json',
        body: JSON.stringify(liste.map(x=>({bon:x})))});
    else await route.fulfill({status:201, body:''});
  });
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(900);
  check('avec une session, l\'écriteau « vous ne recevez pas » disparaît',
    await pg.locator('#bordHorsLigne').isHidden());
  check('la course déjà sur le serveur est là',
    (await pg.locator('.demande').count())===1,
    String(await pg.locator('.demande').count()));
  /* LA PREMIÈRE LECTURE NE SONNE PAS : sur un téléphone neuf, tout ce que
     le serveur contient serait « nouveau » et ferait sonner cinquante
     courses vieilles de trois mois. */
  check('mais elle n\'est pas annoncée comme une arrivée : c\'est un rattrapage',
    await pg.locator('#bordArrivee').isHidden());

  // Un client réserve maintenant. Le retour sur l'onglet rattrape tout de suite.
  liste = [courseServeur('ELA-26-09-0101','Sophie Girard'), ...liste];
  await pg.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await pg.waitForTimeout(900);
  check('une demande arrivée pendant qu\'il regarde entre dans la liste',
    (await pg.locator('.demande').count())===2,
    String(await pg.locator('.demande').count()));
  check('et elle est ANNONCÉE — une ligne qui apparaît en silence ne se voit pas',
    await pg.locator('#bordArrivee').isVisible()
    && (await pg.locator('#bordArrivee').textContent()).includes('nouvelle demande'),
    (await pg.locator('#bordArrivee').textContent()).trim());
  check('elle est enregistrée sur l\'appareil, pas seulement affichée',
    (await pg.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings')||'[]')
      .some(x=>x.ref==='ELA-26-09-0101'))));
  /* L'écriteau EMMÈNE aux demandes en attente : il ne sert à rien s'il faut
     ensuite les chercher. */
  await pg.locator('#bordArrivee').click(); await pg.waitForTimeout(300);
  check('l\'écriteau emmène aux demandes en attente et se retire',
    await pg.locator('#bordArrivee').isHidden()
    && (await pg.locator('.compteur[data-filtre="attente"]').getAttribute('class')).includes('actif'));
  await c.close();
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
