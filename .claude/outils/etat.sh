#!/bin/sh
# =====================================================================
# OÙ ON EN EST — DEMANDÉ, JAMAIS ÉCRIT
# ---------------------------------------------------------------------
# POURQUOI CE FICHIER EXISTE. « PROJECT_STATE.md » était censé dire où on
# en est. Le 16 septembre 2026 il n'avait pas bougé depuis avant dix
# fusions, 38 branches supprimées et trois correctifs publiés. Il était
# faux, et personne ne pouvait le savoir en le lisant.
#
# TOUT CE QUI S'ÉCRIT À LA MAIN FINIT PÉRIMÉ. Pas par négligence : il y a
# toujours un soir où l'on fusionne à 2 h et où mettre à jour un fichier
# passe après. CLAUDE.md a menti sur le code d'accès pendant des jours,
# pour la même raison.
#
# CE SCRIPT NE RETIENT RIEN. Il demande. Il ne peut donc pas être faux —
# au pire il ne répond pas, et ça se voit.
#
# Ce qu'il ne saura jamais dire : ce qui a été DÉCIDÉ, et ce qui est
# PRÉVU. Ça, ça s'écrit — dans PROJECT_STATE.md et les Issues [TEAM].
#
# Usage :  sh .claude/outils/etat.sh
# =====================================================================
cd "$(git rev-parse --show-toplevel)" || exit 1

titre() { printf '\n\033[1m── %s\033[0m\n' "$1"; }

git fetch -q --prune origin 2>/dev/null || echo "  (réseau indisponible : les chiffres peuvent dater)"

titre "PRODUCTION"
printf '  dernier main   %s\n' "$(git log origin/main -1 --format='%h  %ad  %s' --date=short)"
# LA PUBLICATION PEUT ÉCHOUER APRÈS UNE FUSION RÉUSSIE. C'est arrivé deux
# fois le 15 septembre : les PR étaient fusionnées, le site ne bougeait
# pas, et Barbaros a essayé l'ancienne version pendant vingt minutes.
if command -v gh >/dev/null 2>&1; then
  printf '  publication    '
  gh run list --workflow pages.yml --limit 1 \
      --json conclusion,createdAt,displayTitle \
      --jq '.[] | "\(.conclusion // "en cours")  \(.createdAt[:16])  \(.displayTitle)"' 2>/dev/null \
    || echo "(gh indisponible)"
else
  echo "  publication    à vérifier sur GitHub → Actions → « Publier le site »"
fi

titre "CE QUI ATTEND UNE RÉPONSE"
if command -v gh >/dev/null 2>&1; then
  echo "  Issues [TEAM] ouvertes :"
  gh issue list --state open --search "[TEAM] in:title" \
      --json number,title,updatedAt \
      --jq '.[] | "    #\(.number)  \(.updatedAt[:10])  \(.title)"' 2>/dev/null
  echo "  PR ouvertes :"
  gh pr list --state open --json number,title,headRefName \
      --jq '.[] | "    #\(.number)  \(.title)  ← \(.headRefName)"' 2>/dev/null
else
  echo "  → lire les Issues [TEAM] et les PR ouvertes sur GitHub AVANT de coder"
fi

titre "LE DÉPÔT"
printf '  branches vivantes   %s\n' \
  "$(git branch -r --no-merged origin/main --format='%(refname:short)' | grep -vc HEAD)"
printf '  ma branche          %s\n' "$(git branch --show-current)"
retard=$(git rev-list --count HEAD..origin/main 2>/dev/null)
if [ "$retard" = "0" ]; then
  printf '  à jour              oui\n'
else
  # TRAVAILLER EN RETARD SUR MAIN A FAILLI SUPPRIMER LE TRAVAIL D'UN AUTRE
  # le 15 septembre : 83 commits d'écart, et une fusion à l'aveugle aurait
  # effacé tout le durcissement de sécurité.
  printf '  \033[31mEN RETARD DE %s COMMIT(S) — repartir du dernier main\033[0m\n' "$retard"
fi
# MAIN A-T-IL BOUGÉ PENDANT CETTE SESSION ? Posé le 16 septembre 2026, après
# une nuit où une AUTRE session Claude a fusionné dix pull requests pendant
# que celle-ci travaillait. Ses commits sont apparus sous les pieds, et une
# série complète de tests est passée au vert sans les connaître.
# Deux sessions sur un même dépôt se marchent dessus sans le savoir : ce
# n'est pas une faute d'attention, c'est qu'aucun signal ne le disait.
# On garde l'empreinte du main vu au premier appel, et on la compare ensuite.
REPERE="${TMPDIR:-/tmp}/asmine-main-$(git rev-parse --show-toplevel | md5sum | cut -c1-8)"
MAINTENANT=$(git rev-parse origin/main 2>/dev/null)
if [ -f "$REPERE" ]; then
  VU=$(cat "$REPERE")
  if [ -n "$MAINTENANT" ] && [ "$VU" != "$MAINTENANT" ]; then
    n=$(git rev-list --count "$VU".."$MAINTENANT" 2>/dev/null || echo "?")
    printf '  \033[31mMAIN A BOUGÉ — %s commit(s) depuis le début de cette session\033[0m\n' "$n"
    git log --format='      %h %s' "$VU".."$MAINTENANT" 2>/dev/null | head -5
    echo "      → quelqu'un d'autre travaille ce dépôt. Relire avant de coder,"
    echo "        et ne pas relancer un chantier déjà pris (TEAM_RULES §2)."
  fi
fi
[ -n "$MAINTENANT" ] && echo "$MAINTENANT" > "$REPERE"

sale=$(git status --porcelain | wc -l)
[ "$sale" = "0" ] && printf '  arbre               propre\n' \
                  || printf '  arbre               %s fichier(s) modifié(s)\n' "$sale"

titre "CE QUI A BOUGÉ DEPUIS 3 JOURS"
git log origin/main --since="3 days ago" --format='  %ad  %s' --date=short | head -12
n=$(git log origin/main --since="3 days ago" --oneline | wc -l)
[ "$n" -gt 12 ] && printf '  … et %s de plus\n' "$((n - 12))"

titre "À LIRE AVANT DE CODER"
echo "  TEAM_RULES.md      les règles communes — une page"
echo "  PROJECT_STATE.md   les décisions prises et ce qui est prévu"
echo "  CLAUDE.md          la mémoire du produit — vérifier avant de s'en servir"
echo
echo "  Les tests ne sont PAS lancés ici : /tests, six minutes."
echo
