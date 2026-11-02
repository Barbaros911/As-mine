#!/bin/sh
set -e
rm -rf site
mkdir -p site
cp index.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js admin-v2-responsive.css admin-v2-maquette.js textes.js config.js telephone.js bon-client.js intake-demande.js qr-affiche.js itineraire-partage.js prix.js admin-sante.js pilotage.js pilotage-ecran.js pilotage.css prospects.js prospects.css trafic.js trafic.css mesure.js manifest.webmanifest sw.js \
   icon.svg icon-maskable.svg icon-32.png icon-180.png icon-512.png icone-ela-32.png icone-ela-180.png icone-ela-512.png favicon.ico brand-logo.svg brand-logo.webp brand-logo-negatif.webp brand-logo-white.png robots.txt sitemap.xml \
   seo-pages.css landing.css application-facade.css hotel-engine-polish.css hotel-engine-polish.js chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html 404.html site/
# LES DEUX ADRESSES QUE NAVIGATEURS ET MOTEURS DEMANDENT D'OFFICE (15/10/2026).
# Safari cherche /apple-touch-icon.png, Google et les navigateurs /favicon.ico,
# même sur une page qui déclare son icône. Absentes, elles tombaient sur la
# règle « single-page-application » de Cloudflare : une page HTML au lieu
# d'une image, et Safari gardait l'icône de septembre. Une COPIE, jamais un
# second dessin : le logo ne bouge pas (test-nouveau-bascule).
cp icon-180.png site/apple-touch-icon.png
# LE FORFAIT DES PAGES CDG ET ORLY (1er novembre 2026) : relu au serveur
# au chargement ; sans lui, les pages gardent les montants de repli.
cp prix-forfaits.js site/
node .github/scripts/public-booking-gateway.mjs site/index.html
node .github/scripts/harden-exploitant-auth.mjs site/index.html
node .github/scripts/agent-role-ui.mjs site/index.html
# QUEL COMMIT EST DANS LA PAGE (1er novembre 2026, audit). version.json dit ce
# que l'hébergeur sert ; la page, elle, ne savait pas d'où elle venait : une
# erreur remontée par « erreur-client » pouvait venir d'une copie gardée en
# cache depuis trois mises en ligne, sans qu'on puisse le voir. La balise
# « ela-version » (commit court et cache du service worker) est posée ICI,
# avant la construction des espaces d'hôtel qui partent de cette page : elle
# est donc dans le site public, les pages d'hôtel, la réception et l'admin.
# Les deux valeurs sont celles de version.json, calculées une seule fois.
commit="${GITHUB_SHA:-${WORKERS_CI_COMMIT_SHA:-${CF_PAGES_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo inconnu)}}}"
cache=$(sed -n 's/^const CACHE = "\([^"]*\)";.*/\1/p' sw.js)
export ELA_VERSION_PAGE="$(printf '%s' "$commit" | cut -c1-7)·$cache"
python3 - <<'PY'
from pathlib import Path
import os
page=Path('site/index.html'); html=page.read_text(encoding='utf-8')
html=html.replace('</head>','<link rel="stylesheet" href="/application-facade.css"><link rel="stylesheet" href="/hotel-engine-polish.css"><script src="/hotel-engine-polish.js" defer></script></head>',1)
html=html.replace('<meta name="viewport"','<meta name="ela-version" content="'+os.environ['ELA_VERSION_PAGE']+'"><meta name="viewport"',1)
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
# LES PAGES ANGLAISES (14 octobre 2026, SEO international) : un dossier par
# page, servi « /en/<page>/ » sans redirection (mesuré sur le moteur
# d'hébergement de Cloudflare). Oubliées ici, elles marcheraient en local et
# manqueraient en ligne : test-seo-en lit le site CONSTRUIT.
cp -r en site/en
cp -r carte site/carte
cp -r icones site/icones
cp CNAME site/
[ -f _headers ] && cp _headers site/ || true
# LA VRAIE 404 (18 octobre 2026) : 404.html est copié avec les pages, et
# _redirects renvoie les seules anciennes adresses connues (wrangler.jsonc).
cp _redirects site/
[ -d photos ] && cp -r photos site/photos || true
touch site/.nojekyll
if [ -d sites ]; then
  reserves="index.html application.html admin.html admin-v2.html admin-v2-actions.js admin-v2-push.js admin-v2-finance.js admin-v2-registre.js admin-v2-factures.js admin-v2-gestes.js admin-v2-affiche.js admin-v2-responsive.css admin-v2-maquette.js textes.js config.js telephone.js bon-client.js intake-demande.js qr-affiche.js itineraire-partage.js prix.js admin-sante.js pilotage.js pilotage-ecran.js pilotage.css prospects.js prospects.css trafic.js trafic.css styles.css seo-pages.css landing.css mesure.js application-facade.css hotel-engine-polish.css hotel-engine-polish.js photos CNAME manifest.webmanifest sw.js icon.svg icon-maskable.svg icon-180.png icon-512.png icone-ela-32.png icone-ela-180.png icone-ela-512.png favicon.ico apple-touch-icon.png brand-logo.svg brand-logo.webp brand-logo-negatif.webp brand-logo-white.png robots.txt sitemap.xml chauffeur-prive-paris.html transfert-cdg-paris.html transfert-orly-paris.html 404.html _redirects demos _headers carte icones exploitant reception professionnels demo en"
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
# LA DÉMO DES PROFESSIONNELS (/demo/hotel/, octobre 2026) : tirée des deux
# pages qu'on vient de construire, sans aucune couche serveur. Elle est
# vérifiée tout en bas, APRÈS le retrait des commentaires.
node .github/scripts/construire-demo.mjs site
node .github/scripts/galerie.mjs
# LA NOTE GOOGLE (18 octobre 2026) : une seule source, avis-google.json,
# qui n'est pas publié. Posée ici sur toutes les pages déjà assemblées, avant
# le retrait des commentaires ; éteinte, sans jamais bloquer la publication,
# si le relevé a plus de 60 jours (voir le script).
node .github/scripts/avis-google.mjs site
# « ELATRANSFER EN CHIFFRES » (23 octobre 2026) : même principe, une seule
# source, chiffres.json, qui n'est pas publiée. Tant que « afficher » n'est pas
# à true, ou qu'aucun chiffre n'a sa source, le bloc est retiré ; la
# publication continue toujours.
node .github/scripts/chiffres.mjs site

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
  site/textes.js site/config.js site/telephone.js site/bon-client.js site/intake-demande.js site/qr-affiche.js site/itineraire-partage.js site/prix.js site/admin-sante.js site/pilotage.js site/pilotage-ecran.js site/prospects.js site/trafic.js site/mesure.js \
  site/hotel-engine-polish.js site/sw.js \
  site/admin-v2-actions.js site/admin-v2-push.js site/admin-v2-finance.js \
  site/admin-v2-registre.js site/admin-v2-factures.js site/admin-v2-gestes.js \
  site/admin-v2-affiche.js site/admin-v2-maquette.js \
  site/ela-admin/index.html site/exploitant/index.html \
  site/easyhotel-reception/index.html site/reception/*/index.html \
  site/easyhotel-client/index.html site/professionnels/index.html \
  site/demo/hotel/index.html site/demo/hotel/reception/index.html \
  site/demo/demo-simulateur.js site/demo/bon-client.js site/demo/demo.css \
  site/mesure.js site/en/index.html site/en/*/index.html site/404.html site/en/404.html \
  site/prix-forfaits.js \
  site/*.css site/robots.txt

# LA DÉMO NE DOIT RIEN POUVOIR TOUCHER EN PRODUCTION : la construction
# échoue si une seule trace du serveur, de WhatsApp, de Telegram ou d'un
# partenaire réel y revient (voir verifier-demo.mjs).
node .github/scripts/verifier-demo.mjs site index.html

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

# QUEL COMMIT EST EN LIGNE ? (14 octobre 2026). Rien ne permettait de le
# prouver : la production pouvait avoir un ou dix commits de retard sans
# qu'aucun contrôle ne le voie. Chaque construction écrit /version.json —
# le commit construit et la version du cache du service worker — et le
# contrôle de production (verifier-production.mjs --commit=…) le compare
# au dernier main. La variable dépend de qui construit : GitHub Actions,
# Cloudflare Workers Builds, Cloudflare Pages, sinon git lui-même.
# « commit » et « cache » sont calculés plus haut, avec la balise de la page.
printf '{"commit":"%s","cache":"%s","construit":"%s"}\n' "$commit" "$cache" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > site/version.json

# L'ANCIENNE RÈGLE DE PAIEMENT NE REPART JAMAIS EN LIGNE (14 octobre 2026) :
# carte / espèces à bord, « aucun paiement en ligne », iMessage. Lu sur le
# site construit, commentaires déjà retirés ; la liste est partagée avec le
# contrôle de production (textes-interdits.mjs).
node .github/scripts/verifier-textes-interdits.mjs site

echo "site/ construit : $(find site -type f | wc -l) fichiers"
