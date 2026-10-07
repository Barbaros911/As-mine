# La photo du bandeau d'accueil — « Paris la nuit » (Bloc 2, 7 octobre 2026)

Suite du Bloc 1 (positionnement, PR #331). Barbaros a fourni l'image : Paris de
nuit, l'entrée d'un hôtel, un chauffeur ouvrant la portière d'une berline noire
à une cliente, la tour Eiffel au centre. Image générée, 1672 × 941 px, PNG 3 Mo.

## Ce qui a été mesuré avant d'écrire une ligne

- **La photo publiée jusque-là était une vignette** : 588 × 393 px, 39 Ko,
  provenance non documentée (PR #261). Agrandie 2,4 fois sur un écran de
  1440 px. Voile marine à 91 % à gauche, filtre de désaturation. Sur téléphone,
  le titre était posé sur le torse du chauffeur ; rien de Paris ne se voyait.
- **La disposition ordinateur du 6/10 (P0-C, formulaire à droite) recouvrait
  les sujets** : le chauffeur, la cliente et la portière sont à 62–90 % de la
  largeur de la photo, la carte du formulaire à 60–91 % de l'écran. Avec une
  photo au format 16:9 dans un bandeau deux fois plus large que haut, aucun
  décalage horizontal n'est possible : « cover » ne rogne qu'en hauteur.
  D'où le formulaire À GAUCHE, sous la promesse, en deux colonnes (620 px) :
  la forme qu'il a déjà entre 900 et 1099 px. Quatre champs par ligne ont été
  essayés : la date se tronquait en « 10/06/202 ».
- **Luminance de la photo** par colonne (sur 255) : 23 à 40 dans le tiers
  gauche, 12 à 19 sur la carrosserie, 50 à 70 sur l'entrée de l'hôtel. Le
  texte blanc n'a besoin d'aucun rideau : un dégradé LOCAL, arrêté là où la
  scène commence. Mesuré derrière chaque ligne après rendu : moyenne 20–42,
  pics 58–137. `test-public-ordinateur` le mesure désormais par le navigateur.
- **Téléphone : le bandeau ne peut pas grandir.** « Voir mon prix » est à
  705–759 pour une barre à 784. Avec cinq lignes de texte sur 396 px, la photo
  ne peut être qu'une ambiance : recadrage dédié de la moitié droite (entrée,
  chauffeur, cliente, portière), dégradé vertical, la cliente visible à droite
  du bouton. Un premier jet plein cadre ne montrait que le ciel et la tour sous
  le titre.
- **Tablette** : texte à 50 % à gauche (`margin:0`, sinon la façade centre le
  bloc), titre 32 px, la tour tombe entre le texte et le chauffeur.

## Les deux réserves, dites à Barbaros

1. **La tour Eiffel illuminée** : l'éclairage nocturne est une œuvre protégée,
   et le mémo l'interdit. L'image est générée, donc sans photographe, mais c'est
   le dessin lumineux qui est protégé, quel que soit le support. Décision de
   Barbaros le 7/10/2026 : « A oui », il la garde en connaissance de cause.
2. **Image de synthèse visible de près** (main gantée, enseigne, lampes) ;
   crédibilité notée 6,5/10. La vraie réponse reste une photo à lui : Paris à
   l'heure bleue depuis le trottoir, chauffeur de dos, pas d'enseigne lisible
   sauf partenaire signé. Pas easyHotel : marque économique, zone d'Aéroville,
   et un seul partenaire enfermerait l'accueil.

## Les photos écartées le même jour

Cinq aperçus iStock de 612 × 408 px (40 à 58 Ko) : des vignettes de résultats,
donc des images Getty sans licence — jamais sur le site. La cinquième (chauffeur
ganté, valise, aucun visage ; auteur AnnaStills, titre dans les métadonnées du
fichier) était le bon choix à acheter ; Barbaros a trouvé l'achat trop
compliqué et a gardé « Paris la nuit ». Unsplash, Pexels, Pixabay et iStock sont
bloqués par le réseau de cette machine : une photo libre se cherche après
ouverture de ces hôtes dans les réglages de l'environnement.

## Performance

PNG source 3 083 Ko, jamais publié (construire.sh copie tout `photos/`). WebP
q84 1672 px : 146 Ko ; tablette 1200 px : 85 Ko ; téléphone 803 × 941 : 78 Ko.
AVIF q60 : 96 Ko, non retenu (un seul format, pas d'`image-set`). Pas de saut de
mise en page : la hauteur vient du texte. Écran Retina d'ordinateur : la source
ne fait que 1,16 fois 1440 px, légèrement douce ; ne pas agrandir. Préchargement
non ajouté : la même page sert les hôtels, où le bandeau est masqué.
