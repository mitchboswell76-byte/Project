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

  /* YAW_DEG rotates the camera about the vertical axis, and with it the
   * direction the journey appears to travel across the screen.
   *
   * The route runs along +X, so with a pitch of PITCH_DEG the travel
   * direction lands at atan(cos(YAW) / (sin(YAW) * sin(PITCH))) away from
   * straight-up-the-screen:
   *
   *   YAW  90  road recedes straight up the frame, world flows straight down
   *   YAW  68  road recedes to the UPPER RIGHT, world flows down and left
   *   YAW 145  road recedes to the UPPER LEFT, world flows down and right
   *
   * 68 is the reference composition: the movement reads as top-to-bottom,
   * the same gesture as the scroll that drives it, while the road still
   * crosses the frame at enough of an angle to keep the three-quarter voxel
   * read. It also puts the road in the upper RIGHT, away from the overlay in
   * the top-left corner, which a yaw above 90 runs the road straight through.
   *
   * The camera then sits on the +Z side of the route, so BEAM_SIDE (-Z) is
   * the FAR side and CONTENT_SIDE (+Z) the near one — the beam reads as
   * background behind the copy, as in the reference. Both still land on the
   * same screen sides they always did (beam left, copy right), because which
   * side of the screen an offset falls on is the sign of sin(YAW), and that
   * is positive either side of 90.
   */
  YAW_DEG: 68,

  /* Hold the yaw relative to the ROAD rather than to the world axes.
   *
   * ON. The rig keeps a constant angle to the road, so the route recedes in
   * the same screen direction on every straight and the world always flows
   * the same way down the frame — through the bends as well as along the
   * straights. With it off the composition is only correct where the road
   * happens to run along +X, and each bend swings the flow direction by the
   * angle of the bend, which is exactly what a scroll-driven journey must
   * not do. */
  FOLLOW_PATH_HEADING: true,

  DISTANCE: 92, // how far back along that pitch/yaw the camera sits.
  // At FOV 30 this sees roughly 88 x 49 world units of ground.

  /* ZOOM. A multiplier on DISTANCE, which the visitor can change from the
   * overlay. 1 is the default framing above; larger pulls back and shows
   * more world, smaller moves in. The steps are the values the buttons walk
   * through, so the range and the granularity are both set here. */
  ZOOM_STEPS: [0.72, 0.86, 1, 1.2, 1.45, 1.75],
  ZOOM_DEFAULT: 2, // index into ZOOM_STEPS

  LOOK_AHEAD: 0.01, // fraction of the curve to look ahead of the anchor.
  // (a fraction, so it was rescaled when the circuit doubled in length)
  LOOK_HEIGHT: 2.5, // raise the look-at target off the floor.

  ROLL_DEG: 1.6, // peak camera roll, oscillated across the journey.
  ROLL_CYCLES: 2.5, // how many roll oscillations over the full route.

  /* Enter transition. The camera flies into the monument, between its
   * blocks and out the front before settling back to the resting rig.
   * INTRO_START_DISTANCE sets how close that pass is — it is the scale of
   * the whole approach, not just a starting dolly distance. */
  INTRO_DURATION: 3.6, // seconds
  INTRO_START_DISTANCE: 6, // how close the fly-through passes
  /* The opening shot is head-on at the resting FOV, so the name reads flat.
   * FRAMING is how much room to leave around the wordmark in that shot:
   * 1.0 is exactly full-frame, 1.3 leaves a comfortable margin. */
  INTRO_FRAMING: 1.35,
  /* FOV widens to this for the pass between the blocks only, then comes
   * back — the first and last shots are both at the honest FOV above. */
  INTRO_PEAK_FOV: 76,
  INTRO_EASE: 'power2.inOut', // GSAP ease driving the transition's clock
};

/* ------------------------------------------------------------------ */
/* PERFORMANCE                                                         */
/* ------------------------------------------------------------------ */
/* The renderer starts at MAX_PIXEL_RATIO and drops to LOW_PIXEL_RATIO if the
 * first few seconds of the journey do not hold MIN_FPS. That is the whole
 * adaptive strategy: one step, measured once, never oscillating between two
 * resolutions. A phone at device pixel ratio 3 is shading nine times the
 * pixels of a laptop at 1, which is where mid-range hardware loses the frame
 * budget — not in the scene, which is a dozen draw calls. */

export const perf = {
  MAX_PIXEL_RATIO: 2, // cap on window.devicePixelRatio at full resolution
  LOW_PIXEL_RATIO: 1.25, // what a struggling device is dropped to
  SAMPLE_SECONDS: 3, // how long to measure before deciding
  MIN_FPS: 45, // below this average, drop the resolution
};

/* ------------------------------------------------------------------ */
/* SCROLL                                                              */
/* ------------------------------------------------------------------ */

