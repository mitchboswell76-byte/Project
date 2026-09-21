/**
 * verify.mjs — headless smoke test for the 3D world.
 *
 *   npm run build && npm run preview     # in one terminal
 *   node tools/verify.mjs                # in another
 *
 * Checks, in order:
 *   1. the entry gate paints and the Enter button becomes enabled
 *   2. Enter hands over to the scroll driver without errors
 *   3. scrubbing down to a progress value and back up to it produces a
 *      bit-identical camera transform (the "no jump or drift" requirement)
 *   4. chunks mount and unmount as the camera travels
 *   5. M4 the overlay: it is present, fixed, keyboard reachable, tracks the
 *      current section, and its controls carry the right ARIA state
 *   6. M5 2D mode: heading order, real selectable text, contrast, position
 *      preserved across a round trip, and the whole thing with WebGL off
 *   7. M6 audio: one looping source that survives scrolling and muting
 *   8. M7 scenery: every prop batched into InstancedMeshes, themed per
 *      district, rebuilt identically after a chunk unloads, and animating
 *   9. M8 polish: the Enter transition passes between the monument blocks,
 *      and narrow screens / reduced motion start in the reading view
 *  10. no console errors anywhere in the run
 *
 * Writes screenshots to tools/shots/. Exits non-zero on failure.
 *
 * Playwright is not a project dependency — this is a developer tool, not
 * part of the site. Point PW at a global install if you have one:
 *   PW=/usr/lib/node_modules/playwright/index.mjs node tools/verify.mjs
 *
 * If the Playwright you have does not match the Chromium you have (common on
 * a pre-baked image), point CHROME at the browser binary instead of letting
 * Playwright download one:
 *   CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node tools/verify.mjs
 */

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(HERE, 'shots');
const URL = process.env.SITE ?? 'http://localhost:4173/?debug';
const PW = process.env.PW ?? 'playwright';

const { chromium } = await import(PW).catch(() => {
  console.error(
    `Could not load Playwright from "${PW}".\n` +
      'Install it (npm i -D playwright) or set PW to an existing install.'
  );
  process.exit(2);
});

mkdirSync(SHOTS, { recursive: true });

const fail = [];
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) fail.push(label);
};

const browser = await chromium.launch({
  // SwiftShader so this runs on a machine with no GPU. Frame rates measured
  // under it are meaningless — use a real browser for performance numbers.
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });

const errors = [];
/* The audio loader deliberately probes theme.mp3 then .ogg before falling
 * back to the shipped .wav, so a 404 on those two is the designed path, not
 * a fault. Everything else counts. */
const EXPECTED_404 = /audio\/(theme|sfx-[a-z]+)\.(mp3|ogg)/;
const isExpected = (text) => EXPECTED_404.test(text) && /404|Failed to load resource/.test(text);

page.on('console', (m) => m.type() === 'error' && !isExpected(m.text()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${SHOTS}/01-entry.png` });

await page
  .waitForFunction(() => !document.getElementById('enter-button').disabled, { timeout: 30000 })
  .then(() => check(true, 'Enter button becomes enabled once the world is warm'))
  .catch(() => check(false, 'Enter button becomes enabled once the world is warm'));

await page.click('#enter-button');
/* Wait for the transition to hand over rather than for a fixed time, so
 * retuning INTRO_DURATION does not quietly break every check after this. */
await page
  .waitForFunction(() => Boolean(window.__site?.scroller), { timeout: 20000 })
  .catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/02-after-enter.png` });

const hasWorld = await page.evaluate(() => Boolean(window.__site?.world));
check(hasWorld, 'world is live after Enter');

/* Where the sections actually are, read from the running site rather than
 * copied here — re-laying out the route must not silently invalidate every
 * check below. */
const ANCHORS = await page.evaluate(() => window.__site.anchors);
const [PLAZA, HARBOUR, GARDENS, SNOWFIELD] = ANCHORS;

/**
 * Go to a normalised progress and read back the camera transform.
 *
 * Via the scroll driver, not a raw scrollTo: the page is one lap plus a
 * buffer at each end, so scroll position and progress are no longer the same
 * fraction of each other.
 */
const at = (p) =>
  page.evaluate((q) => {
    window.__site.scroller.jumpTo(q);
    return new Promise((r) =>
      setTimeout(() => {
        const c = window.__site.world.camera;
        r({
          pos: c.position.toArray().map((v) => +v.toFixed(4)),
          quat: c.quaternion.toArray().map((v) => +v.toFixed(4)),
          stats: window.__site.world.stats(),
        });
      }, 500)
    );
  }, p);

// Approach 0.50 from below, then from above, and compare.
await at(0.1);
await at(0.4);
const down = await at(0.5);
await at(0.95);
await at(0.7);
const up = await at(0.5);

check(
  JSON.stringify(down.pos) === JSON.stringify(up.pos) &&
    JSON.stringify(down.quat) === JSON.stringify(up.quat),
  'scrubbing down and back up gives an identical camera transform',
  `pos ${JSON.stringify(down.pos)}`
);

/* Districts mount as you reach them and unmount once you have left. On the
 * loop the sections are spread evenly, so this is about the set CHANGING as
 * you travel, not about there being more of them in the middle. */
