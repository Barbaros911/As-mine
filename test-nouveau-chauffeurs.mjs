/* =====================================================================
   TEST-NOUVEAU-CHAUFFEURS.MJS — le carnet et la facture de commission
   ---------------------------------------------------------------------
   LE CARNET N'EST PAS UN RÉPERTOIRE, C'EST UNE OBLIGATION. En confiant des
   courses à des chauffeurs indépendants, Elatransfer est une centrale de
   réservation (Code des transports L3142-1) et doit pouvoir prouver, pour
   chacun d'eux, qu'il a sa carte professionnelle, son inscription au
   registre des VTC et son assurance.

   CE QUI COMPTE ICI EST LA DATE, PAS LE NUMÉRO. Un numéro de carte reste
   identique le lendemain de son expiration : il ne prouve rien. La suite
   éprouve donc les trois états — à jour, bientôt, périmé — et surtout le
   PIRE DES TROIS, parce qu'un chauffeur dont l'assurance a expiré est un
   chauffeur à qui l'on ne confie pas de course, quel que soit l'état de sa
   carte professionnelle.

   UN PAPIER ABSENT VAUT UN PAPIER PÉRIMÉ. Dans les deux cas on ne peut
   rien prouver. Les distinguer donnerait à « pas renseigné » un air
   rassurant qu'il n'a pas — c'est exactement le contrôle qui suit.

   LA FACTURE EST UN DOCUMENT COMPTABLE. Trois choses s'y jouent, et les
   trois sont éprouvées : elle est REFUSÉE tant que le SIRET de l'émetteur
   manque (art. L441-9 Code de commerce), son numéro NE RECULE JAMAIS, et
   une course facturée ne repart JAMAIS dans une seconde facture.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-chauffeurs.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

const jour = (n) => { const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')
       + '-'+String(d.getDate()).padStart(2,'0'); };

/* Quatre courses réalisées par « Mehmet », une par un chauffeur hors
   carnet, et une confirmée mais pas faite — celle-là ne doit jamais être
   facturée : une course confirmée n'est pas une course encaissée. */
const course = (ref, statut, jourRel, prix, chauffeur, tel) => ({
  ref, statut, cree: new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", departPublic:"Place Vendôme, 75001 Paris",
           arrivee:"Aéroport Charles-de-Gaulle", arriveePublic:"Aéroport Charles-de-Gaulle",
           date: jour(jourRel), heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" },
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  chauffeur: chauffeur ? { nom: chauffeur, telephone: tel || "" } : null,
  prix:{ total: prix, ht: prix/1.1, tva: prix - prix/1.1 }
});

const registre = [
  course("ELA-26-09-0010","realisee",-5, 80,"Mehmet Yilmaz","06 98 76 54 32"),
  course("ELA-26-09-0011","realisee",-4,120,"Mehmet Yilmaz","06 98 76 54 32"),
  course("ELA-26-09-0012","realisee",-3, 50,"Mehmet Yilmaz","06 98 76 54 32"),
  course("ELA-26-09-0013","confirmee",-2,200,"Mehmet Yilmaz","06 98 76 54 32"),
  course("ELA-26-09-0014","realisee",-3, 90,"Inconnu Total","06 11 11 11 11")
];

