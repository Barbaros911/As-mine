#!/bin/sh
set -e

rm -rf site
mkdir -p site

# Application complète historique : elle reste disponible pour la réservation,
# les liens EasyHotel et l'espace exploitant.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml site/

# Les règles EasyHotel restent appliquées à l'application fonctionnelle.
node .github/scripts/appliquer-regles-easyhotel.mjs site/index.html

# On conserve cette application sous une adresse dédiée avant de publier la
# nouvelle façade validée à la racine du domaine.
mv site/index.html site/application.html
cp application-role-theme.css site/
# Le thème externe ne touche pas à la logique métier : il ne fait que finir
# les quatre rôles réels (client, hôtel, réception, exploitant).
python3 - <<'PY'
from pathlib import Path
p = Path('site/application.html')
s = p.read_text(encoding='utf-8')
link = '<link rel="stylesheet" href="application-role-theme.css">'
if link not in s:
    s = s.replace('</head>', link + '\n</head>', 1)
p.write_text(s, encoding='utf-8')
PY
cp sites/ela-public/index.html site/index.html

cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true

touch site/.nojekyll

# Sites vitrines et aperçus séparés.
if [ -d sites ]; then
  reserves="index.html application.html application-role-theme.css admin.html styles.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml demos _headers carte exploitant"
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
