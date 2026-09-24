/* =====================================================================
   TEST-NOUVEAU-WHATSAPP.MJS — la demande part au serveur, WhatsApp est le repli
   ---------------------------------------------------------------------
   24 septembre 2026, à la demande de Barbaros : « comment faire en sorte
   que le client puisse envoyer une demande sans qu'automatiquement il
   ouvre WhatsApp ? ». Jusque-là, « Confirmer » ouvrait WhatsApp à chaque
   réservation, en PLUS du dépôt sur le serveur.

   Ce qui est verrouillé ici :

   — LE SERVEUR RÉPOND : WHATSAPP NE S'OUVRE PAS. La demande est dans le
     tableau de bord et l'alerte Telegram part du serveur ; ouvrir WhatsApp
     ne ferait que sortir le client du site et doubler le message.
     Et le bouton WhatsApp n'est PAS proposé : proposer d'envoyer une
     demande déjà reçue ferait croire qu'elle ne l'est pas.
   — LE SERVEUR ÉCHOUE : LE REPLI EST LÀ, EN BOUTON PLEIN, ET IL MARCHE.
     « Le repli est sacré » : sans lui, un client croit avoir réservé et
     personne ne sait rien. On ne se contente pas de le voir, on APPUIE
     dessus et on lit le message qui part — un bouton mort au bout d'un
     écran est pire qu'un bouton absent.
   — RIEN N'EST ATTENDU AVANT L'OUVERTURE DE WHATSAPP dans son gestionnaire.
     Safari n'autorise l'ouverture d'un onglet que pendant l'exécution
     SYNCHRONE du clic ; c'est pour ça que l'ouverture ne peut PAS être
     automatique après la réponse du serveur, et doit être un geste.
   — LE CONTENU DU MESSAGE, ligne par ligne, et sa STRUCTURE, que relira
     « Coller une demande » : les deux premières valeurs « … : … » sont les
     adresses, le dernier montant en euros est le prix, la dernière ligne
     est « nom — téléphone » sans deux-points.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-whatsapp.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

async function reserver(statutServeur){
  const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
  const p = await ctx.newPage();
  p.on('pageerror',e=>errs.push(e.message));
  await p.route('**://photon.komoot.io/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.3376,48.8606]},properties:{name:"Place Vendôme",osm_key:"tourism",osm_value:"attraction",postcode:"75001",city:"Paris",countrycode:"FR"}}]})}));
  await p.route('**://api-adresse.data.gouv.fr/**', r => r.fulfill({contentType:'application/json',body:JSON.stringify({features:[
    {geometry:{coordinates:[2.2467,48.9478]},properties:{label:"Argenteuil, 95100 Argenteuil"}}]})}));
  /* OpenRouteService passe AVANT OSRM depuis qu'une clé est posée dans la
     page : on le coupe, sinon les prix vérifiés plus bas dépendraient du
     réseau de la machine. */
  await p.route('**://api.openrouteservice.org/**', r => r.abort());
  await p.route('**://router.project-osrm.org/**', r => r.fulfill({contentType:'application/json',
    body:JSON.stringify({routes:[{distance:24300,duration:2040}]})}));
  await p.route('**supabase.co/**', r => r.fulfill({status:statutServeur, body:''}));
  await ctx.addInitScript(()=>{
    window.__journal = [];
    window.open = (u)=>{ window.__journal.push({quoi:'wa', url:u}); return null; };
    const f = window.fetch;
    window.fetch = function(u){
      if(String(u).includes('supabase')) window.__journal.push({quoi:'depot'});
      return f.apply(this, arguments);
    };
  });
  await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(400);
  await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#departList [role=option]').first().click();
  await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(800);
  await p.locator('#arriveeList [role=option]').first().click();
  const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  await p.fill('#date', d); await p.fill('#heure','10:00');
  await p.evaluate(()=>{ document.getElementById('passagers').value='3'; });
  await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
  await p.locator('.veh-carte').first().click();
  await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
  await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
  await p.locator('[data-paiement="carte"]').click();
  await p.locator('#btnConfirmer').click();
  await p.waitForFunction(()=>document.getElementById('etatEnvoi')
    && /\bok\b|\bko\b/.test(document.getElementById('etatEnvoi').className), null, {timeout:15000});
  return {ctx, p};
}

