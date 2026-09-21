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
it expensive.

---

## Where to change things

There are exactly two files you need. **You never have to touch anything in
`src/ui/`, `src/world/` or `src/audio/` to change your content or your
colours.**

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
  ui/
    entry.js        the Enter gate: wordmark, flicker, drifting squares
    dotGrid.js      generates the dot-grid texture used everywhere
  world/
    scene.js        builds and runs the 3D world
    camera.js       the camera rig and its tuning constants
    path.js         the single curve the whole journey follows
    scroll.js       maps page scroll to progress along that curve
    chunks.js       loads and unloads districts as you travel
    districts.js    what each section's stretch of route contains
    beam.js         the long grey beam and its section markers
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

**Scrolling maps directly to camera position.** The camera's position is
worked out purely from how far down the page you are, with nothing carried
over between frames. That is why scrolling back up retraces the route exactly
instead of slowly drifting out of alignment.
