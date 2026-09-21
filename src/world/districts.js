/**
 * districts.js — builds the contents of one section's stretch of the route.
 *
 * Everything a district contains is created here and handed to the chunk
 * manager, which owns its lifetime. Text comes from content.js; placement
 * comes from the path and the constants below and in config.js.
 *
 * Scenery (M7) is themed per district by `section.district` — "plaza",
 * "harbour", "gardens" or "snowfield", as set in content.js. Each preset
 * below is a list of prop recipes; the prop forms themselves live in
 * props.js and know nothing about where they end up.
 *
 * DRAW CALLS: a district's props are accumulated into exactly two
 * InstancedMeshes — one static, one animated — because every prop is made of
 * cubes drawn from the same shared geometry and material. So a district costs
 * two draw calls for its scenery no matter how many props it contains, which
 * is stricter than one InstancedMesh per prop type.
 */

import { groundText as gtCfg, palette, scenery as scfg, world as cfg } from '../config.js';
import { createRiser, riserLabelTransform } from './beam.js';
import { createGroundText } from './groundText.js';
import { createVoxelText } from './voxelText.js';
import { headingAt, offsetFromPath, textHeadingAt, totalLength } from './path.js';
import { createVoxelBatch, makeRng } from './voxelBatch.js';
import * as props from './props.js';

/* Where each element sits along the route, as an offset in WORLD UNITS from
 * the section's anchor, converted to progress against the measured length of
 * the curve. World units rather than a fraction of the route, so that
 * re-laying out PATH_POINTS moves the districts without also stretching the
 * gaps between a heading and its own body copy. */
const LAYOUT_UNITS = {
  RISER: 0,
  HEADING: 31,
  SUB_LABEL: 56,
  BODY_START: 89,
  BODY_STEP: 47,
};

/** World units → a progress offset on this particular route. */
const along = (units) => units / totalLength;

const LAYOUT = Object.fromEntries(
  Object.entries(LAYOUT_UNITS).map(([k, v]) => [k, along(v)])
);

/**
 * @param {object} section  one entry from content.sections
 * @param {number} u        the section's anchor on the path
 * @returns {{ objects: object[], updatables: object[] }}
 */
export function buildDistrict(section, u, index) {
  const objects = [];
  const updatables = [];

  const add = (obj) => {
    if (!obj) return;
    objects.push(obj);
    if (typeof obj.update === 'function') updatables.push(obj);
  };

  /* ---- the beam's raised end, and the label printed on its top face ---- */
  add(createRiser(u + LAYOUT.RISER));

  const label = riserLabelTransform(u + LAYOUT.RISER);
  add(
    createGroundText(`${section.number} ${section.markerLabel}`, {
      position: label.position,
      rotationY: label.rotationY,
      worldWidth: label.width,
      variant: 'label',
      align: 'center',
      colour: palette.background,
    })
  );

  /* ---- the voxel heading ---- */
  const hu = u + LAYOUT.HEADING;
  add(
    createVoxelText(section.voxelHeading, {
      position: offsetFromPath(hu, cfg.CONTENT_SIDE, 0, 0),
      rotationY: textHeadingAt(hu),
    })
  );

  /* ---- the sub-label, flat on the ground in white caps ---- */
  if (section.subLabel) {
    const su = u + LAYOUT.SUB_LABEL;
    add(
      createGroundText(section.subLabel, {
        position: offsetFromPath(su, cfg.CONTENT_SIDE, 0, 0.01),
        rotationY: textHeadingAt(su),
        worldWidth: gtCfg.LABEL_WIDTH,
        variant: 'label',
        align: 'left',
        colour: palette.ink,
      })
    );
  }

  /* ---- body paragraphs, flat on the ground ---- */
  section.body.forEach((paragraph, i) => {
    const bu = u + LAYOUT.BODY_START + i * LAYOUT.BODY_STEP;
    add(
      createGroundText(paragraph, {
        position: offsetFromPath(bu, cfg.CONTENT_SIDE, 0, 0.01),
        rotationY: textHeadingAt(bu),
        worldWidth: gtCfg.BODY_WIDTH,
        variant: 'body',
        align: 'left',
        colour: palette.ink,
      })
    );
  });

  /* ---- scenery ---- */
  const base = PRESETS[section.district] ?? PRESETS.plaza;
  const preset = { ...base, items: [...base.items, ...DISTRICT_VERGE_ITEMS] };
  for (const mesh of buildScenery(preset, u, index, section.district)) add(mesh);

  return { objects, updatables };
}

