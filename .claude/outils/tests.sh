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
#          sh .claude/outils/tests.sh --force    (meme si rien n'a change)
# =====================================================================
set -e
cd "$(git rev-parse --show-toplevel)"

# « --force » SE LIT AVANT TOUT LE RESTE, sinon il serait pris pour un motif
# de filtrage et le lanceur irait chercher une suite dont le nom contient
# « force » -- il n'en existe aucune, et il s'arrêterait sur « aucune suite
# ne correspond » au lieu de faire ce qu'on lui demande.
FORCE=0
case "$1" in
  --force|-f) FORCE=1; shift ;;
esac

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

# =====================================================================
# PAS DE SÉRIE SI RIEN N'A CHANGÉ
# ---------------------------------------------------------------------
# La série complète prend six minutes. Elle a tourné cinq fois en une nuit,
# dont trois sur un dépôt STRICTEMENT identique : dix-huit minutes à
# réapprendre ce qu'on savait déjà. Et une attente qu'on juge inutile est
# une attente qu'on finit par sauter -- c'est-à-dire un lanceur qu'on
# débranche, donc le vrai échec suivant que personne ne voit.
#
# CE QUI REND CE RACCOURCI HONNÊTE, ET RIEN D'AUTRE :
#  · L'EMPREINTE PORTE LE CONTENU, jamais une liste de noms ni des dates.
#    « git status » ne dit que « ce fichier est modifié » : deux versions
#    différentes du même fichier lui rendent la même réponse, et on
#    sauterait la série sur un vrai changement. Un contrôle qui ne peut pas
#    échouer ne vérifie rien.
#  · LES FICHIERS NON SUIVIS EN FONT PARTIE (le « -o »). Une suite qu'on
#    vient d'écrire n'est pas encore dans git : sans elle dans l'empreinte,
#    l'exécution qu'on sauterait serait justement la PREMIÈRE de la nouvelle
#    suite. Une suite jamais lancée ne surveille rien -- le lanceur s'est
#    déjà fait prendre là-dessus avec le préfixe « nouveau ».
#  · LE BANC COMPTE AUTANT QUE LE DÉPÔT : version de Node, version de
#    Playwright (1.47 et 1.56 n'ordonnent pas les routes de la même façon,
#    ça a coûté une soirée) et la liste des paquets installés -- « jsqr » et
#    « http_ece » décident à eux seuls qu'un contrôle s'exécute ou s'arrête.
#  · LE MÉMO N'EST ÉCRIT QUE PAR UNE SÉRIE COMPLÈTE ET VERTE, et la moindre
#    rouge l'EFFACE. Sauter après un échec ferait passer du rouge pour du
#    vert : exactement le défaut que ce lanceur existe pour débusquer chez
#    les autres, et il s'y est déjà fait prendre deux fois.
#  · UNE SÉRIE FILTRÉE NE COMPTE PAS et ne se saute jamais : elle n'a ouvert
#    qu'une poignée de suites, elle ne dit rien des autres.
#  · LE MÉMO VIT DANS /tmp, donc il disparaît avec la session. Le défaut est
#    de RELANCER, jamais de sauter.
# =====================================================================
MEMO=/tmp/asmine-tests.empreinte

empreinte() {
  {
    # Le contenu de tout ce que git connaît (suivi) ou pourrait connaître
    # (non suivi, non ignoré). « site/ » et « node_modules/ » sont ignorés :
    # ils se refabriquent, ils ne sont pas une modification.
    # « 2>&1 » : une entrée qu'on ne peut pas hacher (lien vers un dossier,
    # fichier illisible) entre dans l'empreinte sous forme de sa ligne
    # d'erreur, plutôt que d'aller salir l'écran. Elle est donc COMPTÉE --
    # simplement pas par son contenu -- et le lanceur reste lisible.
    git ls-files -co --exclude-standard -z | xargs -0 sha1sum 2>&1
    node -v
    node -p "require('playwright/package.json').version" 2>/dev/null || true
    ls node_modules 2>/dev/null || true
  } | sha1sum | cut -d' ' -f1
}
EMPREINTE=$(empreinte)

if [ "$FORCE" -eq 0 ] && [ -z "$1" ] && [ -f "$MEMO" ] \
   && [ "$EMPREINTE" = "$(head -1 "$MEMO")" ]; then
  echo ""
  echo "═══ RIEN N'A CHANGÉ — AUCUNE SUITE LANCÉE ═══"
  echo "  Dernière série complète au vert : $(sed -n 2p "$MEMO")"
  echo "  Dépôt, Node et Playwright identiques au bit près depuis."
  echo "  La relancer quand même :  sh .claude/outils/tests.sh --force"
  exit 0
fi

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
  # UNE SÉRIE ROUGE EFFACE LE MÉMO. Le garder ferait annoncer « rien n'a
  # changé » à la série suivante, sur un dépôt dont on SAIT qu'il est en
  # échec : un lanceur qui tait un échec est pire que pas de lanceur.
  rm -f "$MEMO"
  echo "═══ $ECHECS suite(s) en échec, $MUETTES muette(s) ═══"
  exit 1
fi
# ON NE MÉMORISE QUE LA SÉRIE COMPLÈTE. Filtrée, elle n'a rien lancé des
# autres : la retenir reviendrait à répondre « tout va bien » sur des suites
# qu'on n'a pas ouvertes. Et on réécrit l'empreinte À LA FIN, pas celle
# d'avant : un fichier touché PENDANT la série n'a pas été éprouvé.
if [ -z "$1" ]; then
  if [ "$EMPREINTE" = "$(empreinte)" ]; then
    printf '%s\n%s\n' "$EMPREINTE" "$(date '+%d/%m/%Y à %H:%M')" > "$MEMO"
  else
    rm -f "$MEMO"
    echo "  (le dépôt a changé pendant la série — rien n'est mémorisé)"
  fi
fi
echo "═══ TOUT EST AU VERT ═══"
