# Chantier « Refonte façon Uber » — août 2026

**État : en attente. Rien n'est publié. Barbaros doit valider avant la mise en ligne.**

Branche : `claude/as-mine-booking-app-yqvxoi`
Le site en ligne (`main`) ne contient AUCUN de ces changements.

---

## Ce qui est fait et attend son feu vert

### 1. L'accueil, refait
Le titre était posé sur le ruban de photos, en vert : lisible sur la Joconde,
invisible sur les Champs illuminés. Une image qui change toutes les six
secondes ne peut garantir aucun contraste.

- Titre sur un **bandeau marine plein**, en ivoire, avec le filet doré de la
  marque qui sort du cadre en bas à gauche.
- Accroche courte en pastille verte : « Chauffeur vérifié · Prix fixe »,
  identique dans les six langues.
- Ruban de photos descendu **sous le formulaire**, et remonté à 186 px.
- Résultat : le formulaire entier, bouton « Voir les tarifs » compris, tient
  dans le premier écran d'un téléphone.

### 2. L'écran des véhicules, refait
- Carte pleine largeur en haut, liste qui remonte par-dessus dans une feuille
  à coins arrondis, bouton collé au-dessus de la barre de navigation.
- Tuiles désaturées, tracé marine à bouts arrondis, repères cerclés de blanc.
- Chaque ligne : silhouette, nom, pastille des places, **heure d'arrivée
  estimée**, prix. Le bouton se nomme — « Continuer · Ela One ».

### 3. Quatre gammes
**Ela One** (4 places) · **Ela First** (3) · **Van** (7) · **Van Premium** (6),
aux tarifs de la grille en vigueur.

- Silhouettes dessinées, génériques, **sans marque reconnaissable**.
- Les clés techniques (`berline`, `berline_vip`, `van`, `van_vip`) ne changent
  pas : l'historique des courses reste lisible.
- Les anciens noms (« Berline », « Sedán », « 商务车 »…) restent reconnus, pour
  que « Coller une demande » relise les anciens messages WhatsApp.

### 4. Couche de services carte / itinéraires
Une ligne, `CLE_MAPBOX`, en haut du script. Sans clé, rien ne change.

### 5. Deux défauts corrigés au passage
- La pastille WhatsApp se posait **pile sur le bouton « Continuer »** de
  l'écran des véhicules. Elle ne s'affiche plus que sur l'accueil.
- La mention « Prix TTC, TVA 10 % » s'affichait **sous** le bouton dès que la
  barre se collait en bas : on lisait le prix après avoir validé.

**Vérifié** : huit suites Playwright, 444 vérifications, aucun échec.
Ordinateur et téléphone, en français, anglais, portugais et arabe.

---

## Ce que Barbaros doit fournir pour aller plus loin

### La clé Mapbox
1. Créer un compte gratuit sur mapbox.com.
2. Générer une clé publique (*public token*).
3. **La restreindre au domaine `elatransfer.com`** (Account → Tokens → URL
   restrictions). Le dépôt est public et la clé part dans la page : sans
   restriction, n'importe qui consomme le quota.
4. La coller dans `CLE_MAPBOX`.

Pourquoi ça compte : le site calcule aujourd'hui ses itinéraires sur
`router.project-osrm.org`, un serveur de **démonstration** sans engagement.
Quand il refuse, le prix retombe sur la distance à vol d'oiseau × 1,3 — sur un
Roissy → Paris, l'écart se compte en euros. Et les tuiles d'OpenStreetMap
interdisent l'usage commercial soutenu.

### Cinq relevés de prix Uber
Sur ses trajets habituels (CDG → Paris, Orly → Paris…), **à heure calme**, pour
recaler la grille.

Ce que dit sa capture du 29 août : UberX affichait **22,94 €** en plein tarif
pour Argenteuil → Paris 6e (15 à 18 km). Ela One sur ce trajet : **32 à 37 €**.
Il n'est pas à +25 %, il est **déjà entre +40 % et +60 %**. Pour tomber à
+25 %, il faudrait descendre autour de **1,45 €/km** au lieu de 1,75.
Réserve : le relevé est un samedi soir, donc probablement majoré chez eux. Un
instantané ne fait pas une grille.

---

## Ce qui n'est pas faisable, et pourquoi

**La carte Uber en direct et la position de leurs chauffeurs : non.**
Il n'existe aucune API publique Uber pour ça — elle a été fermée il y a des
années. Ce qui reste (Uber Direct, Uber for Business) sert à la livraison et
aux comptes entreprise. La seule voie serait d'aspirer leur application : ça
viole leurs conditions, ça casse à chaque mise à jour de leur côté, et ça fait
dépendre le prix d'Asmine d'un concurrent qui peut couper du jour au lendemain.

**Un prix indexé sur un tarif variable est en plus contraire à la règle VTC** :
le prix doit être ferme et connu avant le départ.

Afficher la position de vrais chauffeurs disponibles reste possible — mais avec
**ses** chauffeurs, et cela demande un serveur. C'est déjà sur la feuille de
route.

---

## Pour reprendre

```bash
git checkout claude/as-mine-booking-app-yqvxoi
npx http-server -p 8099 -s .
mkdir -p node_modules && ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright
node test.mjs && node test2.mjs && node test3.mjs && node test4.mjs \
  && node test5.mjs && node test6.mjs && node test7.mjs && node test8.mjs
```

Publier, une fois validé : ouvrir la pull request vers `main` **et la fusionner**.
Sans la fusion, rien ne change en ligne.
