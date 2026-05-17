import path from 'node:path';
import type { CreatureState } from '../types.js';

export type CreatureConfig = {
  repoPath: string;
  name: string;
  seed: number;
  palette: number;
  body: number;
  variant: number;
  mark: number;
  head: number;
  tail: number;
  gait: number;
  width: number;
  height: number;
};

type SpriteArchetype = {
  name: string;
  width: number;
  height: number;
  frames: Record<CreatureState, string[][]>;
};

export type CreatureIdentity = {
  version: 1;
  seed: number;
  palette: number;
  body: number;
  variant: number;
  mark: number;
  gait: number;
};

const archetypes: SpriteArchetype[] = [
  {
    name: 'block buddy',
    width: 14,
    height: 5,
    frames: {
      sleeping: [
        [' zZ           ', '  ████████    ', '▄██ ██ ██▄   ', '██████████   ', '  ▀ ▀  ▀ ▀   '],
        ['   zZ         ', '  ████████    ', '▄██ ██ ██▄   ', '██████████   ', '   ▀ ▀ ▀ ▀   '],
      ],
      awake: [
        ['              ', '  ████████    ', '▄██  ██  ██▄ ', '███████████  ', '  ▀ ▀  ▀ ▀   '],
        ['              ', '  ████████    ', '▄██  ██  ██▄ ', '███████████  ', '   ▀ ▀ ▀ ▀   '],
      ],
      attention: [
        ['  !!!         ', ' ▄████████▄   ', '███  ██  ███ ', '██████!████  ', '  ▀ ▀  ▀ ▀   '],
        ['   !          ', ' ▄████████▄   ', '███  ██  ███ ', '██████!████  ', '   ▀ ▀ ▀ ▀   '],
      ],
    },
  },
  {
    name: 'wide buddy',
    width: 16,
    height: 5,
    frames: {
      sleeping: [
        [' zZ             ', '  ████████████  ', '▄███ ██  ██ ███▄', '███████████████ ', '   ▀ ▀  ▀ ▀     '],
        ['   zZ           ', '  ████████████  ', '▄███ ██  ██ ███▄', '███████████████ ', '    ▀ ▀ ▀ ▀     '],
      ],
      awake: [
        ['                ', '  ████████████  ', '▄███  ██  ██  ▄', '██████████████ ', '   ▀ ▀  ▀ ▀    '],
        ['                ', '  ████████████  ', '▄  ██  ██  ███▄', '██████████████ ', '    ▀ ▀ ▀ ▀    '],
      ],
      attention: [
        ['  !!!           ', ' ▄████████████▄ ', '▄███  ██  ██  ▄', '███████!!█████ ', '   ▀ ▀  ▀ ▀    '],
        ['   !            ', ' ▄████████████▄ ', '▄  ██  ██  ███▄', '███████!!█████ ', '    ▀ ▀ ▀ ▀    '],
      ],
    },
  },
  {
    name: 'tiny crawler',
    width: 13,
    height: 5,
    frames: {
      sleeping: [
        [' zZ          ', '  ██████     ', '▄██ ██ ██▄  ', '█████████   ', ' ▀ ▀  ▀ ▀   '],
        ['   zZ        ', '  ██████     ', '▄██ ██ ██▄  ', '█████████   ', '  ▀ ▀ ▀ ▀   '],
      ],
      awake: [
        ['             ', '  ██████     ', '▄██  ██  █▄ ', '█████████   ', ' ▀ ▀  ▀ ▀   '],
        ['             ', '  ██████     ', '▄██  ██  █▄ ', '█████████   ', '  ▀ ▀ ▀ ▀   '],
      ],
      attention: [
        [' !!!         ', ' ▄██████▄    ', '███  ██  ██ ', '████!!███   ', ' ▀ ▀  ▀ ▀   '],
        ['  !          ', ' ▄██████▄    ', '███  ██  ██ ', '████!!███   ', '  ▀ ▀ ▀ ▀   '],
      ],
    },
  },
  {
    name: 'ear buddy',
    width: 14,
    height: 5,
    frames: {
      sleeping: [
        [' zZ           ', ' ▀█    █▀     ', '  ██████      ', '▄██ ██ ██▄   ', '█████████    '],
        ['   zZ         ', '  █▀  ▀█      ', '  ██████      ', '▄██ ██ ██▄   ', '█████████    '],
      ],
      awake: [
        ['              ', ' ▀█    █▀     ', '  ██████      ', '▄██  ██  ██▄ ', '██████████   '],
        ['              ', '  █▀  ▀█      ', '  ██████      ', '▄██  ██  ██▄ ', '██████████   '],
      ],
      attention: [
        ['  !!!         ', ' ▀█    █▀     ', ' ▄██████▄     ', '███  ██  ███ ', '█████!███    '],
        ['   !          ', '  █▀  ▀█      ', ' ▄██████▄     ', '███  ██  ███ ', '█████!███    '],
      ],
    },
  },
  {
    name: 'tail buddy',
    width: 15,
    height: 5,
    frames: {
      sleeping: [
        [' zZ            ', '  ████████     ', '▄██ ██ ██▄~~  ', '██████████    ', '  ▀ ▀  ▀ ▀    '],
        ['   zZ          ', '  ████████     ', '~~▄██ ██ ██▄  ', ' ██████████   ', '   ▀ ▀ ▀ ▀    '],
      ],
      awake: [
        ['               ', '  ████████     ', '▄██  ██  ██~~ ', '███████████   ', '  ▀ ▀  ▀ ▀    '],
        ['               ', '  ████████     ', '~~██  ██  ██▄ ', '███████████   ', '   ▀ ▀ ▀ ▀    '],
      ],
      attention: [
        ['  !!!          ', ' ▄████████▄    ', '███  ██  ██~~ ', '██████!████   ', '  ▀ ▀  ▀ ▀    '],
        ['   !           ', ' ▄████████▄    ', '~~██  ██  ███ ', '██████!████   ', '   ▀ ▀ ▀ ▀    '],
      ],
    },
  },
  {
    name: 'roundlet',
    width: 13,
    height: 5,
    frames: {
      sleeping: [
        [' zZ          ', '  ▄████▄     ', ' ██ ██ ██    ', ' ████████    ', '   ▀  ▀      '],
        ['   zZ        ', '  ▄████▄     ', ' ██ ██ ██    ', ' ████████    ', '    ▀▀       '],
      ],
      awake: [
        ['             ', '  ▄████▄     ', ' ██  ██ ██   ', ' ████████    ', '   ▀  ▀      '],
        ['             ', '  ▄████▄     ', ' ██  ██ ██   ', ' ████████    ', '    ▀▀       '],
      ],
      attention: [
        [' !!!         ', '  ▄████▄     ', '███  ██ ██   ', ' ████!███    ', '   ▀  ▀      '],
        ['  !          ', '  ▄████▄     ', '███  ██ ██   ', ' ████!███    ', '    ▀▀       '],
      ],
    },
  },
];