export const scroll = {
  /* PACING. The route is a loop, so there is no lead-in or lead-out to size
   * any more — what matters is how much world goes past per screen of
   * scrolling. One lap is (path length / UNITS_PER_SCREEN) screens, which
   * means editing PATH_POINTS re-paces the page on its own instead of
   * silently making the journey faster. */
  UNITS_PER_SCREEN: 87,

  /* Spare scrolling at each end of the page, in viewport heights. The page
   * holds one lap plus these; when you scroll into one, the scroll position
   * jumps by exactly one lap. Progress is periodic with that period, so the
   * camera does not move at all — the scrollbar wraps, the world does not.
   * Must be at least 100 (one screen) or there is no room to wrap into. */
  LOOP_BUFFER_VH: 120,

  /* GSAP ScrollTrigger scrub. `true` = frame-accurate, exactly reversible.
   * A number (0.5–1) adds smoothing at the cost of strict scrub accuracy. */
  SCRUB: true,

  NAV_JUMP_DURATION: 1.5, // seconds for a click-to-jump camera move
  NAV_JUMP_EASE: 'power2.inOut', // GSAP ease for that move
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
   * normalised-progress units of its anchor, and disposed beyond it. It is a
   * fraction of the whole circuit, so it was halved when the circuit went
   * from a 1,100-unit line to a 2,300-unit loop — 0.09 is about 210 world
   * units, comfortably more than a district's own 0.122 of content.
   * Distance is measured the short way round the loop, not linearly. */
  CHUNK_RADIUS: 0.09,

  /* Where each section sits along the normalised camera path (0 → 1).
   * Must have one entry per section in content.js.
   *
   * Each anchor is the start of one of the route's straight runs, so a
   * district's copy — which runs FORWARD from its anchor, see LAYOUT_UNITS in
   * districts.js — lies along the straight and finishes before the next bend.
   * The heading holds at 90 degrees for the whole of every run. */
  SECTION_ANCHORS: [0.21, 0.406, 0.602, 0.798],

  /* INTERLUDES — the stretches BETWEEN districts.
   *
   * A district only occupies the straight it sits on; the corners and the
   * monument approach are route with nothing on them. Each anchor here gets
   * a landmark zone from INTERLUDE_PRESETS in districts.js: scenery only, no
   * heading, no copy, no beam riser. They stream exactly like districts do.
   *
   * Sized to the GAPS the districts leave, not spaced by eye. A district's
   * scenery runs from anchor-33 to anchor+190 world units; on this 2,818-unit
   * route that is 0.0117 to 0.0674 of progress, so the gaps between them run
   * about 0.13 (roughly 370 world units) and the opening stretch carries the
   * monument. Each anchor below is the start of a gap and each zone's span
   * (in districts.js) is the length of it, so the scenery meets end to end
   * without any zone reaching into a district and standing props in the
   * middle of its heading. */
  INTERLUDE_ANCHORS: [0.0, 0.0993, 0.2774, 0.4734, 0.6694, 0.8654],

  /* The long grey beam that runs alongside the route and carries the
   * section labels on the top face of its raised ends. */
  BEAM_SIDE: -16, // lateral offset from the path; sign must suit YAW_DEG
  BEAM_WIDTH: 3.6,
  BEAM_HEIGHT: 0.6,
  BEAM_SAMPLES: 420, // how finely the ribbon follows the curve
  RISER_HEIGHT: 2.1, // the raised end a label is printed on
  RISER_LENGTH: 34,
  RISER_WIDTH: 6.2,

  /* Where a district's flat content sits, relative to the route, on the
   * opposite side from BEAM_SIDE so the two never overlap.
   *
   * Kept tight to the road. The route recedes towards the upper right (see
   * YAW_DEG), so anything placed further ahead also drifts right across the
   * frame: at 13 the body copy — which starts 78 units past the heading —
   * ran off the right edge. */
  CONTENT_SIDE: 7,

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

  /* The camera path control points, in world units.
   *
   * The route is a CLOSED CIRCUIT: a rounded pentagon, five straights joined
   * by five corners. Scrolling past the end continues into the start with no
   * seam, because there is no end — `path.js` closes the curve, so the join
   * matches in both position and tangent.
   *
   * Five sides for four sections: each district gets a straight of its own,
   * and the fifth carries the opening monument. Side midpoints land exactly
   * on progress 0, 0.2, 0.4, 0.6 and 0.8 — that is five-fold symmetry, not a
   * coincidence, so SECTION_ANCHORS below are derived from it.
   *
   * Keeping content on the straights matters: the camera keeps a constant
   * angle to the ROAD (see FOLLOW_PATH_HEADING), so it only swings while the
   * road is turning. On a straight the composition is perfectly still.
   *
   * Regenerate with tools/gen-circuit.py if you want a different shape. */
  PATH_POINTS: [
    /* A long ONE-WAY route, not a circuit: straight runs where the content
     * sits, gentle S-bends between them, running broadly along +X so the
     * composition never inverts and the world always flows the same way down
     * the screen — like scrolling a page rather than going round a track.
     *
     * The opening run and the run-out are both dead straight on the same
     * heading, which is what lets the end wrap back to the start without the
     * shot changing shape. Regenerate with tools/gen-route.py. */
    [-220, 0, 0], // opening run — the monument
    [-128, 0, 0],
    [-35, 0, 0],
    [58, 0, 0],
    [150, 0, 0],
    [190, 0, 8], // bend
    [240, 0, 31],
    [290, 0, 54],
    [330, 0, 62], // run — district 01
    [418, 0, 62],
    [505, 0, 62],
    [592, 0, 62],
    [680, 0, 62],
    [720, 0, 51], // bend
    [770, 0, 19],
    [820, 0, -13],
    [860, 0, -24], // run — district 02
    [948, 0, -24],
    [1035, 0, -24],
    [1122, 0, -24],
    [1210, 0, -24],
    [1250, 0, -14], // bend
    [1300, 0, 17],
    [1350, 0, 48],
    [1390, 0, 58], // run — district 03
    [1478, 0, 58],
    [1565, 0, 58],
    [1652, 0, 58],
    [1740, 0, 58],
    [1780, 0, 47], // bend
    [1830, 0, 14],
    [1880, 0, -19],
    [1920, 0, -30], // run — district 04
    [2008, 0, -30],
    [2095, 0, -30],
    [2182, 0, -30],
    [2270, 0, -30],
    [2353, 0, -30], // run-out, straight, back to the opening heading
    [2437, 0, -30],
    [2520, 0, -30],
  ],
};

