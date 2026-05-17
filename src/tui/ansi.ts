export const ansi = {
  reset: '\x1b[0m',
  clear: '\x1b[2J',
  home: '\x1b[H',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    gray: '\x1b[38;5;245m',
    dark: '\x1b[38;5;238m',
    bone: '\x1b[38;5;230m',
    moss: '\x1b[38;5;108m',
    amber: '\x1b[38;5;179m',
    cyan: '\x1b[38;5;109m',
    pink: '\x1b[38;5;181m',
    green: '\x1b[38;5;144m',
    violet: '\x1b[38;5;146m',
    rust: '\x1b[38;5;173m',
    blue: '\x1b[38;5;110m',
  },
  bg: {
    dark: '\x1b[48;5;234m',
    moss: '\x1b[48;5;235m',
  },
};

const palette = [
  ansi.fg.bone,
  ansi.fg.green,
  ansi.fg.cyan,
  ansi.fg.rust,
  ansi.fg.violet,
  ansi.fg.blue,
];

export function paletteColor(index: number): string {
  return palette[index % palette.length];
}
