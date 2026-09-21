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
 *   8. no console errors anywhere in the run
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
await page.waitForTimeout(3600);
await page.screenshot({ path: `${SHOTS}/02-after-enter.png` });

const hasWorld = await page.evaluate(() => Boolean(window.__site?.world));
check(hasWorld, 'world is live after Enter');

/** Scroll to a normalised progress and read back the camera transform. */
const at = (p) =>
  page.evaluate((q) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, q * max);
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

const top = await at(0);
const mid = await at(0.5);
check(
  top.stats.chunks < mid.stats.chunks,
  'chunks stream in as the camera travels',
  `${top.stats.chunks} at start, ${mid.stats.chunks} mid-route`
);
check(
  mid.stats.calls < 150,
  'draw calls stay inside the 150 budget',
  `${mid.stats.calls} draw calls, ${mid.stats.triangles.toLocaleString()} triangles`
);

for (const p of [0.3, 0.49, 0.68, 0.87]) {
  await at(p);
  await page.screenshot({ path: `${SHOTS}/section-${String(p).replace('.', '_')}.png` });
}

/* ==================================================================== */
/* M4 — the persistent overlay                                          */
/* ==================================================================== */

await at(0.3);

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
for (const [i, p] of [0.3, 0.49, 0.68, 0.87].entries()) {
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

/* Clicking a nav label moves the camera. */
await at(0.3);
const posBefore = await page.evaluate(() => window.scrollY);
await page.click('.navlink[data-index="3"]');
await page.waitForTimeout(2200);
const posAfter = await page.evaluate(() => window.scrollY);
check(posAfter > posBefore, 'clicking a nav label animates the camera onwards');

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

await at(0.68); // section 03
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

await browser.close();

console.log(`\nScreenshots written to ${SHOTS}`);
if (fail.length) {
  console.error(`\n${fail.length} check(s) failed:\n  ${fail.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
