# Le site public sur ordinateur — archive

> **Archive, octobre 2026.** Ce qui reste vrai tient en trois lignes dans
> `CLAUDE.md`, section « LE SITE SUR ORDINATEUR ». Ici : pourquoi, et ce qui
> a été mesuré. Lots P0-A, P0-B, P0-C (branche
> `claude/elatransfer-desktop-audit-refonte-rtoaoo`).

## Ce que l'audit a mesuré (5 octobre 2026)

La consigne disait « un site mobile de 520 px posé au centre ». C'était faux
depuis la façade du 29/09 : la page n'était plus bridée. Le vrai défaut était
que tout avait été ÉLARGI sans être recomposé :
- à 1366×768 et 1024×768, la barre du bas mangeait le tiers bas de « Voir mon
  prix » — un clic là ouvrait un onglet ;
- prix, récapitulatif, bon s'étiraient d'un bord à l'autre (à 1440 px, le
  prix à 1 380 px de son libellé) ;
- la carte du formulaire touchait les bords à 1024 px ; le logo à 18 px du
  bord pendant que le contenu commençait à 370 px en 1920 ;
- la façade remettait `padding-bottom` à 0 sur ordinateur alors que la barre
  restait fixée : le pied (documents légaux) passait dessous ;
- la grille du formulaire plaçait ses enfants UN PAR UN — Date/Heure prenait
  une ligne entière (son id commence par « bloc »), et l'écriteau « longue
  distance » tombait dans une colonne de 86 px.

## P0-A — une colonne, le tunnel en 720 px

Tout l'accueil sur une colonne de 1180 px au plus, 24 px de marge au moins ;
le tunnel en colonne de lecture de 720 px ; la grille du formulaire inversée
(tout enfant prend la ligne, seuls ceux qui vont par deux sont nommés).
**Le téléphone n'a pas bougé d'un pixel** : pages entières comparées à `main`
de 320 à 899 px.

## P0-B — le menu remplace la barre

