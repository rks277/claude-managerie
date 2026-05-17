#!/usr/bin/env node

const width = Math.min(140, Math.max(96, process.stdout.columns || 120));
const height = Math.min(42, Math.max(30, (process.stdout.rows || 38) - 2));
const maxFrames = Number(process.argv.find((arg) => arg.startsWith('--frames='))?.split('=')[1] || 0);
const fps = 10;

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  fg: {
    moss: '\x1b[38;5;108m',
    pale: '\x1b[38;5;188m',
    bone: '\x1b[38;5;230m',
    amber: '\x1b[38;5;214m',
    cyan: '\x1b[38;5;116m',
    pink: '\x1b[38;5;211m',
    gray: '\x1b[38;5;245m',
    dark: '\x1b[38;5;238m',
    green: '\x1b[38;5;150m',
    violet: '\x1b[38;5;183m',
  },
  bg: {
    black: '\x1b[48;5;234m',
    moss: '\x1b[48;5;235m',
  },
};

const creatures = [
  {
    repo: '~/code/agent-terrarium',
    state: 'needs input',
    x: 7,
    y: 6,
    vx: 0.36,
    vy: 0.1,
    tint: colors.fg.amber,
    labelDx: 1,
    frames: [
      [
        '        .     .        ',
        '     __/ \\___/ \\__     ',
        '  _-\'  o     o   `-_   ',
        ' /   .----!----.    \\~ ',
        '(   /  ._____.  \\    ) ',
        ' \\__\\_/  |_|  \\_/__ /  ',
        '    /_\\       /_\\      ',
      ],
      [
        '          .   .        ',
        '     __\\_/ \\_/ \\__     ',
        '  _-\'  o  !  o   `-_   ',
        '~/   .--------- .   \\  ',
        '(   /  ._____.  \\   )  ',
        ' \\__\\_/  |_|  \\_/__/   ',
        '      /_\\   /_\\        ',
      ],
    ],
  },
  {
    repo: '~/code/site',
    state: 'running',
    x: width - 42,
    y: 8,
    vx: -0.24,
    vy: 0.14,
    tint: colors.fg.cyan,
    labelDx: 2,
    frames: [
      [
        '      /\\                 ',
        '  ___/  \\____      .--.  ',
        ' /  o    o   \\____/  /~  ',
        '<    .--.          _/    ',
        ' \\__/    \\__   ___/      ',
        '    \\_\\     \\_\\          ',
      ],
      [
        '        /\\               ',
        '  ___ _/  \\___     .--.  ',
        ' /  o      o  \\___/  /   ',
        '<      __          _/~   ',
        ' \\____/  \\__   __/       ',
        '       \\_\\  \\_\\          ',
      ],
    ],
  },
  {
    repo: '~/code/lib',
    state: 'sleeping',
    x: 18,
    y: height - 12,
    vx: 0.12,
    vy: -0.03,
    tint: colors.fg.pale,
    labelDx: 4,
    frames: [
      [
        '          zZ             ',
        '       zZ       __       ',
        '          ___--\'  `--_   ',
        '   ___--\'   -      -  \\  ',
        ' _/     .----.____.   |  ',
        '(______/          \\___/  ',
        '    ~~~            ~~    ',
      ],
      [
        '       zZ                ',
        '            zZ  __       ',
        '          ___--\'  `--_   ',
        '   ___--\'   -      -  \\  ',
        ' _/    .----.____.    |  ',
        '(_____/           \\___/  ',
        '     ~~            ~~~   ',
      ],
    ],
  },
  {
    repo: '~/code/cli',
    state: 'permission',
    x: width - 55,
    y: height - 14,
    vx: 0.14,
    vy: -0.16,
    tint: colors.fg.pink,
    labelDx: 2,
    frames: [
      [
        '          !!!            ',
        '       .-\\___/-.         ',
        '   ___/  *   *  \\___     ',
        '  /  /\\    ?    /\\  \\    ',
        ' /__/  \\__   __/  \\__\\~  ',
        '     ~   /|_|\\    ~      ',
        '        /_/ \\_\\          ',
      ],
      [
        '        !!!              ',
        '       .-/___\\-.         ',
        '  ___ /  *   *  \\ ___    ',
        ' /  /\\     ?     /\\  \\~  ',
        '/__/  \\___   ___/  \\__\\  ',
        '   ~     /|_|\\      ~    ',
        '        /_/ \\_\\          ',
      ],
    ],
  },
  {
    repo: '~/code/notes',
    state: 'running',
    x: Math.floor(width / 2) - 18,
    y: Math.floor(height / 2) - 5,
    vx: 0.2,
    vy: -0.11,
    tint: colors.fg.green,
    labelDx: 2,
    frames: [
      [
        '       __       __       ',
        '   ___/  \\_.._/  \\___    ',
        '  /   .   oo   .    /    ',
        ' /____\\_.____._/___/     ',
        '      /_/    \\_\\   ~~    ',
      ],
      [
        '       __       __       ',
        '   ___/  \\_.._/  \\___    ',
        '  \\    .  oo  .    \\     ',
        '   \\___\\_.____._/___\\    ',
        '   ~~  /_/    \\_\\        ',
      ],
    ],
  },
];

