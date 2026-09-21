# Mitch Boswell — voxel portfolio

A personal site built as an isometric voxel world that you travel through by
scrolling. Scroll down and the camera flies along a fixed path through a
diorama; scroll back up and it retraces exactly. There is also a plain 2D
document version of the same content for reading, printing, screen readers
and low-power devices.

Built with Three.js, GSAP ScrollTrigger and Vite. No React, no CSS framework,
no external fonts, no analytics. Once the page has loaded it makes **no network
requests at all** — the pixel font, the dot grid and every prop are generated
in code.

---

## Running it

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install     # once
npm run dev     # development server, usually http://localhost:5173
npm run build   # production build into dist/
npm run preview # serve the production build locally
```

Add `?debug` to the URL (e.g. `http://localhost:5173/?debug`) to get a live
readout of frames per second, draw calls, triangles and which chunks are
loaded. Useful when you change the scene and want to check you have not made
it expensive. See **Performance** below for the numbers it should show.

---

## Where to change things

There are exactly two files you need. **You never have to touch anything in
`src/ui/`, `src/world/` or `src/audio/` to change your content or your
colours.**

There is also a `ui` block at the top of `content.js` holding every word of
interface text — the nav heading, "View :", "Sound :", "On", "Off", the
accessible labels read out by screen readers, and the short introduction at
the top of the reading view. Change the wording there, not in a module.

### 1. Your words → `src/content.js`

Every piece of text on the site lives in this one file: your name, the
wordmark, the navigation labels, every heading, every paragraph, your email
and your links.

Anything in `[SQUARE BRACKETS]` is placeholder text at roughly the right
length. **Search the file for `[` to find everything that still needs your
words.** The placeholders are deliberately the length of real copy so the
layout looks correct before you have written it.

```js
meta: {
  siteName: 'Mitch Boswell',           // browser tab + overlay
  nameLines: ['Mitch', 'Boswell', 'Portfolio'],  // the big pixel wordmark
  logoText: 'MB',                      // the small monogram, top left
  since: '2026',
  tagline: '[ONE SHORT LINE ABOUT WHAT YOU DO]',
}
```

Each section has:

| Field | What it is |
|---|---|
| `id` | internal name, used for the nav anchor. Lowercase, no spaces. |
| `number` | the `01`, `02` printed on the beam |
| `navLabel` | what appears in the top-left navigation |
| `markerLabel` | what is printed on the raised beam end, in caps |
| `voxelHeading` | the big heading built from cubes |
| `subLabel` | small white caps text on the ground |
| `body` | an array of paragraphs — add or remove entries freely |
| `district` | which scenery preset this stretch of route uses |

Headings shrink automatically if they are long, so you will not break the
layout by typing a heading that does not fit.

### 2. Your colours and camera → `src/config.js`

The whole palette is the `palette` object at the top. Change a value there and
it updates the 3D world, the entry screen, the 2D document **and** the CSS —
the stylesheet reads its colours from this file at startup.

```js
export const palette = {
  background: 0x07070a,   // page and scene background
  ink: 0xf2f2f5,          // main white text
  inkMuted: 0x7a7a88,     // secondary grey text
  accents: [0xe4443a, 0xf2c53d, 0x3fae5a, 0x3d7de8],  // add or remove freely
  ...
};
```

Colours are hex numbers (`0xrrggbb`), not CSS strings, because Three.js reads
them directly. The `accents` array can be any length — the flickering pixels,
the scattered voxels and the props all just read however many you give them.

The same file also holds the camera angle:

```js
export const camera = {
  FOV: 30,          // narrow reads isometric. 25–35 is the useful range.
  PITCH_DEG: 38,    // how far down the camera tilts
  YAW_DEG: 32,      // how far round it swings
  DISTANCE: 78,     // how far back it sits
};
```

`PITCH_DEG` and `YAW_DEG` together decide how steeply the route runs across
the screen. At 38/32 it runs at about 29°; raising either makes it steeper.

---

## The scenery

Each section names a `district` in `content.js` — `plaza`, `harbour`,
`gardens` or `snowfield` — and that decides what is built along its stretch
of the route:

