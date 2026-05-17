#!/usr/bin/env node
// Regenerates the SVG terminal screenshots used in README.md.
//
// Run with:  node scripts/render-screenshots.mjs
//
// Writes:
//   docs/images/garden.svg
//   docs/images/setup.svg
//   docs/images/selection.svg
//
// The script intentionally inlines the sprite data so it works on a fresh
// clone without building the project. If you change creature sprites or
// palette colors in src/, update the mirrored values below and re-run.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'docs', 'images');
mkdirSync(outDir, { recursive: true });

// xterm 256-color -> hex, just the ones we actually use.
const COLOR = {
  bgDark: '#1c1c1c',
  bgMoss: '#262626',
  fgDark: '#444444',
  fgGray: '#8a8a8a',
  fgBone: '#ffffd7',
  fgMoss: '#87af87',
  fgAmber: '#d7af5f',
  fgCyan: '#87afaf',
  fgPink: '#d7afaf',
  fgGreen: '#afaf87',
  fgViolet: '#afafd7',
  fgRust: '#d7875f',
  fgBlue: '#87afd7',
};

const palette = [COLOR.fgBone, COLOR.fgGreen, COLOR.fgCyan, COLOR.fgRust, COLOR.fgViolet, COLOR.fgBlue];
const paletteColor = (i) => palette[((i % palette.length) + palette.length) % palette.length];

// Sprite species, mirrored from src/creatures/generator.ts.
const species = [
  {
    name: 'ember fox', width: 17, height: 6,
    awake: [' /\\        /\\    ', '(  )██████(  )   ', ' \\/██o██o██\\/    ', '  ████vv████\\~~  ', '  ██████████     ', '   /_/  \\_\\      '],
    sleeping: [' zZ              ', ' /\\        /\\    ', '(  )██████(  )   ', ' \\/██-██-██\\/    ', '  ████████\\~~    ', '   /_/  \\_\\      '],
    attention: ['  !!!            ', '/\\          /\\   ', '(  )██████(  )   ', ' \\/██O!!O██\\/    ', '  ██████████\\~~  ', '   /_/  \\_\\      '],
  },
  {
    name: 'moon owl', width: 15, height: 7,
    awake: ['               ', '   /\\___/\\     ', '  /███████\\    ', ' (██o██o██)    ', '/███\\_v_/██\\   ', '   ███████     ', '   ^^   ^^     '],
    sleeping: [' zZ            ', '   /\\___/\\     ', '  /███████\\    ', ' (██-██-██)    ', '/███\\___/██\\   ', '   ███████     ', '   ^^   ^^     '],
    attention: ['  !!!          ', ' \\/\\___/\\/     ', '  /███████\\    ', ' (██O!!O██)    ', '/███\\_!_/██\\   ', '   ███████     ', '   ^^   ^^     '],
  },
  {
    name: 'reef octopus', width: 18, height: 7,
    awake: ['    .██████.     ', '  .██████████.   ', '  ███o████o███   ', '   ████vv████    ', '  ████████████   ', '  ~~/~~\\/~~\\~~   ', '    ~~    ~~     '],
    sleeping: [' zZ               ', '    .██████.     ', '  .██████████.   ', '  ███-████-███   ', '   ██████████    ', '  ~~/~~\\/~~\\~~   ', '    ~~    ~~     '],
    attention: ['  !!!             ', '    .██████.     ', '  .██████████.   ', '  ███O!!!!O███   ', '  ████████████   ', '  ~~/~~\\/~~\\~~   ', ' ~~  ~~  ~~  ~~  '],
  },
  {
    name: 'dock crab', width: 18, height: 6,
    awake: [' \\_         _/    ', '  \\_.█████._/    ', '  /██o██o██\\     ', ' (████v█████)    ', ' /`-███████-`\\   ', '/_/       \\_\\    '],
    sleeping: [' zZ               ', ' \\_         _/    ', '  \\_.█████._/    ', '  /██-██-██\\     ', ' (██████████)    ', '  `-\\███/-`      '],
    attention: ['  !!!             ', ' \\_  █████  _/    ', '  \\_(██O O██)_/   ', '  /████!████\\    ', ' /`-███████-`\\   ', '/_/       \\_\\    '],
  },
  {
    name: 'river otter', width: 17, height: 6,
    awake: ['   .██████.      ', '  /██o██o██\\~~   ', ' (████vv████)    ', '  `████████`     ', '   /_/  \\_\\      ', '  ~~~    ~~~     '],
    sleeping: [' zZ              ', '   .██████.      ', '  /██-██-██\\~~   ', ' (██████████)    ', '  `████████`     ', '   /_/  \\_\\      '],
    attention: ['  !!!            ', '   .██████.      ', '  /██O!!O██\\~~   ', ' (██████████)    ', '  `████████`     ', '   /_/  \\_\\      '],
  },
  {
    name: 'shell turtle', width: 18, height: 6,
    awake: ['      _____       ', '  ___/█████\\__    ', ' /██o█████o██\\   ', '(█████vv██████)  ', ' /_/███████\\_\\   ', '  /_/      \\_\\   '],
    sleeping: [' zZ               ', '      _____       ', '  ___/█████\\__    ', ' /██-█████-██\\   ', '(█████████████)  ', '  /_/      \\_\\   '],
    attention: ['  !!!             ', '    __/█████\\__   ', ' __/██O!!!O██\\_  ', '(██████████████) ', ' /_/███████\\_\\   ', '  /_/      \\_\\   '],
  },
  {
    name: 'field rabbit', width: 17, height: 6,
    awake: ['  /|      |\\     ', ' /_|██████|_\\    ', '(██o████o██)     ', ' `███vv███`      ', '  ████████       ', '   /_/ \\_\\       '],
    sleeping: [' zZ              ', '  /|      |\\     ', ' /_|██████|_\\    ', '(██-████-██)     ', ' `████████`      ', '   /_/ \\_\\       '],
    attention: ['  !!!            ', ' /||      ||\\    ', '/_||██████||_\\   ', '(██O!!!!O██)     ', ' `████████`      ', '   /_/ \\_\\       '],
  },
];