/* ═══ 1. LE SERVEUR RÉPOND ═══ */
{
  const {ctx, p} = await reserver(201);
  const j = await p.evaluate(()=>window.__journal);
  check('la demande est déposée sur le serveur', j.some(e=>e.quoi==='depot'));
  check('WhatsApp ne s\'ouvre PAS tout seul quand le serveur a reçu la demande',
    !j.some(e=>e.quoi==='wa'), j.map(e=>e.quoi).join(' → '));
  const dit = await p.locator('#envoiTexte').textContent();
  check('le client lit que sa demande est arrivée',
    /parvenue|reçu/i.test(dit) && /répond|disponibilité/i.test(dit), dit);
  check('et ce message ne le renvoie pas vers WhatsApp', !dit.includes('WhatsApp'), dit);
  check('aucun bouton WhatsApp n\'est proposé sur une demande reçue',
    !(await p.locator('#btnRenvoyer').isVisible()));
  check('ni la phrase « si WhatsApp ne s\'est pas ouvert »',
    !(await p.locator('#noteRenvoi').isVisible()));
  const garde = await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_courses')||'[]')[0]);
  check('le bon garde qu\'il est arrivé (rouvert plus tard, il ne propose pas de renvoi)',
    garde && garde.depose === true, garde && String(garde.depose));
  /* Rouvert depuis « Réservations », un bon reçu ne propose toujours rien. */
  await p.locator('[data-ecran="ecran-courses"]').first().click();
  await p.locator('.course').first().click();
  check('rouvert depuis « Réservations », toujours aucun bouton WhatsApp',
    !(await p.locator('#btnRenvoyer').isVisible()));
  check('aucun débordement horizontal',
    (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
  await ctx.close();
}

/* ═══ 2. LE SERVEUR ÉCHOUE — LE REPLI ═══ */
{
  const {ctx, p} = await reserver(500);
  let j = await p.evaluate(()=>window.__journal);
  check('même en échec, WhatsApp ne s\'ouvre pas SANS geste du client',
    !j.some(e=>e.quoi==='wa'), j.map(e=>e.quoi).join(' → '));
  const dit = await p.locator('#envoiTexte').textContent();
  check('l\'écriteau dit que la demande n\'est pas arrivée, et quoi faire',
    /pas pu|could not/i.test(dit) && /WhatsApp/.test(dit), dit);
  const btn = p.locator('#btnRenvoyer');
  check('le bouton WhatsApp apparaît', await btn.isVisible());
  check('en bouton PLEIN : c\'est le seul chemin qui reste',
    (await btn.getAttribute('class')) === 'bouton', await btn.getAttribute('class'));
  check('il dit ce qu\'il fait', /Envoyer ma demande par WhatsApp/.test(await btn.textContent()),
    (await btn.textContent()).trim());
  await btn.click();
  j = await p.evaluate(()=>window.__journal);
  const wa = j.find(e=>e.quoi==='wa');
  check('un appui ouvre WhatsApp', !!wa);

  const msg = wa ? decodeURIComponent(wa.url.split('text=')[1]) : '';
  const L = msg.split('\n');
  check('neuf lignes', L.length===9, L.length+'');
  check('il commence par « Demande de réservation »', (L[0]||'').startsWith('Demande de réservation — '), L[0]);
  check('avec la référence', /ELA-\d{2}-\d{2}-\d{4}/.test(L[0]||''), L[0]);
  check('adresse de départ', (L[1]||'').startsWith('Départ : ') && L[1].includes('Vendôme'), L[1]);
  check('adresse d\'arrivée', (L[2]||'').startsWith('Arrivée : ') && L[2].includes('Argenteuil'), L[2]);
  check('date et heure', /^Date : \d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}$/.test(L[3]||''), L[3]);
  check('nombre de passagers', L[4]==='Passagers : 3 passagers · 1 bagage', L[4]);
  check('berline ou van', L[5]==='Véhicule : Berline', L[5]);
  // Le chauffeur doit savoir s'il emporte son terminal ; la ligne passe
  // AVANT le prix pour que le dernier montant en euros reste la course.
  check('mode de règlement, en français', L[6]==='Paiement : Carte bancaire', L[6]);
  check('prix du site', L[7]==='Prix : 60,00 €', L[7]);
  check('nom et téléphone du client, en dernier', L[8]==='Jean Martin — 06 12 34 56 78', L[8]);
  const valeurs = L.filter(x=>/\s:\s/.test(x)).map(x=>x.slice(x.indexOf(' : ')+3).trim());
  check('les deux premières valeurs « … : … » restent les adresses',
    !!valeurs[1] && valeurs[0].includes('Vendôme') && valeurs[1].includes('Argenteuil'));
  check('la dernière ligne est « nom — téléphone », sans deux-points',
    !!L[8] && L[8].includes(' — ') && !L[8].includes(' : '));
  check('le dernier montant en euros est le prix',
    ((msg.match(/(\d[\d\s ]*[.,]\d{2})\s*€/g)||['']).pop()).replace(/\s/g,'')==='60,00€');

  /* Rouvert depuis « Réservations », un bon jamais parvenu garde son repli. */
  await p.locator('[data-ecran="ecran-courses"]').first().click();
  await p.locator('.course').first().click();
  check('rouvert depuis « Réservations », un bon jamais parvenu garde son bouton',
    await p.locator('#btnRenvoyer').isVisible());
  await ctx.close();
}

/* ═══ 3. CE QUE SAFARI EXIGE ═══
   Il n'autorise l'ouverture d'un onglet que pendant l'exécution SYNCHRONE
   du gestionnaire de clic : ni « await » ni « .then( » entre le début du
   gestionnaire du bouton et « window.open ». Invisible autrement — un banc
   sans Safari ne reproduira jamais le blocage. */
const source = await (await fetch('http://127.0.0.1:8099/index.html')).text();
const debut = source.indexOf('getElementById("btnRenvoyer").addEventListener');
const ouverture = source.indexOf('window.open("https://wa.me/', debut);
const avant = source.slice(debut, ouverture);
check('rien n\'est ATTENDU avant l\'ouverture de WhatsApp — Safari la bloquerait',
  debut > 0 && ouverture > debut && !/\bawait\b/.test(avant) && !/\.then\s*\(/.test(avant),
  (avant.match(/\bawait\b|\.then\s*\(/g) || ['rien']).join(' '));
/* « Confirmer » n'ouvre plus WhatsApp du tout côté client : la seule
   ouverture restante de son gestionnaire serait un retour de l'ancien
   comportement. */
const conf = source.indexOf('getElementById("btnConfirmer").addEventListener');
const finConf = source.indexOf('function afficherEtatEnvoi', conf);
check('le gestionnaire de « Confirmer » n\'ouvre plus WhatsApp',
  conf > 0 && finConf > conf && !source.slice(conf, finConf).includes('window.open('));

await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