const onDistrict = await at(HARBOUR);
const betweenDistricts = await at(0.9); // the monument straight, no district
check(
  onDistrict.stats.chunks > 0 && betweenDistricts.stats.chunks < onDistrict.stats.chunks,
  'chunks stream in and out as the camera travels',
  `${onDistrict.stats.chunks} at a district, ${betweenDistricts.stats.chunks} between them`
);
const mid = onDistrict;
check(
  mid.stats.calls < 150,
  'draw calls stay inside the 150 budget',
  `${mid.stats.calls} draw calls, ${mid.stats.triangles.toLocaleString()} triangles`
);

for (const p of ANCHORS) {
  await at(p);
  await page.screenshot({ path: `${SHOTS}/section-${String(p).replace('.', '_')}.png` });
}

/* ==================================================================== */
/* The loop — the route has no end                                      */
/* ==================================================================== */

/* A closed curve means progress 1 IS progress 0: same point, same tangent,
 * therefore the same camera transform to the last decimal. */
const atOne = await at(1);
const atZero = await at(0);
check(
  JSON.stringify(atOne.pos) === JSON.stringify(atZero.pos) &&
    JSON.stringify(atOne.quat) === JSON.stringify(atZero.quat),
  'progress 1 and progress 0 are the same camera transform',
  `${JSON.stringify(atZero.pos)}`
);

/* And the approach to the join is as smooth as anywhere else: step across it
 * and the camera should move by the same amount per step as it does mid-
 * route. A seam would show up here as one step far longer than its
 * neighbours — which is exactly what a wrap-around teleport looks like. */
const stepDistances = async (from, count, step) => {
  const out = [];
  let previous = null;
  for (let i = 0; i <= count; i++) {
    const sample = await at(from + i * step);
    if (previous) {
      out.push(
        Math.hypot(
          sample.pos[0] - previous[0],
          sample.pos[1] - previous[1],
          sample.pos[2] - previous[2]
        )
      );
    }
    previous = sample.pos;
  }
  return out;
};

const acrossJoin = await stepDistances(0.97, 6, 0.01); // 0.97 → 1.03
const midRoute = await stepDistances(0.4, 6, 0.01);
const worstJoin = Math.max(...acrossJoin);
const typical = midRoute.reduce((a, b) => a + b, 0) / midRoute.length;
check(
  worstJoin < typical * 1.6,
  'stepping across the join moves the camera no further than anywhere else',
  `worst step at the join ${worstJoin.toFixed(1)} units, typical ${typical.toFixed(1)}`
);

/* The page is one lap plus a buffer at each end. Scrolling off the end of the
 * lap must move the SCROLL POSITION back by exactly one lap and leave the
 * camera untouched — the scrollbar wraps, the world does not. */
const wrapTest = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const site = window.__site;
      site.scroller.jumpTo(0.5);
      setTimeout(() => {
        const before = {
          pos: site.world.camera.position.toArray().map((v) => +v.toFixed(3)),
          progress: site.scroller.progress,
          scrollY: window.scrollY,
        };
        /* Scroll off the end of the lap region into the bottom buffer. The
         * driver should pull the scroll position back by exactly one lap and
         * leave progress — and the camera — where it was. */
        const spacerPx = document.getElementById('scroll-spacer').offsetHeight;
        const bufferPx = window.innerHeight * 1.2;
        const lapPx = spacerPx - bufferPx * 2;
        window.scrollTo(0, bufferPx + lapPx + 120);
        setTimeout(() => {
          resolve({
            before,
            after: {
              pos: site.world.camera.position.toArray().map((v) => +v.toFixed(3)),
              progress: site.scroller.progress,
              scrollY: window.scrollY,
            },
            lapPx,
          });
        }, 350);
      }, 350);
    })
);
check(
  wrapTest.after.progress < 0.02,
  'scrolling off the end of the lap wraps into the start of it',
  `progress ${wrapTest.after.progress.toFixed(4)} just past the end`
);
check(
  wrapTest.after.scrollY < wrapTest.before.scrollY,
  'and the scroll position is pulled back inside the lap',
  `scroll ${Math.round(wrapTest.before.scrollY)} → ${Math.round(wrapTest.after.scrollY)}`
);

/* 0.999 and 0.001 are all but the same point on the loop, so exactly the same
 * districts must be live at both. This is the check a linear chunk distance
 * fails: it reads 0.999 as being a whole route away from a section at 0.13
 * and drops everything for one frame as the camera crosses the join. */
const justBefore = await at(0.999);
const justAfter = await at(0.001);
check(
  justBefore.stats.chunks === justAfter.stats.chunks,
  'the same districts are live either side of the join',
  `${justBefore.stats.chunks} at 0.999, ${justAfter.stats.chunks} at 0.001`
);

/* The nav has to name a section everywhere on the loop — including the long
 * monument stretch between the last anchor and the first. */
const named = await page.evaluate(async () => {
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    window.__site.scroller.jumpTo(i / 20);
    await new Promise((r) => setTimeout(r, 60));
    const b = document.querySelector('.navlink[aria-current="true"]');
    seen.add(b ? Number(b.dataset.index) : -1);
  }
  return [...seen].sort();
});
check(
  !named.includes(-1) && named.length === 4,
  'a section is current at every point on the loop',
  `saw sections ${JSON.stringify(named)}`
);

