/**
 * props.js — the voxel prop library.
 *
 * Every prop is a function that paints axis-aligned cubes through a brush
 * (see voxelBatch.js). Props are authored in a LOCAL frame: +x across, +y up,
 * +z along the prop's own forward, standing on y = 0. The brush places and
 * rotates that into the world, so nothing here needs to know about the camera
 * path, the district it lands in, or which batch it is being written into.
 *
 * Every form is drawn from scratch as a generic voxel shape — a tree, a bus,
 * a horse with a horn. Nothing is traced from a reference and nothing depicts
 * a branded or copyrighted character.
 *
 * Colours come from palette.props and palette.accents in config.js; sizes are
 * world units, against a camera that sees roughly 74 x 41 units.
 */

import { palette, scenery as cfg } from '../config.js';

const P = palette.props;
const accent = (rng) => palette.accents[(rng() * palette.accents.length) | 0];

/* A rainbow, built from whatever colours the palette actually has, so
 * editing config.js restyles it like everything else. */
const rainbowBands = () => [
  ...palette.accents,
  P.pink,
  P.orange,
  P.leaf,
];

/* ------------------------------------------------------------------ */
/* Planting                                                            */
/* ------------------------------------------------------------------ */

/** Broadleaf tree: a trunk and two offset canopy blocks. */
export function tree(paint, { rng, snow = false } = {}) {
  const leaf = rng() > 0.5 ? P.leaf : P.leafDark;
  paint(0, 1.2, 0, 0.7, 2.4, 0.7, P.trunk);
  paint(0, 3.3, 0, 3.4, 2.2, 3.4, leaf);
  paint(0.4, 4.7, -0.3, 2.2, 1.4, 2.2, P.leafDark);
  if (snow) paint(0.4, 5.6, -0.3, 2.3, 0.4, 2.3, P.snow);
}

/** Conifer: a stack of tapering tiers. */
export function conifer(paint, { rng, snow = false } = {}) {
  const h = 0.9 + rng() * 0.4;
  paint(0, 0.7, 0, 0.6, 1.4, 0.6, P.trunk);
  const tiers = [
    [1.9 * h, 3.2, 1.3],
    [3.0 * h, 2.4, 1.2],
    [4.0 * h, 1.6, 1.1],
  ];
  for (const [y, w, th] of tiers) {
    paint(0, y, 0, w, th, w, P.leafDark);
    if (snow) paint(0, y + th / 2 + 0.15, 0, w * 0.92, 0.3, w * 0.92, P.snow);
  }
  paint(0, 4.9 * h, 0, 0.6, 0.9, 0.6, P.leaf);
}

/** Palm: a leaning trunk and four fronds. */
export function palm(paint, { rng } = {}) {
  const lean = (rng() - 0.5) * 0.8;
  for (let i = 0; i < 5; i++) {
    paint(lean * i * 0.25, 0.6 + i * 1.1, 0, 0.55, 1.1, 0.55, P.trunk);
  }
  const top = 6.1;
  const x = lean * 1.0;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    paint(x + Math.sin(a) * 1.5, top, Math.cos(a) * 1.5, 3.0, 0.35, 1.0, P.leaf, a);
    paint(x + Math.sin(a) * 2.6, top - 0.5, Math.cos(a) * 2.6, 1.6, 0.3, 0.8, P.leafDark, a);
  }
}

/** Cactus: a column with two arms. */
export function cactus(paint, { rng } = {}) {
  const h = 3.2 + rng() * 1.6;
  paint(0, h / 2, 0, 1.0, h, 1.0, P.leaf);
  paint(0.9, h * 0.6, 0, 1.0, 0.7, 0.7, P.leaf);
  paint(1.3, h * 0.6 + 0.8, 0, 0.7, 1.6, 0.7, P.leaf);
  if (rng() > 0.4) {
    paint(-0.9, h * 0.45, 0, 1.0, 0.7, 0.7, P.leaf);
    paint(-1.3, h * 0.45 + 0.7, 0, 0.7, 1.3, 0.7, P.leaf);
  }
}

