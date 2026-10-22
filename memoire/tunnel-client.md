# Le tunnel de réservation du client — histoire

> **Archivé de `CLAUDE.md` le 22 octobre 2026** (rangement général). Texte tel qu'il y figurait, mot pour mot : c'est de l'**histoire**, datée, pas une consigne. Des chiffres et des noms y ont changé depuis. Ce qui vaut aujourd'hui est dans `CLAUDE.md`.

## Ce qui est propre au nouveau site

- **Deux gammes seulement**, Berline et Van. Les clés `berline` et `van` ne
  changent jamais : elles sont dans l'historique.
- **Deux langues**, français et anglais. Le site public s'ouvre en
  français ; les pages d'hôtel suivent le navigateur, et l'anglais y est le
  repli (voir « LA MARQUE ET GOOGLE »). Ajouter une
  langue veut dire écrire ~110 phrases à la main ; pas de traduction
  automatique sur un site où le prix engage.
- **Le client paie par lien, avant le départ** (10/10/2026) : voir « LE
  CLIENT PAIE SON CHAUFFEUR PAR LIEN ». Le comptoir aussi (11/10/2026).
- **Le message WhatsApp fait neuf lignes**, et sa STRUCTURE compte autant
  que son texte : les deux premières valeurs « … : … » sont les adresses,
  le **dernier montant en euros est le prix** — d'où la ligne « Paiement »
  placée AVANT « Prix » — et la dernière ligne est « nom — téléphone ».
- Référence `ELA-AA-MM-XXXXX`, jamais `ASM` : ASM venait du nom du dépôt,
  pas de la marque. **Cinq signes TIRÉS AU SORT depuis le 29/09/2026**, plus
  un compteur : voir « LA RÉFÉRENCE EST TIRÉE AU SORT » en fin de fichier.

**PLUS D'ONGLET « RÉSERVER »** (la barre en a quatre depuis : « QUATRE ONGLETS »)
(septembre 2026, à sa demande : « Enleve l'icône réserver elle ne sert a
rien »). « Réserver » ouvrait EXACTEMENT le même écran qu'« Accueil », à
la seule différence qu'il posait le curseur dans le champ de départ. Deux
onglets pour un écran, c'est un client qui appuie sur le second, ne voit
rien bouger, et en conclut que le site est cassé.
Conséquence à ne pas manquer : les écrans du tunnel — les prix, le
récapitulatif — se rattachent désormais à **« accueil »** dans la table de
`ecran()`. Sans ce déplacement, plus aucun onglet ne s'allume pendant la
réservation. Un test vérifie que **chaque onglet mène à un écran
différent** : la règle vaut pour tout onglet qu'on ajouterait demain.

## L'ARRIVÉE — LA PROMESSE, LE NUMÉRO, ET LA PANCARTE À 10 €

Septembre 2026, quatre demandes qui se suivent et qui tiennent ensemble.

**LA LIGNE SOUS LE BOUTON DIT « Prix annoncé à l'avance · Réglé au chauffeur »**
(clés `eng2` et `eng4` de « Inclus »). Jamais « prix ferme » (8/10/2026),
ni l'annulation gratuite, ni « WhatsApp ou SMS ». Histoire :
`memoire/formulaire-public.md`.

**L'ENCADRÉ « VOL OU TRAIN EN RETARD ? » (`.promesse`) EST RETIRÉ** le
6/10/2026 : il redisait la carte « Suivi du vol » posée juste en dessous. Son
histoire : `memoire/ordre-accueil.md`.

**LE MÊME CHAMP PREND LE NUMÉRO DE VOL OU DE TRAIN.** La promesse parlait du
train ; il fallait un endroit où l'écrire.
- **Un seul champ, pas deux** : c'est le LIBELLÉ qui change (`titreVol`,
  `ph_train`, `train_aide_*`, `train_court`). Deux champs feraient deux fois le
  code, deux fois les tests et deux lignes à tenir dans le bon.
- **ON NE LIT PAS LE MOT « GARE » DANS L'ADRESSE.** *12 rue de la Gare, Melun*
  n'est pas une gare, et le champ s'ouvrirait chez des gens qui prennent la
  voiture en bas de chez eux. `estGare()` lit le **type du lieu**
  (`railway=station`), conservé sur l'item sous `osm`. Les bouches de métro et
  les arrêts de tram sont dans la même catégorie pour l'icône : `PAS_UN_TRAIN`
  les écarte, on n'y prend pas de train.
- **On réécrit l'attribut `data-t`, pas seulement le texte** — sinon un
  changement de langue rappelle « Numéro de vol » sur un départ en gare.
- La course porte **`train: true/false`** : « 6201 » et « AF1234 » ne se
  distinguent pas à la relecture, et le bon de l'exploitant annoncerait « Vol »
  sur un TGV.

**LA PANCARTE EST UNE OPTION À 10 €** (`OPTION_PANCARTE_EUR`). Elle existait,
gratuite et automatique, et seulement en aéroport.
- **Éteinte à l'ouverture, toujours.** Une option cochée d'avance qui gonfle le
  total est un **paiement supplémentaire non consenti** (L224-76 Code conso.).
