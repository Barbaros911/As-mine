/* =====================================================================
   TEST-NOTIFICATION.MJS — le message qui réveille Barbaros à 5 h
   ---------------------------------------------------------------------
   La fonction Supabase ne peut s'éprouver entièrement qu'une fois
   déployée. Son TEXTE, lui, n'a besoin d'aucun réseau — et c'est la seule
   partie qui décide s'il se lève ou non. On le vérifie donc ici, sans
   navigateur et sans serveur : « node test-notification.mjs ».

   CE QUI EST VERROUILLÉ, ET POURQUOI CHAQUE POINT A COÛTÉ QUELQUE CHOSE
   AILLEURS DANS CE PROJET :

   — LE NOM ET LE TÉLÉPHONE DU CLIENT N'Y SONT PAS. Ils ne servent pas à
     décider ; les promener chez Telegram ou chez un service d'e-mail pour
     rien, c'est ce que la minimisation interdit (RGPD 5.1.c). Le contrôle
     cherche les VALEURS, pas les libellés : un test qui chercherait le mot
     « téléphone » passerait au vert avec le numéro écrit juste à côté.
   — LE NUMÉRO DE CHAMBRE NON PLUS. Le bon porte deux versions du départ,
     avec et sans ; prendre la mauvaise diffuse la chambre d'hôtel d'un
     client. Le même piège existe déjà sur l'annonce au groupe.
   — LE TITRE PORTE LE TRAJET ET L'HEURE. C'est la seule ligne visible sur
     un écran verrouillé. « Nouvelle notification » ne dit rien et ne fait
     pas se lever.
   — LE PRIX EST AU FORMAT FRANÇAIS, avec la virgule. Barbaros lit du
     français ; c'est la même règle que pour le message à l'exploitant.
   — « (distance estimée) » APPARAÎT quand les trois calculateurs
     d'itinéraire sont tombés : le prix annoncé au client repose alors sur
     un vol d'oiseau, il est ferme quand même, et il faut qu'il le sache
     AVANT de confier la course.
   ===================================================================== */
import { titre, corps, euros, court } from
  './supabase/functions/nouvelle-demande/message.js';

const ok = [], ko = [];
const check = (n, c, d = '') => (c ? ok : ko).push(n + (d ? ' — ' + d : ''));

const ADMIN = 'https://exemple.test/admin.html';

/* Un bon tel que la page en dépose un, avec les deux pièges dedans : un
   numéro de chambre sur le départ, et un client identifiable. */
const bon = {
  ref: 'ELA-26-09-0042',
  statut: 'attente',
  course: {
    type: 'Trajet simple',
    depart: 'Ibis Roissy CDG Paris Nord 2 (ch. 412)',
    arrivee: '15 rue de Rivoli, 75001 Paris',
    departPublic: 'Ibis Roissy CDG Paris Nord 2',
    arriveePublic: '15 rue de Rivoli, 75001 Paris',
    date: '2026-09-12', heure: '06:30',
    vol: 'AF1234',
    vehicule: 'Berline',
    passagers: '2 passagers · 3 bagages',
    distanceKm: 28.4,
    estimee: false
  },
  client: { nom: 'Jean Dupont', telephone: '+33612345678' },
  provenance: 'Ibis CDG',
  paiement: 'especes', paiementNom: 'Espèces',
  prix: { total: 90, ht: 81.82, tva: 8.18, majoration: true },
  dateMsg: '12/09/2026 06:30'
};

const t = titre(bon);
const m = corps(bon, ADMIN);

/* --- Ce que le message NE DOIT PAS porter -------------------------- */
const tout = t + '\n' + m;
check('le nom du client n\'y est pas', !tout.includes('Jean Dupont'));
check('son téléphone non plus', !tout.includes('612345678') && !tout.includes('+336'));
check('le numéro de chambre non plus', !/ch\. ?412/.test(tout) && !tout.includes('412'));

/* --- Le titre, la seule ligne d'un écran verrouillé ----------------- */
check('le titre annonce une demande', t.startsWith('Nouvelle demande —'), t);
check('le titre porte le départ', t.includes('Ibis Roissy'), t);
check('le titre porte l\'arrivée', t.includes('Rivoli'), t);
check('le titre porte la date et l\'heure', t.includes('12/09/2026 06:30'), t);
/* Un titre trop long est coupé par le téléphone, et c'est la fin — donc
   l'heure — qui saute. On le tient sous une longueur lisible. */
check('le titre reste court', t.length <= 90, t.length + ' caractères');

