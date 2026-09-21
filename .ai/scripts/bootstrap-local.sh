#!/bin/sh
set -eu

ROOT=$(git rev-parse --show-toplevel)
PARENT=$(dirname "$ROOT")
TOOLS_DIR=${ELA_AI_TOOLS_DIR:-$PARENT/.ai-tools}
OLLAMA_VERSION=0.34.2
OLLAMA_SHA256=e155b83589986d2c581fdbf1381ea3ebdb16549883679cd5a0627f7cdc05b12b
OPENCODE_VERSION=1.18.31
AIDER_VERSION=0.86.2
MODEL=qwen2.5-coder:7b
ARCHIVE=${TMPDIR:-/tmp}/ollama-linux-amd64-${OLLAMA_VERSION}.tar.zst

mkdir -p "$TOOLS_DIR/ollama" "$TOOLS_DIR/opencode"

if [ ! -x "$TOOLS_DIR/ollama/bin/ollama" ]; then
  curl -fL "https://github.com/ollama/ollama/releases/download/v${OLLAMA_VERSION}/ollama-linux-amd64.tar.zst" -o "$ARCHIVE"
  printf '%s  %s\n' "$OLLAMA_SHA256" "$ARCHIVE" | sha256sum -c -
  tar --zstd -xf "$ARCHIVE" -C "$TOOLS_DIR/ollama"
fi

if [ ! -x "$TOOLS_DIR/opencode/node_modules/.bin/opencode" ]; then
  npm install --prefix "$TOOLS_DIR/opencode" --no-audit --no-fund "opencode-ai@${OPENCODE_VERSION}"
fi

if [ ! -x "$TOOLS_DIR/aider/bin/aider" ]; then
  python3 -m venv "$TOOLS_DIR/aider"
  "$TOOLS_DIR/aider/bin/pip" install --disable-pip-version-check "aider-chat==${AIDER_VERSION}"
fi

export OLLAMA_MODELS="$TOOLS_DIR/models"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_NO_CLOUD=true

if ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
  "$TOOLS_DIR/ollama/bin/ollama" serve >"$TOOLS_DIR/ollama.log" 2>&1 &
  server_pid=$!
  printf '%s\n' "$server_pid" >"$TOOLS_DIR/ollama.pid"
  i=0
  while ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -gt 30 ] && { echo "Ollama ne démarre pas." >&2; exit 1; }
    sleep 1
  done
fi

"$TOOLS_DIR/ollama/bin/ollama" pull "$MODEL"
echo "Outils IA locaux prêts dans $TOOLS_DIR"
