# Mitch Boswell — portfolio

A personal portfolio with two ways to explore: a scrolling voxel scene and a
responsive reading view. Built with Three.js, GSAP, vanilla JavaScript and Vite.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

For a production build:

```sh
npm run build
npm run preview
```

Vite normally serves development on port 5173 and the production preview on
4173. Add `-- --host 127.0.0.1` to either command if your environment restricts
network-interface inspection.

## What is included

- Four connected districts: Profile, Research, Experience and Next.
- A looped scroll route, optional introduction flight, section navigation and zoom.
- A section guide with a readable summary, reading link and next-section button.
- An editorial reading view with research questions, experience cards and links.
- Mobile and reduced-motion visitors start in the reading view, with 3D available
  as an explicit choice. The reading path does not download or construct the scene.
- Sound starts **off**. Enabling it starts a quiet generated soundtrack; mute
  controls its gain without restarting the track. The choice lasts for the session.
- Keyboard controls, visible focus, a skip-to-content button, print styling and a
  readable fallback when WebGL is unavailable.
- No external fonts, analytics, trackers or API keys. Scripts and optional audio
  load from the site's own origin.

## Edit your portfolio

All personal copy lives in **`src/content.js`**:

| Field | Purpose |
| --- | --- |
| `meta` | Name, tagline, entry labels and introductory description |
| `sections` | Shared section headings, paragraphs, summaries and navigation |
| `sections[].cards` | Research and experience details in the reading view |
| `sections[].tags` | Short skill labels |
| `philosophyItems` | Working principles |
| `contact` | Public links, optional email and optional CV |

The published copy distinguishes research interests from completed work. The
current dissertation topic is described as a direction in development. Do not add
qualifications, publications, job outcomes or numerical achievements without
checking them.

Email and CV are deliberately `null` because no verified public email or CV file
is included. Add an email to show a working mail link. Put a real CV in
`public/cv.pdf` and set `cvUrl: './cv.pdf'` to show its download link. These optional
fields do not produce empty buttons or dummy destinations.

**`src/config.js`** holds the palette, camera, scene layout, motion and audio settings.

The four section entries correspond to `world.SECTION_ANCHORS`. If you add a
section, also give it an anchor and a district. The scene guide uses the section's
`summary`; the reading view includes its additional cards.

## Direct links

- `?view=2d` opens the reading view directly.
- `#profile`, `#research`, `#experience` and `#connect` open the corresponding
  reading section directly.
- Section navigation updates the URL, so its destination can be copied and shared.
- `?debug` adds scene diagnostics: draw calls, triangles, loaded chunks and progress.

## Browser checks

```sh
npx playwright install chromium
npm test
```

`npm test` builds the production site, starts a local static server and checks:

- Desktop 3D rendering and all section destinations.
- Rapid navigation and switching views during a navigation animation.
- Silent startup, audio loading and mute.
- 320, 390 and 768 px reading layouts, including heading clearance below the header.
- Opting into 3D on mobile.
- Deep links, reduced motion, WebGL fallback, keyboard access and print colours.
- Missing production assets, including when hosted under `/Project/`.

Screenshots are saved to `tools/shots/` (ignored by Git).
If you already have Chromium, set `CHROME=/path/to/chromium`.

The detailed scene regression checks are also available:

```sh
npm run build
node tools/verify.mjs
```

They cover route continuity, reproducible camera positions, chunk lifetimes,
geometry, the introduction flight and rendering budgets. Software-rendered frame
rates do not represent performance on a normal GPU.

## GitHub Pages

The existing `.github/workflows/pages.yml` workflow builds and deploys pushes to
`claude/youthful-babbage-98fcpv` or `main`. Feature branches do not publish the site.
The `Portfolio checks` workflow runs on pull requests and on the finishing branch.

The relative Vite base and relative audio URLs support GitHub Pages project
subdirectories. No server-side service or secret is required.