/* ==================================================================== */
/* Scenery                                                              */
/* ==================================================================== */

const TAU = Math.PI * 2;

/* A recipe is: which prop, how many, and where it goes.
 *   count  number of copies (multiplied by scenery.DENSITY)
 *   side   'near' (beam side) or 'far' (content side), an explicit signed
 *          lateral distance, or a signed [lo, hi] range to pick from
 *   along  fixed offset in progress from the anchor; omitted means
 *          scattered at random through the district's span
 *   face   heading offset in radians from "along the route"; omitted
 *          means a random turn
 *   scale  size multiplier, jittered by `jitter`
 *   y      height off the ground, for anything airborne
 *   anim   paint into the animated batch instead of the static one, or
 *          'mixed' for a prop that paints into both
 *   lattice true lays the copies out edge to edge on a regular grid that
 *          fills the band and the span, instead of scattering them. `tile`
 *          is the prop's own edge length in world units and sets the
 *          spacing; `count` is then worked out, not given. Used for the
 *          harbour water and the snowfield's snow cover, which have to meet
 *          rather than float in patches.
 */
const PRESETS = {
  plaza: {
    items: [
      { prop: 'fountain', count: 1, side: 44, along: 0.035, face: 0, anim: 'mixed' },
      { prop: 'pavilion', count: 2, side: 'far', scale: 1.0 },
      { prop: 'house', count: 4, side: 'near' },
      { prop: 'shop', count: 3, side: 'far', face: Math.PI },
      { prop: 'towerBlock', count: 2, side: 'far' },
      { prop: 'kiosk', count: 2, side: 'near', face: 0 },
      { prop: 'stall', count: 3, side: 'far', face: 0 },
      { prop: 'shoe', count: 1, side: 42, along: 0.028, face: 0.6, scale: 2.4 },
      { prop: 'tree', count: 10, side: 'far', jitter: 0.25 },
      { prop: 'tree', count: 3, side: 'near', jitter: 0.25 },
      { prop: 'flowerBed', count: 9, side: 'far' },
      { prop: 'figure', count: 14, side: 'far', scale: 1.1 },
      { prop: 'figure', count: 4, side: 'near', scale: 1.1 },
      { prop: 'lampPost', count: 6, side: 'near', face: 0 },
      { prop: 'flag', count: 3, side: 'near', face: 0, anim: 'mixed' },
      { prop: 'signBoard', count: 2, side: 'near', face: 0 },
      { prop: 'bus', count: 1, side: -30, along: 0.07, face: 0 },
      { prop: 'cloud', count: 3, side: 'far', y: 'cloud', anim: true },
    ],
  },

  harbour: {
    items: [
      { prop: 'waterTile', side: [40, 88], face: 0, anim: true, lattice: true, tile: scfg.WATER_TILE },
      { prop: 'cargoShip', count: 2, side: 58, face: 0 },
      { prop: 'palm', count: 6, side: [28, 38], jitter: 0.3 },
      { prop: 'house', count: 4, side: 'near' },
      { prop: 'shop', count: 2, side: 'near', face: 0 },
      { prop: 'towerBlock', count: 3, side: 'near' },
      { prop: 'crates', count: 10, side: [26, 40] },
      { prop: 'stall', count: 2, side: 'near', face: 0 },
      { prop: 'figure', count: 9, side: 'near', scale: 1.1 },
      { prop: 'lampPost', count: 4, side: 'near', face: 0 },
      { prop: 'flag', count: 2, side: 'near', face: 0, anim: 'mixed' },
      { prop: 'signBoard', count: 1, side: 'near', face: 0 },
      { prop: 'cloud', count: 4, side: 'far', y: 'cloud', anim: true },
    ],
  },

  gardens: {
    items: [
      { prop: 'rainbowArch', count: 1, side: 46, along: 0.055, face: 0 },
      { prop: 'unicorn', count: 1, side: 40, along: 0.09, face: 0.6 },
      { prop: 'tree', count: 9, side: 'far', jitter: 0.3 },
      { prop: 'conifer', count: 5, side: 'near', jitter: 0.25 },
      { prop: 'cactus', count: 4, side: 'near' },
      { prop: 'flowerBed', count: 9, side: 'far' },
      { prop: 'pavilion', count: 1, side: 'near', scale: 0.9 },
      { prop: 'kiosk', count: 2, side: 'far', face: Math.PI },
      { prop: 'stall', count: 3, side: 'near', face: 0 },
      { prop: 'shoe', count: 1, side: -36, along: 0.03, face: 2.2, scale: 2.0 },
      { prop: 'figure', count: 9, side: 'far', scale: 1.1 },
      { prop: 'lampPost', count: 3, side: 'near', face: 0 },
      { prop: 'flag', count: 2, side: 'far', face: 0, anim: 'mixed' },
      { prop: 'cloud', count: 3, side: 'far', y: 'cloud', anim: true },
    ],
  },

  snowfield: {
    snow: true,
    items: [
      { prop: 'snowSheet', side: [32, 78], face: 0, lattice: true, tile: scfg.SNOW_TILE },
      { prop: 'snowSheet', side: [-22, -54], face: 0, lattice: true, tile: scfg.SNOW_TILE },
      { prop: 'train', count: 1, side: -28, along: 0.055, face: 0 },
      { prop: 'conifer', count: 12, side: 'far', jitter: 0.3 },
      { prop: 'conifer', count: 5, side: 'near', jitter: 0.3 },
      { prop: 'tree', count: 3, side: 'far' },
      { prop: 'house', count: 4, side: 'far' },
      { prop: 'towerBlock', count: 2, side: 'far' },
      { prop: 'shop', count: 2, side: 'far', face: Math.PI },
      { prop: 'snowDrift', count: 10, side: 'far' },
      { prop: 'snowDrift', count: 5, side: 'near' },
      { prop: 'figure', count: 6, side: 'far', scale: 1.1 },
      { prop: 'lampPost', count: 4, side: 'near', face: 0 },
      { prop: 'signBoard', count: 1, side: 'near', face: 0 },
      { prop: 'flag', count: 1, side: 'near', face: 0, anim: 'mixed' },
      { prop: 'cloud', count: 5, side: 'far', y: 'cloud', anim: true },
    ],
  },
};

