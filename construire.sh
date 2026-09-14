#!/bin/sh
set -e

rm -rf site
mkdir -p site

# Application complète historique : elle reste disponible pour la réservation,
# les liens EasyHotel et l'espace exploitant.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png icon-512.png \
   brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml \
   seo-pages.css \
   chauffeur-prive-paris.html transfert-cdg-paris.html \
   transfert-orly-paris.html site/

# Les règles EasyHotel restent appliquées à l'application fonctionnelle.
node .github/scripts/appliquer-regles-easyhotel.mjs site/index.html

# On conserve cette application sous une adresse dédiée avant de publier la
# nouvelle façade validée à la racine du domaine.
mv site/index.html site/application.html

# Les anciens favoris exploitant doivent ouvrir l'interface admin publiée et
# non l'ancien tableau de bord embarqué dans l'application historique.
python3 - <<'PY'
from pathlib import Path

page = Path("site/application.html")
html = page.read_text(encoding="utf-8")
redirect = '''<script>
(function(){
  var p=new URLSearchParams(location.search);
  if(p.get("exploitant")==="1") location.replace("/ela-admin/");
}());
</script>'''
html = html.replace("<head>", "<head>" + redirect, 1)
page.write_text(html, encoding="utf-8")
PY
cp sites/ela-public/index.html site/index.html

# SEO, identité ELA et logo officiel de la façade publique.
node .github/scripts/seo-ela.mjs site/index.html

cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true

touch site/.nojekyll

# Sites vitrines et aperçus séparés.
if [ -d sites ]; then
  reserves="index.html application.html admin.html styles.css seo-pages.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html demos _headers carte exploitant"
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

# Les quatre interfaces validées dans sites/ sont les façades publiées.
# Leurs actions renvoient vers l'application fonctionnelle avec le bon mode ;
# ne pas les remplacer par les anciennes pages de redirection au build.

node .github/scripts/galerie.mjs

echo "site/ construit : $(find site -type f | wc -l) fichiers"
