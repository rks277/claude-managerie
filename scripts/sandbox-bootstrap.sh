#!/usr/bin/env bash
#
# Sandbox the claude-managerie bootstrap end-to-end:
#   - fresh clones of agent-terrarium + claude-managerie into a temp dir
#   - HOME redirected so ~/.repo-orch, ~/.claude, ~/Library/LaunchAgents
#     all land inside the sandbox
#   - launchctl + npm link stubbed so real launchd / global npm aren't touched
#   - npm/pnpm globals isolated
#   - the sandbox dir is deleted on exit (even on failure)
#
# Use this to (a) reproduce setup bugs from a clean slate, or
#              (b) verify a fix without polluting your real machine.
#
# Usage:
#   scripts/sandbox-bootstrap.sh                                 # fresh github clones
#   scripts/sandbox-bootstrap.sh --keep                          # don't delete sandbox on exit
#   scripts/sandbox-bootstrap.sh --terrarium-ref BRANCH          # checkout a branch in agent-terrarium
#   scripts/sandbox-bootstrap.sh --managerie-ref BRANCH          # checkout a branch in claude-managerie
#   scripts/sandbox-bootstrap.sh --terrarium-path /abs/path      # use a local clone instead of cloning github
#   scripts/sandbox-bootstrap.sh --managerie-path /abs/path      # use a local clone instead of cloning github
#
# macOS only.

set -euo pipefail

KEEP=0
TERRARIUM_REF=""
MANAGERIE_REF=""
TERRARIUM_PATH=""
MANAGERIE_PATH=""
TERRARIUM_REPO="https://github.com/rks277/agent-terrarium.git"
MANAGERIE_REPO="https://github.com/rks277/claude-managerie.git"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep) KEEP=1; shift ;;
    --terrarium-ref) TERRARIUM_REF="$2"; shift 2 ;;
    --managerie-ref) MANAGERIE_REF="$2"; shift 2 ;;
    --terrarium-path) TERRARIUM_PATH="$2"; shift 2 ;;
    --managerie-path) MANAGERIE_PATH="$2"; shift 2 ;;
    -h|--help)
      sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ "$(uname)" == "Darwin" ]] || { echo "macOS only"; exit 1; }

# Use /tmp directly so the resulting daemon.sock path stays under macOS's
# ~103-char unix-socket limit. The default mktemp location on macOS
# (/var/folders/.../T/) eats most of that budget before we add subdirs.
SANDBOX="$(mktemp -d /tmp/managerie-sb.XXXXXX)"
echo "==> sandbox: $SANDBOX"

cleanup() {
  # Kill the sandboxed daemon if it's still running. The launchctl stub
  # records its pid here; if bootstrap crashed mid-flight unload may not
  # have been called.
  PID_FILE="$SANDBOX/home/.repo-orch/sandbox-daemon.pid"
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  fi
  if (( KEEP == 1 )); then
    echo "==> sandbox kept at: $SANDBOX"
  else
    echo "==> cleaning up sandbox"
    rm -rf "$SANDBOX"
  fi
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# 1. PATH stubs: launchctl + npm (npm link) must NOT touch the real system.
# -----------------------------------------------------------------------------
mkdir -p "$SANDBOX/bin"

cat > "$SANDBOX/bin/launchctl" <<'EOF'
#!/bin/sh
# Sandbox stub: instead of touching real launchd, parse the plist and run
# the daemon ourselves so bootstrap's step 2/4 (ping) actually succeeds.
# `unload` kills whatever we started.
PID_FILE="$HOME/.repo-orch/sandbox-daemon.pid"
case "$1" in
  load)
    PLIST="$2"
    [ -z "$PLIST" ] && exit 0
    NODE_BIN=$(plutil -extract "ProgramArguments.0" raw -o - "$PLIST" 2>/dev/null)
    DAEMON_JS=$(plutil -extract "ProgramArguments.1" raw -o - "$PLIST" 2>/dev/null)
    if [ -n "$NODE_BIN" ] && [ -n "$DAEMON_JS" ]; then
      mkdir -p "$HOME/.repo-orch/logs"
      nohup "$NODE_BIN" "$DAEMON_JS" \
        >"$HOME/.repo-orch/logs/daemon.log" \
        2>"$HOME/.repo-orch/logs/daemon.err.log" </dev/null &
      echo $! > "$PID_FILE"
      echo "[sandbox-launchctl] load: spawned daemon pid=$!" >&2
    else
      echo "[sandbox-launchctl] load: could not parse plist $PLIST" >&2
    fi
    ;;
  unload)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "[sandbox-launchctl] unload" >&2
    fi
    ;;
  *)
    echo "[sandbox-launchctl] noop: $*" >&2
    ;;
