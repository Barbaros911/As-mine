# L'admin ergonomique — l'histoire (9 et 10 octobre 2026)

Ce fichier garde le POURQUOI et les mesures. La règle qui vaut aujourd'hui est
dans `CLAUDE.md`, section « L'ADMIN ERGONOMIQUE ». Ne lire ceci que si le
sujet revient.

## La demande (9 octobre 2026)

Barbaros : « je voudrais pouvoir effacer, supprimer les éléments de l'admin…
supprimer une course, ne plus l'afficher, rafraîchir, actualiser, retour… cela
rend mon admin logique, ergonomique, place bien les choses, mets en place
course test… fais-le comme un expert senior, gestion. Dis-moi si tu as des
suggestions, des avis. »

## Ce que la revue a vu, mesuré sur le site construit à 390 × 844

- **Le tableau de bord cachait son travail.** Avant la première demande en
  attente : le menu (onze tuiles sur trois rangées), le bloc « Équipe », le
  titre, le bandeau du son, le rappel de sauvegarde, le bandeau « sans
  chauffeur », les deux boutons d'entrée et les filtres. La première carte
  finissait à **923 px** sur un écran de 844. Il ouvre cet écran vingt fois par
  jour pour une seule chose, et elle n'était pas visible.
- Rien pour retrouver une course vite : la recherche vivait dans le registre,
  après les graphiques.
- Supprimer se faisait une course à la fois, depuis la fiche ; vingt essais à
  nettoyer, c'était quarante appuis. Et un essai se confondait avec une vraie
  course jusque dans le chiffre d'affaires du centre de contrôle.
- Chauffeurs : le formulaire de douze champs avant la liste. Réglages :
  « Notifications ELA » tout en bas. La pastille de l'hôtel tronquée en
  « eas… » parce que la date répétait le titre du jour.

## Le lot 1 à 6 (PR #346) et son détour de CI

Actualiser, recherche instantanée (N°, nom, téléphone, adresse —
`correspondCourse`, partagée avec le registre), sélection multiple et
suppression en deux appuis (700 ms, un DELETE par course), « Course d'essai »
(`bon.essai`, `comptable()`), bandeaux sur une ligne, l'heure seule dans un
jour, registre et réglages réordonnés, chauffeurs : la liste d'abord.

**La première version mettait les outils en RANGÉE PERMANENTE** (champ de
recherche + « Sélectionner » au-dessus des filtres, +56 px) et le bouton
« Actualiser » sous la date (+30 px). La CI l'a refusée : `test-admin-voyant`
(scène K, bandeau d'alerte affiché) mesurait la première demande à 917 puis
927 px au lieu de 841. Et `test-admin-audit` tombait à 320 et 360 px :
« Appeler » sortait de la carte quand on armait « Terminée », parce que la
pastille de l'hôtel (`.d-prov{flex:0 0 auto;max-width:42%}`) refusait de
céder. **Deux leçons** :
- le budget de l'écran se MESURE à chaque changement (K : 841 px sur 844
  après le correctif — deux icônes rondes dans la ligne du titre, recherche
  repliée sous la loupe, « À jour · HH:MM » en sous-ligne) ;
- sur la ligne du bas d'une carte, **l'ordre dans lequel on cède** est une
  règle : la ligne grise d'abord (`flex:1 1 0`), la pastille de l'hôtel
  ensuite (`flex:0 1 auto;min-width:0`), les boutons jamais
  (`flex:0 0 auto`). Armée, la ligne ne porte que les deux boutons.

Un piège de mesure trouvé au passage : `test-admin-pilotage-ecran` lisait des
rectangles pendant l'animation d'entrée (`apparait`, 0,26 s, translateY 6 px)
et trouvait 43,999 px pour un bouton de 44 ; on attend la fin des animations
bornées avant de mesurer (`document.getAnimations()`).

Deux questions avaient été posées à Barbaros ce soir-là : le menu en deux
rangées, et le bloc « Équipe » masqué sans agent. Réponse le lendemain :
« Corrige tout ».

## Le lot B (10 octobre 2026) : le menu, et « Équipe »

