/* =====================================================================
   TEST-NOUVEAU-REGISTRE.MJS — coller une demande, et les chiffres
   ---------------------------------------------------------------------
   Deux outils de travail, tous deux invisibles pour le client.

   COLLER UNE DEMANDE. Rien ne voyage tout seul d'un téléphone à l'autre :
   quand un client écrit sur WhatsApp plutôt que de passer par le site, sa
   demande n'existe nulle part. Le presse-papiers est le transport.
   Le lecteur NE DEVINE RIEN AUX LIBELLÉS, il lit la PLACE des choses :
   la référence en tête, une date en JJ/MM/AAAA HH:MM, les deux premières
   valeurs « … : … » pour les adresses, le DERNIER montant en euros pour
   le prix, et la dernière ligne « nom — téléphone ». Changer la forme du
   message client oblige à changer ce lecteur, et inversement — c'est
   exactement ce que ces contrôles surveillent.
   UNE DEMANDE VENUE D'UN CLIENT ENTRE TOUJOURS EN « ATTENTE » : il attend
   une réponse, et la ranger comme confirmée serait mentir sur son état.

   LE REGISTRE. Les chiffres ne comptent QUE les courses « realisee » :
   une course confirmée n'est pas une course faite, et la compter ferait
   prendre des promesses pour de l'argent encaissé. La date retenue est
   celle de la COURSE, pas celle de la saisie.
   LA RESTAURATION AJOUTE et n'écrase jamais : une course d'ici peut avoir
   avancé depuis la sauvegarde.

   Lancer :  npx http-server -p 8099 -s .
             node test-nouveau-registre.mjs
   ===================================================================== */
import { chromium } from 'playwright';
const b = await chromium.launch();
const ok=[],ko=[]; const check=(n,c,d='')=>(c?ok:ko).push(n+(d?' — '+d:''));
const errs=[];

/* Les dates sont calculées par rapport à AUJOURD'HUI : un test qui fige une
   date se met à mentir le lundi suivant. */
const auj = new Date();
const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
const iso = d => d.toISOString().slice(0,10);
const jour = n => { const d = new Date(lundi); d.setDate(d.getDate() + n); return iso(d); };
const semaineDerniere = n => { const d = new Date(lundi); d.setDate(d.getDate() - 7 + n); return iso(d); };

const course = (ref, statut, date, total, chauffeur) => ({
  ref, statut, cree:new Date().toISOString(),
  course:{ depart:"Place Vendôme, 75001 Paris", arrivee:"Argenteuil, 95100 Argenteuil",
           date, heure:"10:00", vehicule:"Berline", vehiculeCle:"berline",
           passagers:"2 passagers · 1 bagage", vol:"" },
  client:{ nom:"Jean Martin", telephone:"06 12 34 56 78" },
  paiement:"especes", paiementNom:"Espèces",
  chauffeur: chauffeur ? { nom:chauffeur, telephone:"06 98 76 54 32" } : undefined,
  prix:{ total, ht:total/1.1, tva:total-total/1.1 }
});

const jeu = [
  // Cette semaine : 3 réalisées (70 + 100 + 30 = 200)
  course("ELA-26-09-0001","realisee", jour(0),  70, "Mehmet"),
  course("ELA-26-09-0002","realisee", jour(1), 100, "Mehmet"),
  course("ELA-26-09-0003","realisee", jour(2),  30, "Ali"),
  // Cette semaine mais PAS réalisées : ne doivent compter nulle part
  course("ELA-26-09-0004","confirmee", jour(1), 500, "Mehmet"),
  course("ELA-26-09-0005","attente",   jour(3), 900),
  // La semaine dernière : 2 réalisées (60 + 40 = 100)
  course("ELA-26-08-0010","realisee", semaineDerniere(1), 60, "Ali"),
  course("ELA-26-08-0011","realisee", semaineDerniere(3), 40, "Mehmet")
];

const ctx = await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'fr-FR'});
const p = await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));
await p.route('**supabase.co/**', r => r.fulfill({status:201, body:''}));
await ctx.addInitScript((j)=>{
  localStorage.setItem('ela_bookings', JSON.stringify(j));
  localStorage.setItem('ela_exploitant', '04b72932f8ccb464');
}, jeu);
await p.goto('http://127.0.0.1:8099/?exploitant=1',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);

