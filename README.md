# As-mine — application de réservation

Application web de réservation de chauffeur privé (Paris / Île-de-France).
Site statique : un seul fichier `index.html`, plus le manifeste, les icônes et
le service worker. Aucun serveur n'est nécessaire pour l'héberger.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : interface, styles, traductions, tarification |
| `manifest.webmanifest` | Déclaration PWA (nom, couleurs, icônes) |
| `icon.svg`, `icon-maskable.svg` | Icônes d'installation |
| `sw.js` | Service worker : consultation hors ligne |

Le site est publié automatiquement à chaque modification de `main`, par le
workflow `.github/workflows/pages.yml` : **https://barbaros911.github.io/As-mine/**

## Ajouter d'autres sites, sans toucher à As-mine

As-mine occupe la racine du dépôt et garde son adresse. Pour publier un autre
site — une démonstration à montrer à un client, par exemple — il suffit de
créer un dossier dans `sites/` :

| Dossier | Adresse publiée |
|---|---|
| *(racine)* | `.../As-mine/` — As-mine |
| `sites/mon-site/` | `.../As-mine/mon-site/` |
| *(automatique)* | `.../As-mine/demos/` — la liste des démonstrations |

Le plus simple est de copier `sites/_modele/`, de renommer la copie et de
modifier son `index.html`. Chaque site est autonome : ses fichiers restent dans
son dossier et s'appellent en chemin relatif (`./photo.jpg`). La page
`/demos/` se reconstruit toute seule à chaque publication.

Quatre garde-fous :

- chaque site vit dans son dossier — modifier ou supprimer l'un n'a aucun effet
  sur les autres ;
- la racine est copiée **avant** les sites, donc aucun site ne peut l'écraser ;
- un dossier qui porterait le nom d'un fichier d'As-mine (`index.html`,
  `sw.js`…) ou de la galerie (`demos`) fait échouer la publication au lieu de
  passer en silence ;
- le service worker d'As-mine ignore les autres sites : il ne met pas leurs
  pages en cache et ne leur substitue jamais la sienne hors ligne.

Les sites d'exemple sont en `noindex` pour qu'une démonstration ne soit pas
prise par Google pour une vraie entreprise — à retirer le jour où un site
devient réel. Détails dans [`sites/README.md`](sites/README.md).

## À faire avant une mise en ligne commerciale

Ces points ne sont pas des bugs : ce sont des informations ou des services
extérieurs qui n'existent pas encore. Tant qu'ils ne sont pas réglés,
le site fonctionne, mais les documents remis aux clients restent incomplets.

### 0. Renseigner l'identité et les chauffeurs — obligation légale

En haut d'`index.html`, trois objets attendent vos informations :

- **`EDITEUR`** — qui édite le site. Tout site commercial doit identifier son
  éditeur (loi LCEN), même s'il n'est qu'un intermédiaire.
- **`CHAUFFEURS`** — votre réseau. Chaque chauffeur exerce sous sa propre
  licence : ce sont **son** SIRET, **son** numéro EVTC et **sa** carte
  professionnelle qui figurent sur le bon de réservation, puisque c'est lui
  qui exécute le transport.
