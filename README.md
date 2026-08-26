# Asmine — application de réservation

Application web de réservation de chauffeur privé (Paris / Île-de-France).
Site statique : un seul fichier `index.html`, plus le manifeste, les icônes et
le service worker. Aucun serveur n'est nécessaire pour l'héberger.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : interface, styles, traductions, tarification |
| `manifest.webmanifest` | Déclaration PWA (nom, couleurs, icônes) |
| `icon.svg`, `icon-maskable.svg` | Icônes d'installation |
| `admin.html` | Adresse dédiée de l'espace exploitant (simple redirection) |
| `sw.js` | Service worker : consultation hors ligne |

Le site est publié automatiquement à chaque modification de `main`, par le
workflow `.github/workflows/pages.yml` : **https://barbaros911.github.io/As-mine/**

## Ajouter d'autres sites, sans toucher à Asmine

Asmine occupe la racine du dépôt et garde son adresse. Pour publier un autre
site — une démonstration à montrer à un client, par exemple — il suffit de
créer un dossier dans `sites/` :

| Dossier | Adresse publiée |
|---|---|
| *(racine)* | `.../As-mine/` — Asmine |
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
- un dossier qui porterait le nom d'un fichier d'Asmine (`index.html`,
  `sw.js`…) ou de la galerie (`demos`) fait échouer la publication au lieu de
  passer en silence ;
- le service worker d'Asmine ignore les autres sites : il ne met pas leurs
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
node test3.mjs     # bon, facture, vol, passager tiers, référencement (70)
node test4.mjs     # hôtel, diffusion, carte, langue, capacité (75)
node test5.mjs     # prix ferme, lien de course, écran chauffeur (47)
node test6.mjs     # délai de 3 h, avertissement et appel de confirmation (20)
node test7.mjs     # numérotation, confirmation à distance, code d'accès (26)
node test8.mjs     # deux espaces distincts, boucle de la demande (54)
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

## Deux espaces, deux adresses

Le code de l'application vit dans **un seul fichier** — un second divergerait
au premier correctif. Mais les deux usages ne se ressemblent pas, et ils
n'ont pas la même adresse.

| | Adresse | Ce qu'on y voit |
|---|---|---|
| **Client** | `.../As-mine/` | La vitrine, le formulaire, ses propres courses |
| **Exploitant** | `.../As-mine/admin.html` | Le tableau de bord des demandes |

`admin.html` ne fait que rediriger vers `index.html?exploitant=1` en
transmettant les paramètres reçus. La page est en `noindex`.

**L'espace de travail ne s'ouvre que depuis son adresse.** Le déverrouillage
est retenu sur l'appareil pour ne pas redemander le code, mais il ne suffit
pas : sans `?exploitant=1`, on voit le site client. Sans cette règle,
l'exploitant ne pourrait plus jamais consulter son propre site public depuis
son téléphone — c'est exactement ce qui s'est produit avant correction.

**Passer d'un espace à l'autre tient en un bouton.** Le tableau de bord
porte un lien « Voir le site public » ; le site public, sur un appareil déjà
déverrouillé, porte un lien « Revenir à mon espace exploitant ». Aucun code
n'est redemandé, et un client — qui n'a jamais déverrouillé — ne voit rien
de tout cela. « Quitter », lui, oublie le code sur l'appareil : c'est une
sortie, pas un aller-retour.

La bannière cookies ne s'affiche pas dans l'espace exploitant : elle
s'adresse aux visiteurs, et elle masquait la liste des demandes. Sans
réponse, le consentement reste refusé — aucune statistique n'est collectée.

Le lien de demande envoyé par le client vise donc `admin.html`. Un lien `?a=`
ouvert par erreur sur l'adresse publique est renvoyé vers l'espace de travail
avec sa charge, plutôt qu'importé en silence dans le site client. Et le code
saisi ne fait pas perdre les paramètres de l'adresse en cours.

Une fois le code saisi, l'écran change de peau : liseré doré en haut, badge
« EXPLOITANT » dans l'en-tête, onglet « Créer » au lieu de « Mes
réservations », bouton « Quitter », et disparition de tout ce qui s'adresse
au client — bouton WhatsApp flottant, invitation à installer l'application,
argumentaire de référencement, sélecteur de langue.

L'espace de travail est **en français uniquement**. Le sélecteur de six
langues sert au client ; sur l'outil de travail c'est un piège — un geste
malheureux et tout l'écran passe en portugais au milieu d'une nuit chargée.
Le choix de langue du client, lui, est conservé et retrouvé à la sortie.

## La page de gestion

Le deuxième onglet n'a pas le même sens des deux côtés du miroir : chez le
client c'est « Mes réservations », la trace de ses propres courses ; chez
l'exploitant c'est sa page de gestion. Elle tient quatre choses, dans
l'ordre où l'on s'en sert.