/* The landmark zones that fill the route BETWEEN districts. Same recipe
 * format as above, but with no text and no riser, and each with a span
 * matching the gap it has to cover.
 *
 * ORDER MATTERS: these line up one for one with world.INTERLUDE_ANCHORS in
 * config.js, so the monument's zone is first because its anchor is progress
 * 0. Re-ordering one list without the other puts the castle round the
 * wordmark. */
/* Every interlude gets these as well as its own items: low clutter along
 * both verges, which is the part of the frame nearest the camera and the
 * part that reads as empty road when it is bare. */
/* Counts are high because of where this lands. The nearest corner of the
 * frame is filled only by props 10 to 30 units ahead of the camera on the
 * near verge — a 20-unit window out of a 280-unit zone. A handful of props
 * spread over the whole zone puts roughly none of them in shot at any one
 * moment, which is what left the foreground bare. */
const VERGE_ITEMS = [
  { prop: 'rock', count: 18, side: 'verge' },
  { prop: 'rock', count: 14, side: 'vergeNear' },
  { prop: 'fence', count: 6, side: 'vergeNear', face: 0 },
  { prop: 'fence', count: 5, side: 'verge', face: 0 },
  { prop: 'bench', count: 6, side: 'verge', face: 0 },
  { prop: 'flowerBed', count: 10, side: 'verge' },
  { prop: 'lampPost', count: 8, side: 'vergeNear', face: 0 },
  { prop: 'tree', count: 8, side: 'vergeNear', jitter: 0.3 },
  /* Traffic and street furniture. `face: 0` points them along the route,
   * which is what stops the cars sitting sideways across their own road. */
  { prop: 'car', count: 7, side: 'vergeNear', face: 0 },
  { prop: 'car', count: 4, side: 'verge', face: Math.PI },
  { prop: 'motorbike', count: 5, side: 'vergeNear', face: 0 },
  { prop: 'bin', count: 8, side: 'verge' },
  { prop: 'crates', count: 7, side: 'vergeNear' },
  { prop: 'busStop', count: 2, side: 'vergeNear', face: 0 },
  { prop: 'figure', count: 14, side: 'verge', scale: 1.1 },
  { prop: 'figure', count: 10, side: 'vergeNear', scale: 1.1 },
  { prop: 'dog', count: 4, side: 'verge', scale: 1.2 },
];

/* Districts get a lighter version of the same thing — but ONLY on the near
 * verge. The far verge is where the copy lives: a voxel heading is centred
 * on CONTENT_SIDE and can be up to voxelText.MAX_WORLD_WIDTH across, so it
 * reaches well into that lane, and anything put there ends up standing in
 * the middle of the words. */
