/* =====================================================================
   TEST-NOUVEAU-CONFIRMATION.MJS — la réponse qui arrive au client
   ---------------------------------------------------------------------
   RIEN NE VOYAGE TOUT SEUL D'UN TÉLÉPHONE À L'AUTRE. Le serveur reçoit
   les demandes, mais sa règle de sécurité interdit la LECTURE aux
   visiteurs anonymes — et il FAUT qu'elle l'interdise : une lecture
   ouverte exposerait les noms, téléphones et adresses de tous les
   clients. Le site ne peut donc pas aller demander « ma course est-elle
   confirmée ? ». C'est le LIEN qui porte la réponse.

   Ce qui est verrouillé ici :

   — LE BON A DEUX VISAGES, un seul vrai à la fois. En attente il dit ce
     qui se passe maintenant — on cherche un chauffeur ; confirmé, il dit
     QUI vient. Afficher « en attente » sur une course attribuée ferait
     rappeler un client qui n'a rien à demander.
   — LE LIEN NE PORTE JAMAIS LE NOM NI LE NUMÉRO DU CLIENT. Un lien se
     transfère, et ce qu'il porte se lit. Ni les adresses : la
     destination d'un client ne regarde que lui.
   — LE BOUTON « PRÉVENIR » N'EXISTE QUE QUAND IL PEUT SERVIR : course
     confirmée, et un numéro où écrire. Un bouton qui n'envoie rien fait
     croire à Barbaros que le client est prévenu — et le client attend.
   — CONFIRMER ET PRÉVENIR SONT DEUX GESTES : le premier range la course,
     le second la dit au client. Fondus, le message partirait avant
     qu'on ait relu le nom du chauffeur, et un message parti ne se
     rattrape pas.
   — LE RENVOI DISPARAÎT une fois la course confirmée : elle est arrivée,
     quelqu'un y a répondu.
   — LA LISTE « MES COURSES » dit l'état RÉEL, sinon le client rouvre,
     lit « en attente » sur une course confirmée, et rappelle.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-confirmation.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

const course = (ref, extra) => Object.assign({
  ref, statut:"attente", cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
           date:"2026-09-20", heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" },
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  paiement:"especes", paiementNom:"Espèces",
  prix:{ total:70, ht:63.64, tva:6.36 }
}, extra);

/* ============ CÔTÉ EXPLOITANT : confirmer, puis prévenir ============ */
const ctxE = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const pe = await ctxE.newPage();
pe.on('pageerror',e=>errs.push(e.message));
await pe.route('**supabase.co/**', r => r.fulfill({status:201, body:''}));
await ctxE.addInitScript(([a,c])=>{
  localStorage.setItem('ela_bookings', JSON.stringify([a,c]));
  localStorage.setItem('ela_exploitant', '584ec46adb3a2408');
  window.__liens = [];
  window.open = (u)=>{ window.__liens.push(u); return null; };
}, [course("ELA-26-09-0001"), course("ELA-26-09-0002",{client:{nom:"Sans Numéro", telephone:""}})]);
await pe.goto('http://127.0.0.1:8099/?exploitant=1',{waitUntil:'domcontentloaded'});
await pe.waitForTimeout(600);

await pe.locator('.demande').first().click(); await pe.waitForTimeout(300);
check('sur une course en attente, « Prévenir le client » est caché',
  await pe.locator('#btnPrevenirClient').isHidden());

await pe.fill('#bbChauffeurNom','Mehmet');
await pe.fill('#bbChauffeurTel','06 98 76 54 32');
await pe.locator('#btnConfirmerCourse').click(); await pe.waitForTimeout(350);
check('confirmer fait passer la course à « Confirmée »',
  (await pe.locator('#bbEtat').textContent())==='Confirmée',
  await pe.locator('#bbEtat').textContent());
check('et « Prévenir le client » apparaît alors',
  await pe.locator('#btnPrevenirClient').isVisible());
// Deux gestes, pas un : confirmer ne doit RIEN envoyer.
check('confirmer n\'envoie aucun message tout seul',
  (await pe.evaluate(()=>window.__liens.length))===0,
  String(await pe.evaluate(()=>window.__liens.length)));

await pe.locator('#btnPrevenirClient').click(); await pe.waitForTimeout(250);
const url = await pe.evaluate(()=>window.__liens[0]);
check('le message part sur le numéro du client, pas via un sélecteur',
  url.startsWith('https://wa.me/33612345678?text='), url.slice(0,42));
const msg = decodeURIComponent(url.split('text=')[1]);
const L = msg.split('\n');
check('il annonce le transfert confirmé et la référence',
  L[0]==='Transfert confirmé — ELA-26-09-0001', L[0]);
