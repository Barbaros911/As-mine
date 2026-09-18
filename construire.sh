#!/bin/sh
set -e
rm -rf site
mkdir -p site
cp index.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js intake-demande.js qr-affiche.js itineraire-partage.js manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml \
   seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html site/
node .github/scripts/appliquer-regles-easyhotel.mjs site/index.html
node .github/scripts/public-booking-gateway.mjs site/index.html
node .github/scripts/harden-exploitant-auth.mjs site/index.html
node .github/scripts/agent-role-ui.mjs site/index.html
python3 - <<'PY'
from pathlib import Path
page=Path('site/index.html'); html=page.read_text(encoding='utf-8')
html=html.replace('</head>','<link rel="stylesheet" href="/application-facade.css"><link rel="stylesheet" href="/hotel-engine-polish.css"><script src="/hotel-engine-polish.js" defer></script></head>',1)
html=html.replace('<img class="logo-image" src="brand-logo-white.png"','<img class="logo-image" src="brand-logo.webp"',1)
page.write_text(html,encoding='utf-8')
admin=Path('site/admin-v2.html'); a=admin.read_text(encoding='utf-8')
# intake-demande.js EN PREMIER : admin-v2-actions.js l'appelle, et un
# navigateur exécute les scripts dans l'ordre où ils sont déclarés.
for script in ('/intake-demande.js','/qr-affiche.js','/itineraire-partage.js','/admin-v2-actions.js','/admin-v2-push.js','/admin-v2-finance.js','/admin-v2-registre.js','/admin-v2-factures.js','/admin-v2-gestes.js','/admin-v2-affiche.js'):
    tag=f'<script src="{script}"></script>'
    if tag not in a:a=a.replace('</body>',tag+'</body>',1)
admin.write_text(a,encoding='utf-8')
PY
cp site/index.html site/application.html
node .github/scripts/seo-ela.mjs site/index.html
cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r carte site/carte
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true
touch site/.nojekyll
if [ -d sites ]; then
  reserves="index.html application.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js intake-demande.js qr-affiche.js itineraire-partage.js styles.css seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-white.png robots.txt sitemap.xml chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html demos _headers carte exploitant"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    case "$nom" in _*) echo "Ignoré : $nom (modèle interne)"; continue;; as-mine-transport) echo "Ignoré : $nom (ancienne maquette non publiée)"; continue;; esac
    for reserve in $reserves; do if [ "$nom" = "$reserve" ]; then echo "ERREUR : le dossier sites/$nom porte le nom d'un fichier réservé." >&2; exit 1; fi; done
    echo "Publication du site « $nom » sur /$nom/"; cp -r "$dossier" "site/$nom"
  done
fi
node .github/scripts/galerie.mjs
echo "site/ construit : $(find site -type f | wc -l) fichiers"
