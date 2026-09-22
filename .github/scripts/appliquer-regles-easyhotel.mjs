import fs from 'node:fs';

const chemin = process.argv[2] || 'site/index.html';
let source = fs.readFileSync(chemin, 'utf8');

/*
 * Règles validées pour easyHotel Aéroville.
 * Ce transformateur ne touche à aucun style, logo, couleur, structure ou
 * contenu du site public. Il agit uniquement sur la logique tarifaire du
 * mode hôtel au moment de construire le site publié.
 */
const remplacements = [
  /* LES FORFAITS NE SONT PLUS RÉÉCRITS ICI, ET CE N'EST PAS UN OUBLI.
     Ils étaient corrigés au moment de construire : le dépôt portait un tarif
     de nuit, le site publié n'en avait pas. DEUX VÉRITÉS POUR UN MÊME PRIX,
     dont une seule se voyait — et c'est le site publié qu'on facture. La
     grille du dépôt est désormais alignée sur la source serveur
     (20260916100000_current_tariff_source.sql), qui déclare UN seul forfait
     par gamme. Il ne reste ici que ce que le dépôt ne peut pas porter :
     l'extinction de la mention « tarif nuit » et le tarif au kilomètre du
     partenaire. Si un tarif de nuit revient un jour, il se pose dans la
     source serveur ET dans HOTELS, jamais dans ce fichier.
     L'extinction de la mention « tarif nuit » n'y est plus non plus : le
     dépôt ne connaît tout simplement plus de tarif de nuit au comptoir.
     Elle avait d'ailleurs un trou — l'écriteau « Tarif nuit (21 h – 6 h)
     appliqué » lisait nuitHotel() DIRECTEMENT, et ce second appel n'était
     pas réécrit : le site publié annonçait donc un tarif de nuit sur un
     prix rigoureusement identique à celui du jour. Un transformateur qui
     corrige un calcul à un endroit et l'oublie à l'autre ne se voit pas. */
  ['hotel_au_km:"Autre destination : le prix est calculé à la distance, comme sur le site."',
   'hotel_au_km:"Autre destination : le prix final est calculé automatiquement selon la distance."'],
  ['hotel_au_km:"Other destination: the price is calculated by distance, as on the site."',
   'hotel_au_km:"Other destination: the final price is calculated automatically from the route distance."'],
  ['function prix(gamme, km){\n    return window.ELA_ROUTE.prix(gamme, km);\n  }',
   'function prix(gamme, km){\n    if(typeof modeHotel === "function" && modeHotel() && !course.forfait){\n      var tauxHotel = gamme.cle === "van" ? 4.10 : 2.55;\n      return Math.max(Math.round(tauxHotel * km), gamme.mini);\n    }\n    return window.ELA_ROUTE.prix(gamme, km);\n  }']
];

for (const [avant, apres] of remplacements) {
  if (!source.includes(avant)) {
    console.error('ERREUR : règle EasyHotel non appliquée, ancre introuvable : ' + avant.slice(0, 100));
    process.exit(1);
  }
  source = source.replace(avant, apres);
}

fs.writeFileSync(chemin, source);
console.log('Règles EasyHotel appliquées : forfaits uniques, 2,55 €/km Berline, 4,10 €/km Van, arrondi à l’euro.');
