import './style.css';
import gsap from 'gsap';
import { content } from './content.js';
import { camera as camCfg, doc as docCfg, fallback, hex, overlay as overlayCfg, palette, world as worldCfg } from './config.js';
import { progressForSection, sectionAtProgress } from './sections.js';
import { createEntryScreen } from './ui/entry.js';
import { createOverlay } from './ui/overlay.js';
import { createDocument2d } from './ui/document2d.js';
import { createAudio } from './audio/audio.js';

function applyPalette() {
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries({ bg: palette.background, grid: palette.grid, ink: palette.ink, 'ink-muted': palette.inkMuted, beam: palette.beam })) root.setProperty(`--${key}`, hex(value));
  palette.accents.forEach((c, i) => root.setProperty(`--accent-${i}`, hex(c)));
  const b = palette.background;
  root.setProperty('--bg-rgb', `${b >> 16 & 255}, ${b >> 8 & 255}, ${b & 255}`);
  root.setProperty('--scrim-w', `${overlayCfg.SCRIM_WIDTH_PX}px`);
  root.setProperty('--scrim-h', `${overlayCfg.SCRIM_HEIGHT_PX}px`);
  root.setProperty('--scrim-alpha', String(overlayCfg.SCRIM_ALPHA));
  root.setProperty('--measure', `${docCfg.MEASURE_CH}ch`);
}
function hasWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
export const capability = {
  webgl: hasWebGL(), narrow: innerWidth < fallback.MOBILE_BREAKPOINT_PX,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};
capability.prefer2d = !capability.webgl || capability.narrow || capability.reducedMotion;
const DEBUG = new URLSearchParams(location.search).has('debug');