const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
await ctx.addInitScript((r)=>{
  localStorage.setItem('ela_bookings', JSON.stringify(r));
  localStorage.setItem('ela_exploitant', '584ec46adb3a2408');
}, registre);
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));
await p.route('**://api.openrouteservice.org/**', r => r.abort());
await p.goto('http://127.0.0.1:8099/index.html?exploitant=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);
check('l\'espace exploitant s\'ouvre', await p.locator('#ecran-bord').isVisible());

// ================= LE CARNET =================
await p.locator('#btnChauffeurs').click(); await p.waitForTimeout(300);
check('« Chauffeurs » ouvre le carnet et s\'allume',
  await p.locator('#ecran-chauffeurs').isVisible()
  && (await p.locator('#btnChauffeurs').getAttribute('class')).includes('actif'));
check('un carnet vide le dit, plutôt que d\'afficher une liste vide',
  await p.locator('#chVide').isVisible());

/* LE NOM ET LE TÉLÉPHONE SONT LE MINIMUM : c'est par eux qu'une course se
   relie à une fiche. Sans eux, le carnet ne prouve rien de personne. */
await p.fill('#chNom','Mehmet Yilmaz');
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(200);
check('un chauffeur sans téléphone est refusé',
  (await p.locator('#chEtat').textContent()).includes('nécessaires')
  && (await p.locator('.ch-carte').count()) === 0);

await p.fill('#chTel','06 98 76 54 32');
await p.fill('#chSiret','987 654 321 00019');
await p.fill('#chAdresse','8 rue des Lilas, 93290 Tremblay');
await p.fill('#chCarteFin', jour(400));
await p.fill('#chRegistreFin', jour(400));
await p.fill('#chAssuranceFin', jour(400));
await p.fill('#chTaux','15');
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
check('un chauffeur complet est enregistré et ses papiers sont dits en règle',
  (await p.locator('.ch-carte').count()) === 1
  && (await p.locator('#chEtat').textContent()).includes('en règle'));
check('et le carnet vide disparaît', await p.locator('#chVide').isHidden());

/* LE PIRE DES TROIS DÉCIDE. On rend l'assurance périmée en laissant les
   deux autres papiers à jour : la fiche doit passer au rouge. */
await p.locator('.ch-carte').first().click(); await p.waitForTimeout(200);
check('cliquer une fiche la rouvre pour modification',
  (await p.locator('#chNom').inputValue()) === 'Mehmet Yilmaz'
  && await p.locator('#btnChSupprimer').isVisible());
await p.fill('#chAssuranceFin', jour(-2));
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
const cl = await p.locator('.ch-carte').first().getAttribute('class');
check('une assurance périmée fait passer toute la fiche au rouge, carte à jour ou non',
  cl.includes('perime'), cl);
check('et on le dit à l\'enregistrement',
  (await p.locator('#chEtat').textContent()).includes('ne lui confiez pas'));
check('le panneau « Papiers à surveiller » apparaît sur le tableau de bord',
  await p.evaluate(()=>{
    document.getElementById('btnAdminBord').click();
    return !document.getElementById('panneauPapiers').hidden;
  }));

/* UN PAPIER ABSENT VAUT UN PAPIER PÉRIMÉ : dans les deux cas on ne peut
   rien prouver. C'est le contrôle qui empêche « pas renseigné » de passer
   pour rassurant. */
await p.locator('#btnChauffeurs').click(); await p.waitForTimeout(300);
await p.locator('.ch-carte').first().click(); await p.waitForTimeout(200);
await p.fill('#chAssuranceFin','');
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
check('une assurance NON RENSEIGNÉE est aussi bloquante qu\'une périmée',
  (await p.locator('.ch-carte').first().getAttribute('class')).includes('perime'));

/* L'orange existe pour ce qui appelle une relance, pas un refus. */
await p.locator('.ch-carte').first().click(); await p.waitForTimeout(200);
await p.fill('#chAssuranceFin', jour(10));
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
const cl2 = await p.locator('.ch-carte').first().getAttribute('class');
check('un papier qui expire bientôt est orange, pas rouge',
  cl2.includes('bientot') && !cl2.includes('perime'), cl2);
await p.locator('.ch-carte').first().click(); await p.waitForTimeout(200);
await p.fill('#chAssuranceFin', jour(400));
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
check('remis à jour, la fiche ne porte plus aucune couleur — on ne décore pas ce qui va bien',
  (await p.locator('.ch-carte').first().getAttribute('class')).trim() === 'ch-carte');

// ================= L'AVERTISSEMENT SUR LE BON =================
/* C'EST LE MOMENT OÙ L'ON ENGAGE SA RESPONSABILITÉ. Écrit ailleurs,
   l'avertissement ne serait jamais lu. */
await p.locator('#btnAdminBord').click(); await p.waitForTimeout(200);
await p.locator('.compteur[data-filtre="confirmee"]').click(); await p.waitForTimeout(300);
await p.locator('.demande').first().click(); await p.waitForTimeout(300);
check('le bon rappelle que les papiers du chauffeur sont à jour',
  await p.locator('#bbChauffeurAlerte').isVisible()
  && (await p.locator('#bbChauffeurAlerte').getAttribute('class')).includes('vert'),
  await p.locator('#bbChauffeurAlerte').getAttribute('class'));
await p.fill('#bbChauffeurNom','Quelqu\'un d\'autre');
await p.fill('#bbChauffeurTel','06 55 55 55 55');
await p.waitForTimeout(200);
check('un chauffeur hors carnet est signalé — on ne peut rien prouver de lui',
  (await p.locator('#bbChauffeurAlerte').getAttribute('class')).includes('orange')
  && (await p.locator('#bbChauffeurAlerte').innerText()).includes('carnet'));

/* LE NUMÉRO L'EMPORTE SUR LE NOM : le nom est saisi à la main depuis des
   mois, le numéro normalisé ne varie pas. */
await p.fill('#bbChauffeurNom','MEHMET mal écrit');
await p.fill('#bbChauffeurTel','+33 6 98 76 54 32');
await p.waitForTimeout(200);
check('le chauffeur est retrouvé par son NUMÉRO même si le nom est mal écrit',
  (await p.locator('#bbChauffeurAlerte').getAttribute('class')).includes('vert'),
  await p.locator('#bbChauffeurAlerte').innerText());

// ================= LA FACTURE =================
await p.locator('#btnFactures').click(); await p.waitForTimeout(300);
check('« Facturer » ouvre son écran', await p.locator('#ecran-facture').isVisible());

/* SANS SIRET, PAS DE FACTURE. Un document sans identité de l'émetteur
   n'est pas une facture (art. L441-9 Code de commerce) : on refuse plutôt
   que d'en éditer une fausse qui partirait chez un tiers. */
await p.fill('#facDu', jour(-30));
await p.fill('#facAu', jour(0));
await p.locator('#btnFacPreparer').click(); await p.waitForTimeout(300);
check('sans les informations d\'entreprise, aucune facture n\'est préparée',
  await p.locator('#facApercu').isHidden()
  && await p.locator('#entEtat').isVisible());

await p.fill('#entNom','Elatransfer — Barbaros O.');
await p.fill('#entSiret','111 222 333 00044');
await p.fill('#entAdresse','5 avenue de Paris, 93290 Tremblay');
await p.waitForTimeout(200);
check('renseignées, l\'alerte disparaît', await p.locator('#entEtat').isHidden());

await p.locator('#btnFacPreparer').click(); await p.waitForTimeout(400);
check('l\'aperçu s\'affiche', await p.locator('#facApercu').isVisible());
/* TROIS COURSES, PAS QUATRE : la confirmée n'est pas encaissée, et celle
   d'un autre chauffeur n'est pas la sienne. */
check('seules les courses RÉALISÉES de CE chauffeur sont facturées',
  (await p.locator('#factureVue .f-corps tr').count()) === 3,
  String(await p.locator('#factureVue .f-corps tr').count()));
const vue = await p.locator('#factureVue').innerText();
check('la commission est bien 15 % du prix des courses (80+120+50 = 250 → 37,50 €)',
  vue.includes('37,50 €'), vue.replace(/\n/g,' | ').slice(0, 400));
check('sans TVA, la mention de la franchise est portée',
  vue.includes('293 B'), '');
check('et le document dit clairement qu\'il n\'est pas encore émis',
  vue.includes('non émise'));
check('le SIRET des DEUX parties y figure',
  vue.includes('111 222 333 00044') && vue.includes('987 654 321 00019'));

await p.locator('#btnFacEmettre').click(); await p.waitForTimeout(400);
const num = (await p.locator('#factureVue .f-num').first().textContent()).trim();
check('émise, la facture porte un numéro',
  /^N° F-\d{4}-0001$/.test(num), num);
check('et le bouton « Émettre » laisse la place à l\'impression',
  await p.locator('#btnFacEmettre').isHidden()
  && await p.locator('#btnFacImprimer').isVisible());
check('les courses portent le numéro de leur facture',
  await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))
    .filter(c=>c.factureNum).length) === 3);