export function createCreatureIdentity(repoPath: string, salt = 0): CreatureIdentity {
  const seed = hash32(salt === 0 ? repoPath : `${repoPath}#${salt}`);
  return {
    version: 1,
    seed,
    palette: (seed >>> 3) % 6,
    body: seed % archetypes.length,
    variant: (seed >>> 5) % 8,
    mark: (seed >>> 13) % 12,
    gait: (seed >>> 17) % 4,
  };
}

export function generateCreature(repoPath: string, identity = createCreatureIdentity(repoPath)): CreatureConfig {
  const body = identity.body % archetypes.length;
  const archetype = archetypes[body];
  return {
    repoPath,
    name: path.basename(repoPath) || repoPath,
    seed: identity.seed,
    palette: identity.palette,
    body,
    variant: identity.variant,
    mark: identity.mark,
    head: (identity.seed >>> 7) % 5,
    tail: (identity.seed >>> 11) % 5,
    gait: identity.gait,
    width: archetype.width,
    height: archetype.height,
  };
}

export function creatureFrame(config: CreatureConfig, state: CreatureState, frame: number): string[] {
  const archetype = archetypes[config.body];
  const frames = archetype.frames[state];
  return frames[Math.floor(frame / (4 + config.gait)) % frames.length]
    .map((line) => applyVariant(line, config.variant))
    .map((line, row) => applyMark(line, row, config.mark));
}

export function creatureArchetypeName(config: CreatureConfig): string {
  return archetypes[config.body].name;
}

export function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function applyVariant(line: string, variant: number): string {
  if (variant % 4 === 0) return line.replaceAll('█', '▓');
  if (variant % 4 === 1) return line.replaceAll('~', '≈');
  if (variant % 4 === 2) return line.replaceAll('█', '▒');
  return line;
}

function applyMark(line: string, row: number, mark: number): string {
  const chars = [...line];
  if (row === 0 && mark % 4 === 0 && chars.length > 5) chars[4] = '^';
  if (row === 0 && mark % 4 === 1 && chars.length > 7) chars[6] = '.';
  if (row === 1 && mark % 4 === 2 && chars.length > 3) chars[2] = '▄';
  if (row === 2 && mark % 4 === 3 && chars.length > 4) chars[3] = '•';
  if (row === 4 && mark >= 8 && chars.length > 8) chars[8] = mark % 2 === 0 ? '\'' : ',';
  return chars.join('');
}
