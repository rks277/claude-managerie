import path from 'node:path';
import {
  creatureFrame,
  generateCreature,
  type CreatureConfig,
  type CreatureIdentity,
} from '../creatures/generator.js';
import type { CreatureState, RepoCreature, SetupStatus } from '../types.js';
import { ansi, paletteAccent, paletteColor } from './ansi.js';

type RenderCreature = {
  config: CreatureConfig;
  state: CreatureState;
  statusLabel: string;
  needsUserAction: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  wanderPhase: number;
  wanderRate: number;
  baseSpeed: number;
};

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type RenderModel = {
  setup: SetupStatus | null;
  connected: boolean;
  creatures: RepoCreature[];
  creatureIdentities: Map<string, CreatureIdentity>;
  allRepos: string[];
  selectedRepoPaths: Set<string> | null;
  selectionMode: boolean;
  selectionCursor: number;
  selectedRepoPath: string | null;
  message: string;
  paused: boolean;
};

export class TerminalGarden {
  private creatures = new Map<string, RenderCreature>();
  private frame = 0;

  render(model: RenderModel): string {
    const width = Math.min(140, Math.max(96, process.stdout.columns || 120));
    const height = Math.min(42, Math.max(30, (process.stdout.rows || 38) - 2));
    const grid = makeGrid(width, height);

    put(grid, 2, 0, 'claude-managerie terminal garden', ansi.fg.bone + ansi.bold);
    put(
      grid,
      Math.max(2, width - 42),
      0,
      `${model.connected ? 'connected' : 'offline'} | ${model.creatures.length} repos | q quit`,
      model.connected ? ansi.fg.moss : ansi.fg.amber,
    );

    drawDecor(grid, width, height);

    if (model.selectionMode) {
      this.renderSelection(grid, model, width, height);
      put(grid, 0, height - 1, ' '.repeat(width), ansi.bg.moss);
      put(grid, 2, height - 1, 'selection: j/k move | space toggle | a all | n none | enter close', ansi.fg.moss);
      return `${ansi.home}${grid.map((row) => row.join('')).join('\n')}${ansi.reset}`;
    }

    if (!model.connected || model.creatures.length === 0) {
      this.renderSetup(grid, model, width);
    }

    this.syncCreatures(model.creatures, model.creatureIdentities, width, height);
    if (!model.paused) this.step(width, height);

    for (const c of this.creatures.values()) {
      const sprite = creatureFrame(c.config, c.state, this.frame);
      const pulse = c.state === 'attention' && this.frame % 4 < 2;
      const bodyColor = pulse ? ansi.fg.bone + ansi.bold : paletteColor(c.config.palette);
      const accentColor = pulse ? ansi.fg.amber + ansi.bold : paletteAccent(c.config.palette);
      const bob = c.state === 'attention' ? Math.sin(this.frame / 8 + c.x) * 0.25 : 0;
      const x = Math.round(c.x);
      const y = Math.round(c.y + bob);
      sprite.forEach((line, row) => putSprite(grid, x, y + row, line, bodyColor, accentColor));
      put(grid, x + 2, y + sprite.length, labelText(c), ansi.fg.gray);
      if (c.config.repoPath === model.selectedRepoPath) {
        drawSelectionBox(grid, c, width);
      }
    }

    put(grid, 0, height - 1, ' '.repeat(width), ansi.bg.moss);
    put(grid, 2, height - 1, model.message.slice(0, width - 4), ansi.fg.moss);

    this.frame += model.paused ? 0 : 1;
    return `${ansi.home}${grid.map((row) => row.join('')).join('\n')}${ansi.reset}`;
  }

  private syncCreatures(
    creatures: RepoCreature[],
    identities: Map<string, CreatureIdentity>,
    width: number,
    height: number,
  ): void {
    const present = new Set(creatures.map((c) => c.repoPath));
    for (const repoPath of this.creatures.keys()) {
      if (!present.has(repoPath)) this.creatures.delete(repoPath);
    }

    creatures.forEach((repo, index) => {
      const existing = this.creatures.get(repo.repoPath);
      if (existing) {
        existing.state = repo.state;
        existing.statusLabel = repo.statusLabel;
        existing.needsUserAction = repo.needsUserAction;
        return;
      }

      const config = generateCreature(repo.repoPath, identities.get(repo.repoPath));
      const lane = index % 3;
      const baseSpeed = 0.052 + (config.motion + 1) * 0.012;
      this.creatures.set(repo.repoPath, {
        config,
        state: repo.state,
        statusLabel: repo.statusLabel,
        needsUserAction: repo.needsUserAction,
        ...this.initialPosition(index, config, width, height),
        vx: baseSpeed * (lane === 2 ? -1 : 1),
        vy: lane === 1 ? -baseSpeed * 0.45 : baseSpeed * 0.32,
        wanderPhase: (config.seed % 360) * (Math.PI / 180),
        wanderRate: 0.026 + (config.motion + 1) * 0.006,
        baseSpeed,
      });
    });
  }