/* ==================== COLLER UNE DEMANDE ==================== */
check('le tableau de bord porte « Coller une demande » en haut',
  await p.locator('#btnCollerDemande').isVisible());

// Le message tel que le site le fabrique aujourd'hui : neuf lignes.
const message = [
  "Demande de réservation — ELA-26-09-0042",
  "Départ : Hôtel Ibis CDG, 95700 Roissy (ch. 214)",
  "Arrivée : Aéroport Roissy-Charles de Gaulle · Terminal 2E",
  "Date : 20/09/2026 14:30",
  "Passagers : 3 passagers · 2 bagages",
  "Véhicule : Van",
  "Paiement : Carte bancaire",
  "Prix : 120,00 €",
  "Sophie Durand — 06 11 22 33 44"
].join("\n");

await p.locator('#btnCollerDemande').click();
// La minuterie de secours attend 1,2 s avant d'ouvrir le repli.
await p.locator('#collerRepli').waitFor({state:'visible', timeout:5000});
// Le presse-papiers est refusé dans ce contexte : le repli doit s'ouvrir.
check('sans accès au presse-papiers, le champ de repli s\'ouvre',
  await p.locator('#collerRepli').isVisible());
await p.fill('#collerTexte', message);
await p.locator('#btnLireColle').click(); await p.waitForTimeout(400);
check('la demande est annoncée comme ajoutée',
  (await p.locator('#collerEtat').textContent()).includes('ELA-26-09-0042'),
  await p.locator('#collerEtat').textContent());

const lue = await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))
                                 .filter(c=>c.ref==='ELA-26-09-0042')[0]);
check('la course est créée', !!lue);
check('EN ATTENTE, jamais confirmée d\'office : le client attend une réponse',
  lue.statut==='attente', lue.statut);
check('la référence du client est reprise telle quelle',
  lue.ref==='ELA-26-09-0042');
check('les deux premières valeurs « … : … » sont lues comme les adresses',
  lue.course.depart.includes('Ibis CDG') && lue.course.arrivee.includes('Terminal 2E'),
  lue.course.depart + ' → ' + lue.course.arrivee);
check('la date passe en AAAA-MM-JJ, l\'heure à part',
  lue.course.date==='2026-09-20' && lue.course.heure==='14:30',
  lue.course.date + ' ' + lue.course.heure);
check('le dernier montant en euros est le prix', lue.prix.total===120, String(lue.prix.total));
check('le véhicule est reconnu par son nom',
  lue.course.vehiculeCle==='van' && lue.course.vehicule==='Van', lue.course.vehicule);
check('le mode de règlement aussi', lue.paiementNom==='Carte bancaire', lue.paiementNom);
check('la dernière ligne donne le nom et le téléphone',
  lue.client.nom==='Sophie Durand' && lue.client.telephone==='06 11 22 33 44',
  lue.client.nom + ' / ' + lue.client.telephone);
check('le nombre de passagers est repris',
  lue.course.passagers==='3 passagers · 2 bagages', lue.course.passagers);
check('et elle apparaît dans les demandes en attente',
  (await p.locator('#cptAttente').textContent())==='2',
  await p.locator('#cptAttente').textContent());

// Deux fois le même message ne doit pas créer deux courses.
await p.fill('#collerTexte', message);
await p.locator('#btnLireColle').click(); await p.waitForTimeout(350);
check('coller deux fois le même message ne crée pas de doublon',
  (await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))
                          .filter(c=>c.ref==='ELA-26-09-0042').length))===1);
check('et on dit pourquoi',
  (await p.locator('#collerEtat').textContent()).includes('déjà'),
  await p.locator('#collerEtat').textContent());

// Un message qui n'en est pas un.
await p.fill('#collerTexte', "Bonjour, vous êtes libre demain ?");
await p.locator('#btnLireColle').click(); await p.waitForTimeout(350);
check('un message quelconque est refusé, sans créer de course à moitié vide',
  (await p.locator('#collerEtat').textContent()).includes('non reconnu'),
  await p.locator('#collerEtat').textContent());

/* LE LECTEUR NE S'APPUIE PAS SUR LES LIBELLÉS : un client qui écrit
   lui-même, ou un message traduit, doivent passer aussi. Seule la STRUCTURE
   compte. */
