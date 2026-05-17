import path from 'node:path';
import type { CreatureState } from '../types.js';

export type CreatureConfig = {
  repoPath: string;
  name: string;
  seed: number;
  palette: number;
  species: number;
  detail: number;
  mark: number;
  motion: number;
  width: number;
  height: number;
};

type SpriteSpecies = {
  name: string;
  width: number;
  height: number;
  frames: Record<CreatureState, string[][]>;
};

export type CreatureIdentity = {
  version: 2;
  seed: number;
  palette: number;
  species: number;
  detail: number;
  mark: number;
  motion: number;
};

const IDENTITY_VERSION = 2;

const species: SpriteSpecies[] = [
  {
    name: 'ember fox',
    width: 17,
    height: 6,
    frames: {
      sleeping: [
        [' zZ              ', ' /\\        /\\    ', '(  )██████(  )   ', ' \\/██-██-██\\/    ', '  ████████\\~~    ', '   /_/  \\_\\      '],
        ['   zZ            ', ' /\\        /\\    ', '(  )██████(  )   ', ' \\/██-██-██\\/    ', '~~/████████      ', '    \\_\\  /_/     '],
      ],
      awake: [
        [' /\\        /\\    ', '(  )██████(  )   ', ' \\/██o██o██\\/    ', '  ████vv████\\~~  ', '  ██████████     ', '   /_/  \\_\\      '],
        [' /\\        /\\    ', '(  )██████(  )   ', ' \\/██o██o██\\/    ', '~~/████vv████    ', '   ██████████    ', '    \\_\\  /_/     '],
      ],
      attention: [
        ['  !!!            ', '/\\          /\\   ', '(  )██████(  )   ', ' \\/██O!!O██\\/    ', '  ██████████\\~~  ', '   /_/  \\_\\      '],
        ['   !             ', '/\\          /\\   ', '(  )██████(  )   ', '~~/██O!!O██\\     ', '   ██████████    ', '    \\_\\  /_/     '],
      ],
    },
  },
  {
    name: 'moon owl',
    width: 15,
    height: 7,
    frames: {
      sleeping: [
        [' zZ            ', '   /\\___/\\     ', '  /███████\\    ', ' (██-██-██)    ', '/███\\___/██\\   ', '   ███████     ', '   ^^   ^^     '],
        ['   zZ          ', '   /\\___/\\     ', '  /███████\\    ', ' (██-██-██)    ', '/███\\___/██\\   ', '   ███████     ', '    ^^ ^^      '],
      ],
      awake: [
        ['               ', '   /\\___/\\     ', '  /███████\\    ', ' (██o██o██)    ', '/███\\_v_/██\\   ', '   ███████     ', '   ^^   ^^     '],
        ['               ', '   /\\___/\\     ', '  /███████\\    ', ' (██o██o██)    ', '/███\\_v_/██\\   ', '   ███████     ', '    ^^ ^^      '],
      ],
      attention: [
        ['  !!!          ', ' \\/\\___/\\/     ', '  /███████\\    ', ' (██O!!O██)    ', '/███\\_!_/██\\   ', '   ███████     ', '   ^^   ^^     '],
        ['   !           ', ' \\/\\___/\\/     ', '  /███████\\    ', ' (██O!!O██)    ', '/███\\_!_/██\\   ', '   ███████     ', '    ^^ ^^      '],
      ],
    },
  },
  {
    name: 'reef octopus',
    width: 18,
    height: 7,
    frames: {
      sleeping: [
        [' zZ               ', '    .██████.     ', '  .██████████.   ', '  ███-████-███   ', '   ██████████    ', '  ~~/~~\\/~~\\~~   ', '    ~~    ~~     '],
        ['   zZ             ', '    .██████.     ', '  .██████████.   ', '  ███-████-███   ', '   ██████████    ', '   ~~\\/~~\\/~~    ', '  ~~        ~~   '],
      ],
      awake: [
        ['    .██████.     ', '  .██████████.   ', '  ███o████o███   ', '   ████vv████    ', '  ████████████   ', '  ~~/~~\\/~~\\~~   ', '    ~~    ~~     '],
        ['    .██████.     ', '  .██████████.   ', '  ███o████o███   ', '   ████vv████    ', '  ████████████   ', '   ~~\\/~~\\/~~    ', '  ~~        ~~   '],
      ],
      attention: [
        ['  !!!             ', '    .██████.     ', '  .██████████.   ', '  ███O!!!!O███   ', '  ████████████   ', '  ~~/~~\\/~~\\~~   ', ' ~~  ~~  ~~  ~~  '],
        ['   !              ', '    .██████.     ', '  .██████████.   ', '  ███O!!!!O███   ', '  ████████████   ', ' ~~\\/~~\\/~~\\/~~  ', '   ~~      ~~    '],
      ],
    },
  },
  {
    name: 'dock crab',
    width: 18,
    height: 6,
    frames: {
      sleeping: [
        [' zZ               ', ' \\_         _/    ', '  \\_.█████._/    ', '  /██-██-██\\     ', ' (██████████)    ', '  `-\\███/-`      '],
        ['   zZ             ', ' _/         \\_    ', '  \\_.█████._/    ', '  /██-██-██\\     ', ' (██████████)    ', '  `-/███\\-`      '],
      ],
      awake: [
        [' \\_         _/    ', '  \\_.█████._/    ', '  /██o██o██\\     ', ' (████v█████)    ', ' /`-███████-`\\   ', '/_/       \\_\\    '],
        [' _/         \\_    ', '  \\_.█████._/    ', '  /██o██o██\\     ', ' (████v█████)    ', ' /`-███████-`\\   ', ' \\_\\       /_/   '],
      ],
      attention: [
        ['  !!!             ', ' \\_  █████  _/    ', '  \\_(██O O██)_/   ', '  /████!████\\    ', ' /`-███████-`\\   ', '/_/       \\_\\    '],
        ['   !              ', ' _/  █████  \\_    ', '  \\_(██O O██)_/   ', '  /████!████\\    ', ' /`-███████-`\\   ', ' \\_\\       /_/   '],
      ],
    },
  },
  {
    name: 'river otter',
    width: 17,
    height: 6,
    frames: {
      sleeping: [
        [' zZ              ', '   .██████.      ', '  /██-██-██\\~~   ', ' (██████████)    ', '  `████████`     ', '   /_/  \\_\\      '],
        ['   zZ            ', '   .██████.      ', '~~/██-██-██\\     ', ' (██████████)    ', '  `████████`     ', '    \\_\\ /_/      '],
      ],
      awake: [
        ['   .██████.      ', '  /██o██o██\\~~   ', ' (████vv████)    ', '  `████████`     ', '   /_/  \\_\\      ', '  ~~~    ~~~     '],
        ['   .██████.      ', '~~/██o██o██\\     ', ' (████vv████)    ', '  `████████`     ', '    \\_\\ /_/      ', '   ~~~  ~~~      '],
      ],
      attention: [
        ['  !!!            ', '   .██████.      ', '  /██O!!O██\\~~   ', ' (██████████)    ', '  `████████`     ', '   /_/  \\_\\      '],
        ['   !             ', '   .██████.      ', '~~/██O!!O██\\     ', ' (██████████)    ', '  `████████`     ', '    \\_\\ /_/      '],
      ],
    },
  },
  {
    name: 'shell turtle',
    width: 18,
    height: 6,
    frames: {
      sleeping: [
        [' zZ               ', '      _____       ', '  ___/█████\\__    ', ' /██-█████-██\\   ', '(█████████████)  ', '  /_/      \\_\\   '],
        ['   zZ             ', '      _____       ', '  ___/█████\\__    ', ' /██-█████-██\\   ', '(█████████████)  ', '   \\_\\    /_/    '],
      ],
      awake: [
        ['      _____       ', '  ___/█████\\__    ', ' /██o█████o██\\   ', '(█████vv██████)  ', ' /_/███████\\_\\   ', '  /_/      \\_\\   '],
        ['      _____       ', '  ___/█████\\__    ', ' /██o█████o██\\   ', '(█████vv██████)  ', ' /_/███████\\_\\   ', '   \\_\\    /_/    '],
      ],
      attention: [
        ['  !!!             ', '    __/█████\\__   ', ' __/██O!!!O██\\_  ', '(██████████████) ', ' /_/███████\\_\\   ', '  /_/      \\_\\   '],
        ['   !              ', '    __/█████\\__   ', ' __/██O!!!O██\\_  ', '(██████████████) ', ' /_/███████\\_\\   ', '   \\_\\    /_/    '],
      ],
    },
  },
  {
    name: 'field rabbit',
    width: 17,
    height: 6,
    frames: {
      sleeping: [
        [' zZ              ', '  /|      |\\     ', ' /_|██████|_\\    ', '(██-████-██)     ', ' `████████`      ', '   /_/ \\_\\       '],
        ['   zZ            ', '  /|      |\\     ', ' /_|██████|_\\    ', '(██-████-██)     ', ' `████████`      ', '    \\_\\ /_/      '],
      ],
      awake: [
        ['  /|      |\\     ', ' /_|██████|_\\    ', '(██o████o██)     ', ' `███vv███`      ', '  ████████       ', '   /_/ \\_\\       '],
        ['  /|      |\\     ', ' /_|██████|_\\    ', '(██o████o██)     ', ' `███vv███`      ', '  ████████       ', '    \\_\\ /_/      '],
      ],
      attention: [
        ['  !!!            ', ' /||      ||\\    ', '/_||██████||_\\   ', '(██O!!!!O██)     ', ' `████████`      ', '   /_/ \\_\\       '],
        ['   !             ', ' /||      ||\\    ', '/_||██████||_\\   ', '(██O!!!!O██)     ', ' `████████`      ', '    \\_\\ /_/      '],
      ],
    },
  },
];

