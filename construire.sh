#!/bin/sh
set -e

rm -rf site
mkdir -p site

# L'application complète reste la page publique réelle : le client doit pouvoir
# réserver directement sur elatransfer.com, et Google doit indexer cette page
# fonctionnelle plutôt qu'une maquette statique.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml site/

# Les règles easyHotel restent appliquées à l'application fonctionnelle.
node .github/scripts/appliquer-regles-easyhotel.mjs site/index.html

# Le thème visuel des quatre rôles est injecté sur la vraie application.
cp application-role-theme.css site/
python3 - <<'PY'
from pathlib import Path
link = '<link rel="stylesheet" href="application-role-theme.css">'
for nom in ('index.html',):
    p = Path('site') / nom
    s = p.read_text(encoding='utf-8')
    if link not in s:
        s = s.replace('</head>', link + '\n</head>', 1)
    p.write_text(s, encoding='utf-8')
PY

# Compatibilité avec les anciens liens /application.html sans créer un second
# moteur : c'est une copie construite du même fichier et elle reste noindex via
# robots.txt. La racine demeure l'URL canonique et l'entrée normale du client.
cp site/index.html site/application.html

cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte
[ -d paris ] && cp -r paris site/paris
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true

touch site/.nojekyll

# Sites vitrines et aperçus séparés : les maquettes restent consultables dans
# leurs sous-dossiers mais ne remplacent jamais la vraie page d'accueil.
if [ -d sites ]; then
  reserves="index.html application.html application-role-theme.css admin.html styles.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml demos _headers carte exploitant paris"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    case "$nom" in _*) echo "Ignoré : $nom (modèle interne)"; continue;; esac
    for reserve in $reserves; do
      if [ "$nom" = "$reserve" ]; then
        echo "ERREUR : le dossier sites/$nom porte le nom d'un fichier réservé." >&2
        exit 1
      fi
    done
    echo "Publication du site « $nom » sur /$nom/"
    cp -r "$dossier" "site/$nom"
  done
fi

node .github/scripts/galerie.mjs

echo "site/ construit : $(find site -type f | wc -l) fichiers"
