/* =====================================================================
   TEST-NOUVEAU-PAIEMENT.MJS — par lien, avant le départ (10/10/2026)
   ---------------------------------------------------------------------
   DEPUIS LE 10 OCTOBRE 2026 LE CLIENT NE CHOISIT PLUS. Barbaros : « le
   client paie avant quoi qu'il arrive ». Il paie le CHAUFFEUR, par le lien
   que celui-ci envoie et qu'Elatransfer transmet avec la confirmation, au
   plus tard 2 h avant le départ (la veille avant 22 h avant 8 h). Une
   annulation du client n'est pas remboursée. Le COMPTOIR d'hôtel garde sa
   question carte / espèces : test-nouveau-reception l'éprouve.
   Ce qui est verrouillé ici, côté client : plus de boutons, les trois
   règles écrites AVANT « Confirmer », la course part sans choix, le bon et
   le message disent « lien », l'anglais suit. Côté exploitant : le lien
   collé part dans « Prévenir le client » avec le montant et l'heure
   limite, un lien non https est refusé, un service inconnu est signalé,
   « Payé » retire la ligne, et l'écriteau « Paiement attendu » s'allume
   dans l'heure qui précède la limite — et pas avant.

   CE QUI SUIT EST L'HISTOIRE DE LA QUESTION D'AVANT (gardée pour le comptoir) :
   ---------------------------------------------------------------------
   POURQUOI CETTE QUESTION EXISTE. Le prix ne change pas d'un mode à
   l'autre : ce n'est pas un choix commercial, c'est une information de
   PRÉPARATION. Un chauffeur qui apprend en montant que le client règle
   par carte, et qui n'a pas son terminal, se retrouve à chercher un
   distributeur avec un client pressé — et il n'y en a pas dans un
   parking d'aéroport à 5 h du matin.

   Ce qui est verrouillé ici :

   — ON DEMANDE, ON N'EXPLIQUE PAS. Le client répond « carte » ou
     « espèces » ; ce que le chauffeur en fait est notre affaire. Une
     question suivie de sa justification donne l'impression qu'on se
     justifie de la poser.
   — RIEN N'EST PRÉSÉLECTIONNÉ. Cocher « Espèces » par défaut donnerait
     une réponse que le client n'a pas donnée, et c'est exactement le cas
     où le chauffeur arrive sans terminal devant quelqu'un qui n'a pas un
     billet sur lui.
   — LE CHOIX EST OBLIGATOIRE. Sans lui, « Confirmer » ne confirme pas et
     la page dit pourquoi.
   — UN SEUL DES DEUX À LA FOIS, et il se voit : « aria-pressed » porte
     l'état, pas seulement la couleur.
   — LE LIBELLÉ SUIT LA LANGUE DU CLIENT À L'ÉCRAN, et reste en FRANÇAIS
     partout où c'est Barbaros ou son chauffeur qui lit — le message
     WhatsApp et le bon de l'exploitant.
   — LA PLACE DE LA LIGNE DANS LE MESSAGE : avant le prix, pour que le
     dernier montant en euros reste celui de la course. C'est ce que
     relira « Coller une demande ».
   — UNE COURSE ENREGISTRÉE AVANT que ce choix existe reste lisible : on
     affiche un tiret, on n'invente pas un mode de règlement.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-paiement.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];
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
await p.route('**supabase.co/**', r => r.fulfill({status:201, body:''}));
await ctx.addInitScript(()=>{
  window.__liens = [];
  window.open = (u)=>{ window.__liens.push(u); return null; };
});

await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
const d = new Date(Date.now()+3*864e5).toISOString().slice(0,10);
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);

// ---- Plus de question : la règle, écrite avant « Confirmer » ----
check('les boutons carte / espèces ne sont plus montrés au client',
  !(await p.locator('[data-paiement="especes"]').isVisible())
  && !(await p.locator('[data-paiement="carte"]').isVisible()));
check('le bloc dit « par lien de paiement, avant le départ »',
  await p.locator('#paiementLien').isVisible()
  && /lien de paiement, avant le départ/i.test(await p.locator('#paiementLien').innerText()));
const regles = await p.locator('#paiementLien li').allInnerTexts();
check('les trois règles sont écrites : lien avec la confirmation, limite, remboursement',
  regles.length === 3 && /confirmation/.test(regles[0]) && /2 h avant/.test(regles[1])
  && /22 h/.test(regles[1]) && /annulée/.test(regles[1]) && /pas remboursée/.test(regles[2])
  && /totalité/.test(regles[2]), regles.join(' | '));
/* LA RÈGLE EST LUE AVANT LE BOUTON : une règle de non-remboursement lue
   après coup ne protège personne. On compare les positions à l'écran. */