export function createCreatureIdentity(repoPath: string, salt = 0): CreatureIdentity {
  const seed = hash32(salt === 0 ? repoPath : `${repoPath}#${salt}`);
  return {
    version: IDENTITY_VERSION,
    seed,
    palette: (seed >>> 3) % 6,
    species: speciesFromSeed(seed),
    detail: seed % 10,
    mark: (seed >>> 13) % 16,
    motion: (seed >>> 17) % 4,
  };
}

export function isCurrentCreatureIdentity(identity: unknown): identity is CreatureIdentity {
  if (!identity || typeof identity !== 'object') return false;
  const candidate = identity as Partial<CreatureIdentity>;
  return (
    candidate.version === IDENTITY_VERSION &&
    Number.isInteger(candidate.seed) &&
    Number.isInteger(candidate.palette) &&
    Number.isInteger(candidate.species) &&
    Number.isInteger(candidate.detail) &&
    Number.isInteger(candidate.mark) &&
    Number.isInteger(candidate.motion)
  );
}

export function generateCreature(repoPath: string, identity = createCreatureIdentity(repoPath)): CreatureConfig {
  const speciesIndex = identity.species % species.length;
  const archetype = species[speciesIndex];
  return {
    repoPath,
    name: path.basename(repoPath) || repoPath,
    seed: identity.seed,
    palette: identity.palette,
    species: speciesIndex,
    detail: identity.detail,
    mark: identity.mark,
    motion: identity.motion,
    width: archetype.width,
    height: archetype.height,
  };
}