/* ==================================================================== */
/* M7 — scenery                                                         */
/* ==================================================================== */

/**
 * Read what the scene actually contains at the current progress.
 *
 * Per-instance colours come back as linear floats, so rather than matching
 * exact hex values the audit just counts how many instances are broadly
 * white, blue or green — enough to tell a snowfield from a harbour.
 */
const sceneAudit = () =>
  page.evaluate(() => {
    const scene = window.__site.world.scene;
    const out = { instanced: [], plainMeshes: [], monument: null };
    scene.traverse((o) => {
      if (o.isInstancedMesh) {
        const tally = { white: 0, blue: 0, green: 0 };
        const a = o.instanceColor?.array;
        if (a) {
          for (let i = 0; i < a.length; i += 3) {
            const [r, g, b] = [a[i], a[i + 1], a[i + 2]];
            if (r > 0.7 && g > 0.7 && b > 0.7) tally.white++;
            else if (b > 0.15 && b > r * 2 && b > g * 1.5) tally.blue++;
            else if (g > 0.1 && g > r * 1.8 && g > b * 1.8) tally.green++;
          }
        }
        out.instanced.push({ name: o.name, count: o.count, tally });
      } else if (o.isMesh) {
        out.plainMeshes.push(o.name || '(unnamed)');
      }
    });
    const mon = scene.getObjectByName('monument');
    if (mon) out.monument = { pos: mon.position.toArray(), rotY: mon.rotation.y };
    return out;
  });

/** Total instances of a broad colour across one district's batches. */
const tallyFor = (audit, district, key) =>
  audit.instanced
    .filter((m) => m.name.includes(district))
    .reduce((n, m) => n + m.tally[key], 0);

await at(PLAZA);
const plaza = await sceneAudit();
const plazaScenery = plaza.instanced.filter((m) => m.name.startsWith('scenery-'));

check(
  plazaScenery.length === 2,
  'a district batches all of its props into two InstancedMeshes',
  plazaScenery.map((m) => `${m.name}:${m.count}`).join(' ')
);
check(
  plazaScenery.reduce((n, m) => n + m.count, 0) > 400,
  'the district is actually populated',
  `${plazaScenery.reduce((n, m) => n + m.count, 0)} cubes`
);
check(
  plaza.plainMeshes.every((n) => n === 'ground' || n === 'beam' || n === '(unnamed)'),
  'no prop is an individual mesh',
  plaza.plainMeshes.join(', ')
);
/* The only unnamed plain meshes allowed are the per-section risers and the
 * flat text planes, which are one mesh each by design. */
check(
  plaza.plainMeshes.filter((n) => n === '(unnamed)').length <= 12,
  'plain meshes are limited to the beam risers and flat text planes',
  `${plaza.plainMeshes.filter((n) => n === '(unnamed)').length} of them`
);

/* Themes: the harbour has to be full of water, the snowfield full of snow. */
await at(HARBOUR);
const harbour = await sceneAudit();
await at(SNOWFIELD);
const snow = await sceneAudit();

check(
  harbour.instanced.some((m) => m.name === 'scenery-harbour-animated' && m.count > 80),
  'the harbour district is tiled with water',
  `${harbour.instanced.find((m) => m.name === 'scenery-harbour-animated')?.count ?? 0} animated instances`
);
check(
  snow.instanced.some((m) => m.name.startsWith('scenery-snowfield')),
  'the final district is the snowfield preset'
);
check(
  tallyFor(snow, 'snowfield', 'white') > 60,
  'the snowfield is snow covered',
  `${tallyFor(snow, 'snowfield', 'white')} white cubes`
);
check(
  tallyFor(harbour, 'harbour', 'blue') > 80,
  'the harbour is themed with water and containers',
  `${tallyFor(harbour, 'harbour', 'blue')} blue cubes`
);
check(
  tallyFor(plaza, 'plaza', 'green') > 20,
  'the plaza is planted',
  `${tallyFor(plaza, 'plaza', 'green')} green cubes`
);

/* A chunk that unloads and comes back must be identical, or scrubbing back
 * up the page would re-deal the scenery. */
const fingerprint = () =>
  page.evaluate(() => {
    const mesh = window.__site.world.scene.children.find(
      (o) => o.isInstancedMesh && o.name === 'scenery-gardens-static'
    );
    if (!mesh) return null;
    const a = mesh.instanceMatrix.array;
    let h = 0;
    for (let i = 0; i < a.length; i++) h = (h * 31 + Math.round(a[i] * 1000)) | 0;
    return { count: mesh.count, h };
  });

await at(GARDENS);
const gardensA = await fingerprint();
await at(GARDENS + 0.3); // far enough away that the chunk is disposed
const gone = await page.evaluate(() => window.__site.world.stats().chunks);
await at(GARDENS);
const gardensB = await fingerprint();
check(
  gardensA && gardensB && gardensA.h === gardensB.h && gardensA.count === gardensB.count,
  'a district rebuilds identically after being unloaded',
  `${gardensA?.count} cubes, hash ${gardensA?.h} → ${gardensB?.h}, ${gone} chunks while away`
);

/* Shared geometry must survive that round trip (ARCHITECTURE gotcha 1). */
const afterRoundTrip = await page.evaluate(() => window.__site.world.stats());
check(
  afterRoundTrip.geometries <= 6,
  'chunk teardown never disposes the shared geometry',
  `${afterRoundTrip.geometries} geometries live`
);