/** Flower bed: a low planter with coloured heads. */
export function flowerBed(paint, { rng } = {}) {
  paint(0, 0.2, 0, 3.4, 0.4, 2.2, P.trunk);
  paint(0, 0.5, 0, 3.0, 0.3, 1.8, P.leafDark);
  for (let i = 0; i < 7; i++) {
    const x = (rng() - 0.5) * 2.6;
    const z = (rng() - 0.5) * 1.4;
    paint(x, 0.8, z, 0.18, 0.5, 0.18, P.leaf);
    paint(x, 1.15, z, 0.4, 0.35, 0.4, rng() > 0.5 ? accent(rng) : P.pink);
  }
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

/** A small humanoid figure, about two units tall. Static; never interactive. */
export function figure(paint, { rng } = {}) {
  const shirt = accent(rng);
  const trousers = rng() > 0.5 ? P.metal : P.trunk;
  paint(-0.22, 0.35, 0, 0.3, 0.7, 0.3, trousers);
  paint(0.22, 0.35, 0, 0.3, 0.7, 0.3, trousers);
  paint(0, 1.15, 0, 0.8, 0.9, 0.5, shirt);
  paint(-0.5, 1.15, 0, 0.2, 0.7, 0.25, shirt);
  paint(0.5, 1.15, 0, 0.2, 0.7, 0.25, shirt);
  paint(0, 1.85, 0, 0.5, 0.5, 0.5, P.sand);
  paint(0, 2.16, 0, 0.56, 0.18, 0.56, rng() > 0.5 ? accent(rng) : P.trunk);
}

/* ------------------------------------------------------------------ */
/* Structures                                                          */
/* ------------------------------------------------------------------ */

/** Fountain: a stone ring, a water disc and a pedestal. */
export function fountain(paint, { rng, animPaint } = {}) {
  const r = 3.4;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    paint(Math.sin(a) * r, 0.35, Math.cos(a) * r, 1.0, 0.7, 1.0, P.metal, a);
  }
  paint(0, 0.22, 0, 5.8, 0.44, 5.8, P.water);
  paint(0, 0.9, 0, 1.4, 1.8, 1.4, P.metal);
  paint(0, 2.0, 0, 2.4, 0.4, 2.4, P.metal);
  if (animPaint) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      animPaint(Math.sin(a) * 1.1, 2.9 + rng() * 0.8, Math.cos(a) * 1.1, 0.4, 0.4, 0.4, P.water, 0, {
        bob: 0.7,
        speed: 2.2,
        phase: i,
      });
    }
  }
}

/** Pavilion: yellow walls under a stepped red roof. */
export function pavilion(paint) {
  paint(0, 0.2, 0, 7.2, 0.4, 7.2, P.metal);
  for (const sx of [-3.0, 3.0]) {
    for (const sz of [-3.0, 3.0]) paint(sx, 1.9, sz, 0.6, 3.4, 0.6, P.wall);
  }
  paint(0, 1.7, -3.0, 5.6, 3.0, 0.5, P.wall);
  paint(-3.0, 1.7, 0, 0.5, 3.0, 5.6, P.wall);
  paint(0, 3.9, 0, 8.4, 0.5, 8.4, P.roof);
  paint(0, 4.4, 0, 6.4, 0.5, 6.4, P.roof);
  paint(0, 4.9, 0, 4.2, 0.5, 4.2, P.roof);
  paint(0, 5.5, 0, 0.8, 1.0, 0.8, P.wall);
}

/** House: walls, a stepped roof, a door, windows and a chimney. */
export function house(paint, { rng, snow = false } = {}) {
  const w = 4.2 + rng() * 1.6;
  const d = 3.6 + rng() * 1.2;
  const wall = rng() > 0.5 ? P.wall : P.sand;
  paint(0, 1.6, 0, w, 3.2, d, wall);
  paint(0, 3.5, 0, w + 0.8, 0.6, d + 0.8, P.roof);
  paint(0, 4.1, 0, w * 0.7, 0.6, d * 0.7, P.roof);
  paint(0, 0.9, d / 2 + 0.1, 0.9, 1.8, 0.2, P.trunk);
  paint(-w * 0.28, 2.2, d / 2 + 0.1, 0.8, 0.8, 0.2, palette.grid);
  paint(w * 0.28, 2.2, d / 2 + 0.1, 0.8, 0.8, 0.2, palette.grid);
  paint(w * 0.3, 4.6, -d * 0.2, 0.7, 1.6, 0.7, P.metal);
  if (snow) {
    paint(0, 3.9, 0, w + 0.9, 0.3, d + 0.9, P.snow);
    paint(0, 4.5, 0, w * 0.72, 0.3, d * 0.72, P.snow);
  }
}

/** Lamp post. */
export function lampPost(paint) {
  paint(0, 0.2, 0, 0.9, 0.4, 0.9, P.metal);
  paint(0, 2.8, 0, 0.32, 5.2, 0.32, P.metal);
  paint(0, 5.5, 0, 1.1, 0.4, 1.1, P.metal);
  paint(0, 5.2, 0, 0.6, 0.5, 0.6, palette.accents[1]);
}

