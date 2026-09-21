# Architecture

Isometric voxel world scrolled through on a fixed camera path, plus a flat 2D
document of the same content. Three.js + GSAP ScrollTrigger + Vite. Plain JS,
ES modules, no framework, no runtime network requests.

## State

Branch `claude/youthful-babbage-98fcpv`. Reviewed in 3 checkpoints (M1-3, M4-6, M7-8).

- **Done** — M1 entry gate; M2 world, camera path, scroll scrub, beam + markers;
  M3 voxel headings and flat ground text.
- **Not started** — M4 overlay/nav/click-to-jump; M5 2D mode; M6 audio manager.
- **Partial** — M7 districts are `createDistrictMarkers` placeholder blocks in
  `districts.js`, delete when real props land; M8 Enter pulls back from close
  range, fly-*between*-blocks outstanding.

`index.html` has empty `#overlay`/`#doc` containers; `main.js` exposes
`window.__site`. Settled, don't re-litigate: 4 sections (Profile/Projects/
Writing/About); real name in `content.js`, rest `[PLACEHOLDER]`; ground text
screen-aligned for legibility; route descends (camera on `-Z`); audio is WAV
(no encoder was available).

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
  ui/entry.js      entry gate (own 2D canvas + RAF, no Three.js)
  ui/dotGrid.js    makeDotTile, makeDotDataUri, applyDotGridCss
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
helpers `hex()` `randomAccent()` `pitchCompensation()`.

Per-district placement is `LAYOUT` at the top of `districts.js` — offsets in
normalised progress from a section anchor.

## Verifying

```bash
npm run build && npm run preview   # terminal 1
node tools/verify.mjs              # terminal 2
```

Headless Chromium: entry gate, Enter handoff, scrub reversibility, chunk
streaming, draw-call budget, console errors. Screenshots to `tools/shots/`.
Runs under SwiftShader, so `?debug` fps is meaningless there — measure in a
real browser. Playwright isn't a dependency; set `PW` to a global install.

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