export function creatureFrame(config: CreatureConfig, state: CreatureState, frame: number): string[] {
  const archetype = species[config.species];
  const frames = archetype.frames[state];
  return frames[Math.floor(frame / (4 + config.motion)) % frames.length]
    .map((line) => applyDetail(line, config.detail))
    .map((line, row) => applyMark(line, row, config.mark));
}

export function creatureArchetypeName(config: CreatureConfig): string {
  return species[config.species].name;
}

export function hash32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function speciesFromSeed(seed: number): number {
  return (((seed >>> 5) ^ (seed >>> 16)) >>> 0) % species.length;
}

function applyDetail(line: string, detail: number): string {
  if (detail % 5 === 0) return line.replaceAll('█', '▓');
  if (detail % 5 === 1) return line.replaceAll('█', '▒');
  if (detail % 5 === 2) return line.replaceAll('~', '≈');
  if (detail % 5 === 3) return line.replaceAll('`', '\'');
  return line;
}

function applyMark(line: string, row: number, mark: number): string {
  const chars = [...line];
  if (row === 0 && mark % 4 === 0 && !line.includes('!') && !line.includes('zZ') && chars.length > 5) chars[4] = '^';
  if (row === 1 && mark % 4 === 1 && chars.length > 7) chars[6] = '.';
  if (row === 2 && mark % 4 === 2 && chars.length > 5) chars[4] = '*';
  if (row === 3 && mark % 4 === 3 && chars.length > 8) chars[7] = '•';
  if (row >= 4 && mark >= 8 && chars.length > 10) chars[10] = mark % 2 === 0 ? '\'' : ',';
  return chars.join('');
}
