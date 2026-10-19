# La référence d'une course, et le N° court

Archive rangée le 5 octobre 2026 (plafond de `CLAUDE.md`). Ce qui vaut
aujourd'hui est dans la section « LA RÉFÉRENCE EST TIRÉE AU SORT » de
`CLAUDE.md` ; ce fichier garde POURQUOI.

## 29 septembre 2026 — la référence tirée au sort — LE COMPTEUR PAR APPAREIL FAISAIT REFUSER LES DEMANDES

29 septembre 2026, capture de Barbaros à 5 h 28 : une demande du comptoir
easyHotel refusée, « Votre demande n'a pas pu nous être transmise ».
**Mesuré** sur le journal du diagnostic de la nuit (workflow des
migrations) : le serveur portait déjà `ELA-26-09-0001` à `0023`, arrivées de
plusieurs appareils dans le désordre ; le téléphone venait de fabriquer
`ELA-26-09-0008`. `deposer-course` refuse une référence déjà prise (409).
- **Le compteur vivait dans le navigateur** (`ela_rang`), hérité de l'ancien
  site où seul Barbaros numérotait. Tout nouvel appareil repartait à 0001 :
  sa première demande du mois était refusée dès que le mois en avait une.
  Côté exploitant, `pousser` fusionne : une course saisie à la main pouvait
  **écraser** celle d'un client au même numéro.
- `referenceSuivante()` tire maintenant cinq signes dans un alphabet sans
  0/O/1/I/L (28 millions par mois). Ne pas revenir à un compteur local : une
  numérotation continue exige que le SERVEUR attribue le numéro, ce qui est
  impossible avant l'ouverture de WhatsApp (Safari, geste de l'utilisateur).
- `intake-demande.js` lit les deux formes ; `test-admin-intake` en éprouve
  une de chaque.
- **Admin v2 triait par référence** (`order=ref.desc`, liste et registre) :
  un tirage au sort n'a pas d'ordre. Les deux lisent maintenant par
  `cree_le.desc`, comme l'espace historique et la réception. Sans ça, la
  limite de 300 lignes aurait pu écarter la demande arrivée à l'instant.

## 5 octobre 2026 — le N° court, « N° 1042 »

Barbaros : « pour les numéros de bons, il faut que tu me fasses quelque
chose d'assez simple ». La référence tirée au sort ne se dicte pas au
téléphone. Ce qui avait été écrit le 29/09 tenait toujours : une
numérotation continue exige que le SERVEUR attribue le numéro. C'est ce
que fait `20261006000000_numero_court.sql` — la base numérote à
l'écriture de la ligne, et le N° revient au client dans la réponse de
`deposer-course`, APRÈS le geste : rien n'attend avant l'envoi.
- **La numérotation des courses existantes passe déclencheurs coupés.** La
  table en porte deux dont le code n'est pas dans le dépôt
  (`journal_courses_operateurs`, `proteger_courses_agent`, créés dans
  l'éditeur SQL). L'épreuve les remplace par deux sentinelles, dont une qui
  fait tomber la migration si elle tourne. La version est montée à la main
  pour que les appareils de l'admin relisent leurs courses.
- **Défaut ET déclencheur tiraient chacun un numéro** : la numérotation
  sautait d'un sur deux. Trouvé par l'épreuve, pas en relisant. Seul le
  déclencheur numérote ; sans lui, « not null » refuse.
- **Le N° est RECOPIÉ DANS LE BON (`bon.numero`)** par la base, à
  l'écriture et à chaque modification. Premier jet : `select=*` partout où
  l'on lit `courses`, pour lire la colonne sans la nommer (nommée, elle
  fait refuser toute lecture tant que la migration n'est pas appliquée).
  `test-admin-arrivee` l'a fait tomber : sur un serveur sans colonne
  `version`, `*` répond quand même, et l'admin relisait « à l'ancienne »
  sans un mot — le garde-fou du 2 octobre (« une colonne absente est une
  panne AFFICHÉE ») était perdu. Avec la recopie, aucune lecture ne change :
  tout le monde lit déjà le bon.
- **Le lien `?ok=` porte le N° (`n`)** : un compteur, pas une donnée du
  client. Un lien envoyé avant s'ouvre comme avant.
- Des trous sont possibles (une écriture refusée consomme un numéro) : ce
  n'est pas un numéro de facture.

## 16 octobre 2026 — le même N°, partout, et seul

Barbaros, en voyant les captures du bon : « il faut aussi que les numéros de
bon soient partout pareils, courts ». Le N° existait partout, mais pas sous
la même forme : « N° 1042 · ELA-… » (« Mes courses », réception, registre),
« N° 1042 (ELA-…) » (messages au client et au groupe), « N° 1042 » + « Réf.
ELA-… » en petit (bons), et la seule référence dans le titre de la
notification au client.
- **Dès qu'un N° existe, il s'écrit seul** : bon du client, « Mes
  courses », liste et bon de la réception, carte et registre de l'admin,
  « Prévenir le client », « Accuser réception », « Course à placer », titre
  de la notification.
- **La référence reste la clé et s'écrit encore à trois endroits, exprès** :
  la fiche de l'admin (ligne « Référence », l'écran technique), la fin du
  message Telegram, et le message WhatsApp que le client renvoie lui-même —
  c'est elle que « Coller une demande » lit pour retrouver la course.
