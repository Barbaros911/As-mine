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
  ['{ cle:"cdg",        nom:"Aéroport CDG",           aeroport:"cdg",\n          jour:{ berline:35,  van:40  }, nuit:{ berline:40,  van:45  } }',
   '{ cle:"cdg",        nom:"Aéroport CDG",           aeroport:"cdg",\n          jour:{ berline:35,  van:50  }, nuit:{ berline:35,  van:50  } }'],
  ['jour:{ berline:100, van:125 }, nuit:{ berline:105, van:130 }',
   'jour:{ berline:100, van:125 }, nuit:{ berline:100, van:125 }'],
  ['jour:{ berline:45,  van:65  }, nuit:{ berline:50,  van:70  }',
   'jour:{ berline:45,  van:65  }, nuit:{ berline:45,  van:65  }'],
  ['jour:{ berline:180, van:240 }, nuit:{ berline:185, van:245 }',
   'jour:{ berline:180, van:240 }, nuit:{ berline:180, van:240 }'],
  ['jour:{ berline:35,  van:50  }, nuit:{ berline:40,  van:55  }',
   'jour:{ berline:35,  van:50  }, nuit:{ berline:35,  van:50  }'],
  ['jour:{ berline:90,  van:120 }, nuit:{ berline:95, van:125 }',
   'jour:{ berline:90,  van:120 }, nuit:{ berline:90,  van:120 }'],
  ['jour:{ berline:80,  van:110 }, nuit:{ berline:85, van:115 }',
   'jour:{ berline:80,  van:110 }, nuit:{ berline:80,  van:110 }'],
  ['var nuit = nuitHotel(champDate.value, champHeure.value);',
   'var nuit = false; // easyHotel : aucun tarif nuit/week-end'],
  ['hotel_au_km:"Autre destination : le prix est calculé à la distance, comme sur le site."',
   'hotel_au_km:"Autre destination : le prix final est calculé automatiquement selon la distance."'],
  ['hotel_au_km:"Other destination: the price is calculated by distance, as on the site."',
   'hotel_au_km:"Other destination: the final price is calculated automatically from the route distance."'],
  ['function prix(gamme, km){\n    return Math.max(arrondiDizaine(gamme.parKm * km), gamme.mini);\n  }',
   'function prix(gamme, km){\n    if(typeof modeHotel === "function" && modeHotel() && !course.forfait){\n      var tauxHotel = gamme.cle === "van" ? 4.10 : 2.55;\n      return Math.max(Math.round(tauxHotel * km), gamme.mini);\n    }\n    return Math.max(arrondiDizaine(gamme.parKm * km), gamme.mini);\n  }']
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