**Coller une demande.** Le message WhatsApp que le client envoie ne porte
plus aucun lien : six lignes lisibles, rien d'autre. Sans serveur, rien ne
peut voyager tout seul du téléphone du client à celui de l'exploitant — il
faut que quelqu'un transporte le message, et le moins cher des transports
est le presse-papiers. D'où le bouton **« Coller une demande reçue »**, en
haut du tableau de bord : on copie le message dans WhatsApp, un appui, et la
course entre **en attente**, en or, dans la liste. Une demande venue d'un
client n'est jamais confirmée d'entrée : il attend une réponse.

Si le navigateur refuse l'accès au presse-papiers, le bouton emmène sur le
champ de saisie de la page Créer plutôt que de ne rien faire. Ce champ
accepte le même message et remplit tout le formulaire — référence comprise. Le lecteur
ne se fie pas aux libellés (un client espagnol écrit « Salida ») mais à la
structure du message, qui est écrite par cette même page. Si le message est
incomplet ou déjà connu, il le dit plutôt que de remplir n'importe quoi.

**Clore une course.** Une fois la course faite, un bouton vert **« Terminée »**
sur la ligne du tableau de bord suffit : un appui, sans ouvrir le bon. C'est
le geste du soir, fait à la chaîne sur trois ou quatre courses. Le même geste
existe sur le bon lui-même — **« Marquer comme réalisée »** — pour le cas où
l'on y est déjà. Tant qu'une course n'est pas close, elle ne compte ni dans
le tableau des chauffeurs, ni dans le résultat : une course confirmée n'est
pas une course faite.

**Créer une résa.** Un hôtel appelle, un habitué envoie un SMS : on ne lui
fait pas remplir le tunnel client. Le nom, deux adresses, une date, un
véhicule, un prix — et la course est enregistrée, **ferme d'entrée**
(`statut: "confirmee"`), puisque c'est l'exploitant lui-même qui la saisit.
Le chauffeur peut être laissé vide et complété plus tard depuis le bon.
Sans départ, sans arrivée ou sans prix, rien n'est enregistré : une course
sans prix serait un taximètre, ce qu'un VTC n'a pas le droit d'avoir.

**Cette semaine.** Trois chiffres — courses réalisées, encaissé, commission
d'apport — avec la semaine précédente rappelée en dessous. C'est la
comparaison qui renseigne, pas la valeur : « 4 courses » ne veut rien dire
tant qu'on ne sait pas s'il y en avait 2 ou 9 la semaine d'avant.

**Résultat par semaine, par mois, par année.** Trois boutons, le même
registre regroupé autrement : la semaine pour piloter, le mois pour comparer,
l'année pour la comptabilité. Rien ne sort du registre en changeant de vue.
Et une **recherche libre** retrouve n'importe quelle course — par référence,
nom, téléphone, adresse, chauffeur ou date — même six mois plus tard.

**Chauffeurs** et **Résultat**, deux tableaux. Le premier dit
qui roule vraiment pour Asmine : nom, nombre de courses, encaissé, commission
due. Le second donne les huit dernières semaines. Les deux ne comptent que
les courses **réalisées** — une course confirmée n'est pas une course faite,
et gonfler le chiffre d'affaires avec des promesses serait se mentir à
soi-même. C'est le bouton « Marquer comme réalisée », sur le bon, qui fait
entrer une course dans ces tableaux.

**Sauvegarde du registre.** Sans serveur, ces courses ne vivent que dans ce
navigateur : un téléphone perdu, un historique effacé, et trois mois de
travail disparaissent. « Sauvegarder » télécharge un fichier JSON,
« Restaurer » le relit — en **ajoutant** ce qui manque, jamais en écrasant
ce qui est déjà là, parce qu'une course présente sur l'appareil a pu avancer
depuis la sauvegarde. « Exporter les courses (CSV) » produit le tableau à
donner au comptable. À faire toutes les semaines tant qu'il n'y a pas de
serveur : c'est la seule protection qui existe.

## Le cycle d'une demande

C'est la boucle qui remplace la base de données commune. Chaque étape passe
par un lien, parce qu'aucun appareil ne peut lire la mémoire d'un autre.

| | Ce qui se passe | Le lien |
|---|---|---|
| 1 | Le client réserve et envoie son message WhatsApp | `?a=` y est joint |
| 2 | Asmine ouvre le lien : la demande entre dans son tableau de bord, **en attente**, pastille clignotante | — |
| 3 | Il l'ouvre : diffusion au groupe, saisie du chauffeur retenu, **Confirmer** ou **Refuser** | — |
| 4 | Il envoie la course au seul chauffeur retenu | `?c=`, en privé |
| 5 | Il renvoie sa décision au client, sur son propre numéro | `?ok=` ou `?no=` |
| 6 | Le client ouvre le lien : son bon passe en **prise en charge** (vert, avec le nom et le numéro de son chauffeur) ou **n'a pas pu aboutir** (rouge, avec le numéro à appeler) | — |

Le tableau de bord compte les demandes en attente, confirmées et réalisées ;
les compteurs servent aussi de filtres. Rouvrir deux fois le même lien `?a=`
ne crée pas de doublon et n'écrase pas une décision déjà prise.

