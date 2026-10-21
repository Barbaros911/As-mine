# La page de la réception easyHotel — archive

> **Ceci est une archive, figée le 5 octobre 2026.** Elle raconte l'audit
> bouton par bouton du 30 septembre et ce qui en est sorti. Ce qui reste
> vrai aujourd'hui est dans `CLAUDE.md`, section « LA RÉCEPTION AFFICHE LE
> BON, ELLE NE L'ENVOIE PLUS ». **Périmé depuis le 5 octobre** : l'envoi du
> bon (image, partage, message WhatsApp écrit), les trois chiffres en tête,
> l'onglet « Toutes ». Rien n'a été réécrit ci-dessous.

## LA PAGE RÉCEPTION, AUDITÉE BOUTON PAR BOUTON — CE QUI EN EST PARTI

30 septembre 2026, à sa demande (« vérifie toutes les touches… corrige comme
un pro, laisse le FR/EN »). Audit fait sur le SITE CONSTRUIT
(`/easyhotel-reception/`), à 390 et 1280 px : tous les boutons répondaient,
le défaut était ailleurs — des doublons et des phrases écrites pour un client.
- **La permanence humaine est 5 h–22 h**, tranché par Barbaros. Le bandeau
  du site public disait « 24 h/24 · 7 j/7 » pendant que la réception disait
  5 h–22 h. Il dit maintenant « Réservation 24 h/24 · Assistance 5 h–22 h » :
  la réservation en ligne, elle, reste ouverte jour et nuit.
- **Une tuile par écran**, celle qui mène à l'autre : « Nouvelle course » sur
  la liste, « Réservations de l'hôtel » sur le formulaire. Chacune avait un
  doublon qui ne faisait que défiler sur l'écran où l'on était déjà.
