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

git -C "$ROOT" fetch origin main ai-dev
git -C "$ROOT" show-ref --verify --quiet refs/remotes/origin/ai-dev || {
  echo "La branche distante ai-dev manque." >&2
  exit 1
}

git -C "$ROOT" worktree add -b "$BRANCH" "$WORKTREE" origin/ai-dev
echo "Branche : $BRANCH"
echo "Worktree : $WORKTREE"
echo "Publier ensuite la branche et ouvrir une PR vers ai-dev, jamais vers main directement."
