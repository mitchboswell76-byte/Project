/**
 * main.js — bootstrap and mode switching.
 *
 * Responsibilities:
 *   - push the palette from config.js into CSS custom properties
 *   - detect capability (WebGL / viewport / reduced motion)
 *   - paint the entry gate immediately, and build the world behind it
 *   - hand control from the Enter transition to the scroll driver
 *
 * Stubbed until later milestones: the top-left overlay (M4), 2D document
 * mode (M5) and audio (M6).
 */

import './style.css';
import gsap from 'gsap';

import { content } from './content.js';
import { fallback, hex, palette } from './config.js';
import { createEntryScreen } from './ui/entry.js';
import { createWorld } from './world/scene.js';
import { createScrollDriver, scrollHeightVh } from './world/scroll.js';

/* ------------------------------------------------------------------ */
/* Palette → CSS custom properties                                     */
/* ------------------------------------------------------------------ */
/* Editing config.js therefore restyles the CSS layer too, so the palette
 * genuinely lives in one file. */
function applyPalette() {
  const root = document.documentElement.style;
  root.setProperty('--bg', hex(palette.background));
  root.setProperty('--grid', hex(palette.grid));
  root.setProperty('--ink', hex(palette.ink));
  root.setProperty('--ink-muted', hex(palette.inkMuted));
  root.setProperty('--beam', hex(palette.beam));
  palette.accents.forEach((c, i) => root.setProperty(`--accent-${i}`, hex(c)));
}

/* ------------------------------------------------------------------ */
/* Capability detection                                                */
/* ------------------------------------------------------------------ */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export const capability = {
  webgl: hasWebGL(),
  narrow: window.innerWidth < fallback.MOBILE_BREAKPOINT_PX,
  reducedMotion: prefersReducedMotion(),
};

/** 2D is the default on narrow screens, reduced motion, or no WebGL. */
capability.prefer2d = !capability.webgl || capability.narrow || capability.reducedMotion;

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

const DEBUG = new URLSearchParams(location.search).has('debug');

function boot() {
  applyPalette();
  document.title = content.meta.siteName;
  document.body.classList.add('is-locked', 'mode-3d');

  const spacer = document.getElementById('scroll-spacer');
  spacer.style.height = `${scrollHeightVh()}vh`;

  const entry = createEntryScreen({ onEnter: enterSite });

  /** @type {ReturnType<typeof createWorld>|null} */
  let world = null;
  /** @type {ReturnType<typeof createScrollDriver>|null} */
  let scroller = null;

  /* Build the world behind the entry gate. The gate must paint first, so
   * defer past the first frames rather than blocking on the build. */
  function buildWorld() {
    if (!capability.webgl) {
      // No WebGL: there is nothing to warm, so the gate is ready at once.
      entry.setReady();
      return;
    }
    try {
      world = createWorld(document.getElementById('webgl'));
      world.warm();
      if (DEBUG) console.info('[world] warmed', world.stats());
    } catch (err) {
      console.error('[world] build failed, falling back to 2D', err);
      world = null;
      capability.webgl = false;
      capability.prefer2d = true;
    }
    entry.setReady();
  }

  const defer = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 60));
  requestAnimationFrame(() => requestAnimationFrame(() => defer(buildWorld)));

  /* ---------------- Enter ---------------- */
  function enterSite() {
    entry.dismiss();
    document.body.classList.remove('is-locked');

    if (!world) return; // 2D mode lands here once M5 exists

    world.setIntro(0);
    world.start();

    const tl = { k: 0 };
    gsap.to(tl, {
      k: 1,
      duration: capability.reducedMotion ? 0 : 2.6,
      ease: 'power3.inOut',
      onUpdate: () => world.setIntro(tl.k),
      onComplete: () => {
        world.setIntro(1);
        scroller = createScrollDriver({
          spacer,
          onProgress: (p) => world.setProgress(p),
        });
        scroller.refresh();
        if (DEBUG) startDebugReadout(world);
      },
    });
  }

  // Exposed for the next milestones (overlay, 2D toggle) and for debugging.
  window.__site = {
    get world() {
      return world;
    },
    get scroller() {
      return scroller;
    },
    capability,
  };
}

/* ------------------------------------------------------------------ */
/* Debug readout (?debug) — draw calls and fps                          */
/* ------------------------------------------------------------------ */

function startDebugReadout(world) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;right:10px;top:10px;z-index:200;font:11px ui-monospace,monospace;' +
    'color:#f2f2f5;background:rgba(0,0,0,.65);padding:8px 10px;line-height:1.5;white-space:pre';
  document.body.appendChild(el);

  let frames = 0;
  let fps = 0;
  let last = performance.now();

  (function tick() {
    frames++;
    const now = performance.now();
    if (now - last >= 500) {
      fps = Math.round((frames * 1000) / (now - last));
      frames = 0;
      last = now;
      const s = world.stats();
      el.textContent =
        `fps        ${fps}\n` +
        `draw calls ${s.calls}\n` +
        `triangles  ${s.triangles.toLocaleString()}\n` +
        `geometries ${s.geometries}\n` +
        `textures   ${s.textures}\n` +
        `chunks     ${s.chunks}\n` +
        `progress   ${world.getProgress().toFixed(3)}`;
    }
    requestAnimationFrame(tick);
  })();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