/* Props are gently animated: the animated batch must actually move. */
const moved = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const mesh = window.__site.world.scene.children.find(
        (o) => o.isInstancedMesh && o.name.endsWith('-animated')
      );
      if (!mesh) return resolve(false);
      const first = mesh.instanceMatrix.array.slice(0, 64).join(',');
      setTimeout(() => resolve(mesh.instanceMatrix.array.slice(0, 64).join(',') !== first), 600);
    })
);
check(moved, 'floating cubes and water bob rather than sitting still');

/* The whole world at once, which is the worst case for draw calls. */
const heaviest = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const w = window.__site.world;
      let peak = 0;
      let frames = 0;
      const t0 = performance.now();
      (function tick() {
        const s = w.stats();
        peak = Math.max(peak, s.calls);
        frames++;
        if (performance.now() - t0 < 2500) requestAnimationFrame(tick);
        else
          resolve({
            peak,
            fps: +((frames * 1000) / (performance.now() - t0)).toFixed(1),
            ...w.stats(),
          });
      })();
    })
);
check(
  heaviest.peak < 150,
  'draw calls stay inside the 150 budget with scenery loaded',
  `peak ${heaviest.peak}, ${heaviest.triangles.toLocaleString()} triangles`
);
console.log(
  `      note  ${heaviest.fps} fps here is SwiftShader software rasterisation, ` +
    'not a real frame rate'
);

for (const p of ANCHORS) {
  await at(p);
  await page.screenshot({ path: `${SHOTS}/07-district-${String(p).replace('.', '_')}.png` });
}

/* ==================================================================== */
/* M4 — the persistent overlay                                          */
/* ==================================================================== */

await at(PLAZA);

const overlayState = await page.evaluate(() => {
  const root = document.getElementById('overlay');
  const r = root.getBoundingClientRect();
  const nav = [...root.querySelectorAll('.navlink')];
  return {
    visible: !root.hidden && r.width > 0,
    position: getComputedStyle(root).position,
    top: Math.round(r.top),
    left: Math.round(r.left),
    logo: Boolean(root.querySelector('.overlay__logo')?.width),
    nameLines: root.querySelectorAll('.overlay__name span').length,
    navCount: nav.length,
    navLabels: nav.map((b) => b.textContent.trim()),
    buttons: root.querySelectorAll('button').length,
    labelled: [...root.querySelectorAll('button')].every((b) =>
      Boolean(b.getAttribute('aria-label')?.trim())
    ),
    viewPressed: [...root.querySelectorAll('.icon')].map((b) => b.getAttribute('aria-pressed')),
    soundPressed: [...root.querySelectorAll('.soundbtn')].map((b) =>
      b.getAttribute('aria-pressed')
    ),
  };
});

check(overlayState.visible, 'overlay is present after Enter');
check(
  overlayState.position === 'fixed' && overlayState.top === 0 && overlayState.left === 0,
  'overlay is fixed to the top-left corner',
  `${overlayState.position} at ${overlayState.left},${overlayState.top}`
);
check(overlayState.logo, 'logo mark is rendered from the bitmap font');
check(overlayState.nameLines === 3, 'site name is on three lines', `${overlayState.nameLines}`);
check(overlayState.navCount === 4, 'nav lists every section', overlayState.navLabels.join(', '));
check(overlayState.labelled, 'every overlay button has an accessible name');
check(
  overlayState.viewPressed.filter((v) => v === 'true').length === 1 &&
    overlayState.soundPressed.filter((v) => v === 'true').length === 1,
  'exactly one View and one Sound control reads as pressed'
);

/* The overlay must not drift while the page scrolls. */
const before = await page.evaluate(() =>
  document.getElementById('overlay').getBoundingClientRect().toJSON()
);
await at(0.8);
const after = await page.evaluate(() =>
  document.getElementById('overlay').getBoundingClientRect().toJSON()
);
check(
  before.top === after.top && before.left === after.left,
  'overlay does not move when the page scrolls'
);

/* aria-current follows the camera. */
const currents = [];
for (const [i, p] of ANCHORS.entries()) {
  await at(p);
  currents.push(
    await page.evaluate(() => {
      const b = document.querySelector('.navlink[aria-current="true"]');
      return b ? Number(b.dataset.index) : -1;
    })
  );
}
check(
  JSON.stringify(currents) === JSON.stringify([0, 1, 2, 3]),
  'aria-current tracks the section the camera is at',
  `saw ${JSON.stringify(currents)}`
);

/* Keyboard reachability: tab from the document start and count what the
 * focus ring lands on inside the overlay. */
const reachable = await page.evaluate(() => {
  const root = document.getElementById('overlay');
  const focusables = [...root.querySelectorAll('button')].filter((b) => !b.disabled);
  return focusables.every((b) => b.tabIndex >= 0);
});
check(reachable, 'overlay controls are in the tab order');

await page.keyboard.press('Tab');
const focusRing = await page.evaluate(() => {
  const el = document.activeElement;
  return el ? getComputedStyle(el, ':focus-visible').outlineStyle !== 'none' : false;
});
check(focusRing, 'focused controls get a visible outline');

