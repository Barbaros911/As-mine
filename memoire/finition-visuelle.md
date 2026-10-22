# La finition visuelle du site public — 19 octobre 2026

Demande de Barbaros : rendre Elatransfer « plus premium, plus simple, plus
crédible, plus moderne, plus orienté réservation », **sans refonte** : garder
l'identité, l'architecture, le moteur, les espaces hôtel, la réception, l'admin,
le référencement et les parcours. Puis, sur le diagnostic : « Fait tout comme un
expert, je veux un résultat 10/10 ».

## Le contexte : une autre session sur les mêmes fichiers

Deux PR étaient ouvertes sur l'accueil, `/professionnels/` et la note Google
(#375, et #376 qui la reprend en entier plus une correction du bloc
partenaire). L'audit a été fait sans rien écrire ; le travail a commencé sur la
tête de #376, puis, #375 fusionnée entre-temps, il a été **reposé sur le `main`
du moment** (seul son commit, rien de #376). #376 a fusionné avant celle-ci :
elle touchait le texte du bloc partenaire, pas ce dessin ; les seules lignes
communes étaient le numéro de `CACHE` (`sw.js`, monté à v187 au-dessus de son
v186) et le plafond de `test-doc.mjs` (la taille réelle du mémo après fusion).

## Le diagnostic (mesuré sur le site construit, 320 → 1920 px)

- Le sous-titre du bandeau à **12,5 px**, en gras, sur la photo : le texte le
  plus petit de l'écran à l'endroit qu'on lit en premier.
- Quatre styles de texte empilés sous le titre (sous-titre blanc, liste cyan
  gras qui se lisait comme quatre liens, horaires gris, note Google soulignée).
- **Six titres de section à la même taille (25 px)** que leur rôle soit majeur
  ou non, et presque toutes les sections au même schéma « titre + 3 boîtes ».
- **Six arrondis différents** (14, 15, 16, 17, 18, 22 px) et trois ombres.
- Trois boîtes pour les trois étapes, entre la boîte du formulaire et la boîte
  bleue d'« Inclus » : une page de boîtes.
- L'encart pro avec **trois actions de même poids** (bouton plein, bouton creux,
  e-mail).
- Le pied encore en **#17636A**, le céladon d'avant le 4 octobre.
- Sur ordinateur, l'ombre de la carte du formulaire débordait du bandeau et
  faisait une **tache grise** sur le blanc, sous la photo.
- La page Professionnels : trois pavés gris sans dessin (« Ce que vit votre
  réception ») qui avaient l'air d'une maquette pas finie.

## Ce qui a été fait (CSS seulement, aucun texte ni comportement)

- **La ligne des services devient le sur-titre du grand titre** (`order:-1`,
  petites capitales, 12 px) : elle dit OÙ avant que le titre dise QUOI. Le
  lecteur d'écran garde l'ordre du code.
- Sous-titre à **15 px** (14,5 sous 361 px), graisse 500 ; titre à 48 px au-delà
  de 1100 px.
- Sur ordinateur, horaires et note Google sur **une ligne** (grille, pas une
  rangée : dans une rangée qui passe à la ligne, le titre et le sous-titre, qui
  ont une largeur maximale, se posaient côte à côte — vu au premier essai). La
  note ne change donc plus la hauteur du bandeau sur ordinateur.
- La carte du formulaire se pose à ~30 px sous la promesse (elle flottait 95 px
  plus bas) : le bandeau raccourcit, « Voir mon prix » remonte de 60 px sur
  ordinateur (586 au lieu de 646 à 1366 × 768). Ombre resserrée, plus de tache.
- Téléphone : le bandeau suit son contenu (plus de hauteur minimale) ; « Voir mon
  prix » remonte de 11 px (657 au lieu de 668 à 390 × 844 ; 22 px de marge au
  lieu de 10 au-dessus de la barre à 360 × 740).
- « Hôtel, agence, entreprise ? » sous le formulaire : une ligne de texte, plus
  une carte à filet bleu. Il reste (`test-nouveau-bascule` l'exige, et c'est le
  seul chemin vers `/professionnels/` dans le premier écran du téléphone).
- **Jetons** sur la portée publique : `--t-sur`, `--t-h2`, `--t-h3`,
  `--t-corps`, `--t-second`, `--r-carte` (16), `--r-bloc` (20), `--r-ctrl` (12),
  `--o-carte`, `--esp-section` (48 / 80).
- Étapes en **frise** (chiffres reliés par un trait), accueil et page pro.
- Cartes des services et d'« Au-delà du trajet » : une seule recette ; une
  flèche au pied des cartes de services (elles finissaient sur un vide, et elles
  mènent au formulaire). Survol : légère élévation, coupée par
  `prefers-reduced-motion`.
- Encart pro : **un** bouton plein, la démo et l'e-mail en liens.
- FAQ en liste à filets, plus en boîtes.
- Page Professionnels : guillemets sur les trois phrases du comptoir, pastilles
  et chiffres à l'accent clair, mêmes arrondis.
- `sw.js` : CACHE monté.

## Ce qui a été proposé et volontairement PAS fait

- **Mettre des lieux dans le grand titre** (« Transferts aéroport et chauffeur
  privé à Paris ») : refusé le 8/10/2026 par Barbaros (« il ne faut pas se fixer
  en France ») ; les lieux sont dans le sous-titre et dans le titre pour Google.
- **Un choix « Aujourd'hui / Programmer »** : « Maintenant » a été retiré
  partout le 8/10 à sa demande, et ce choix ajouterait un appui à la majorité
  qui réserve à l'avance.
- **Un menu « burger » sur téléphone** : la barre du bas donne Réservations et
  WhatsApp en un appui ; un menu les cacherait.
- **Un bouton « Réserver » dans l'en-tête** : doublon du formulaire, déjà dans
  le premier écran.
- **Un bloc « Destinations »** : « Nos services » nomme déjà les lieux, et les
  pages CDG / Orly existent pour Google ; il rallongerait la page.
- **Changer la photo du bandeau** : décision de Barbaros du 7/10 (tour
  illuminée acceptée en connaissance de cause). À rouvrir avec lui seulement.
- **Une maquette de téléphone sur la page pro** : le meilleur levier restant,
  mais il faut de vraies captures de la page client et de l'espace réception —
  à faire à part.

## Les contrôles

`test-public-finition.mjs` (site construit) : sur-titre au-dessus du titre et
sur une ligne, sous-titre lisible, marge du bouton au-dessus de la barre, bouton
dans l'écran d'un 1366 × 657, carte à moins de 60 px de la promesse, blanc sans
tache sous la photo, titres de section tous égaux et dominants, une seule
recette de carte, un seul bouton plein dans l'encart pro, pied à l'encre des
titres, étapes sans cadre et reliées (accueil et page pro), guillemets, et
**aucun jeton** sur la page d'un hôtel, son comptoir et l'admin.

---

## Archivé de CLAUDE.md le 22/10/2026

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## LA FINITION VISUELLE — UNE ÉCHELLE, UNE CARTE (19/10/2026)
Site public seulement, dans la façade (« FINITION VISUELLE ») : sur-titre 12 px,
titres de section tous égaux (26/32 px), une recette de carte (16 px, filet,
ombre douce), un seul bouton plein par encart. Ne pas réintroduire une taille,
un arrondi ou une ombre « pour ce bloc-là » : c'est ce qui faisait amateur.
`test-public-finition.mjs` ; histoire et mesures : `memoire/finition-visuelle.md`.
