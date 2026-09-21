/**
 * scroll.js — maps page scroll to normalised world progress.
 *
 * GSAP ScrollTrigger with `scrub: true` drives a plain number. Because the
 * camera is a pure function of that number (see camera.applyProgress),
 * scrubbing backwards lands on exactly the same transform as scrubbing
 * forwards — no accumulation, so no jump and no drift.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { content } from '../content.js';
import { scroll as cfg } from '../config.js';

gsap.registerPlugin(ScrollTrigger);

/** Total page height, in vh, that the journey occupies. */
export function scrollHeightVh() {
  return cfg.LEAD_IN_VH + content.sections.length * cfg.HEIGHT_PER_SECTION_VH + cfg.LEAD_OUT_VH;
}

export function createScrollDriver({ spacer, onProgress }) {
  spacer.style.height = `${scrollHeightVh()}vh`;

  const proxy = { value: 0 };

  const trigger = ScrollTrigger.create({
    trigger: spacer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: cfg.SCRUB,
    onUpdate: (self) => {
      proxy.value = self.progress;
      onProgress(self.progress);
    },
  });

  /** Scroll position in px for a given normalised progress. */
  function pixelsFor(progress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(max, progress * max));
  }

  /**
   * Animate the page (and therefore the camera) to a progress value.
   * Tweening the scroll position rather than the camera keeps ScrollTrigger
   * the single source of truth, so nothing snaps when the tween ends.
   */
  function animateTo(progress, duration = cfg.NAV_JUMP_DURATION) {
    const target = pixelsFor(progress);
    const obj = { y: window.scrollY };
    gsap.killTweensOf(obj);
    return gsap.to(obj, {
      y: target,
      duration,
      ease: cfg.NAV_JUMP_EASE,
      onUpdate: () => window.scrollTo(0, obj.y),
    });
  }

  /** Jump without animating — used when returning from 2D mode. */
  function jumpTo(progress) {
    window.scrollTo(0, pixelsFor(progress));
    ScrollTrigger.update();
  }

  return {
    get progress() {
      return proxy.value;
    },
    animateTo,
    jumpTo,
    refresh: () => ScrollTrigger.refresh(),
    enable: () => trigger.enable(),
    disable: () => trigger.disable(),
    destroy: () => trigger.kill(),
  };
}
