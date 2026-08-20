# Ajouter un nouveau site

Chaque sous-dossier de `sites/` est un **site indépendant**. Il est publié tout
seul, à côté d'As-mine, sans jamais la modifier.

| Dossier | Adresse publiée |
|---|---|
| *(racine du dépôt)* | https://barbaros911.github.io/As-mine/ — **As-mine, à ne pas toucher** |
| `sites/modele/` | https://barbaros911.github.io/As-mine/modele/ |
| `sites/mon-site/` | https://barbaros911.github.io/As-mine/mon-site/ |

## En trois étapes

1. Copier le dossier `sites/modele/` et lui donner le nom du nouveau site
   (lettres minuscules et tirets : `sites/mon-site/`, pas `sites/Mon Site/`).
2. Modifier le `index.html` qu'il contient. Tout ce que le site utilise —
   images, feuilles de style, scripts — doit rester **dans son dossier**, et
   être appelé par un chemin relatif (`./photo.jpg`), jamais par un chemin
   absolu (`/photo.jpg`), qui pointerait en dehors du site.
3. Pousser sur `main`. La publication est automatique.

## Ce qui protège As-mine

- La racine est copiée en premier, puis les sites ; **aucun site ne peut
  écraser un fichier d'As-mine**.
- Un dossier qui porterait le nom d'un fichier d'As-mine (`index.html`,
  `sw.js`, `sitemap.xml`…) fait échouer la publication avec un message clair,
  au lieu de passer en silence.
- Supprimer un dossier de `sites/` retire ce site seul. As-mine n'en dépend
  pas.
