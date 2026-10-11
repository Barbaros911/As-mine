# La finition commune des pages d'hôtel — archive

> Ce qui vaut aujourd'hui est dans `CLAUDE.md`, section « LA FINITION DES
> PAGES D'HÔTEL EST COMMUNE À TOUS LES PARTENAIRES ». Ce fichier garde le
> pourquoi, les mesures et la marche à suivre pour un nouveau partenaire.

## D'où ça vient (11 octobre 2026)

Barbaros a demandé si la démo donnait « exactement le même résultat »
qu'auraient les futurs partenaires, « comme pour la réception easyHotel ».
Réponse mesurée : non.

- `hotel-engine-polish.js` (la finition des pages d'hôtel : pastille du
  partenaire, ordre des champs, vert/rouge, comptoir « premium », traduction
  du comptoir) portait en dur le nom « easyHotel Aéroville », son adresse,
  l'adresse de sa page, et n'en reconnaissait aucun autre.
- `hotel-engine-polish.css` portait l'orange d'easyHotel et sa photo
  (chargée depuis `cdn.easyhotel.com`).
- `construire-espaces-hotel.mjs` ne fabriquait que la réception
  d'easyHotel, et `?reception=n'importe-quoi` y menait.
- La démo ne pouvait pas charger la finition (elle nommait un partenaire
  réel, `verifier-demo.mjs` l'aurait refusée) : elle montrait le moteur nu
  — nom et téléphone au récapitulatif, pas de vert/rouge, un comptoir sans
  « ESPACE RÉCEPTION » ni tuile « NOUVELLE COURSE ».

**Le défaut le plus grave n'était pas la démo.** La suite
`test-finition-commune.mjs`, lancée contre l'ancien code, montre qu'un
second partenaire ajouté à `HOTELS` aurait affiché **le nom, la photo et
l'orange d'easyHotel** sur sa propre page client, n'aurait eu **aucune page
de comptoir**, et que son lien `?reception=` menait au comptoir
d'easyHotel. 27 contrôles tombent sur l'ancien code.

## Ce qui a été fait

- **La finition ne nomme plus personne.** Le moteur expose l'hôtel ouvert
  (`window.ELA_HOTEL_ACTIF()` : clé, nom, nom court, adresse, page du QR, a
  une photo ou non — rien de la grille) et annonce `ela:hotel` à la fin de
  `ouvrirModeHotel()`. La finition s'en sert pour la pastille (nom court en
  gros, le reste dessous), le lien du logo, l'adresse sous le titre du
  comptoir. Elle redémarre à chaque annonce : dans la démo, l'hôtel s'ouvre
  après la réponse du serveur des démonstrations, parfois après la fenêtre
  de sept secondes de l'observateur.
- **Les couleurs sont des rôles.** `--eh-action` (fond sous du texte blanc :
  par défaut le `bouton` de l'hôtel, assombri pour le blanc),
  `--eh-bandeau` (fond sous une encre sombre : par défaut `vif`), `--eh-pale`,
  `--eh-pale-encre`. Les ombres teintées passent par `color-mix()`, avec un
  repli marine pour un navigateur ancien. Quatre clés facultatives de la
  marque (`finition`, `finition2`, `finitionPale`, `finitionEncre`)
  remplacent ces défauts : easyHotel les porte, avec exactement les valeurs
  d'avant.
- **La photo du bandeau est une donnée de l'hôtel** (`photoEntete`), posée
  par le moteur en `--h-photo-entete`. Sans photo, le bandeau client passe en
  aplat marine, compact — le même que celui du comptoir — au lieu d'un vide
  de 300 px. Le champ `photo` (le cadre du moteur nu) n'a pas changé.
- **Une page de comptoir par hôtel**, `/reception/<clé>/`, avec son
  manifeste. `/easyhotel-reception/` reste, pour easyHotel seul (icônes et
  favoris déjà posés). `?reception=` est résolu par clé, nom ou alias
  (la même mise à plat que `hotelDuParametre()`) ; un hôtel inconnu ne mène
  nulle part.
- **La démo charge la finition.** Son propre traducteur du comptoir reste
  pour ce qui lui est propre (clients « (exemple) », chauffeur fictif,
  lignes de détail). Les deux coexistent : mesuré, une réception ouverte en
  anglais puis repassée en français revient bien à « En attente » — une garde
  écrite pour séparer leurs domaines a été retirée, aucune mesure ne la
  justifiait. La traduction des jours (« lundi 13 octobre ») est passée dans
  la finition : la vraie réception la laissait en français. La photo choisie
  par le prospect va dans le bandeau, comme chez un partenaire ; le cadre
  devient « Changer la photo ».
- **Un contrôle passait à vide** dans `test-demo-hotel` : le contraste du
  bouton se lisait dans `backgroundColor`, transparente sous un dégradé —
  rapport de 21, toujours vert. Il lit maintenant la couleur peinte.

## Mesuré

- **easyHotel n'a pas bougé d'un pixel** : cinq captures (client téléphone
  et ordinateur, code du comptoir aux deux tailles, liste du comptoir), zéro
  pixel d'écart avant/après.
- Un changement de comportement, voulu : sur `application.html?h=<un hôtel
  non partenaire>` (affiche QR d'un hôtel quelconque), la finition ne
  s'applique plus. Elle déplaçait le bloc client sans les styles qui vont
  avec ; ce cas retrouve le tunnel ordinaire du site.
- Le logo d'un comptoir ramène à la page elle-même (avant :
  `/easyhotel-reception/` en dur, même depuis l'adresse propre).

## Ajouter un partenaire — ce qui reste à faire, dans l'ordre

1. **Sa fiche dans `HOTELS`** (`index.html`) : clé (minuscules et tirets,
   elle devient l'adresse `/reception/<clé>/` et le secret), `nom`, `court`,
   `marque` (cinq couleurs, contrastes mesurés), `adresse` postale complète,
   `lat`/`lon` de secours, `alias`, `destinations` et leurs forfaits.
   Facultatif : `photoEntete` (avec l'accord de l'hôtel), `pageClient`.
2. **Sa grille côté serveur** : une migration qui déclare le partenaire et
   ses forfaits, **de forme conditionnelle** (voir l'audit du 2 octobre),
   puis l'accord des trois endroits (`verifier-tarif-hotel.mjs`).
3. **Son code de comptoir** : le secret Supabase `HOTEL_<CLÉ>_CODE`
   (`_shared/hotel-session.ts` en dérive le nom), long.
4. **Sa page du QR** (les cartes de destination) : encore un dossier à part,
   sur le modèle de `sites/easyhotel-client/`. En attendant, le QR peut
   viser `/application.html?h=<clé>` : le moteur et la finition suffisent,
   le menu des destinations est déjà là.
5. **Les icônes de comptoir** (`icones/reception-*`) sont l'ELA orange
   d'easyHotel : communes à tous les comptoirs pour l'instant.
