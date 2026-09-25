import { chromium } from 'playwright';
const OUT = process.argv[2] ?? '/tmp/claude-0/-home-user-Project/08a3413d-e2c6-41a6-8c37-61fecea4baa7/scratchpad/look';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:4173/?debug', { waitUntil: 'load' });
await p.waitForFunction(() => !document.getElementById('enter-button').disabled, { timeout: 60000 });
await p.screenshot({ path: `${OUT}-entry.png` });
await p.click('#enter-button');
await p.waitForTimeout(5000);
for (const v of [0.21, 0.30, 0.406, 0.50]) {
  await p.evaluate((x) => window.__site.scroller.jumpTo(x), v);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${OUT}-${String(v).replace('.', '_')}.png` });
}
console.log('console errors:', errs.length, errs.slice(0, 5));
await b.close();