const DISTRICT_VERGE_ITEMS = [
  { prop: 'rock', count: 12, side: 'vergeNear' },
  { prop: 'fence', count: 4, side: 'vergeNear', face: 0 },
  { prop: 'bench', count: 4, side: 'vergeNear', face: 0 },
  { prop: 'flowerBed', count: 5, side: 'vergeNear' },
  { prop: 'car', count: 5, side: 'vergeNear', face: 0 },
  { prop: 'motorbike', count: 4, side: 'vergeNear', face: 0 },
  { prop: 'bin', count: 5, side: 'vergeNear' },
  { prop: 'figure', count: 9, side: 'vergeNear', scale: 1.1 },
  { prop: 'dog', count: 3, side: 'vergeNear', scale: 1.2 },
];

const INTERLUDE_SPAN_START = 0;

const INTERLUDE_PRESETS = [
  {
    /* The monument itself stands here. It is 47 units across and sits on the
     * route centreline, so this zone keeps the verges clear and puts
     * everything out beyond it — otherwise the benches and fences end up
     * inside the wordmark. */
    span: 280,
    verges: false,
    items: [
      { prop: 'hill', count: 4, side: 'hills' },
      { prop: 'pavilion', count: 1, side: 44, along: 0.022 },
      { prop: 'tree', count: 10, side: 'far', jitter: 0.3 },
      { prop: 'tree', count: 5, side: 'near', jitter: 0.3 },
      { prop: 'shop', count: 2, side: 'far', face: Math.PI },
      { prop: 'towerBlock', count: 2, side: 'near' },
      { prop: 'stall', count: 2, side: 'far', face: 0 },
      { prop: 'flowerBed', count: 8, side: 'far' },
      { prop: 'lampPost', count: 6, side: 'near', face: 0 },
      { prop: 'flag', count: 4, side: 'near', face: 0, anim: 'mixed' },
      { prop: 'figure', count: 10, side: 'far', scale: 1.1 },
      { prop: 'critter', count: 3, side: 'far', scale: 1.25 },
      { prop: 'balloon', count: 3, side: [42, 74], y: 'balloon', scale: 0.62, anim: true },
      { prop: 'cloud', count: 4, side: 'far', y: 'cloud', anim: true },
    ],
  },
  {
    // The approach out of the monument straight towards district 01.
    span: 279,
    items: [
      { prop: 'hill', count: 4, side: 'hills' },
      { prop: 'house', count: 3, side: 'near' },
      { prop: 'towerBlock', count: 3, side: 'far' },
      { prop: 'shop', count: 2, side: 'near', face: 0 },
      { prop: 'kiosk', count: 2, side: 'far', face: Math.PI },
      { prop: 'tree', count: 7, side: 'far', jitter: 0.3 },
      { prop: 'bus', count: 1, side: -32, along: 0.022, face: 0 },
      { prop: 'signBoard', count: 2, side: 'near', face: 0 },
      { prop: 'figure', count: 8, side: 'far', scale: 1.1 },
      { prop: 'bird', count: 4, side: 'near', scale: 1.25 },
      { prop: 'lampPost', count: 4, side: 'near', face: 0 },
      { prop: 'cloud', count: 3, side: 'far', y: 'cloud', anim: true },
    ],
  },
  {
    // The tower. One big landmark, a park around it, people looking at it.
    span: 329,
    items: [
      { prop: 'latticeTower', count: 1, side: 'landmark', along: 0.019, face: 0.4 },
      { prop: 'hill', count: 4, side: 'hills' },
      { prop: 'tree', count: 10, side: 'far', jitter: 0.3 },
      { prop: 'tree', count: 5, side: 'near', jitter: 0.3 },
      { prop: 'flowerBed', count: 6, side: 'far' },
      { prop: 'figure', count: 12, side: 'far', scale: 1.1 },
      { prop: 'dog', count: 3, side: 'far', scale: 1.2 },
      { prop: 'shoe', count: 1, side: -34, along: 0.026, face: 1.4, scale: 2.2 },
      { prop: 'bird', count: 5, side: 'near', scale: 1.25 },
      { prop: 'lampPost', count: 4, side: 'near', face: 0 },
      { prop: 'balloon', count: 2, side: [44, 72], y: 'balloon', scale: 0.62, anim: true },
      { prop: 'cloud', count: 3, side: 'far', y: 'cloud', anim: true },
    ],
  },
  {
    // The fairground: a big wheel and a windmill on the skyline.
    span: 329,
    items: [
      { prop: 'ferrisWheel', count: 1, side: 'landmark', along: 0.02, face: 1.2, anim: 'mixed' },
      { prop: 'windmill', count: 1, side: -34, along: 0.042, face: 2.4 },
      { prop: 'hill', count: 4, side: 'hills' },
      { prop: 'signBoard', count: 2, side: 'near', face: 0 },
      { prop: 'flag', count: 4, side: 'far', face: 0, anim: 'mixed' },
      { prop: 'figure', count: 12, side: 'far', scale: 1.1 },
      { prop: 'critter', count: 4, side: 'near', scale: 1.25 },
      { prop: 'tree', count: 6, side: 'near', jitter: 0.3 },
      { prop: 'flowerBed', count: 5, side: 'far' },
      { prop: 'balloon', count: 3, side: [40, 70], y: 'balloon', scale: 0.62, anim: true },
    ],
  },
  {
    // The highlands: a castle on the hill, creatures grazing below.
    span: 329,
    items: [
      { prop: 'castle', count: 1, side: 'landmark', along: 0.022, face: 0.5 },
      { prop: 'hill', count: 5, side: 'hills' },
      { prop: 'conifer', count: 12, side: 'far', jitter: 0.35 },
      { prop: 'conifer', count: 6, side: 'near', jitter: 0.35 },
      { prop: 'grazer', count: 4, side: 'far', scale: 1.3 },
      { prop: 'critter', count: 5, side: 'near', scale: 1.25 },
      { prop: 'bird', count: 4, side: 'far', scale: 1.25 },
      { prop: 'flag', count: 2, side: 'near', face: 0, anim: 'mixed' },
      { prop: 'cloud', count: 4, side: 'far', y: 'cloud', anim: true },
    ],
  },
  {
    // The coast and the launch pad — the last stretch before the monument.
    span: 379,
    items: [
      { prop: 'rocket', count: 1, side: -34, along: 0.032, face: 0 },
      { prop: 'lighthouse', count: 1, side: 'landmark', along: 0.018, face: 0 },
      { prop: 'waterTile', side: [74, 118], face: 0, anim: true, lattice: true, tile: scfg.WATER_TILE },
      { prop: 'hill', count: 3, side: 'hills', snow: true },
      { prop: 'conifer', count: 7, side: 'far', jitter: 0.3 },
      { prop: 'figure', count: 8, side: 'near', scale: 1.1 },
      { prop: 'bird', count: 6, side: 'far', scale: 1.25 },
      { prop: 'signBoard', count: 1, side: 'near', face: 0 },
      { prop: 'cloud', count: 4, side: 'far', y: 'cloud', anim: true },
    ],
  },
];

