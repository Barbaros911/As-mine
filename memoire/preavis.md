# Le préavis de 15 minutes — archive

> **Ceci est une archive, figée le 4 octobre 2026.** Le préavis minimum avant
> un départ (`DELAI_MINIMUM_MIN`, d'abord 20 puis 15 minutes) a été supprimé
> ce jour-là, à la demande de Barbaros. Ce qui reste vrai est dans
> `CLAUDE.md`, sections « LE PAS DES CRÉNEAUX ET L'HEURE PASSÉE » et « PLUS
> AUCUN BLOCAGE COMMERCIAL ». Rien n'a été réécrit ci-dessous.

## LE PRÉAVIS MINIMUM AVANT UN DÉPART — 15 MINUTES

> **CETTE SECTION EST PÉRIMÉE DEPUIS LE 4 OCTOBRE 2026** : le préavis est
> SUPPRIMÉ (`DELAI_MINIMUM_MIN`, `tropTot()`, `#tropTot` n'existent plus).
> Voir « PLUS AUCUN BLOCAGE COMMERCIAL » en fin de fichier. Ce qui reste
> vrai ici : l'heure réellement passée, la grille des 5 minutes, la date
> composée en local.

Septembre 2026, à sa demande : « lorsque le client réserve il faut qu'il ne
puisse pas réserver avant 20 min », **ramené à 15 minutes le lendemain**. Il faut trouver un chauffeur, le
prévenir, et qu'il roule jusqu'au client. Accepter un départ dans cinq
minutes, c'est promettre ce qu'on ne peut pas tenir — et chez Elatransfer
l'heure est ferme comme le prix.

- **CE N'EST PAS LE RETOUR DU DÉLAI DE 3 HEURES**, retiré en septembre 2026
  à sa demande. Celui-là était un **avertissement** sur des heures
  entières, qui décourageait des courses parfaitement plaçables ; celui-ci
  est un **refus** de quinze minutes, le temps matériel d'envoyer une
  voiture. Ne pas rétablir l'ancien en croyant compléter celui-ci.
- **`DELAI_MINIMUM_MIN` vaut 15**, et la phrase de l'écriteau annonce le
  même nombre — dans les deux langues. **Un test lit la constante DANS la
  page et la cherche dans les deux phrases** : c'est le vrai piège de ce
  genre de règle, la constante bouge, la phrase reste, et le site annonce
  un délai en en exigeant un autre. **Ça a servi dès le premier
  changement** — passer de 20 à 15 minutes touche la constante, les deux
  phrases, et toute la table d'exemples du test.
- **UN CONTRÔLE VERROUILLE LA VALEUR ELLE-MÊME** (« elle vaut 15 minutes »).
  Les exemples chiffrés du test la supposent : s'il change, c'est lui qui
  tombe en premier, et on sait qu'il faut **recalculer la table** plutôt
  que de chercher un bug ailleurs.
- **ON NE RENVOIE PAS LE CLIENT SANS RIEN.** L'écriteau porte appel et
  WhatsApp, exactement comme « hors zone » : quelqu'un qui veut une voiture
  tout de suite est un client, pas une erreur de saisie, et Barbaros place
  ces courses-là de vive voix.
- **UNE HEURE DÉJÀ PASSÉE GARDE SON PROPRE MESSAGE** (`err_heure_passee`).
  « Trop proche » ne veut rien dire pour hier — d'où le `> maintenant`
  dans `tropTot()`.
- **LE CONTRÔLE EST REFAIT À LA SOUMISSION.** Entre l'instant où le client
  choisit son heure et celui où il appuie, le temps passe : une page
  laissée ouverte devient trop proche toute seule. Sans ce second contrôle,
  elle passerait.
- **LE BOUTON A DEUX JUGES — la zone et le préavis — et ils se parlent.**
  `jugerBoutonPrix()` est le point de rendez-vous ; sans lui, le second à
  s'exécuter rallumerait le bouton que le premier vient d'éteindre.
  `jugerZone()` n'éteint donc plus le bouton elle-même. **Tout nouveau
  juge du bouton doit passer par là.**
- Le test éprouve **les deux côtés de la frontière** — 10 min refusé,
  25 et 40 min acceptés. Un test qui ne vérifierait que le refus laisserait
  passer un code qui refuse tout.

**LA BORNE DU CHAMP D'HEURE — CE QU'ELLE FAIT ET CE QU'ELLE NE FAIT PAS**
(à sa demande : « il est 1 h 41, je dois pas pouvoir sélectionner 1 h 40 »).
- Sur un **ordinateur**, le navigateur refuse une heure sous `min`.
- Sur un **téléphone**, la molette est dessinée par iOS ou Android : elle
  **ignore la borne**. Le client peut faire défiler jusqu'à l'heure
  interdite, et c'est l'écriteau qui prend le relais. **Aucun site ne peut
  griser des entrées dans un sélecteur du système** — le dire à Barbaros
  plutôt que de laisser croire le contraire.
- `min` sur un champ d'heure est une **heure dans la journée, sans date** :
  elle n'a de sens que si la date choisie est **aujourd'hui**, et il faut la
  **retirer** sinon — sans quoi une course pour demain 8 h serait refusée
  parce que 8 h est passé aujourd'hui. Un test le vérifie.
- **Le cas de minuit** : à 23 h 50, le premier créneau est demain 0 h 10.
  Aucune heure d'aujourd'hui ne convient, et une borne « 00:10 »
  autoriserait à tort toute la journée. On n'en pose donc **pas** ;
  l'écriteau tranche.
- **SON EXEMPLE EXACT TOMBE DANS L'AUTRE CAS** : à 1 h 41, « 1 h 40 » est
  *déjà passé* d'une minute, donc c'est `#heurePassee` qui parle, pas
  « trop proche ». Le test éprouve les deux refus voisins — les confondre
  dirait au client de corriger la mauvaise chose.

**LES CRÉNEAUX VONT DE 5 EN 5 MINUTES** (à sa demande : « fait en sorte que
les clients puissent commander toutes les 5 minutes »). Un client ne choisit
pas un départ à 10 h 07 : il pense en quarts et en cinquièmes d'heure.
- Le pas vit à **deux endroits** — l'attribut `step="300"` du champ, **en
  secondes**, et `PAS_MINUTES` dans le script. **Un test compare les deux** :
  s'ils se désaccordent, la borne tombe hors de la grille et le champ
  propose des heures que personne ne veut.
- **`step` est compté À PARTIR DE `min`**, pas de minuit. D'où l'arrondi du
  premier créneau au pas supérieur : à 1 h 41 la borne est **2 h 00**, pas
  1 h 56 — qui donnerait la grille 1 h 56, 2 h 01, 2 h 06.
- **LE CALCUL PART DE LA MINUTE EN COURS, SECONDES RABOTÉES**, et ce n'est
  pas un détail. À 2 h 10 pile, l'horloge marque 2 h 10 et 123 ms : le
  préavis tombait sous la barre d'une fraction de seconde, le créneau juste
  atteignable était refusé, et le client poussé au suivant — **cinq minutes
  perdues pour un délai qu'il ne voit même pas**. C'est aussi la façon dont il lit sa
  montre : « il est 2 h 10, donc 2 h 30 ». Le prix se compte au centime, le
  préavis à la minute.
  **`tropTot()` rabote la même minute** : sinon le champ proposerait 2 h 30
  et l'écriteau le refuserait — deux façons de compter le temps dans la
  même page.
  Trouvé par le test, pas en production. Les trois cas de Barbaros —
  2 h 08, 2 h 10, 2 h 11 — sont éprouvés, **recalculés pour 15 minutes** :
  2 h 25, 2 h 25, 2 h 30.

**LE CHAMP S'OUVRE SUR LE PREMIER CRÉNEAU RÉSERVABLE** (septembre 2026, à sa
demande : « il faut que le choix de l'heure commence à notre heure plus
15 minutes »). Il s'ouvrait sur **10 h**, déplacé seulement quand 10 h était
déjà refusé — ce qui réglait le bouton éteint, pas le vrai problème : **la
molette d'un téléphone se pose sur la VALEUR du champ**. À 3 h 27 du matin,
capture à l'appui, le client qui veut une voiture tout de suite voyait
10 h 00 et devait remonter sept heures.
- Le défaut est maintenant `prochainCreneau()` — à 3 h 27, **3 h 45** (3 h 42
  arrondi au pas de 5). La **valeur proposée et la borne sont le même
  moment** ; un test le vérifie, sinon le champ s'ouvrirait sur une heure
  que lui-même refuse.
- **Le test lit la VALEUR, plus seulement « est-elle acceptable »** :
  l'ancien contrôle passait au vert à 1 h 41 avec 10 h, sans rien voir du
  problème. Un contrôle qui ne demande que « est-ce refusé ? » ne dit rien
  de ce que le client a sous les yeux.
- **Tant que le client n'y a pas touché, le défaut se recalcule**
  (`heureTouchee`, au retour sur l'onglet et à chaque jugement). Avec 10 h
  ce n'était pas nécessaire ; avec « maintenant + 15 », une page ouverte
  vingt minutes rouvrait sur une heure déjà refusée. **Dès qu'il choisit
  lui-même, on ne touche plus à rien** — écraser le choix d'un client est
  pire que lui proposer une heure passée.

## L'HEURE PROPOSÉE PÉRIMAIT EN SILENCE — 4 octobre 2026

Trouvé par `test-easyhotel-client`, rouge de temps en temps dans la série
complète, toujours vers une minute ronde. Seule, la suite passait.
**Ce n'était pas le test : c'était le site, en ligne.** Mesuré, horloge du
navigateur figée et avancée à la main :
- site public, page à 10 h 01 (heure proposée 10 h 05), adresses tapées à
  10 h 06 sans toucher l'heure : **« Voir mon prix » gris, aucun message**,
  plus de réservation possible. À 3 min ça passait, à 5 min non.
- flyer easyHotel, page à 10 h 05 min 57, appui à 10 h 06 min 02 : l'heure
  passait seule à 10 h 10 et **rien ne s'ouvrait** ; il fallait un second
  appui. (Avant la suppression du préavis, même chose à la bascule des
  15 minutes.)

**LA CAUSE : DEUX JUGES, UN SEUL QUI RAFRAÎCHISSAIT.** `jugerDelai()` remet
à jour l'heure que le client n'a pas choisie et pose le message
`#heurePassee`. Mais `jugerBoutonPrix()` — appelé à chaque adresse
choisie — grisait le bouton sur `heureDepassee()` sans faire ni l'un ni
l'autre. Et le clic, s'il remettait l'heure, s'arrêtait aussitôt.

- `jugerBoutonPrix()` remet l'heure non choisie au prochain créneau, et
  pose `#heurePassee` dès qu'il grise pour une heure passée. **Le premier
  jet rappelait `jugerDelai()` d'ici, « pas de boucle : remise, elle ne
  l'est plus » — c'était faux**, voir plus bas.
- Le clic continue jusqu'aux prix si la remise a suffi.
- Une heure CHOISIE n'est jamais changée : elle est dite passée, avec la
  sortie « Partir dès que possible ».
- Barbaros, le même jour : « qu'il puisse commander à l'heure qu'il veut,
  sous réserve de confirmation ».
- `test-nouveau-preavis` a trois scènes à horloge qui avance ; contre
  l'ancienne page, six contrôles tombent, dont « gris=true message=false ».
  Les clics y sont bornés : sur un bouton gris, Playwright attendait 30 s et
  plantait sans nommer le défaut.

### Ce que la relecture indépendante a trouvé avant la publication

Une relecture en trois angles (logique, comptoir, tests), chaque constat
rejoué par un second relecteur, sur le premier jet du correctif. Trois vrais
défauts, tous corrigés, et chacun a maintenant sa scène dans
`test-nouveau-preavis` :
- **LA PAGE ENTIÈRE TOMBAIT LA NUIT DU CHANGEMENT D'HEURE.** Le 25/10/2026,
  de 2 h à 2 h 59, chaque minute existe deux fois, et le navigateur lit
  « 02:35 » en heure d'été — une heure trop tôt. L'heure proposée restait
  donc « passée » après sa remise, et les deux juges se rappelaient sans
  fin : « Maximum call stack size exceeded » au chargement, site, flyer,
  comptoir et admin compris (même script). Mesuré sous Chromium, horloge
  posée à 01:31 UTC. **Avant le correctif**, pas de plantage, mais le
  formulaire refusait sa propre heure proposée pendant une heure entière :
  défaut plus ancien, réparé du même coup — d'abord en gardant la lecture
  la plus tardive d'une heure ambiguë, ce qui était faux à son tour (voir la
  seconde relecture, plus bas). Et plus aucun juge n'en
  rappelle un autre (`rafraichirHeureProposee()`, appelée par tous) : même
  si une heure restait passée, rien ne tournerait en rond.
- **« CONFIRMER » NE RELISAIT PAS L'HEURE.** Un client qui met cinq minutes
  à remplir le récapitulatif — ou une réception qui parle avec son
  client : au comptoir, « Réserver » déclenche « Confirmer » sans passer par
  « Voir mon prix » — envoyait une heure passée, sans un mot. Le serveur,
  voyant un départ passé, annonçait aussitôt « DÉPART PASSÉ, plus aucun
  rappel » : l'alarme sautait pour la demande la plus pressée. À l'envoi,
  une heure proposée se remet à jour et part ; une heure choisie et passée
  ne part pas, le client est ramené au message et à sa sortie.
- **AU COMPTOIR, CHOISIR UNE GAMME RALLUMAIT « RÉSERVER »** sur une heure
  choisie et passée, sans message. `jugerBoutonReserver()` regarde l'heure.
- **Écarté, et dit** : changer la DATE compte comme toucher à l'heure. Un
  client qui choisit demain puis revient à aujourd'hui et traîne cinq
  minutes voit « heure passée » — avec le message et sa sortie, donc jamais
  en silence. Séparer les deux voudrait que la remise ne touche plus la
  date ; à faire s'il le redemande.
- **« Un bouton gris montre toujours `#heurePassee` » était trop large** :
  au comptoir le bouton est aussi gris tant qu'aucune gamme n'est choisie,
  et partout pendant le « Calcul… ». La règle vraie : **une heure passée ne
  grise jamais le bouton sans le dire.**
- Contre le premier jet, 9 contrôles tombent, dont « Maximum call stack size
  exceeded » ; contre le site en ligne (b90ee2a), 14.

### La seconde relecture, sur les corrections elles-mêmes

Même méthode, sur le second jet. Deux vrais défauts, corrigés :
- **L'AUTRE MOITIÉ DE LA NUIT.** « Garder la lecture la plus tardive » ne
  laissait plus RIEN passer pendant la première heure 2 h–2 h 59 (heure
  d'été) : 0 heure « passée » sur 3 600 combinaisons, mesuré. Or le serveur
  compte en heure AFFICHÉE de Paris : une demande « 02:05 » envoyée à
  2 h 40 était pour lui passée de 35 min — message final, alarme coupée.
  `heureDepassee()` compare maintenant l'heure affichée, en texte
  (« AAAA-MM-JJTHH:MM »), exactement comme le serveur : la page et lui ne
  peuvent plus se contredire. `prochainCreneau()` avance de créneau en
  créneau tant que l'heure affichée recule (2 h 56 été → « 03:00 », une
  nuit par an), borné à 24 pas.
- **« POUR MAINTENANT » COUPAIT LES RAPPELS.** L'heure proposée vaut souvent
  la minute en cours ; le serveur la voyait « passée » au tour suivant
  (20 s), envoyait le message final et coupait l'alarme. Défaut plus ancien
  que le correctif (un client qui garde l'heure proposée et confirme vite),
  que la remise à jour à « Confirmer » rendait plus fréquent. Corrigé côté
  SERVEUR (`nouvelle-demande`) : une demande n'est jamais « passée » dans
  ses 30 premières minutes — comme une demande immédiate.
  `test-relance-alertes` : contre l'ancien serveur, 3 contrôles tombent.
- **Écarté** : à « Confirmer », une heure proposée remise à jour part sans
  être réaffichée sur le récapitulatif (10 h 05 lu, 10 h 10 parti). Le bon
  qui s'ouvre aussitôt porte la bonne heure ; à revoir s'il le demande.
- `test-nouveau-preavis` : 63 contrôles. Contre le second jet, 3 tombent ;
  contre le premier, 10 ; contre le site en ligne (b90ee2a), 18.
- **Piège de banc, encore** : mon propre rejeu Node a d'abord rendu un faux
  « pas passée ». Il remplaçait `Date.now` mais pas `new Date()`, que le
  code appelle : une horloge figée à moitié. Le navigateur de Playwright,
  lui, fige les deux.

### La troisième relecture : rien de neuf, trois limites plus anciennes

Aucun défaut retenu sur les corrections. Trois limites antérieures, dites
pour qu'on ne les redécouvre pas :
- **L'heure d'arrivée affichée et « Terminée »** (`departPasse`) lisent
  encore le champ comme un instant : une heure par an (nuit du 25 octobre),
  l'arrivée annoncée est fausse d'une heure et « Terminée » se ferme d'un
  appui. À reprendre à part, avec la même comparaison en heure affichée.
- **Hors du fuseau de Paris**, la page compte à l'heure de l'appareil et le
  serveur à celle de Paris. C'était déjà le cas ; le plancher de 30 min
  côté serveur l'atténue.
- **Panne des deux canaux d'alerte plus de 30 min** : la demande pressée
  reçoit l'annonce puis, aussitôt, le message final. Les deux sont vrais,
  et c'était pire avant (aucune alarme du tout).

