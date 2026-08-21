# Ajouter un nouveau site

Chaque sous-dossier de `sites/` est un **site indépendant**, publié à sa propre
adresse. En créer un ne touche ni les autres, ni As-mine.

| Dossier | Adresse publiée |
|---|---|
| *(racine du dépôt)* | https://barbaros911.github.io/As-mine/ — **As-mine, à ne pas toucher** |
| `sites/mon-site/` | https://barbaros911.github.io/As-mine/mon-site/ |
| *(construite toute seule)* | https://barbaros911.github.io/As-mine/demos/ — la liste des sites |

## En trois étapes

1. Copier le dossier `sites/_modele/` et lui donner le nom du nouveau site
   (lettres minuscules et tirets : `sites/mon-site/`, pas `sites/Mon Site/`).
2. Modifier le `index.html` qu'il contient. Tout ce que le site utilise —
   images, feuilles de style, scripts — doit rester **dans son dossier**, et
   être appelé par un chemin relatif (`./photo.jpg`), jamais par un chemin
   absolu (`/photo.jpg`), qui pointerait en dehors du site.
3. Pousser sur `main`. La publication et la mise à jour de la liste sont
   automatiques.

## Conventions

- Un dossier dont le nom commence par `_` est un **modèle interne** : il n'est
  ni publié, ni listé. C'est le cas de `sites/_modele/`.
- La page `/demos/` est **reconstruite à chaque publication** à partir du titre
  et de la description de chaque site. Elle ne se modifie pas à la main.
- Les sites d'exemple portent `<meta name="robots" content="noindex, nofollow">`
  pour qu'une démonstration ne soit pas prise par Google pour une vraie
  entreprise. **Retirer cette ligne le jour où un site devient réel.**

## Ce qui protège As-mine et les sites déjà en ligne

- Chaque site vit dans son dossier : modifier ou supprimer l'un n'a aucun effet
  sur les autres.
- La racine est copiée **avant** les sites, donc aucun site ne peut écraser un
  fichier d'As-mine.
- Un dossier qui porterait le nom d'un fichier d'As-mine (`index.html`,
  `sw.js`, `sitemap.xml`…) ou de la galerie (`demos`) fait échouer la
  publication avec un message clair, au lieu de passer en silence.
- Le service worker d'As-mine ignore les autres sites : il ne met pas leurs
  pages en cache et ne leur substitue jamais la sienne hors ligne.