const decor = [
  { x: 3, y: 3, text: '╭─╮', color: colors.fg.dark },
  { x: 4, y: 4, text: '│ │', color: colors.fg.dark },
  { x: 5, y: 5, text: '╯', color: colors.fg.dark },
  { x: width - 16, y: 3, text: '╮  ╭╮', color: colors.fg.dark },
  { x: width - 15, y: 4, text: '│  ││', color: colors.fg.dark },
  { x: width - 48, y: height - 5, text: '· .  ,   ·     .', color: colors.fg.moss },
  { x: 10, y: height - 4, text: '.___..__     .__', color: colors.fg.dark },
  { x: width - 30, y: height - 3, text: 'moss  moss  moss', color: colors.fg.moss },
  { x: Math.floor(width / 2) - 8, y: 4, text: '╭────╮', color: colors.fg.dark },
  { x: Math.floor(width / 2) - 8, y: 5, text: '│    │', color: colors.fg.dark },
  { x: Math.floor(width / 2) - 8, y: 6, text: '╰─╮  │', color: colors.fg.dark },
  { x: Math.floor(width / 2) + 25, y: height - 8, text: '::::: damp roots :::::', color: colors.fg.moss },
];

function makeGrid() {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => `${colors.bg.black} `));
}

function put(grid, x, y, text, color = colors.reset) {
  if (y < 0 || y >= height) return;
  for (let i = 0; i < text.length; i += 1) {
    const xx = x + i;
    if (xx >= 0 && xx < width) grid[y][xx] = `${colors.bg.black}${color}${text[i]}${colors.reset}`;
  }
}

function draw(frame) {
  const grid = makeGrid();
  const title = 'claude-managerie terminal garden';
  put(grid, 2, 0, title, colors.fg.bone + colors.bold);
  put(grid, width - 25, 0, '5 repos | q to quit', colors.fg.gray);

  for (const item of decor) put(grid, item.x, item.y, item.text, item.color + colors.dim);

  for (const c of creatures) {
    const pulse = c.state === 'needs input' || c.state === 'permission';
    const sprite = c.frames[Math.floor(frame / 3) % c.frames.length];
    const x = Math.round(c.x);
    const y = Math.round(c.y + Math.sin(frame / 4 + x) * 0.5);
    const tint = pulse && frame % 4 < 2 ? colors.fg.bone + colors.bold : c.tint;

    sprite.forEach((line, row) => put(grid, x, y + row, line, tint));
    put(grid, x + (c.labelDx || 0), y + sprite.length, `${c.repo} ${c.state}`, colors.fg.gray);
  }

  put(grid, 0, height - 1, ' '.repeat(width), colors.bg.moss);
  put(grid, 2, height - 1, 'attention creatures drift forward; sleepers stay low; running creatures wander', colors.fg.moss);

  process.stdout.write('\x1b[H');
  process.stdout.write(grid.map((row) => row.join('')).join('\n'));
  process.stdout.write(colors.reset);
}

function step() {
  for (const c of creatures) {
    c.x += c.vx;
    c.y += c.vy;
    const spriteWidth = Math.max(...c.frames[0].map((line) => line.length));
    const spriteHeight = c.frames[0].length + 1;
    if (c.x < 3 || c.x > width - spriteWidth - 3) c.vx *= -1;
    if (c.y < 3 || c.y > height - spriteHeight - 2) c.vy *= -1;
    if (c.state === 'needs input' || c.state === 'permission') {
      c.y += Math.sin(Date.now() / 250) * 0.08;
    }
  }
}

let frame = 0;
process.stdout.write('\x1b[?25l\x1b[2J');
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    if (key.toString() === 'q' || key[0] === 3) quit();
  });
}

const timer = setInterval(() => {
  step();
  draw(frame);
  frame += 1;
  if (maxFrames && frame >= maxFrames) quit();
}, 1000 / fps);

function quit() {
  clearInterval(timer);
  process.stdout.write('\x1b[?25h\x1b[0m\n');
  process.exit(0);
}
