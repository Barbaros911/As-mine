/* =====================================================================
   TEST-NOUVEAU-CONTACT.MJS — par où part la demande, par où joindre le client
   ---------------------------------------------------------------------
   4 octobre 2026, à la demande de Barbaros. Le client choisit d'envoyer sa
   demande par WhatsApp, Telegram, Messages ou « le site seulement ». Un
   numéro ÉTRANGER envoyé par le site seul est le SEUL cas où l'on demande
   par quelle application le joindre : un appel international coûte cher,
   un numéro français se joint par appel ou SMS, gratuits.

   Ce qui est verrouillé ici :
   — le numéro est RELU au client avec son pays : un mobile anglais tapé
     sans +44 se lit « (France) », et c'est là qu'il voit son erreur ;
   — la règle « sans réponse, aucun chauffeur » est écrite avant l'envoi ;
   — WhatsApp reste le choix d'ouverture : le défaut ne change pas ;
   — « le site seulement » n'ouvre rien, et la demande part quand même ;
   — la question n'apparaît QUE pour un numéro étranger envoyé par le site,
     et elle est obligatoire dans ce cas ;
   — Messages ouvre « sms: » vers Elatransfer, message écrit ;
   — Telegram n'est pas proposé pour l'envoi tant qu'Elatransfer n'a pas
     de nom d'utilisateur : un bouton qui n'ouvre rien est pire qu'absent ;
   — le choix part sur le bon déposé ;
   — dans l'admin, le canal est dit, son bouton passe en plein, et
     « Accuser réception » écrit par CE canal.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-contact.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

async function tunnel(options){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,
                                  locale: options.langue === 'en' ? 'en-GB' : 'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  const sms = [];
  p.on('request', r => { if(r.url().startsWith('sms:')) sms.push(r.url()); });
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  const depots = [];
  await p.route('**supabase.co/**', r => {
    if(r.request().method() === 'POST' && r.request().url().includes('/courses')){
      try{ depots.push(JSON.parse(r.request().postData())); }catch(e){}
    }
    return r.fulfill({status:201, body:''});
  });
  await ctx.addInitScript(()=>{
    window.__ouverts = [];
    window.open = (u)=>{ window.__ouverts.push(u); return null; };
  });
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  if(options.langue === 'en'){ await p.locator('.langues button[data-langue="en"]').first().click(); }
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
  await p.fill('#clientNom','Jean Martin');
  await p.fill('#clientTel', options.tel);
  await p.locator('[data-paiement="carte"]').click();
  return { ctx, p, depots, sms };
}

/* ---- 1. Numéro français, rien de touché : WhatsApp, comme avant ---- */
{
  const { ctx, p, depots } = await tunnel({ tel:'06 12 34 56 78' });
  check('le bloc « Envoyer ma demande par » est là côté client',
    await p.locator('#blocEnvoi').isVisible());
  check('WhatsApp est le choix d\'ouverture : le défaut ne change pas',
    await p.locator('[data-envoi="whatsapp"]').getAttribute('aria-pressed') === 'true');
  check('Telegram n\'est PAS proposé pour l\'envoi sans nom d\'utilisateur Elatransfer',
    await p.locator('[data-envoi="telegram"]').isHidden());
  const relu = (await p.locator('#telRelu').textContent()) || '';
  check('le numéro est relu tel qu\'on le composera, avec le pays',
    await p.locator('#telRelu').isVisible() && relu.includes('+33 6 12 34 56 78') && relu.includes('(France)'), relu);
  check('la règle est dite avant l\'envoi : sans réponse, aucun chauffeur',
    (await p.locator('#blocCoordonnees [data-t="regle_contact"]').textContent()).includes('aucun chauffeur'));
  check('numéro français : aucune question sur le canal',
    await p.locator('#blocContact').isHidden());
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  const ouverts = await p.evaluate(()=>window.__ouverts);
  check('WhatsApp s\'ouvre vers Elatransfer avec la demande écrite',
    ouverts.length === 1 && ouverts[0].startsWith('https://wa.me/33759312433?text='), JSON.stringify(ouverts));
  const bon = depots[0] && depots[0].bon;
  check('le bon déposé dit « envoyée par WhatsApp, à joindre par WhatsApp »',
    bon && bon.contact && bon.contact.envoi === 'whatsapp' && bon.contact.prefere === 'whatsapp',
    JSON.stringify(bon && bon.contact));
  await ctx.close();
}

