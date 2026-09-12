#!/bin/sh
# =====================================================================
# CONSTRUCTION DU SITE PUBLIÉ
# ---------------------------------------------------------------------
# Assemble le dossier « site/ » à partir du dépôt. C'est CE script que
# GitHub Actions et Cloudflare Pages appellent tous les deux : une seule
# source de vérité. Deux recettes séparées finiraient toujours par diverger,
# et on s'en apercevrait le jour où l'une publie un fichier que l'autre a
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
# « styles.css » est parti avec l'ancien site : le nouveau porte ses styles
# dans la page. Le publier encore aurait laissé traîner une feuille que plus
# rien ne lit, et que le service worker aurait continué de mettre en cache.
cp index.html admin.html manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml site/

# LE MANIFESTE DE L'ESPACE EXPLOITANT. Sans lui, une icône posée sur l'écran
# d'accueil depuis « ?exploitant=1 » rouvrirait le SITE CLIENT : le manifeste
# ordinaire déclare « start_url: ./ », et c'est lui que le téléphone lit.
# Même point de rupture que « carte/ » — oublié ici, il marche en local et
# reste introuvable en ligne.
cp manifest-exploitant.webmanifest site/

# L'ADRESSE DE L'EXPLOITANT, EN CLAIR : « /exploitant/ ». C'est celle qu'il
# retient et qu'il tape ; « /admin.html » demandait de se rappeler une
# extension de fichier. Les deux mènent au même endroit — l'ancienne reste
# valide, des liens sont déjà partis avec.
# MÊME POINT DE RUPTURE QUE « carte/ » : oubliée ici, l'adresse marche en
# local, où le serveur de test sert tout le dépôt, et rend un 404 en ligne.
cp -r exploitant site/exploitant

# LA BIBLIOTHÈQUE DE CARTE, SERVIE PAR LE SITE LUI-MÊME. Elle venait d'un
# CDN ; Barbaros ne voyait pas la carte s'afficher, et une minuterie de 5 s
# coupait un chargement qui allait aboutir sur un téléphone en 4G.
# CETTE LIGNE EST LE POINT DE RUPTURE : sans elle, la carte fonctionne
# parfaitement en local — où le serveur de test sert tout le dépôt — et reste
# introuvable en ligne, où seul ce qui est nommé ici existe. Un contrôle de
# « test-nouveau-bascule.mjs » vérifie que le fichier est bien dans la liste.
cp -r carte site/carte

# LA PAGE TARIFS DU QR EASYHOTEL. Elle est séparée de l'espace réception :
# le client voit uniquement la grille publique et le bouton de réservation.
[ -d tarifs-easyhotel-aeroville ] && cp -r tarifs-easyhotel-aeroville site/tarifs-easyhotel-aeroville || true

# L'ANCIEN SITE N'EST PLUS PUBLIÉ, et ce n'est pas un oubli. Le garder en
# ligne « au cas où » laisserait une page trouvable — par un lien partagé,
# un signet, un résultat de recherche — qui annonce une GRILLE DE PRIX
# PÉRIMÉE. Chez Elatransfer le prix est ferme : un client qui réserve sur
# l'ancienne grille a un prix opposable. Le retour en arrière ne passe donc
# pas par une page de secours mais par « git revert » de la bascule, où le
# code entier est conservé.

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
  reserves="index.html admin.html styles.css photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png robots.txt sitemap.xml demos _headers carte exploitant tarifs-easyhotel-aeroville"
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
