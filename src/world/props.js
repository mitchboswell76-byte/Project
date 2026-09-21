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
      // +0.65 lifts the ends of the arc so its lowest cubes rest on the
      // ground rather than half-buried in it.
      paint(Math.cos(a) * r, Math.sin(a) * r + 0.65, 0, 1.3, 1.3, 1.6, colour);
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

/* ------------------------------------------------------------------ */
/* Landmarks                                                           */
/* ------------------------------------------------------------------ */
/* Big set pieces for the stretches between districts, where the route
 * would otherwise be empty road. Each is designed here as a voxel form —
 * generic structures and original creatures, nothing traced from anywhere
 * and no branded or copyrighted character. */

/**
 * An iron lattice tower: four splayed legs, an arch between them, two
 * platforms and a mast. The shape of every large 19th-century exhibition
 * tower, built here out of cubes.
 */
export function latticeTower(paint, { rng } = {}) {
  const metal = P.trunk;
  const LEGS = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  // Legs: splayed at the bottom, drawing in as they rise.
  const SEGMENTS = 16;
  for (let i = 0; i < SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const spread = 9.5 * (1 - t) ** 1.6 + 1.1;
    const y = 1.2 + t * 30; // legs start ON the ground, not 0.8 above it
    const thick = 1.5 - t * 0.7;
    for (const [sx, sz] of LEGS) {
      paint(sx * spread, y, sz * spread, thick, 2.4, thick, metal);
    }
  }

  // The arch between the legs, and the platforms.
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI;
    paint(Math.cos(a) * 8.5, 9 + Math.sin(a) * 3.2, -8.5, 1.5, 1.2, 1.5, metal);
    paint(Math.cos(a) * 8.5, 9 + Math.sin(a) * 3.2, 8.5, 1.5, 1.2, 1.5, metal);
  }
  paint(0, 12.5, 0, 17, 1.2, 17, metal);
  paint(0, 22, 0, 9.5, 1.0, 9.5, metal);

  // Upper shaft, the lookout and the mast.
  for (let i = 0; i < 12; i++) {
    const y = 32 + i * 2.2;
    const w = 3.4 - i * 0.16;
    paint(0, y, 0, w, 2.2, w, metal);
  }
  paint(0, 59, 0, 5.4, 1.6, 5.4, metal);
  paint(0, 62.5, 0, 2.2, 5.5, 2.2, metal);
  paint(0, 66, 0, 0.7, 3.0, 0.7, accent(rng));
}

/** A big wheel: a ring of cabins on spokes, on an A-frame. */
export function ferrisWheel(paint, { rng, animPaint } = {}) {
  const R = 15;
  const hub = 18;
  const metal = P.metal;

  // A-frame legs and hub.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      paint(sx * (6.5 - t * 6), 1.3 + t * hub, 0, 1.3, 2.6, 1.3, metal);
    }
  }
  paint(0, hub, 0, 2.4, 2.4, 4.2, metal);

  // Rim and spokes.
  const N = 20;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = Math.cos(a) * R;
    const y = hub + Math.sin(a) * R;
    paint(x, y, 0, 1.5, 1.5, 1.5, metal);
    // every other spoke, so the wheel reads without a solid disc
    if (i % 2 === 0) {
      for (let k = 1; k < 5; k++) {
        const f = k / 5;
        paint(x * f, hub + Math.sin(a) * R * f, 0, 0.7, 0.7, 0.7, metal);
      }
      // A cabin hangs below each spoke end, and rocks gently.
      const put = animPaint ?? paint;
      put(x * 1.06, y * 1.0 - 2.2, 0, 2.2, 1.9, 2.6, accent(rng), 0, {
        sway: 0.18,
        speed: 0.6,
        phase: i,
      });
    }
  }
}

/** A windmill: a stone tower, a cap and four sails. */
export function windmill(paint, { rng } = {}) {
  for (let i = 0; i < 7; i++) {
    const w = 7.5 - i * 0.55;
    paint(0, 1.5 + i * 3, 0, w, 3, w, i % 2 ? P.sand : P.metal);
  }
  paint(0, 23.5, 0, 6.2, 3.2, 6.2, P.roof);
  paint(0, 26, 0, 3.4, 2, 3.4, P.roof);
  // Sails on the front face.
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.5;
    for (let k = 2; k <= 9; k++) {
      paint(Math.cos(a) * k, 21 + Math.sin(a) * k, 4.2, 1.5, 1.5, 0.8, k > 3 ? P.snow : P.trunk);
    }
  }
  paint(0, 21, 4.6, 1.6, 1.6, 1.6, P.trunk);
  if (rng() > 0.5) paint(0, 21, 5.6, 0.8, 0.8, 0.8, accent(rng));
}

