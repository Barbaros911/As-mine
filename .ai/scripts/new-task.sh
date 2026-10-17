#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <issue> <agent> <sujet-court>" >&2
  exit 2
fi

ISSUE=$1
AGENT=$2
SLUG=$3
ROOT=$(git rev-parse --show-toplevel)
PARENT=$(dirname "$ROOT")
BRANCH="ai/${ISSUE}-${AGENT}-${SLUG}"
WORKTREE="$PARENT/ela-${ISSUE}-${AGENT}-${SLUG}"

case "$ISSUE:$AGENT:$SLUG" in
  *[!a-zA-Z0-9:_-]*) echo "Caractère non autorisé dans les arguments." >&2; exit 2 ;;
esac

[ -z "$(git -C "$ROOT" status --porcelain)" ] || {
  echo "Le worktree source n'est pas propre." >&2
  exit 1
}

# Toujours depuis le dernier main : il n'y a plus de branche d'intégration
# (TEAM_RULES.md §2), et partir d'une autre branche ferait travailler en retard.
git -C "$ROOT" fetch origin main
git -C "$ROOT" worktree add -b "$BRANCH" "$WORKTREE" origin/main
echo "Branche : $BRANCH (depuis origin/main $(git -C "$ROOT" rev-parse --short origin/main))"
echo "Worktree : $WORKTREE"
echo "Publier ensuite la branche et ouvrir une PR vers main ; la fusion attend l'accord de Burak."