- **`AVIS`** — les avis clients. **N'y inscrivez que des avis réellement
  reçus.** Publier de faux avis est une pratique commerciale trompeuse
  (article L132-2 du Code de la consommation : jusqu'à 2 ans
  d'emprisonnement et 300 000 € d'amende, portés à 10 % du chiffre
  d'affaires). Tant que la liste est vide, la section reste invisible et
  aucune note n'est déclarée à Google.

Le bon de réservation distingue le **transporteur** (le chauffeur, avec ses
références) et l'**intermédiaire** (le site). Tant que le chauffeur affecté
n'est pas identifié, le bon s'affiche comme incomplet.

Attention : le bon doit être **conservé 3 ans**. Un site statique ne peut pas
le faire ; aujourd'hui seul le client détient son exemplaire.

### 2. Compléter les mentions légales — obligation légale

Dans `index.html`, chercher `[À compléter]` : raison sociale, forme juridique,
SIRET, siège social, directeur de la publication, hébergeur, email, médiateur
de la consommation. La loi LCEN impose ces informations sur tout site
commercial. Les trois documents (CGV, mentions légales, confidentialité) sont
des modèles : **les faire relire par un juriste** avant la mise en ligne.

### 3. Le prix affiché est calculé dans le navigateur

Une personne techniquement avertie peut modifier le prix affiché dans les
outils de développement. Le risque est aujourd'hui limité, puisque le chauffeur
encaisse lui-même et voit le montant sur le bon : c'est lui qui fait foi.

Les codes promo sont dans le même cas : ils sont désormais stockés sous forme
d'empreinte (on ne peut plus les lire dans le code source), mais ce n'est que
de l'obfuscation. Seule une validation serveur les protège vraiment.

### 4. Compiler Tailwind

La page charge Tailwind depuis un CDN prévu pour le prototypage : il affiche un
avertissement en console et ralentit le premier affichage. Avant le lancement :

```bash
npx tailwindcss -i input.css -o styles.css --minify
```

puis remplacer `<script src="https://cdn.tailwindcss.com"></script>` par
`<link rel="stylesheet" href="styles.css">`.

### 5. Itinéraires : sortir du serveur de démonstration

Les distances viennent de `router.project-osrm.org`, un serveur de
démonstration limité en débit et déconseillé pour un usage commercial. Pour du
trafic réel : héberger sa propre instance OSRM, ou passer par un service à clé
(Mapbox, OpenRouteService). En cas d'indisponibilité, l'application retombe
automatiquement sur une estimation à vol d'oiseau majorée de 30 %.

### 6. Protection contre le clickjacking

`frame-ancestors` ne fonctionne pas dans une balise `<meta>` : il faut un
en-tête HTTP. GitHub Pages ne permet pas de définir d'en-têtes ; un CDN comme
Cloudflare, si.

### 7. Icônes PNG (optionnel)

Les icônes d'installation sont en SVG, ce qui convient à Chrome et Android.
Pour une compatibilité maximale, exporter aussi `icon-192.png` et
`icon-512.png` et les ajouter à `manifest.webmanifest`.

## Tests

Les vérifications se font au navigateur avec Playwright (aucune installation
supplémentaire nécessaire) :

```bash
npx http-server -p 8099 -s .
node test.mjs      # interface, traductions, accessibilité, validations (21)
node test2.mjs     # parcours complet de réservation, CGV (23)
node test3.mjs     # bon, facture, vol, passager tiers, référencement (67)
node test4.mjs     # hôtel, diffusion, carte, langue, capacité (73)
node test5.mjs     # prix ferme, lien de course, écran chauffeur (38)
node test6.mjs     # délai de 3 h, avertissement et appel de confirmation (20)
```

Note : servez le site avec Tailwind accessible. Deux tests portent sur des
éléments masqués par la classe `hidden` ; sans la feuille Tailwind, ils
échouent à tort. La classe est aussi redéfinie dans la feuille de style de
l'application, précisément pour que le site reste correct si le CDN tombe.

## Notes de fonctionnement

- **Traductions** : 6 langues (français, anglais, espagnol, portugais, arabe,
  chinois), toutes complètes pour l'interface. Les trois
  documents juridiques restent en français et en anglais uniquement — un
  contrat mal traduit n'engage pas correctement. Un encart le signale aux
  clients dans les autres langues.
- **Adresses** : trois sources cumulées — terminaux d'aéroport (saisir « cdg »,
  « orly »…), lieux nommés via Photon/OpenStreetMap, adresses précises via la
  Base Adresse Nationale. Si les trois échouent, une base locale prend le
  relais pour que la saisie reste possible.
  L'ordre des résultats suit la forme de la saisie : une saisie qui commence
  par un chiffre est une adresse postale, la Base Adresse Nationale passe
  devant ; sinon c'est un nom de lieu — hôtel, restaurant, gare, monument,
  hôpital, école — et OpenStreetMap passe devant, seul à savoir le situer.