/** A castle: curtain wall, crenellations, corner towers and a keep. */
export function castle(paint, { rng } = {}) {
  const stone = P.metal;
  const W = 13;

  // Curtain walls with crenellations along the top.
  for (const [dx, dz, ax] of [
    [0, -W, 1],
    [0, W, 1],
    [-W, 0, 0],
    [W, 0, 0],
  ]) {
    const w = ax ? W * 2 : 2.4;
    const d = ax ? 2.4 : W * 2;
    paint(dx, 4, dz, w, 8, d, stone);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const f = (i / (n - 1) - 0.5) * (W * 2 - 2);
      paint(ax ? f : dx, 8.8, ax ? dz : f, 1.6, 1.6, 1.6, stone);
    }
  }

  // Corner towers, each with a conical roof.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      paint(sx * W, 7, sz * W, 5.4, 14, 5.4, stone);
      paint(sx * W, 14.6, sz * W, 6.2, 1.2, 6.2, stone);
      paint(sx * W, 16, sz * W, 4.6, 1.8, 4.6, P.roof);
      paint(sx * W, 17.6, sz * W, 2.6, 1.8, 2.6, P.roof);
      paint(sx * W, 19.2, sz * W, 0.6, 2.2, 0.6, accent(rng));
    }
  }

  // Keep.
  paint(0, 9, 0, 11, 18, 11, stone);
  paint(0, 18.6, 0, 12, 1.2, 12, stone);
  paint(0, 20.4, 0, 8, 2.4, 8, P.roof);
  paint(0, 22.4, 0, 4, 2, 4, P.roof);
  // Gate.
  paint(0, 3, W + 0.3, 4, 6, 1.2, P.trunk);
}

/** A lighthouse: banded tapering tower, lamp room and gallery. */
export function lighthouse(paint, { rng } = {}) {
  paint(0, 0.8, 0, 13, 1.6, 13, P.metal);
  for (let i = 0; i < 9; i++) {
    const w = 6.6 - i * 0.42;
    paint(0, 2.6 + i * 2.6, 0, w, 2.6, w, i % 2 ? P.roof : P.snow);
  }
  paint(0, 26.5, 0, 6.4, 1.2, 6.4, P.metal);
  paint(0, 28.6, 0, 4.2, 3, 4.2, palette.accents[1]);
  paint(0, 31, 0, 5, 1.4, 5, P.roof);
  paint(0, 32.4, 0, 1.6, 1.6, 1.6, P.roof);
  if (rng() > 0.5) paint(0, 33.6, 0, 0.6, 1.6, 0.6, P.metal);
}

/** A rocket on a launch gantry. */
export function rocket(paint, { rng } = {}) {
  // Pad and gantry.
  paint(0, 0.5, 0, 16, 1, 16, P.metal);
  for (let i = 0; i < 9; i++) {
    paint(6.5, 2 + i * 3, 0, 1.4, 3, 1.4, P.trunk);
    if (i % 2 === 0) paint(4.6, 2 + i * 3, 0, 3, 0.8, 1.2, P.trunk);
  }
  // Body, fins and nose.
  for (let i = 0; i < 9; i++) paint(0, 2.4 + i * 3, 0, 4.6, 3, 4.6, i % 3 ? P.snow : P.roof);
  paint(0, 30, 0, 3.6, 2.6, 3.6, P.snow);
  paint(0, 32.4, 0, 2.4, 2.4, 2.4, P.roof);
  paint(0, 34.4, 0, 1.2, 2, 1.2, P.roof);
  for (const [fx, fz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    paint(fx * 3, 3.2, fz * 3, fx ? 2.2 : 1.2, 5, fz ? 2.2 : 1.2, P.roof);
  }
  paint(0, 1.6, 0, 5.6, 1.2, 5.6, accent(rng));
}

/**
 * A low, stepped hill for the horizon.
 *
 * Wide and shallow on purpose: tall tiers at this scale read as a green wall
 * across the top of the frame rather than as landscape. Each tier is offset a
 * little so the silhouette breaks up instead of stacking into a ziggurat.
 */
export function hill(paint, { rng, snow = false } = {}) {
  const tiers = 4 + ((rng() * 3) | 0);
  /* Small, and taller than it is wide-ish. The camera only ever sees about
   * 100 x 130 units of ground, so a "hill" of 50 units across is not a
   * horizon, it is a green wall through the middle of the shot — and a wide
   * one with two tiers reads as a plateau rather than a mound. */
  const base = 10 + rng() * 10;
  let dx = 0;
  let dz = 0;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = base * (1 - t * 0.78);
    dx += (rng() - 0.5) * w * 0.2;
    dz += (rng() - 0.5) * w * 0.2;
    paint(
      dx,
      1.1 + i * 2.1,
      dz,
      w,
      2.2,
      w * (0.72 + rng() * 0.3),
      snow && i >= tiers - 2 ? P.snow : i % 2 ? P.leafDark : P.leaf
    );
  }
}