/* Clicking a nav label moves the camera to that section. On a loop it may
 * travel either way round to get there — whichever is shorter — so what
 * matters is where it arrives, not which direction the page scrolled. */
await at(PLAZA);
const navBefore = await page.evaluate(() => window.__site.scroller.progress);
await page.click('.navlink[data-index="3"]');
await page.waitForTimeout(2200);
const navAfter = await page.evaluate(() => ({
  progress: window.__site.scroller.progress,
  current: Number(document.querySelector('.navlink[aria-current="true"]')?.dataset.index ?? -1),
}));
check(
  Math.abs(navAfter.progress - SNOWFIELD) < 0.02 && navAfter.current === 3,
  'clicking a nav label animates the camera to that section',
  `${navBefore.toFixed(2)} → ${navAfter.progress.toFixed(2)}`
);

await page.screenshot({ path: `${SHOTS}/03-overlay.png` });

/* Legibility over bright scenery. There is no bright scenery until M7, so
 * stand a bright sheet between the world and the overlay and check that the
 * scrim covers the whole control column and still darkens what is behind
 * it. The screenshot is the real evidence — look at 03b. */
const scrim = await page.evaluate(() => {
  const sheet = document.createElement('div');
  sheet.id = 'verify-bright-sheet';
  sheet.style.cssText =
    'position:fixed;inset:0;z-index:50;background:' +
    'repeating-linear-gradient(45deg,#f2c53d 0 40px,#eef2f7 40px 80px)';
  document.body.appendChild(sheet);

  const el = document.querySelector('.overlay__scrim');
  const s = el.getBoundingClientRect();
  const inner = document.querySelector('.overlay__inner').getBoundingClientRect();
  const bg = getComputedStyle(el).backgroundImage;
  return {
    fixed: getComputedStyle(el).position === 'fixed',
    coversControls: s.right >= inner.right && s.bottom >= inner.bottom,
    // Big enough to carry the controls, but not so big it is hiding scene
    // for no reason: a wide margin past the column is wasted coverage.
    notOversized: s.width <= inner.right + 140 && s.height <= inner.bottom + 140,
    opaque: /rgba?\(/.test(bg) && bg.includes('gradient'),
    zBelowControls:
      Number(getComputedStyle(document.getElementById('overlay')).zIndex) > 50,
  };
});

check(
  scrim.fixed && scrim.coversControls && scrim.opaque && scrim.zBelowControls,
  'a scrim keeps the overlay legible over bright scenery',
  JSON.stringify(scrim)
);
check(
  scrim.notOversized,
  'and is sized to the control column rather than a quarter of the screen'
);

await page.screenshot({ path: `${SHOTS}/03b-overlay-on-bright.png`, clip: { x: 0, y: 0, width: 420, height: 560 } });
await page.evaluate(() => document.getElementById('verify-bright-sheet')?.remove());

/* ==================================================================== */
/* M6 — audio                                                           */
/* ==================================================================== */

const a0 = await page.evaluate(() => window.__site.audio.stats());
check(a0.playing, 'the theme loop is running after Enter', `context ${a0.state}`);

await at(0.2);
await at(0.75);
const a1 = await page.evaluate(() => window.__site.audio.stats());
check(
  a1.playing && a1.currentTime > a0.currentTime,
  'the loop keeps playing across scrolling and section changes'
);

await page.click('.soundbtn[data-on="false"]');
await page.waitForTimeout(500);
const muted = await page.evaluate(() => window.__site.audio.stats());
check(
  muted.muted && muted.masterGain < 0.05 && muted.playing,
  'mute drops the gain without stopping playback',
  `gain ${muted.masterGain}`
);
check(
  await page.evaluate(() => sessionStorage.getItem('mb.sound')) === 'off',
  'the sound choice is written to sessionStorage'
);

await page.click('.soundbtn[data-on="true"]');
await page.waitForTimeout(500);
const unmuted = await page.evaluate(() => window.__site.audio.stats());
check(
  !unmuted.muted && unmuted.masterGain > 0.5 && unmuted.currentTime > muted.currentTime,
  'unmute restores gain and the track never restarted',
  `gain ${unmuted.masterGain}`
);

/* ==================================================================== */
/* M5 — 2D mode                                                         */
/* ==================================================================== */

await at(GARDENS); // section 03
const progressBefore = await page.evaluate(() => window.__site.scroller.progress);

await page.click('.icon--doc');
await page.waitForTimeout(700);
await page.screenshot({ path: `${SHOTS}/04-doc.png`, fullPage: false });

const docState = await page.evaluate(() => {
  const doc = document.getElementById('doc');
  const headings = [...doc.querySelectorAll('h1, h2, h3')].map((h) => ({
    level: Number(h.tagName[1]),
    text: h.textContent.trim(),
  }));
  const body = doc.querySelector('.doc__body');
  const cs = getComputedStyle(body);
  const overlayRect = document.getElementById('overlay').getBoundingClientRect();
  return {
    mode: window.__site.mode,
    visible: !doc.hidden && doc.getBoundingClientRect().height > 0,
    webglHidden: getComputedStyle(document.getElementById('webgl')).display === 'none',
    headings,
    sections: doc.querySelectorAll('section').length,
    bodyText: body?.textContent.trim().length ?? 0,
    userSelect: cs.userSelect,
    colour: cs.color,
    background: getComputedStyle(document.body).backgroundColor,
    links: doc.querySelectorAll('a[href]').length,
    overlayTop: Math.round(overlayRect.top),
    overlayLeft: Math.round(overlayRect.left),
    imgAltEmpty: [...doc.querySelectorAll('img')].every((i) => i.getAttribute('alt') === ''),
  };
});

check(docState.mode === '2d' && docState.visible, 'the document icon switches to 2D mode');
check(docState.webglHidden, 'the WebGL canvas is out of the way in 2D mode');

const levels = docState.headings.map((h) => h.level);
check(
  levels[0] === 1 && levels.slice(1).every((l) => l === 2),
  'headings are semantic and in order',
  `h-levels ${levels.join(',')}`
);
check(docState.sections >= 4, 'every section is in the document', `${docState.sections} sections`);
check(docState.bodyText > 120, 'body copy is real text', `${docState.bodyText} chars`);
check(docState.userSelect !== 'none', 'document text is selectable');
check(docState.links >= 3, 'contact links are real links', `${docState.links} links`);
check(docState.imgAltEmpty, 'pixel headings are decorative images beside real heading text');
check(
  docState.overlayTop === 0 && docState.overlayLeft === 0,
  'the overlay stays put in 2D mode'
);

/* The scrim exists to carry the overlay over bright 3D scenery. In 2D it has
 * nothing to do but darken the left edge of the body copy, which is exactly
 * what it was doing: 320px wide against a text column starting at 238px. */
const scrimIn2d = await page.evaluate(() => {
  const el = document.querySelector('.overlay__scrim');
  const text = document.querySelector('.doc__article').getBoundingClientRect();
  const hidden = !el || getComputedStyle(el).display === 'none';
  const r = el?.getBoundingClientRect();
  return {
    hidden,
    overlapsText: hidden ? false : r.right > text.left && r.bottom > text.top,
    textLeft: Math.round(text.left),
    scrimRight: hidden ? 0 : Math.round(r.right),
  };
});
check(
  !scrimIn2d.overlapsText,
  'the scrim never covers the reading view text',
  scrimIn2d.hidden
    ? 'not drawn in 2D at all'
    : `scrim ends at ${scrimIn2d.scrimRight}, text starts at ${scrimIn2d.textLeft}`
);

/* Contrast of body text against the page background. */
const contrast = await page.evaluate(() => {
  const toRgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const body = document.querySelector('.doc__body');
  const fg = lum(toRgb(getComputedStyle(body).color));
  const bg = lum(toRgb(getComputedStyle(document.body).backgroundColor));
  return +(((Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)).toFixed(2));
});
check(contrast >= 4.5, 'body text meets WCAG AA contrast', `${contrast}:1`);

const dotGrid = await page.evaluate(() =>
  getComputedStyle(document.getElementById('doc')).backgroundImage.startsWith('url(')
);
check(dotGrid, 'the same dot grid is behind 2D mode');

/* Back to 3D, and back to where we were. */
await page.click('.icon--3d');
await page.waitForTimeout(900);
const roundTrip = await page.evaluate(() => ({
  mode: window.__site.mode,
  progress: window.__site.scroller.progress,
}));
check(roundTrip.mode === '3d', 'the 3D icon switches back');
check(
  Math.abs(roundTrip.progress - progressBefore) < 0.02,
  'the toggle preserves position across a round trip',
  `${progressBefore.toFixed(3)} → ${roundTrip.progress.toFixed(3)}`
);
await page.screenshot({ path: `${SHOTS}/05-back-to-3d.png` });

check(errors.length === 0, 'no console errors', errors.join(' | '));

/* ==================================================================== */
/* M5 — the same document with WebGL switched off entirely              */
/* ==================================================================== */

const noGlErrors = [];
const noGl = await browser.newPage({ viewport: { width: 1440, height: 900 } });
noGl.on('console', (m) => m.type() === 'error' && !isExpected(m.text()) && noGlErrors.push(m.text()));
noGl.on('pageerror', (e) => noGlErrors.push(`PAGEERROR: ${e.message}`));

// Break WebGL before any site code runs.
await noGl.addInitScript(() => {
  const nope = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (String(type).startsWith('webgl')) return null;
    return nope.call(this, type, ...rest);
  };
});