function hash32(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function applyDetail(line, detail) {
  if (detail % 5 === 0) return line.replaceAll('█', '▓');
  if (detail % 5 === 1) return line.replaceAll('█', '▒');
  if (detail % 5 === 2) return line.replaceAll('~', '≈');
  if (detail % 5 === 3) return line.replaceAll('`', '\'');
  return line;
}

function applyMark(line, row, mark) {
  const chars = [...line];
  if (row === 0 && mark % 4 === 0 && !line.includes('!') && !line.includes('zZ') && chars.length > 5) chars[4] = '^';
  if (row === 1 && mark % 4 === 1 && chars.length > 7) chars[6] = '.';
  if (row === 2 && mark % 4 === 2 && chars.length > 5) chars[4] = '*';
  if (row === 3 && mark % 4 === 3 && chars.length > 8) chars[7] = '•';
  if (row >= 4 && mark >= 8 && chars.length > 10) chars[10] = mark % 2 === 0 ? '\'' : ',';
  return chars.join('');
}

function creatureFor(repoPath) {
  const seed = hash32(repoPath);
  const speciesIndex = (((seed >>> 5) ^ (seed >>> 16)) >>> 0) % species.length;
  const palette = (seed >>> 3) % 6;
  const detail = seed % 10;
  const mark = (seed >>> 13) % 16;
  return { speciesIndex, palette, detail, mark, archetype: species[speciesIndex] };
}

function spriteFrame(creature, state) {
  const lines = creature.archetype[state];
  return lines
    .map((line) => applyDetail(line, creature.detail))
    .map((line, row) => applyMark(line, row, creature.mark));
}

// Terminal grid: each cell stores { ch, fg, bg, bold }.
function makeGrid(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ch: ' ', fg: COLOR.fgGray, bg: COLOR.bgDark, bold: false })),
  );
}

function put(grid, x, y, text, opts = {}) {
  if (y < 0 || y >= grid.length) return;
  const { fg = COLOR.fgGray, bg = COLOR.bgDark, bold = false } = opts;
  for (let i = 0; i < text.length; i += 1) {
    const col = x + i;
    if (col < 0 || col >= grid[y].length) continue;
    grid[y][col] = { ch: text[i], fg, bg, bold };
  }
}

function fillRow(grid, y, bg) {
  if (y < 0 || y >= grid.length) return;
  for (let x = 0; x < grid[y].length; x += 1) {
    grid[y][x] = { ch: ' ', fg: COLOR.fgGray, bg, bold: false };
  }
}

function escape(ch) {
  if (ch === '&') return '&amp;';
  if (ch === '<') return '&lt;';
  if (ch === '>') return '&gt;';
  if (ch === "'") return '&apos;';
  if (ch === '"') return '&quot;';
  return ch;
}

