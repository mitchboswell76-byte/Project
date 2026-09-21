# Architecture

Isometric voxel world scrolled through on a fixed camera path, plus a flat 2D
document of the same content. Three.js + GSAP ScrollTrigger + Vite. Plain JS,
ES modules, no framework, no runtime network requests.

## State

Branch `claude/youthful-babbage-98fcpv`. Reviewed in 3 checkpoints (M1-3, M4-6, M7-8).

- **Done** — M1 entry gate; M2 world, camera path, scroll scrub, beam + markers;
  M3 voxel headings and flat ground text; M4 persistent overlay (logo mark,
  name, nav with `aria-current`, View toggle, Sound toggle); M5 2D document
  mode, including with WebGL disabled; M6 audio on the raw Web Audio API;
  M7 themed voxel scenery per district (`props.js` + `voxelBatch.js`);
  M8 fly-through Enter transition, `capability.prefer2d` acted on for narrow
  screens / reduced motion / no WebGL, easing and performance passes.
- **Checkpoint 4** — the route is now a CLOSED LOOP (rounded pentagon, five
  straights: one per district plus the monument's); the camera holds its angle
  to the road (`camera.FOLLOW_PATH_HEADING`) because a world-fixed rig flips
  on the far side of a circuit; ScrollTrigger is gone, replaced by a direct
  scroll reader that wraps the scroll position by exactly one lap; the Enter
  transition opens head-on to the monument; the overlay scrim is no longer
  drawn in 2D; and landmark INTERLUDE zones fill the gaps between districts.
- All 87 checks in `tools/verify.mjs` pass. Measured: 15 draw calls / 39,124
  triangles at the worst point on the route, 13 / ~28k at a district, against
  a budget of 150 calls. SwiftShader fps (8–13) is fill-rate bound and is not
  a real frame rate; no GPU was available to measure one.

`main.js` owns view mode and exposes `window.__site` (`world`, `scroller`,
`overlay`, `doc`, `mode`, `audio`, `setMode`, `capability`). Settled, don't
re-litigate: 4 sections (Profile/Projects/Writing/About); real name in
`content.js`, rest `[PLACEHOLDER]`; ground text screen-aligned for legibility;
route descends (camera on `-Z`); audio is WAV (no encoder was available);
Playwright stays out of `package.json`.

## Tree

```
index.html         entry gate, #webgl, #scroll-spacer, #doc, #overlay
vite.config.js     base './', manualChunks three/gsap, assetsInlineLimit 0
tools/             gen-placeholder-audio.py, verify.mjs
public/audio/      theme.wav + 3 sfx (placeholders)
src/
  main.js          boot, palette->CSS vars, capability detect, Enter handoff
  content.js       ALL copy, no logic        config.js  ALL constants
  style.css        colours via CSS custom properties set by main.js
  sections.js      progressForSection, sectionAtProgress — the ONE mapping
                   between a section index and a point on the route
  ui/entry.js      entry gate (own 2D canvas + RAF, no Three.js)
  ui/dotGrid.js    makeDotTile, makeDotDataUri, applyDotGridCss
  ui/overlay.js    createOverlay -> setSection/setMode/setSound/element
  ui/document2d.js createDocument2d -> show/hide/scrollToSection/currentSection
  audio/audio.js   createAudio -> init/play/setMuted/muted/playing/stats;
                   readSoundPreference
  world/
    scene.js       createWorld -> warm/start/stop/setProgress/setIntro/stats/dispose
    camera.js      createCamera, applyProgress, makeIntroDriver(cam, monument), resize
    path.js        curve (CLOSED), pointAt, tangentAt, frameAt,
                   offsetFromPath, headingAt, textHeadingAt, cameraYawAt,
                   wrap, loopDistance, totalLength
    scroll.js      createScrollDriver -> progress/animateTo/jumpTo/refresh/
                   enable/disable/destroy; lapVh, scrollHeightVh. No
                   ScrollTrigger: it owns the scroll position and fights the
                   wrap.
    chunks.js      createChunkManager(scene, sections) -> update/mountAll/
                   disposeAll. Streams ZONES: districts + interludes.
    districts.js   buildDistrict(section, u, i) / buildInterlude(u, i)
                   -> {objects, updatables}; buildScenery(preset, u, seed,
                   label) -> InstancedMesh[]; LAYOUT_UNITS, PRESETS,
                   INTERLUDE_PRESETS, VERGE_ITEMS
    props.js       one function per prop form, painted through a brush
    voxelBatch.js  createVoxelBatch({animated}) -> cube/brush/build; makeRng
    beam.js        createBeam, createRiser, riserLabelTransform
    voxelText.js   createVoxelText(text, {position, rotationY, orientation})
    groundText.js  createGroundText(text, {...}), setMaxAnisotropy
    bitmapFont.js  rasteriseLine, rasteriseBlock, toCoords, glyph, gridToAscii
    pixels.js      textToPixels(text) -> {width, height, coords}
    ground.js      createGround
    resources.js   boxGeometry, planeGeometry, litMaterial, flatMaterial, disposeAll
```

## Constants — all in `config.js`

`palette` colours as hex numbers (not CSS strings); `accents` any length ·
`camera` FOV PITCH_DEG YAW_DEG FOLLOW_PATH_HEADING DISTANCE LOOK_AHEAD
ROLL_DEG INTRO_* (DURATION START_DISTANCE FRAMING PEAK_FOV EASE) ·
`scroll` UNITS_PER_SCREEN LOOP_BUFFER_VH SCRUB NAV_JUMP_DURATION/EASE ·
`world` SECTION_ANCHORS INTERLUDE_ANCHORS PATH_POINTS CHUNK_RADIUS BEAM_SIDE
CONTENT_SIDE
GROUND_TEXT_ALIGN COMPENSATE_PITCH GRID_* FOG_* ·
`voxelText` CUBE_SIZE CUBE_HEIGHT MAX_WORLD_WIDTH ACCENT_RATIO RESHUFFLE_MS ·
`scenery` NEAR/FAR/LANDMARK/HILL/VERGE_BAND LANDMARK_HEIGHT SPAN_START_UNITS
SPAN_UNITS DENSITY FLOAT_* CLOUD/BALLOON_HEIGHT WATER_TILE SNOW_TILE · `groundText` PIXELS_PER_UNIT BODY_FONT_UNITS LABEL_FONT_UNITS BODY/LABEL_WIDTH ·
`overlay` LOGO_* ICON_PX SCRIM_WIDTH/HEIGHT_PX SCRIM_ALPHA NARROW_DOC_TOP_PX
(scrim is 3D-only; `body.mode-2d` hides it) ·
`doc` MEASURE_CH HEADING_PIXEL_PX DOT_* SCROLL_BEHAVIOUR ·
`audio` BASE FORMATS THEME SFX THEME/SFX_GAIN FADE_IN MUTE_RAMP STORAGE_KEY ·
helpers `hex()` `randomAccent()` `pitchCompensation()` `pickAccentIndices()`.

`applyPalette()` in `main.js` pushes the palette AND the overlay/doc layout
constants into CSS custom properties (`--bg-rgb`, `--scrim-*`, `--measure`,
`--doc-top-narrow`),
so `style.css` never hard-codes a value that `config.js` owns.

Per-district placement is `LAYOUT_UNITS` at the top of `districts.js` — offsets
in WORLD UNITS from a section anchor, divided by `totalLength`. Scenery is
`PRESETS` (per district) and `INTERLUDE_PRESETS` (the landmark zones between
them), tuned by the `scenery` block in `config.js`.

## Verifying

```bash
npm run build && npm run preview   # terminal 1
node tools/verify.mjs              # terminal 2
```

Headless Chromium, 87 checks: entry gate, Enter handoff, scrub reversibility,
chunk streaming, draw-call budget, the overlay (fixed position, `aria-current`
tracking, accessible names, tab order, focus ring, nav click, scrim over a
deliberately bright sheet), 2D mode (heading order, selectable text, AA
contrast, dot grid, position preserved across a round trip, and the whole
thing again with WebGL disabled), audio (one loop that survives scrolling,
mute as gain only, sessionStorage), M7 scenery (two InstancedMeshes per district and no individual prop meshes,
per-district colour themes, a chunk that rebuilds bit-identically after being
unloaded, shared geometry surviving that, animated instances actually moving,
the draw-call budget), M8 (the Enter transition crossing the monument plane
inside the lettering and settling with no seam, narrow screens and
`prefers-reduced-motion` starting in 2D with the toggle still offered and the
document clearing the overlay) and console errors. Screenshots to
`tools/shots/` — `03b-overlay-on-bright.png` is the legibility evidence.
Runs under SwiftShader, so `?debug` fps is meaningless there — measure in a
real browser. Playwright isn't a dependency; set `PW` to a global install, and
`CHROME` to a browser binary if that Playwright's own Chromium is missing:

```bash
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/verify.mjs
```

## Easy to get wrong

1. **Chunks must never dispose shared geometry/materials.** `resources.js` owns
   them for the session; disposing `boxGeometry()` breaks every other chunk.
   Chunks dispose only their own instance buffers and canvas textures, via
   `obj.userData.dispose()`.
2. **`headingAt` ≠ `textHeadingAt`.** A prop's forward is local `+Z`; a
   flattened text plane reads along local `+X` — a quarter turn apart. Using
   `headingAt` on text renders it mirrored. Risers use `headingAt`; voxel
   headings and all ground text use `textHeadingAt`.
3. **The camera doesn't sit on the path.** Position is `pathPoint +
   worldFixedSphericalOffset(PITCH, YAW, DISTANCE)`. That's why the world
   slides past at a constant angle instead of swinging round bends.
4. **`applyProgress` must stay a pure function of progress.** Nothing
   accumulates between frames — the only reason scrubbing back up reproduces
   the transform bit-identically. Don't add damping or lerp-to-target inside it.
5. **`YAW_DEG` either side of 90 mirrors everything.** Above 90 the camera is
   on `-Z` and the route recedes up-left (current). If you cross 90, flip
   `BEAM_SIDE` and `CONTENT_SIDE` signs or beam and body copy swap sides.
6. **Adding a section needs two edits:** `content.sections` *and* a matching
   `world.SECTION_ANCHORS` entry. `chunks.js` indexes them in parallel.
7. **Flat text is stretched along its depth axis** by `pitchCompensation()`
   (`1/sin(pitch)`) to cancel foreshortening. Ground text and flat voxel
   headings apply it; upright voxel text doesn't.
8. **Resizing a canvas resets its 2D context.** `groundText.js` measures with
   the font set, sizes the canvas, then re-applies font/baseline/align/spacing.
   Reordering silently changes the wrapping.
9. **`voxelText` auto-shrinks** past `MAX_WORLD_WIDTH` rather than overflowing.
10. **The ground follows the camera**, snapped to `GRID_SPACING` so dots look
    static. `GROUND_SIZE` need only cover visible area + fog, not the route.
11. **Audio loader prefers `theme.mp3` → `.ogg` → shipped `.wav`.** Dropping in
    an mp3 wins with no code change. Regenerate placeholders with
    `tools/gen-placeholder-audio.py`.

12. **The overlay never moves.** It is `position: fixed` at `0,0` and is built
    once, in `buildChrome()`. Nothing may reposition it per mode, per section
    or per scroll frame — `verify.mjs` compares its rect before and after
    scrolling and across a 2D/3D round trip.
13. **Muted grey over scenery needs the scrim, not a brighter grey.** The
    overlay's secondary text is `inkMuted`, which passes on the near-black
    background and fails over bright props. `.overlay__scrim` is near-solid
    across the control column and only feathers past it. Weakening
    `SCRIM_ALPHA` or shrinking `SCRIM_WIDTH/HEIGHT_PX` below the column makes
    the nav unreadable the moment M7 props arrive.
14. **`sections.js` is the only mapping between a section and a progress
    value.** The nav and the 2D/3D toggle both use it; two separate copies
    would drift and the toggle would land somewhere the nav did not
    highlight.
15. **The theme is one `AudioBufferSourceNode`, created once.** Mute ramps the
    master gain and nothing else. Calling `stop()`, disconnecting, or building
    a second source on a section change is the bug this module exists to
    prevent — `verify.mjs` asserts `currentTime` keeps advancing across a
    mute/unmute cycle.
16. **`audio.init()` is called from the Enter handler and nowhere else.** A
    context created without a gesture is refused or comes up suspended.
    `resumeIfSuspended` re-nudges it on `visibilitychange` and `pointerdown`.
17. **The audio loader's 404s are the design, not a fault.** `theme.mp3` and
    `.ogg` are probed before the shipped `.wav`, so a fresh checkout logs two
    404s for files that are meant to be absent. `verify.mjs` filters exactly
    those and counts every other console error.
18. **A district's props are two InstancedMeshes, not one per prop type.**
    Every prop is cubes from the same shared geometry and material, so
    `voxelBatch.js` accumulates a whole district into one static mesh and one
    animated one. Giving a prop type its own mesh, or its own material,
    multiplies draw calls for nothing.
19. **Scenery placement must be deterministic.** `makeRng(seed)` is seeded from
    the section index, so a chunk that unloads and remounts comes back
    identical. `Math.random()` in a prop or a placement would re-deal the
    scenery every time you scrolled back up. Props may take `rng` and use it
    freely — just not the global one.
20. **Props stay out of the middle.** `NEAR_BAND` and `FAR_BAND` start beyond
    the beam and beyond `CONTENT_SIDE + BODY_WIDTH`. Narrowing them puts
    scenery on top of the body copy and the section labels.
21. **The intro driver must land exactly on `applyProgress(cam, 0)`.** At
    `k >= 1` it calls that directly rather than interpolating to something
    close, and the last control point of its curve IS the resting rig
    position. Anything else shows as a jump on the first scroll frame.
22. **`capability.prefer2d` is not the same as "no WebGL".** Narrow screens and
    reduced-motion visitors also start in 2D but keep a working 3D toggle, and
    the world stays built and stopped behind the document. Only `!webgl`
    disables the control. `ensureScroller()` exists because the scroll driver
    must not be created until 3D is actually shown.

23. **The route is a LOOP and progress WRAPS.** `pointAt`, `tangentAt` and
    `applyProgress` fold progress with `wrap()` rather than clamping it, and
    distance between two progress values is `loopDistance()` — the short way
    round. Clamping instead piles the whole tail of the world onto one point;
    a linear distance drops every district for a frame as you cross the join.
24. **The camera turns with the road.** `cameraYawAt()` is the single
    definition of the rig's yaw, and anything that must line up with the
    screen — `textHeadingAt` above all — reads it rather than the raw
    `YAW_DEG`. A constant there leaves every piece of flat copy skewed on the
    corners. Turning `FOLLOW_PATH_HEADING` off only makes sense on an open,
    broadly one-way path.
25. **The scroll position is not the progress.** The page is a buffer, then
    one lap, then a buffer, and the driver moves the scroll position by
    exactly one lap when you leave the lap region. Anything that wants to go
    to a progress value calls `jumpTo`/`animateTo`, never `window.scrollTo`
    with a fraction of the page — including `tools/verify.mjs`.
26. **Offsets along the route belong in WORLD UNITS, not fractions.**
    `LAYOUT_UNITS` and `scenery.SPAN_UNITS` are divided by `totalLength` at
    build time. As fractions they silently re-scale the whole world when
    `PATH_POINTS` changes length — the gap between a heading and its own body
    copy doubled the day the route became a loop.
27. **There is no sky in the shot.** At pitch 38 / FOV 30 the frame is all
    ground: about 20 to 110 units ahead of the camera, -50 to +80 across it,
    and nothing over roughly 14 units tall fits. Props outside that are built,
    streamed and drawn every frame and never seen. Landmarks declare a natural
    `height` and are scaled to `scenery.LANDMARK_HEIGHT`; `verify.mjs` fails
    if anything stands taller than the camera can frame.
28. **Interlude zones must not reach into a district.** Their spans are sized
    to the gaps the districts leave. A voxel heading is centred on
    `CONTENT_SIDE` and can be `voxelText.MAX_WORLD_WIDTH` across, so it
    reaches ~38 units out — which is why district verge scatter is near-side
    only, and why an overrunning interlude stands a bench inside the words.
29. **Sampling a fast camera move needs interpolation, not luck.**
    `verify.mjs` runs under SwiftShader at ~8fps, so samples are ~120ms apart.
    The Enter transition crosses a wall one cube deep in less than that, so
    the crossing checks interpolate the moment `n` changes sign rather than
    requiring a sample to land inside the wall.
