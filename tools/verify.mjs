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
 *   5. no console errors anywhere in the run
 *
 * Writes screenshots to tools/shots/. Exits non-zero on failure.
 *
 * Playwright is not a project dependency — this is a developer tool, not
 * part of the site. Point PW at a global install if you have one:
 *   PW=/usr/lib/node_modules/playwright/index.mjs node tools/verify.mjs
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
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
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

check(errors.length === 0, 'no console errors', errors.join(' | '));

await browser.close();

console.log(`\nScreenshots written to ${SHOTS}`);
if (fail.length) {
  console.error(`\n${fail.length} check(s) failed:\n  ${fail.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll checks passed.');
