/**
 * util/dom.js — the handful of browser helpers more than one module needs.
 *
 * Kept deliberately small. Anything that grows a policy of its own (audio
 * preferences, view mode) belongs with the module that owns that policy.
 */

/**
 * Subscribe to `resize`, coalesced to one call per animation frame.
 *
 * Four modules react to a resize — the renderer, the entry canvas, the logo
 * mark and the scroll driver — and a window drag fires the event dozens of
 * times a second. Unthrottled that is four canvas reallocations per event;
 * coalesced it is four per frame at worst.
 *
 * @param {() => void} handler
 * @returns {() => void} unsubscribe
 */
export function onResize(handler) {
  let queued = 0;
  const run = () => {
    queued = 0;
    handler();
  };
  const listener = () => {
    if (queued) return;
    queued = requestAnimationFrame(run);
  };
  window.addEventListener('resize', listener);
  return () => {
    if (queued) cancelAnimationFrame(queued);
    window.removeEventListener('resize', listener);
  };
}

/**
 * sessionStorage that cannot throw. Safari's private mode throws on access
 * rather than returning null, so every read and write is wrapped.
 */
export const session = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* the preference simply will not survive a reload */
    }
  },
};
