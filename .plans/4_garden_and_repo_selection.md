# 4. Garden And Repo Selection

## Goal
Build the main garden experience: list known repos from daemon session data, let users choose which repos appear, and map session states into creature states.

## Implementation Steps
1. Fetch initial data from `GET /api/sessions`.
2. Subscribe to `GET /api/events` for live updates.
3. Maintain a client-side session store keyed by `repoPath`.
4. Aggregate creature state per repo:
   - No row for repo, or only `ended` rows: `sleeping`.
   - Any `awaiting_input` or `awaiting_permission`: `attention`.
   - Else any `running` or `unknown`: `awake`.
   - Attention wins over awake when multiple sessions exist for a repo.
5. Build repo selection UI:
   - List all repo paths known from daemon session rows.
   - Toggle which repos appear in the garden.
   - Persist selected repo paths in `localStorage` under `claude-managerie:selectedRepoPaths:v1`.
6. Decide first-run selection behavior:
   - If no selection exists, show all known repos.
   - Once the user changes selection, honor that selection exactly.
7. Build garden states:
   - Empty: no known repos yet.
   - No selected repos.
   - Daemon disconnected.
   - Live event stream reconnecting.
8. Keep repo selection and garden state separate from onboarding state.

## Agent Ownership
Primary: UI Agent.

Secondary: Backend Agent.

UI Agent owns the session aggregation model, repo selection UI, persistence, garden state display, and UI tests. Backend Agent owns accurate session snapshots and event delivery from the bridge.

## Git Worktree Notes
UI Agent works in `../claude-managerie-ui` on `feat/ui-iteration`.

Backend Agent works in `../claude-managerie-backend` on `feat/backend-integration`.

UI should develop against fixtures matching `SessionRow` and `EventEnvelope`. Backend must preserve the canonical agent-terrarium shapes and should not invent alternate session schemas for the UI.

Before starting:

```sh
git status --short
git branch --show-current
```

Before handoff, commit all garden and selection changes. Avoid editing bridge socket code from the UI branch.

## Acceptance Criteria
- Known repos appear from session snapshots.
- Repo selection persists across reloads.
- Creature state aggregation handles multiple concurrent sessions for one repo.
- Live events update the visible creature state without full page reload.
- Tests cover aggregation, persistence, and disconnected/empty states.