/** A hot-air balloon. Floats, so it goes in the animated batch. */
export function balloon(paint, { rng } = {}) {
  const colour = accent(rng);
  const other = accent(rng);
  const anim = { bob: 1.1, sway: 0.5, speed: 0.35 + rng() * 0.25, phase: rng() * 6.283 };
  const profile = [
    [0, 5.6],
    [2.2, 6.4],
    [4.4, 6.0],
    [6.4, 4.8],
    [8.0, 3.0],
  ];
  for (const [y, w] of profile) {
    paint(0, 9 + y, 0, w, 2.3, w, y % 4 < 2 ? colour : other, 0, anim);
  }
  paint(0, 8.0, 0, 2.4, 1.2, 2.4, P.trunk, 0, anim);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    paint(sx * 1.1, 6.6, sz * 1.1, 0.3, 2.2, 0.3, P.trunk, 0, anim);
  }
  paint(0, 5.2, 0, 3.0, 2.4, 3.0, P.trunk, 0, anim);
}

/* ------------------------------------------------------------------ */
/* Creatures                                                           */
/* ------------------------------------------------------------------ */
/* Original voxel creatures, designed here. Deliberately generic: a round
 * critter, a long-necked grazer and a fat little bird. They are meant to
 * read as "some creature lives here", not as anyone else's character. */

/** A round, stumpy critter with ear tufts and a striped tail. */
export function critter(paint, { rng } = {}) {
  const coat = rng() > 0.5 ? P.orange : accent(rng);
  const belly = P.sand;
  paint(0, 1.5, 0, 2.6, 2.2, 3.0, coat); // body
  paint(0, 1.2, 1.0, 2.0, 1.4, 1.2, belly); // belly patch
  paint(0, 3.1, 1.0, 2.2, 2.0, 2.0, coat); // head
  paint(0, 3.0, 2.1, 1.2, 0.8, 0.5, belly); // snout
  for (const sx of [-0.62, 0.62]) {
    paint(sx, 4.4, 0.9, 0.55, 1.2, 0.5, coat); // ear tufts
    paint(sx * 1.1, 3.3, 2.0, 0.34, 0.34, 0.3, palette.background); // eyes
    paint(sx, 0.4, 1.0, 0.7, 0.8, 0.8, coat); // front legs
    paint(sx, 0.4, -1.0, 0.8, 0.8, 0.9, coat); // back legs
  }
  // Tail, striped, held up.
  for (let i = 0; i < 4; i++) {
    paint(0, 2.4 + i * 0.85, -1.7 - i * 0.22, 0.75, 0.9, 0.75, i % 2 ? belly : coat);
  }
}

