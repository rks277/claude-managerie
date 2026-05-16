# 1. Scaffold Dev Web App

## Goal
Create the initial claude-managerie dev web MVP scaffold: a TypeScript Vite + React browser app plus a Node bridge process. The app is not packaged as a desktop app in this milestone; it should run locally for development with one command.

## Implementation Steps
1. Initialize the repository if needed:
   - Run `git init` from the main repo before creating worktrees.
   - Commit `.specs/` and `.plans/` first so both worktrees start from the same base.
2. Create the dev app structure:
   - `package.json` with scripts for `dev`, `dev:client`, `dev:bridge`, `build`, `typecheck`, and `test`.
   - `src/client/` for React UI code.
   - `src/bridge/` for the Node bridge server.
   - `src/shared/` for types shared between UI and bridge.
3. Use Vite + React + TypeScript for the client.
4. Use a small Node HTTP bridge server for API endpoints and SSE.
5. Configure concurrent dev startup so `npm run dev` starts both bridge and Vite.
6. Add a README section explaining:
   - The MVP is dev web first.
   - Desktop packaging is deferred.
   - agent-terrarium is consumed from the sibling checkout at `../agent-terrarium`.
7. Add baseline quality tooling:
   - TypeScript strict enough to catch API/type mismatches.
   - Vitest for unit tests.
   - React Testing Library only if UI tests need DOM interaction in later milestones.

## Agent Ownership
Primary: Backend Agent.

Secondary: UI Agent.

Backend Agent owns the initial repository scaffold, package scripts, bridge entrypoint, shared type folder, and dev process wiring. UI Agent may add client structure after the scaffold exists, but should avoid changing bridge startup or package scripts unless coordinating through a shared commit.

## Git Worktree Notes
Use two worktrees:

```sh
git worktree add -b feat/backend-integration ../claude-managerie-backend
git worktree add -b feat/ui-iteration ../claude-managerie-ui
```

Backend Agent works only in `../claude-managerie-backend` on `feat/backend-integration`.

UI Agent works only in `../claude-managerie-ui` on `feat/ui-iteration`.

For this milestone, backend lands scaffold first. UI should merge or rebase the backend scaffold before adding heavy UI work, because both agents otherwise need to touch `package.json`, TypeScript config, and base source directories.

Before starting:

```sh
git status --short
git branch --show-current
```

Before handoff, commit all changes on the agent branch with a focused message. Do not run destructive git commands, remove the other worktree, or edit files in the other agent's worktree.

## Acceptance Criteria
- `npm run dev` starts both the bridge and Vite client.
- `npm run typecheck` succeeds.
- `npm test` runs, even if only placeholder tests exist at this point.
- README documents the dev web MVP choice and sibling backend assumption.