/* ------------------------------------------------------------------ */
/* SCENERY (M7)                                                        */
/* ------------------------------------------------------------------ */
/* Where a district's props sit and how many of them there are. Props are
 * kept out of the two lanes that carry meaning: the beam (BEAM_SIDE) and
 * the flat body copy (CONTENT_SIDE plus groundText.BODY_WIDTH), so scenery
 * never sits on top of anything you have to read. */

export const scenery = {
  /* Lateral bands, as distances from the route. 'near' is the beam side,
   * 'far' the content side; the signs are taken from BEAM_SIDE and
   * CONTENT_SIDE, so flipping YAW_DEG past 90 flips the scenery with it.
   *
   * These are bounded by what the camera can actually SEE. At the resting
   * rig the visible ground runs from about 20 to 120 units ahead of the
   * camera's anchor and from about -50 to +80 across it. Props outside that
   * are built, streamed and drawn, and never once appear on screen — so the
   * bands stop at the edge of the frame rather than somewhere arbitrary. */
  NEAR_BAND: [22, 48],
  FAR_BAND: [30, 66],

  /* Where the big landmarks stand.
   *
   * There is no sky in this shot: at pitch 38 and FOV 30 the frame is all
   * ground, from about 20 to 110 units ahead of the camera. That caps how
   * TALL anything can be and still fit — roughly 18 units at 40 ahead,
   * falling to 10 at 80. LANDMARK_SCALE below trims the landmark props to
   * that budget rather than widening the camera, which would shrink the
   * ground text with it. */
  LANDMARK_BAND: [32, 46],
  /* And the hills behind them, along the top edge of the shot. */
  HILL_BAND: [56, 80],

  /* What the tallest landmark should measure, in world units. Each landmark
   * prop is designed at its own natural size and scaled to this, so they
   * stay in proportion to each other while fitting the frame. */
  LANDMARK_HEIGHT: 14,

  /* Right beside the road. In a district this lane carries the body copy, so
   * only the interludes use it — it is the emptiest part of the frame. */
  VERGE_BAND: [17, 30],

  /* How far along the route a district's props are scattered, in WORLD
   * UNITS from its anchor. World units, not a fraction of the route: a
   * fraction silently re-scales every district when the path changes
   * length, which is exactly what happened when the route became a loop. */
  SPAN_START_UNITS: -33,
  SPAN_UNITS: 190,

  DENSITY: 1, // multiplies every prop count below 1 thins the world out

  /* The small cubes that float and bob in the air throughout. */
  FLOAT_COUNT: 30,
  FLOAT_MIN: 0.45,
  FLOAT_MAX: 1.3,
  // Minimum well clear of the flat ground text, or a low cube reads as a
  // brick sitting in the middle of a heading rather than as floating.
  FLOAT_HEIGHT: [7, 24],
  FLOAT_BOB_MIN: 0.4,
  FLOAT_BOB_MAX: 1.5,
  FLOAT_SPIN: 0.7,

  /* Airborne props have the same height budget as everything else: the frame
   * has no sky in it, so a cloud at 30 units is drawn above the top of the
   * viewport every frame and never seen. */
  CLOUD_HEIGHT: [13, 19],
  BALLOON_HEIGHT: [6, 11],
  WATER_TILE: 9.4, // edge length of one water tile
  SNOW_TILE: 15, // edge length of one snow-cover slab
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

  /* How long to wait for the world to finish building before letting the
   * visitor in anyway. A slow machine must not be held at a dead button with
   * nothing to click: past this, Enter opens the site regardless, and the
   * world either arrives a moment later or the reading view takes over. */
  READY_TIMEOUT_MS: 9000,

  /* How long the "scroll to travel" hint stays on screen after the Enter
   * transition hands over, in milliseconds. */
  HINT_MS: 4200,
};