- **Trouver un lieu quelle que soit la façon dont on l'écrit** : le client
  tape « easy hotel aeroville », le nom réel est « easyHotel
  Paris-Charles de Gaulle », près du centre Aéroville. Aucun mot ne se
  recoupe. Trois mesures, dans cet ordre : la recherche est relancée sans
  les mots passe-partout que le client ajoute naturellement (« hôtel »,
  « restaurant », « gare »…) et qui ne figurent presque jamais dans le nom
  de l'établissement ; si rien ne remonte encore, elle est relancée sur le
  seul mot distinctif de la saisie (« aeroville ») ; enfin tout ce qui
  remonte est reclassé selon les mots réellement tapés, un mot distinctif
  comptant trois fois plus qu'un mot passe-partout — sinon tous les hôtels
  de France se vaudraient.
- **Passagers et véhicule** : demandés dès le premier écran. Le nombre de
  passagers **écarte les véhicules trop petits, rien de plus** : un client
  seul garde le choix entre berline, berline VIP, van et van VIP — il a le
  droit de vouloir un van, et c'est une course plus chère. À six
  passagers, seuls les vans restent proposés. Il n'y a **pas d'option
  « peu importe »** : le client choisit un véhicule, ou rien n'est
  réservé. Ajouter des enfants au-delà de la capacité bloque la
  réservation au lieu de passer en silence.
- **Pas d'emoji ni d'illustration de voiture.** Un emoji est dessiné par
  le téléphone du visiteur, pas par le site : le même caractère est
  bariolé sur un appareil et terne sur un autre, et rien de tout cela ne
  tient face à une charte noir et or. Chaque carte porte donc une pastille
  dorée avec le **nombre de places**, qui est l'information que le client
  cherche. La seule voie vers du visuel réaliste serait de vraies photos
  des véhicules du réseau — en évitant toute marque identifiable, sans
  quoi la promesse devient trompeuse.
- **Délai de réservation de 3 heures.** Le site ne peut pas savoir si un
  chauffeur est libre tout de suite — il n'y a ni serveur, ni suivi de
  disponibilité. Une course demandée pour dans moins de trois heures est
  donc **acceptée mais pas ferme** : l'écran de confirmation l'annonce en
  rouge, avec un bouton pour appeler et un message WhatsApp déjà rédigé
  qui porte la référence, et le bon de réservation reprend la même
  mention. Le client n'est jamais bloqué, il est prévenu — et c'est ce
  qu'il faut, parce qu'une réservation qu'on croit acquise et qui n'arrive
  pas coûte bien plus cher qu'un appel. Le seuil se règle en haut
  d'`index.html` (`DELAI_RESERVATION_H`), et le numéro affiché partout
  découle de la seule constante `WHATSAPP_NUMBER`.
- **Départ et arrivée sont tous deux obligatoires** : sans les deux
  adresses, la réservation ne part pas. Le prix est calculé une fois pour
  toutes à ce moment-là et proposé au client : c'est celui qu'il accepte
  avant de monter, et c'est celui que le chauffeur encaisse. Rien n'est
  recalculé à l'arrivée.
- **Langue** : le site s'ouvre toujours en français, quelle que soit la langue
  du téléphone. Les cinq autres restent au sélecteur, et le choix d'un
  visiteur est mémorisé sur son seul appareil.
- **Carte du trajet** : elle trace l'itinéraire routier réel renvoyé par OSRM —
  celui-là même qui a servi à calculer la distance et donc le prix. Si OSRM
  n'a pas répondu, la ligne directe s'affiche en pointillé, pour qu'on voie
  qu'elle n'est qu'indicative.
