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

async function reserver(serveurRepond, sansPush){
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
  await ctx.addInitScript(()=>{
    window.__liens=[]; window.open=(u)=>{window.__liens.push(u);return null;};
    /* ON COMPTE LES DEMANDES D'AUTORISATION, on ne lit pas l'état final :
       lire « Notification.permission » ne dit rien de qui l'a demandée —
       elle peut valoir « granted » parce que le contexte l'a accordée. Ce
       qu'on veut prouver, c'est qu'AUCUN appel n'est parti tout seul. */
    window.__demandes = 0;
    const vraie = Notification.requestPermission.bind(Notification);
    Notification.requestPermission = function(){ window.__demandes++; return vraie(); };
    /* UN CHROME PILOTÉ RÉPOND « denied » LÀ OÙ UN VRAI NAVIGATEUR RÉPOND
       « default », et ni l'option « permissions » du contexte ni
       « grantPermissions » n'y changent quoi que ce soit — éprouvé.
       Or la page cache le bloc quand l'autorisation est REFUSÉE, et elle a
       raison : un client qui a bloqué le site ne recevra jamais rien, lui
       proposer un bouton serait une promesse en l'air. Sans ce
       rétablissement, la suite n'éprouverait donc que ce cas-là et jamais
       le cas ordinaire. On remet l'état d'un navigateur qui n'a pas encore
       été interrogé — on ne touche pas à la page, on répare le banc. */
    try{ Object.defineProperty(Notification, "permission",
      { get: () => "default", configurable: true }); }catch(e){}
  });
  /* LE CAS DE PRESQUE TOUS LES IPHONE : le site n'est pas installé sur
     l'écran d'accueil, donc Safari ne connaît pas « PushManager ». C'est le
     client qu'on prévient sur WhatsApp — et c'est exactement celui à qui la
     promesse WhatsApp ne s'affichait plus quand le bloc entier dépendait du
     push. On le supprime AVANT le chargement : le remplacer après coup ne
     rejouerait pas le jugement de la page. */
  if(sansPush) await ctx.addInitScript(()=>{ delete window.PushManager; });
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
/* ON NE DEMANDE JAMAIS L'AUTORISATION AU CHARGEMENT. Une demande de
   notification qui surgit sans raison se refuse d'un réflexe — et le refus
   est DÉFINITIF : le navigateur ne repose plus jamais la question, même des
   mois plus tard. Elle ne part que sur un geste du client. */
check('aucune autorisation n\'a été demandée d\'elle-même',
  (await p.evaluate(()=>window.__demandes))===0,
  String(await p.evaluate(()=>window.__demandes)));
/* Le bloc n'apparaît QUE si la demande est arrivée sur le serveur : sans
   ligne côté serveur, personne ne pourra jamais envoyer la notification, et
   proposer de s'abonner serait une promesse en l'air. */
check('le bloc « Être prévenu » s\'affiche une fois la demande déposée',
  await p.locator('#blocNotif').isVisible());
/* WHATSAPP EST ANNONCÉ D'ABORD, ET IL EST CERTAIN. La notification demande
   au client d'installer le site sur un iPhone — presque personne ne le
   fait. Sans cette ligne, ce client-là lisait « Être prévenu » et repartait
   sans savoir par quoi. Le NUMÉRO y est, parce que c'est le dernier moment
   où il peut voir qu'il a tapé un chiffre de travers. */
check('la promesse WhatsApp est annoncée, avec le numéro du client',
  (await p.locator('#notifWa').textContent()).includes('WhatsApp')
  && (await p.locator('#notifWaNum').textContent()) === '06 12 34 56 78',
  await p.locator('#notifWaNum').textContent());
/* ET ELLE PASSE AVANT LA NOTIFICATION — l'ordre dit ce sur quoi le client
   peut compter. Mesuré, pas relu dans le HTML : un « order » CSS suffirait
   à inverser les deux sans que le code source le montre. */
{
  const wa = await p.locator('#notifWa').boundingBox();
  const bt = await p.locator('#btnNotif').boundingBox();
  check('elle est AU-DESSUS du bouton de notification',
    wa.y + wa.height <= bt.y, Math.round(wa.y) + ' / ' + Math.round(bt.y));
}
await ctx.close();

// ========== UN NAVIGATEUR QUI NE SAIT PAS RECEVOIR DE NOTIFICATION ==========
/* Sur iPhone, tant que le site n'est pas posé sur l'écran d'accueil, il n'y
   a pas de notification possible — et c'est le cas de la quasi-totalité des
   clients. Le bloc portait AVANT la seule notification, et disparaissait
   donc entièrement pour eux : ils lisaient « demande reçue » et n'avaient
   plus aucune idée de la façon dont la réponse leur arriverait. */
({ p, ctx } = await reserver(true, true));
await p.waitForTimeout(1200);
check('sans notification possible, le bloc « Être prévenu » reste affiché',
  await p.locator('#blocNotif').isVisible());
check('et la promesse WhatsApp aussi — c\'est le seul canal de ce client',
  (await p.locator('#notifWa').textContent()).includes('WhatsApp'));
check('mais le bouton disparaît : il ne pourrait rien faire',
  !(await p.locator('#btnNotif').isVisible()));
/* Et la phrase qui l'annonçait part avec lui. Laissée seule, elle promet
   une notification qu'aucun geste ne permet plus d'obtenir — c'est pire
   qu'un bouton mort, parce que le client cherche où appuyer. */
check('et la phrase qui annonçait la notification part avec lui',
  !(await p.locator('#notifPlus').isVisible()));
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
/* PAS DE LIGNE SUR LE SERVEUR, PAS DE NOTIFICATION POSSIBLE. La fonction
   qui prévient cherche l'abonnement par la référence de la course : sans
   course déposée, elle ne trouvera jamais rien. Proposer « Soyez prévenu »
   ici serait promettre un message qui ne partira pas — et le client
   fermerait sa page en croyant qu'on le rappellera tout seul. */
check('« Être prévenu » ne s\'affiche PAS quand la demande n\'est pas passée',
  !(await p.locator('#blocNotif').isVisible()));
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

/* =====================================================================
   LE JETON EXPIRE AU BOUT D'UNE HEURE — LA PANNE INVISIBLE
   ---------------------------------------------------------------------
   Rien ne renouvelait le jeton d'accès. Passé une heure, le serveur
   répondait 401 à chaque lecture, l'erreur était avalée en silence, et plus
   AUCUNE demande de client n'arrivait dans le tableau de bord — alors que
   la colonne affichait toujours « Serveur connecté », parce que
   « connecte() » ne regarde que la présence d'une chaîne, pas sa validité.
   C'est la pire forme de panne : invisible, durable, et ce qu'on perd ce
   sont des clients.
   LE PREMIER CONTRÔLE EST CELUI QUI COMPTE : le 401 doit déclencher UN
   renouvellement, puis l'appel doit être REJOUÉ — et la course doit
   apparaître. Un test qui vérifierait seulement « le renouvellement est
   appelé » ne dirait rien de ce que Barbaros a sous les yeux.
   ===================================================================== */
{
  const liste = [courseServeur('ELA-26-09-0200','客 Expiré')];
  const vus = [];
  let jetonNeuf = false;
  const { c, pg } = await espace({ access_token:'jeton-perime',
                                   refresh_token:'jeton-de-renouvellement',
                                   token_type:'bearer' });
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', async route => {
    const u = route.request().url();
    const auth = route.request().headers()['authorization'] || '';
    vus.push(u.includes('grant_type=refresh_token') ? 'refresh'
           : (u.includes('select=bon') ? 'lecture:' + auth : 'autre'));
    if(u.includes('grant_type=refresh_token')){
      /* Le renouvellement ne doit PAS porter le jeton périmé : le lui
         envoyer ferait refuser la demande qui doit justement le remplacer. */
      if(auth) { await route.fulfill({status:401, body:''}); return; }
      jetonNeuf = true;
      await route.fulfill({contentType:'application/json',
        body: JSON.stringify({ access_token:'jeton-neuf',
                               refresh_token:'renouvellement-2', token_type:'bearer' })});
      return;
    }
    if(u.includes('select=bon')){
      if(!jetonNeuf || auth !== 'Bearer jeton-neuf'){
        await route.fulfill({status:401, body:''}); return;
      }
      await route.fulfill({contentType:'application/json',
        body: JSON.stringify(liste.map(x=>({bon:x})))});
      return;
    }
    await route.fulfill({status:201, body:''});
  });
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(1200);
  check('un jeton périmé est renouvelé tout seul',
    vus.includes('refresh'), vus.join(' | '));
  check('le renouvellement ne porte PAS le jeton périmé',
    vus.filter(v => v === 'refresh').length === 1, vus.join(' | '));
  check('et l\'appel est REJOUÉ : la course du client finit par arriver',
    (await pg.locator('.demande').count()) === 1,
    String(await pg.locator('.demande').count()));
  check('rien n\'est signalé au passage — le renouvellement est invisible et doit l\'être',
    await pg.locator('#bordHorsLigne').isHidden());
  await c.close();
}

