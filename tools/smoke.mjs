import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { startPreview } from './preview-server.mjs';
const server = await startPreview();
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
await mkdir('tools/shots', { recursive: true });
const errors = [];
const failedResponses = [];
function monitor(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
}
const check = (label, assertion) => { assert.ok(assertion, label); console.log(`PASS ${label}`); };
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  monitor(desktop);
  await desktop.goto(server.url);
  await desktop.waitForFunction(() => window.__site);
  await desktop.waitForTimeout(1000);
  await desktop.screenshot({ path: 'tools/shots/finished-entry.png' });
  await desktop.click('#enter-button');
  await desktop.waitForFunction(() => window.__site.mode === '3d' && window.__site.scroller);
  await desktop.waitForTimeout(4200);
  check('3D scene renders', await desktop.evaluate(() => window.__site.world.stats().calls > 0));
  check('sound starts off without downloading audio', await desktop.evaluate(() => window.__site.audio.muted && !window.__site.audio.playing && performance.getEntriesByType('resource').every(r => !r.name.endsWith('.wav'))));
  for (let i = 0; i < 4; i++) {
    await desktop.locator(`.navlink[data-index="${i}"]`).click();
    await desktop.waitForFunction(i => Math.abs(window.__site.scroller.progress - window.__site.anchors[i]) < .002, i, { timeout: 15000 });
    await desktop.waitForTimeout(300);
    check(`section ${i + 1} navigation reaches its anchor`, await desktop.evaluate(i => Math.abs(window.__site.scroller.progress - window.__site.anchors[i]) < .002, i));
    await desktop.screenshot({ path: `tools/shots/finished-scene-${i + 1}.png` });
  }
  await desktop.locator('.navlink[data-index="0"]').click();
  await desktop.locator('.navlink[data-index="1"]').click();
  await desktop.locator('.navlink[data-index="2"]').click();
  await desktop.waitForFunction(() => Math.abs(window.__site.scroller.progress - window.__site.anchors[2]) < .002, null, { timeout: 15000 });
  check('rapid navigation settles on the last requested section', await desktop.evaluate(() => Math.abs(window.__site.scroller.progress - window.__site.anchors[2]) < .002));
  await desktop.locator('.navlink[data-index="0"]').click();
  await desktop.waitForTimeout(100);
  await desktop.locator('.icon--doc').click();
  await desktop.waitForTimeout(250);
  const readingPosition = await desktop.evaluate(() => scrollY);
  await desktop.waitForTimeout(1800);
  check('switching views cancels in-flight navigation', Math.abs(await desktop.evaluate(() => scrollY) - readingPosition) < 2);
  await desktop.evaluate(() => scrollTo(0, 0));
  await desktop.screenshot({ path: 'tools/shots/finished-reading-desktop.png' });
  check('all portfolio sections and six supporting cards render', await desktop.locator('.doc__card').count() === 6 && await desktop.locator('.doc__section[id]').count() === 4);
  check('no placeholder text or dummy destinations', await desktop.evaluate(() => !/\[HEADING|\[PARAGRAPH|EXAMPLE.COM|your-handle|\[PRINCIPLE/.test(document.getElementById('doc').textContent) && [...document.querySelectorAll('#doc a')].every(a => !/[\[\]]/.test(a.href))));
  await desktop.locator('.soundbtn[data-on="true"]').click();
  await desktop.waitForFunction(() => window.__site.audio.playing);
  await desktop.locator('.soundbtn[data-on="false"]').click();
  await desktop.waitForTimeout(500);
  check('sound can be enabled and muted', await desktop.evaluate(() => window.__site.audio.playing && window.__site.audio.muted && window.__site.audio.stats().masterGain < .01));
  await desktop.emulateMedia({ media: 'print' });
  check('print keeps readable text with a white background', await desktop.evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)' && getComputedStyle(document.querySelector('.doc__body')).color === 'rgb(0, 0, 0)'));
  await desktop.emulateMedia({ media: 'screen' });
  await desktop.close();

  for (const width of [320, 390, 768]) {
    const mobile = await browser.newPage({ viewport: { width, height: 844 } });
    monitor(mobile);
    await mobile.goto(server.url);
    await mobile.waitForFunction(() => window.__site);
    if (width === 390) { await mobile.waitForTimeout(1000); await mobile.screenshot({ path: 'tools/shots/finished-entry-mobile.png' }); }
    await mobile.click('#enter-button');
    await mobile.waitForFunction(() => window.__site.mode === '2d' && document.getElementById('entry').hidden);
    check(`${width}px reading view opens without constructing 3D`, await mobile.evaluate(() => !window.__site.world && performance.getEntriesByType('resource').every(r => !/\/(three|scene)-/.test(r.name))));
    check(`${width}px layout fits the viewport`, await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`${width}px header clears the reading content`, await mobile.evaluate(() => document.querySelector('.doc__header').getBoundingClientRect().top > document.getElementById('overlay').getBoundingClientRect().bottom));
    if (width === 390) await mobile.screenshot({ path: 'tools/shots/finished-reading-mobile.png', fullPage: true });
    await mobile.locator('.navlink[data-index="2"]').click();
    await mobile.waitForTimeout(800);
    check(`${width}px navigation leaves the section heading visible`, await mobile.evaluate(() => {
      const section = document.getElementById('doc-experience').getBoundingClientRect();
      return section.top >= document.getElementById('overlay').getBoundingClientRect().bottom && section.top < innerHeight / 2;
    }));
    if (width === 390) {
      await mobile.locator('.icon--3d').click();
      await mobile.waitForFunction(() => window.__site.mode === '3d' && window.__site.world);
      await mobile.screenshot({ path: 'tools/shots/finished-scene-mobile.png' });
      check('mobile visitors can opt into 3D', await mobile.evaluate(() => window.__site.world.stats().calls > 0));
    }
    await mobile.close();
  }

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  monitor(reduced);
  await reduced.goto(server.url + '?view=2d#research');
  await reduced.waitForFunction(() => window.__site?.mode === '2d');
  check('direct links open the requested reading section without 3D', await reduced.evaluate(() => !window.__site.world && document.getElementById('doc-research').getBoundingClientRect().top < 80));
  await reduced.locator('.navlink[data-index="3"]').click();
  check('reduced-motion section changes happen without smooth scrolling', await reduced.evaluate(() => document.getElementById('doc-connect').getBoundingClientRect().top < 80));
  await reduced.close();

  const fallback = await browser.newPage();
  monitor(fallback);
  await fallback.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return String(type).startsWith('webgl') ? null : get.call(this, type, ...args); };
  });
  await fallback.goto(server.url);
  await fallback.click('#enter-button');
  await fallback.waitForFunction(() => window.__site?.mode === '2d');
  check('WebGL failure leaves the portfolio readable', await fallback.locator('.doc__body').first().isVisible() && await fallback.locator('.icon--3d').isDisabled());
  await fallback.close();

  const keyboard = await browser.newPage();
  monitor(keyboard);
  await keyboard.goto(server.url);
  await keyboard.keyboard.press('Tab');
  check('keyboard users reach a working skip control first', await keyboard.evaluate(() => document.activeElement.id === 'skip-content'));
  await keyboard.keyboard.press('Enter');
  await keyboard.waitForFunction(() => window.__site?.mode === '2d');
  check('skip control moves focus to the main content', await keyboard.evaluate(() => document.activeElement.id === 'doc'));
  await keyboard.close();
  check('no browser runtime errors', errors.length === 0);
  check('no missing production assets, including under /Project/', failedResponses.length === 0);
  console.log('All portfolio checks passed.');
} finally {
  if (errors.length || failedResponses.length) console.error({ errors, failedResponses });
  await browser.close();
  await server.close();
}