function boot() {
  applyPalette();
  document.title = `${content.meta.siteName} — Politics, people & what comes next`;
  document.body.classList.add('is-locked', 'mode-3d');
  const resize = () => document.body.classList.toggle('is-narrow', innerWidth < fallback.MOBILE_BREAKPOINT_PX);
  resize();
  window.addEventListener('resize', resize);
  const spacer = document.getElementById('scroll-spacer');
  let createScrollDriver = null;
  const sound = createAudio();
  let world = null, worldPromise = null, scroller = null, overlay = null, doc2d = null;
  let mode = '3d', entered = false, parkedProgress = 0, parkedSection = 0, introTween = null, modeRequest = 0;
  const entry = createEntryScreen({ onEnter: () => enterSite(capability.prefer2d ? '2d' : '3d'), onRead: () => enterSite(capability.prefer2d && capability.webgl ? '3d' : '2d') });

  if (capability.prefer2d) {
    document.getElementById('enter-label').textContent = content.meta.readLabel;
    document.getElementById('read-button').textContent = 'Explore in 3D →';
    document.getElementById('read-button').hidden = !capability.webgl;
  }

  async function buildWorld() {
    if (!capability.webgl) return null;
    if (worldPromise) return worldPromise;
    worldPromise = (async () => {
      try {
        const [{ createWorld }, scrollModule] = await Promise.all([import('./world/scene.js'), import('./world/scroll.js')]);
        createScrollDriver = scrollModule.createScrollDriver;
        world = createWorld(document.getElementById('webgl'));
        world.warm();
        if (DEBUG) startDebugReadout(world);
        return world;
      } catch (error) {
        console.warn('3D unavailable; the reading view is ready.', error);
        capability.webgl = false;
        capability.prefer2d = true;
        world?.dispose();
        world = null;
        if (overlay) overlay.element.querySelector('.icon--3d').disabled = true;
        return null;
      } finally { entry.setReady(); }
    })();
    return worldPromise;
  }
  // Readers never have to download or construct the scene before opening the site.
  entry.setReady();
  if (!capability.prefer2d && !location.hash && new URLSearchParams(location.search).get('view') !== '2d') {
    requestAnimationFrame(() => requestAnimationFrame(() => buildWorld()));
  }

  function rememberSection(i) {
    history.replaceState(null, '', `${location.pathname}${location.search}#${content.sections[i].id}`);
  }
  function navigate(i) {
    sound.play('sfx-nav');
    if (mode === '3d' && scroller) {
      introTween?.kill(); world.setIntro(1); scroller.enable();
      scroller.animateTo(progressForSection(i));
    }
    else doc2d.scrollToSection(i);
    overlay.setSection(i);
    rememberSection(i);
  }
  function buildChrome() {
    doc2d = createDocument2d();
    doc2d.hide();
    overlay = createOverlay({ mode, sound: !sound.muted, onNavigate: navigate,
      onHome: () => { if (mode === '3d') scroller?.animateTo(0); else window.scrollTo({ top: 0, behavior: capability.reducedMotion ? 'auto' : 'smooth' }); },
      onViewChange: next => setMode(next),
      onSoundChange: on => { sound.setMuted(!on); overlay.setSound(on); if (on) sound.init().then(() => sound.play('sfx-toggle')); },
      onZoomChange: direction => { if (world) overlay.setZoom(world.stepZoom(direction)); },
    });
    overlay.element.querySelector('.icon--3d').disabled = !capability.webgl;
    if (world) overlay.setZoom(world.zoomState());
    window.addEventListener('scroll', () => { if (mode === '2d') overlay.setSection(doc2d.currentSection()); }, { passive: true });
  }
  function ensureScroller() {
    if (scroller || !world) return;
    scroller = createScrollDriver({ spacer, onProgress: p => {
      world.setProgress(p);
      if (mode === '3d') overlay?.setSection(sectionAtProgress(p));
    }});
  }
  async function setMode(next, { toTop = false, intro = false } = {}) {
    const request = ++modeRequest;
    introTween?.kill();
    if (next === mode && doc2d && ((next === '2d' && !doc2d.element.hidden) || (next === '3d' && world))) {
      if (next === '3d') { world.setIntro(1); scroller?.enable(); }
      return;
    }
    if (next === '3d') {
      document.body.classList.add('is-loading-3d');
      await buildWorld();
      document.body.classList.remove('is-loading-3d');
      if (request !== modeRequest) return;
      if (!world) next = '2d';
    }
    if (next === '2d') {
      if (mode === '3d') {
        parkedProgress = scroller?.progress ?? 0;
        parkedSection = sectionAtProgress(parkedProgress);
      }
      mode = '2d';
      scroller?.disable(); world?.stop();
      document.body.classList.replace('mode-3d', 'mode-2d');
      doc2d.show();
      if (toTop) window.scrollTo(0, 0);
      else doc2d.scrollToSection(parkedSection, 'auto');
      overlay.setSection(toTop ? 0 : parkedSection);
    } else {
      const readingAt = doc2d.currentSection();
      mode = '3d';
      document.body.classList.replace('mode-2d', 'mode-3d');
      doc2d.hide();
      world.setIntro(1); world.start();
      ensureScroller(); scroller.enable(); scroller.refresh();
      const target = intro ? 0 : readingAt === parkedSection ? parkedProgress : progressForSection(readingAt);
      scroller.jumpTo(target);
      overlay.setZoom(world.zoomState());
      if (intro && !capability.reducedMotion) {
        scroller.disable();
        const clock = { k: 0 };
        world.setIntro(0);
        introTween = gsap.to(clock, { k: 1, duration: camCfg.INTRO_DURATION, ease: camCfg.INTRO_EASE,
          onUpdate: () => world.setIntro(clock.k), onComplete: () => { world.setIntro(1); scroller.enable(); } });
      }
    }
    overlay.setMode(mode);
  }
  async function enterSite(initialMode = '2d') {
    if (entered) return;
    entered = true;
    entry.dismiss();
    document.body.classList.remove('is-locked');
    buildChrome();
    if (!sound.muted) sound.init().then(() => sound.play('sfx-enter'));
    // Show readable content while the optional scene finishes loading.
    await setMode('2d', { toTop: true });
    if (initialMode === '3d') await setMode('3d', { intro: true });
    else {
      const i = content.sections.findIndex(s => s.id === location.hash.slice(1));
      if (i >= 0) { doc2d.scrollToSection(i, 'auto'); overlay.setSection(i); }
      doc2d.element.focus({ preventScroll: true });
    }
  }
  window.addEventListener('beforeprint', () => { if (!doc2d) doc2d = createDocument2d(); });
  document.getElementById('skip-content').addEventListener('click', async () => {
    if (!entered) await enterSite('2d'); else await setMode('2d');
    doc2d.element.focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', async () => {
    const i = content.sections.findIndex(s => s.id === location.hash.slice(1));
    if (i < 0) return;
    if (!entered) await enterSite('2d');
    navigate(i);
  });
  document.getElementById('webgl').addEventListener('webglcontextlost', event => {
    event.preventDefault(); capability.webgl = false;
    if (entered) { setMode('2d'); overlay.element.querySelector('.icon--3d').disabled = true; }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) world?.stop(); else if (entered && mode === '3d') world?.start();
  });
  window.__site = { get world() { return world; }, get scroller() { return scroller; },
    get overlay() { return overlay; }, get doc() { return doc2d; }, get mode() { return mode; },
    audio: sound, setMode, capability, anchors: worldCfg.SECTION_ANCHORS,
    restingFov: camCfg.FOV };
  if (location.hash || new URLSearchParams(location.search).get('view') === '2d') enterSite('2d');
}

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
