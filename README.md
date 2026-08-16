# As-mine — application de réservation

Application web de réservation de chauffeur privé (Paris / Île-de-France).
Site statique : un seul fichier `index.html`, plus le manifeste, les icônes et
le service worker. Aucun serveur n'est nécessaire pour l'héberger.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'application : interface, styles, traductions, tarification, paiement |
| `manifest.webmanifest` | Déclaration PWA (nom, couleurs, icônes) |
| `icon.svg`, `icon-maskable.svg` | Icônes d'installation |
| `sw.js` | Service worker : consultation hors ligne |

Le site est publié automatiquement à chaque modification de `main`, par le
workflow `.github/workflows/pages.yml` : **https://barbaros911.github.io/As-mine/**

## À faire avant une mise en ligne commerciale

Ces points ne sont pas des bugs : ce sont des informations ou des services
extérieurs qui n'existent pas encore. Tant qu'ils ne sont pas réglés,
l'application fonctionne mais **aucune réservation ne peut être payée**.

### 0. Renseigner l'identité de l'opérateur — obligation légale

En haut d'`index.html`, l'objet `OPERATEUR` attend votre raison sociale, votre
adresse, votre SIRET et votre **numéro d'inscription au registre VTC (EVTC)**.
L'objet `CHAUFFEUR` attend le nom et le numéro de carte professionnelle du
chauffeur affecté.

L'arrêté du 6 août 2025 impose de remettre au client un bon de réservation
portant ces mentions. L'application le génère déjà (écran « Bon de
réservation », imprimable ou enregistrable en PDF), mais **tant que ces champs
sont vides le bon s'affiche comme incomplet** — c'est volontaire, pour que le
manque soit visible.

Attention : le bon doit être **conservé 3 ans**. Un site statique ne peut pas
le faire ; aujourd'hui seul le client détient son exemplaire. Cette
conservation demande un serveur (voir le point 3).

### 1. Activer PayPal — bloquant

Dans `index.html`, remplacer :

```js
const PAYPAL_CLIENT_ID = "YOUR_PAYPAL_CLIENT_ID";
```

par l'identifiant obtenu sur [developer.paypal.com](https://developer.paypal.com)
(compte Business gratuit → *My Apps & Credentials* → *Live*).
Tant que cette ligne n'est pas modifiée, l'écran de paiement affiche
« paiement non encore activé » — c'est volontaire, plutôt qu'un bouton mort.

### 2. Compléter les mentions légales — obligation légale

Dans `index.html`, chercher `[À compléter]` : raison sociale, forme juridique,
SIRET, siège social, directeur de la publication, hébergeur, email, médiateur
de la consommation. La loi LCEN impose ces informations sur tout site
commercial. Les trois documents (CGV, mentions légales, confidentialité) sont
des modèles : **les faire relire par un juriste** avant la mise en ligne.

### 3. Le prix est calculé dans le navigateur — risque financier

`createOrder` envoie à PayPal le montant calculé côté client. Une personne
techniquement avertie peut modifier ce montant dans les outils de développement
et payer 1 € au lieu de 130 €.

**Un site statique ne peut pas empêcher cela.** La correction demande un petit
serveur qui recalcule le prix et crée la commande PayPal lui-même. Tant que ce
serveur n'existe pas, il faut vérifier le montant réellement encaissé dans le
tableau de bord PayPal avant d'envoyer un chauffeur.

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
node test.mjs      # interface, traductions, accessibilité, validations (17)
node test2.mjs     # parcours complet de réservation (15)
node test3.mjs     # bon de réservation, vol, passager tiers, adresses (26)
```

Note : servez le site avec Tailwind accessible. Deux tests portent sur des
éléments masqués par la classe `hidden` ; sans la feuille Tailwind, ils
échouent à tort. La classe est aussi redéfinie dans la feuille de style de
l'application, précisément pour que le site reste correct si le CDN tombe.

## Notes de fonctionnement

- **Traductions** : 11 langues, toutes complètes pour l'interface. Les trois
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
- **Après paiement** : l'application tente d'ouvrir WhatsApp automatiquement.
  Safari sur iPhone bloque souvent cette ouverture ; l'écran de confirmation
  propose donc un bouton de renvoi, une copie du récapitulatif et un envoi par
  email. L'email ouvre l'application de messagerie du client : sans serveur,
  aucun envoi automatique n'est possible.
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
- **Temps d'attente offert** : les CGV annoncent 45 minutes, la référence du
  marché en offre 60 à l'aéroport. C'est une décision commerciale, pas
  technique — à trancher par l'exploitant.
