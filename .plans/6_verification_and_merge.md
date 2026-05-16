# 6. Verification And Merge

## Goal
Integrate the backend and UI worktree branches safely, then verify the complete dev web MVP end to end.

## Implementation Steps
1. Confirm both agents have committed their branches:
   - Backend branch: `feat/backend-integration`.
   - UI branch: `feat/ui-iteration`.
2. From the main repo, merge backend first:

```sh
git merge --no-ff feat/backend-integration -m "Merge backend integration"
```

3. Run backend-focused checks:
   - `npm run typecheck`
   - bridge tests
   - fake socket tests
4. Merge UI second:

```sh
git merge --no-ff feat/ui-iteration -m "Merge UI iteration"
```

5. Resolve conflicts intentionally:
   - Preserve backend bridge API behavior.
   - Preserve UI API client calls unless the shared type contract changed.
   - Re-run typecheck after each conflict resolution pass.
6. Run full checks:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
   - `npm run dev` for manual validation.
7. Manual smoke test:
   - Ensure `../agent-terrarium` exists and is built.
   - Start claude-managerie.
   - Run setup install if needed.
   - Confirm daemon ping succeeds.
   - Copy plugin registration commands into Claude Code.
   - Open Claude Code in a repo and confirm its creature wakes.
   - Trigger an input or permission wait and confirm attention state.
   - Exit Claude Code and confirm sleeping state.

## Agent Ownership
Primary: Main Integrator.

Secondary: Backend Agent and UI Agent.

Main Integrator owns final merge order, conflict resolution, full test execution, and manual smoke validation. Backend Agent should be available for bridge/API failures. UI Agent should be available for rendering or interaction regressions.

## Git Worktree Notes
Run integration from the main repo, not from either feature worktree.

Recommended sequence:

```sh
git status --short
git branch --show-current
git merge --no-ff feat/backend-integration -m "Merge backend integration"
npm run typecheck
npm test
git merge --no-ff feat/ui-iteration -m "Merge UI iteration"
npm run typecheck
npm test
npm run build
```

Do not use `git reset --hard` to resolve conflicts. Do not remove worktrees until the merged main repo has passed checks. After successful integration, worktrees can be removed with `git worktree remove` only if they are clean and no longer needed.

## Acceptance Criteria
- Main branch contains both backend bridge and UI garden implementation.
- Full test suite and typecheck pass after both merges.
- Dev app starts with one command.
- Manual smoke test validates setup, daemon status, live sessions, repo selection, and creature state transitions.
- No implementation writes inside user repos or modifies `~/.claude/settings.json`.
