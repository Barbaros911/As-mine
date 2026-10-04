/* =====================================================================
   TEST-NOUVEAU-CONTACT.MJS — où le client reçoit sa confirmation
   ---------------------------------------------------------------------
   4 octobre 2026, option A décidée par Barbaros. UNE question, posée à
   tout le monde : « Où souhaitez-vous recevoir votre confirmation ? ».
   Numéro français : appel / SMS ou WhatsApp. Numéro étranger : WhatsApp,
   Telegram ou iMessage. La demande part TOUJOURS du site, aucune
   application ne s'ouvre au clic.

   Ce qui est verrouillé ici :
   — le numéro est RELU avec son pays : un mobile anglais tapé sans +44 se
     lit « (France) », et c'est là que le client voit son erreur ;
   — la règle est dite avant l'envoi ;
   — les choix suivent le numéro, et un choix devenu invisible est oublié ;
   — la question est obligatoire, et rien ne part sans elle ;
   — aucune application ne s'ouvre au clic, la demande part quand même, et
     le renvoi par WhatsApp reste sur le bon ;
   — le choix part sur le bon déposé ;
   — aucun bouton ne déborde ni ne coupe un mot, jusqu'à 320 px ;
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

/* ---- 1. Numéro français ---- */
{
  const { ctx, p, depots } = await tunnel({ tel:'06 12 34 56 78' });
  check('la question est posée côté client',
    await p.locator('#blocContact').isVisible()
    && (await p.locator('#blocContact .bloc-titre').textContent()).includes('Où souhaitez-vous recevoir votre confirmation'),
    await p.locator('#blocContact .bloc-titre').textContent());
  const visibles = await p.locator('#blocContact [data-contact]:visible').evaluateAll(l=>l.map(b=>b.dataset.contact));
  check('numéro français : appel / SMS ou WhatsApp', visibles.join(',') === 'telephone,whatsapp', visibles.join(','));
  check('rien n\'est présélectionné : c\'est au client de répondre',
    (await p.locator('#blocContact [aria-pressed="true"]').count()) === 0);
  check('chaque choix porte son pictogramme',
    (await p.locator('#blocContact [data-contact]:visible svg.canal-ico').count()) === 2);
  const relu = (await p.locator('#telRelu').textContent()) || '';
  check('le numéro est relu tel qu\'on le composera, avec le pays',
    await p.locator('#telRelu').isVisible() && relu.includes('+33 6 12 34 56 78') && relu.includes('(France)'), relu);
  check('la règle est dite avant l\'envoi',
    (await p.locator('#blocCoordonnees [data-t="regle_contact"]').textContent()).includes('ne pourra pas être confirmée'));
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(600);
  check('sans réponse, la demande ne part pas et on le dit',
    depots.length === 0 && await p.locator('#erreurContact').isVisible(), 'dépôts : ' + depots.length);
  await p.locator('[data-contact="telephone"]').click();
  check('le choix fait disparaître le message', await p.locator('#erreurContact').isHidden());
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  check('aucune application ne s\'ouvre au clic',
    (await p.evaluate(()=>window.__ouverts)).length === 0, JSON.stringify(await p.evaluate(()=>window.__ouverts)));
  const bon = depots[0] && depots[0].bon;
  check('la demande part sur le serveur avec « appel / SMS »',
    bon && bon.contact && bon.contact.envoi === 'site' && bon.contact.prefere === 'telephone',
    JSON.stringify(bon && bon.contact));
  check('le bon s\'affiche', await p.locator('#ecran-bon').isVisible());
  await p.locator('#btnRenvoyer').click(); await p.waitForTimeout(300);
  const renvoi = await p.evaluate(()=>window.__ouverts);
  check('le renvoi par WhatsApp reste sur le bon, message écrit',
    renvoi.length === 1 && renvoi[0].startsWith('https://wa.me/33759312433?text=Demande'), JSON.stringify(renvoi));
  await ctx.close();
}

/* ---- 2. Un mobile anglais tapé SANS +44 : le pays relu le trahit ---- */
{
  const { ctx, p } = await tunnel({ tel:'0770090012' });
  const relu = (await p.locator('#telRelu').textContent()) || '';
  check('un numéro étranger tapé sans indicatif se relit « (France) » : le client voit son erreur',
    relu.includes('(France)'), relu);
  await p.locator('[data-contact="telephone"]').click();
  await p.fill('#clientTel','+44 7700 900123'); await p.waitForTimeout(100);
  const relu2 = (await p.locator('#telRelu').textContent()) || '';
  check('avec +44, il se relit « (Royaume-Uni) »', relu2.includes('+44') && relu2.includes('Royaume-Uni'), relu2);
  const visibles = await p.locator('#blocContact [data-contact]:visible').evaluateAll(l=>l.map(b=>b.dataset.contact));
  check('numéro étranger : WhatsApp, Telegram ou iMessage', visibles.join(',') === 'whatsapp,telegram,messages', visibles.join(','));
  check('« Appel / SMS », devenu invisible, est oublié — il ne partirait pas en douce',
    (await p.locator('#blocContact [aria-pressed="true"]').count()) === 0);
  check('la note explique pourquoi une application', await p.locator('#noteContactEtranger').isVisible());
  await ctx.close();
}

