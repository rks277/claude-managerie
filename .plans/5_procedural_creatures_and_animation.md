# 5. Procedural Creatures And Animation

## Goal
Render a deterministic pixel-art creature per repo path and animate it according to the aggregated creature state.

## Implementation Steps
1. Implement deterministic generation:
   - Hash absolute `repoPath` to a 32-bit seed.
   - Use seeded selection for body silhouette, palette, eyes, ears/horns, tail, mouth, and idle animation variant.
   - Same repo path must always generate the same creature config.
2. Use a curated palette set instead of random RGB.
3. Render on Canvas 2D:
   - Use fixed logical pixel size, such as 16x16 or 32x32.
   - Scale with nearest-neighbor rendering for crisp pixels.
   - Keep layout dimensions stable so animation does not shift surrounding UI.
4. Implement state animation:
   - `sleeping`: eyes closed, slow breathing, small ZZZ particle.
   - `awake`: eyes open, subtle idle motion.
   - `attention`: bounce or pulse plus a clear attention particle.
5. Keep creature generation pure and testable separately from Canvas drawing.
6. Respect frontend design constraints:
   - Build the actual garden as the first screen after setup.
   - Avoid decorative card-heavy layout.
   - Do not use one-note palettes or large marketing-style hero sections.

## Agent Ownership
Primary: UI Agent.

Secondary: none.

UI Agent owns creature generation, Canvas rendering, animation timing, garden layout, and visual tests. Backend Agent should not edit creature rendering files.

## Git Worktree Notes
UI Agent works in `../claude-managerie-ui` on `feat/ui-iteration`.

Keep this branch away from bridge/server implementation files. If rendering needs new event data, add a fixture and coordinate an API change instead of editing backend code directly.

Before starting:

```sh
git status --short
git branch --show-current
```

Before handoff, commit all creature rendering changes with screenshots or test notes in the commit message when useful.

## Acceptance Criteria
- Same repo path produces identical creature config across reloads.
- Different repo paths usually produce visibly different creatures.
- Sleeping, awake, and attention states are visually distinct.
- Canvas output is crisp and nonblank at desktop and narrow widths.
- Tests cover deterministic generation and basic animation state selection.
