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
 * is exactly on the anchor. Before the first anchor the first section is
 * current — there is no unnamed state in the nav.
 */
export function sectionAtProgress(p) {
  const a = world.SECTION_ANCHORS;
  let index = 0;
  for (let i = 1; i < a.length; i++) {
    const boundary = (a[i - 1] + a[i]) / 2;
    if (p >= boundary) index = i;
  }
  return index;
}

/** Convenience: the section object itself. */
export function sectionObjectAt(p) {
  return content.sections[sectionAtProgress(p)];
}