  private step(width: number, height: number): void {
    const queueSlots = queuedCreatures(this.creatures);
    for (const c of this.creatures.values()) {
      const queueIndex = queueSlots.indexOf(c);
      if (queueIndex >= 0) {
        this.moveTowardQueue(c, queueIndex, width, height);
      } else {
        if (c.state === 'awake') this.wander(c);
        const speedBoost = c.state === 'attention' ? 1.25 : c.state === 'sleeping' ? 0.08 : 1.45;
        c.x += c.vx * speedBoost;
        c.y += c.vy * speedBoost;
        if (c.state === 'attention') c.y -= Math.sin(this.frame / 8) * 0.025;
      }

      const bounds = creatureBounds(c, width);
      if (bounds.left < 3 || bounds.right > width - 3) {
        c.vx *= -1;
        c.x = clamp(c.x, 3, width - boundsWidth(bounds) - 3);
      }
      if (bounds.top < 3 || bounds.bottom > height - 3) {
        c.vy *= -1;
        c.y = clamp(c.y, 3, height - boundsHeight(bounds) - 3);
      }
    }

    this.resolveCollisions(width, height);
  }

  private moveTowardQueue(creature: RenderCreature, queueIndex: number, width: number, height: number): void {
    const target = queueTarget(creature, queueIndex, width, height);
    const dx = target.x - creature.x;
    const dy = target.y - creature.y;
    creature.vx = creature.vx * 0.55 + dx * 0.045;
    creature.vy = creature.vy * 0.55 + dy * 0.045;
    creature.x += creature.vx;
    creature.y += creature.vy;
  }

  private wander(creature: RenderCreature): void {
    const phase = this.frame * creature.wanderRate + creature.wanderPhase;
    const desiredAngle = phase + Math.sin(phase * 0.61) * 1.35 + Math.sin(phase * 0.23) * 0.8;
    const desiredVx = Math.cos(desiredAngle) * creature.baseSpeed;
    const desiredVy = Math.sin(desiredAngle) * creature.baseSpeed * 0.9;
    creature.vx = creature.vx * 0.9 + desiredVx * 0.1;
    creature.vy = creature.vy * 0.86 + desiredVy * 0.14;
  }

  private initialPosition(index: number, config: CreatureConfig, width: number, height: number): { x: number; y: number } {
    const columns = Math.max(1, Math.floor((width - 10) / Math.max(22, config.width + 10)));
    const col = index % columns;
    const row = Math.floor(index / columns);
    const cellWidth = Math.max(22, Math.floor((width - 8) / columns));
    const x = 4 + col * cellWidth + ((index * 7) % Math.max(1, cellWidth - config.width - 4));
    const y = 4 + (row % Math.max(1, Math.floor((height - 8) / 8))) * 8;
    return {
      x: Math.min(x, width - config.width - 12),
      y: Math.min(y, height - config.height - 5),
    };
  }

  private resolveCollisions(width: number, height: number): void {
    const creatures = [...this.creatures.values()];
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < creatures.length; i += 1) {
        for (let j = i + 1; j < creatures.length; j += 1) {
          const a = creatures[i];
          const b = creatures[j];
          const ar = creatureBounds(a, width);
          const br = creatureBounds(b, width);
          if (!overlaps(ar, br)) continue;

          const overlapX = Math.min(ar.right - br.left, br.right - ar.left);
          const overlapY = Math.min(ar.bottom - br.top, br.bottom - ar.top);
          const [aShare, bShare] = collisionPushShares(a, b);
          if (overlapX < overlapY) {
            const push = overlapX + 1;
            if (a.x <= b.x) {
              a.x -= push * aShare;
              b.x += push * bShare;
            } else {
              a.x += push * aShare;
              b.x -= push * bShare;
            }
            a.vx *= a.state === 'sleeping' ? -0.35 : -0.75;
            b.vx *= b.state === 'sleeping' ? -0.35 : -0.75;
          } else {
            const push = overlapY + 1;
            if (a.y <= b.y) {
              a.y -= push * aShare;
              b.y += push * bShare;
            } else {
              a.y += push * aShare;
              b.y -= push * bShare;
            }
            a.vy *= a.state === 'sleeping' ? -0.35 : -0.75;
            b.vy *= b.state === 'sleeping' ? -0.35 : -0.75;
          }
        }
      }

