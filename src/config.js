/**
 * config.js — every tuning value for the site.
 *
 * EDIT THIS FILE to change colours, camera angle, scroll length and scene
 * spacing. Nothing here is text: all copy lives in content.js.
 */

/* ------------------------------------------------------------------ */
/* PALETTE                                                             */
/* ------------------------------------------------------------------ */
/* Change these and the whole site follows: 3D props, voxel headings,
 * entry screen, 2D document and CSS custom properties are all derived
 * from this one object. Values are hex numbers so Three.js can read them
 * directly; the CSS layer converts them automatically. */

export const palette = {
  /* Structural */
  background: 0x07070a, // page + scene background
  grid: 0x272730, // faint dot grid on the ground and behind the UI
  ground: 0x000000, // the ground plane itself
  beam: 0x8e8e98, // the long section beam / road
  beamTop: 0xb4b4c0, // lighter top face of the beam

  /* Typography */
  ink: 0xf2f2f5, // primary white text
  inkMuted: 0x7a7a88, // secondary grey text
  voxelGrey: 0x9a9aa6, // default colour of voxel heading cubes

  /* Accents — used for flickering pixels, scattered voxels and props.
   * Add or remove entries freely; everything reads the array length. */
  accents: [
    0xe4443a, // red
    0xf2c53d, // yellow
    0x3fae5a, // green
    0x3d7de8, // blue
  ],

  /* Extended scenery palette (M7) — props pick from here. */
  props: {
    leaf: 0x3fae5a,
    leafDark: 0x2c7c41,
    trunk: 0x7a4a2a,
    wall: 0xf2c53d,
    roof: 0xe4443a,
    water: 0x3d7de8,
    snow: 0xeef2f7,
    metal: 0xb4b4c0,
    sand: 0xd9b57a,
    pink: 0xe86fa8,
    orange: 0xef8b3c,
  },
};

/* ------------------------------------------------------------------ */
/* CAMERA                                                              */
/* ------------------------------------------------------------------ */
/* The camera is a RIG, not a thing that sits on the path. Its position is
 * the path point plus a fixed spherical offset, so these constants control
 * the diorama angle no matter how the path bends. Tune freely. */

export const camera = {
  FOV: 30, // degrees. 25–35 reads as isometric with a little depth.
  NEAR: 0.5,
  FAR: 900,

  PITCH_DEG: 38, // downward tilt. 35–45 is the reference look.

  /* YAW_DEG rotates the camera about the vertical axis.
   *
   * Values above 90 put the camera on the -Z side of the route, which makes
   * the route recede towards the UPPER LEFT — so its near end sits lower
   * right and the road reads as descending across the screen. That is the
   * reference composition. The effective isometric rotation is (180 - YAW),
   * so 145 here is a 35 degree turn, inside the usual 30–45 range.
   *
   * Values below 90 put the camera on the +Z side and mirror the whole
   * composition: the route then ascends left to right. Try 32 for that.
   *
   * If you change which side of 90 this sits on, also flip the signs of
   * BEAM_SIDE and CONTENT_SIDE below, or the beam and the body copy will
   * swap places.
   */
  YAW_DEG: 145,

  DISTANCE: 78, // how far back along that pitch/yaw the camera sits.
  // At FOV 30 / distance 78 the camera sees roughly 74 x 41 world units.
  // Every size below is chosen against that viewport.

  LOOK_AHEAD: 0.022, // fraction of the curve to look ahead of the anchor.
  LOOK_HEIGHT: 2.5, // raise the look-at target off the floor.

  ROLL_DEG: 1.6, // peak camera roll, oscillated across the journey.
  ROLL_CYCLES: 2.5, // how many roll oscillations over the full route.

  /* Enter transition */
  INTRO_DURATION: 2.6, // seconds
  INTRO_START_DISTANCE: 5, // camera starts this close — inside the monument
  INTRO_START_FOV: 72, // wide FOV at the start sells the fly-through
};

/* ------------------------------------------------------------------ */
/* SCROLL                                                              */
/* ------------------------------------------------------------------ */

export const scroll = {
  /* Total scrollable height, in viewport heights, per section.
   * 4 sections x 3.2 = 12.8 screens of scrolling. */
  HEIGHT_PER_SECTION_VH: 320,
  LEAD_IN_VH: 140, // monument + plaza + road before section 01
  LEAD_OUT_VH: 90, // breathing room after the last section

  /* GSAP ScrollTrigger scrub. `true` = frame-accurate, exactly reversible.
   * A number (0.5–1) adds smoothing at the cost of strict scrub accuracy. */
  SCRUB: true,

  NAV_JUMP_DURATION: 1.5, // seconds for a click-to-jump camera move
};

/* ------------------------------------------------------------------ */
/* WORLD                                                               */
/* ------------------------------------------------------------------ */