**Ce que cela ne remplace pas.** Asmine ne voit que les demandes dont il a
ouvert le lien : si le client n'envoie pas son message WhatsApp, ou si Asmine
ne touche pas au lien, la demande n'existe pas chez lui. Un vrai registre
partagé demande le serveur.


### Des messages courts, et le moins possible

Trois principes, appris à l'usage sur un vrai téléphone :

- **La demande que le client vous envoie tient en six lignes** : référence,
  date, départ, arrivée, passagers-véhicule-prix, nom et téléphone. Le
  détail complet est dans le lien, qui ouvre la demande dans votre tableau
  de bord — le recopier dans le message ne servait personne.
- **L'écran chauffeur n'envoie plus rien tout seul.** Vous attribuez la
  course : vous savez déjà qui roule. Les étapes — accepter, sur place,
  démarrer, terminer — ne servent qu'au chauffeur, sur son propre
  téléphone. Seules deux choses partent encore, et sur sa décision : sa
  position quand on la lui demande, et un message de fin d'une ligne.
- **Vous clôturez la course vous-même**, par « Marquer comme réalisée » sur
  le bon. Y compris quand vous l'avez conduite. Rien à attendre de personne.

### Pourquoi l'annonce au groupe ne porte pas le lien

Le lien de course fait 350 caractères : dans un fil de groupe qui défile, il
noyait le message. Et 800 chauffeurs n'en ont aucun usage — il ne sert qu'à
celui qui prend la course.

L'annonce diffusée est donc courte et sans lien (8 lignes, ~260 caractères).
Une fois qu'un chauffeur a répondu en privé, l'exploitant saisit son nom et
son téléphone dans le bon, et un bouton **« Envoyer la course à ce
chauffeur »** lui envoie l'annonce **plus le lien**, directement sur sa
conversation. Message court d'un côté, lien de l'autre — et une donnée de
moins diffusée à un groupe.

Les messages au client partent de la même façon, **droit sur son numéro** :
il figure dans la demande, il n'y a aucune raison de passer par le sélecteur
de contacts.

## Confirmer une course au client

Le bloc « Confirmer une course à distance » n'existe plus : il demandait de
recopier une référence à la main pour reconstruire une course qu'on n'avait
pas, et personne ne s'en servait. Depuis que le message du client se recolle
dans « Coller une demande », la course est toujours sur l'appareil au moment
de confirmer.

Le circuit tient donc en trois gestes, tous sur le bon de la course :

1. saisir le **chauffeur retenu** (nom, téléphone) ;
2. **Confirmer la course** ;
3. **Prévenir le client** — le message part droit sur son numéro, avec la
   référence, le chauffeur et un lien `?ok=`.

Le client ouvre ce lien : son bon passe de « En attente de confirmation »
(orange) à **« Course confirmée »** (vert), l'avertissement des moins de 3 h
disparaît, et le chauffeur annoncé apparaît avec son numéro. Un lien ouvert
sur un appareil qui ne connaît pas la course ne fabrique rien — il le dit.

## La numérotation des courses

Chaque course reçoit une référence **`ASM-AA-MM-NNNN`** : `ASM-26-08-0001`
est la première course d'août 2026. Le rang repart à 1 chaque mois, ce qui
donne le volume mensuel d'un coup d'œil et évite des nombres illisibles.

Le rang se calcule à partir des courses enregistrées sur l'appareil. **Deux
appareils qui ne se voient pas peuvent donc attribuer le même numéro** —
c'est la limite du fonctionnement sans serveur, et la raison pour laquelle
la numérotation des **factures** reste séparée : elle est propre à chaque
chauffeur (`DUPONT-2026-0001`), n'a pas le droit au moindre doublon ni au
moindre trou, et doit pour cette raison être éditée depuis un seul appareil.
Le registre exportable en CSV permet de vérifier sa continuité.

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

Le site demande alors un **code d'accès**. Une fois saisi, le déverrouillage
est mémorisé sur cet appareil ; `?exploitant=0` le retire. Le code n'est pas
écrit dans `index.html` — seule son empreinte l'est, comme pour les codes
promo — parce que le dépôt est public. Pour le changer : ouvrir la console du
navigateur sur le site, taper `promoHash("NOUVEAUCODE")`, coller l'empreinte
obtenue dans `CODE_EXPLOITANT`.

**Ce que cela protège, et ce que cela ne protège pas.** La diffusion au
groupe, la confirmation à distance, l'attribution du chauffeur et l'export du
registre ne sont accessibles qu'après le code : un client qui devine
`?exploitant=1` tombe sur une demande de code et n'obtient rien. Mais c'est
une serrure, pas un coffre : un site statique ne garde aucun secret pour qui
s'acharne à lire son code. Le vrai contrôle d'accès demande le serveur.

Le client, lui, garde l'accès à son bon **et** à sa facture, qui lui
reviennent.

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