      for (const c of creatures) {
        const widthWithLabel = Math.max(c.config.width, labelText(c).length + 2);
        c.x = clamp(c.x, 3, width - widthWithLabel - 3);
        c.y = clamp(c.y, 3, height - c.config.height - 5);
      }
    }
  }

  private renderSetup(grid: string[][], model: RenderModel, width: number): void {
    const lines = setupLines(model.setup);
    const x = Math.max(4, Math.floor(width / 2) - 35);
    const y = 4;
    lines.forEach((line, index) => put(grid, x, y + index, line, index === 0 ? ansi.fg.bone + ansi.bold : ansi.fg.gray));
  }

  private renderSelection(grid: string[][], model: RenderModel, width: number, height: number): void {
    const x = Math.max(3, Math.floor(width / 2) - 42);
    const y = 3;
    const selected = model.selectedRepoPaths;
    put(grid, x, y, 'repo selection', ansi.fg.bone + ansi.bold);
    put(grid, x, y + 1, 'choose which repos get creatures in the garden', ansi.fg.gray);

    if (model.allRepos.length === 0) {
      put(grid, x, y + 4, 'no known repos yet; open Claude Code in a repo first', ansi.fg.amber);
      return;
    }

    const maxRows = Math.max(5, height - y - 7);
    const cursor = Math.min(model.selectionCursor, model.allRepos.length - 1);
    const start = Math.max(0, Math.min(cursor - 4, model.allRepos.length - maxRows));
    const visible = model.allRepos.slice(start, start + maxRows);

    visible.forEach((repo, index) => {
      const actualIndex = start + index;
      const isCursor = actualIndex === cursor;
      const isSelected = selected === null || selected.has(repo);
      const marker = isCursor ? '>' : ' ';
      const check = isSelected ? '[x]' : '[ ]';
      const line = `${marker} ${check} ${repo}`.slice(0, width - x - 3);
      put(grid, x, y + 3 + index, line, isCursor ? ansi.fg.bone + ansi.bold : ansi.fg.gray);
    });
  }
}

function setupLines(setup: SetupStatus | null): string[] {
  if (!setup) return ['checking repo-orch setup...'];
  if (!setup.cliExists) {
    return [
      'agent-terrarium CLI is not built',
      `expected: ${setup.cliPath}`,
      'build ../agent-terrarium with pnpm install && pnpm -r build',
    ];
  }
  if (!setup.daemonResponding) {
    return [
      'repo-orch daemon is not responding',
      'press i to run repo-orch install',
      `socket: ${setup.socketPath}`,
      setup.error ? `last error: ${setup.error}` : '',
    ].filter(Boolean);
  }
  if (!setup.pluginExists) {
    return ['plugin source is missing', 'press i to reinstall repo-orch'];
  }
  return [
    'plugin registration step',
    'inside Claude Code, paste:',
    '/plugin marketplace add ~/.claude/plugins/repo-orch',
    '/plugin install repo-orch@repo-orch',
  ];
}

function drawDecor(grid: string[][], width: number, height: number): void {
  drawReeds(grid, width, height);
  put(
    grid,
    Math.floor(width / 2) + 20,
    height - 8,
    '::::: damp roots :::::',
    ansi.fg.moss + ansi.dim,
  );
}

// Deterministic reed clusters scattered across the canvas. Reeds are drawn
// before creatures so creature sprites naturally appear in front.
function drawReeds(grid: string[][], width: number, height: number): void {
  const reedColor = ansi.fg.moss + ansi.dim;
  const innerHeight = height - 3; // leave room for header/status bar
  // Anchors are positions in [0, 1) across the width; stable so reeds don't jitter.
  const anchors = [0.04, 0.11, 0.19, 0.27, 0.35, 0.44, 0.52, 0.61, 0.69, 0.77, 0.85, 0.93];
  for (let i = 0; i < anchors.length; i += 1) {
    const x = Math.max(1, Math.min(width - 3, Math.floor(anchors[i] * width)));
    const clusterHeight = 3 + ((i * 7) % 3); // 3-5 reeds tall
    // Alternate clusters between upper and lower bands for variety.
    const topBand = i % 2 === 0;
    const minY = 2;
    const maxY = innerHeight - clusterHeight;
    const bandStart = topBand ? minY : Math.floor(innerHeight * 0.55);
    const bandEnd = topBand ? Math.floor(innerHeight * 0.45) : maxY;
    const range = Math.max(1, bandEnd - bandStart);
    const startY = bandStart + ((i * 13) % range);
    for (let r = 0; r < clusterHeight; r += 1) {
      const y = startY + r;
      const glyph = (i + r) % 4 === 0 ? '()' : ')(';
      put(grid, x, y, glyph, reedColor);
    }
  }
}