- **Elle est à DEUX endroits pour UN seul état** : sous la liste des véhicules
  (`.veh-option`, là où l'on décide de ce qu'on achète, à sa demande) et sur le
  récapitulatif (`.bloc-pancarte`, là où le client tape son nom et le voit
  s'écrire sur la pancarte). Les deux sont pilotés par la même fonction, en
  visant des **classes** (`.opt-pancarte`, `.opt-sous`, `.opt-prix`,
  `.opt-attente`) : deux commandes pour un seul état se désaccordent au premier
  oubli.
- **`jugerPancarte()` est appelée depuis `dessinerGammes()`** : l'écran des prix
  s'ouvre avant le récapitulatif, et jugée seulement là-bas l'option resterait
  cachée à l'endroit même où on la choisit.
- **L'aperçu n'apparaît qu'une fois l'option prise.** Montré d'emblée, il
  promettrait gratuitement ce qu'on vend.
- **LES 10 € S'AJOUTENT EN DERNIER**, après l'arrondi et le plancher. Entrés
  avant l'arrondi ils disparaîtraient une fois sur deux : 46 + 10 = 56 redescend
  à 60, et le client paierait **14 €** une option annoncée 10.
- **Pas de majoration dessus** : service à prix fixe. Il n'y a de toute
  façon plus aucune majoration sur le site depuis septembre 2026, mais la
  règle resterait vraie si l'on en réintroduisait une — une pancarte
  affichée 10 € se paie 10 €.
- **Une option qu'on ne voit plus ne se paie plus.** Changer son départ pour une
  adresse ordinaire reprend les 10 € — sinon il paierait un service qu'on ne
  peut plus lui rendre, sans même voir la ligne.
- **La ligne du message WhatsApp est AVANT le prix**, comme le règlement : le
  lecteur de demandes retient le **dernier** montant en euros comme prix de la
  course. Après le prix, la course serait recréée à 10 € au lieu de 80.
- **LES CGV ONT SUIVI, DANS LES DEUX LANGUES.** Elles promettaient la pancarte
  gratuitement à tout le monde (article 8) : la laisser telle quelle en
  facturant 10 € donnait au client un argument contre nous, le prix étant ferme
  donc opposable. L'article 4 décrit l'option et son montant, l'article 8 dit
  qu'elle est souscrite. **Toucher au prix veut dire toucher aux CGV.**
- L'attente offerte est dite **« après l'atterrissage »** (60 min en aéroport,
  30 min en gare) — exactement ce que disent les CGV.
- `.option` est entrée dans les `PROTEGES` de la pastille WhatsApp : mesuré,
  elle recouvrait le « +10,00 € ».

**UN CONTRÔLE TROP LARGE FINIT PAR INTERDIRE DES MOTS AU RESTE DE LA PAGE.**
`test-nouveau-paiement` interdisait « terminal » sur **tout** le récapitulatif,
pour empêcher qu'on justifie la question du règlement par le terminal de carte
du chauffeur. Il est tombé le jour où l'option a dit « devant la porte du
terminal » — un terminal d'aéroport. Il porte maintenant sur le seul
`#blocPaiement`, qui est son sujet.

## LE PAS DES CRÉNEAUX ET L'HEURE PASSÉE

Le préavis de 15 minutes a été **supprimé le 4 octobre 2026** (histoire dans
`memoire/preavis.md`). Ce qui reste, et pourquoi :
- **LES CRÉNEAUX VONT DE 5 EN 5 MINUTES** : `step="300"` (secondes) sur le
  champ et `PAS_MINUTES` dans le script, comparés par un test. `step` se
  compte à partir de `min` : la borne est arrondie au pas SUPÉRIEUR.
- Le formulaire s'ouvre sur le prochain créneau (`prochainCreneau()`) ;
  la borne du champ est ce moment. Une heure non touchée se recalcule
  (`rafraichirHeureProposee()`) à chaque juge ET à « Confirmer » ; une heure
  choisie et passée n'est jamais envoyée, elle est DITE (`#heurePassee`).
  Aucun juge n'en rappelle un autre : ça a bouclé (`memoire/preavis.md`).
- « Passée » se juge sur l'HEURE AFFICHÉE, minute en cours comprise, comme
  le serveur : lue en instant, la nuit du 25 octobre la page bouclait.
- `min` sur un champ d'heure n'a de sens que pour AUJOURD'HUI : retiré sinon.
- Sur téléphone, la molette du système ignore la borne : c'est l'écriteau
  `#heurePassee` qui tranche, avec sa sortie « Partir dès que possible ».

## LA DATE DU JOUR SE COMPOSE EN LOCAL, JAMAIS EN UTC

Septembre 2026, vu par Barbaros à 1 h du matin : « je peux cliquer sur le
6/09 pour 10 h alors qu'on est le 7 ».

La date proposée venait de `toISOString().slice(0,10)`, **qui rend de
l'UTC**. À 1 h du matin à Paris (UTC+2), il est encore 23 h la veille en
UTC : le site se croyait la veille, proposait la date d'hier, et la
laissait choisir.

- **CE GENRE DE BUG NE SE VOIT JAMAIS EN JOURNÉE.** Il n'existe qu'entre
  minuit et 2 h, exactement quand personne ne teste — et il est parti en
  ligne sans que rien ne l'attrape. `dateLocale()` compose la date à partir
  de `getFullYear` / `getMonth` / `getDate`. **Ne jamais utiliser
  `toISOString` pour une date que le client LIT** ; elle reste juste pour
  un horodatage (`cree`), où l'UTC est ce qu'on veut.
- **LA BORNE SE RAFRAÎCHIT** (au `focus` et au retour sur l'onglet). Elle
  n'était posée qu'au chargement : une page laissée ouverte pendant la nuit
  gardait la borne de la veille. Le client d'un vol de nuit garde justement
  l'onglet ouvert des heures.
- **UNE HEURE PASSÉE ÉTEINT LE BOUTON ET LE DIT**, sans attendre le clic —
  écriteau `#heurePassee`, **sans** boutons d'appel : choisir hier est une
  faute de saisie, pas un client pressé à qui l'on vend quelque chose.
  C'est ce qui distingue cet écriteau de « trop proche ». Les deux
  s'excluent : en afficher deux ferait douter le client de ce qu'il doit
  corriger.
- **Le filet de la soumission reste en place.** Un test rallume le bouton
  de force et vérifie que la course est encore refusée.
- **LE TEST DÉPLACE L'HORLOGE DU NAVIGATEUR** à 1 h 12 le 7 septembre, dans
  le fuseau de Paris. C'est la seule façon d'atteindre ce bug. **Il a été
  éprouvé contre l'ancien code** : il tombe bien dessus (`2026-09-06`) et
  passe sur le nouveau. Un test écrit après coup qui ne tombe pas sur le
  bug d'origine ne prouve rien.

## « INCLUS DANS CHAQUE COURSE », LES TROIS ÉTAPES ET LES QUESTIONS

25 septembre 2026, maquette validée par Barbaros (« Ça me convient publie »).
- « Pourquoi choisir Elatransfer ? » et ses quatre cartes sont remplacés par
  un bloc bleu nuit **« Inclus dans chaque course »** : des FAITS tenus par
  les CGV (attente art. 7, prix ferme art. 4, règlement art. 5), pas des
  adjectifs. Les clés `eng1`…`eng4s` sont gardées, leurs textes ont changé.
- **Aucune mention « VTC »** : il ne veut pas l'afficher, ses chauffeurs
  peuvent être VTC ou taxi.
- **Les trois étapes sont un bloc juste sous le formulaire** (`#comment`,
  6/10/2026) ; la ligne `.etapes-ligne` de la carte n'est plus affichée que
  sur la page easyHotel. Un second « Voir mon prix » plus bas reste refusé.
- Les **questions fréquentes** sont en bas de l'accueil, au-dessus du pied.
  Chaque réponse reprend les CGV : en changer une, c'est relire le contrat.
- **Les couleurs sont celles de la façade en ligne** (`--ela-navy`,
  `--ela-blue`, `--ela-cyan` d'`application-facade.css`), pas le céladon du
  mémo : j'avais d'abord proposé du vert en lisant une note au lieu du site.
  **Regarder le site publié avant de choisir une couleur.**
- Classes neuves (`.inclus`, `.faq-q`) : la façade habille `.engagement`.

## « ENVOYER MA DEMANDE » NE PARTAIT PLUS — LE CLOISONNEMENT AVAIT EMPORTÉ `telValide`

29 septembre 2026, capture de Barbaros : « je n'arrive pas à envoyer la
demande ». **Mesuré sur le site construit** : le clic levait
`telValide is not defined`, rien ne partait, sans un message. Depuis le
cloisonnement du 28/09 (#246), `construire-espaces-hotel.mjs` retire de la
page publique le bloc de l'espace exploitant — et `telValide` et `telWa`
vivaient dedans, alors que le tunnel client les appelle. **Tout client qui
donnait son numéro était bloqué** ; seul le comptoir identifié par la chambre
passait. `telWa` cassait aussi le bouton « Appeler le chauffeur » du bon
confirmé.
- Les deux fonctions sont sorties **avant** le bloc exploitant, et le vrai
  contrôle a quitté `intake-demande.js` pour **`telephone.js`**, chargé par
  tous les espaces. Le lecteur de demandes, outil de l'exploitant, reste
  retiré des pages publiques : `test-cloisonnement-hotel` l'exige, et c'est
  lui qui a refusé le premier correctif (recharger le lecteur entier).
  `intake-demande.js` appelle `ELA_TEL` : **`telephone.js` doit toujours
  être chargé avant lui**, dans la page comme dans Admin v2.
- **Aucune suite ne pouvait le voir** : elles éprouvent le dépôt, où le bloc
  est présent. `test-easyhotel-client` va maintenant **jusqu'au bout du
  tunnel sur le site construit** et vérifie que toute fonction appelée par
  une page publique y est définie. Éprouvé contre l'ancien code : cinq
  contrôles tombent, dont « telValide is not defined ».