/** A long-necked grazer, head down. */
export function grazer(paint, { rng } = {}) {
  const coat = rng() > 0.5 ? P.leafDark : P.metal;
  const spot = accent(rng);
  paint(0, 3.2, 0, 2.8, 2.6, 5.4, coat);
  paint(0.8, 3.6, 0.6, 1.4, 1.2, 1.6, spot);
  for (const sz of [-1.8, 1.8]) {
    for (const sx of [-0.9, 0.9]) paint(sx, 1.6, sz, 0.8, 3.2, 0.8, coat);
  }
  // Neck, sloping forward and down.
  for (let i = 0; i < 5; i++) {
    paint(0, 5.2 + i * 0.9, 2.6 + i * 0.75, 1.3, 1.2, 1.3, coat);
  }
  paint(0, 9.4, 6.6, 1.5, 1.3, 2.2, coat);
  paint(0, 9.0, 7.6, 1.0, 0.7, 0.8, spot);
  paint(0, 3.6, -3.1, 0.5, 2.4, 0.5, spot); // tail
}

/** A fat little bird. */
export function bird(paint, { rng } = {}) {
  const coat = accent(rng);
  paint(0, 1.1, 0, 1.5, 1.5, 1.9, coat);
  paint(0, 2.3, 0.45, 1.2, 1.1, 1.2, coat);
  paint(0, 2.2, 1.15, 0.5, 0.45, 0.6, palette.accents[1]); // beak
  for (const sx of [-0.45, 0.45]) {
    paint(sx, 2.45, 1.0, 0.26, 0.26, 0.22, palette.background); // eyes
    paint(sx * 1.85, 1.2, -0.1, 0.35, 0.9, 1.3, coat); // wings
    paint(sx * 0.45, 0.2, 0.2, 0.3, 0.4, 0.5, palette.accents[1]); // feet
  }
  paint(0, 1.3, -1.2, 0.7, 0.9, 0.7, coat); // tail
}

/**
 * A boulder, or a cluster of them. Low and squat: a cube of any size sitting
 * on the ground reads as a crate, so these are kept wider than they are tall
 * and mostly grey, which reads as stone.
 */