await p.fill('#collerTexte', [
  "Booking request — ELA-26-09-0099",
  "Pickup : 12 rue de Rivoli, 75004 Paris",
  "Dropoff : Orly Terminal 4",
  "When : 21/09/2026 08:15",
  "Price : 85,00 €",
  "John Smith — +44 7700 900000"
].join("\n"));
await p.locator('#btnLireColle').click(); await p.waitForTimeout(400);
const anglaise = await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))
                                        .filter(c=>c.ref==='ELA-26-09-0099')[0]);
check('un message aux libellés inconnus passe : c\'est la structure qui est lue',
  !!anglaise && anglaise.course.depart.includes('Rivoli')
  && anglaise.course.arrivee.includes('Orly') && anglaise.prix.total===85,
  anglaise ? anglaise.course.depart + ' | ' + anglaise.prix.total : 'non lue');

/* ==================== LE REGISTRE ==================== */
await p.locator('#btnRegistre').click(); await p.waitForTimeout(500);
check('le registre s\'ouvre', await p.locator('#ecran-registre').isVisible());

check('cette semaine : 3 courses réalisées, pas les 5 de la semaine',
  (await p.locator('#regCourses').textContent())==='3',
  await p.locator('#regCourses').textContent());
check('l\'encaissé ne compte que les réalisées : 200 €, pas 1 600 €',
  (await p.locator('#regCA').textContent()).replace(/\s/g,'')==='200€',
  await p.locator('#regCA').textContent());
check('le prix moyen suit', (await p.locator('#regMoyen').textContent()).replace(/\s/g,'')==='67€',
  await p.locator('#regMoyen').textContent());
check('la semaine précédente est rappelée à côté',
  (await p.locator('#regCoursesAvant').textContent()).startsWith('2 la semaine'),
  await p.locator('#regCoursesAvant').textContent());
check('avec son encaissé',
  (await p.locator('#regCAAvant').textContent()).replace(/\s/g,'').startsWith('100€'),
  await p.locator('#regCAAvant').textContent());

// Le résultat par période
const parSemaine = await p.locator('#regResultat .reg-ligne').allTextContents();
check('le résultat par semaine liste les deux semaines', parSemaine.length===2,
  parSemaine.join(' | '));
check('la semaine en cours vient en premier, et vaut 200 €',
  parSemaine[0].includes('200'), parSemaine[0]);
await p.locator('.periode[data-periode="annee"]').click(); await p.waitForTimeout(350);
const parAn = await p.locator('#regResultat .reg-ligne').allTextContents();
check('par année, tout se regroupe : 5 courses et 300 €',
  parAn.length===1 && parAn[0].includes('5') && parAn[0].includes('300'),
  parAn.join(' | '));
await p.locator('.periode[data-periode="semaine"]').click(); await p.waitForTimeout(300);

// Les chauffeurs, du plus rapporteur au moins
const chauff = await p.locator('#regChauffeurs .reg-ligne').allTextContents();
check('deux chauffeurs au tableau', chauff.length===2, chauff.join(' | '));
check('Mehmet en tête : 3 courses réalisées pour 210 €',
  chauff[0].includes('Mehmet') && chauff[0].includes('210'), chauff[0]);
check('Ali ensuite : 2 courses pour 90 €',
  chauff[1].includes('Ali') && chauff[1].includes('90'), chauff[1]);
check('la course CONFIRMÉE de Mehmet n\'est pas comptée : elle n\'est pas faite',
  !chauff[0].includes('710') && !chauff[0].includes('4 course'), chauff[0]);

// La recherche porte sur TOUT le registre, pas seulement les réalisées.
await p.fill('#regRecherche','sophie');
await p.waitForTimeout(300);
const trouves = await p.locator('#regResultats .reg-ligne').allTextContents();
check('la recherche trouve une course EN ATTENTE : c\'est celle-là qu\'on cherche',
  trouves.length===1 && trouves[0].includes('ELA-26-09-0042'), trouves.join(' | '));
await p.fill('#regRecherche','roissy'); await p.waitForTimeout(300);
check('elle cherche aussi dans les adresses',
  (await p.locator('#regResultats .reg-ligne').count()) >= 1);
await p.fill('#regRecherche','zzzz'); await p.waitForTimeout(300);
check('et le dit quand rien ne correspond',
  (await p.locator('#regResultats').textContent()).includes('Aucune course'),
  await p.locator('#regResultats').textContent());