- **Retirés au comptoir** (CSS sous `.reception-premium`) : la flèche « ‹ »
  de la liste (elle ouvrait le formulaire, pas la page d'avant), la barre du
  bas (« Accueil » en double, et un menu WhatsApp écrit pour un client, en
  double du bloc « Un imprévu ? »), « Disponibilité confirmée par WhatsApp ou
  SMS » (faux ici : la réponse apparaît dans la liste), les trois étapes du
  tunnel client, « Aucun paiement en ligne ».
- **Une course EN RETARD porte « Appeler Elatransfer »**, plus « Demander
  l'annulation » : annuler une course dont l'heure est passée n'a pas d'objet.
- **La référence a sa ligne, entière** (`.rec-reference` — `.rec-ref` est déjà
  pris par le tableau de bord de l'exploitant). Elle était tronquée en fin de
  ligne grise, alors que c'est ce qu'on nous lit au téléphone.
- **Les numéros de téléphone de la liste font 44 px de haut**, plus 15.
- **Le bon, après l'envoi, parle à la réception** (`bon_note_comptoir`,
  `envoi_ok_comptoir`) et porte « Voir les réservations de l'hôtel » : la
  réception restait coincée sur le bon, sans chemin vers sa liste.
- **Le FR/EN est gardé**, donc plus de libellés doublés (« Chambre / Room »,
  « Nom du client / Guest name ») au comptoir : `index.html` y pose ses clés
  (`nom_comptoir`, `ph_nom_comptoir`, `aide_tel_comptoir`) et le sélecteur
  traduit. Le côté client du flyer garde ses libellés doublés.
- **LE PIÈGE QUE L'AUDIT A TROUVÉ : après 7 s, la langue ne suivait plus.**
  `hotel-engine-polish.js` coupe son observateur à 7 s (pour ne pas boucler) :
  un FR/EN touché ensuite, ou un « Actualiser », rendait les textes d'origine,
  et repasser en FR laissait « Pending » et « Tomorrow ». Deux observateurs
  ÉTROITS restent (l'attribut `lang`, les enfants directs de `#recListe`), et
  le français d'origine est gardé sur l'élément (`data-fr`) pour y revenir.
- **Suite du même jour, à sa demande (« ok fait 12 h en leur affichant ce
  message afin qu'ils n'oublient pas ») :**
  - **La session tient 30 JOURS sur l'appareil** (`localStorage`, plus l'onglet)
    — d'abord 12 h, puis 30 jours le même soir, à sa demande (« personne ne
    verra le code à part la réception »). **Le code ne peut pas disparaître** :
    la clé de l'hôtel (`easyhotel-aeroville`) est publique, écrite dans les
    liens de la page du QR ; sans code, n'importe qui appellerait
    `courses-hotel` et lirait noms et téléphones des clients. La session est
    signée AVEC le code : le changer dans les secrets Supabase coupe toutes
    les tablettes d'un coup. `test-nouveau-reception` lit la durée dans
    `hotel-session.ts` et exige la même dans les phrases.
    La fin est celle du jeton signé par le serveur (`exp`,
    `DUREE_SESSION_MS` de `_shared/hotel-session.ts`) : le navigateur la lit
    pour l'afficher et oublier le jeton à l'heure dite, il ne peut pas la
    repousser. Le code brut n'est toujours conservé nulle part.
  - **Le rappel est écrit deux fois** : avant la saisie (« actif 30 jours,
    puis redemandé : gardez-le bien ») et en haut de la liste (« Code gardé
    sur cet appareil jusqu'au jeudi 29 octobre »). Un jeton refusé dit « la
    session est terminée, ou le code a changé », jamais « code faux ».
  - **La liste se relit toute seule** toutes les 30 s et au retour sur
    l'onglet — jamais onglet caché, liste fermée ou sans session. En fond,
    une panne réseau ne dit rien ; seul un refus du jeton reverrouille.
  - **Ce qui change se voit** : « Réservation validée » (vert) ou « Non
    prise — prévenez le client » (rouge) dans un bandeau en haut, avec « Vu »,
    et la carte s'éclaire. Aucun bandeau au premier chargement.
  - **« Envoyer le bon au client » fabrique une IMAGE du bon** (à sa
    demande : « un bon visuel plutôt qu'un message ») : logo, état, référence,
    date, trajet, véhicule et paiement, chauffeur si confirmé, prix ferme.
    Dessinée dans la page (`dessinerBonImage`, canvas 1080 px de large, la
    hauteur suit le contenu — une hauteur fixe coupait la ligne du chauffeur),
    jamais chez un tiers. Couleurs du bon du site, pas celles du partenaire.
  - **Elle passe par un aperçu** (`ouvrirBonVisuel`) : Safari ne partage un
    fichier que dans la foulée immédiate d'un appui, et l'image met un instant
    à se fabriquer. On la fabrique à l'ouverture ; « Envoyer l'image »
    (`navigator.share`, seulement si l'appareil sait partager un fichier) ou
    « Enregistrer l'image » partent ensuite sans attente.
  - **LE CHOIX IMAGE / ÉCRIT EST EN TÊTE DE LA FEUILLE** (à sa demande : « il
    faut qu'on puisse avoir le choix »). Deux onglets, « Bon en image » (ouvert
    par défaut) et « Message écrit », et chacun MONTRE ce qui partira avant
    l'envoi. L'écrit garde son avantage : il écrit DIRECTEMENT au numéro du
    client, là où l'image passe par le partage du téléphone. Sans numéro,
    « Copier le message » remplace l'envoi. Le texte suit la langue affichée ;
    le chauffeur n'y figure que sur une course confirmée.
  - **LE BON A QUITTÉ L'ANCIEN VERT CÉLADON** (à sa demande : « il garde
    encore la trace verte ancienne »), sur le site COMME sur l'image : pastille
    « Confirmé » `#0E5FA8`, encart du prix `#EAF3FC` / `#062f55`, bloc du
    chauffeur et écriteau « demande reçue » en bleu ELA. Contrastes mesurés
    (blanc sur `#0E5FA8` 6,5 ; `#0B4F8C` sur fond clair 7,5). **La pastille
    « Réservation validée » de la LISTE de la réception reste verte** : c'est
    une couleur d'état, pas le bon.
- **RETROUVER UNE COURSE — L'HISTORIQUE DU COMPTOIR** (30/09/2026, à sa
  demande : « un moyen de retrouver les courses, l'historique, on a oublié
  ça »). Au-dessus de la liste : un champ « Retrouver une course » et trois
  onglets qui portent leur compte — **À venir** (ouvert par défaut : attente
  et confirmée, en retard compris, puisqu'elles demandent encore quelque
  chose), **Passées** (effectuées et non prises, la plus récente en haut),
  **Toutes**.
  - **La recherche fouille TOUT, quel que soit l'onglet** : chambre, nom,
    téléphone (par ses chiffres — « 0655 44 » trouve « 06 55 44 33 22 »),
    référence, adresse, chauffeur. Un client repasse au comptoir pour une
    course de mardi : on ne lui fait pas chercher le bon onglet d'abord.
  - **Rien n'est redemandé au serveur** pour trier ou chercher : la liste
    est déjà là. `courses-hotel` en rend désormais **500** (au lieu de 200)
    — des mois d'un hôtel actif. Au-delà, les plus anciennes ne s'affichent
    plus : le jour où ça arrive, il faudra une recherche côté serveur.
  - Classes `.rec-outils` / `.rec-vues`, neuves (vérifiées libres).
    `test-nouveau-reception` a une course effectuée dans son jeu de données
    et éprouve les comptes, chaque onglet et les quatre recherches ; il tombe
    si « passée » n'est plus reconnue (six contrôles).
- **VÉRIFIÉ EN SE METTANT À LA PLACE DE LA RÉCEPTION** (30/09/2026, à sa
  demande : « met toi à la place de la réception »). Deux manques :
  - **« Réserver une autre course » gardait la chambre, le nom et le
    téléphone du client précédent.** Réservé à la chaîne, le client suivant
    partait avec la chambre d'un autre, et son numéro recevait le bon d'un
    inconnu. Au comptoir, ces champs, le vol, la pancarte et le règlement
    sont vidés ; côté client on garde (c'est le même voyageur).
  - **Une course effectuée se renvoie** : « Renvoyer le bon au client »
    (le justificatif d'une note de frais). Le bon dit « EFFECTUÉE » / « Course
    effectuée », avec son chauffeur. Rien sur une course non prise.

- **ACTUALISER EN HAUT, PAR DATE, ET RETROUVER UN BON PAR SA DATE**
  (30/09/2026, à sa demande). « Actualiser » était en bas d'une liste qui
  s'allonge (mesuré à 1 360 px) : il est remonté sous les trois chiffres,
  avec l'heure de la dernière lecture (`#recMaj`, `dessinerMaj()`), et
  tourne pendant la lecture. Un quatrième onglet **« Par date »** ouvre une
  barre Jour / Mois, ‹ ›, un calendrier et « Aujourd'hui » ; la liste y est
  dans l'ordre du calendrier, sans « En retard », avec le bilan de la
  période (courses, effectuées, à venir, non prises, et le montant des
  seules EFFECTUÉES — même règle que le registre). La recherche trouve
  aussi une date tapée « 12/09 », « 12/09/2026 » ou « 12 septembre ». Les
  dates sont composées en local (`isoLocal`), jamais par `toISOString`.
  Le libellé d'« Actualiser » est écrit par la page, plus par la finition
  (`hotel-engine-polish.js`) : elle l'écrasait pendant la lecture.

- **UNE COURSE FINIE NE PORTE PLUS AUCUN PRIX CÔTÉ RÉCEPTION** (30/09/2026, à
  sa demande : « aucune trace du chiffre ne doit rester »). Réalisée, non
  prise ou annulée : `courses-hotel` n'envoie plus le champ `prix` (ABSENT,
  pas mis à zéro — masquer à l'écran laissait le montant dans la réponse,
  lisible par les outils du navigateur), et la page ne le dessine pas non
  plus (deux défenses, deux contrôles : `test-securite-fonctions`,
  `test-nouveau-reception`). Le bilan « Par date » ne compte plus que des
  courses, jamais un montant. « Renvoyer le bon » est retiré des courses
  faites : sans prix, ce n'est plus un justificatif. Le prix reste dans
  l'admin (registre, commissions, factures) et sur le téléphone du client.
- **LA RÉCEPTION NE PEUT PLUS ANNULER, NI MÊME LE DEMANDER** (30/09/2026, à sa
  demande). Le bouton « Demander l'annulation » est retiré et `courses-hotel`
  refuse toute action autre que la liste (403). Elle appelle : « Un imprévu ? »
  est affiché en permanence. Le drapeau `annulationDemandee` n'est plus lu.
- **« ANNULER LA COURSE » ET « MODIFIER LA COURSE » DANS L'ADMIN** (bon
  exploitant, 30/09/2026). Nouveau statut **`annulee`** : fini comme un refus,
  jamais compté, mais la réception et le client lisent « Annulée », pas « Non
  prise » (qui dit qu'aucun chauffeur n'était libre). Deux appuis pour
  annuler. Modifier garde la RÉFÉRENCE, écrit `modifieLe` (+ `modifications`,
  les 20 dernières), recompose `depart` = `departPublic` + « (ch. N) », et ne
  recalcule PAS le prix : un trajet changé se renégocie. La réception voit
  « Modifiée par Elatransfer le … » sur la carte et, en direct, un bandeau
  « 06:00 → 07:00 ». Rien ne part chez le chauffeur : un rappel « Prévenez le
  chauffeur » s'affiche s'il y en a un. `test-admin-arrivee` (bloc 2 ter).
  **Tout endroit qui teste `"refusee"` pour dire « finie » doit aussi tester
  `"annulee"`** — c'est la liste qu'on a dû parcourir ce jour-là.
- **Pas encore fait, décidé pour un second temps** : changer ou couper le code
  de la réception depuis l'admin (le code vit dans les secrets Supabase).


## APRÈS UNE RÉSERVATION AU COMPTOIR, UNE CARTE POUR LA RÉCEPTION (21/10/2026)

Ajouté après l'archive. Barbaros, en voyant l'écran qui suit une réservation
au comptoir : « trop d'information destinée au client, c'est inutile ». Il
portait le bon du CLIENT (logo, « Bon de réservation », ligne de règlement)
sous l'encadré « À dire au client » du 5 octobre, plus un bouton « Voir le
bon du client ». Deux versions lui ont été montrées ; il a choisi la **A**.
- **Une carte** : titre, N°, pastille « En attente d'un chauffeur », la
  phrase de l'envoi (« Rien d'autre à faire : Elatransfer prévient le client
  et cherche un chauffeur… »), puis Client (chambre · nom), Trajet (écrit
  comme dans la liste, `trajetComptoir`), Date, Véhicule, Prix annoncé.
  « Voir les réservations de l'hôtel » et « Réserver une autre course ».