/* ---- 2. Un mobile anglais tapé SANS +44 : le pays relu le trahit ---- */
{
  const { ctx, p } = await tunnel({ tel:'0770090012' });
  const relu = (await p.locator('#telRelu').textContent()) || '';
  check('un numéro étranger tapé sans indicatif se relit « (France) » : le client voit son erreur',
    relu.includes('(France)'), relu);
  await p.fill('#clientTel','+44 7700 900123'); await p.waitForTimeout(100);
  const relu2 = (await p.locator('#telRelu').textContent()) || '';
  check('avec +44, il se relit « (Royaume-Uni) »', relu2.includes('+44') && relu2.includes('Royaume-Uni'), relu2);
  await ctx.close();
}

/* ---- 3. Numéro français, « le site seulement » : rien ne s'ouvre ---- */
{
  const { ctx, p, depots } = await tunnel({ tel:'01 45 67 89 10' });
  await p.locator('[data-envoi="site"]').click();
  check('un FIXE français est accepté, et ne déclenche aucune question',
    await p.locator('#blocContact').isHidden());
  check('« Ce qui se passe ensuite » ne promet plus WhatsApp',
    !(await p.locator('#suite1').textContent()).includes('WhatsApp'), await p.locator('#suite1').textContent());
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  check('« le site seulement » n\'ouvre aucune application',
    (await p.evaluate(()=>window.__ouverts)).length === 0);
  const bon = depots[0] && depots[0].bon;
  check('mais la demande part quand même sur le serveur, canal « site », sans préférence',
    bon && bon.contact && bon.contact.envoi === 'site' && bon.contact.prefere === '',
    JSON.stringify(bon && bon.contact));
  check('et le bon s\'affiche', await p.locator('#ecran-bon').isVisible());
  await ctx.close();
}

/* ---- 4. Numéro ÉTRANGER, « le site seulement » : la seule question ---- */
{
  const { ctx, p, depots } = await tunnel({ tel:'+44 7700 900123' });
  check('numéro étranger envoyé par WhatsApp : pas de question',
    await p.locator('#blocContact').isHidden());
  await p.locator('[data-envoi="site"]').click();
  check('numéro étranger par le site seul : on demande comment le joindre',
    await p.locator('#blocContact').isVisible());
  /* La question doit être LA SIENNE : deux clés de texte portant le même nom
     qu'un autre écran l'avaient remplacée par « Nous joindre ». */
  check('la question dit bien « Comment voulez-vous être contacté ? »',
    (await p.locator('#blocContact .bloc-titre').textContent()).includes('Comment voulez-vous être contacté'),
    await p.locator('#blocContact .bloc-titre').textContent());
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(600);
  check('sans réponse, la demande ne part pas et on le dit',
    depots.length === 0 && await p.locator('#erreurContact').isVisible(), 'dépôts : ' + depots.length);
  await p.locator('[data-contact="telegram"]').click();
  check('le choix fait disparaître le message', await p.locator('#erreurContact').isHidden());
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  const bon = depots[0] && depots[0].bon;
  check('le bon déposé dit « par le site, à joindre par Telegram »',
    bon && bon.contact && bon.contact.envoi === 'site' && bon.contact.prefere === 'telegram',
    JSON.stringify(bon && bon.contact));
  check('et rien ne s\'ouvre', (await p.evaluate(()=>window.__ouverts)).length === 0);
  await ctx.close();
}

/* ---- 5. Messages : « sms: » vers Elatransfer, message écrit ---- */
{
  const { ctx, p, depots, sms } = await tunnel({ tel:'+1 415 555 0132' });
  await p.locator('[data-envoi="messages"]').click();
  check('« Ce qui se passe ensuite » annonce Messages',
    (await p.locator('#suite1').textContent()).includes('Messages'));
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  check('Messages s\'ouvre sur le numéro d\'Elatransfer, message déjà écrit',
    sms.length === 1 && sms[0].startsWith('sms:+33759312433') && /[?&]body=Demande/.test(sms[0]), JSON.stringify(sms));
  check('la page n\'est pas quittée : le bon reste affiché', await p.locator('#ecran-bon').isVisible());
  const bon = depots[0] && depots[0].bon;
  check('le bon déposé dit « envoyée par Messages »',
    bon && bon.contact && bon.contact.envoi === 'messages' && bon.contact.prefere === 'messages',
    JSON.stringify(bon && bon.contact));
  await ctx.close();
}

/* ---- 6. En anglais ---- */
{
  const { ctx, p } = await tunnel({ tel:'+44 7700 900123', langue:'en' });
  check('le numéro relu parle anglais', (await p.locator('#telRelu').textContent()).includes('We will contact you on'),
    await p.locator('#telRelu').textContent());
  check('et nomme le pays en anglais', (await p.locator('#telRelu').textContent()).includes('United Kingdom'));
  await p.locator('[data-envoi="site"]').click();
  check('la question est traduite', (await p.locator('#blocContact .bloc-titre').textContent()).includes('How would you like'),
    await p.locator('#blocContact .bloc-titre').textContent());
  check('« Website only » est traduit', (await p.locator('[data-envoi="site"]').textContent()).includes('Website only'));
  await ctx.close();
}

