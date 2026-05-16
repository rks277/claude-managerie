# 3. Onboarding And Setup Flow

## Goal
Build the first-run UI that guides a new user from no backend installed to a working local daemon, then walks them through Claude Code's required manual plugin registration.

## Implementation Steps
1. On app load, call `GET /api/setup/status`.
2. Display setup states:
   - Backend CLI missing or unbuilt.
   - agent-terrarium installed but daemon not responding.
   - Daemon responding but plugin directory missing.
   - Daemon ready and plugin source installed.
   - Plugin registration instructions pending or skipped.
3. Add an install action:
   - Button calls `POST /api/setup/install`.
   - Show command progress and failure details from stdout/stderr.
   - Poll setup status until daemon ping succeeds.
4. Add plugin registration step:
   - Show exactly these commands with copy buttons:

```txt
/plugin marketplace add ~/.claude/plugins/repo-orch
/plugin install repo-orch@repo-orch
```

   - Explain in UI copy that this must be pasted inside Claude Code and cannot be automated.
   - Provide "I've done this" and "Skip for now" actions.
5. Store local onboarding completion state in browser `localStorage`, separate from repo selection.
6. Never edit `~/.claude/settings.json`; only display instructions.
7. If setup is skipped, allow the garden UI to open but keep a visible setup status indicator.

## Agent Ownership
Primary: UI Agent.

Secondary: Backend Agent.

UI Agent owns screens, state transitions, copy buttons, loading/error states, and local completion state. Backend Agent owns the status/install API shape and command execution behavior needed by this flow.

## Git Worktree Notes
UI Agent works in `../claude-managerie-ui` on `feat/ui-iteration`.

Backend Agent works in `../claude-managerie-backend` on `feat/backend-integration`.

UI should isolate all bridge calls behind a small API client so mocked responses can be swapped for real bridge responses after merge. If endpoint response fields are missing, UI Agent should add a typed TODO/fixture rather than editing bridge implementation from the UI worktree.

Before starting:

```sh
git status --short
git branch --show-current
```

Before handoff, commit all UI onboarding changes. Do not modify bridge server files from the UI branch.

## Acceptance Criteria
- First-run screen correctly distinguishes missing, installing, ready, and skipped states.
- Install button calls the bridge and surfaces command failures.
- Plugin commands are copyable and exactly match the spec.
- User can skip setup and still reach the garden with a status warning.
- Tests cover setup state rendering and install action behavior with mocked API responses.