function renderSvg(grid, { title, scale = 1 } = {}) {
  const cellW = 8.4;
  const cellH = 16;
  const padX = 16;
  const padY = 38;
  const chromeH = 28;
  const cols = grid[0].length;
  const rows = grid.length;
  const width = Math.ceil(cols * cellW + padX * 2);
  const height = Math.ceil(rows * cellH + padY + 16);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * scale}" height="${height * scale}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace" font-size="13">`,
  );
  parts.push(`<rect width="${width}" height="${height}" rx="10" ry="10" fill="#0e0e0e"/>`);
  parts.push(`<rect x="0" y="0" width="${width}" height="${chromeH}" rx="10" ry="10" fill="#1a1a1a"/>`);
  parts.push(`<rect x="0" y="${chromeH - 10}" width="${width}" height="10" fill="#1a1a1a"/>`);
  parts.push(`<circle cx="14" cy="14" r="5.5" fill="#ff5f57"/>`);
  parts.push(`<circle cx="32" cy="14" r="5.5" fill="#febc2e"/>`);
  parts.push(`<circle cx="50" cy="14" r="5.5" fill="#28c840"/>`);
  if (title) {
    parts.push(
      `<text x="${width / 2}" y="18" fill="#888" text-anchor="middle" font-size="11">${escape(title)}</text>`,
    );
  }
  parts.push(`<rect x="${padX - 8}" y="${padY - cellH + 4}" width="${cols * cellW + 16}" height="${rows * cellH + 8}" fill="${COLOR.bgDark}"/>`);

  // Background pass: emit one rect per run of identical bg on the same row.
  for (let y = 0; y < rows; y += 1) {
    let runStart = 0;
    let runBg = grid[y][0].bg;
    for (let x = 1; x <= cols; x += 1) {
      const cellBg = x < cols ? grid[y][x].bg : null;
      if (cellBg !== runBg) {
        if (runBg && runBg !== COLOR.bgDark) {
          const rectX = padX + runStart * cellW;
          const rectY = padY + y * cellH - cellH + 3;
          const rectW = (x - runStart) * cellW;
          parts.push(`<rect x="${rectX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${rectW.toFixed(2)}" height="${cellH}" fill="${runBg}"/>`);
        }
        runStart = x;
        runBg = cellBg;
      }
    }
  }

  // Text pass: emit one <text> per row, grouping characters with identical style into tspans.
  for (let y = 0; y < rows; y += 1) {
    const baseY = padY + y * cellH;
    parts.push(`<text x="${padX}" y="${baseY}" xml:space="preserve">`);
    let runChars = '';
    let runFg = grid[y][0].fg;
    let runBold = grid[y][0].bold;
    let runStart = 0;
    const flush = (endX) => {
      if (!runChars) return;
      const x = padX + runStart * cellW;
      const weight = runBold ? 'font-weight="bold"' : '';
      parts.push(
        `<tspan x="${x.toFixed(2)}" fill="${runFg}" ${weight}>${runChars}</tspan>`,
      );
      runChars = '';
    };
    for (let x = 0; x < cols; x += 1) {
      const cell = grid[y][x];
      if (cell.fg !== runFg || cell.bold !== runBold) {
        flush(x);
        runFg = cell.fg;
        runBold = cell.bold;
        runStart = x;
      }
      runChars += escape(cell.ch);
    }
    flush(cols);
    parts.push(`</text>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

// --- Scenes ----------------------------------------------------------------

const COLS = 110;
const ROWS = 30;

function placeCreature(grid, repoPath, state, ox, oy) {
  const creature = creatureFor(repoPath);
  const sprite = spriteFrame(creature, state);
  const color = paletteColor(creature.palette);
  const bold = state === 'attention';
  sprite.forEach((line, row) => put(grid, ox, oy + row, line, { fg: color, bold }));
  const label = `~/${repoPath.split('/').pop()} ${state}`;
  put(grid, ox + 2, oy + sprite.length, label, { fg: COLOR.fgGray });
}

function decor(grid, w, h) {
  const items = [
    { x: 3, y: 3, text: '.--.' },
    { x: 4, y: 4, text: '|  |' },
    { x: w - 17, y: 3, text: '.-.  .-.' },
    { x: w - 16, y: 4, text: '| |  | |' },
    { x: Math.floor(w / 2) - 8, y: 4, text: '.------.' },
    { x: Math.floor(w / 2) - 8, y: 5, text: '|      |' },
    { x: w - 48, y: h - 5, text: '. .  ,   .     .', moss: true },
    { x: 10, y: h - 4, text: '.___..__     .__' },
    { x: Math.floor(w / 2) + 8, y: h - 8, text: '::::: damp roots :::::', moss: true },
  ];
  for (const item of items) {
    put(grid, item.x, item.y, item.text, { fg: item.moss ? COLOR.fgMoss : COLOR.fgDark });
  }
}

function header(grid, w, message, connected, repoCount) {
  put(grid, 2, 0, 'claude-managerie terminal garden', { fg: COLOR.fgBone, bold: true });
  const right = `${connected ? 'connected' : 'offline'} | ${repoCount} repos | q quit`;
  put(grid, Math.max(2, w - 42), 0, right, { fg: connected ? COLOR.fgMoss : COLOR.fgAmber });
  fillRow(grid, ROWS - 1, COLOR.bgMoss);
  put(grid, 2, ROWS - 1, message, { fg: COLOR.fgMoss, bg: COLOR.bgMoss });
}

function renderGardenScene() {
  const grid = makeGrid(COLS, ROWS);
  decor(grid, COLS, ROWS);
  header(grid, COLS, 'synced 4 sessions | o select repos | q quit | r refresh | p pause', true, 4);

  placeCreature(grid, '/Users/you/code/agent-terrarium', 'awake', 8, 8);
  placeCreature(grid, '/Users/you/code/claude-managerie', 'attention', 36, 8);
  placeCreature(grid, '/Users/you/code/dotfiles', 'sleeping', 70, 8);
  placeCreature(grid, '/Users/you/code/research-index', 'awake', 22, 19);
  placeCreature(grid, '/Users/you/code/notes', 'sleeping', 60, 19);

  return renderSvg(grid, { title: 'claude-managerie — terminal garden' });
}

function renderSetupScene() {
  const grid = makeGrid(COLS, ROWS);
  decor(grid, COLS, ROWS);
  header(grid, COLS, 'offline | i install | o select repos | r refresh | s skip setup | q quit', false, 0);

  const x = Math.max(4, Math.floor(COLS / 2) - 35);
  const y = 6;
  const lines = [
    ['repo-orch daemon is not responding', true],
    ['press i to run repo-orch install', false],
    ['socket: ~/.repo-orch/daemon.sock', false],
    ['', false],
    ['after install, claude-managerie will:', false],
    ['  - watch every Claude Code session via the local daemon', false],
    ['  - hatch one creature per repo you open', false],
    ['  - wake them up, pulse on permission prompts, sleep on exit', false],
  ];
  lines.forEach(([text, bold], i) => put(grid, x, y + i, text, { fg: bold ? COLOR.fgBone : COLOR.fgGray, bold }));

  return renderSvg(grid, { title: 'claude-managerie — first-run setup' });
}

function renderSelectionScene() {
  const grid = makeGrid(COLS, ROWS);
  decor(grid, COLS, ROWS);
  header(grid, COLS, 'selection: j/k move | space toggle | a all | n none | enter close', true, 6);

  const x = Math.max(3, Math.floor(COLS / 2) - 42);
  const y = 4;
  put(grid, x, y, 'repo selection', { fg: COLOR.fgBone, bold: true });
  put(grid, x, y + 1, 'choose which repos get creatures in the garden', { fg: COLOR.fgGray });

  const repos = [
    { path: '/Users/you/code/agent-terrarium', selected: true, cursor: false },
    { path: '/Users/you/code/claude-managerie', selected: true, cursor: true },
    { path: '/Users/you/code/dotfiles', selected: true, cursor: false },
    { path: '/Users/you/code/notes', selected: false, cursor: false },
    { path: '/Users/you/code/research-index', selected: true, cursor: false },
    { path: '/Users/you/code/tiny-tools', selected: false, cursor: false },
    { path: '/Users/you/code/work/api', selected: true, cursor: false },
    { path: '/Users/you/code/work/web', selected: false, cursor: false },
  ];
  repos.forEach((repo, i) => {
    const marker = repo.cursor ? '>' : ' ';
    const check = repo.selected ? '[x]' : '[ ]';
    const line = `${marker} ${check} ${repo.path}`;
    put(grid, x, y + 3 + i, line, { fg: repo.cursor ? COLOR.fgBone : COLOR.fgGray, bold: repo.cursor });
  });

  return renderSvg(grid, { title: 'claude-managerie — repo selection' });
}

writeFileSync(resolve(outDir, 'garden.svg'), renderGardenScene());
writeFileSync(resolve(outDir, 'setup.svg'), renderSetupScene());
writeFileSync(resolve(outDir, 'selection.svg'), renderSelectionScene());
console.log('Wrote 3 screenshots to', outDir);
