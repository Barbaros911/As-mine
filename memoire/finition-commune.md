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

## Le premier dessin est le bon (19/10/2026, audit)

(La finition commune du 11/10 avait été demandée par « fait le comme un expert » ; la démo charge la même finition : le prospect voit ce que voit un partenaire.)

Mesuré sur le site construit, 4G lente et processeur ralenti ×4
(`/application.html?h=easyhotel-aeroville`, 390 × 844) : la page arrivait
d'abord comme l'accueil public — en-tête de 62 px, bandeau, sections — puis
le script de fin de page posait `body.hotel` (en-tête à 94 px, accueil
masqué), puis la finition posait `hotel-enhanced` (76 px). Deux sauts sous
le doigt, CLS 0,56 ; l'accueil, lui, est à 0,001.

- **Première version, éprouvée et rejetée** : poser seulement les deux
  classes du corps dès `<body>`. L'accueil disparaissait bien du premier
  dessin, mais le bandeau de l'hôtel, les destinations et les champs
  n'arrivent qu'au script : le formulaire descendait de 316 px — CLS 0,81,
  pire qu'avant. *Un état posé à moitié bouge plus qu'un état posé tard.*
- **Ce qui tient** : les classes, ET un voile `html.hotel-avance` qui rend
  `.ecran` invisible (`visibility`, pas `display` : la place est prise,
  rien ne saute) jusqu'à `ouvrirModeHotel()`, qui le retire ; tout ce qui
  suit dans le script s'applique avant le prochain dessin. Filet de 5 s si
  le script ne venait pas : la page publique plutôt qu'une page blanche.
  Résultat : 0,04 — ce qui reste est la finition qui remonte le bloc
  « Client » dans l'ordre du tunnel, à la tâche suivante.
- **La décision se prend sur la clé exacte** (`?h=easyhotel-aeroville`,
  en minuscules) : le script reconnaît aussi le nom et les alias après
  normalisation, et recopier cette normalisation dans le script d'avance en
  ferait une seconde recette. Une clé reconnue en avance l'est forcément
  par le script ; un nom ou un alias garde le comportement d'avant.
- **La démo retire le script** (`construire-demo.mjs`) : il nomme la clé
  d'un partenaire réel, que `verifier-demo.mjs` refuse — c'est lui qui a
  arrêté la première construction.
- **Le contrôle ralentit réseau et processeur** (`test-easyhotel-client`) :
  sur un serveur local la page arrive d'un bloc et le défaut n'existe pas.
  Il vérifie aussi que le voile est levé et qu'un hôtel inconnu garde
  l'accueil public, sans classe ni voile.