esac
exit 0
EOF
chmod +x "$SANDBOX/bin/launchctl"

# Real npm is needed for `npm install` and `npm run build`, but `npm link`
# would touch the real global prefix. NPM_CONFIG_PREFIX redirects that.
mkdir -p "$SANDBOX/npm-prefix"
export NPM_CONFIG_PREFIX="$SANDBOX/npm-prefix"

# -----------------------------------------------------------------------------
# 2. HOME redirect: every "~"-relative path the install touches lands here.
# -----------------------------------------------------------------------------
export HOME="$SANDBOX/home"
mkdir -p "$HOME/.claude" "$HOME/Library/LaunchAgents" "$HOME/.local/bin"
# Seed an empty settings.json so the install's sha-check has something to hash.
echo '{}' > "$HOME/.claude/settings.json"

export PATH="$SANDBOX/bin:$HOME/.local/bin:$NPM_CONFIG_PREFIX/bin:$PATH"

# -----------------------------------------------------------------------------
# 3. Materialize the two repos inside the sandbox.
# -----------------------------------------------------------------------------
if [[ -n "$TERRARIUM_PATH" ]]; then
  echo "==> copying local agent-terrarium from $TERRARIUM_PATH"
  rsync -a --exclude node_modules --exclude .git "$TERRARIUM_PATH/" "$SANDBOX/agent-terrarium/"
else
  echo "==> cloning agent-terrarium${TERRARIUM_REF:+ @ $TERRARIUM_REF}"
  git clone --quiet "$TERRARIUM_REPO" "$SANDBOX/agent-terrarium"
  if [[ -n "$TERRARIUM_REF" ]]; then
    (cd "$SANDBOX/agent-terrarium" && git checkout --quiet "$TERRARIUM_REF")
  fi
fi

if [[ -n "$MANAGERIE_PATH" ]]; then
  echo "==> copying local claude-managerie from $MANAGERIE_PATH"
  rsync -a --exclude node_modules --exclude .git "$MANAGERIE_PATH/" "$SANDBOX/claude-managerie/"
else
  echo "==> cloning claude-managerie${MANAGERIE_REF:+ @ $MANAGERIE_REF}"
  git clone --quiet "$MANAGERIE_REPO" "$SANDBOX/claude-managerie"
  if [[ -n "$MANAGERIE_REF" ]]; then
    (cd "$SANDBOX/claude-managerie" && git checkout --quiet "$MANAGERIE_REF")
  fi
fi

# -----------------------------------------------------------------------------
# 4. Run bootstrap. AGENT_TERRARIUM_ROOT must point at the sandboxed clone or
#    the script will go looking for the user's real checkout up the tree.
# -----------------------------------------------------------------------------
export AGENT_TERRARIUM_ROOT="$SANDBOX/agent-terrarium"

# Strip the trailing "launching the garden" section in-place so MANAGERIE_ROOT
# (derived from $0's dir) still resolves to the cloned repo at runtime. Running
# from a copy at a different path would make MANAGERIE_ROOT wrong.
sed -i.bak '/^# --- 7\./,$d' "$SANDBOX/claude-managerie/bootstrap.sh"
rm -f "$SANDBOX/claude-managerie/bootstrap.sh.bak"

echo "==> running bootstrap (sandboxed)"
cd "$SANDBOX/claude-managerie"
if ./bootstrap.sh; then
  echo
  echo "==> bootstrap SUCCEEDED in sandbox"
  echo "    sandbox HOME = $HOME"
  echo "    daemon state at: $HOME/.repo-orch"
  echo "    plugin tree at: $HOME/.claude/plugins/repo-orch"
  if [[ -f "$HOME/.repo-orch/sandbox-daemon.pid" ]]; then
    pid="$(cat "$HOME/.repo-orch/sandbox-daemon.pid")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "    daemon process alive: pid=$pid"
    else
      echo "    WARNING: daemon process not alive (pid=$pid)"
    fi
  fi
  exit 0
else
  status=$?
  echo
  echo "==> bootstrap FAILED in sandbox (exit $status)"
  if [[ -s "$HOME/.repo-orch/logs/daemon.err.log" ]]; then
    echo "--- daemon.err.log ---"
    tail -50 "$HOME/.repo-orch/logs/daemon.err.log"
  fi
  if [[ -s "$HOME/.repo-orch/logs/daemon.log" ]]; then
    echo "--- daemon.log ---"
    tail -30 "$HOME/.repo-orch/logs/daemon.log"
  fi
  exit "$status"
fi
