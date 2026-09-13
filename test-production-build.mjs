import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

/* Garde-fou production : une maquette ne doit jamais remplacer par erreur
   l'application de réservation à la racine du domaine. Ce test se place du
   point de vue d'un vrai visiteur : / doit être indexable et réservable ; les
   entrées easyHotel et réception doivent revenir vers la même application. */
execFileSync('sh', ['construire.sh'], { stdio: 'inherit' });

const lire = (p) => fs.readFileSync(p, 'utf8');
const accueil = lire('site/index.html');
const hotel = lire('site/hotel/easyhotel-aeroville/index.html');
const reception = lire('site/reception/easyhotel-aeroville/index.html');

const verifie = (nom, condition) => {
  if (!condition) throw new Error(`ECHEC — ${nom}`);
  console.log(`OK — ${nom}`);
};

verifie('la racine contient le vrai champ de départ', /id=["']depart["']/.test(accueil));
verifie('la racine contient le bouton de recherche de prix', /id=["']btnVoirPrix["']/.test(accueil));
verifie('la racine reste indexable', /name=["']robots["'][^>]+index\s*,\s*follow/i.test(accueil));
verifie('la racine annonce son URL canonique', /rel=["']canonical["'][^>]+https:\/\/elatransfer\.com\//i.test(accueil));
verifie('le thème des 4 rôles est chargé sur la vraie application', /application-role-theme\.css/.test(accueil));
verifie('la maquette statique ne remplace plus la racine', !/ELA Transfer — référence client/.test(accueil));
verifie('la copie de compatibilité reste le même moteur', lire('site/application.html') === accueil);
verifie('easyHotel ouvre le mode hôtel de la vraie application', /\.\.\/\.\.\/\?h=easyhotel-aeroville/.test(hotel));
verifie('la réception ouvre son mode sur la vraie application', /\.\.\/\.\.\/\?reception=easyhotel-aeroville/.test(reception));

console.log('\nSite de production : garde-fous validés.');