/* --- Le corps : de quoi décider, et rien de plus -------------------- */
check('la référence y est', m.includes('ELA-26-09-0042'));
check('le départ SANS la chambre', m.includes('Départ : Ibis Roissy CDG Paris Nord 2'));
check('l\'arrivée y est', m.includes('Arrivée : 15 rue de Rivoli, 75001 Paris'));
check('le véhicule et les passagers', m.includes('Berline · 2 passagers · 3 bagages'));
check('le mode de règlement', m.includes('Paiement : Espèces'));
check('le prix au format français', m.includes('Prix : 90,00 €'), m.match(/Prix : .*/)?.[0]);
check('le numéro de vol', m.includes('Vol : AF1234'));
check('la provenance, pour savoir quelle affiche travaille',
  m.includes('Vient de : Ibis CDG'));
check('le lien du tableau de bord, à portée de pouce', m.includes(ADMIN));
check('et il dit ce qui est attendu', m.includes('Le client attend une réponse.'));
check('rien ne parle d\'estimation sur une vraie distance', !m.includes('estimée'));

/* --- Une venue directe n'invente pas de provenance ------------------ */
const direct = corps({ ...bon, provenance: '' }, ADMIN);
check('sans provenance, aucune ligne « Vient de »', !direct.includes('Vient de'),
  direct.match(/Vient de.*/)?.[0] || '');
/* Un tiret se lirait « information perdue » ; l'absence se lit « venue
   directe ». Ce n'est pas la même chose pour qui décide où mettre ses
   affiches. */
check('et pas de tiret à la place', !/Vient de\s*:\s*—/.test(direct));

/* --- Le cas où les trois calculateurs sont tombés ------------------- */
const estime = corps({ ...bon, course: { ...bon.course, estimee: true } }, ADMIN);
check('une distance estimée est signalée',
  estime.includes('(distance estimée — prix à vérifier)'));

/* --- Un bon incomplet ne doit pas produire un message cassé --------- */
const vide = corps({}, ADMIN);
check('un bon vide ne plante pas', typeof vide === 'string' && vide.length > 0);
check('et ne montre ni « undefined » ni « null »',
  !/undefined|null|NaN/.test(vide), vide.replace(/\n/g, ' | '));
check('le prix inconnu s\'écrit « — », jamais « 0,00 € »',
  vide.includes('Prix : —'), vide.match(/Prix : .*/)?.[0]);
const titreVide = titre({});
check('un titre reste lisible sans course',
  !/undefined|null/.test(titreVide), titreVide);

/* --- Un bon ancien, sans les champs « public » ----------------------
   Les courses déjà déposées sur le serveur avant ce jour n'ont pas
   forcément « departPublic ». On retombe alors sur « depart » : mieux
   vaut un départ avec la chambre qu'un message vide — mais il faut que
   ce repli soit VOULU et connu, pas découvert un soir. */
const ancien = corps({ ref:'ELA-26-08-0001',
  course:{ depart:'Gare du Nord', arrivee:'Orly 4', vehicule:'Van',
           passagers:'5 passagers · 5 bagages' },
  prix:{ total:120 }, paiementNom:'Carte bancaire',
  dateMsg:'02/08/2026 14:00' }, ADMIN);
check('un bon ancien reste lisible', ancien.includes('Départ : Gare du Nord')
  && ancien.includes('Prix : 120,00 €'));

/* --- Les deux aides, prises à part ---------------------------------- */
check('euros arrondit et met la virgule', euros(70) === '70,00 €', euros(70));
check('euros refuse ce qui n\'est pas un nombre', euros(undefined) === '—');
check('court ne coupe pas au milieu d\'un mot',
  court('15 rue de Rivoli, 75001 Paris', 20) === '15 rue de Rivoli,…',
  court('15 rue de Rivoli, 75001 Paris', 20));
/* Sans le garde-fou des 60 %, « Roissy-Charles-de-Gaulle-Terminal » — un
   seul mot — se réduirait à « … ». On tranche net dans ce cas. */
check('un mot unique très long est tranché, pas effacé',
  court('Roissy-Charles-de-Gaulle-Terminal-2E', 20) === 'Roissy-Charles-de-Ga…',
  court('Roissy-Charles-de-Gaulle-Terminal-2E', 20));

console.log('\n=== RÉUSSIS (' + ok.length + ') ==='); ok.forEach(x => console.log('  ✔ ' + x));
if (ko.length) { console.log('\n=== ÉCHECS (' + ko.length + ') ==='); ko.forEach(x => console.log('  ✘ ' + x)); }
console.log('\n--- Le message tel qu\'il arrive ---\n' + t + '\n\n' + m + '\n');
process.exit(ko.length ? 1 : 0);