export const world = {
  UNIT: 1, // size of one voxel cube
  GROUND_SIZE: 520, // the ground follows the camera, so this need only
  // cover the visible area plus fog distance — not the whole route.
  GRID_SPACING: 3, // world units between dot-grid dots
  GRID_DOT_WORLD: 0.26, // dot diameter, in world units
  GRID_TILE_PX: 64, // texture resolution of one grid tile

  FOG_NEAR: 110,
  FOG_FAR: 380,

  /* Chunk streaming: a chunk is added when the camera is within this many
   * normalised-progress units of its anchor, and disposed beyond it. */
  CHUNK_RADIUS: 0.16,

  /* Where each section sits along the normalised camera path (0 → 1).
   * Must have one entry per section in content.js. */
  SECTION_ANCHORS: [0.3, 0.49, 0.68, 0.87],

  /* The long grey beam that runs alongside the route and carries the
   * section labels on the top face of its raised ends. */
  BEAM_SIDE: -16, // lateral offset from the path; sign must suit YAW_DEG
  BEAM_WIDTH: 3.6,
  BEAM_HEIGHT: 0.6,
  BEAM_SAMPLES: 420, // how finely the ribbon follows the curve
  RISER_HEIGHT: 2.1, // the raised end a label is printed on
  RISER_LENGTH: 34,
  RISER_WIDTH: 6.2,

  /* Where a district's flat content sits, relative to the route. Negative
   * puts it on the far side from the beam, so the beam reads as foreground. */
  CONTENT_SIDE: 13,

  /* How flat ground text is oriented.
   *   'screen' — still lying flat on the ground, but always turned so it
   *              reads horizontally from the camera. Most legible. Default.
   *   'path'   — runs along the route, parallel to the beam. Closer to the
   *              reference, but tilted and foreshortened, so harder to read.
   * Because the camera angle is fixed, 'screen' is a constant rotation; the
   * text still sits in the scene rather than floating in front of it. */
  GROUND_TEXT_ALIGN: 'screen',

  /* Text lying flat on the ground is squashed vertically by the camera's
   * downward tilt — at 38 degrees it loses about 38% of its height. Setting
   * this true stretches flat text along its depth axis by 1 / sin(pitch) so
   * it reads with correct proportions from the camera, while still genuinely
   * lying on the floor. Set false to see the raw foreshortening. */
  COMPENSATE_PITCH: true,

  /* The camera path control points, in world units. The route runs broadly
   * along +X with lateral wander so the diorama never feels like a corridor.
   * Add points to lengthen the world; SECTION_ANCHORS are fractions of it. */
  PATH_POINTS: [
    [-180, 0, 0], // 0.00  monument
    [-95, 0, 18], // plaza + fountain
    [-10, 0, -8], // the long straight road
    [70, 0, 12],
    [150, 0, 28], // 01 district
    [250, 0, -6],
    [340, 0, -22], // 02 district
    [440, 0, 6],
    [530, 0, 26], // 03 district
    [630, 0, 0],
    [720, 0, -18], // 04 district
    [820, 0, 6],
    [900, 0, 16], // outro
  ],
};

/* ------------------------------------------------------------------ */
/* VOXEL TEXT                                                          */
/* ------------------------------------------------------------------ */

export const voxelText = {
  CUBE_SIZE: 0.62, // world size of one heading cube
  CUBE_GAP: 0.18, // gap between cubes, as a fraction of CUBE_SIZE
  CUBE_HEIGHT: 0.78, // how tall the cubes stand off the ground
  ALPHA_THRESHOLD: 128, // canvas alpha above which a pixel becomes a cube

  /* Headings auto-shrink to fit this width, so you can type a heading of any
   * length into content.js and it will still sit inside the frame. */
  MAX_WORLD_WIDTH: 50,

  ACCENT_RATIO: 0.1, // ~10% of cubes get an accent colour
  RESHUFFLE_MS: 1400, // how often accent colours are redealt
};

/* ------------------------------------------------------------------ */
/* GROUND TEXT                                                         */
/* ------------------------------------------------------------------ */

export const groundText = {
  PIXELS_PER_UNIT: 58, // canvas resolution per world unit — raise for crisper
  MAX_TEXTURE_PX: 2048, // hard cap on either canvas dimension
  /* Text size in WORLD UNITS, converted to canvas pixels using
   * PIXELS_PER_UNIT. Expressing it this way means changing the resolution
   * knob above sharpens the text without also resizing it. */
  BODY_FONT_UNITS: 1.5,
  LABEL_FONT_UNITS: 1.6,
  BODY_LINE_HEIGHT: 1.6,
  LABEL_LETTER_SPACING_UNITS: 0.12,

  /* World width of each flat text block. */
  BODY_WIDTH: 30, // keeps the canvas under MAX_TEXTURE_PX at 58 px/unit
  LABEL_WIDTH: 30,
};

/* ------------------------------------------------------------------ */
/* ENTRY SCREEN                                                        */
/* ------------------------------------------------------------------ */

export const entry = {
  WORDMARK_PIXEL_PX: 11, // on-screen size of one wordmark pixel
  WORDMARK_GAP_PX: 1, // gap between wordmark pixels
  FLICKER_PER_SECOND: 3, // 2–4 in the brief
  FLICKER_BATCH: 4, // pixels recoloured per flicker tick

  DRIFT_SQUARES: 46, // background squares drifting behind/in front
  DRIFT_MIN_PX: 5,
  DRIFT_MAX_PX: 16,
  DRIFT_SPEED: 10, // pixels per second, roughly
};

/* ------------------------------------------------------------------ */
/* FALLBACKS                                                           */
/* ------------------------------------------------------------------ */

export const fallback = {
  MOBILE_BREAKPOINT_PX: 900, // below this width, load 2D mode by default
};

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

/** 0x3fae5a → "#3fae5a" (for CSS and 2D canvas work). */
export const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

/**
 * How much to stretch flat ground text along its depth axis so the camera's
 * downward tilt does not squash it. 1 when compensation is switched off.
 */
export const pitchCompensation = () =>
  world.COMPENSATE_PITCH ? 1 / Math.sin((camera.PITCH_DEG * Math.PI) / 180) : 1;

/** Pick a random accent colour as a hex number. */
export const randomAccent = () =>
  palette.accents[(Math.random() * palette.accents.length) | 0];