- **Une demande sans N° garde sa référence** : une demande qui n'a pas
  atteint le serveur n'a PAS ENCORE de numéro (c'est la base qui numérote).
  Renvoyée par WhatsApp puis collée dans l'admin, elle garde sa référence,
  le serveur la numérote, et le téléphone du client récupère le N° tout seul
  (`rafraichirCourses` → `etat-course`).
- Contrôles : `test-reception-numero` (réécrite, retrouve les cartes par
  `data-ref`), `test-nouveau-confirmation` (message « N° 1042 » sans ELA) ;
  neuf contrôles tombent sur l'ancien affichage.

## 19 octobre 2026 — une référence déjà prise n'est plus une demande perdue

Audit avant l'exploitation à plusieurs hôtels. Le tirage au sort du 29/09
(31 signes, cinq positions : 28,6 millions par mois) suffisait à douze
demandes par semaine ; à **cent demandes par jour**, la probabilité qu'au
moins deux demandes du mois tirent la même référence est d'environ **15 %**
(3 000 × 2 999 / 2 / 28,6 M). Ce que ça produisait, lu dans le code :
- **Côté client**, `deposer-course` rend 409 « référence déjà utilisée » ;
  `nuage.deposer` le lisait comme un échec ordinaire, `reprendreDepot`
  réessayait une fois à l'identique, puis le bon disait « votre demande n'a
  pas pu nous être transmise » — pour une référence qui n'était pas la
  sienne. Le journal des dépôts refusés comptait un motif « reference »,
  mais personne n'y lisait une perte de client.
- **Le même 409 couvrait une course de course** : le dépôt `keepalive`
  abandonné à 8 s par la page continue sur le serveur ; si la reprise
  arrive pendant qu'il écrit, la seconde requête passe la vérification
  « déjà déposée ? » avant l'insertion de la première, et la RPC rend 409.
  La course était enregistrée et le client lisait « non transmise ».
- **Côté admin**, une course saisie au téléphone part en POST
  `ignore-duplicates`. Référence déjà prise : rien n'est rendu, l'admin relit
  la ligne et appliquait « le serveur gagne » — la course de l'inconnu
  REMPLAÇAIT la course saisie, et l'écran disait « modifiée sur un autre
  appareil ». Une course perdue, un message faux.

Ce qui vaut maintenant :
- `nuage.deposer` rend `"reference"` sur un 409 ; `deposerDemande(bon)`
  rejoue DEUX fois à l'identique, après 1,5 s de pause chacune (une course de
  course trouve alors la ligne avec la même empreinte : le serveur rend
  « rejoue », donc vrai ; la pause laisse à un serveur lent le temps d'écrire
  la ligne du premier envoi — sans elle, le rejeu immédiat pouvait lui aussi
  prendre un 409 et un retirage aurait fait deux courses), puis
  `retirerReference(bon)` tire une référence neuve, la pose sur le bon, dans
  `ela_courses` et sur l'écran (`ecrireRefBon`), et redépose. Deux tirages au
  plus : au-delà c'est une panne, et le repli WhatsApp reprend la main.
  `reprendreDepot` passe par le même chemin.
- `nuage.envoyerCourse` : sur un doublon d'une course jamais lue du serveur,
  `autreCourse(ligne, bon)` compare le CONTENU — téléphone (neuf derniers
  chiffres), date, heure ; sans téléphone, le trajet. **Jamais la date de
  création** : la relecture indépendante du 19/10 a montré que le premier jet
  la comparait, alors que `deposer-course` la réécrit à l'heure du serveur et
  qu'une demande COLLÉE garde la référence du client avec sa date de lecture —
  le cas « non transmise à tort, renvoyée par WhatsApp, collée » aurait fait
  une course en double. Une autre course rend `"reference"` :
  `changerReferenceLocale` renomme la course dans le registre, déplace son
  entrée de file (même rang, mêmes essais) et le bon ouvert ; `direReference`
  le dit sur le tableau de bord et sur le bon. La même demande (accusé perdu,
  demande collée) garde le chemin « le serveur gagne ».
- **Le format de la référence ne change pas** : c'est une décision produit
  (dictée au téléphone par le N° court, la référence reste technique), et
  une sixième position aurait touché tous les lecteurs (`intake-demande.js`,
  le bot Telegram, les motifs des fonctions). Retirer est moins cher que
  rallonger, et ne laisse aucune ancienne référence illisible.
- Éprouvé : `test-nouveau-serveur` (course de course, collision — le bon
  redéposé est la même demande, le bon et le message WhatsApp de secours
  portent la référence neuve) et `test-admin-reference` (collision et accusé
  perdu, sur le site construit). Contre l'ancien code, les contrôles de
  collision tombent : un seul dépôt, « non transmise » ; côté admin, la
  course saisie disparaît du registre.
- `etat-course` refuse désormais une référence mal formée AVANT toute
  lecture (même réponse qu'une course introuvable) : cette fonction est
  ouverte à tous et sans plafond, chaque appel coûtait une lecture.
