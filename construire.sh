#!/bin/sh
# =====================================================================
# CONSTRUCTION DU SITE PUBLIÉ
# ---------------------------------------------------------------------
# Assemble le dossier « site/ » à partir du dépôt. C'est CE script que
# GitHub Actions et Cloudflare Pages appellent tous les deux : une seule
# source de vérité. Deux recettes séparées finiraient par diverger, et
# on s'en apercevrait le jour où l'une publie un fichier que l'autre a
# oublié.
#
# Usage :  sh construire.sh
# Résultat : un dossier « site/ » prêt à être servi tel quel.
# =====================================================================
set -e

rm -rf site
mkdir -p site

# ---- L'application de réservation -----------------------------------
# La liste est EXPLICITE, et c'est voulu : rien ne part en ligne sans
# avoir été nommé ici. Un « cp * » publierait un jour les fichiers de
# test, les notes de travail, ou le classeur de suivi.
cp index.html admin.html styles.css manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml site/

# LE NOUVEAU SITE, publié à son adresse provisoire pendant sa construction.
# Barbaros le suit sur son téléphone à chaque étape. Il porte « noindex » :
# tant que deux pages coexistent sur le domaine, Google les indexerait toutes
# les deux et elles se concurrenceraient sur les mêmes recherches.
# Le jour où il prend la racine, cette ligne disparaît avec le fichier.
[ -f nouveau.html ] && cp nouveau.html site/ || true

# Le domaine personnalisé. GitHub Pages l'oublie à chaque déploiement
# sans ce fichier. Cloudflare l'ignore — il ne gêne pas.
cp CNAME site/

# Les en-têtes de sécurité, lus par Cloudflare Pages. Sans effet sur
# GitHub Pages, qui ne sait pas définir d'en-têtes : c'est justement
# l'une des raisons du changement d'hébergeur.
[ -f _headers ] && cp _headers site/ || true

# Les photos des offres. « -d » plutôt qu'un copier sec : la publication
# ne doit pas casser selon que le dossier existe ou non.
[ -d photos ] && cp -r photos site/photos || true

# Empêche Jekyll de réinterpréter les fichiers (GitHub Pages).
touch site/.nojekyll

# ---- Les sites vitrines des commerçants ------------------------------
# Chaque dossier de « sites/ » devient un site indépendant, publié à
# l'adresse .../<nom>/. La racine est copiée AVANT, et rien ici ne peut
# l'écraser : un dossier portant le nom d'un de ses fichiers fait
# échouer la construction plutôt que de remplacer le site principal.
if [ -d sites ]; then
  reserves="index.html admin.html styles.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml demos _headers"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    # Un dossier préfixé « _ » est un modèle interne : ni publié, ni listé.
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
