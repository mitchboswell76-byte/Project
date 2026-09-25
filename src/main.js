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
 *
 * It also owns the URL. The address bar is the site's only shareable state:
 * `#projects` is section 02 and `?view=doc` is the reading view, in either
 * mode and whichever way the visitor got there. See the URL section below.
 */

import './style.css';
import gsap from 'gsap';

import { content } from './content.js';
import { session } from './util/dom.js';
import {
  camera as camCfg,
  doc as docCfg,
  entry as entryCfg,
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
/* URL state                                                           */
/* ------------------------------------------------------------------ */
/* The hash is the section and `?view=doc` is the reading view, so any point
 * in the site can be linked to, the back button works, and a reload comes
 * back to where you were. The hash matches the ids the 2D document already
 * uses for its sections, so a link works with JavaScript switched off too —
 * the browser simply scrolls to it.
 *
 * Section changes rewrite the URL with replaceState, not pushState: progress
 * changes continuously as you scroll, and pushing a history entry per section
 * would leave the back button unwinding the journey one district at a time.
 * Deliberate acts — a nav click, a view switch — do push. */

const VIEW_PARAM = 'view';
const VIEW_KEY = 'mb:view';

/** @returns {{section: number|null, view: '2d'|'3d'|null}} */
function readUrl() {
  const params = new URLSearchParams(location.search);
  const viewParam = params.get(VIEW_PARAM);
  const id = decodeURIComponent(location.hash.replace(/^#/, '')).replace(/^doc-/, '');
  const index = content.sections.findIndex((s) => s.id === id);
  return {
    section: index >= 0 ? index : null,
    view: viewParam === 'doc' ? '2d' : viewParam === 'world' ? '3d' : null,
  };
}

function writeUrl({ section, view }, { push = false } = {}) {
  const url = new URL(location.href);
  if (view === '2d') url.searchParams.set(VIEW_PARAM, 'doc');
  else url.searchParams.delete(VIEW_PARAM);
  url.hash = section == null ? '' : `#${content.sections[section].id}`;

  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === `${location.pathname}${location.search}${location.hash}`) return;
  if (push) history.pushState(null, '', next);
  else history.replaceState(null, '', next);
}

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

  /* What the URL asked for, read once. A link to a section is a deep link:
   * it skips the Enter fly-through, which is an opening, not something to sit
   * through on the way to the thing you were sent. */
  const requested = readUrl();

  const entry = createEntryScreen({
    onEnter: () => enterSite(),
    onRead: () => enterSite({ read: true }),
  });
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
  /** The section the URL asked for, applied once the site is open. */
  const pendingSection = requested.section;
  /** The section the URL currently names, so it is only rewritten on change. */
  let urlSection = requested.section ?? -1;
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
        // A deliberate move, so it earns a history entry.
        writeUrl({ section: i, view: mode }, { push: true });
      },
      onViewChange: (next) => setMode(next),
      onSoundChange: (on) => {
        sound.setMuted(!on);
        overlay.setSound(on);
        sound.play('sfx-toggle');
      },
      onZoomChange: (direction) => {
        if (!world) return;
        overlay.setZoom(world.stepZoom(direction));
      },
    });

    if (world) overlay.setZoom(world.zoomState());

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
        if (mode !== '2d' || !doc2d || !overlay) return;
        const i = doc2d.currentSection();
        overlay.setSection(i);
        overlay.setProgress((i + 0.5) / content.sections.length);
        if (i !== urlSection) {
          urlSection = i;
          writeUrl({ section: i, view: mode });
        }
      },
      { passive: true }
    );

    /* The skip link is the keyboard route past the gate and the world to the
     * words. It points at #doc so it still works with no JavaScript; with
     * JavaScript, switching to the reading view first is what makes it mean
     * anything in 3D. */
    const skip = document.getElementById('skip-link');
    skip.textContent = content.ui.a11y.skipToContent;
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      setMode('2d');
      doc2d.element.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    });
  }

  /* ---------------- view mode ---------------- */

  /**
   * Switch between the world and the document.
   *
   * Position is preserved in both directions: leaving 3D remembers the exact
   * progress value, and coming back restores it if you are still on the same
   * section, or jumps to the section you scrolled to if you moved.
   */
  function setMode(next, { silent = false, toTop = false, fromUrl = false } = {}) {
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
    session.set(VIEW_KEY, mode);
    /* A view switch is deliberate, so it pushes — except when it IS the
     * history, i.e. we are here because the visitor pressed Back. */
    if (!fromUrl) {
      writeUrl({ section: overlaySection(), view: mode }, { push: true });
    }
  }

  /** Whichever section is current in whichever view is showing. */
  function overlaySection() {
    if (mode === '2d') return doc2d ? doc2d.currentSection() : parkedSection;
    return sectionAtProgress(scroller ? scroller.progress : parkedProgress);
  }

  /**
   * Go to a section in whichever view is showing. `animate` is ignored in 2D,
   * where the document's own smooth scrolling does the work.
   */
  function goToSection(i, { animate = true } = {}) {
    if (mode === '2d') {
      doc2d?.scrollToSection(i, animate ? undefined : 'auto');
    } else if (scroller) {
      if (animate) scroller.animateTo(progressForSection(i));
      else scroller.jumpTo(progressForSection(i));
    }
    overlay?.setSection(i);
  }

  /* ---------------- history ---------------- */
  /* Back and forward move between the states the site pushed: nav jumps and
   * view switches. Anything the URL does not name is left alone, so pressing
   * Back from a scrolled position does not also throw away the view. */
  window.addEventListener('popstate', () => {
    const state = readUrl();
    if (state.view && state.view !== mode) setMode(state.view, { fromUrl: true });
    if (state.section != null) goToSection(state.section, { animate: false });
  });

  /* ---------------- keyboard ---------------- */
  /**
   * The shortcuts named in content.ui.keysHint, and nothing else.
   *
   * Arrow keys move a section at a time in the 3D world, where a section is
   * the meaningful unit and the native 40-pixel scroll is not; in the reading
   * view they are left alone, because there they are how you read. Everything
   * else — space, Page Up/Down, Home, End — stays native in both.
   */
  function onKeyDown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.body.classList.contains('is-locked')) return; // gate is up
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

    const sections = content.sections.length;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (mode !== '3d') return;
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        // The route is a loop, so the section list is circular too.
        const next = (overlaySection() + step + sections) % sections;
        sound.play('sfx-nav');
        goToSection(next);
        writeUrl({ section: next, view: mode }, { push: true });
        return;
      }
      case '+':
      case '=':
      case '-':
      case '_': {
        if (mode !== '3d' || !world) return;
        e.preventDefault();
        overlay?.setZoom(world.stepZoom(e.key === '+' || e.key === '=' ? -1 : 1));
        return;
      }
      case 'Escape':
        if (mode === '3d') setMode('2d');
        else if (capability.webgl) setMode('3d');
        return;
      default:
    }
  }
  window.addEventListener('keydown', onKeyDown);

  /* ---------------- the hint ---------------- */
  /* Shown once, after the transition hands over. Nothing else on screen says
   * that the page scroll is what moves the camera. */
  function showScrollHint() {
    if (capability.reducedMotion) return;
    const hint = document.createElement('p');
    hint.className = 'scroll-hint';
    hint.textContent = content.meta.scrollHint;
    hint.setAttribute('aria-hidden', 'true'); // the gesture, not the content
    document.body.appendChild(hint);
    requestAnimationFrame(() => hint.classList.add('is-visible'));

    const dismiss = () => {
      hint.classList.remove('is-visible');
      setTimeout(() => hint.remove(), 700);
      window.removeEventListener('scroll', dismiss);
    };
    window.addEventListener('scroll', dismiss, { passive: true, once: true });
    setTimeout(dismiss, entryCfg.HINT_MS);
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
        if (mode !== '3d') return;
        const i = sectionAtProgress(p);
        overlay?.setSection(i);
        overlay?.setProgress(p);
        /* Rewritten only when the section changes, not on every frame: this
         * runs on every scroll event, and history.replaceState is not free. */
        if (i !== urlSection) {
          urlSection = i;
          writeUrl({ section: i, view: mode });
        }
      },
    });
    scroller.refresh();
  }

  /**
   * Open the site.
   *
   * Which view it opens in is decided here, once, in this order: what the URL
   * asked for, then what this visit last chose, then what the machine can
   * comfortably show. A section in the URL is a deep link, so it skips the
   * Enter transition — that is an opening for a first visit, not something to
   * sit through on the way to the thing someone sent you.
   *
   * @param {{read?: boolean}} [options] `read` forces the reading view.
   */
  function enterSite({ read = false } = {}) {
    entry.dismiss();
    document.body.classList.remove('is-locked');

    buildChrome();

    // Audio is created here and only here: a context made before a gesture
    // is refused or suspended by every current browser.
    sound.init().then((ok) => {
      if (ok) sound.play('sfx-enter');
      if (DEBUG) console.info('[audio]', sound.stats());
    });

    const remembered = session.get(VIEW_KEY);
    const wants2d =
      read ||
      !capability.webgl ||
      requested.view === '2d' ||
      (requested.view !== '3d' && (remembered ? remembered === '2d' : capability.prefer2d));

    if (wants2d) {
      /* Narrow screen, reduced motion, no WebGL, a ?view=doc link, or simply
       * what this visitor chose last time. The world, if there is one, stays
       * built and stopped behind the document, so the View toggle is instant
       * rather than a second load. */
      setMode('2d', { silent: true, toTop: pendingSection == null, fromUrl: true });
      if (pendingSection != null) {
        goToSection(pendingSection, { animate: false });
        overlay?.setSection(pendingSection);
      }
      if (DEBUG && world) startDebugReadout(world);
      return;
    }

    if (pendingSection != null) {
      // Deep link: hand straight over to the scroll driver at that section.
      world.setIntro(1);
      world.start();
      ensureScroller();
      scroller.jumpTo(progressForSection(pendingSection));
      overlay?.setSection(pendingSection);
      showScrollHint();
      if (DEBUG) startDebugReadout(world);
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
        showScrollHint();
        if (DEBUG) startDebugReadout(world);
      },
    });
  }

  /* The container is thrown away on navigation anyway, but releasing the GPU
   * resources explicitly keeps a back-forward-cached page from holding a
   * WebGL context it is not drawing with. */
  window.addEventListener('pagehide', () => world?.dispose(), { once: true });

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
