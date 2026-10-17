# Le dossier `sites/`

> **Relu le 17 octobre 2026.** Depuis le 4 octobre 2026, les sites de clients
> (vitrines de commerçants) **ne vivent plus dans ce dépôt**, à la demande de
> Barbaros (`PROJECT_STATE.md`). `sites/` ne porte plus que des entrées
> d'Elatransfer — `easyhotel-client/`, et trois redirections que `construire.sh`
> remplace par les vrais espaces (`ela-admin/`, `ela-public/`,
> `easyhotel-reception/`). Le reste de
> ce fichier décrit le mécanisme, toujours en place ; n'y ajouter un site de
> client que si Barbaros le redemande (`memoire/sites-vitrines.md`).

Chaque sous-dossier de `sites/` est publié à sa propre adresse. En créer un ne
touche ni les autres, ni le site de réservation.

| Dossier | Adresse publiée |
|---|---|
| *(racine du dépôt)* | https://elatransfer.com/ — **le site de réservation, à ne pas toucher** |
| `sites/mon-site/` | https://elatransfer.com/mon-site/ |
| *(construite toute seule)* | https://elatransfer.com/demos/ — la galerie « Démonstrations » |

## En trois étapes

1. Copier le dossier `sites/_modele/` et lui donner le nom du nouveau site
   (lettres minuscules et tirets : `sites/mon-site/`, pas `sites/Mon Site/`).
2. Modifier le `index.html` qu'il contient. Tout ce que le site utilise —
   images, feuilles de style, scripts — doit rester **dans son dossier**, et
   être appelé par un chemin relatif (`./photo.jpg`), jamais par un chemin
   absolu (`/photo.jpg`), qui pointerait en dehors du site.
3. Ouvrir une pull request vers `main` (on ne pousse jamais directement sur
   `main`, protégée). Une fois fusionnée, la publication et la mise à jour de
   la liste sont automatiques.

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