- **Le titre suit le DÉPÔT**, comme la tête du bon depuis le 15/10 :
  « Réservation enregistrée » seulement quand le serveur l'a reçue,
  « Réservation non transmise » en rouge sur un échec (l'écriteau dit
  d'appeler, avec le numéro), « Envoi de la réservation… » entre les deux.
  La maquette mettait « enregistrée » d'office : ç'aurait été la panne
  inventée à l'envers.
- **Rien n'est recopié** : le N° (`#bonRef`), l'écriteau de l'envoi
  (`#etatEnvoi`) et le détail (`#bonDetail`) sont DÉPLACÉS dans la carte ;
  départ, arrivée et règlement y sont masqués (`bc-masque`). Le site client
  n'a pas bougé.
- **Retirés** : « À dire au client » (`consigne_comptoir*`) et « Voir le bon
  du client » de cet écran. Le bon du client reste dans la liste (« Voir le
  bon ») et sur la fiche de l'admin.

## « JE VEUX 10/10 » — L'AUDIT DU 21/10/2026, ÉTAPE PAR ÉTAPE

Barbaros a noté le parcours 8/10 et demandé « corrige tout comme un expert ».
Chaque étape a été rejouée sur le site construit, à cinq largeurs (1366,
1024, 768, 390, 360), mesures à l'appui. Ce qui a été trouvé, et fait :
- **« Valider » sans véhicule n'était PAS mort**, contrairement à ce que je lui
  avais dit en lisant une capture : l'appui encadre Berline/Van de rouge. Mais
  la couleur portait le sens seule. Le cadre dit maintenant « Choisissez le
  véhicule ». Le bouton reste actif à l'œil : un bouton qui dit ce qui manque
  vaut mieux qu'un bouton grisé muet.
- **CDG, Terminal 1, 1 passager, 1 bagage étaient verts d'office** au comptoir :
  « vérifié » sur ce que personne n'avait regardé. Ils restent neutres jusqu'à
  ce qu'on y touche (même règle que la date et l'heure) ; côté client, la
  destination vient de la carte touchée, elle reste verte.
- **« Réserver une autre course » gardait l'essai de validation** du client
  précédent : nom et téléphone déjà rouges « Obligatoire », et sa Berline
  toujours cochée. Remis à zéro (`tentative`, `touches`, `dessinerGammes()`).
- **Sur un PC, le bon n'a plus de boutons** (Appeler, WhatsApp, Telegram) :
  un PC ne compose pas. Tout est écrit ; une tablette au doigt garde les trois.
- **À 768 px, le formulaire restait en deux colonnes** : « Nom du client »
  à 80 px (trois lignes, valeur « M… »), date coupée. Une colonne jusqu'à
  900 px. Et la date était coupée à toutes les tailles dès qu'elle passait au
  vert (12 px réservés à droite pour la coche, qui est posée en haut).
- Typographie : « L'hôtel → … » prend sa capitale en début de ligne, et
  « · arrivée » ne commence plus une ligne.