/* ON NE FACTURE PAS DEUX FOIS LA MÊME COURSE. C'est le contrôle qui compte
   le plus : un doublon se voit six mois plus tard, chez le comptable. */
await p.locator('#btnFacPreparer').click(); await p.waitForTimeout(400);
check('les mêmes courses ne repartent pas dans une seconde facture',
  (await p.locator('#facEtat').textContent()).includes('Aucune course'),
  await p.locator('#facEtat').textContent());

/* LE RANG NE RECULE JAMAIS. On ajoute une course facturable et on vérifie
   que le numéro suivant est le 0002, pas un second 0001. */
await p.evaluate((d)=>{
  const l = JSON.parse(localStorage.getItem('ela_bookings'));
  l.push({ ref:"ELA-26-09-0020", statut:"realisee", cree:new Date().toISOString(),
    course:{ depart:"A", departPublic:"A", arrivee:"B", arriveePublic:"B",
             date:d, heure:"09:00", vehicule:"Berline", vehiculeCle:"berline",
             passagers:"1 passager · 0 bagage", vol:"" },
    client:{ nom:"X", telephone:"06 00 00 00 00" },
    chauffeur:{ nom:"Mehmet Yilmaz", telephone:"06 98 76 54 32" },
    prix:{ total:100, ht:90.91, tva:9.09 } });
  localStorage.setItem('ela_bookings', JSON.stringify(l));
}, jour(-1));
await p.locator('#btnFacPreparer').click(); await p.waitForTimeout(400);
await p.locator('#btnFacEmettre').click(); await p.waitForTimeout(400);
check('la facture suivante prend le rang suivant, jamais le même',
  (await p.locator('#factureVue .f-num').first().textContent()).includes('-0002'),
  await p.locator('#factureVue .f-num').first().textContent());