/** The signs of the two lanes, taken from config so a YAW flip carries. */
const nearSign = Math.sign(cfg.BEAM_SIDE) || -1;
const farSign = Math.sign(cfg.CONTENT_SIDE) || 1;

function lateral(side, rng) {
  if (typeof side === 'number') return side;
  if (Array.isArray(side)) return side[0] + rng() * (side[1] - side[0]);
  const bands = {
    near: [scfg.NEAR_BAND, nearSign],
    far: [scfg.FAR_BAND, farSign],
    landmark: [scfg.LANDMARK_BAND, farSign],
    hills: [scfg.HILL_BAND, farSign],
    verge: [scfg.VERGE_BAND, farSign],
    vergeNear: [scfg.VERGE_BAND, nearSign],
  };
  const [[lo, hi], sign] = bands[side] ?? bands.far;
  return sign * (lo + rng() * (hi - lo));
}

function height(y, rng) {
  if (typeof y === 'number') return y;
  if (y === 'cloud' || y === 'balloon') {
    const [lo, hi] = y === 'cloud' ? scfg.CLOUD_HEIGHT : scfg.BALLOON_HEIGHT;
    return lo + rng() * (hi - lo);
  }
  return 0;
}

/**
 * An INTERLUDE: the landmark scenery filling a stretch between districts.
 * No heading, no copy, no beam riser — just the world either side of the
 * road, so the route is never empty for long.
 *
 * @returns {{ objects: object[], updatables: object[] }}
 */
