/**
 * entry.js — the pre-load gate.
 *
 * Full-screen dot-grid background, a pixel wordmark inside a thin outline
 * whose individual pixels flicker between grey and the accent palette, small
 * coloured squares drifting in front of and behind it, the name block bottom
 * left and the Enter button bottom right.
 *
 * Nothing here touches Three.js — the entry screen must paint before the
 * world has finished building.
 */

import { content } from '../content.js';
import { entry as cfg, hex, palette } from '../config.js';
import { rasteriseBlock, toCoords } from '../world/bitmapFont.js';
import { makeDotTile } from './dotGrid.js';

const GREY = hex(palette.voxelGrey);

export function createEntryScreen({ onEnter, onRead }) {
  const root = document.getElementById('entry');
  const canvas = document.getElementById('entry-canvas');
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('read-button').addEventListener('click', onRead);
  const enterBtn = document.getElementById('enter-button');

  /* ---------- static DOM text, all from content.js ---------- */
  document.getElementById('entry-name-lines').innerHTML = content.meta.nameLines
    .map((line) => `<span>${line}</span>`)
    .join('');
  document.getElementById('entry-since').textContent = `Since ${content.meta.since}`;
  document.getElementById('entry-tagline').textContent = content.meta.tagline;
  document.getElementById('sound-notice').textContent = content.meta.soundNotice;
  document.getElementById('enter-label').textContent = content.meta.enterLabel;

  /* ---------- wordmark pixel grid ---------- */
  const grid = rasteriseBlock(content.meta.nameLines, {
    letterSpacing: 1,
    lineGap: 2,
    align: 'center',
  });
  const coords = toCoords(grid);
  // Per-pixel colour, mutated by the flicker timer.
  const pixelColours = coords.map(() => GREY);

  /* ---------- drifting squares ---------- */
  const squares = [];
  const seedSquares = (w, h) => {
    squares.length = 0;
    for (let i = 0; i < cfg.DRIFT_SQUARES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = cfg.DRIFT_SPEED * (0.35 + Math.random() * 0.9);
      squares.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: cfg.DRIFT_MIN_PX + Math.random() * (cfg.DRIFT_MAX_PX - cfg.DRIFT_MIN_PX),
        colour: hex(palette.accents[(Math.random() * palette.accents.length) | 0]),
        // Half drift behind the wordmark, half in front.
        front: Math.random() > 0.5,
        alpha: 0.22 + Math.random() * 0.5,
      });
    }
  };

  /* ---------- sizing ---------- */
  let dpr = 1;
  let w = 0;
  let h = 0;
  let pixelPx = cfg.WORDMARK_PIXEL_PX;
  let dotPattern = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Scale the wordmark so it always occupies a sensible share of the screen.
    const step = cfg.WORDMARK_PIXEL_PX + cfg.WORDMARK_GAP_PX;
    const naturalW = grid.width * step;
    const target = Math.min(w * 0.62, 760);
    pixelPx = Math.max(3, Math.round(cfg.WORDMARK_PIXEL_PX * (target / naturalW)));

    dotPattern = ctx.createPattern(makeDotTile(28, 2, hex(palette.grid)), 'repeat');
    if (squares.length === 0) seedSquares(w, h);
    if (reduced) requestAnimationFrame(frame);
  }

  /* ---------- flicker ---------- */
  const flickerInterval = 1000 / cfg.FLICKER_PER_SECOND;

  function flicker() {
    for (let i = 0; i < cfg.FLICKER_BATCH; i++) {
      const idx = (Math.random() * pixelColours.length) | 0;
      // Roughly a third of hits go back to grey, so accents stay a minority.
      pixelColours[idx] =
        Math.random() < 0.34
          ? GREY
          : hex(palette.accents[(Math.random() * palette.accents.length) | 0]);
    }
  }

  /* ---------- draw ---------- */
  function drawSquares(front, dt) {
    for (const s of squares) {
      if (s.front !== front) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Wrap with a margin so squares never pop at the edge.
      const m = s.size + 4;
      if (s.x < -m) s.x = w + m;
      if (s.x > w + m) s.x = -m;
      if (s.y < -m) s.y = h + m;
      if (s.y > h + m) s.y = -m;

      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.colour;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawWordmark() {
    const step = pixelPx + cfg.WORDMARK_GAP_PX;
    const markW = grid.width * step;
    const markH = grid.height * step;
    const originX = Math.round((w - markW) / 2);
    const originY = Math.round((h - markH) / 2);

    // Thin outline rectangle around the wordmark.
    const pad = Math.round(pixelPx * 2.6);
    ctx.strokeStyle = hex(palette.inkMuted);
    ctx.lineWidth = 1;
    ctx.strokeRect(
      originX - pad + 0.5,
      originY - pad + 0.5,
      markW + pad * 2 - 1,
      markH + pad * 2 - 1
    );

    for (let i = 0; i < coords.length; i++) {
      ctx.fillStyle = pixelColours[i];
      ctx.fillRect(originX + coords[i].x * step, originY + coords[i].y * step, pixelPx, pixelPx);
    }
  }

  /* ---------- loop ---------- */
  let raf = 0;
  let last = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    ctx.fillStyle = hex(palette.background);
    ctx.fillRect(0, 0, w, h);
    if (dotPattern) {
      ctx.fillStyle = dotPattern;
      ctx.fillRect(0, 0, w, h);
    }

    drawSquares(false, dt);
    drawWordmark();
    drawSquares(true, dt);

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  const flickerId = reduced ? null : setInterval(flicker, flickerInterval);
  if (reduced) flicker();

  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(frame);

  /* ---------- enter ---------- */
  let ready = false;

  enterBtn.disabled = true;
  enterBtn.addEventListener('click', () => {
    if (!ready) return;
    onEnter();
  });

  return {
    /** Called once the world has finished building in the background. */
    setReady() {
      ready = true;
      enterBtn.disabled = false;
      enterBtn.classList.add('is-ready');
      root.classList.add('is-ready');
    },
    /** Fade the gate out and stop its render loop. */
    dismiss() {
      root.classList.add('is-leaving');
      setTimeout(() => {
        running = false;
        cancelAnimationFrame(raf);
        clearInterval(flickerId);
        window.removeEventListener('resize', resize);
        root.hidden = true;
      }, 900);
    },
  };
}
