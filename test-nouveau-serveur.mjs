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
  await p.goto('http://127.0.0.1:8099/nouveau.html',{waitUntil:'domcontentloaded'});
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
  typeof bon.prix.total === 'number' && Math.abs(bon.prix.total-48.28)<0.01, String(bon.prix.total));
check('la TVA est incluse, pas ajoutée',
  Math.abs(bon.prix.ht-43.89)<0.01 && Math.abs(bon.prix.tva-4.39)<0.01,
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
check('et il n\'a RIEN à envoyer : aucun WhatsApp ouvert tout seul',
  (await p.evaluate(()=>window.__liens)).length===0);
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
  msg.split('\n').length===6 && msg.includes('Départ : '), msg.split('\n').length+' lignes');
await ctx.close();

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
