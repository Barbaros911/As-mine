import fs from 'node:fs';
const js=fs.readFileSync('admin-v2-itineraire.js','utf8');
const build=fs.readFileSync('construire.sh','utf8');
const checks=[
 ['module publié',build.includes('admin-v2-itineraire.js')],
 ['module chargé après actions',build.indexOf("'/admin-v2-actions.js'")<build.indexOf("'/admin-v2-itineraire.js'")],
 ['bouton calcul prix',js.includes('Calculer le prix depuis les adresses')],
 ['départ et arrivée utilisés',js.includes("$id('tfDepart')")&&js.includes("$id('tfArrivee')")],
 ['géocodage BAN',js.includes('api-adresse.data.gouv.fr/search/')],
 ['repli Photon',js.includes('photon.komoot.io/api/')],
 ['distance routière OSRM',js.includes('router.project-osrm.org/route/v1/driving/')],
 ['grille serveur uniquement',js.includes("param('tarif_general_'+cle)")],
 ['prix écrit dans champ téléphone',js.includes("$id('tfPrix').value")],
 ['aucun tarif kilométrique recopié',!js.includes('2.35')&&!js.includes('2.65')&&!js.includes('4.08')&&!js.includes('4.00')],
 ['échec non destructif',js.includes('Le prix reste saisissable manuellement.')]
];
let ko=0;for(const [n,c] of checks){console.log((c?'✔':'✘')+' '+n);if(!c)ko++;}
console.log(`${checks.length-ko}/${checks.length} contrôles réussis`);process.exit(ko?1:0);