check('elle est dans la liste des factures émises',
  (await p.locator('#facListe button').count()) === 2,
  String(await p.locator('#facListe button').count()));

/* UNE FACTURE ÉMISE EST FIGÉE. On change l'adresse du chauffeur et on
   rouvre l'ancienne facture : elle doit porter l'adresse d'alors — un
   document comptable qui se réécrit tout seul ne prouve plus rien. */
await p.locator('#btnChauffeurs').click(); await p.waitForTimeout(300);
await p.locator('.ch-carte').first().click(); await p.waitForTimeout(200);
await p.fill('#chAdresse','NOUVELLE ADRESSE APRÈS FACTURE');
await p.locator('#btnChEnregistrer').click(); await p.waitForTimeout(300);
await p.locator('#btnFactures').click(); await p.waitForTimeout(300);
await p.locator('#facListe button').last().click(); await p.waitForTimeout(400);
check('une facture émise garde l\'adresse qu\'elle portait, pas la nouvelle',
  (await p.locator('#factureVue').innerText()).includes('8 rue des Lilas')
  && !(await p.locator('#factureVue').innerText()).includes('NOUVELLE ADRESSE'));

/* À L'IMPRESSION, SEULE LA FACTURE SORT — même règle que l'affiche, et
   pour la même raison : le tableau de bord porte des noms et des
   téléphones de clients. */
await p.emulateMedia({ media:'print' });
await p.waitForTimeout(200);
const vus = await p.evaluate(()=>{
  const vu = e => e && getComputedStyle(e).visibility !== 'hidden';
  return { facture: vu(document.querySelector('.facture')),
           entete: vu(document.querySelector('.entete')),
           nav: vu(document.querySelector('.admin-nav')),
           bord: vu(document.querySelector('#listeBord')) };
});
check('à l\'impression la facture sort, et rien du tableau de bord',
  vus.facture && !vus.entete && !vus.nav && !vus.bord, JSON.stringify(vus));
await p.emulateMedia({ media:'screen' });

// ================= LA SAUVEGARDE EMPORTE TOUT =================
/* Une sauvegarde qui ne rendrait que les courses laisserait Barbaros sans
   preuve que ses chauffeurs étaient en règle, et referait partir la
   numérotation des factures à 1 — donc des doublons. */
const sauv = await p.evaluate(()=>{
  const rang = JSON.parse(localStorage.getItem('ela_rang_facture')||'null');
  return { chauffeurs: JSON.parse(localStorage.getItem('ela_chauffeurs')||'[]').length,
           factures: JSON.parse(localStorage.getItem('ela_factures')||'[]').length,
           rang: rang && rang.rang };
});
check('le carnet, les factures et le rang vivent bien dans le navigateur',
  sauv.chauffeurs === 1 && sauv.factures === 2 && sauv.rang === 2,
  JSON.stringify(sauv));

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);

await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