/** Flag on a pole. The cloth goes in the animated batch and sways. */
export function flag(paint, { rng, animPaint } = {}) {
  const colour = accent(rng);
  paint(0, 3.2, 0, 0.28, 6.4, 0.28, P.metal);
  paint(0, 0.2, 0, 1.0, 0.4, 1.0, P.metal);
  const put = animPaint ?? paint;
  for (let i = 0; i < 4; i++) {
    put(0.5 + i * 0.62, 5.6, 0, 0.62, 1.5, 0.2, colour, 0, {
      sway: 0.12 + i * 0.09,
      speed: 2.4,
      phase: i * 0.5,
    });
  }
}

/** Signage board: two posts and a panel with a white band across it. */
export function signBoard(paint, { rng } = {}) {
  paint(-1.5, 1.2, 0, 0.28, 2.4, 0.28, P.metal);
  paint(1.5, 1.2, 0, 0.28, 2.4, 0.28, P.metal);
  paint(0, 3.1, 0, 4.2, 2.2, 0.3, accent(rng));
  paint(0, 3.1, 0.2, 3.4, 0.45, 0.14, palette.ink);
  paint(0, 2.35, 0.2, 2.4, 0.3, 0.14, palette.ink);
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                            */
/* ------------------------------------------------------------------ */

/** A red double-decker bus. Runs along its local +z. */
export function bus(paint) {
  const red = P.roof;
  paint(0, 1.7, 0, 2.9, 2.2, 8.4, red);
  paint(0, 3.9, 0, 2.9, 2.2, 8.4, red);
  paint(0, 5.1, 0, 2.7, 0.3, 8.0, palette.ink);
  paint(0, 2.3, 0, 3.0, 0.8, 7.4, palette.grid);
  paint(0, 4.5, 0, 3.0, 0.8, 7.4, palette.grid);
  paint(0, 1.9, 4.25, 2.6, 1.4, 0.2, palette.grid);
  for (const z of [-2.8, 2.8]) {
    for (const x of [-1.5, 1.5]) paint(x, 0.7, z, 0.4, 1.4, 1.4, palette.background);
  }
}

/** A cargo ship with stacked containers. Bow points along local +z. */
export function cargoShip(paint, { rng } = {}) {
  const L = 24;
  paint(0, 1.3, 0, 6.4, 2.6, L, P.metal);
  paint(0, 0.5, 0, 5.0, 1.0, L + 2.2, palette.background);
  paint(0, 2.8, 0, 6.0, 0.4, L - 0.6, P.roof);
  // superstructure at the stern
  paint(0, 4.6, -L / 2 + 3.2, 4.4, 3.4, 3.6, palette.ink);
  paint(0, 6.6, -L / 2 + 3.2, 3.4, 0.7, 2.8, palette.grid);
  paint(0, 7.8, -L / 2 + 3.4, 1.1, 2.2, 1.1, accent(rng));
  // containers, three across and two high
  for (let row = 0; row < 6; row++) {
    for (let col = -1; col <= 1; col++) {
      const stack = 1 + ((rng() * 2) | 0);
      for (let k = 0; k < stack; k++) {
        paint(col * 1.9, 3.6 + k * 1.3, -2.5 + row * 2.6, 1.7, 1.2, 2.4, accent(rng));
      }
    }
  }
}

/** A blue steam train: locomotive plus two carriages, along local +z. */
export function train(paint, { rng } = {}) {
  const blue = P.water;
  // locomotive
  paint(0, 2.1, 1.0, 2.4, 2.4, 7.0, blue);
  paint(0, 2.1, 4.8, 2.8, 2.6, 0.6, palette.ink);
  paint(0, 2.6, -3.4, 3.0, 3.4, 3.4, blue);
  paint(0, 4.1, -3.4, 3.1, 0.5, 3.5, palette.ink);
  paint(0, 3.9, 3.4, 1.2, 1.8, 1.2, palette.background);
  paint(0, 4.9, 3.4, 1.6, 0.5, 1.6, palette.background);
  paint(0, 3.7, 1.4, 1.0, 0.8, 1.0, palette.accents[1]);
  for (const z of [3.2, 0.6, -2.0, -4.2]) {
    for (const x of [-1.3, 1.3]) paint(x, 0.8, z, 0.35, 1.6, 1.6, palette.background);
  }
  // carriages
  for (let c = 1; c <= 2; c++) {
    const z0 = -9.5 - (c - 1) * 8.4;
    paint(0, 2.2, z0, 2.6, 2.6, 7.2, c % 2 ? P.roof : blue);
    paint(0, 3.6, z0, 2.7, 0.4, 7.2, palette.ink);
    paint(0, 2.6, z0, 2.8, 0.8, 6.0, palette.grid);
    for (const z of [z0 + 2.4, z0 - 2.4]) {
      for (const x of [-1.2, 1.2]) paint(x, 0.7, z, 0.3, 1.4, 1.4, palette.background);
    }
  }
  if (rng() > 0.5) paint(0, 6.4, 3.4, 1.6, 1.2, 1.6, P.snow);
}

/* ------------------------------------------------------------------ */
/* Set pieces                                                          */
/* ------------------------------------------------------------------ */

/** A rainbow arch, one band of cubes per palette colour. */
export function rainbowArch(paint) {
  const bands = rainbowBands();
  const steps = 22;
  bands.forEach((colour, b) => {
    const r = 9.5 + b * 1.25;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI;
      paint(Math.cos(a) * r, Math.sin(a) * r, 0, 1.3, 1.3, 1.6, colour);
    }
  });
}