/* ---- 3. Numéro étranger : Telegram choisi, rien ne s'ouvre ---- */
{
  const { ctx, p, depots } = await tunnel({ tel:'+49 151 23456789' });
  await p.locator('[data-contact="telegram"]').click();
  await p.locator('#btnConfirmer').click(); await p.waitForTimeout(1000);
  check('numéro étranger : rien ne s\'ouvre non plus', (await p.evaluate(()=>window.__ouverts)).length === 0);
  const bon = depots[0] && depots[0].bon;
  check('le bon déposé dit « à confirmer par Telegram »',
    bon && bon.contact && bon.contact.prefere === 'telegram', JSON.stringify(bon && bon.contact));
  await ctx.close();
}

/* ---- 4. Aucun bouton ne sort de sa carte ni ne coupe un mot ---- */
for (const largeur of [320, 390]) {
  for (const tel of ['06 12 34 56 78', '+44 7700 900123']) {
    const { ctx, p } = await tunnel({ tel });
    await p.setViewportSize({ width: largeur, height: 844 }); await p.waitForTimeout(150);
    const sortis = await p.evaluate(()=>{
      const carte = document.getElementById('blocContact').getBoundingClientRect();
      return Array.from(document.querySelectorAll('#blocContact .choix')).filter(b=>{
        const r = b.getBoundingClientRect();
        return r.width && (r.left < carte.left - 0.5 || r.right > carte.right + 0.5);
      }).map(b=>b.textContent.trim());
    });
    check(largeur + ' px, ' + tel + ' : aucun choix ne déborde de sa carte', sortis.length === 0, sortis.join(', '));
    const coupes = await p.evaluate(()=>Array.from(document.querySelectorAll('#blocContact .choix span')).filter(s=>{
      if(!s.offsetWidth) return false;
      return s.textContent.trim().split(/\s+/).some(mot=>{
        const m = document.createElement('span');
        m.style.cssText = 'font:' + getComputedStyle(s).font + ';position:absolute;white-space:nowrap';
        m.textContent = mot; document.body.appendChild(m); const w = m.getBoundingClientRect().width; m.remove();
        return w > s.getBoundingClientRect().width + 0.5;
      });
    }).map(s=>s.textContent.trim()));
    check(largeur + ' px, ' + tel + ' : aucun nom n\'est coupé en deux', coupes.length === 0, coupes.join(', '));
    await ctx.close();
  }
}

/* ---- 5. En anglais ---- */
{
  const { ctx, p } = await tunnel({ tel:'+44 7700 900123', langue:'en' });
  check('le numéro relu parle anglais', (await p.locator('#telRelu').textContent()).includes('We will contact you on'),
    await p.locator('#telRelu').textContent());
  check('et nomme le pays en anglais', (await p.locator('#telRelu').textContent()).includes('United Kingdom'));
  check('la question est traduite',
    (await p.locator('#blocContact .bloc-titre').textContent()).includes('Where would you like to receive your confirmation'),
    await p.locator('#blocContact .bloc-titre').textContent());
  await p.fill('#clientTel','06 12 34 56 78'); await p.waitForTimeout(100);
  check('« Call / SMS » est traduit', (await p.locator('[data-contact="telephone"]').textContent()).includes('Call / SMS'));
  await ctx.close();
}

/* ---- 6. L'admin écrit par le canal du client ---- */
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
      bon('ELA-26-10-SMSMS','John Doe','06 98 76 54 32',{envoi:'site',prefere:'telephone'}),
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
  check('admin : « appel ou SMS » est dit, Appeler et Messages passent en plein',
    (await p.locator('#bbContact').textContent()).includes('appel ou SMS')
    && await p.locator('#bbAppeler').getAttribute('class') === 'bouton'
    && await p.locator('#bbMessages').getAttribute('class') === 'bouton', await p.locator('#bbContact').textContent());
  check('admin : Messages a son bouton, vers le numéro du client',
    await p.locator('#bbMessages').getAttribute('href') === 'sms:+33698765432');
  await p.locator('#btnAccuserReception').click(); await p.waitForTimeout(600);
  check('« Accuser réception » part par SMS, texte écrit (gratuit vers un numéro français)',
    sms.length === 1 && sms[0].startsWith('sms:+33698765432') && /[?&]body=/.test(sms[0]), JSON.stringify(sms));

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
