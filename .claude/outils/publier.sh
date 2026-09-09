#!/bin/sh
# =====================================================================
# ÉPROUVER LE SITE TEL QU'IL SERA PUBLIÉ
# ---------------------------------------------------------------------
# LE TROU QUE CE SCRIPT BOUCHE : les 21 suites tournent sur le DÉPÔT,
# où le serveur de test sert tout — y compris les fichiers que
# « construire.sh » ne publie pas. Un fichier oublié dans la recette est
# donc INVISIBLE à tous les tests, marche parfaitement en local, et rend
# un 404 en ligne. C'est comme ça que « carte/ » est passé, puis
# « exploitant/ ».
#
# Ici on construit vraiment le dossier « site/ », on le sert LUI, et on
# ouvre la page dedans. Ce qui manque se voit tout de suite.
#
# Usage :  sh .claude/outils/publier.sh
# =====================================================================
set -e
cd "$(git rev-parse --show-toplevel)"

echo "═══ 1. CONSTRUCTION ═══"
sh construire.sh
echo ""

echo "═══ 2. LE NUMÉRO DE CACHE ═══"
actuel=$(grep -oE 'elatransfer-v[0-9]+' site/sw.js | head -1)
publie=$(git show origin/main:sw.js 2>/dev/null | grep -oE 'elatransfer-v[0-9]+' | head -1)
if [ "$actuel" = "$publie" ]; then
  echo "  ! inchangé depuis main ($actuel)"
  echo "    Si quelque chose de visible a changé, l'incrémenter dans sw.js —"
  echo "    sinon les téléphones qui ont installé l'application garderont"
  echo "    l'ancienne page."
else
  echo "  ✓ $publie (en ligne) → $actuel (à publier)"
fi
echo ""

echo "═══ 3. LA PAGE, SERVIE DEPUIS site/ ═══"
# Un autre port que 8099 : les suites peuvent tourner en même temps sur
# le dépôt, et les deux ne servent pas la même chose.
# LE DOSSIER PASSE AVANT LES OPTIONS, et ce n'est pas cosmétique : « -s »
# avale l'argument qui le suit. Écrit « -s site », le serveur sert le
# DÉPÔT au lieu du dossier construit — et « /demos/ » rend alors 404,
# puisque la galerie n'existe qu'après construction. Le premier jet de ce
# script a signalé exactement cette fausse alerte. Un outil qui crie au
# loup finit débranché.
PORT=8098
# SI LE PORT RÉPOND DÉJÀ, ON S'ARRÊTE. Un serveur oublié d'une exécution
# précédente sert une AUTRE racine : les contrôles répondent, et ils
# regardent le mauvais dossier. C'est arrivé — « /demos/ » a été signalé
# absent alors qu'il était bien construit. Un contrôle qui interroge la
# mauvaise chose est pire qu'un contrôle absent : il a l'air de marcher.
if curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORT/" 2>/dev/null; then
  echo "  ✗ le port $PORT est déjà occupé par un autre serveur."
  echo "    Les contrôles interrogeraient le mauvais dossier. Fermez-le"
  echo "    d'abord :  pkill -f http-server"
  exit 1
fi

npx --yes http-server site -s -p $PORT >/tmp/asmine-publie.log 2>&1 &
SERVEUR=$!
trap 'kill $SERVEUR 2>/dev/null' EXIT INT TERM
i=0; while [ $i -lt 15 ]; do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && break
  i=$((i+1)); sleep 1
done

# LES TROIS ADRESSES DE CLAUDE.md — elles couvrent les trois mécanismes
# de service, et c'est la seule façon de voir une erreur de configuration.
echo ""
echo "  Les trois adresses :"
for a in "/" "/admin.html" "/demos/"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$a")
  if [ "$code" = "200" ]; then printf "    ✓ %-14s %s\n" "$a" "$code"
  else printf "    ✗ %-14s %s  ← absent du dossier publié\n" "$a" "$code"; fi
done
echo ""

node .claude/outils/verifier.mjs "http://127.0.0.1:$PORT/" /tmp/verification-publiee
