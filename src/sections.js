/**
 * sections.js — the one place that maps between a section index and a
 * position along the route.
 *
 * Both the overlay nav (M4) and the 2D/3D toggle (M5) need this mapping, and
 * they must agree exactly or a toggle would land you in a different place
 * from the one the nav highlighted. Keeping it here means there is a single
 * definition rather than two that drift apart.
 */

import { content } from './content.js';
import { world } from './config.js';

/** Normalised progress (0–1) at which section `i` sits. */
export function progressForSection(i) {
  const a = world.SECTION_ANCHORS;
  return a[Math.max(0, Math.min(a.length - 1, i))] ?? 0;
}

/**
 * Which section is "current" at a given progress.
 *
 * A section takes over halfway between its anchor and the next one, so the
 * highlight changes at a sensible midpoint rather than only once the camera
 * is exactly on the anchor.
 *
 * The route is a loop, so this is circular: the last section holds until the
 * midpoint between it and the FIRST anchor, measured forwards across the
 * join. That is why it is written as "which anchor is closest behind me"
 * rather than as a linear scan — a linear scan leaves the stretch before the
 * first anchor and after the last one unnamed, and on a loop that stretch is
 * one continuous piece of route, not two ends.
 */
export function sectionAtProgress(p) {
  const a = world.SECTION_ANCHORS;
  if (!a.length) return 0;

  const wrapped = ((p % 1) + 1) % 1;
  let index = 0;
  let best = Infinity;

  const loop = (v) => ((v % 1) + 1) % 1;

  for (let i = 0; i < a.length; i++) {
    /* This section takes over halfway back to the PREVIOUS anchor. That gap
     * is not the same as the gap to the next one — the stretch from the last
     * section round to the first carries the monument and is twice as long —
     * so the two must not be used interchangeably. */
    const prev = a[(i - 1 + a.length) % a.length];
    const span = loop(a[i] - prev);
    const takeover = loop(a[i] - span / 2);
    // How far forward of that takeover point we are; the smallest wins.
    const since = loop(wrapped - takeover);
    if (since < best) {
      best = since;
      index = i;
    }
  }
  return index;
}

/** Convenience: the section object itself. */
export function sectionObjectAt(p) {
  return content.sections[sectionAtProgress(p)];
}