Mesuré AVANT, à 390 px : `nav.admin-nav` **357 px** = barre du haut 71 +
tuiles 284 (trois rangées : 63 + 54 + 63, plus le bloc « Équipe » 57 px et
ses marges) ; scène K : première demande 719 → 841 ; pire cas (son coupé +
sauvegarde + « sans chauffeur ») : 801 → **923**.

Ce qui a été fait :
- **« Nouvelle course » n'est plus une tuile sur téléphone**
  (`body.espace #btnCreerNav{display:none}` sous 900 px). Elle existe sous le
  titre du tableau de bord (« Saisir par téléphone », `#btnSaisirCourse`),
  et c'est ce bouton que les suites cliquent désormais. Sur ordinateur la
  colonne a la place, l'entrée y reste.
- **« Quitter » et « Se déconnecter » sont deux liens sous l'état du compte**
  (`.admin-sortie`, dans `.admin-qui`), mêmes identifiants (`#btnQuitter`,
  `#btnDeconnexionNav` : six suites les cliquent). Des liens de 34 px de
  haut, pas des boutons pleins. **Pourquoi là et pas ailleurs** : une rangée
  de texte à part aurait coûté 44 px + 6 de marge contre 60 pour une rangée
  de tuiles — un gain de 10 px ; les poser à côté du logo, de front avec
  l'état du compte, ne tenait pas à 320 px (logo 104 px + bloc du compte
  183 px = 287, il ne restait rien). Sous les deux lignes d'état, dans la
  colonne que la largeur « Alertes : non vérifiées » fixe déjà, la barre du
  haut grandit de 37 px (61 → 98) et le menu perd une rangée entière.
  Sur téléphone leurs icônes sont masquées (à 320 px, « Quitter ·
  Se déconnecter » doit tenir à côté du logo) ; `flex-wrap` les fait
  passer à la ligne plutôt que déborder si la place manque.
  Conséquence sur ordinateur : les deux entrées quittent le bas de la liste
  et vivent dans le bloc du compte, en haut de la colonne.
- **Le bloc « Équipe » n'apparaît que si le serveur connaît un compte
  agent** (`agent-role-ui.mjs`, `rafraichirPresences` : sans ligne
  `agent_reservation` dans `presences_operateurs`, `hidden`). Il disait
  « Agent réservation : hors ligne » à quelqu'un qui travaille seul : un bloc
  qui n'aide à décider de rien. Il revient de lui-même le jour où un agent
  existe.

Mesuré APRÈS, à 390 px : `nav.admin-nav` **246 px** (barre du haut 98, huit
tuiles sur deux rangées 135) ; scène K : première demande **608 → 729** ;
pire cas : **690 → 812**, dans l'écran. À 320 px, les deux liens passent sur
deux lignes et la grille fait trois rangées de trois ; rien ne déborde.

`test-admin-ergonomie.mjs` verrouille la forme du menu, l'absence puis la
présence du bloc « Équipe » (faux serveur sans agent, puis avec), et le pire
cas mesuré ; `test-nouveau-exploitant` ne parcourt plus que les tuiles
VISIBLES (une tuile masquée ne se clique pas) ; les suites du Pilotage
ouvrent « Nouvelle course » par le bouton du tableau de bord.

## 10 octobre 2026 — « Sélectionner » sort de la loupe, et la sélection sait « Réalisées »

Barbaros, capture de 20 courses d'essai réalisées : « il faut que je puisse
supprimer ces courses test ou réaliser quand je le souhaite, et pareil pour la
page réception ». La suppression groupée existait depuis la veille, mais rangée
derrière la loupe : il ne l'avait pas trouvée. Elle est devenue une troisième
icône en tête (`#btnBordSelection`, même identifiant), et la barre de sélection
porte « Réalisées » à côté de « Supprimer » : deux appuis, 700 ms au moins, par
`majCourse` (commission figée, file d'envoi, version) ; une course déjà
réalisée, refusée ou annulée est laissée telle quelle.
**La réception reste en lecture**, question posée : « toi seul supprimes ». Une
course supprimée ou réalisée dans l'admin change chez eux à la relecture
suivante (30 s). La règle du 30/09 (« la réception ne peut annuler ») tient.
`test-admin-ergonomie` (bloc 2 bis).
