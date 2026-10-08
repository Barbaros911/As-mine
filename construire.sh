#!/bin/sh
set -e
rm -rf site
mkdir -p site
cp index.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js admin-v2-responsive.css admin-v2-maquette.js telephone.js bon-client.js intake-demande.js qr-affiche.js itineraire-partage.js admin-sante.js pilotage.js pilotage-ecran.js pilotage.css manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-32.png icon-32.png icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-negatif.webp brand-logo-white.png robots.txt sitemap.xml \
   seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html site/
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
a=a.replace('</head>','<link rel="stylesheet" href="/admin-v2-responsive.css"></head>',1)
# telephone.js PUIS intake-demande.js EN PREMIER : le second appelle le
# premier, admin-v2-actions.js appelle le second, et un
# navigateur exécute les scripts dans l'ordre où ils sont déclarés.
for script in ('/telephone.js','/intake-demande.js','/qr-affiche.js','/itineraire-partage.js','/admin-v2-actions.js','/admin-v2-push.js','/admin-v2-finance.js','/admin-v2-registre.js','/admin-v2-factures.js','/admin-v2-gestes.js','/admin-v2-affiche.js','/admin-v2-maquette.js'):
    tag=f'<script src="{script}"></script>'
    if tag not in a:a=a.replace('</body>',tag+'</body>',1)
admin.write_text(a,encoding='utf-8')
PY
node .github/scripts/seo-ela.mjs site/index.html
cp manifest-exploitant.webmanifest site/
cp -r exploitant site/exploitant
cp -r professionnels site/professionnels
cp -r carte site/carte
cp -r icones site/icones
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
[ -d photos ] && cp -r photos site/photos || true
touch site/.nojekyll
if [ -d sites ]; then
  reserves="index.html application.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js admin-v2-responsive.css admin-v2-maquette.js telephone.js bon-client.js intake-demande.js qr-affiche.js itineraire-partage.js admin-sante.js pilotage.js pilotage-ecran.js pilotage.css styles.css seo-pages.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png icon-512.png brand-logo.svg brand-logo.webp brand-logo-negatif.webp brand-logo-white.png robots.txt sitemap.xml chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html demos _headers carte icones exploitant reception professionnels demo"
  for dossier in sites/*/; do
    [ -d "$dossier" ] || continue
    nom=$(basename "$dossier")
    case "$nom" in
      _*) echo "Ignoré : $nom (modèle interne)"; continue;;
    esac
    for reserve in $reserves; do if [ "$nom" = "$reserve" ]; then echo "ERREUR : le dossier sites/$nom porte le nom d'un fichier réservé." >&2; exit 1; fi; done
    echo "Publication du site « $nom » sur /$nom/"; cp -r "$dossier" "site/$nom"
  done
fi
node .github/scripts/construire-espaces-hotel.mjs site/index.html site
node .github/scripts/galerie.mjs

# LES COMMENTAIRES DE TRAVAIL NE PARTENT JAMAIS EN LIGNE — septembre 2026.
# index.html seul en portait 145 (~68 Ko) : la mémoire du projet, utile aux
# prochaines sessions, mais lisible par n'importe qui via « Afficher le code
# source » une fois le site publié — sécurité de l'espace exploitant,
# anciennes failles corrigées, grille tarifaire hôtel. Cette étape les
# retire de la copie posée dans site/, jamais du dépôt : elle s'exécute en
# DERNIER, sur ce que construire.sh vient d'assembler, pour ne rien laisser
# passer d'une étape précédente.
# L'ADMIN ET LA RÉCEPTION Y SONT DEPUIS LE 4 OCTOBRE 2026. Ces pages sont
# fabriquées par construire-espaces-hotel.mjs, ajouté après cette étape, et
# personne ne les avait ajoutées ici : /ela-admin/ partait en ligne avec 841
# blocs de commentaires — comment l'espace est protégé, ses anciennes
# failles. La règle valait pour la page publique seulement.
# test-nouveau-bascule vérifie qu'aucune page ELA publiée n'en porte plus.
# LES FEUILLES DE STYLE ET « robots.txt » AUSSI (4 octobre 2026) :
# « hotel-engine-polish.css » publiait 23 blocs de notes, et « robots.txt »
# expliquait que ?h= donne des forfaits plus bas que le site. « site/*.css »
# est un motif, pas une liste : une feuille ajoutée demain est prise d'office.
# « carte/ » (Leaflet) n'est pas visé : sa licence doit rester avec lui.
# « _headers » non plus : Cloudflare le lit, et un réglage qu'on ne peut pas
# éprouver d'ici garde son défaut.
node .github/scripts/masquer-commentaires.mjs \
  site/index.html site/application.html site/admin.html site/admin-v2.html \
  site/telephone.js site/bon-client.js site/intake-demande.js site/qr-affiche.js site/itineraire-partage.js site/admin-sante.js site/pilotage.js site/pilotage-ecran.js \
  site/hotel-engine-polish.js site/sw.js \
  site/admin-v2-actions.js site/admin-v2-push.js site/admin-v2-finance.js \
  site/admin-v2-registre.js site/admin-v2-factures.js site/admin-v2-gestes.js \
  site/admin-v2-affiche.js site/admin-v2-maquette.js \
  site/ela-admin/index.html site/exploitant/index.html \
  site/easyhotel-reception/index.html site/reception/*/index.html \
  site/easyhotel-client/index.html site/professionnels/index.html \
  site/*.css site/robots.txt

# ADMIN V2 N'EST PLUS PUBLIÉ — 3 octobre 2026, à la demande de Barbaros
# (« retire »). Il travaille seul, dans l'admin historique (/ela-admin/) ;
# un second espace en ligne, c'était une porte de plus vers les données des
# clients et une seconde adresse où se tromper d'outil à 5 h du matin.
# LE CODE RESTE DANS LE DÉPÔT, et ses suites continuent de tourner : il
# porte la tarification serveur, les partenaires et la règle des papiers
# imposée par le serveur — le jour où Barbaros le redemande, rien n'est à
# réécrire. On ne retire que ce qui part EN LIGNE.
# LE RETRAIT EST LA RÈGLE PAR DÉFAUT, ET C'EST TOUT LE POINT. Premier jet :
# un drapeau à poser pour retirer (ELA_PUBLICATION=1, dans pages.yml). Or
# elatransfer.com est servi par CLOUDFLARE (Workers Builds, projet
# « as-mine »), dont la commande de construction se règle dans SON tableau
# de bord, hors du dépôt et invisible d'ici : Admin v2 serait resté en
# ligne sur le vrai domaine sans que rien ne le dise. Désormais toute
# construction le retire ; seules les suites qui l'éprouvent le demandent
# (ELA_AVEC_ADMIN_V2=1). Un oubli ne peut plus que retirer, jamais publier.
# L'ANCIENNE ADRESSE NE REND PAS UN 404 : une icône posée sur un téléphone
# ou un lien gardé ramène à l'admin, exactement comme admin.html — c'est
# le même fichier, donc la même redirection et le même manifeste.
if [ "${ELA_AVEC_ADMIN_V2:-}" != "1" ]; then
  rm -f site/admin-v2-*.js site/admin-v2-responsive.css
  cp site/admin.html site/admin-v2.html
  echo "Admin v2 retiré : /admin-v2.html renvoie vers /ela-admin/"
fi

echo "site/ construit : $(find site -type f | wc -l) fichiers"
