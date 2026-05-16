# claude-managerie — Handoff Plan

## Context

The user wants to build a fun desktop frontend called **claude-managerie** that visualizes Claude Code sessions across all their repos as a "garden of procedurally generated pixel-art creatures." Each repo has its own creature; the creature's behavior reflects the state of the Claude Code session in that repo:

- **No active session** → creature sleeps.
- **Active session** → creature is awake.
- **Session needs user input** (`awaiting_input` or `awaiting_permission`) → creature comes asking for attention.

For the MVP the creature just visually flags "needs attention." In the limit the user wants to be able to click `Allow` / `Deny` directly on the creature UI, but that's stretch — not MVP.

The frontend is a **consumer** of [agent-terrarium](https://github.com/rks277/agent-terrarium), a local-first daemon already shipped and live on `main`. The user wants the claude-managerie installer to **auto-install agent-terrarium and walk the user through the one-time Claude Code plugin registration step**, so a brand new user goes from "downloaded the app" to "creature garden working" in one flow.

This plan file is the **handoff prompt** — paste it into a fresh agent session to bootstrap the claude-managerie project. It deliberately leaves stack choice open (the implementing agent picks based on their judgment).

---

## Handoff prompt (copy below into the new agent)

> You are building **claude-managerie**, a desktop frontend that shows a garden of procedurally generated pixel-art creatures, one per repo, that animate in response to live Claude Code session state.
>
> ### What you're building (MVP)
>
> 1. A **garden view**: a 2D scene rendering one 16×16 or 32×32 pixel-art creature per repo the user has selected.
> 2. **Creature states** driven by the backend:
>    - `sleeping` — no active Claude Code session in that repo.
>    - `awake` — an active session (`running`).
>    - `attention` — session is in `awaiting_input` or `awaiting_permission` (creature does something to pull the user's eye: bounce, glow, walks to the foreground, etc.).
> 3. **Repo selection UI**: list all known repos, let the user toggle which appear in the garden. Persist the selection locally.
> 4. **Procedural sprites**: deterministically derive a 16×16 or 32×32 creature from the repo's absolute path. Same repo → same creature every time. Different repos → visibly different creatures (body shape, palette, eyes, etc.). Suggested approach: hash `repoPath` → seed → drive a small parts library (body, eyes, ears, tail, palette ramp).
> 5. **Installer flow**: the claude-managerie installer/first-run experience must:
>    - Install agent-terrarium (the backend) if it isn't already present.
>    - Walk the user through the one-time Claude Code plugin registration step (see "Backend integration" below — this part Claude Code requires the human to do manually inside a Claude Code session).
>    - Verify the daemon is up and the socket is responding before declaring success.
>
> ### Stretch (not MVP)
>
> - Click a creature in the `attention` state to approve/deny the permission request directly. This requires bidirectional control which the agent-terrarium daemon does **not** currently expose (it's observation-only). Don't try to build this without first extending agent-terrarium's IPC surface.
> - Cute idle animations, dirt patches, garden decor, day/night cycle, etc.
> - Per-creature stats (token usage, session count, etc.) — agent-terrarium stores all of this.
>
> ### Tech stack
>
> **Open** — pick what fits. Considerations:
>
> - You will need to either (a) embed a Node runtime to call agent-terrarium's `runInstall()` directly, or (b) shell out to the agent-terrarium CLI (`node packages/cli/dist/index.js install`).
> - You will need a long-lived Unix-domain socket connection to the daemon.
> - You will be drawing pixel-art creatures and animating them. Canvas 2D is plenty.
>
> Likely candidates: **Electron + React + Canvas** (easiest Node integration, can `import { runInstall }` directly), **Tauri + Svelte** (smaller binary, but you must shell out for install), or a **macOS-native app** (most polish, hardest to share TS schema with). Pick one with a justification in your README.
>
> ### Backend integration — agent-terrarium reference
>
> The backend repo is at **https://github.com/rks277/agent-terrarium** (local checkout: `/Users/roshanklein-seetharaman/Documents/projects2026-old/agent-terrarium`). Read `docs/install.md` first.
>
> Key facts:
>
> - The daemon runs under launchd at label `co.repo-orch.daemon`. It writes nothing inside user repos and never writes to `~/.claude/settings.json` itself (an important spec invariant — don't violate it from claude-managerie either).
> - State lives at `~/.repo-orch/` (DB, socket, logs, install-state).
> - **Unix socket**: `~/.repo-orch/daemon.sock`. Wire format: **JSON, newline-delimited**. Server code in `packages/daemon/src/transport/socket-server.ts`; client reference in `packages/cli/src/socket-client.ts`. **Back-pressure is silent drop**: if your client doesn't drain fast enough, the daemon discards events for that client without telling you. Treat any reconnect as needing a fresh `status` snapshot to re-sync.
>
> #### Daemon methods
>
> All requests are `{ "op": "<method>", ... }` on one line. All responses (and stream messages) are one line of JSON.
>
> | Method | Request | Response | Long-lived? |
> |---|---|---|---|
> | `ping` | `{"op":"ping"}` | `{"pong":true}` | No |
> | `status` | `{"op":"status"}` | `{"sessions": SessionRow[]}` | No |
> | `health` | `{"op":"health"}` | `{"health":{"eventsLast24h":N,"sessions":N}}` | No |
> | `subscribe` | `{"op":"subscribe","filter":{...}}` | `{"ok":true}` ack, then a stream of `{"event": EventEnvelope}` | **Yes** |
>
> `SubscribeFilter` shape: `{ sessionId?: string; type?: string; repoPath?: string }`. `type` supports `*` glob.
>
> #### `SessionRow` shape (from `packages/core/src/schema/session.ts`)
>
> ```ts
> {
>   sessionId: string;
>   repoPath: string;     // <-- THE creature identity key
>   source: 'claude-code';
>   state: 'unknown' | 'running' | 'awaiting_input' | 'awaiting_permission' | 'ended';
>   startedAt: string;    // ISO
>   endedAt: string | null;
>   model: string | null;
>   transcriptPath: string | null;
>   pid: number | null;
> }
> ```
>
> #### Creature-state mapping
>
> | Session state | Creature state |
> |---|---|
> | no row in `status` for this `repoPath`, OR `ended` | `sleeping` |
> | `running` | `awake` |
> | `awaiting_input` or `awaiting_permission` | `attention` |
> | `unknown` | `awake` (treat as just-started) |
>
> A repo with **multiple concurrent sessions** should aggregate: if any is `attention` → `attention`; else if any `awake` → `awake`; else `sleeping`.
>
> #### `EventEnvelope` shape (from `packages/core/src/schema/events.ts`)
>
> ```ts
> {
>   eventId: string;
>   type: EventType;
>   source: 'claude-code';
>   sessionId: string;
>   repoPath: string;
>   occurredAt: string;
>   ingestedAt: string;
>   payload: PayloadFor<type>;
> }
> ```
>
> Nine event types: `session.started`, `session.ended`, `session.state_changed`, `prompt.submitted`, `assistant.turn_completed`, `tool.used`, `permission.requested`, `permission.resolved`, `notification.received`.
>
> For MVP you mostly care about `session.started`, `session.ended`, and `session.state_changed` (these drive the sleeping/awake/attention transitions). The rest are gravy for future features (token totals, tool-use chips, etc.).
>
> #### Programmatic install API
>
> Exported from `@repo-orch/cli` (`packages/cli/src/commands/install.ts`):
>
> ```ts
> import { runInstall } from '@repo-orch/cli/commands/install';
> // Returns Promise<number> — 0 on success, 1 on failure.
> await runInstall({
>   home?: string,         // override $HOME, for tests
>   noLaunchctl?: boolean, // skip launchctl load (tests only)
>   force?: boolean,       // reinstall over an existing install
> });
> ```
>
> Side effects:
> - Creates `~/.repo-orch/` tree (DB, socket, logs, `install-state.json`).
> - Drops the plugin tree at `~/.claude/plugins/repo-orch/`.
> - Writes `~/Library/LaunchAgents/co.repo-orch.daemon.plist` and `launchctl load`s it.
> - **Does NOT modify `~/.claude/settings.json`.** That file is read once to record a SHA256 baseline in `install-state.json` (used for the byte-identity contract check), but is never written.
>
> Uninstall has an analogous `runUninstall({ yes: true, purge?: boolean, ... })`.
>
> #### The manual Claude Code plugin registration step
>
> **This is the gotcha that drives most of the installer UX.** Claude Code does *not* auto-discover plugins file-dropped at `~/.claude/plugins/repo-orch/` on the tested versions. The user must run, inside a Claude Code session:
>
> ```
> /plugin marketplace add ~/.claude/plugins/repo-orch
> /plugin install repo-orch@repo-orch
> ```
>
> Until they do, the daemon still ingests events from transcript files (so the creature garden mostly works — you'll see session start/end and prompt submissions), but **hook-derived events are missing** (`permission.requested` and `permission.resolved` won't fire from the hook path, only from transcript-derived heuristics — meaning the `attention` state for permission prompts is delayed).
>
> Your installer flow should:
>
> 1. Run `runInstall(...)` from agent-terrarium.
> 2. Poll the daemon socket (`{"op":"ping"}`) until it's up.
> 3. Show a step in the UI: "Open Claude Code and paste these two lines" with a copy button. Don't try to automate it — there's no API. The user has to do it once.
> 4. Optionally, poll for the first hook-derived event (e.g. a `permission.requested` from any session) before declaring setup complete, OR offer a "Skip — I'll do this later" button.
>
> ### Procedural pixel-art creatures
>
> Deterministic seed: hash `repoPath` (SHA-256 truncated to 32 bits is plenty). Use the seed to:
>
> - Pick a body silhouette from a parts library (5–10 silhouettes is enough variety for hundreds of repos).
> - Pick eye style, ear/horn style, tail style, mouth.
> - Pick a 3-color palette from a curated palette set (DB16, PICO-8, or similar — looks much better than random RGB).
> - Pick an idle animation pattern (bobbing, breathing, ear-flick frequency).
>
> Animation states:
>
> - `sleeping`: ZZZ particle above, eyes closed, slow breathing.
> - `awake`: eyes open, occasional idle animations.
> - `attention`: bounces / flashes / walks toward foreground / "!" particle.
>
> ### Constraints (inherited from agent-terrarium spec)
>
> 1. **Never write inside user repos.** All claude-managerie state goes in its own app-data dir.
> 2. **Never modify `~/.claude/settings.json`.** Display instructions for the user to run the plugin commands; do not patch the file yourself.
> 3. **No network calls** for the MVP. Local-first.
> 4. The backend is observation-only. Don't pretend you can approve/deny permissions in MVP.
>
> ### Verification (end-to-end smoke test)
>
> 1. Fresh machine with `claude` installed but agent-terrarium NOT installed.
> 2. Launch claude-managerie. Walk through onboarding.
> 3. After onboarding: `~/.repo-orch/state.db` exists, `launchctl list | grep co.repo-orch.daemon` shows the job, `~/.claude/plugins/repo-orch/` exists.
> 4. Open `claude` in a repo. Garden shows that repo's creature wake up within a second or two.
> 5. Ask Claude to do something that triggers a permission prompt. Creature should switch to `attention` state.
> 6. `/exit`. Creature goes back to sleeping.
> 7. Uninstall claude-managerie. agent-terrarium should also be cleanly removed (or the user should be offered the choice).

---

## Files to read before starting (for the implementing agent)

| Path | Why |
|---|---|
| `https://github.com/rks277/agent-terrarium/blob/main/README.md` | Top-level intro |
| `https://github.com/rks277/agent-terrarium/blob/main/docs/install.md` | The user-facing install flow you're embedding |
| `packages/core/src/schema/events.ts` | Canonical event types and payloads |
| `packages/core/src/schema/session.ts` | `SessionRow` shape and `SessionState` enum |
| `packages/daemon/src/transport/socket-server.ts` | Wire protocol for the socket |
| `packages/cli/src/socket-client.ts` | Reference client implementation |
| `packages/cli/src/commands/install.ts` | `runInstall()` signature and side effects |
| `packages/cli/src/commands/uninstall.ts` | `runUninstall()` signature and side effects |

## Open questions the implementing agent should answer in their own README

- Which stack and why (Electron / Tauri / SwiftUI / web app served by daemon / something else).
- Strategy for the manual plugin-registration step (single screen with copy buttons? Background poll until hooks fire? "Skip for now"?).
- Where claude-managerie's own state lives (selected creatures, layout, palette overrides).
- What happens on uninstall — does claude-managerie also offer to `repo-orch uninstall --purge`, or is that a separate user action?

## Verification of THIS plan (the handoff)

Hand the prompt section above to a fresh agent. The agent should be able to:
- Pick a stack and justify it.
- Scaffold a project that calls `runInstall()` (or shells out to it) and connects to the daemon socket.
- Render a single deterministic creature for a given `repoPath`.
- Subscribe to events and update the creature state in real time.

If any of the above is blocked because the prompt is ambiguous, that's a bug in this plan — come back and tighten it.