| District | What is in it |
|---|---|
| `plaza` | a fountain, pavilions with yellow walls and red roofs, houses, trees, flower beds, people, lamp posts, flags, signage and a red double-decker bus |
| `harbour` | tiled water, cargo ships stacked with containers, palms, houses, people, lamp posts and a flag |
| `gardens` | a rainbow arch, a unicorn, trees, conifers, cacti, flower beds, a pavilion and people |
| `snowfield` | snow cover, snow-capped conifers and houses, drifts, a blue steam train with carriages, people and lamp posts |

Small coloured cubes float and bob in the air throughout, and clouds drift
overhead. Nothing in the scenery is interactive: props are either static or
gently animated, and none of them respond to the pointer.

Every prop is drawn from cubes in `src/world/props.js`. To change how much of
it there is, or how far from the route it sits, edit the `scenery` block in
`config.js` — `DENSITY` scales every count at once, and `NEAR_BAND` /
`FAR_BAND` set the two lanes props are allowed to occupy. Props are kept out
of the middle, where the beam and the body copy live, so scenery never lands
on top of something you have to read.

Adding a prop means writing one more function in `props.js` and naming it in a
district's list in `districts.js`. It costs no extra draw call, because a
district's props all go into the same two instanced meshes.

---

## Performance

Measured in this build at 1440 x 810, with `?debug`:

| | Draw calls | Triangles |
|---|---|---|
| Before the scenery landed (M6), mid-route | 12 | 11,494 |
| One district in view | 11 | 14,530 |
| Two districts in view (mid-route) | 14 | 22,090 |
| **Worst point on the route**, sweeping every 0.02 of progress | **20** | **31,486** |
| All four districts mounted at once, before Enter | 15 | 39,674 |

The budget is 150 draw calls; the worst frame on the route uses 20. That is because a
whole district's props — several hundred cubes making up trees, houses, a
ship, a train, a crowd of figures — are accumulated into one static
`InstancedMesh` and one animated one, drawn from a single shared geometry and
a single shared material.

**On frame rate:** the automated checks run under SwiftShader, a software
rasteriser, where the numbers sit between 8 and 13 fps regardless of what the
scene contains — it is fill-rate bound, not scene bound. Those figures are not
a real frame rate and are not quoted here as one. No GPU was available in the
environment this was built in, so the honest position is that the draw-call
and triangle counts above are measured and the frame rate is not. Open the
site with `?debug` on real hardware to see the actual figure.

---

## Adding or removing a section

Two edits, and they must match:

1. Add or remove an entry in `sections` in **`src/content.js`**.
2. Add or remove a matching anchor in `world.SECTION_ANCHORS` in
   **`src/config.js`**.

`SECTION_ANCHORS` is a list of positions along the camera path, from `0` at
the very start to `1` at the very end. Four evenly spread sections look like
this:

```js
SECTION_ANCHORS: [0.3, 0.49, 0.68, 0.87],
```

The gap before the first anchor is the opening monument, the plaza and the
road. The gap after the last one is the run-out. If you add a fifth section,
re-space them, for example `[0.26, 0.41, 0.56, 0.71, 0.86]`.

If you want a longer world to fit more in, add control points to
`world.PATH_POINTS` in the same file. It is a list of `[x, y, z]` positions
that the camera path is drawn through; the route runs broadly along `+X` and
wanders sideways in `z` so it never feels like a corridor.

---

## Swapping the audio

The site ships with placeholder music and sound effects generated from
scratch, so it works before you supply anything. They live in `public/audio/`:

| File | What it is |
|---|---|
| `theme.wav` | the looping background track, about 17 seconds |
| `sfx-enter.wav` | plays when you click Enter |
| `sfx-nav.wav` | plays on a navigation click |
| `sfx-toggle.wav` | plays when switching between 3D and 2D |

**To use your own music, put an MP3 at `public/audio/theme.mp3`.** The loader
tries `.mp3`, then `.ogg`, then falls back to the `.wav` — so adding your file
is enough, with no code change and nothing to delete.

What works best for the background track: **MP3 or OGG, 60–120 seconds, under
1 MB, and seamlessly loopable** — meaning the end runs straight back into the
start without a gap or a click. Anything longer mainly costs load time, since
most visitors will not hear the whole thing.

The same applies to the three effects: drop in `sfx-enter.mp3` and so on.
Keep them very short (under half a second) and noticeably quieter than you
think you need.

If you ever want to regenerate the placeholders, run
`python3 tools/gen-placeholder-audio.py` from the project root.

---

## Project layout

