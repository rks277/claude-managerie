#!/usr/bin/env node
import { creatureArchetypeName, creatureFrame, generateCreature } from '../creatures/generator.js';
import type { CreatureState } from '../types.js';
import { ansi, paletteColor } from '../tui/ansi.js';

const sampleRepos = [
  '/Users/you/code/agent-terrarium',
  '/Users/you/code/claude-managerie',
  '/Users/you/code/dotfiles',
  '/Users/you/code/work/api',
  '/Users/you/code/work/web',
  '/Users/you/code/notes',
  '/Users/you/code/tiny-tools',
  '/Users/you/code/research-index',
];

const states: CreatureState[] = ['sleeping', 'awake', 'attention'];
const args = process.argv.slice(2);
const repos = args.length ? args : sampleRepos;

for (const repo of repos) {
  const config = generateCreature(repo);
  const color = paletteColor(config.palette);
  process.stdout.write(`${ansi.fg.bone}${ansi.bold}${repo}${ansi.reset}\n`);
  process.stdout.write(
    `${ansi.fg.gray}${creatureArchetypeName(config)} | species=${config.species} detail=${config.detail} palette=${config.palette} motion=${config.motion}${ansi.reset}\n`,
  );

  const framesByState = states.map((state) => ({
    state,
    lines: creatureFrame(config, state, state === 'attention' ? 0 : 3),
  }));
  const maxHeight = Math.max(...framesByState.map((item) => item.lines.length));

  process.stdout.write(states.map((state) => state.padEnd(31)).join('') + '\n');
  for (let row = 0; row < maxHeight; row += 1) {
    const line = framesByState
      .map((item) => `${color}${(item.lines[row] ?? '').padEnd(30)}${ansi.reset}`)
      .join(' ');
    process.stdout.write(`${line}\n`);
  }
  process.stdout.write('\n');
}