**LA HAUTEUR QUI COMPTE N'EST PAS CELLE DE L'ÉCRAN.** Un portable 1366×768
n'offre que ~657 px utiles dans Chrome (onglets, barre d'adresse, barre des
tâches). À cette hauteur, après P0-A, la barre couvrait encore 52 px sur 54
du bouton. Seul le retrait de la barre sur ordinateur le règle.
- Rien ne se perd : Accueil = le logo ; Réservations et Trajets = « Mes
  courses » (une liste `details`, refermée d'un clic ailleurs ou par Échap) ;
  WhatsApp = « Contact », qui ouvre LA MÊME feuille (référence comprise).
- Une navigation par écran : barre sur téléphone, menu sur ordinateur.
- Pas de « Réserver » dans l'en-tête : le formulaire est à l'écran.
- `test-nouveau-langues` visait `[data-t="nav_courses"]` dans toute la page :
  le menu réutilise la clé. Il vise maintenant `.barre`.

## P0-C — le bandeau en deux colonnes, et ce qu'il fait vraiment

- Au-delà de 1100 px, l'écran d'accueil devient une grille et la carte du
  formulaire se pose sur la première rangée, à droite du titre (440 px, sa
  forme de téléphone). **Le formulaire ne bouge pas dans le code** : mêmes
  identifiants, même ordre au clavier. « Réserver mon trajet » s'efface : un
  seul bouton principal. Entre 900 et 1099 px, le texte n'aurait plus eu que
  400 px : la carte reste dessous.
- Barbaros a coché ce qu'il propose VRAIMENT en plus du trajet : chauffeur à
  l'heure, groupes et événements, accueil à l'aéroport. **Pas la
  conciergerie** — elle était dans le bandeau sans être décrite nulle part :
  retirée. La ligne de résumé est devenue « Aéroports · Gares · Salons ·
  Chauffeur à l'heure ».
- **« Salons & expositions »** (Porte de Versailles · Villepinte · Le
  Bourget), à sa demande, remplace la mise à disposition parmi les cinq
  services : ce sont des adresses, la carte mène au formulaire.
- **« Au-delà du trajet »** : chauffeur à l'heure et groupes mènent à « Nous
  joindre » (devis) ; l'accueil mène au formulaire. **L'accueil EST l'option
  pancarte** (sa réponse) : son prix est lu dans `OPTION_PANCARTE_EUR`, et il
  ne s'appelle pas « VIP » — le mot fait attendre plus qu'une pancarte, et
  les CGV parlent de pancarte.
- **Pas de forfait groupé** transport + hôtel + activité : ce serait un
  forfait touristique, réservé aux agents de voyages immatriculés (Code du
  tourisme L211-1). Chaque service séparément, sur devis, n'en est pas un.

## P0-D — le bas de page

- « Hôtel, agence, entreprise ? » est masqué au-delà de 900 px : le menu du
  haut porte « Professionnels », qui mène au même bloc. Il reste sur
  téléphone, où il n'y a pas de menu.
- « Inclus dans chaque course » passe ses quatre faits de front ; les titres
  de section passent de 20,5 à 27 px, les sections s'espacent de 56 px.
- La FAQ (au-delà de 1100 px) : titre à gauche, questions à droite. **Piège
  rencontré** : la marge basse du titre agrandissait la première rangée de la
  grille, et l'écart sous la première question devenait plus grand que les
  autres. Le contrôle mesure les écarts entre questions.
- Le pied sur une ligne : téléphone, pages, mentions.
- Téléphone et tablette : pages entières identiques au pixel, de 320 à 899 px.

## Deux corrections au passage (6 octobre 2026, Barbaros : « 1 retire 2 corrige »)

- **« Une demande particulière ? »** (bloc « Qui sommes-nous », #325) redisait
  en une ligne ce que « Au-delà du trajet » montre en cartes : retiré, avec
  ses clés `devis_*` et ses styles. Le bandeau n'annonce plus « sur mesure ».
- **Les mentions légales nommaient GitHub seul comme hébergeur.** Le domaine
  pointe vers Cloudflare, qui construit et déploie le site, et `pages.yml`
  publie toujours sur GitHub Pages. Lequel des deux sert les visiteurs
  derrière Cloudflare n'a jamais pu être mesuré d'ici : les deux sont donc
  nommés, ce qui est vrai dans les deux cas. Adresse et téléphone de
  Cloudflare : ceux de ses rapports annuels à la SEC (101 Townsend Street,
  +1 888 993 5273). Le jour où GitHub Pages est éteint, retirer sa ligne.

---

### CE QUE LE BANDEAU A CASSÉ — LA BARRE DU BAS MANGEAIT « VOIR MON PRIX »

Septembre 2026, trouvé par les suites juste avant la mise en ligne. **Le
défaut le plus coûteux de la soirée, et il était invisible.**

Le bandeau plus haut a poussé « Voir mon prix » à **774–827** pendant que la
barre du bas occupe **784–844**. Sa moitié basse passait **derrière** la
barre : un client qui ouvre la page, remplit le formulaire et appuie au
milieu du bouton **ouvrait l'onglet « Trajets »**. Il ne voyait pas son prix,
il changeait d'écran, sans le moindre message.

- **LA NOTE « le formulaire entier tient dans le premier écran, ne pas le
  remonter » N'ÉTAIT PAS DE LA COQUETTERIE.** Elle protégeait exactement ça,
  et je l'ai enfreinte en croyant ne coûter qu'un défilement.
- **LA RÈGLE EXISTANTE NE COUVRAIT PAS CE CAS** : le contrôle des éléments
  flottants de `test-nouveau-bon` **exclut explicitement `.barre`**, parce
  qu'elle est légitime et toujours là. C'est précisément pour ça qu'il en
  fallait une autre — **ce qui est toujours là ne se remarque plus**.
- **CE QUI A PAYÉ LES 68 px : le bloc « Réserver un trajet / Simple, rapide
  et sécurisé ».** C'est exactement celui qu'il avait désigné en demandant
  une vraie accroche. Le bandeau dit maintenant qui l'on est, ce qu'on vend
  et à quel prix, et il porte un bouton qui descend ici : répéter le titre
  juste en dessous, avec une icône de 50 px, c'était accueillir deux fois.
  Une correction de mise en page qui supprime un doublon vaut mieux qu'une
  correction qui grignote cinq marges.
- **LE TÉMOIN DE LANGUE VISAIT CE BLOC** — `[data-t="reserver_titre"]`, dans
  quatre contrôles de `test-nouveau-langues`. Il vise désormais
  `[data-t="btn_prix"]` : **un témoin doit viser ce qui ne peut pas
  disparaître**, ici le bouton sans lequel il n'y a pas de réservation.
- **LE SYMPTÔME N'AVAIT AUCUN RAPPORT AVEC LA CAUSE.** `test-nouveau-option`
  s'arrêtait sur un délai en cherchant `.veh-carte`, parce qu'un
  `click({force:true})` avait atterri sur la barre et ouvert l'écran des
  trajets. **`force:true` ne signale pas un bouton recouvert : il clique à
  côté et continue.** Une suite qui n'affiche ni réussite ni échec est un
  échec — ne jamais la lire comme « pas concernée ».
- **LE PREMIER JET DU NOUVEAU CONTRÔLE PASSAIT AU VERT SUR LA VERSION
  CASSÉE.** Il était placé **après** le clic sur le bouton du bandeau, donc
  sur une page déjà défilée : il lisait 365 px là où le client voit 774. Un
  contrôle de position se mesure **à l'arrêt, avant tout geste**. Éprouvé
  ensuite contre l'ancien code : il rend « reçoit : onglet ».
