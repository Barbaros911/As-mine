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
node test.mjs      # interface, traductions, accessibilité, validations (20)
node test2.mjs     # parcours complet de réservation, CGV (23)
node test3.mjs     # bon, vol, passager tiers, adresses, référencement (46)
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
- **Adresses enregistrées** : les adresses réellement utilisées deviennent des
  raccourcis sous les champs départ et arrivée, sur l'appareil uniquement.
- **Numéro de vol** : saisi sur l'écran aéroport, il est repris dans le
  récapitulatif, le bon de réservation et le message au chauffeur. Le suivi
  automatique du vol (décalage de l'heure en cas de retard, comme le fait
  Blacklane) demanderait un serveur et un abonnement à une API de vols.

## Pistes d'amélioration identifiées

Comparaison faite avec les services de référence du chauffeur haut de gamme :

- **Suivi du chauffeur en temps réel** 20 minutes avant la prise en charge.
  Demande un serveur et la position du chauffeur.
- **Aller-retour en une seule réservation**, fréquent sur les transferts
  aéroport ; aujourd'hui il faut réserver deux fois.
- **Facture** : le bon de réservation n'est pas une facture. Le chauffeur doit
  remettre au client une facture à son nom, avec un numéro séquentiel.
- **Transmission automatique des réservations** vers votre téléphone, sans
  dépendre du geste du client. Demande un serveur.