```
index.html          page shell
src/
  main.js           startup, capability detection, mode switching
  content.js        ALL your text — nothing else
  config.js         palette, camera angle, tuning values
  style.css         hand-written CSS
  sections.js       maps a section to a point on the route (and back)
  ui/
    entry.js        the Enter gate: wordmark, flicker, drifting squares
    dotGrid.js      generates the dot-grid texture used everywhere
    overlay.js      the fixed top-left chrome: logo, nav, View, Sound
    document2d.js   2D mode — the same content as a real document
  audio/
    audio.js        the sound manager, raw Web Audio API
  world/
    scene.js        builds and runs the 3D world
    camera.js       the camera rig and its tuning constants
    path.js         the single curve the whole journey follows
    scroll.js       maps page scroll to progress along that curve
    chunks.js       loads and unloads districts as you travel
    districts.js    what each section's stretch of route contains
    beam.js         the long grey beam and its section markers
    props.js        the voxel prop library — trees, houses, ships, people
    voxelBatch.js   the cube accumulator every prop is painted into
    voxelText.js    headings built from cubes
    groundText.js   flat text lying on the ground plane
    bitmapFont.js   the hand-drawn 5x7 pixel font
    pixels.js       turns text into a grid of pixels
    ground.js       the floor and its dot grid
    resources.js    shared geometry and materials
```

---

## A few decisions, and why

**The pixel font is hand-drawn rather than a font file.** System fonts differ
between machines and always smooth their edges, so a wordmark drawn with one
would look different on every computer. The glyphs in `bitmapFont.js` are
exact, identical everywhere, and add nothing to the download.

**Paragraphs on the ground are drawn as images, not real text.** The
alternative puts real HTML text in a separate layer floating above the 3D
scene, which means scenery can never pass in front of it and the two layers
drift apart when you scroll quickly. Drawing the text into the scene keeps it
properly part of the world. The cost is that you cannot select that text with
your mouse — which is what 2D mode is for.

**Clicking Enter flies the camera through the monument.** It starts close in
behind the wall of blocks that spells your name, passes between them — the
wall is deliberately one cube deep so there is a gap to pass through — comes
out the front and only then swings back to the travelling camera position. The
whole move takes `camera.INTRO_DURATION` seconds and its shape is set by
`INTRO_START_DISTANCE`, `INTRO_START_FOV` and `INTRO_EASE` in `config.js`. On
a machine set to `prefers-reduced-motion` it does not run at all.

**Scrolling maps directly to camera position.** The camera's position is
worked out purely from how far down the page you are, with nothing carried
over between frames. That is why scrolling back up retraces the route exactly
instead of slowly drifting out of alignment.

---

## Reading view (2D)

The **View** control, top left, switches between the 3D world and a plain
document of the same content — click the document icon, or tab to it and press
Enter. It is a real document: proper headings in order, text you can select,
search, copy and print, and real links. It is what a screen reader, a printer
and a machine without a working graphics card get.

Switching either way keeps your place: leave the world at section 03 and the
document opens at section 03, and vice versa.

Three kinds of visitor get the reading view first:

- **narrow screens** (under 900px wide, set by `fallback.MOBILE_BREAKPOINT_PX`
  in `config.js`),
- **anyone with `prefers-reduced-motion`** set in their operating system,
- **machines without WebGL.**

The first two still get the 3D control, so you can take the world if you want
it — the world is built and waiting behind the document, so the switch is
instant. Only the no-WebGL case has the 3D control disabled, because there
would be nothing behind it.

## Sound

The **Sound** control turns the audio on and off. Two things worth knowing:

- It changes the volume only. The background track keeps playing underneath,
  so turning sound back on drops you into the track where it had got to
  instead of restarting it — and nothing about scrolling or jumping between
  sections restarts it either.
- Nothing is loaded or played until you click **Enter**. Browsers refuse to
  start audio before a click, so that is the one place it can begin.

Your choice is remembered for the rest of the visit (in `sessionStorage`), not
for ever.

## Accessibility

- Every control in the overlay is a real `<button>`, reachable by keyboard,
  with a visible focus outline and a spoken label.
- The current section carries `aria-current`, and section changes are
  announced through a polite live region.
- 2D mode is the accessible path through the whole site: one `<h1>`, an `<h2>`
  per section in source order, and body text at 18:1 contrast.
- The headings in 2D mode are drawn with the pixel font as images, with the
  real heading text beside them in the accessibility tree, so the document
  outline is correct even though the visible heading is pixels.

