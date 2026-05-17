#!/usr/bin/env bash
#
# claude-managerie one-command bootstrap.
#
#   git clone https://github.com/rks277/claude-managerie.git
#   cd claude-managerie && ./bootstrap.sh
#
# Sibling agent-terrarium is cloned next to this repo (or override with
# AGENT_TERRARIUM_ROOT=/abs/path). macOS only.

set -euo pipefail

MANAGERIE_ROOT="$(cd "$(dirname "$0")" && pwd)"
AGENT_TERRARIUM_REPO="https://github.com/rks277/agent-terrarium.git"

# A directory is "agent-terrarium" if it has the workspace marker + cli package.
is_agent_terrarium() {
  [[ -d "$1" ]] && [[ -f "$1/pnpm-workspace.yaml" ]] && [[ -d "$1/packages/cli" ]]
}

step()  { printf "\n\033[1;36m==> %s\033[0m\n" "$*"; }
info()  { printf "    %s\n" "$*"; }
warn()  { printf "\033[1;33m!!  %s\033[0m\n" "$*" >&2; }
fail()  { printf "\033[1;31mxx  %s\033[0m\n" "$*" >&2; exit 1; }

# --- 1. preflight ----------------------------------------------------------
step "preflight"

[[ "$(uname)" == "Darwin" ]] || fail "macOS only (Linux support coming soon)."

if ! command -v node >/dev/null 2>&1; then
  fail "node is not installed. Install Node.js >= 20 first (https://nodejs.org)."
fi
node_major=$(node -p 'process.versions.node.split(".")[0]')
if (( node_major < 20 )); then
  fail "Node >= 20 required (found $(node -v))."
fi
info "node $(node -v)"

if ! command -v pnpm >/dev/null 2>&1; then
  info "pnpm not found, trying corepack..."
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
  command -v pnpm >/dev/null 2>&1 || fail "pnpm not available. Install with: npm i -g pnpm"
fi
info "pnpm $(pnpm --version)"

if command -v claude >/dev/null 2>&1; then
  info "claude $(claude --version 2>/dev/null | head -1)"
else
  warn "claude CLI not found. Install Claude Code before opening sessions: https://docs.claude.com/en/docs/claude-code"
fi

# --- 2. locate / clone agent-terrarium -------------------------------------
step "agent-terrarium daemon backend"

# Resolution order: explicit env var > default sibling > common locations > clone.
default_sibling="$(cd "$MANAGERIE_ROOT/.." && pwd)/agent-terrarium"

if [[ -n "${AGENT_TERRARIUM_ROOT:-}" ]]; then
  if ! is_agent_terrarium "$AGENT_TERRARIUM_ROOT"; then
    fail "AGENT_TERRARIUM_ROOT=$AGENT_TERRARIUM_ROOT does not look like agent-terrarium (missing pnpm-workspace.yaml or packages/cli)."
  fi
  info "using AGENT_TERRARIUM_ROOT=$AGENT_TERRARIUM_ROOT"
elif is_agent_terrarium "$default_sibling"; then
  AGENT_TERRARIUM_ROOT="$default_sibling"
  info "found at default sibling: $AGENT_TERRARIUM_ROOT"
else
  # Walk up parent directories of MANAGERIE_ROOT (up to $HOME) looking for a
  # sibling `agent-terrarium`. Covers users who keep both repos under a custom
  # parent like ~/Documents/projects2026/.
  found=""
  dir="$MANAGERIE_ROOT"
  while [[ "$dir" != "/" && "$dir" != "$HOME" ]]; do
    parent="$(dirname "$dir")"
    if is_agent_terrarium "$parent/agent-terrarium"; then
      found="$parent/agent-terrarium"
      break
    fi
    dir="$parent"
  done

  # Then probe a small set of common standalone locations.
  if [[ -z "$found" ]]; then
    for candidate in \
      "$HOME/agent-terrarium" \
      "$HOME/code/agent-terrarium" \
      "$HOME/src/agent-terrarium" \
      "$HOME/dev/agent-terrarium" \
      "$HOME/projects/agent-terrarium" \
      "$HOME/Documents/agent-terrarium" \
      "$HOME/Documents/projects/agent-terrarium" \
    ; do
      if is_agent_terrarium "$candidate"; then
        found="$candidate"
        break
      fi
    done
  fi

  if [[ -n "$found" ]]; then
    AGENT_TERRARIUM_ROOT="$found"
    info "found existing checkout: $AGENT_TERRARIUM_ROOT"
    info "(set AGENT_TERRARIUM_ROOT explicitly to override)"
  else
    AGENT_TERRARIUM_ROOT="$default_sibling"
    info "no existing checkout found - cloning to $AGENT_TERRARIUM_ROOT"
    info "(if you already have it elsewhere, ^C and re-run with AGENT_TERRARIUM_ROOT=/your/path)"
    git clone "$AGENT_TERRARIUM_REPO" "$AGENT_TERRARIUM_ROOT"
  fi
fi
export AGENT_TERRARIUM_ROOT

# --- 3. build agent-terrarium ----------------------------------------------
step "build agent-terrarium"
(
  cd "$AGENT_TERRARIUM_ROOT"
  pnpm install
  pnpm -r build
)

# --- 4. build claude-managerie ---------------------------------------------
step "build claude-managerie"
cd "$MANAGERIE_ROOT"
npm install
npm run build

# --- 5. run setup (install daemon + register plugin) -----------------------
step "setup (install daemon, register Claude Code plugin)"
node dist/main.js setup

# --- 6. expose `claude-managerie` globally ---------------------------------
step "install global \`claude-managerie\` command"
linked=0
if npm link >/dev/null 2>&1; then
  linked=1
  info "installed via npm link"
elif npm link 2>&1 | tee /tmp/managerie-npm-link.log | grep -qiE 'EACCES|permission'; then
  info "npm link needs sudo; falling back to ~/.local/bin"
else
  info "npm link unavailable; falling back to ~/.local/bin"
fi

if (( linked == 0 )); then
  mkdir -p "$HOME/.local/bin"
  ln -sf "$MANAGERIE_ROOT/dist/main.js" "$HOME/.local/bin/claude-managerie"
  case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) warn "\$HOME/.local/bin is not on PATH. Add: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
  esac
fi

if command -v claude-managerie >/dev/null 2>&1; then
  info "$(command -v claude-managerie)"
else
  warn "claude-managerie not on PATH yet; open a new shell or run: node $MANAGERIE_ROOT/dist/main.js"
fi

# --- 7. exec the TUI -------------------------------------------------------
step "launching the garden"
if command -v claude-managerie >/dev/null 2>&1; then
  exec claude-managerie
else
  exec node "$MANAGERIE_ROOT/dist/main.js"
fi