function makeGrid(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => `${ansi.bg.dark} `));
}

function put(grid: string[][], x: number, y: number, text: string, color = ansi.reset): void {
  if (y < 0 || y >= grid.length) return;
  for (let i = 0; i < text.length; i += 1) {
    const xx = x + i;
    if (xx >= 0 && xx < grid[y].length) grid[y][xx] = `${ansi.bg.dark}${color}${text[i]}${ansi.reset}`;
  }
}

// Eyes, mouth, sparkles, sleep z's. These chars get the accent color so the
// face stands out from the body fill.
const ACCENT_CHARS = new Set(['o', 'O', 'v', 'V', '!', 'Z', 'z', '*', '•']);

function putSprite(
  grid: string[][],
  x: number,
  y: number,
  text: string,
  bodyColor: string,
  accentColor: string,
): void {
  if (y < 0 || y >= grid.length) return;
  for (let i = 0; i < text.length; i += 1) {
    const xx = x + i;
    if (xx < 0 || xx >= grid[y].length) continue;
    const ch = text[i];
    const color = ACCENT_CHARS.has(ch) ? accentColor : bodyColor;
    grid[y][xx] = `${ansi.bg.dark}${color}${ch}${ansi.reset}`;
  }
}

function shortRepo(repoPath: string): string {
  const base = path.basename(repoPath);
  return base ? `~/${base}` : repoPath;
}

function drawSelectionBox(grid: string[][], creature: RenderCreature, width: number): void {
  const bounds = creatureBounds(creature, width);
  const left = Math.round(bounds.left);
  const right = Math.round(bounds.right) - 1;
  const top = Math.round(bounds.top);
  const bottom = Math.round(bounds.bottom) - 1;
  if (right <= left || bottom <= top) return;
  const color = ansi.fg.amber + ansi.bold;
  put(grid, left, top, '┌', color);
  put(grid, right, top, '┐', color);
  put(grid, left, bottom, '└', color);
  put(grid, right, bottom, '┘', color);
  for (let x = left + 1; x < right; x += 1) {
    put(grid, x, top, '─', color);
    put(grid, x, bottom, '─', color);
  }
  for (let y = top + 1; y < bottom; y += 1) {
    put(grid, left, y, '│', color);
    put(grid, right, y, '│', color);
  }
}

function labelText(creature: RenderCreature): string {
  return `${shortRepo(creature.config.repoPath)} ${creature.statusLabel}`;
}

function creatureBounds(creature: RenderCreature, width: number): Rect {
  const labelWidth = Math.min(width - 6, labelText(creature).length + 2);
  const bodyWidth = creature.config.width;
  const reservedWidth = Math.max(bodyWidth, labelWidth);
  return {
    left: creature.x - 1,
    top: creature.y - 1,
    right: creature.x + reservedWidth + 1,
    bottom: creature.y + creature.config.height + 2,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function queuedCreatures(creatures: Map<string, RenderCreature>): RenderCreature[] {
  return [...creatures.values()]
    .filter((creature) => creature.needsUserAction)
    .sort((a, b) => a.config.repoPath.localeCompare(b.config.repoPath));
}

function queueTarget(creature: RenderCreature, queueIndex: number, width: number, height: number): { x: number; y: number } {
  const reservedWidth = Math.max(creature.config.width, labelText(creature).length + 2);
  const x = width - reservedWidth - 5;
  const y = height - creature.config.height - 5 - queueIndex * (creature.config.height + 2);
  return {
    x: clamp(x, 3, width - reservedWidth - 3),
    y: clamp(y, 3, height - creature.config.height - 5),
  };
}

function collisionPushShares(a: RenderCreature, b: RenderCreature): [number, number] {
  const aWeight = collisionWeight(a);
  const bWeight = collisionWeight(b);
  const total = aWeight + bWeight;
  return [bWeight / total, aWeight / total];
}

function collisionWeight(creature: RenderCreature): number {
  if (creature.needsUserAction) return 2;
  if (creature.state === 'sleeping') return 0.35;
  if (creature.state === 'attention') return 1.35;
  return 1.2;
}

function boundsWidth(rect: Rect): number {
  return rect.right - rect.left;
}

function boundsHeight(rect: Rect): number {
  return rect.bottom - rect.top;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