/* UNE LECTURE QUI ÉCHOUE POUR DE BON DOIT SE VOIR. Elle rendait « null »,
   exactement comme « pas connecté » : le tableau de bord ne disait rien, et
   une panne qui ressemble à un état normal ne se répare jamais. */
{
  const { c, pg } = await espace({ access_token:'jeton-mort',
                                   refresh_token:'renouvellement-mort',
                                   token_type:'bearer' });
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', async route => {
    await route.fulfill({status:401, body:''});
  });
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(1500);
  check('un renouvellement refusé efface la session au lieu de garder une pastille verte',
    !(await pg.evaluate(()=>!!localStorage.getItem('ela_nuage_session'))));
  check('et l\'écriteau DIT que la session a expiré',
    await pg.locator('#bordHorsLigne').isVisible()
    && (await pg.locator('#bordHorsLigneTexte').textContent()).includes('expiré'),
    await pg.locator('#bordHorsLigneTexte').textContent());
  check('la pastille de la colonne repasse à « cet appareil seul »',
    (await pg.locator('#adminEtatTexte').textContent()).includes('appareil'),
    await pg.locator('#adminEtatTexte').textContent());
  await c.close();
}

/* =====================================================================
   L'ACCUSÉ DE RÉCEPTION AU CLIENT
   ---------------------------------------------------------------------
   Le client appuie sur « Confirmer » et n'a plus aucune nouvelle. Son bon
   dit « demande reçue », mais il l'a fermé. Un mot qui dit qu'une personne
   a vu sa demande — et que la réservation N'EST PAS ENCORE FERME — évite le
   rappel inquiet, et surtout évite de laisser croire à une voiture réservée
   qu'on n'a pas encore placée.
   ===================================================================== */
{
  const bon = courseServeur('ELA-26-09-0300','Sophie Girard');
  bon.course.date = '2026-09-20'; bon.course.heure = '10:00';
  const { c, pg } = await espace(null);
  await pg.addInitScript((b)=>{
    localStorage.setItem('ela_bookings', JSON.stringify([b]));
    window.__liens = []; window.open = (u)=>{ window.__liens.push(u); return null; };
  }, bon);
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(700);
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(400);
  check('une demande en attente porte « Accuser réception »',
    await pg.locator('#btnAccuserReception').isVisible());
  await pg.locator('#btnAccuserReception').click(); await pg.waitForTimeout(400);
  const lien = (await pg.evaluate(()=>window.__liens))[0] || '';
  const msg = decodeURIComponent((lien.split('text=')[1]) || '');
  check('il part sur le numéro du CLIENT',
    lien.startsWith('https://wa.me/33612345678?text='), lien.split('?')[0]);
  check('il fait quatre lignes, lues sur un écran verrouillé',
    msg.split('\n').length === 4, String(msg.split('\n').length));
  check('il porte la référence et le trajet',
    msg.includes('ELA-26-09-0300') && msg.includes('Place Vendôme'),
    msg.replace(/\n/g,' | '));
  /* LE CONTRÔLE QUI COMPTE : ne jamais laisser croire à une voiture
     réservée. Le prix ET l'heure sont fermes chez Elatransfer ; une
     promesse ici est une promesse opposable. */
  check('il dit que la réservation n\'est ferme qu\'après confirmation',
    /ferme dès notre confirmation/.test(msg), msg.replace(/\n/g,' | '));
  check('et il ne nomme NI chauffeur NI véhicule — on ne les connaît pas encore',
    !/chauffeur\s*:/i.test(msg) && !/Berline|Van/.test(msg), msg.replace(/\n/g,' | '));
  check('la course garde qu\'un accusé est parti',
    await pg.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))[0].accuse !== undefined));
  check('et le bouton le dit',
    (await pg.locator('#btnAccuserReception').textContent()).includes('envoyé'),
    await pg.locator('#btnAccuserReception').textContent());

  /* Une fois la course confirmée, c'est « Prévenir le client » qui parle :
     deux messages coup sur coup diraient au client qu'on ne sait pas où on
     en est. */
  await pg.fill('#bbChauffeurNom','Mehmet');
  await pg.fill('#bbChauffeurTel','06 98 76 54 32');
  await pg.locator('#btnConfirmerCourse').click(); await pg.waitForTimeout(400);
  await pg.locator('#btnRetourBord').click(); await pg.waitForTimeout(300);
  await pg.locator('.compteur[data-filtre="confirmee"]').click(); await pg.waitForTimeout(300);
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(400);
  check('sur une course confirmée, l\'accusé s\'efface au profit de « Prévenir le client »',
    await pg.locator('#btnAccuserReception').isHidden()
    && await pg.locator('#btnPrevenirClient').isVisible());

  /* La langue de la course, pas celle de l'exploitant : le client a réservé
     en anglais, il doit être rassuré en anglais. */
  /* ON QUITTE LE BON AVANT DE TOUCHER AU REGISTRE. « Retour » réécrit la
     course depuis l'objet gardé en mémoire — c'est voulu, il enregistre le
     chauffeur saisi — et il écrasait donc la modification faite ici. Piège
     de test, pas de code : l'ordre des deux gestes n'est pas indifférent. */
  await pg.locator('#btnRetourBord').click(); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{
    const l = JSON.parse(localStorage.getItem('ela_bookings'));
    l[0].statut = 'attente'; l[0].langue = 'en';
    localStorage.setItem('ela_bookings', JSON.stringify(l));
    window.__liens = [];
  });
  await pg.locator('.compteur[data-filtre="attente"]').click(); await pg.waitForTimeout(300);
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnAccuserReception').click(); await pg.waitForTimeout(400);
  const msgEn = decodeURIComponent(((await pg.evaluate(()=>window.__liens))[0]||'').split('text=')[1]||'');
  check('une course réservée en anglais reçoit un accusé en anglais',
    msgEn.includes('has received your request')
    && /firm as soon as we confirm/.test(msgEn), msgEn.replace(/\n/g,' | '));
  await c.close();
}

