# Architecture

Isometric voxel world scrolled through on a fixed camera path, plus a flat 2D
document of the same content. Three.js + GSAP ScrollTrigger + Vite. Plain JS,
ES modules, no framework, no runtime network requests.

## State

Branch `claude/youthful-babbage-98fcpv`. Reviewed in 3 checkpoints (M1-3, M4-6, M7-8).

- **Done** — M1 entry gate; M2 world, camera path, scroll scrub, beam + markers;
  M3 voxel headings and flat ground text; M4 persistent overlay (logo mark,
  name, nav with `aria-current`, View toggle, Sound toggle); M5 2D document
  mode, including with WebGL disabled; M6 audio on the raw Web Audio API.
- **Partial** — M7 districts are `createDistrictMarkers` placeholder blocks in
  `districts.js`, delete when real props land; M8 Enter pulls back from close
  range, fly-*between*-blocks outstanding, and the rule that narrow screens,
  `prefers-reduced-motion` and no-WebGL should *start* in 2D is only wired for
  the no-WebGL case (`capability.prefer2d` is computed but not yet acted on).

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
    camera.js      createCamera, applyProgress, makeIntroDriver, resize
    path.js        curve, pointAt, tangentAt, frameAt, offsetFromPath,
                   headingAt, textHeadingAt
    scroll.js      createScrollDriver -> progress/animateTo/jumpTo/refresh, scrollHeightVh
    chunks.js      createChunkManager(scene, sections) -> update/mountAll/disposeAll
    districts.js   buildDistrict(section, u, i) -> {objects, updatables}; LAYOUT
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
`camera` FOV PITCH_DEG YAW_DEG DISTANCE LOOK_AHEAD ROLL_DEG INTRO_* ·
`scroll` HEIGHT_PER_SECTION_VH LEAD_IN/OUT_VH SCRUB NAV_JUMP_DURATION ·
`world` SECTION_ANCHORS PATH_POINTS CHUNK_RADIUS BEAM_SIDE CONTENT_SIDE
GROUND_TEXT_ALIGN COMPENSATE_PITCH GRID_* FOG_* ·
`voxelText` CUBE_SIZE CUBE_HEIGHT MAX_WORLD_WIDTH ACCENT_RATIO RESHUFFLE_MS ·
`groundText` PIXELS_PER_UNIT BODY_FONT_UNITS LABEL_FONT_UNITS BODY/LABEL_WIDTH ·
`overlay` LOGO_* ICON_PX SCRIM_WIDTH/HEIGHT_PX SCRIM_ALPHA ·
`doc` MEASURE_CH HEADING_PIXEL_PX DOT_* SCROLL_BEHAVIOUR ·
`audio` BASE FORMATS THEME SFX THEME/SFX_GAIN FADE_IN MUTE_RAMP STORAGE_KEY ·
helpers `hex()` `randomAccent()` `pitchCompensation()` `pickAccentIndices()`.

`applyPalette()` in `main.js` pushes the palette AND the overlay/doc layout
constants into CSS custom properties (`--bg-rgb`, `--scrim-*`, `--measure`),
so `style.css` never hard-codes a value that `config.js` owns.

Per-district placement is `LAYOUT` at the top of `districts.js` — offsets in
normalised progress from a section anchor.

## Verifying

```bash
npm run build && npm run preview   # terminal 1
node tools/verify.mjs              # terminal 2
```

Headless Chromium, 42 checks: entry gate, Enter handoff, scrub reversibility,
chunk streaming, draw-call budget, the overlay (fixed position, `aria-current`
tracking, accessible names, tab order, focus ring, nav click, scrim over a
deliberately bright sheet), 2D mode (heading order, selectable text, AA
contrast, dot grid, position preserved across a round trip, and the whole
thing again with WebGL disabled), audio (one loop that survives scrolling,
mute as gain only, sessionStorage) and console errors. Screenshots to
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
