# Architecture

Three.js + GSAP ScrollTrigger + Vite. Plain JS, ES modules, no framework.

## File tree

```
index.html            page shell: entry gate, #webgl, #scroll-spacer, #doc, #overlay
vite.config.js        base './', manualChunks three/gsap, assetsInlineLimit 0
tools/
  gen-placeholder-audio.py   regenerates public/audio/* from scratch
public/audio/         theme.wav + 3 sfx wavs (placeholders)
src/
  main.js             boot, palette->CSS, capability detect, Enter handoff
  content.js          ALL copy. No logic.
  config.js           palette, camera, scroll, world, voxelText, groundText, entry, fallback
  style.css           colours read from CSS custom properties set by main.js
  ui/entry.js         entry gate (own 2D canvas + RAF loop, no Three.js)
  ui/dotGrid.js       makeDotTile / makeDotDataUri / applyDotGridCss
  world/scene.js      owns renderer, scene graph, RAF loop, teardown
  world/camera.js     createCamera, applyProgress, makeIntroDriver, resize
  world/path.js       curve, pointAt, tangentAt, frameAt, offsetFromPath, headingAt, textHeadingAt
  world/scroll.js     createScrollDriver, scrollHeightVh
  world/chunks.js     createChunkManager(scene, sections) -> update/mountAll/disposeAll
  world/districts.js  buildDistrict(section, u, index) -> {objects, updatables}
  world/beam.js       createBeam, createRiser, riserLabelTransform
  world/voxelText.js  createVoxelText(text, {position, rotationY, orientation})
  world/groundText.js createGroundText(text, {...}), setMaxAnisotropy
  world/bitmapFont.js rasteriseLine, rasteriseBlock, toCoords, glyph, gridToAscii
  world/pixels.js     textToPixels(text) -> {width, height, coords}
  world/ground.js     createGround()
  world/resources.js  boxGeometry, planeGeometry, litMaterial, flatMaterial, disposeAll
```

## Key constants — all in `src/config.js`

| Export | Holds |
|---|---|
| `palette` | every colour. Hex numbers, not CSS strings. `accents` is any length. |
| `camera` | `FOV` `PITCH_DEG` `YAW_DEG` `DISTANCE` `LOOK_AHEAD` `ROLL_DEG` `INTRO_*` |
| `scroll` | `HEIGHT_PER_SECTION_VH` `LEAD_IN_VH` `LEAD_OUT_VH` `SCRUB` `NAV_JUMP_DURATION` |
| `world` | `SECTION_ANCHORS` `PATH_POINTS` `CHUNK_RADIUS` `BEAM_SIDE` `CONTENT_SIDE` `GROUND_TEXT_ALIGN` `COMPENSATE_PITCH` `GRID_*` `FOG_*` |
| `voxelText` | `CUBE_SIZE` `CUBE_HEIGHT` `MAX_WORLD_WIDTH` `ACCENT_RATIO` `RESHUFFLE_MS` |
| `groundText` | `PIXELS_PER_UNIT` `BODY_FONT_UNITS` `LABEL_FONT_UNITS` `BODY_WIDTH` `LABEL_WIDTH` |
| helpers | `hex(n)`, `randomAccent()`, `pitchCompensation()` |

Per-district placement offsets live in `LAYOUT` at the top of `districts.js`,
not in config — they are offsets in normalised progress from a section anchor.

## Things a new developer will get wrong

1. **Chunks must never dispose shared geometry or materials.** `resources.js`
   owns them for the whole session. A chunk disposing `boxGeometry()` breaks
   every other chunk. Chunks dispose only their own `InstancedMesh` instance
   buffers and their own canvas textures, via `obj.userData.dispose()`.

2. **`headingAt` and `textHeadingAt` are not interchangeable.** A prop's
   forward is local `+Z`; a flattened text plane reads along local `+X`. They
   are a quarter turn apart. Using `headingAt` on text renders it mirrored.
   Props (risers) use `headingAt`; voxel headings and all ground text use
   `textHeadingAt`.

3. **The camera does not sit on the path.** Position is
   `pathPoint + worldFixedSphericalOffset(PITCH, YAW, DISTANCE)`. That is why
   the world slides past at a constant isometric angle instead of the camera
   swinging round bends, and why the tuning constants mean what they say.

4. **`applyProgress` must stay a pure function of progress.** Nothing
   accumulates between frames. This is the only reason scrubbing back up
   reproduces the transform exactly (verified bit-identical). Do not add
   damping or lerp-toward-target inside it.

5. **`YAW_DEG` above vs below 90 mirrors the whole composition.** Above 90 the
   camera is on the `-Z` side and the route recedes up-left (current). Below 90
   it recedes up-right. If you cross 90, flip the signs of `BEAM_SIDE` and
   `CONTENT_SIDE` too or the beam and body copy swap sides.

6. **Adding a section needs two edits.** `content.sections` in `content.js`
   *and* a matching entry in `world.SECTION_ANCHORS` in `config.js`. Lengths
   must match; `chunks.js` indexes them in parallel.

7. **Flat text is stretched along its depth axis** by `pitchCompensation()`
   (`1 / sin(pitch)`) to cancel the camera's downward foreshortening. Ground
   text and flat voxel headings both apply it; upright voxel text does not.

8. **Resizing a canvas resets its 2D context.** `groundText.js` measures with
   the font set, then sizes the canvas, then re-applies font, baseline, align
   and letter spacing. Reordering this silently changes the wrapping.

9. **`voxelText` auto-shrinks** past `MAX_WORLD_WIDTH`, so a long heading
   reduces its cube size rather than running out of frame.

10. **The ground plane follows the camera**, snapped to `GRID_SPACING`
    multiples so the dots appear static. `GROUND_SIZE` only needs to cover the
    visible area plus fog, not the whole route.

11. **Audio files are placeholders.** The loader prefers `theme.mp3`, then
    `.ogg`, then the shipped `.wav`. Drop in an mp3 and it wins with no code
    change. Regenerate placeholders with `tools/gen-placeholder-audio.py`.