- **Historique** : conservé en `sessionStorage`, donc il survit à un
  rechargement de page mais disparaît à la fermeture de l'onglet — exactement
  ce qui est annoncé au client à l'écran.
- **Répertoire client** : enregistré en `localStorage`, sur l'appareil
  uniquement. Il ne se synchronise pas entre téléphone et ordinateur.
- **Transmission de la réservation** : c'est le point faible connu. La course
  n'arrive au chauffeur que si le client envoie le message WhatsApp qui
  s'ouvre après confirmation. L'écran de confirmation le dit explicitement et
  propose un bouton de renvoi, une copie du récapitulatif et un envoi par
  email. Une transmission réellement automatique demande un serveur.
- **Numéro de vol** : le champ apparaît dès qu'un terminal d'aéroport est
  choisi au départ ou à l'arrivée, et le vol est repris dans le
  récapitulatif, le bon de réservation et le message au chauffeur. Le suivi
  automatique du vol (décalage de l'heure en cas de retard, comme le fait
  Blacklane) demanderait un serveur et un abonnement à une API de vols.
- **Numéro de chambre** : dès que l'adresse choisie au départ ou à l'arrivée
  est un hôtel, un champ « N° de chambre » apparaît. Il est reconnu de deux
  façons — la catégorie OpenStreetMap renvoyée par Photon, et le libellé
  lui-même (« Hôtel… », « Ibis », « Mercure »…), car la Base Adresse
  Nationale ne renvoie pas de catégorie. Changer d'adresse referme **et**
  vide le champ : le chauffeur ne reçoit jamais la chambre d'une adresse
  précédente. La chambre figure sur le récapitulatif, le bon, la facture et
  le message WhatsApp — mais **jamais** sur l'annonce diffusée au groupe.
- **Plus de forfait aéroport** : il n'y a plus de grille de prix fixes ni
  d'écran dédié. Une course vers Roissy, Orly ou Beauvais se réserve et se
  tarife comme n'importe quelle autre, à la distance. Les terminaux restent
  proposés comme adresses — taper « cdg » ou « orly » les fait apparaître —
  parce que ce sont des points de rendez-vous précis que ni la Base Adresse
  Nationale ni OpenStreetMap ne donnent proprement.

## La course transmise par lien — et l'écran chauffeur

Depuis le bon de réservation, en mode exploitant, le bouton « Proposer au
groupe chauffeurs » envoie désormais **un lien** en plus de l'annonce. Ce
lien porte la course entière, encodée dans l'adresse : aucun serveur n'est
nécessaire pour la transmettre.

### Comment voir cet écran vous-même

Il n'y a **pas de page de connexion** : le lien *est* la clé. Pour le voir :

1. ouvrez le site avec `?exploitant=1` ;
2. faites une réservation d'essai (n'importe quelle adresse) ;
3. sur le bon, appuyez sur « Proposer au groupe chauffeurs » ;
4. dans le message WhatsApp qui s'ouvre, **copiez le lien qui finit par
   `?c=…`** au lieu de l'envoyer, et collez-le dans votre navigateur.

Vous tombez alors exactement sur ce que voit le chauffeur. Chaque lien ne
vaut que pour **une** course : il n'y a rien à créer ni à administrer.

Le chauffeur l'ouvre et se retrouve dans un **espace chauffeur** :

| Étape | Ce qu'il fait | Ce qui est enregistré |
|---|---|---|
| 1 | Donne son nom, « Je prends cette course » | Un message part vers vous sur WhatsApp, signé |
| 2 | « Je suis sur place » | Le compteur d'attente démarre, pour information |
| 3 | « Client à bord — démarrer » | L'heure de départ est notée |
| 4 | « Terminer la course » | Rien à saisir : le montant est celui de la réservation |
| 5 | « Envoyer le résultat » | Un second lien vous revient sur WhatsApp |