/** A generic horned horse, built as voxels. Faces local +z. */
export function unicorn(paint) {
  const body = P.snow;
  paint(0, 3.0, 0, 1.8, 1.9, 4.2, body);
  for (const z of [-1.4, 1.4]) {
    for (const x of [-0.6, 0.6]) paint(x, 1.1, z, 0.6, 2.2, 0.6, body);
  }
  paint(0, 4.4, 1.7, 1.1, 2.0, 1.1, body);
  paint(0, 5.4, 2.3, 1.0, 1.0, 1.9, body);
  paint(0, 6.1, 2.9, 0.3, 1.1, 0.3, palette.accents[1]);
  paint(0, 5.9, 1.6, 0.9, 0.5, 0.9, P.pink);
  paint(0, 5.2, 1.2, 0.8, 0.5, 0.8, P.pink);
  paint(0, 3.6, -2.2, 0.5, 1.8, 0.5, P.pink);
}

/** A cloud: a handful of white cubes that drift. Uses the animated brush. */
export function cloud(paint, { rng } = {}) {
  const n = 4 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const x = (rng() - 0.5) * 5.0;
    const z = (rng() - 0.5) * 3.0;
    const s = 1.6 + rng() * 1.8;
    paint(x, rng() * 0.8, z, s, s * 0.6, s * 0.8, P.snow, 0, {
      sway: 0.25,
      bob: 0.25,
      speed: 0.35 + rng() * 0.2,
      phase: i * 1.3,
    });
  }
}

/** A square of water, gently bobbing. Uses the animated brush. */
export function waterTile(paint, { rng } = {}) {
  paint(0, 0.15, 0, cfg.WATER_TILE, 0.3, cfg.WATER_TILE, P.water, 0, {
    bob: 0.16,
    speed: 0.8 + rng() * 0.5,
    phase: rng() * 6.283,
  });
}

/** A low snow drift, for the final district. */
export function snowDrift(paint, { rng } = {}) {
  const w = 4 + rng() * 6;
  paint(0, 0.2, 0, w, 0.4, w * 0.7, P.snow);
  paint((rng() - 0.5) * w * 0.4, 0.6, 0, w * 0.5, 0.4, w * 0.4, P.snow);
}

/** One floating cube: the small blocks that hang and bob throughout. */
export function floatingCube(paint, { rng } = {}) {
  const s = cfg.FLOAT_MIN + rng() * (cfg.FLOAT_MAX - cfg.FLOAT_MIN);
  paint(0, 0, 0, s, s, s, accent(rng), rng() * Math.PI, {
    bob: cfg.FLOAT_BOB_MIN + rng() * (cfg.FLOAT_BOB_MAX - cfg.FLOAT_BOB_MIN),
    sway: 0.2 + rng() * 0.5,
    spin: (rng() - 0.5) * cfg.FLOAT_SPIN,
    speed: 0.4 + rng() * 0.7,
    phase: rng() * 6.283,
  });
}

/**
 * One slab of snow cover, laid as a lattice across the final district so the
 * ground reads as snowed over. Slabs are kept out of the lane that carries
 * the body copy, so they never sit on top of text.
 */
export function snowSheet(paint, { rng } = {}) {
  // Slightly wider than the lattice spacing so neighbouring slabs overlap
  // instead of leaving a seam where the route bends.
  const s = cfg.SNOW_TILE;
  paint(0, 0.1, 0, s * 1.14, 0.2, s * 1.14, P.snow);
  if (rng() > 0.55) {
    paint((rng() - 0.5) * s * 0.5, 0.35, (rng() - 0.5) * s * 0.5, s * 0.4, 0.3, s * 0.35, P.snow);
  }
}
