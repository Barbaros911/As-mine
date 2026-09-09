#!/bin/sh
# =====================================================================
# LES SUITES, EN UNE COMMANDE
# ---------------------------------------------------------------------
# La boucle vivait dans CLAUDE.md et se recopiait à la main à chaque
# fois — vingt lignes, au pouce, sur un téléphone. Elle vit ici.
#
# Trois choses qu'elle fait et qu'une recopie oublie :
#  · UN VERROU. Deux séries en parallèle se marchent dessus et se
#    bloquent. C'est arrivé.
#  · LE LIEN PLAYWRIGHT. Il n'est pas dans le dépôt et se refait à
#    chaque session.
#  · UNE SUITE MUETTE EST UN ÉCHEC. Ni réussite ni échec affichés, ce
#    n'est pas « pas concernée » : c'est un plantage. Lu comme un
#    silence trois séries d'affilée, une fois.
#
# Usage :  sh .claude/outils/tests.sh            (toutes)
#          sh .claude/outils/tests.sh prix carte (celles qui contiennent)
# =====================================================================
set -e
cd "$(git rev-parse --show-toplevel)"

VERROU=/tmp/asmine-tests.verrou
if [ -e "$VERROU" ] && kill -0 "$(cat "$VERROU" 2>/dev/null)" 2>/dev/null; then
  echo "UNE SÉRIE TOURNE DÉJÀ (pid $(cat "$VERROU")). Deux en parallèle se bloquent."
  echo "Attendre la fin, ou : rm $VERROU si elle est morte."
  exit 1
fi
echo $$ > "$VERROU"
trap 'rm -f "$VERROU"' EXIT INT TERM

# Playwright n'est pas dans le dépôt : le lien se refait à chaque session.
[ -e node_modules/playwright ] || {
  mkdir -p node_modules
  ln -sfn /opt/node22/lib/node_modules/playwright node_modules/playwright
  echo "Playwright relié."
}

# Le serveur local, s'il ne tourne pas déjà.
if ! curl -s -o /dev/null http://127.0.0.1:8099/ 2>/dev/null; then
  npx --yes http-server . -s -p 8099 >/tmp/asmine-serveur.log 2>&1 &
  SERVEUR=$!
  trap 'rm -f "$VERROU"; kill $SERVEUR 2>/dev/null' EXIT INT TERM
  i=0; while [ $i -lt 15 ]; do
    curl -s -o /dev/null http://127.0.0.1:8099/ 2>/dev/null && break
    i=$((i+1)); sleep 1
  done
  echo "Serveur local démarré."
fi

SUITES=$(ls test-nouveau*.mjs 2>/dev/null | sort)
if [ -n "$1" ]; then
  MOTIF=$(echo "$@" | tr ' ' '|')
  SUITES=$(echo "$SUITES" | grep -E "$MOTIF" || true)
  [ -z "$SUITES" ] && { echo "Aucune suite ne correspond à « $* »."; exit 1; }
fi

echo ""
MUETTES=0; ECHECS=0
for f in $SUITES; do
  printf "%-36s " "$f"
  sortie=$(node "$f" 2>&1) || true
  bilan=$(echo "$sortie" | grep -E "^=== " | tr '\n' ' ')
  if [ -z "$bilan" ]; then
    echo "!!! MUETTE — PLANTAGE"
    echo "$sortie" | tail -4 | sed 's/^/      /'
    MUETTES=$((MUETTES+1))
  else
    echo "$bilan"
    detail=$(echo "$sortie" | sed -n '/=== ÉCHECS/,/^$/p' | head -6)
    [ -n "$detail" ] && { echo "$detail" | sed 's/^/      /'; ECHECS=$((ECHECS+1)); }
  fi
done

# Ces deux-là ne passent ni par un navigateur ni par le réseau.
for f in test-notification.mjs test-push.mjs; do
  [ -f "$f" ] || continue
  printf "%-36s " "$f"
  node "$f" 2>&1 | grep -E "^=== " | tr '\n' ' ' || echo "!!! MUETTE"
  echo ""
done

echo ""
if [ $MUETTES -gt 0 ] || [ $ECHECS -gt 0 ]; then
  echo "═══ $ECHECS suite(s) en échec, $MUETTES muette(s) ═══"
  exit 1
fi
echo "═══ TOUT EST AU VERT ═══"