Le chauffeur ne saisit **aucune adresse** et ne calcule **aucun prix** : le
montant a été arrêté à la réservation, le client l'a accepté avant de
monter. L'écran chauffeur ne fait que le lui rappeler, en lui indiquant au
passage sa part nette de commission.

Vous ouvrez le lien de retour : **votre bon se complète tout seul** avec la
durée, le nom du chauffeur, et la course passe en « réalisée » dans votre
registre.

Un bouton « Envoyer ma position » est disponible à chaque étape : le
chauffeur vous envoie sa position par WhatsApp quand vous la demandez.

### Ce que ce montage ne sait pas faire

Deux choses, et aucun bricolage ne les remplacera :

- **la position en direct** pendant le trajet ;
- **le verrouillage de la course** sur le premier chauffeur qui accepte —
  sans serveur, deux chauffeurs peuvent accepter la même course, et c'est
  vous qui arbitrez au premier message reçu.

Les deux demandent un serveur. Tout le reste fonctionne aujourd'hui.

### Un point de droit à ne pas perdre de vue

Un VTC **n'a pas le droit d'avoir un taximètre** : le prix doit être connu
avant le départ. C'est exactement ce que fait le site aujourd'hui — un
montant ferme calculé à la réservation, accepté par le client, encaissé
tel quel. Ne jamais réintroduire un montant arrêté en fin de course.

## Mode exploitant et réseau de chauffeurs

### Séparer votre écran de celui du client

L'attribution du chauffeur, la confirmation de la course, l'export du
registre et la diffusion au groupe sont **vos** outils : ils affichent votre
marge et n'ont rien à faire sous les yeux d'un client.

Ouvrez le site **une fois** avec `?exploitant=1` sur votre téléphone :

```
https://barbaros911.github.io/As-mine/?exploitant=1
```

Le réglage est mémorisé sur cet appareil. `?exploitant=0` le retire. Ce n'est
pas un contrôle d'accès — un site statique ne peut pas en offrir — mais cela
suffit à séparer les deux usages. Le client, lui, garde l'accès à son bon
**et** à sa facture, qui lui reviennent.

### Proposer une course au groupe de chauffeurs

Depuis le bon de réservation, un bloc « Proposer au groupe chauffeurs »
prépare une annonce et l'ouvre dans WhatsApp — vous n'avez plus qu'à choisir
le groupe. Aucun numéro de groupe n'est enregistré dans le site.

L'annonce ne contient **ni le nom, ni le téléphone, ni le numéro de chambre**
du client. Ce n'est pas une précaution de style : diffuser les coordonnées
d'un client à des centaines de personnes serait une transmission de données
personnelles à des tiers non nécessaires (RGPD, article 5.1.c, principe de
minimisation). Vous les communiquez ensuite en privé, au seul chauffeur
retenu. La politique de confidentialité du site décrit ce fonctionnement.

Le montant affiché sur l'annonce est **net de commission** : c'est ce que le
chauffeur encaissera. Le taux se règle en haut d'`index.html` :

```js
const COMMISSION_APPORT = 0.15; // 15 % — mettez 0 pour diffuser le prix entier
```

Cette valeur n'est qu'un affichage : le taux réel se convient avec les
chauffeurs, et rien dans le site ne l'impose.

## Pistes d'amélioration identifiées

Comparaison faite avec les services de référence du chauffeur haut de gamme :

- **Suivi du chauffeur en temps réel** 20 minutes avant la prise en charge.
  Demande un serveur et la position du chauffeur.
- **Transmission automatique des réservations** vers votre téléphone, sans
  dépendre du geste du client. Demande un serveur.
- **Attribution automatique au réseau** : aujourd'hui vous copiez l'annonce
  dans le groupe et vous dépouillez les réponses à la main. Une vraie
  répartition (le premier chauffeur qui accepte prend la course, les autres
  voient qu'elle est prise) demande un serveur et des comptes chauffeurs.
- **Suivi de vol automatique** (décalage de l'heure en cas de retard) :
  demande un abonnement à une API de vols.
