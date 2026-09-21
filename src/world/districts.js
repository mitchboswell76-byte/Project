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
  for (const mesh of buildScenery(section, u, index)) add(mesh);

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

/** The signs of the two lanes, taken from config so a YAW flip carries. */
const nearSign = Math.sign(cfg.BEAM_SIDE) || -1;
const farSign = Math.sign(cfg.CONTENT_SIDE) || 1;

function lateral(side, rng) {
  if (typeof side === 'number') return side;
  if (Array.isArray(side)) return side[0] + rng() * (side[1] - side[0]);
  const [lo, hi] = side === 'near' ? scfg.NEAR_BAND : scfg.FAR_BAND;
  const sign = side === 'near' ? nearSign : farSign;
  return sign * (lo + rng() * (hi - lo));
}

function height(y, rng) {
  if (typeof y === 'number') return y;
  if (y === 'cloud') {
    const [lo, hi] = scfg.CLOUD_HEIGHT;
    return lo + rng() * (hi - lo);
  }
  return 0;
}

/**
 * Work out a lattice that fills a lateral band and the district's span with
 * tiles of a given edge length, meeting rather than overlapping.
 */
function latticeOf(side, tile) {
  const lo = Math.min(side[0], side[1]);
  const hi = Math.max(side[0], side[1]);
  const cols = Math.max(1, Math.round((hi - lo) / tile) + 1);
  const rows = Math.max(1, Math.round(scfg.SPAN_UNITS / tile) + 1);
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
export function buildScenery(section, u, index) {
  const preset = PRESETS[section.district] ?? PRESETS.plaza;
  const rng = makeRng(0x9e3779b9 ^ (index * 0x85ebca6b));

  const still = createVoxelBatch();
  const moving = createVoxelBatch({ animated: true });

  for (const item of preset.items) {
    const fn = props[item.prop];
    if (!fn) continue;
    const lattice = item.lattice
      ? latticeOf(item.side, item.tile)
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
        alongU = u + along(scfg.SPAN_START_UNITS + row * item.tile);
      } else {
        alongU =
          u +
          (item.along ??
            along(
              scfg.SPAN_START_UNITS + ((i + rng()) / Math.max(count, 1)) * scfg.SPAN_UNITS
            ));
        side = lateral(item.side, rng);
      }
      const origin = offsetFromPath(alongU, side, 0, height(item.y, rng));
      const rotY = headingAt(alongU) + (item.face ?? rng() * TAU);
      const jitter = item.jitter ?? 0;
      const scale = (item.scale ?? 1) * (1 - jitter / 2 + rng() * jitter);

      const paint = (item.anim === true ? moving : still).brush(origin, rotY, scale);
      const animPaint =
        item.anim === 'mixed' ? moving.brush(origin, rotY, scale) : undefined;

      fn(paint, { rng, snow: Boolean(preset.snow), animPaint });
    }
  }

  /* The small cubes that float and bob in the air, everywhere. */
  const [fy0, fy1] = scfg.FLOAT_HEIGHT;
  for (let i = 0; i < Math.round(scfg.FLOAT_COUNT * scfg.DENSITY); i++) {
    const at = u + along(scfg.SPAN_START_UNITS + rng() * scfg.SPAN_UNITS);
    const side = (rng() > 0.5 ? nearSign : farSign) * (10 + rng() * 55);
    const origin = offsetFromPath(at, side, 0, fy0 + rng() * (fy1 - fy0));
    props.floatingCube(moving.brush(origin, 0, 1), { rng });
  }

  const built = [still.build(), moving.build()].filter(Boolean);
  built.forEach((mesh, i) => {
    mesh.name = `scenery-${section.district}-${i === 0 ? 'static' : 'animated'}`;
  });
  return built;
}
