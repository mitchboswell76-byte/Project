/**
 * scroll.js — maps page scroll to normalised world progress, on a loop.
 *
 * The route is a closed circuit, so the journey has no end to stop at. The
 * page, however, has a bottom. The two are reconciled like this:
 *
 *   page = [ buffer ][      one lap      ][ buffer ]
 *
 * Progress is (scrollY - buffer) / lap, wrapped. The moment the scroll
 * position leaves the lap region and enters a buffer, it is moved by exactly
 * one lap's worth of pixels. Because progress is PERIODIC with that period,
 * moving by one lap leaves progress — and therefore the camera — completely
 * unchanged. The scrollbar jumps; the world does not. That is the whole
 * trick, and it is why the buffers have to be at least one screen tall: there
 * has to be somewhere to wrap into.
 *
 * This drives the progress value directly rather than through GSAP
 * ScrollTrigger. ScrollTrigger's scrub is "progress = scroll position", which
 * is exactly what is wanted, but it also owns the scroll position and fights
 * the wrap. Reading scrollY ourselves keeps progress a pure function of it,
 * so scrubbing back up still reproduces every camera transform exactly.
 */

import gsap from 'gsap';
import { scroll as cfg } from '../config.js';
import { totalLength, wrap } from './path.js';

/** One lap of the circuit, in viewport heights. */
export function lapVh() {
  return (totalLength / cfg.UNITS_PER_SCREEN) * 100;
}

/** Total page height, in vh: a lap plus a buffer at each end to wrap into. */
export function scrollHeightVh() {
  return lapVh() + cfg.LOOP_BUFFER_VH * 2;
}

export function createScrollDriver({ spacer, onProgress }) {
  spacer.style.height = `${scrollHeightVh()}vh`;

  const state = { progress: 0, enabled: true };
  /* Set while we are moving the scroll position ourselves, so our own
   * programmatic scrolls do not re-enter the handler as user input. */
  let selfScrolling = false;

  const bufferPx = () => (window.innerHeight * cfg.LOOP_BUFFER_VH) / 100;
  const lapPx = () => (window.innerHeight * lapVh()) / 100;

  /** Scroll position in px for a progress value, always inside the lap. */
  function pixelsFor(progress) {
    return bufferPx() + wrap(progress) * lapPx();
  }

  function setScroll(y) {
    selfScrolling = true;
    window.scrollTo(0, y);
    // Cleared on the next frame: the scroll event it causes is asynchronous.
    requestAnimationFrame(() => {
      selfScrolling = false;
    });
  }

  function read() {
    if (!state.enabled || selfScrolling) return;

    const y = window.scrollY;
    const buffer = bufferPx();
    const lap = lapPx();
    const raw = (y - buffer) / lap;

    /* Left the lap region: put the scroll position back inside it, exactly
     * one or more laps away. Progress is unchanged by construction, so this
     * is invisible — do it before reporting, so nothing sees the excursion. */
    if (y < buffer || y >= buffer + lap) setScroll(buffer + wrap(raw) * lap);

    state.progress = wrap(raw);
    onProgress(state.progress);
  }

  const onScroll = () => read();
  const onResize = () => {
    // vh-based sizes just changed underneath us; hold the camera still.
    if (state.enabled) setScroll(pixelsFor(state.progress));
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  /**
   * Animate to a progress value, going THE SHORT WAY round the loop — from
   * section 04 to section 01 that is forwards across the join, not all the
   * way back through the whole circuit.
   *
   * The tween drives progress and writes the scroll position from it, rather
   * than tweening the scroll position itself: a pixel tween that crossed a
   * buffer would be wrapped mid-flight and land in the wrong place.
   */
  function animateTo(progress, duration = cfg.NAV_JUMP_DURATION) {
    const from = state.progress;
    let delta = wrap(progress) - from;
    if (delta > 0.5) delta -= 1;
    if (delta < -0.5) delta += 1;

    const tween = { p: from };
    gsap.killTweensOf(tween);
    return gsap.to(tween, {
      p: from + delta,
      duration,
      ease: cfg.NAV_JUMP_EASE,
      onUpdate: () => jumpTo(tween.p),
    });
  }

  /**
   * Jump without animating — used when returning from 2D mode.
   *
   * Progress is taken from the pixel actually scrolled to, not from the value
   * asked for. Scroll positions are whole pixels, so the two differ slightly;
   * storing the exact request means a later scroll event re-derives a very
   * slightly different progress from the same position, and the camera
   * transform stops being reproducible.
   */
  function jumpTo(progress) {
    const y = Math.round(pixelsFor(progress));
    setScroll(y);
    state.progress = wrap((y - bufferPx()) / lapPx());
    onProgress(state.progress);
  }

  jumpTo(0);

  return {
    get progress() {
      return state.progress;
    },
    animateTo,
    jumpTo,
    refresh: () => {
      spacer.style.height = `${scrollHeightVh()}vh`;
      if (state.enabled) setScroll(pixelsFor(state.progress));
    },
    enable: () => {
      state.enabled = true;
      setScroll(pixelsFor(state.progress));
    },
    disable: () => {
      state.enabled = false;
    },
    destroy: () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    },
  };
}
