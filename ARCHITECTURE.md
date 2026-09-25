# Architecture

## Application state

`src/main.js` owns the current view, audio preference, parked camera position,
introduction animation and pending mode requests. There is one overlay, one
reading document, one audio controller and at most one scene instance.

The entry screen paints immediately. Desktop visitors may warm the 3D scene
behind it, but entering the reading view never waits for WebGL. Mobile, reduced
motion and direct reading links defer the scene import until the visitor opts in.

A request counter prevents a late scene load from overriding a more recent choice
to read. Switching views kills the introduction tween. Disabling the scroll driver
cancels any navigation tween before restoring the document scroll position.

## Modules

| Module | Responsibility |
| --- | --- |
| `content.js` | Public copy, section summaries, cards and contact destinations |
| `config.js` | Palette, camera, geometry, layout and sound constants |
| `sections.js` | Circular mapping between section indices and route progress |
| `ui/entry.js` | Pixel wordmark, entry actions and reduced-motion handling |
| `ui/overlay.js` | Navigation, view/audio/zoom controls and current-section guide |
| `ui/document2d.js` | Semantic reading document, cards, contact links and footer |
| `audio/audio.js` | Optional audio loading, a single looping source and mute gain |
| `world/scene.js` | Renderer, lighting, scene lifecycle, zoom and animation loop |
| `world/path.js` | Open route, wrapped progress and offsets from it |
| `world/camera.js` | Deterministic camera transforms and introduction flight |
| `world/scroll.js` | Looped page scroll, navigation and cancellation |
| `world/chunks.js` | Mounting and releasing nearby districts and interludes |
| `world/districts.js` | District composition and placement of text and props |
| `world/props.js` | Voxel scenery builders |
| `world/voxelBatch.js` | Instanced scenery geometry |
| `world/resources.js` | Shared geometry/material ownership and texture tracking |
| `world/bitmapFont.js` | Embedded bitmap glyph definitions |
| `world/voxelText.js` | Three-dimensional pixel headings |
| `world/groundText.js` | Ground text textures |
| `world/ground.js`, `world/beam.js` | Ground grid and route beam |

## Behaviour contracts

1. Personal content comes from `content.js`. Missing email and CV values render
   no links. Research interests are labelled as interests, not completed findings.
2. Sound is off unless chosen. Files load only after enabling sound. Navigation and
   switching views cannot create a second theme source.
3. One navigation tween can run at a time. New navigation replaces it. Wheel,
   touch and scroll-key input cancel it, as does switching to the reading view.
4. A 3D/reading round trip restores the camera position unless the reader has
   moved to another section.
5. Mobile layout uses the same 900 px boundary as capability detection, and updates
   on resize. Section links account for the fixed mobile header.
6. Reduced-motion users get a static entry canvas and immediate reading navigation.
   They may still choose the 3D view. Scene rendering pauses in a hidden tab.
7. WebGL construction failure or context loss leaves the reading view available.
8. Per-chunk disposal must not destroy shared geometry or materials. Global teardown
   releases the shared registry.
9. Relative build and audio paths work under a project subdirectory.

## Verification

`tools/smoke.mjs` checks production behaviour in Chromium at desktop and mobile
sizes, including missing assets, WebGL fallback, deep links, navigation races,
keyboard access and print colours. It uses `tools/preview-server.mjs` and writes
screenshots under `tools/shots/`.

`tools/verify.mjs` retains the detailed camera, geometry, chunk and performance
regression checks. Both suites accept an optional `CHROME` executable path.

`window.__site` exposes read-only accessors for scene diagnostics and test control.
It is an inspection hook, not an external API.
