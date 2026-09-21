#!/bin/sh
set -eu

ROOT=$(git rev-parse --show-toplevel)
TOOLS_DIR=${ELA_AI_TOOLS_DIR:-$(dirname "$ROOT")/.ai-tools}
MODEL=${ELA_AI_MODEL:-qwen2.5-coder:7b}

export OLLAMA_MODELS="$TOOLS_DIR/models"
export OLLAMA_HOST=127.0.0.1:11434
export OLLAMA_API_BASE=http://127.0.0.1:11434
export OLLAMA_NO_CLOUD=true
export OLLAMA_CONTEXT_LENGTH=${OLLAMA_CONTEXT_LENGTH:-8192}

start_ollama() {
  if ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
    "$TOOLS_DIR/ollama/bin/ollama" serve >"$TOOLS_DIR/ollama.log" 2>&1 &
    printf '%s\n' "$!" >"$TOOLS_DIR/ollama.pid"
    i=0
    while ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; do
      i=$((i + 1))
      [ "$i" -gt 30 ] && { echo "Ollama ne démarre pas." >&2; exit 1; }
      sleep 1
    done
  fi
}

case "${1:-status}" in
  status)
    "$TOOLS_DIR/ollama/bin/ollama" --version
    "$TOOLS_DIR/opencode/node_modules/.bin/opencode" --version
    "$TOOLS_DIR/aider/bin/aider" --version
    ;;
  aider)
    start_ollama
    shift
    exec "$TOOLS_DIR/aider/bin/aider" --model "ollama_chat/$MODEL" --no-auto-commits --no-dirty-commits "$@"
    ;;
  opencode)
    start_ollama
    shift
    exec "$TOOLS_DIR/opencode/node_modules/.bin/opencode" --model "ollama/$MODEL" "$@"
    ;;
  smoke)
    start_ollama
    "$TOOLS_DIR/ollama/bin/ollama" run "$MODEL" "Réponds uniquement : ELA_LOCAL_OK"
    ;;
  *)
    echo "Usage: $0 {status|aider|opencode|smoke}" >&2
    exit 2
    ;;
esac
