#!/bin/sh
set -e

rm -rf site
mkdir -p site

# Application complète historique : elle reste disponible pour la réservation,
# les liens EasyHotel et l'espace exploitant.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png icon-512.png \
   brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml \
   seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js \
   chauffeur-prive-paris.html transfert-cdg-paris.html \
   transfert-orly-paris.html site/

# Les règles EasyHotel restent appliquées à l'application fonctionnelle.
node .github/scripts/appliquer-regles-easyhotel.mjs site/index.html

# SÉCURITÉ : le client public dépose via une passerelle serveur ; l'ancien
# INSERT anonyme reste encore ouvert en base pendant la phase de validation.
node .github/scripts/public-booking-gateway.mjs site/index.html

# SÉCURITÉ : authentification serveur puis séparation des rôles.
node .github/scripts/harden-exploitant-auth.mjs site/index.html
node .github/scripts/agent-role-ui.mjs site/index.html

# La façade et la réservation ne forment plus deux pages différentes.
python3 - <<'PY'
from pathlib import Path
page = Path("site/index.html")
html = page.read_text(encoding="utf-8")
facade = '<link rel="stylesheet" href="/application-facade.css">'
hotel_css = '<link rel="stylesheet" href="/hotel-engine-polish.css">'
hotel_js = '<script src="/hotel-engine-polish.js" defer></script>'
html = html.replace("</head>", facade + hotel_css + hotel_js + "</head>", 1)
html = html.replace('<img class="logo-image" src="brand-logo-white.png"','<img class="logo-image" src="brand-logo.webp"',1)
page.write_text(html, encoding="utf-8")
PY
cp site/index.html site/application.html

# SEO, identité ELA et logo officiel de la façade publique.
node .github/scripts/seo-ela.mjs site/index.html

cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true

touch site/.nojekyll

if [ -d sites ]; then
  reserves="index.html application.html admin.html styles.css seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html demos _headers carte exploitant"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    case "$nom" in
      _*) echo "Ignoré : $nom (modèle interne)"; continue;;
      as-mine-transport) echo "Ignoré : $nom (ancienne maquette non publiée)"; continue;;
    esac
    for reserve in $reserves; do
      if [ "$nom" = "$reserve" ]; then echo "ERREUR : le dossier sites/$nom porte le nom d'un fichier réservé." >&2; exit 1; fi
    done
    echo "Publication du site « $nom » sur /$nom/"
    cp -r "$dossier" "site/$nom"
  done
fi

node .github/scripts/galerie.mjs

echo "site/ construit : $(find site -type f | wc -l) fichiers"