await noGl.goto(URL, { waitUntil: 'networkidle' });
await noGl.waitForFunction(() => !document.getElementById('enter-button').disabled, {
  timeout: 20000,
});
await noGl.click('#enter-button');
await noGl.waitForTimeout(1200);
await noGl.screenshot({ path: `${SHOTS}/06-no-webgl.png` });

const noGlState = await noGl.evaluate(() => {
  const doc = document.getElementById('doc');
  return {
    mode: window.__site.mode,
    readable: doc && !doc.hidden && doc.textContent.trim().length > 400,
    headings: doc.querySelectorAll('h2').length,
    overlay: !document.getElementById('overlay').hidden,
    threeDisabled: document.querySelector('.icon--3d').disabled,
  };
});

check(noGlState.mode === '2d', 'with WebGL disabled the site lands in 2D mode');
check(noGlState.readable && noGlState.headings >= 4, 'the document is fully readable there');
check(noGlState.overlay, 'the overlay is present with WebGL disabled');
check(noGlState.threeDisabled, 'the 3D control is disabled rather than dead');
check(noGlErrors.length === 0, 'no console errors with WebGL disabled', noGlErrors.join(' | '));

/* ==================================================================== */
/* M8 — the Enter transition flies between the monument blocks           */
/* ==================================================================== */