export function rock(paint, { rng, snow = false } = {}) {
  const n = 1 + ((rng() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const s = 0.8 + rng() * 1.5;
    const x = (rng() - 0.5) * 2.8;
    const z = (rng() - 0.5) * 2.8;
    const h = s * (0.42 + rng() * 0.22);
    paint(x, h / 2, z, s, h, s * (0.7 + rng() * 0.5), rng() > 0.25 ? P.metal : P.trunk, rng() * 3);
    if (snow) paint(x, h + 0.12, z, s * 0.9, 0.24, s * 0.7, P.snow);
  }
}

/** A run of post-and-rail fence, along the prop's own +z. */
export function fence(paint, { rng } = {}) {
  const posts = 4 + ((rng() * 3) | 0);
  const step = 2.6;
  for (let i = 0; i < posts; i++) {
    paint(0, 0.85, i * step, 0.32, 1.7, 0.32, P.trunk);
    if (i < posts - 1) {
      paint(0, 1.3, i * step + step / 2, 0.18, 0.28, step, P.trunk);
      paint(0, 0.7, i * step + step / 2, 0.18, 0.28, step, P.trunk);
    }
  }
}

/** A bench beside the route. */
export function bench(paint, { rng } = {}) {
  const wood = rng() > 0.5 ? P.trunk : P.sand;
  paint(0, 0.5, 0, 3.2, 0.3, 1.0, wood);
  paint(0, 1.0, -0.42, 3.2, 1.0, 0.25, wood);
  for (const sx of [-1.3, 1.3]) paint(sx, 0.25, 0, 0.3, 0.5, 0.9, P.metal);
}

/* ------------------------------------------------------------------ */
/* Street level                                                        */
/* ------------------------------------------------------------------ */
/* Everything here stands ON the ground: the lowest cube's bottom face is
 * at local y = 0, so the brush puts it exactly on the surface. Anything
 * meant to be in the air (cloud, balloon, floatingCube) says so by being
 * placed at a height, never by being modelled floating. */

/** A small car. Runs along its own +z. */
export function car(paint, { rng } = {}) {
  const paintwork = accent(rng);
  const glass = palette.grid;
  for (const z of [-1.4, 1.4]) {
    for (const x of [-0.85, 0.85]) paint(x, 0.45, z, 0.32, 0.9, 0.9, palette.background);
  }
  paint(0, 0.95, 0, 1.9, 0.9, 4.2, paintwork);
  paint(0, 1.62, -0.25, 1.7, 0.7, 2.1, paintwork);
  paint(0, 1.62, -0.25, 1.78, 0.42, 1.9, glass);
  paint(0, 1.05, 2.15, 1.6, 0.4, 0.2, P.snow); // lights
  paint(0, 1.05, -2.15, 1.5, 0.35, 0.2, P.roof);
  paint(0, 0.5, 0, 2.0, 0.25, 4.0, palette.background); // shadow line under
}

/** A motorbike, on its stand. */
export function motorbike(paint, { rng } = {}) {
  const paintwork = accent(rng);
  for (const z of [-0.95, 0.95]) paint(0, 0.42, z, 0.26, 0.84, 0.84, palette.background);
  paint(0, 0.85, 0, 0.34, 0.5, 1.9, P.metal);
  paint(0, 1.18, 0.15, 0.6, 0.55, 0.9, paintwork); // tank
  paint(0, 1.2, -0.62, 0.62, 0.3, 0.8, palette.background); // seat
  paint(0, 1.52, 0.72, 1.06, 0.16, 0.16, P.metal); // bars
  paint(0, 1.28, 0.95, 0.32, 0.32, 0.22, palette.accents[1]); // headlight
  paint(0.3, 0.3, -0.3, 0.12, 0.6, 0.12, P.metal); // stand
}

/**
 * An oversized shoe, as a piece of public sculpture. Scaled up in the
 * presets — at its natural size it is a shoe someone left behind.
 */
export function shoe(paint, { rng } = {}) {
  const upper = accent(rng);
  paint(0, 0.22, 0, 1.5, 0.44, 4.0, P.snow); // sole
  paint(0, 0.62, -0.5, 1.42, 0.5, 3.0, upper);
  paint(0, 1.05, -1.0, 1.3, 0.5, 2.0, upper);
  paint(0, 1.45, -1.45, 1.1, 0.5, 1.1, upper); // heel collar
  paint(0, 1.0, 0.35, 0.9, 0.55, 1.2, P.sand); // tongue
  for (let i = 0; i < 3; i++) paint(0, 1.12 + i * 0.02, 0.1 - i * 0.55, 1.0, 0.16, 0.16, P.snow);
}

/** A multi-storey block: the tallest ordinary building. */
export function towerBlock(paint, { rng } = {}) {
  const storeys = 4 + ((rng() * 3) | 0);
  const w = 5 + rng() * 2.5;
  const d = 4.5 + rng() * 2;
  const wall = rng() > 0.5 ? P.sand : P.metal;
  for (let i = 0; i < storeys; i++) {
    paint(0, 1.4 + i * 2.8, 0, w, 2.8, d, wall);
    // window band, inset a touch on all four faces
    paint(0, 2.1 + i * 2.8, 0, w + 0.06, 0.9, d * 0.62, palette.grid);
    paint(0, 2.1 + i * 2.8, 0, w * 0.62, 0.9, d + 0.06, palette.grid);
  }
  paint(0, 1.4 + storeys * 2.8, 0, w + 0.7, 0.5, d + 0.7, P.roof);
  paint(w * 0.25, 2.1 + storeys * 2.8, 0, 1.0, 1.2, 1.0, P.metal);
  paint(0, 0.35, d / 2 + 0.1, 1.2, 0.7, 0.2, P.trunk); // door
}

/** A shop with a striped awning and a sign over the door. */
export function shop(paint, { rng } = {}) {
  const wall = rng() > 0.5 ? P.wall : P.snow;
  const trim = accent(rng);
  paint(0, 1.7, 0, 6.4, 3.4, 4.6, wall);
  paint(0, 3.6, 0, 6.9, 0.5, 5.0, P.roof);
  paint(0, 4.05, 0, 5.2, 0.4, 3.8, P.roof);
  // Awning: alternating stripes, sloping out over the pavement.
  for (let i = 0; i < 7; i++) {
    paint(-2.7 + i * 0.9, 2.6, 2.75, 0.9, 0.3, 1.4, i % 2 ? trim : P.snow);
  }
  paint(0, 2.05, 2.35, 5.6, 0.7, 0.2, trim); // sign band
  paint(0, 2.05, 2.28, 4.4, 0.3, 0.12, palette.ink);
  paint(-1.6, 0.9, 2.32, 1.6, 1.8, 0.2, palette.grid); // window
  paint(1.7, 0.85, 2.32, 1.2, 1.7, 0.2, P.trunk); // door
}

/** A kiosk: a little stall with a canopy and a counter. */
export function kiosk(paint, { rng } = {}) {
  const trim = accent(rng);
  paint(0, 1.1, 0, 3.2, 2.2, 2.4, P.sand);
  paint(0, 2.35, 0, 3.8, 0.35, 3.0, trim);
  paint(0, 2.65, 0, 2.2, 0.3, 1.8, trim);
  paint(0, 1.55, 1.3, 3.0, 0.25, 0.7, P.trunk); // counter
  for (const sx of [-1.4, 1.4]) paint(sx, 0.85, 1.25, 0.2, 1.7, 0.2, P.metal);
  paint(0, 1.0, 0, 2.4, 1.2, 0.2, palette.grid);
  if (rng() > 0.5) paint(1.0, 2.9, 0, 0.5, 0.5, 0.5, accent(rng));
}

/** A bus shelter. */
export function busStop(paint, { rng } = {}) {
  paint(0, 1.4, 0, 0.25, 2.8, 0.25, P.metal);
  paint(0.9, 1.4, -1.4, 0.25, 2.8, 0.25, P.metal);
  paint(0.9, 1.4, 1.4, 0.25, 2.8, 0.25, P.metal);
  paint(0.55, 2.9, 0, 2.2, 0.28, 3.2, accent(rng));
  paint(1.0, 1.5, 0, 0.16, 2.2, 3.0, palette.grid); // back panel
  paint(0.6, 0.62, 0, 1.0, 0.24, 2.2, P.trunk); // bench
  paint(-0.1, 2.4, 0, 0.8, 0.9, 0.16, palette.accents[3]); // timetable
}

/** A litter bin. */
export function bin(paint, { rng } = {}) {
  paint(0, 0.55, 0, 0.9, 1.1, 0.9, rng() > 0.5 ? P.leafDark : P.metal);
  paint(0, 1.18, 0, 1.0, 0.16, 1.0, P.metal);
}

/** A stack of crates. */
export function crates(paint, { rng } = {}) {
  const n = 2 + ((rng() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const s = 0.9 + rng() * 0.5;
    paint((rng() - 0.5) * 1.4, s / 2 + (i % 2) * s, (rng() - 0.5) * 1.4, s, s, s, rng() > 0.6 ? accent(rng) : P.trunk);
  }
}

/** A dog, trotting. */
export function dog(paint, { rng } = {}) {
  const coat = rng() > 0.5 ? P.trunk : P.sand;
  paint(0, 0.85, 0, 0.7, 0.75, 1.7, coat);
  for (const z of [-0.55, 0.55]) {
    for (const x of [-0.26, 0.26]) paint(x, 0.24, z, 0.22, 0.48, 0.22, coat);
  }
  paint(0, 1.35, 0.85, 0.6, 0.6, 0.7, coat);
  paint(0, 1.2, 1.25, 0.35, 0.3, 0.3, palette.background);
  for (const sx of [-0.24, 0.24]) paint(sx, 1.72, 0.8, 0.22, 0.34, 0.16, coat);
  paint(0, 1.35, -0.95, 0.2, 0.55, 0.2, coat);
}

/** A market stall with a striped roof and goods on the table. */
export function stall(paint, { rng } = {}) {
  const trim = accent(rng);
  for (const sx of [-1.6, 1.6]) {
    for (const sz of [-1.1, 1.1]) paint(sx, 1.0, sz, 0.18, 2.0, 0.18, P.trunk);
  }
  for (let i = 0; i < 6; i++) {
    paint(-1.75 + i * 0.7, 2.15, 0, 0.7, 0.3, 2.8, i % 2 ? trim : P.snow);
  }
  paint(0, 1.25, 0, 3.6, 0.22, 2.2, P.trunk);
  for (let i = 0; i < 5; i++) {
    paint(-1.4 + i * 0.7, 1.55, (rng() - 0.5) * 1.2, 0.5, 0.45, 0.5, accent(rng));
  }
}

/* Natural height of each landmark, in world units. districts.js scales
 * them to scenery.LANDMARK_HEIGHT so they fit the camera's frame. */
latticeTower.height = 66;
ferrisWheel.height = 34;
windmill.height = 27;
castle.height = 24;
lighthouse.height = 34;
rocket.height = 36;