const posRegle = await p.evaluate(()=>({
  r: document.getElementById('paiementLien').getBoundingClientRect().top + scrollY,
  b: document.getElementById('btnConfirmer').getBoundingClientRect().top + scrollY }));
check('la règle est au-dessus de « Confirmer »', posRegle.r < posRegle.b, JSON.stringify(posRegle));
check('le bloc ne parle pas du terminal du chauffeur',
  !(await p.locator('#blocPaiement').innerText()).toLowerCase().includes('terminal'));
check('le titre du paiement affirme, il n\'interroge pas',
  !/[?？]\s*$/.test(await p.locator('#blocPaiement .bloc-titre').textContent()),
  await p.locator('#blocPaiement .bloc-titre').textContent());
/* « Aucun paiement en ligne » était VRAI avec le paiement à bord ; il est
   devenu faux. Il ne doit plus se lire nulle part sur le récapitulatif. */
const foisEnLigne = await p.evaluate(()=>
  (document.getElementById('ecran-recap').innerText.match(/paiement en ligne/gi) || []).length);
check('« aucun paiement en ligne » n\'est plus écrit sur le récapitulatif',
  foisEnLigne === 0, foisEnLigne + ' fois');

// ---- La course part sans choix ----
await p.fill('#clientNom','Jean Martin'); await p.fill('#clientTel','06 12 34 56 78');
await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(800);
check('la course part sans qu\'on demande un mode de règlement', await p.locator('#ecran-bon').isVisible());
check('aucun refus « indiquez comment vous réglerez »', !(await p.locator('#erreurPaiement').isVisible()));
check('le bon dit « Par lien, avant le départ »',
  (await p.locator('#bonPaiement').textContent())==='Par lien, avant le départ',
  await p.locator('#bonPaiement').textContent());
const enregistre = await p.evaluate(()=>{ const l = JSON.parse(localStorage.getItem('ela_courses')||'[]'); return l[l.length-1] || {}; });
check('la course enregistrée porte « lien »', enregistre.paiement === 'lien', String(enregistre.paiement));

// ---- Le message à Barbaros ----
await p.locator('#btnRenvoyer').click(); await p.waitForTimeout(300);
const msg = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
const L = msg.split('\n');
check('le message porte la ligne « Paiement : Lien de paiement »',
  L.some(x=>x==='Paiement : Lien de paiement, avant le départ'), L.join(' | '));
check('elle est posée AVANT le prix, pour ne pas voler le dernier montant',
  L.findIndex(x=>x.startsWith('Paiement :')) < L.findIndex(x=>x.startsWith('Prix :')));
check('le dernier montant en euros reste le prix de la course',
  (msg.match(/(\d[\d\s ]*[.,]\d{2})\s*€/g)||[]).pop().replace(/\s/g,'')==='70,00€');
check('la dernière ligne reste « nom — téléphone »',
  L[L.length-1]==='Jean Martin — 06 12 34 56 78', L[L.length-1]);
/* « Coller une demande » relit ce même message : il doit y retrouver « lien ». */
const relu = await p.evaluate(m => window.ELA_INTAKE.lireDemande(m,
  [{cle:"berline",nom:"Berline"},{cle:"van",nom:"Van"}]), msg).catch(e => ({ erreur: String(e) }));
check('le lecteur de demandes relit « lien »', relu && relu.paiement === 'lien', JSON.stringify(relu && (relu.erreur || relu.paiement)));