const introErrors = [];
const intro = await browser.newPage({ viewport: { width: 1440, height: 810 } });
intro.on('console', (m) => m.type() === 'error' && !isExpected(m.text()) && introErrors.push(m.text()));
intro.on('pageerror', (e) => introErrors.push(`PAGEERROR: ${e.message}`));

await intro.goto(URL, { waitUntil: 'networkidle' });
await intro.waitForFunction(() => !document.getElementById('enter-button').disabled, {
  timeout: 30000,
});
await intro.click('#enter-button');

/* Sample the camera against the monument's own frame for the length of the
 * transition: `n` is distance in front of (+) or behind (-) the wall, `lat`
 * is sideways along the lettering. */
const flight = await intro.evaluate(
  () =>
    new Promise((resolve) => {
      const w = window.__site.world;
      const mon = w.scene.getObjectByName('monument');
      if (!mon) return resolve(null);
      const sc = mon.scale.x;
      const width = mon.userData.size.width * sc;
      const height = mon.userData.size.height * sc;
      const r = mon.rotation.y;
      const n = { x: Math.sin(r), z: Math.cos(r) };
      const ax = { x: Math.cos(r), z: -Math.sin(r) };
      const c = { x: mon.position.x, y: height / 2, z: mon.position.z };

      const samples = [];
      /* The opening shot: is the wall square on, in front of us, and wholly
       * inside the frame? Corners are projected through the live camera, so
       * this is what the visitor actually sees, not a proxy for it. */
      const corner = (alongX, y) => {
        const v = w.camera.position.clone();
        v.set(
          c.x + n.x * 0 + ax.x * alongX,
          y,
          c.z + n.z * 0 + ax.z * alongX
        );
        return v.project(w.camera);
      };
      let opening = null;

      const t0 = performance.now();
      (function tick() {
        const p = w.camera.position;
        const d = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
        samples.push({
          n: d.x * n.x + d.z * n.z,
          lat: d.x * ax.x + d.z * ax.z,
          y: p.y,
          dist: Math.hypot(d.x, d.y, d.z),
        });

        if (!opening) {
          const pts = [
            corner(-width / 2, 0),
            corner(width / 2, 0),
            corner(-width / 2, height),
            corner(width / 2, height),
          ];
          opening = {
            n: samples[0].n,
            lat: samples[0].lat,
            maxAbsX: Math.max(...pts.map((v) => Math.abs(v.x))),
            maxAbsY: Math.max(...pts.map((v) => Math.abs(v.y))),
            fov: w.camera.fov,
          };
        }
        if (performance.now() - t0 < 5000) requestAnimationFrame(tick);
        else resolve({ samples, width, height, opening });
      })();
    })
);

check(Boolean(flight), 'the monument is there to fly through');

if (flight) {
  const { samples, width, height, opening } = flight;

  /* The opening shot — the first thing anyone sees of the 3D world. */
  check(
    opening.n > 0,
    'the transition opens in FRONT of the name, not behind it',
    `${opening.n.toFixed(1)} units along the face normal`
  );
  check(
    Math.abs(opening.lat) < width * 0.1,
    'square on to the name rather than off to one side',
    `${opening.lat.toFixed(1)} units off centre, wall is ${width.toFixed(0)} wide`
  );
  check(
    opening.maxAbsX <= 1 && opening.maxAbsY <= 1,
    'and the whole wordmark is inside the frame',
    `corners reach ${opening.maxAbsX.toFixed(2)}, ${opening.maxAbsY.toFixed(2)} of the viewport`
  );
  check(
    Math.abs(opening.fov - 30) < 6,
    'the opening shot is at the resting field of view, so the name reads flat',
    `fov ${opening.fov.toFixed(1)}`
  );

  const closest = Math.min(...samples.map((s) => s.dist));
  const behind = samples.some((s) => s.n < -2);
  const inFront = samples.some((s) => s.n > 2);
  // "Between the blocks" means inside the slab's own footprint, not merely
  // near it: within the lettering sideways and below the top of the wall.
  const between = samples.some(
    (s) => Math.abs(s.n) < 4 && Math.abs(s.lat) < width / 2 && s.y > 0 && s.y < height
  );
  const settled = samples[samples.length - 1].dist;

  check(
    closest < 12,
    'the Enter transition passes the monument at close range',
    `closest approach ${closest.toFixed(1)} units`
  );
  check(behind && inFront, 'it passes right through the wall of blocks');
  check(between, 'and does so between the blocks, inside the lettering');
  check(
    settled > closest * 3,
    'it then pulls back to the resting camera',
    `${closest.toFixed(1)} → ${settled.toFixed(1)} units`
  );
}

await intro.screenshot({ path: `${SHOTS}/08-after-intro.png` });

/* The hand-over to the scroll driver must not jump. */
const handover = await intro.evaluate(() => ({
  progress: window.__site.scroller?.progress ?? null,
  fov: window.__site.world.camera.fov,
}));
check(
  handover.progress === 0 && handover.fov === 30,
  'the transition hands over to the scroll driver cleanly',
  `progress ${handover.progress}, fov ${handover.fov}`
);
check(introErrors.length === 0, 'no console errors during the transition', introErrors.join(' | '));
await intro.close();

