#!/bin/sh
# =====================================================================
# CONSTRUCTION DU SITE PUBLIÉ
# ---------------------------------------------------------------------
# Assemble le dossier « site/ » à partir du dépôt. C'est CE script que
# GitHub Actions et Cloudflare Pages appellent tous les deux : une seule
# source de vérité. Deux recettes séparées finiraient toujours par diverger.
#
# Usage :  sh construire.sh
# Résultat : un dossier « site/ » prêt à être servi tel quel.
# =====================================================================
set -e

rm -rf site
mkdir -p site

# ---- L'application de réservation -----------------------------------
# La liste est EXPLICITE, et c'est voulu : rien ne part en ligne sans
# avoir été nommé ici.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml site/

cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte

# La page tarifaire destinée au QR du flyer easyHotel. Elle reste séparée
# de l'espace réception : les clients voient les prix et réservent, jamais
# l'historique du comptoir.
[ -d tarifs-easyhotel-aeroville ] && cp -r tarifs-easyhotel-aeroville site/tarifs-easyhotel-aeroville || true

# Le domaine personnalisé. GitHub Pages l'oublie à chaque déploiement
# sans ce fichier. Cloudflare l'ignore — il ne gêne pas.
cp CNAME site/

# Les en-têtes de sécurité, lus par Cloudflare Pages.
[ -f _headers ] && cp _headers site/ || true

# Les photos des offres.
[ -d photos ] && cp -r photos site/photos || true

# Empêche Jekyll de réinterpréter les fichiers (GitHub Pages).
touch site/.nojekyll

# ---- Les sites vitrines des commerçants ------------------------------
if [ -d sites ]; then
  reserves="index.html admin.html styles.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml demos _headers carte exploitant tarifs-easyhotel-aeroville"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    case "$nom" in _*) echo "Ignoré : $nom (modèle interne)"; continue;; esac
    for reserve in $reserves; do
      if [ "$nom" = "$reserve" ]; then
        echo "ERREUR : le dossier sites/$nom porte le nom d'un fichier d'Asmine." >&2
        echo "Renommez-le : il écraserait le site principal." >&2
        exit 1
      fi
    done
    echo "Publication du site « $nom » sur /$nom/"
    cp -r "$dossier" "site/$nom"
  done
fi

# ---- La galerie des démonstrations -----------------------------------
node .github/scripts/galerie.mjs

echo "site/ construit : $(find site -type f | wc -l) fichiers"