/* =====================================================================
   LA NOTIFICATION AU CLIENT — CE QUI SE PASSE DANS LE NAVIGATEUR
   ---------------------------------------------------------------------
   Le chiffrement lui-même est éprouvé ailleurs, par un déchiffreur
   indépendant (« node test-push.mjs »). Ici on vérifie les deux gestes qui
   l'encadrent, et qui sont ceux où l'on se trompe :

   1. ON NE DEMANDE L'AUTORISATION QUE SUR UN GESTE, et seulement si la
      demande est bien arrivée sur le serveur. La demander au chargement,
      c'est un refus réflexe — et un refus est DÉFINITIF, le navigateur ne
      repose plus jamais la question.
   2. LA NOTIFICATION NE PORTE NI LE NOM, NI LE NUMÉRO, NI LES ADRESSES du
      client — exactement comme le lien « ?ok= ». Elle est chiffrée de bout
      en bout, mais la règle ne dépend pas du chiffrement : elle dépend de
      ce qui est nécessaire (RGPD 5.1.c).
   ===================================================================== */
/* LE CONTENU DE LA NOTIFICATION, mesuré sur le vrai appel. On intercepte
   l'appel à la fonction et on lit ce qui part. */
{
  const bon = courseServeur('ELA-26-09-0400','Sophie Girard');
  bon.client.telephone = '06 11 22 33 44';
  bon.course.depart = 'Ibis CDG, Roissy (ch. 214)';
  bon.course.departPublic = 'Ibis CDG, Roissy';
  const envois = [];
  const { c, pg } = await espace({ access_token:'jeton', refresh_token:'r', token_type:'bearer' });
  await pg.addInitScript((b)=>{ localStorage.setItem('ela_bookings', JSON.stringify([b])); }, bon);
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', async route => {
    const u = route.request().url();
    if(u.includes('/functions/v1/prevenir-client')){
      envois.push(JSON.parse(route.request().postData()||'{}'));
      await route.fulfill({contentType:'application/json', body:'{"envoyes":1}'});
      return;
    }
    if(u.includes('select=bon')){
      await route.fulfill({contentType:'application/json', body:'[]'}); return;
    }
    await route.fulfill({status:201, body:''});
  });
  await pg.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await pg.waitForTimeout(400);
  await pg.fill('#codeExploitant','12345678');
  await pg.locator('#btnDeverrouiller').click(); await pg.waitForTimeout(700);
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(400);
  await pg.fill('#bbChauffeurNom','Mehmet');
  await pg.fill('#bbChauffeurTel','06 98 76 54 32');
  await pg.locator('#btnConfirmerCourse').click(); await pg.waitForTimeout(700);

  check('confirmer la course envoie la notification, sans qu\'on ait rien à faire',
    envois.length === 1, String(envois.length));
  const n = envois[0] || {};
  const tout = JSON.stringify(n);
  check('elle porte la référence, le chauffeur, le véhicule et l\'heure',
    n.titre.includes('ELA-26-09-0400') && n.corps.includes('Mehmet')
    && n.corps.includes('Berline'), n.titre + ' | ' + n.corps);
  /* LE CONTRÔLE QUI COMPTE. On cherche les VALEURS, pas les libellés :
     chercher le mot « téléphone » passerait au vert avec le numéro écrit
     juste à côté. */
  check('elle ne porte NI le nom NI le numéro du client',
    !tout.includes('Sophie') && !tout.includes('06 11 22 33 44'), tout.slice(0,120));
  check('ni les adresses de la course',
    !tout.includes('Ibis CDG') && !tout.includes('Argenteuil'), tout.slice(0,120));
  /* Le numéro de chambre est le pire des cas : il est sur « depart » mais
     pas sur « departPublic », et une notification qui le porte le diffuse. */
  check('et surtout pas le numéro de chambre',
    !tout.includes('214'), tout.slice(0,120));
  check('le lien est bien celui du bon, celui qui fait passer la course au vert',
    /\?ok=/.test(n.url || ''), n.url);

  /* ELLE NE PEUT PAS FAIRE ÉCHOUER LA CONFIRMATION — même règle que
     l'alerte Telegram. On coupe la fonction et la course doit passer
     confirmée quand même. */
  await pg.locator('#btnRetourBord').click(); await pg.waitForTimeout(300);
  await pg.evaluate(()=>{
    const l = JSON.parse(localStorage.getItem('ela_bookings'));
    l[0].statut = 'attente';
    localStorage.setItem('ela_bookings', JSON.stringify(l));
  });
  await pg.unroute('**yyhzutnuhuytokarynaw.supabase.co/**');
  await pg.route('**yyhzutnuhuytokarynaw.supabase.co/**', r => r.abort());
  await pg.locator('.compteur[data-filtre="attente"]').click(); await pg.waitForTimeout(300);
  await pg.locator('.demande').first().click(); await pg.waitForTimeout(300);
  await pg.locator('#btnConfirmerCourse').click(); await pg.waitForTimeout(700);
  check('fonction injoignable : la course est confirmée QUAND MÊME',
    (await pg.locator('#bbEtat').textContent()) === 'Confirmée',
    await pg.locator('#bbEtat').textContent());
  await c.close();
}

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
