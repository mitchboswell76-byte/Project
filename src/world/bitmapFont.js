/**
 * bitmapFont.js — a hand-authored 5x7 bitmap font.
 *
 * Why not ctx.font at 8px? System font fallbacks differ per OS and always
 * anti-alias, so a wordmark drawn that way renders differently on every
 * machine and the pixel grid turns to mush. These glyphs are exact, identical
 * everywhere, and cost zero bytes on the wire.
 *
 * Each glyph is 7 rows of exactly 5 characters. '#' = on, '.' = off.
 * The same data drives the entry wordmark, the top-left logo mark and the 3D
 * voxel headings, so all three are guaranteed to look like one family.
 */

export const GLYPH_W = 5;
export const GLYPH_H = 7;

const BLANK = ['.....', '.....', '.....', '.....', '.....', '.....', '.....'];

const G = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['###..', '#..#.', '#...#', '#...#', '#...#', '#..#.', '###..'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.###.', '#...#', '#....', '.###.', '....#', '#...#', '.###.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],

  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['#####', '...#.', '..##.', '....#', '....#', '#...#', '.###.'],
  4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],

  ' ': BLANK,
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  "'": ['.##..', '.##..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['#.#..', '#.#..', '.....', '.....', '.....', '.....', '.....'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
  '*': ['.....', '..#..', '#.#.#', '.###.', '#.#.#', '..#..', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
};

/* Flatten to single strings, asserting shape as we go. A typo in a glyph
 * above would otherwise shift an entire wordmark silently. */
const GLYPHS = {};
for (const [ch, rows] of Object.entries(G)) {
  if (rows.length !== GLYPH_H) {
    throw new Error(`bitmapFont: glyph "${ch}" has ${rows.length} rows, expected ${GLYPH_H}`);
  }
  rows.forEach((row, i) => {
    if (row.length !== GLYPH_W) {
      throw new Error(
        `bitmapFont: glyph "${ch}" row ${i} is ${row.length} wide, expected ${GLYPH_W}`
      );
    }
  });
  GLYPHS[ch] = rows.join('');
}

const FALLBACK = GLYPHS['?'];

/** Look up a glyph, case-insensitively, falling back to '?'. */
export function glyph(ch) {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? FALLBACK;
}

export function hasGlyph(ch) {
  return Boolean(GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()]);
}

/**
 * Rasterise one line of text into a boolean grid.
 * @returns {{ width:number, height:number, pixels:Uint8Array }} row-major, 1 = filled
 */
export function rasteriseLine(text, letterSpacing = 1) {
  const chars = [...String(text).toUpperCase()];
  if (chars.length === 0) return { width: 0, height: GLYPH_H, pixels: new Uint8Array(0) };

  const width = chars.length * GLYPH_W + (chars.length - 1) * letterSpacing;
  const pixels = new Uint8Array(width * GLYPH_H);

  chars.forEach((ch, i) => {
    const g = glyph(ch);
    const xOffset = i * (GLYPH_W + letterSpacing);
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (g[y * GLYPH_W + x] === '#') pixels[y * width + x + xOffset] = 1;
      }
    }
  });

  return { width, height: GLYPH_H, pixels };
}

/** Rasterise several lines into one grid, with `lineGap` blank rows between. */
export function rasteriseBlock(lines, { letterSpacing = 1, lineGap = 2, align = 'left' } = {}) {
  const rendered = lines.map((line) => rasteriseLine(line, letterSpacing));
  const width = Math.max(1, ...rendered.map((r) => r.width));
  const height = rendered.length * GLYPH_H + (rendered.length - 1) * lineGap;
  const pixels = new Uint8Array(width * height);

  rendered.forEach((r, i) => {
    const yOffset = i * (GLYPH_H + lineGap);
    const xOffset =
      align === 'center'
        ? Math.floor((width - r.width) / 2)
        : align === 'right'
          ? width - r.width
          : 0;

    for (let y = 0; y < r.height; y++) {
      for (let x = 0; x < r.width; x++) {
        if (r.pixels[y * r.width + x]) pixels[(y + yOffset) * width + x + xOffset] = 1;
      }
    }
  });

  return { width, height, pixels };
}

/** Convert a rasterised grid into a flat list of filled {x, y} coordinates. */
export function toCoords(grid) {
  const out = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.pixels[y * grid.width + x]) out.push({ x, y });
    }
  }
  return out;
}

/** Debug helper: render a grid to an ASCII string. */
export function gridToAscii(grid) {
  let s = '';
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) s += grid.pixels[y * grid.width + x] ? '#' : '.';
    s += '\n';
  }
  return s;
}