/* ---- 7. L'admin écrit par le canal du client ---- */
{
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://*.supabase.co/**', r => r.abort());
  const sms = [];
  p.on('request', r => { if(r.url().startsWith('sms:')) sms.push(r.url()); });
  const cree = new Date(Date.now()-30*60000).toISOString();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  const bon = (ref, nom, tel, contact) => ({ ref, statut:'attente', cree,
    course:{ depart:'Place Vendôme, 75001 Paris', arrivee:'Argenteuil, 95100 Argenteuil', date:d, heure:'10:00',
             vehicule:'Berline', vehiculeCle:'berline', passagers:'2 passagers' },
    client:{ nom, telephone:tel }, contact, prix:{ total:60, ht:54.55, tva:5.45 }, paiement:'carte', paiementNom:'Carte bancaire' });
  await ctx.addInitScript((l)=>{
    localStorage.setItem('ela_bookings', JSON.stringify(l));
    window.__ouverts = []; window.open = (u)=>{ window.__ouverts.push(u); return null; };
  }, [bon('ELA-26-10-TGTGT','Anna Smith','+44 7700 900123',{envoi:'site',prefere:'telegram'}),
      bon('ELA-26-10-SMSMS','John Doe','+1 415 555 0132',{envoi:'messages',prefere:'messages'}),
      bon('ELA-26-10-WAWAW','Jean Martin','06 12 34 56 78',undefined)]);
  await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.fill('#codeExploitant','12345678');
  await p.locator('#btnDeverrouiller').click(); await p.waitForTimeout(700);
  const ouvrir = async (nom) => { await p.locator('.demande', { hasText: nom }).first().click(); await p.waitForTimeout(400); };

  await ouvrir('Anna Smith');
  check('admin : le canal choisi est dit en clair',
    (await p.locator('#bbContact').textContent()).includes('Telegram'), await p.locator('#bbContact').textContent());
  check('admin : le bouton Telegram passe en plein, les autres restent en creux',
    await p.locator('#bbTelegram').getAttribute('class') === 'bouton'
    && await p.locator('#bbWhatsapp').getAttribute('class') === 'bouton-fantome');
  check('admin : le bouton Telegram vise le numéro du client',
    await p.locator('#bbTelegram').getAttribute('href') === 'https://t.me/+447700900123');
  await p.locator('#btnAccuserReception').click(); await p.waitForTimeout(400);
  let ouverts = await p.evaluate(()=>window.__ouverts);
  check('« Accuser réception » ouvre Telegram, pas WhatsApp',
    ouverts.length === 1 && ouverts[0] === 'https://t.me/+447700900123', JSON.stringify(ouverts));
  check('et dit que le message est copié', (await p.locator('#bbContact').textContent()).includes('copié'));

  await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.fill('#codeExploitant','12345678').catch(()=>{});
  await p.locator('#btnDeverrouiller').click().catch(()=>{}); await p.waitForTimeout(700);
  await ouvrir('John Doe');
  check('admin : Messages a son bouton, vers le numéro du client',
    await p.locator('#bbMessages').getAttribute('href') === 'sms:+14155550132');
  await p.locator('#btnAccuserReception').click(); await p.waitForTimeout(600);
  check('« Accuser réception » ouvre Messages avec le texte écrit',
    sms.length === 1 && sms[0].startsWith('sms:+14155550132') && /[?&]body=/.test(sms[0]), JSON.stringify(sms));

  await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.fill('#codeExploitant','12345678').catch(()=>{});
  await p.locator('#btnDeverrouiller').click().catch(()=>{}); await p.waitForTimeout(700);
  await ouvrir('Jean Martin');
  check('admin : une course sans canal (ancienne, saisie, collée) ne dit rien de plus',
    await p.locator('#bbContact').isHidden());
  await p.evaluate(()=>{ window.__ouverts = []; });
  await p.locator('#btnAccuserReception').click(); await p.waitForTimeout(400);
  ouverts = await p.evaluate(()=>window.__ouverts);
  check('et « Accuser réception » part par WhatsApp, comme toujours',
    ouverts.length === 1 && ouverts[0].startsWith('https://wa.me/33612345678?text='), JSON.stringify(ouverts));
  await ctx.close();
}

check('aucune erreur JavaScript', errs.length === 0, errs.join(' | '));
await b.close();
console.log('=== RÉUSSIS ('+ok.length+') ===');
if(ko.length){ console.log('=== ÉCHECS ('+ko.length+') ==='); ko.forEach(x=>console.log('  ✘ '+x)); process.exit(1); }