// ---- En anglais : le client lit sa langue, Barbaros lit le français ----
await p.evaluate(()=>localStorage.removeItem('ela_courses'));
await p.goto('http://127.0.0.1:8099/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(400);
await p.locator('.langues button[data-langue="en"]').click(); await p.waitForTimeout(200);
await p.type('#depart','vendome',{delay:10}); await p.waitForTimeout(850);
await p.locator('#departList [role=option]').first().click();
await p.type('#arrivee','argenteuil',{delay:10}); await p.waitForTimeout(850);
await p.locator('#arriveeList [role=option]').first().click();
await p.fill('#date', d); await p.fill('#heure','10:00');
await p.locator('#btnVoirPrix').click(); await p.waitForTimeout(1000);
await p.locator('.veh-carte').first().click();
await p.locator('#btnContinuer').click(); await p.waitForTimeout(300);
const blocEn = await p.locator('#blocPaiement').innerText();
check('tout le bloc du paiement parle anglais',
  !/[àéèêîôûç]/i.test(blocEn) && /payment link/i.test(blocEn) && /not refunded/i.test(blocEn),
  blocEn.replace(/\n/g,' | '));
await p.fill('#clientNom','John Smith'); await p.fill('#clientTel','+44 7700 900000');
await p.evaluate(()=>{ if(document.querySelector('#blocContact [aria-pressed="true"]')) return; const b=[...document.querySelectorAll('#blocContact [data-contact]')].find(e=>e.offsetParent); if(b) b.click(); });
await p.locator('#btnConfirmer').click(); await p.waitForTimeout(800);
check('le bon anglais affiche « By link, before departure »',
  (await p.locator('#bonPaiement').textContent())==='By link, before departure',
  await p.locator('#bonPaiement').textContent());
await p.evaluate(()=>{ window.__liens = []; });
await p.locator('#btnRenvoyer').click(); await p.waitForTimeout(300);
const msgEn = decodeURIComponent((await p.evaluate(()=>window.__liens[0])).split('text=')[1]);
check('mais le message à Barbaros reste en français',
  msgEn.includes('Paiement : Lien de paiement, avant le départ'),
  msgEn.split('\n').find(x=>x.startsWith('Paiement')));

// ---- Côté exploitant ----
/* Les dates se composent dans le fuseau du navigateur, comme la page. */
const jourDans = n => { const x = new Date(Date.now() + n*864e5);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
const dansH = h => { const x = new Date(Date.now() + h*3600e3);
  return { date: x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'),
           heure: String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0') }; };
const course = (ref, extra, co) => Object.assign({
  ref, statut:"attente", cree:(() => { const x = new Date(); x.setHours(12, 0, 0, 0); return x.toISOString(); })(),
  course:Object.assign({ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
           date:"2026-09-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" }, co || {}),
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  prix:{ total:70, ht:63.64, tva:6.36 }
}, extra);
const LIEN = { paiement:"lien", paiementNom:"Lien de paiement, avant le départ" };
const CH = { chauffeur:{ nom:"Mehmet", telephone:"06 11 22 33 44" } };
/* Bientôt : départ dans 2 h 30 → limite dans 30 min → l'écriteau s'allume.
   Plus tard : départ demain 15:00 → limite à 13:00, loin → rien.
   Tôt : départ demain 07:00 → limite LA VEILLE à 22:00. */
/* L'HORLOGE EST FIGÉE à 12:00 aujourd'hui : sans ça, la suite dépendait de
   l'heure où elle tourne (lancée à 23 h, « dans 2 h 30 » tombait avant 8 h
   et changeait de règle). Les heures sont posées par rapport à MIDI. */
const midi = new Date(); midi.setHours(12, 0, 0, 0);
const aMidi = h => { const x = new Date(midi.getTime() + h*3600e3);
  return { date: x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'),
           heure: String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0') }; };
const bientot = aMidi(2.5);               // 14:30 → limite 12:30, dans l'heure
const derniere = aMidi(1.5);              // 13:30, demandée à midi → avant l'arrivée du chauffeur
const ctx2 = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p2 = await ctx2.newPage();
await p2.clock.setFixedTime(midi);
p2.on('pageerror',e=>errs.push(e.message));
await p2.route('**supabase.co/**', r => r.abort());
await ctx2.addInitScript(()=>{ window.__liens = []; window.open = (u)=>{ window.__liens.push(u); return null; }; });
await ctx2.addInitScript((liste)=>{
  if(!sessionStorage.getItem('__pose')){
    localStorage.setItem('ela_bookings', JSON.stringify(liste));
    sessionStorage.setItem('__pose','1');
  }
  localStorage.setItem('ela_exploitant', '584ec46adb3a2408');
}, [course("ELA-26-09-0001",{paiement:"carte", paiementNom:"Carte bancaire"}),
    course("ELA-26-09-0002",{}),
    course("ELA-26-10-LIEN1",Object.assign({statut:"confirmee"},LIEN,CH),{date:bientot.date, heure:bientot.heure}),
    course("ELA-26-10-LIEN2",Object.assign({statut:"confirmee"},LIEN,CH),{date:jourDans(1), heure:"15:00"}),
    course("ELA-26-10-LIEN3",Object.assign({statut:"confirmee"},LIEN,CH),{date:jourDans(1), heure:"07:00"}),
    course("ELA-26-10-LIEN4",Object.assign({statut:"confirmee"},LIEN,CH),{date:derniere.date, heure:derniere.heure})]);
await p2.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
await p2.waitForTimeout(700);
/* Le bon se rouvre par la recherche du tableau de bord : c'est le geste réel. */
async function ouvrirBon(ref){
  if(await p2.locator('#ecran-bord-bon').isVisible()){ await p2.locator('#btnRetourBord').click(); await p2.waitForTimeout(250); }
  await p2.evaluate(r => { const c = document.querySelector('[data-ref="'+r+'"]'); if(c) c.click(); }, ref);
  await p2.waitForTimeout(250);
  if(!(await p2.locator('#ecran-bord-bon').isVisible())){
    for(const f of ['attente','confirmee','realisee']){
      await p2.locator('.compteur[data-filtre="'+f+'"]').click(); await p2.waitForTimeout(150);
      const n = await p2.locator('.demande, .course-bord').filter({ hasText: ref.slice(-5) }).count();
      if(n){ await p2.locator('.demande, .course-bord').filter({ hasText: ref.slice(-5) }).first().click(); break; }
    }
    await p2.waitForTimeout(250);
  }
  return (await p2.locator('#bbRef').textContent()) === ref;
}
check('ancienne course : le bon de l\'exploitant porte son mode de règlement',
  await ouvrirBon("ELA-26-09-0001") && (await p2.locator('#bbPaiement').textContent())==='Carte bancaire',
  await p2.locator('#bbPaiement').textContent());
check('… et ne propose pas de lien (réglée à bord)', !(await p2.locator('#blocLienPaiement').isVisible()));
check('une course enregistrée avant le choix reste lisible : un tiret, pas une invention',
  await ouvrirBon("ELA-26-09-0002") && (await p2.locator('#bbPaiement').textContent())==='—',
  await p2.locator('#bbPaiement').textContent());

// L'écriteau : allumé pour la course dont la limite tombe dans l'heure, et elle seule.
await p2.locator('#btnRetourBord').click(); await p2.waitForTimeout(300);
const ecriteau = await p2.locator('#bordPaiement').isVisible();
const texteEc = ecriteau ? await p2.locator('#bordPaiement').textContent() : '';
check('« Paiement attendu » s\'allume quand la limite tombe dans l\'heure', ecriteau && /Paiement attendu/.test(texteEc), texteEc);
check('… pour cette course-là seulement (pas celle de demain)', !/courses/.test(texteEc), texteEc);
await p2.locator('#bordPaiement').click(); await p2.waitForTimeout(300);
check('l\'écriteau ouvre le bon de la course à relancer',
  (await p2.locator('#bbRef').textContent())==='ELA-26-10-LIEN1', await p2.locator('#bbRef').textContent());
check('le bon montre le bloc « Paiement du client »', await p2.locator('#blocLienPaiement').isVisible());

// Un lien non https est refusé, et rien ne part.
await p2.fill('#bbLienPaiement', 'http://pay.sumup.com/b2c/ABC');
check('un lien non https est signalé', await p2.locator('#bbLienAlerte').isVisible()
  && /https/.test(await p2.locator('#bbLienAlerte').textContent()));
await p2.evaluate(()=>{ window.__liens = []; });
await p2.locator('#btnPrevenirClient').click(); await p2.waitForTimeout(250);
check('… et « Prévenir le client » n\'envoie rien', (await p2.evaluate(()=>window.__liens.length))===0);
// Un service inconnu est signalé, sans bloquer.
await p2.fill('#bbLienPaiement', 'https://paie-moi.example/x');
check('un service de paiement inconnu est signalé', await p2.locator('#bbLienAlerte').isVisible()
  && /inconnu/.test(await p2.locator('#bbLienAlerte').textContent()));
// Le bon lien part, avec le montant et l'heure limite.
await p2.fill('#bbLienPaiement', 'https://pay.sumup.com/b2c/QWERTY');
check('un lien SumUp ne déclenche aucune alerte', !(await p2.locator('#bbLienAlerte').isVisible()));
await p2.evaluate(()=>{ window.__liens = []; });
await p2.locator('#btnPrevenirClient').click(); await p2.waitForTimeout(300);
const envoi = await p2.evaluate(()=>window.__liens[0] || '');
const conf = decodeURIComponent(envoi.split('text=')[1] || '');
const limAttendue = await p2.evaluate(o => { const x = new Date(new Date(o.date+'T'+o.heure).getTime() - 2*3600e3);
  return 'avant ' + String(x.getHours()).padStart(2,'0') + ':' + String(x.getMinutes()).padStart(2,'0')
    + ' le ' + String(x.getDate()).padStart(2,'0') + '/' + String(x.getMonth()+1).padStart(2,'0'); }, bientot);
check('« Prévenir le client » écrit le lien de paiement', conf.includes('Lien de paiement : https://pay.sumup.com/b2c/QWERTY'), conf.replace(/\n/g,' | '));
check('… avec le montant et l\'heure limite (2 h avant)',
  conf.includes('Paiement à votre chauffeur : 70,00 €, ' + limAttendue), limAttendue + ' ⇢ ' + conf.split('\n').find(x=>x.startsWith('Paiement')));
check('… et dit que l\'argent va au chauffeur, pas à Elatransfer', /Paiement à votre chauffeur/.test(conf));
const lienGarde = await p2.evaluate(()=>{ const c = JSON.parse(localStorage.getItem('ela_bookings')||'[]').find(x=>x.ref==='ELA-26-10-LIEN1'); return c && c.lienPaiement; });
check('le lien est enregistré sur la course', lienGarde === 'https://pay.sumup.com/b2c/QWERTY', String(lienGarde));
// « Payé » : la course ne réclame plus rien.
await p2.locator('#bbPaye').check(); await p2.waitForTimeout(250);
const paye = await p2.evaluate(()=>{ const c = JSON.parse(localStorage.getItem('ela_bookings')||'[]').find(x=>x.ref==='ELA-26-10-LIEN1'); return c && c.paye; });
check('« Payé » s\'enregistre sur la course', !!paye, String(paye));
await p2.evaluate(()=>{ window.__liens = []; });
await p2.locator('#btnPrevenirClient').click(); await p2.waitForTimeout(300);
const conf2 = decodeURIComponent(((await p2.evaluate(()=>window.__liens[0])) || '').split('text=')[1] || '');
check('une course payée ne réclame plus de paiement', conf2 && !/Lien de paiement/.test(conf2), conf2.replace(/\n/g,' | '));
await p2.locator('#btnRetourBord').click(); await p2.waitForTimeout(300);
check('payée, elle éteint l\'écriteau', !(await p2.locator('#bordPaiement').isVisible()));
// Départ avant 8 h : limite la veille à 22:00.
await ouvrirBon("ELA-26-10-LIEN3");
const noteTot = await p2.locator('#bbLimitePaiement').textContent();
const veille = await p2.evaluate(j => { const x = new Date(j+'T07:00'); x.setDate(x.getDate()-1);
  return 'avant 22:00 le ' + String(x.getDate()).padStart(2,'0') + '/' + String(x.getMonth()+1).padStart(2,'0'); }, jourDans(1));
check('départ avant 8 h : la limite est la veille à 22:00', noteTot.includes(veille), veille + ' ⇢ ' + noteTot);
await ouvrirBon("ELA-26-10-LIEN4");
check('demande de dernière minute (faite après sa limite) : avant l\'arrivée du chauffeur',
  /avant l'arrivée du chauffeur/.test(await p2.locator('#bbLimitePaiement').textContent()),
  await p2.locator('#bbLimitePaiement').textContent());
await ouvrirBon("ELA-26-10-LIEN2");
check('départ à 15:00 : la limite est 13:00', /avant 13:00 le/.test(await p2.locator('#bbLimitePaiement').textContent()),
  await p2.locator('#bbLimitePaiement').textContent());
check('aucun débordement horizontal dans l\'admin',
  (await p2.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

await ctx2.close(); await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
