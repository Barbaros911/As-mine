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
# LE TRAP DOIT RENDRE LE CODE D'ORIGINE, sinon il l'écrase avec celui de sa
# dernière commande. Ce script affichait « 10 suites en échec » et sortait
# avec 0 : à l'écran on voyait rouge, une automatisation aurait vu vert.
# Exactement le défaut que ce lanceur sert à débusquer chez les autres.
trap 'c=$?; rm -f "$VERROU"; exit $c' EXIT
trap 'exit 130' INT TERM

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
  trap 'c=$?; rm -f "$VERROU"; kill $SERVEUR 2>/dev/null; exit $c' EXIT
  i=0; while [ $i -lt 15 ]; do
    curl -s -o /dev/null http://127.0.0.1:8099/ 2>/dev/null && break
    i=$((i+1)); sleep 1
  done
  echo "Serveur local démarré."
fi

# LES TROIS SUITES HORS NAVIGATEUR, NOMMÉES UNE SEULE FOIS. Elles tournent
# dans la seconde boucle ; les autres sont toutes des suites de navigateur.
HORS_NAV="test-doc.mjs test-notification.mjs test-push.mjs"

# ON RAMASSE « test-*.mjs », PAS « test-nouveau* ». Le préfixe « nouveau »
# est un vestige de la bascule de septembre : une suite écrite aujourd'hui
# ne le porte pas, et le lanceur l'ignorait EN SILENCE -- une suite jamais
# lancée ne surveille rien, et personne ne s'aperçoit de son absence.
# Même famille que la barre du bas figée sur quatre onglets.
SUITES=$(ls test-*.mjs 2>/dev/null | grep -vxF $(for h in $HORS_NAV; do printf -- '-e %s ' "$h"; done) | sort)
if [ -n "$1" ]; then
  MOTIF=$(echo "$@" | tr ' ' '|')
  SUITES=$(echo "$SUITES" | grep -E "$MOTIF" || true)
  [ -z "$SUITES" ] && { echo "Aucune suite ne correspond à « $* »."; exit 1; }
fi

echo ""
MUETTES=0; ECHECS=0
for f in $SUITES; do
  printf "%-36s " "$f"
  if sortie=$(node "$f" 2>&1); then code=0; else code=$?; fi
  bilan=$(echo "$sortie" | grep -E "^=== " | tr '\n' ' ')
  # ON JUGE SUR LE CODE DE SORTIE, PAS SUR LE FORMAT D'AFFICHAGE. La ligne
  # « === » est une convention de présentation, et toutes les suites ne la
  # suivent pas : test-agent-rbac et test-unified-facade passent en affichant
  # « OK — … ». Les déclarer MUETTES était une FAUSSE ALERTE -- et une fausse
  # alerte à chaque exécution est la meilleure façon de faire ignorer le
  # lanceur, donc de laisser passer le vrai plantage suivant.
  # Une suite n'est muette que si elle n'affiche RIEN DU TOUT.
  if [ -z "$sortie" ]; then
    echo "!!! MUETTE — AUCUNE SORTIE"
    MUETTES=$((MUETTES+1))
  elif [ -z "$bilan" ] && [ "$code" -ne 0 ]; then
    echo "!!! ÉCHEC (code $code)"
    echo "$sortie" | tail -4 | sed 's/^/      /'
    ECHECS=$((ECHECS+1))
  elif [ -z "$bilan" ]; then
    echo "OK — $(echo "$sortie" | grep -v '^[[:space:]]*$' | tail -1)"
  else
    echo "$bilan"
    detail=$(echo "$sortie" | sed -n '/=== ÉCHECS/,/^$/p' | head -6)
    [ -n "$detail" ] && { echo "$detail" | sed 's/^/      /'; ECHECS=$((ECHECS+1)); }
  fi
done

# Ces trois-là ne passent ni par un navigateur ni par le réseau.
# test-doc.mjs compare la DOCUMENTATION au code : c'est le seul contrôle qui
# empêche une note de vieillir en silence. Il bloque aussi la publication.
#
# ELLES SE COMPTENT COMME LES AUTRES — ET ÇA A ÉTÉ UN VRAI DÉFAUT (16 sept.
# 2026). Cette boucle se contentait d'AFFICHER : elle ne touchait ni ECHECS
# ni MUETTES. « test-notification » est tombé, la ligne « === ÉCHECS (1) === »
# s'est affichée à l'écran, et le lanceur a conclu « TOUT EST AU VERT » en
# sortant avec 0. Un œil pressé voit le verdict, pas la ligne du dessus ; une
# automatisation, elle, ne voit QUE le code de sortie.
# C'est exactement ce que ce lanceur existe pour empêcher chez les autres —
# et c'est la deuxième fois qu'il se fait prendre à son propre piège, après
# le trap qui écrasait le code d'origine. Un outil de contrôle qui ment est
# pire que pas d'outil : il fait passer le rouge pour du vert.
for f in $HORS_NAV; do
  [ -f "$f" ] || continue
  printf "%-36s " "$f"
  if sortie=$(node "$f" 2>&1); then code=0; else code=$?; fi
  bilan=$(echo "$sortie" | grep -E "^=== " | tr '\n' ' ')
  # ON JUGE SUR LE CODE DE SORTIE, PAS SUR LE FORMAT D'AFFICHAGE. La ligne
  # « === » est une convention de présentation, et toutes les suites ne la
  # suivent pas : test-agent-rbac et test-unified-facade passent en affichant
  # « OK — … ». Les déclarer MUETTES était une FAUSSE ALERTE -- et une fausse
  # alerte à chaque exécution est la meilleure façon de faire ignorer le
  # lanceur, donc de laisser passer le vrai plantage suivant.
  # Une suite n'est muette que si elle n'affiche RIEN DU TOUT.
  if [ -z "$sortie" ]; then
    echo "!!! MUETTE — AUCUNE SORTIE"
    MUETTES=$((MUETTES+1))
  elif [ -z "$bilan" ] && [ "$code" -ne 0 ]; then
    echo "!!! ÉCHEC (code $code)"
    echo "$sortie" | tail -4 | sed 's/^/      /'
    ECHECS=$((ECHECS+1))
  elif [ -z "$bilan" ]; then
    echo "OK — $(echo "$sortie" | grep -v '^[[:space:]]*$' | tail -1)"
  else
    echo "$bilan"
    detail=$(echo "$sortie" | sed -n '/=== ÉCHECS/,/^$/p' | head -6)
    [ -n "$detail" ] && { echo "$detail" | sed 's/^/      /'; ECHECS=$((ECHECS+1)); }
  fi
done

echo ""
if [ $MUETTES -gt 0 ] || [ $ECHECS -gt 0 ]; then
  echo "═══ $ECHECS suite(s) en échec, $MUETTES muette(s) ═══"
  exit 1
fi
echo "═══ TOUT EST AU VERT ═══"
