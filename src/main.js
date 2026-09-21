/**
 * main.js — bootstrap and mode switching.
 *
 * Responsibilities:
 *   - push the palette from config.js into CSS custom properties
 *   - detect capability (WebGL / viewport / reduced motion)
 *   - paint the entry gate immediately, and build the world behind it
 *   - hand control from the Enter transition to the scroll driver
 *   - own the single source of truth for view mode (3D world / 2D document)
 *     and for sound, and keep the overlay in step with both
 *
 * Narrow screens, `prefers-reduced-motion` and machines without WebGL all
 * START in the reading view (capability.prefer2d). Only the no-WebGL case
 * loses the 3D control; the other two keep the toggle, so anyone who wants
 * the world can still have it.
 */

import './style.css';
import gsap from 'gsap';

import { content } from './content.js';
import {
  camera as camCfg,
  doc as docCfg,
  fallback,
  hex,
  overlay as overlayCfg,
  palette,
  world as worldCfg,
} from './config.js';
import { progressForSection, sectionAtProgress } from './sections.js';
import { createEntryScreen } from './ui/entry.js';
import { createOverlay } from './ui/overlay.js';
import { createDocument2d } from './ui/document2d.js';
import { createAudio } from './audio/audio.js';
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

  // The overlay scrim is a gradient of the background colour, so it needs
  // the same value as RGB components rather than as a hex string.
  const b = palette.background;
  root.setProperty('--bg-rgb', `${(b >> 16) & 255}, ${(b >> 8) & 255}, ${b & 255}`);

  // Layout constants that CSS needs but config.js owns.
  root.setProperty('--scrim-w', `${overlayCfg.SCRIM_WIDTH_PX}px`);
  root.setProperty('--scrim-h', `${overlayCfg.SCRIM_HEIGHT_PX}px`);
  root.setProperty('--scrim-alpha', String(overlayCfg.SCRIM_ALPHA));
  root.setProperty('--measure', `${docCfg.MEASURE_CH}ch`);
  root.setProperty('--doc-top-narrow', `${overlayCfg.NARROW_DOC_TOP_PX}px`);
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
  /* The narrow-screen layout is decided by fallback.MOBILE_BREAKPOINT_PX in
   * config.js, not by a second breakpoint written into the stylesheet. */
  document.body.classList.toggle('is-narrow', capability.narrow);

  const spacer = document.getElementById('scroll-spacer');
  spacer.style.height = `${scrollHeightVh()}vh`;

  const entry = createEntryScreen({ onEnter: enterSite });
  const sound = createAudio();

  /** @type {ReturnType<typeof createWorld>|null} */
  let world = null;
  /** @type {ReturnType<typeof createScrollDriver>|null} */
  let scroller = null;
  /** @type {ReturnType<typeof createOverlay>|null} */
  let overlay = null;
  /** @type {ReturnType<typeof createDocument2d>|null} */
  let doc2d = null;

  /** '3d' | '2d'. The only place view mode is stored. */
  let mode = '3d';
  /** Where the camera was when we last left 3D, so the toggle is reversible. */
  let parkedProgress = 0;
  let parkedSection = 0;

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
      console.warn('[world] build failed, falling back to 2D', err);
      world = null;
      capability.webgl = false;
      capability.prefer2d = true;
    }
    entry.setReady();
  }

  const defer = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 60));
  requestAnimationFrame(() => requestAnimationFrame(() => defer(buildWorld)));

  /* ---------------- overlay + 2D document ---------------- */

  function buildChrome() {
    doc2d = createDocument2d();
    doc2d.hide();

    overlay = createOverlay({
      mode,
      sound: !sound.muted,
      onNavigate: (i) => {
        sound.play('sfx-nav');
        if (mode === '3d' && scroller) scroller.animateTo(progressForSection(i));
        else doc2d.scrollToSection(i);
        overlay.setSection(i);
      },
      onViewChange: (next) => setMode(next),
      onSoundChange: (on) => {
        sound.setMuted(!on);
        overlay.setSound(on);
        sound.play('sfx-toggle');
      },
    });

    // Without WebGL there is no 3D to go back to; say so rather than
    // offering a button that would do nothing.
    if (!capability.webgl) {
      const btn = overlay.element.querySelector('.icon--3d');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }

    // In 2D the page scroll belongs to the document, so the nav highlight
    // has to follow it rather than the camera.
    window.addEventListener(
      'scroll',
      () => {
        if (mode === '2d' && doc2d && overlay) overlay.setSection(doc2d.currentSection());
      },
      { passive: true }
    );
  }

  /* ---------------- view mode ---------------- */

  /**
   * Switch between the world and the document.
   *
   * Position is preserved in both directions: leaving 3D remembers the exact
   * progress value, and coming back restores it if you are still on the same
   * section, or jumps to the section you scrolled to if you moved.
   */
  function setMode(next, { silent = false, toTop = false } = {}) {
    if (next === mode) return;
    if (next === '3d' && !capability.webgl) return;

    if (!silent) sound.play('sfx-toggle');

    if (next === '2d') {
      parkedProgress = scroller ? scroller.progress : parkedProgress;
      parkedSection = sectionAtProgress(parkedProgress);

      mode = '2d';
      document.body.classList.remove('mode-3d');
      document.body.classList.add('mode-2d');
      scroller?.disable();
      world?.stop();
      doc2d.show();
      if (toTop) {
        // First landing in 2D (no WebGL): start at the masthead, not
        // halfway down at section 01.
        window.scrollTo(0, 0);
        overlay?.setSection(0);
      } else {
        // 'auto', not 'smooth': this is a restore, not a journey.
        doc2d.scrollToSection(parkedSection, 'auto');
        overlay?.setSection(parkedSection);
      }
    } else {
      const readingAt = doc2d.currentSection();

      mode = '3d';
      document.body.classList.remove('mode-2d');
      document.body.classList.add('mode-3d');
      doc2d.hide();
      world?.setIntro(1);
      world?.start();
      ensureScroller();
      scroller?.enable();
      scroller?.refresh();
      const target =
        readingAt === parkedSection ? parkedProgress : progressForSection(readingAt);
      scroller?.jumpTo(target);
      world?.setProgress(target);
      overlay?.setSection(sectionAtProgress(target));
    }

    overlay?.setMode(mode);
  }

  /* ---------------- Enter ---------------- */

  /**
   * Create the scroll driver. Deferred until the first time 3D is actually
   * shown, because a visitor who starts in (or switches to) the reading view
   * must not have ScrollTrigger competing for the page scroll.
   */
  function ensureScroller() {
    if (scroller || !world) return;
    scroller = createScrollDriver({
      spacer,
      onProgress: (p) => {
        world.setProgress(p);
        if (mode === '3d') overlay?.setSection(sectionAtProgress(p));
      },
    });
    scroller.refresh();
  }

  function enterSite() {
    entry.dismiss();
    document.body.classList.remove('is-locked');

    buildChrome();

    // Audio is created here and only here: a context made before a gesture
    // is refused or suspended by every current browser.
    sound.init().then((ok) => {
      if (ok) sound.play('sfx-enter');
      if (DEBUG) console.info('[audio]', sound.stats());
    });

    if (capability.prefer2d) {
      /* Narrow screen, reduced motion, or no WebGL: open the reading view.
       * The world, if there is one, stays built and stopped behind it, so
       * the View toggle is instant rather than a second load. */
      setMode('2d', { silent: true, toTop: true });
      if (DEBUG && world) startDebugReadout(world);
      return;
    }

    world.setIntro(0);
    world.start();

    const tl = { k: 0 };
    gsap.to(tl, {
      k: 1,
      duration: capability.reducedMotion ? 0 : camCfg.INTRO_DURATION,
      ease: camCfg.INTRO_EASE,
      onUpdate: () => world.setIntro(tl.k),
      onComplete: () => {
        world.setIntro(1);
        ensureScroller();
        if (DEBUG) startDebugReadout(world);
      },
    });
  }

  // Exposed for the next milestones and for tools/verify.mjs.
  window.__site = {
    get world() {
      return world;
    },
    get scroller() {
      return scroller;
    },
    get overlay() {
      return overlay;
    },
    get doc() {
      return doc2d;
    },
    get mode() {
      return mode;
    },
    audio: sound,
    setMode,
    capability,
    /* Where the sections sit on the route. Exposed so tools/verify.mjs can
     * drive the camera to them without keeping its own copy of the anchors,
     * which would go stale the moment the route is re-laid out. */
    anchors: worldCfg.SECTION_ANCHORS,
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
