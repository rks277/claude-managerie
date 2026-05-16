# 2. agent-terrarium Bridge

## Goal
Build the local Node bridge that lets the browser app interact with agent-terrarium without the browser touching Unix sockets or shell commands directly.

## Implementation Steps
1. Resolve backend paths:
   - Default `AGENT_TERRARIUM_ROOT` to `../agent-terrarium` relative to the claude-managerie repo.
   - Allow override through the `AGENT_TERRARIUM_ROOT` environment variable.
   - CLI path is `<agent-terrarium-root>/packages/cli/dist/index.js`.
2. Implement a daemon socket client in `src/bridge/`:
   - Connect to `~/.repo-orch/daemon.sock`.
   - Send one JSON request per line.
   - Parse newline-delimited JSON responses.
   - Support `ping`, `status`, `health`, and `subscribe`.
   - On reconnect after a stream failure, fetch a fresh `status` snapshot before resuming live events.
3. Implement bridge APIs:
   - `GET /api/setup/status`: returns CLI availability, socket existence, daemon ping result, health result, plugin directory existence, and any actionable error text.
   - `POST /api/setup/install`: runs `node <cli> install`, with optional `force`.
   - `POST /api/setup/uninstall`: runs `node <cli> uninstall --yes`, with optional `purge`.
   - `GET /api/sessions`: returns daemon `status` as JSON.
   - `GET /api/events`: SSE stream that subscribes to daemon events and forwards `status` snapshots plus live events.
4. Avoid direct imports from `@repo-orch/cli` for MVP. Shell out to the built CLI to avoid cross-workspace package resolution and packaging decisions.
5. Capture command stdout/stderr and return structured failure details to the UI.
6. Do not write inside user repos and do not edit `~/.claude/settings.json`.

## Agent Ownership
Primary: Backend Agent.

Secondary: none.

Backend Agent owns the bridge server, Unix socket client, setup/install/uninstall command wrappers, shared backend-facing response types, and bridge tests. UI Agent consumes the agreed API through a client wrapper and should not edit bridge internals.

## Git Worktree Notes
Backend Agent works in `../claude-managerie-backend` on `feat/backend-integration`.

UI Agent should use mocked API responses until this branch is merged or until a shared API client/type contract is committed. If Backend Agent changes endpoint response shapes, update the shared types and notify UI Agent before continuing.

Before starting:

```sh
git status --short
git branch --show-current
```

Before handoff, commit all backend bridge changes. Do not edit UI renderer or styling files from this worktree except for minimal fixtures needed by bridge tests.

## Acceptance Criteria
- Bridge can ping a running daemon.
- Bridge can return `status` sessions.
- Bridge can expose live daemon events through SSE.
- Install endpoint runs the local sibling CLI and reports success/failure.
- Tests cover socket parsing, command failures, and reconnect/resync behavior with a fake socket server.