/* ==================================================================== */
/* M8 — narrow screens and reduced motion start in the reading view      */
/* ==================================================================== */

/** Enter the site under some capability condition and report where it lands. */
async function landsIn2d(label, pageOptions) {
  const errs = [];
  const p = await browser.newPage(pageOptions);
  p.on('console', (m) => m.type() === 'error' && !isExpected(m.text()) && errs.push(m.text()));
  p.on('pageerror', (e) => errs.push(`PAGEERROR: ${e.message}`));

  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => !document.getElementById('enter-button').disabled, {
    timeout: 30000,
  });
  await p.click('#enter-button');
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SHOTS}/09-${label}.png` });

  const state = await p.evaluate(() => ({
    mode: window.__site.mode,
    prefer2d: window.__site.capability.prefer2d,
    narrow: window.__site.capability.narrow,
    reduced: window.__site.capability.reducedMotion,
    toggleOffered: !document.querySelector('.icon--3d').disabled,
    readable: document.getElementById('doc').textContent.trim().length > 400,
    // The fixed overlay must not sit on top of the document's masthead.
    clearsOverlay:
      document.querySelector('.doc__header').getBoundingClientRect().top >=
      document.querySelector('.overlay__inner').getBoundingClientRect().bottom,
  }));

  // The toggle is still offered, so take it and check the world really runs.
  await p.click('.icon--3d');
  await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({
    mode: window.__site.mode,
    scroller: Boolean(window.__site.scroller),
    calls: window.__site.world?.stats().calls ?? 0,
  }));
  await p.close();
  return { state, after, errs };
}

const narrow = await landsIn2d('narrow', { viewport: { width: 720, height: 900 } });
check(
  narrow.state.narrow && narrow.state.prefer2d && narrow.state.mode === '2d',
  'a narrow screen starts in the reading view',
  `mode ${narrow.state.mode}`
);
check(narrow.state.readable, 'and the document is fully readable there');
check(
  narrow.state.clearsOverlay,
  'the reading view clears the overlay instead of running under it'
);
check(narrow.state.toggleOffered, 'the 3D toggle is still offered on a narrow screen');
check(
  narrow.after.mode === '3d' && narrow.after.scroller && narrow.after.calls > 0,
  'taking that toggle starts the world and the scroll driver',
  `${narrow.after.calls} draw calls`
);
check(narrow.errs.length === 0, 'no console errors on a narrow screen', narrow.errs.join(' | '));

const reduced = await landsIn2d('reduced-motion', {
  viewport: { width: 1440, height: 810 },
  reducedMotion: 'reduce',
});
check(
  reduced.state.reduced && reduced.state.prefer2d && reduced.state.mode === '2d',
  'prefers-reduced-motion starts in the reading view',
  `mode ${reduced.state.mode}`
);
check(
  reduced.state.toggleOffered && reduced.after.mode === '3d',
  'and can still opt into the world'
);
check(
  reduced.errs.length === 0,
  'no console errors with reduced motion',
  reduced.errs.join(' | ')
);

/* ==================================================================== */
/* M8 — performance readout                                              */
/* ==================================================================== */
/* Draw calls and triangles are hardware-independent and are the real
 * numbers. The frame rate here is NOT: this runs under SwiftShader, a
 * software rasteriser, so it is fill-rate bound at a few frames a second
 * whatever the scene costs. Measure fps in a real browser. */

/* Sweep the whole route rather than trusting the anchors: the peak is
 * usually between two districts, where both are still mounted. */
let peakCalls = { calls: 0 };
let peakTris = { triangles: 0 };
for (let q = 0; q <= 1.0001; q += 0.05) {
  const s = await page.evaluate((v) => {
    window.__site.scroller.jumpTo(v);
    return new Promise((r) => setTimeout(() => r(window.__site.world.stats()), 280));
  }, q);
  if (s.calls > peakCalls.calls) peakCalls = { ...s, q: +q.toFixed(2) };
  if (s.triangles > peakTris.triangles) peakTris = { ...s, q: +q.toFixed(2) };
}
check(
  peakCalls.calls < 150,
  'the worst point on the whole route is still inside the budget',
  `${peakCalls.calls} calls at progress ${peakCalls.q}, ` +
    `peak ${peakTris.triangles.toLocaleString()} triangles at ${peakTris.q}`
);

console.log('\n  progress   calls  triangles   (SwiftShader fps — not a real frame rate)');
for (const q of [0, ...ANCHORS, 0.9]) {
  await at(q);
  const s = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let f = 0;
        const t0 = performance.now();
        (function tick() {
          f++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
          else
            resolve({
              fps: +((f * 1000) / (performance.now() - t0)).toFixed(1),
              ...window.__site.world.stats(),
            });
        })();
      })
  );
  console.log(
    `  ${q.toFixed(2)}       ${String(s.calls).padStart(4)}   ${String(
      s.triangles.toLocaleString()
    ).padStart(8)}   ${s.fps}`
  );
}

await browser.close();

console.log(`\nScreenshots written to ${SHOTS}`);
if (fail.length) {
  console.error(`\n${fail.length} check(s) failed:\n  ${fail.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