check('le chauffeur', L[1]==='Chauffeur : Mehmet', L[1]);
check('le véhicule', L[2]==='Véhicule : Berline', L[2]);
check('l\'heure', /^Heure : /.test(L[3]) && L[3].includes('10:00'), L[3]);
check('le numéro du chauffeur, pour que le client puisse l\'appeler',
  L[4]==='Son numéro : 06 98 76 54 32', L[4]);
check('et le lien du bon en dernier', /^Votre bon : http/.test(L[5]), L[5]);
check('six lignes : on le lit sur un téléphone, la nuit', L.length===6, String(L.length));

/* LE LIEN NE PORTE NI LE CLIENT NI SA DESTINATION. Il se transfère, et ce
   qu'il porte se lit — le nom, le numéro et l'adresse d'arrivée d'un client
   sont exactement ce qu'on ne diffuse pas (RGPD 5.1.c). */
const lien = L[5].replace('Votre bon : ','');
const charge = decodeURIComponent(lien.split('?ok=')[1]);
const clair = Buffer.from(charge.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
check('le lien ne porte pas le nom du client', !clair.includes('Jean Martin'), clair.slice(0,90));
check('ni son téléphone', !clair.includes('06 12 34 56 78'));
check('ni ses adresses', !/Vendôme|Argenteuil/.test(clair));
check('il porte la référence, le chauffeur, le véhicule et l\'heure',
  clair.includes('ELA-26-09-0001') && clair.includes('Mehmet')
  && clair.includes('Berline') && clair.includes('10:00'), clair.slice(0,120));

// Un client sans numéro : rien à quoi envoyer, donc pas de bouton.
await pe.locator('#btnRetourBord').click(); await pe.waitForTimeout(250);
await pe.locator('.compteur[data-filtre="attente"]').click(); await pe.waitForTimeout(200);
await pe.locator('.demande').first().click(); await pe.waitForTimeout(300);
await pe.locator('#btnConfirmerCourse').click(); await pe.waitForTimeout(300);
check('sans numéro de client, le bouton reste caché : il n\'enverrait rien',
  await pe.locator('#btnPrevenirClient').isHidden());
await ctxE.close();

/* ============ CÔTÉ CLIENT : le bon avant et après ============ */
const ctxC = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const pc = await ctxC.newPage();
pc.on('pageerror',e=>errs.push(e.message));
await ctxC.addInitScript(([c])=>{
  localStorage.setItem('ela_courses', JSON.stringify([c]));
}, [course("ELA-26-09-0001")]);
await pc.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
await pc.waitForTimeout(500);
await pc.locator('.onglet[data-onglet="courses"]').click(); await pc.waitForTimeout(350);
check('la course en attente est marquée « En attente »',
  (await pc.locator('.course-etat').textContent()).trim()==='En attente',
  await pc.locator('.course-etat').textContent());
await pc.locator('.course').first().click(); await pc.waitForTimeout(300);
check('le bon dit « Demande reçue »',
  (await pc.locator('#bonEtat').textContent())==='Demande reçue',
  await pc.locator('#bonEtat').textContent());
check('et explique ce qui se passe : on cherche un chauffeur',
  (await pc.locator('#bonNote').textContent()).includes('disponibilité d\'un chauffeur professionnel'),
  await pc.locator('#bonNote').textContent());
check('le bloc du chauffeur n\'existe pas encore : rien de vrai à y écrire',
  await pc.locator('#bonConfirme').isHidden());

// ---- Le client ouvre le lien de confirmation ----
await pc.goto('http://127.0.0.1:8099/' + lien.slice(lien.indexOf('?ok=')),{waitUntil:'domcontentloaded'});
await pc.waitForTimeout(600);
check('le lien ouvre directement le bon', await pc.locator('#ecran-bon').isVisible());
check('qui dit maintenant « Transfert confirmé »',
  (await pc.locator('#bonEtat').textContent())==='Transfert confirmé',
  await pc.locator('#bonEtat').textContent());
check('la pastille passe au vert', (await pc.locator('#bonEtat').getAttribute('class')).includes('confirme'));
check('le chauffeur est nommé', (await pc.locator('#bonChauffeur').textContent())==='Mehmet');
check('le véhicule aussi', (await pc.locator('#bonVehiculeC').textContent())==='Berline');
check('et l\'heure', (await pc.locator('#bonHeure').textContent()).includes('10:00'),
  await pc.locator('#bonHeure').textContent());
check('le client peut appeler son chauffeur',
  (await pc.locator('#bonAppelChauffeur').getAttribute('href'))==='tel:+33698765432',
  await pc.locator('#bonAppelChauffeur').getAttribute('href'));
/* MESURÉ, PAS SUPPOSÉ. Ce bouton est un « <a> », et une ancre est un élément
   EN LIGNE : « width:100% » n'y fait rien. Il se posait EN TRAVERS de la
   ligne « Heure », qui devenait illisible — vu sur une capture, pas dans le
   code. On compare les rectangles plutôt que de relire le CSS. */
const chevauche = await pc.evaluate(()=>{
  const a = document.getElementById('bonHeure').closest('.ligne').getBoundingClientRect();
  const b = document.getElementById('bonAppelChauffeur').getBoundingClientRect();
  return !(b.top >= a.bottom - 1 || b.bottom <= a.top + 1);
});
check('le bouton ne recouvre pas la ligne « Heure »', !chevauche);
check('et il prend toute la largeur, comme les autres boutons',
  await pc.evaluate(()=>{
    const b = document.getElementById('bonAppelChauffeur');
    const p = b.parentElement;
    return Math.abs(b.getBoundingClientRect().width
      - (p.clientWidth - parseFloat(getComputedStyle(p).paddingLeft)
                      - parseFloat(getComputedStyle(p).paddingRight))) < 2;
  }));
// La course était connue de cet appareil : le détail complet reste affiché.
check('le trajet et le prix restent sur le bon',
  await pc.locator('#bonDetail').isVisible()
  && (await pc.locator('#bonDepart').textContent()).includes('Vendôme'));
check('« Renvoyer ma demande » disparaît : elle a déjà reçu une réponse',
  await pc.locator('#btnRenvoyer').isHidden());

/* L'ADRESSE EST NETTOYÉE : sans ça, un rafraîchissement — ou un retour en
   arrière — rouvrirait la confirmation par-dessus ce que le client fait. */
check('le paramètre est effacé de l\'adresse',
  !(await pc.evaluate(()=>location.search)).includes('ok='),
  await pc.evaluate(()=>location.search));

// La course enregistrée a suivi : elle doit rester confirmée au retour.
await pc.locator('.onglet[data-onglet="courses"]').click(); await pc.waitForTimeout(350);
check('la liste dit « Confirmé », pas « En attente »',
  (await pc.locator('.course-etat').textContent()).trim()==='Confirmé',
  await pc.locator('.course-etat').textContent());
check('et la pastille de la liste passe au vert aussi',
  (await pc.locator('.course-etat').getAttribute('class')).includes('ok'));

// ---- Le même lien sur un téléphone qui ne connaît pas la course ----
const ctxN = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const pn = await ctxN.newPage();
pn.on('pageerror',e=>errs.push(e.message));
await pn.goto('http://127.0.0.1:8099/' + lien.slice(lien.indexOf('?ok=')),{waitUntil:'domcontentloaded'});
await pn.waitForTimeout(600);
check('un lien transféré affiche quand même la confirmation',
  await pn.locator('#ecran-bon').isVisible()
  && (await pn.locator('#bonChauffeur').textContent())==='Mehmet');
/* On masque ce qu'on ne sait pas plutôt que d'afficher des tirets et un
   prix ferme à zéro euro — un bon qui annonce 0,00 € est un bon faux. */
check('mais sans inventer un trajet ni un prix à zéro',
  await pn.locator('#bonDetail').isHidden());

// Un lien abîmé ne doit pas casser la page.
await pn.goto('http://127.0.0.1:8099/?ok=nimportequoi',{waitUntil:'domcontentloaded'});
await pn.waitForTimeout(500);
check('un lien tronqué ou recopié à la main ouvre l\'accueil, sans erreur',
  await pn.locator('#ecran-accueil').isVisible());

// ---- En anglais ----
await pn.goto('http://127.0.0.1:8099/',{waitUntil:'domcontentloaded'});
await pn.waitForTimeout(400);
await pn.locator('.langues button[data-langue="en"]').click(); await pn.waitForTimeout(250);
await pn.goto('http://127.0.0.1:8099/' + lien.slice(lien.indexOf('?ok=')),{waitUntil:'domcontentloaded'});
await pn.waitForTimeout(600);
check('la confirmation est traduite',
  (await pn.locator('#bonEtat').textContent())==='Transfer confirmed',
  await pn.locator('#bonEtat').textContent());
/* L'attribut « data-t » est réécrit, pas seulement le texte : sans ça, un
   changement de langue rendrait au bon confirmé la phrase de l'attente. */
await pn.locator('.langues button[data-langue="fr"]').click(); await pn.waitForTimeout(300);
check('changer de langue ne rend pas au bon confirmé la phrase de l\'attente',
  (await pn.locator('#bonEtat').textContent())==='Transfert confirmé',
  await pn.locator('#bonEtat').textContent());

check('aucun débordement horizontal',
  (await pc.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));

await ctxN.close(); await ctxC.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