export function buildInterlude(u, index) {
  const base = INTERLUDE_PRESETS[index % INTERLUDE_PRESETS.length];
  const preset = {
    ...base,
    spanStart: INTERLUDE_SPAN_START,
    items: base.verges === false ? base.items : [...base.items, ...VERGE_ITEMS],
  };
  const objects = [];
  const updatables = [];
  // Seeded well clear of the districts', so two zones never deal the same
  // scatter just because they happen to share an index.
  for (const mesh of buildScenery(preset, u, 0x51ed + index * 977, `interlude${index}`)) {
    objects.push(mesh);
    if (typeof mesh.update === 'function') updatables.push(mesh);
  }
  return { objects, updatables };
}

/**
 * Work out a lattice that fills a lateral band and the district's span with
 * tiles of a given edge length, meeting rather than overlapping.
 */
function latticeOf(side, tile, span) {
  const lo = Math.min(side[0], side[1]);
  const hi = Math.max(side[0], side[1]);
  const cols = Math.max(1, Math.round((hi - lo) / tile) + 1);
  const rows = Math.max(1, Math.round(span / tile) + 1);
  return { lo, cols, rows, step: tile };
}

/**
 * Build one district's props.
 *
 * Everything is seeded from the section index, so a chunk that is unmounted
 * and rebuilt comes back identical — scrubbing back up the page must not
 * re-deal the scenery.
 *
 * @returns {object[]} at most two InstancedMeshes: static, then animated.
 */
export function buildScenery(preset, u, seed, label) {
  const rng = makeRng(0x9e3779b9 ^ (seed * 0x85ebca6b));
  const span = preset.span ?? scfg.SPAN_UNITS;
  // An interlude's anchor IS the start of the gap it fills, so it gets no
  // run-in; a district's anchor is where its copy starts, so its scenery
  // begins a little before that.
  const spanStart = preset.spanStart ?? scfg.SPAN_START_UNITS;

  const still = createVoxelBatch();
  const moving = createVoxelBatch({ animated: true });

  for (const item of preset.items) {
    const fn = props[item.prop];
    if (!fn) continue;
    const lattice = item.lattice
      ? latticeOf(item.side, item.tile, span)
      : null;
    const count = lattice
      ? lattice.cols * lattice.rows
      : Math.max(0, Math.round((item.count ?? 1) * scfg.DENSITY));

    for (let i = 0; i < count; i++) {
      let alongU;
      let side;

      if (lattice) {
        const col = i % lattice.cols;
        const row = (i / lattice.cols) | 0;
        side = lattice.lo + col * lattice.step;
        alongU = u + along(spanStart + row * item.tile);
      } else {
        alongU =
          u +
          (item.along ??
            along(
              spanStart + ((i + rng()) / Math.max(count, 1)) * span
            ));
        side = lateral(item.side, rng);
      }
      const origin = offsetFromPath(alongU, side, 0, height(item.y, rng));
      const rotY = headingAt(alongU) + (item.face ?? rng() * TAU);
      const jitter = item.jitter ?? 0;
      /* A prop that declares its own natural height is a landmark, and gets
       * scaled to the frame's height budget. Without this the tall ones are
       * built at full size, and the camera — which has no sky in shot — only
       * ever shows their legs. */
      const toBudget = fn.height ? scfg.LANDMARK_HEIGHT / fn.height : 1;
      const scale = (item.scale ?? 1) * toBudget * (1 - jitter / 2 + rng() * jitter);

      const paint = (item.anim === true ? moving : still).brush(origin, rotY, scale);
      const animPaint =
        item.anim === 'mixed' ? moving.brush(origin, rotY, scale) : undefined;

      fn(paint, { rng, snow: Boolean(preset.snow), animPaint });
    }
  }

  /* The small cubes that float and bob in the air, everywhere. */
  const [fy0, fy1] = scfg.FLOAT_HEIGHT;
  for (let i = 0; i < Math.round(scfg.FLOAT_COUNT * scfg.DENSITY); i++) {
    const at = u + along(spanStart + rng() * span);
    const side = (rng() > 0.5 ? nearSign : farSign) * (10 + rng() * 55);
    const origin = offsetFromPath(at, side, 0, fy0 + rng() * (fy1 - fy0));
    props.floatingCube(moving.brush(origin, 0, 1), { rng });
  }

  const built = [still.build(), moving.build()].filter(Boolean);
  built.forEach((mesh, i) => {
    mesh.name = `scenery-${label}-${i === 0 ? 'static' : 'animated'}`;
  });
  return built;
}