/* ------------------------------------------------------------------ */
/* OVERLAY (M4)                                                        */
/* ------------------------------------------------------------------ */
/* The persistent top-left chrome. It is position: fixed and never moves,
 * in either 2D or 3D mode. Sizes here are CSS pixels. */

export const overlay = {
  LOGO_PIXEL_PX: 4, // on-screen size of one logo-mark pixel
  LOGO_GAP_PX: 1, // gap between logo pixels
  LOGO_PAD_PX: 9, // space between the pixels and the thin rectangle
  /* How many logo pixels are permanently accent-coloured. These are chosen
   * once, deterministically (see pickAccentIndices), so the mark looks the
   * same on every load rather than flickering like the entry wordmark. */
  LOGO_ACCENT_PIXELS: 3,

  ICON_PX: 22, // the 3D / document icons in the View row
  /* The legibility scrim, drawn only in 3D mode. It has to carry the MUTED
   * grey text, not just the white, over whatever scenery is behind it — so it
   * is close to solid over the control column and only feathers out past it.
   * It must stay larger than the control column, which measures 182 x 388 at
   * the default font size; past that, every extra pixel is scene it hides for
   * no reason. */
  SCRIM_WIDTH_PX: 260,
  SCRIM_HEIGHT_PX: 560, // tall enough to carry the column down to the keys row
  SCRIM_ALPHA: 0.94, // opacity at the corner, where the controls are

  /* On a narrow screen the overlay stops having a column of its own and the
   * reading view runs full width beneath it, so the document needs this much
   * clear space above it. It must exceed the height of the control column. */
  NARROW_DOC_TOP_PX: 470, // must clear the control column, now 446px tall
};

/* ------------------------------------------------------------------ */
/* 2D DOCUMENT (M5)                                                    */
/* ------------------------------------------------------------------ */

export const doc = {
  MEASURE_CH: 68, // body text measure, in characters
  HEADING_PIXEL_PX: 6, // size of one pixel in a bitmap-font heading
  HEADING_GAP_PX: 1,
  DOT_SPACING_PX: 28, // same dot grid as the entry gate
  DOT_SIZE_PX: 2,
  SCROLL_BEHAVIOUR: 'smooth', // set 'auto' to disable smooth nav scrolling
};

/* ------------------------------------------------------------------ */
/* AUDIO (M6)                                                          */
/* ------------------------------------------------------------------ */
/* Raw Web Audio API, no library. The loader tries the formats in ORDER,
 * so dropping public/audio/theme.mp3 in beats the shipped .wav with no
 * code change. */

export const audio = {
  BASE: 'audio/', // relative to the site root; works under a sub-path
  FORMATS: ['mp3', 'ogg', 'wav'],
  THEME: 'theme',
  SFX: ['sfx-enter', 'sfx-nav', 'sfx-toggle'],

  THEME_GAIN: 0.32, // the loop, at full volume
  SFX_GAIN: 0.45,
  FADE_IN: 1.8, // seconds, when the loop first starts
  MUTE_RAMP: 0.18, // seconds, for a mute/unmute gain ramp

  /* sessionStorage key holding 'on' or 'off'. sessionStorage, not
   * localStorage: a sound preference should not outlive the visit. */
  STORAGE_KEY: 'mb.sound',
  DEFAULT_ON: true,
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

/**
 * Deterministically choose `count` distinct indices out of `total`.
 * Used for the permanently-coloured pixels in the logo mark: the same
 * pixels every load, no timer, no flicker.
 */
export const pickAccentIndices = (total, count) => {
  const out = [];
  if (total <= 0) return out;
  // A golden-ratio stride spreads the picks out without clustering.
  const stride = Math.max(1, Math.round(total * 0.381966));
  let i = Math.floor(total * 0.17) % total;
  for (let k = 0; k < Math.min(count, total); k++) {
    while (out.includes(i)) i = (i + 1) % total;
    out.push(i);
    i = (i + stride) % total;
  }
  return out;
};