await p.fill('#regRecherche',''); await p.waitForTimeout(200);

/* ==================== LA SAUVEGARDE ==================== */
const dl = await Promise.all([
  p.waitForEvent('download'),
  p.locator('#btnSauver').click()
]);
check('la sauvegarde se télécharge', /elatransfer-registre-\d{4}-\d{2}-\d{2}\.json/.test(dl[0].suggestedFilename()),
  dl[0].suggestedFilename());

const dlCsv = await Promise.all([
  p.waitForEvent('download'),
  p.locator('#btnCSV').click()
]);
check('l\'export comptable aussi', /elatransfer-courses-\d{4}-\d{2}-\d{2}\.csv/.test(dlCsv[0].suggestedFilename()),
  dlCsv[0].suggestedFilename());
const flux = await dlCsv[0].createReadStream();
let csv = ''; for await (const bloc of flux) csv += bloc;
check('le CSV commence par un BOM : sinon Excel massacre les accents',
  csv.charCodeAt(0)===0xFEFF, 'code ' + csv.charCodeAt(0));
check('il est séparé par des points-virgules, pas des virgules',
  csv.split('\n')[0].split(';').length===14, csv.split('\n')[0].slice(0,60));
check('il porte les colonnes qui servent au comptable',
  /Référence;Date;Heure;État/.test(csv) && /Prix TTC;Prix HT;TVA/.test(csv));
check('et une ligne par course du registre',
  csv.trim().split(/\r?\n/).length === 1 + (await p.evaluate(()=>
    JSON.parse(localStorage.getItem('ela_bookings')).length)),
  String(csv.trim().split(/\r?\n/).length));
check('les montants sont à la virgule, comme Excel français les attend',
  /;63,64;/.test(csv) || /;70,00;/.test(csv));

/* LA RESTAURATION AJOUTE ET N'ÉCRASE JAMAIS. Une course d'ici peut avoir
   avancé depuis la sauvegarde — chauffeur attribué, course réalisée — et la
   version du fichier serait alors la plus ancienne des deux. */
const avant = await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings')).length);
const sauvegarde = JSON.stringify([
  course("ELA-26-09-0001","attente", jour(0), 5),   // existe déjà, et PLUS ANCIENNE
  course("ELA-26-07-0001","realisee", "2026-07-14", 55, "Ali")  // nouvelle
]);
await p.setInputFiles('#fichierRestaurer', {
  name:'sauvegarde.json', mimeType:'application/json', buffer: Buffer.from(sauvegarde)
});
await p.waitForTimeout(500);
check('la restauration annonce ce qu\'elle a ajouté',
  (await p.locator('#regSauvEtat').textContent()).includes('1 course ajoutée'),
  await p.locator('#regSauvEtat').textContent());
check('une seule course s\'ajoute, pas les deux',
  (await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings')).length))===avant+1);
check('et la course déjà présente n\'a PAS été écrasée par la version ancienne',
  (await p.evaluate(()=>JSON.parse(localStorage.getItem('ela_bookings'))
     .filter(c=>c.ref==='ELA-26-09-0001')[0].statut))==='realisee');

await p.setInputFiles('#fichierRestaurer', {
  name:'photo.json', mimeType:'application/json', buffer: Buffer.from('pas du json')
});
await p.waitForTimeout(400);
check('un fichier qui n\'est pas une sauvegarde est refusé sans casser la page',
  (await p.locator('#regSauvEtat').textContent()).includes("n'est pas une sauvegarde"),
  await p.locator('#regSauvEtat').textContent());

check('aucun débordement horizontal',
  (await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))===0);
check('aucune erreur JavaScript', errs.length===0, errs.join(' | '));

await ctx.close(); await b.close();
console.log('\n=== RÉUSSIS ('+ok.length+') ==='); ok.forEach(t=>console.log('  ✔ '+t));
if(ko.length){console.log('\n=== ÉCHECS ('+ko.length+') ==='); ko.forEach(t=>console.log('  ✘ '+t));}
if(errs.length){console.log('\n=== ERREURS JS ==='); [...new Set(errs)].forEach(e=>console.log('  ! '+e));}
process.exit(ko.length||errs.length?1:0);
