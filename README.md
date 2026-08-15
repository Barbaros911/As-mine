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

## À faire avant une mise en ligne commerciale

Ces points ne sont pas des bugs : ce sont des informations ou des services
extérieurs qui n'existent pas encore. Tant qu'ils ne sont pas réglés,
l'application fonctionne mais **aucune réservation ne peut être payée**.

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
node test.mjs      # interface, traductions, accessibilité, validations
node test2.mjs     # parcours complet de réservation
```

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
  propose donc un bouton de renvoi et une copie du récapitulatif.
