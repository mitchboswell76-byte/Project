/**
 * chunks.js — streams the world in and out as the camera travels.
 *
 * A chunk is built the first time the camera comes within CHUNK_RADIUS of its
 * anchor, and torn down once it falls outside that range. Only the chunk's own
 * objects are disposed: shared geometry and materials belong to resources.js
 * and must outlive any individual chunk.
 *
 * Two kinds of chunk, streamed identically:
 *   - a DISTRICT, which carries a section's heading, copy, beam riser and
 *     themed scenery, on the straight that section sits on;
 *   - an INTERLUDE, which is the landmark scenery filling the corners and
 *     the monument approach between them, and has no text at all.
 */

import { world as cfg } from '../config.js';
import { buildDistrict, buildInterlude } from './districts.js';
import { loopDistance, wrap } from './path.js';

export function createChunkManager(scene, sections) {
  /** @type {Map<string, {objects:any[], updatables:any[]}>} */
  const live = new Map();

  /* Every streamable stretch of route, districts and interludes together, so
   * the streaming logic below is written once. */
  const zones = [
    ...sections.map((section, i) => ({
      key: `district-${i}`,
      anchor: cfg.SECTION_ANCHORS[i],
      build: () => buildDistrict(section, cfg.SECTION_ANCHORS[i], i),
    })),
    ...(cfg.INTERLUDE_ANCHORS ?? []).map((anchor, i) => ({
      key: `interlude-${i}`,
      anchor,
      build: () => buildInterlude(anchor, i),
    })),
  ].filter((z) => z.anchor !== undefined);

  function mount(zone) {
    if (live.has(zone.key)) return;

    const chunk = zone.build();
    for (const obj of chunk.objects) scene.add(obj);
    live.set(zone.key, chunk);
  }

  function unmount(key) {
    const chunk = live.get(key);
    if (!chunk) return;
    for (const obj of chunk.objects) {
      scene.remove(obj);
      // Every object built by districts.js carries its own disposer, which
      // releases only what that object owns.
      obj.userData?.dispose?.();
    }
    live.delete(key);
  }

  /** Called every frame with the current normalised progress. */
  function update(progress, dt) {
    for (const zone of zones) {
      const { anchor } = zone;
      /* A district's content runs forward from its anchor, so the window is
       * asymmetric: reach further ahead than behind. Both edges are measured
       * the short way round the loop, or the district either side of the
       * join would drop out as progress wrapped past 1. */
      const ahead = wrap(anchor - progress); // 0 → 1 going forwards to it
      const behind = wrap(progress - anchor);
      const inRange =
        (ahead <= cfg.CHUNK_RADIUS * 1.6 || behind <= cfg.CHUNK_RADIUS) &&
        loopDistance(progress, anchor) <= cfg.CHUNK_RADIUS * 1.6;
      if (inRange) mount(zone);
      else unmount(zone.key);
    }

    for (const chunk of live.values()) {
      for (const obj of chunk.updatables) obj.update(dt);
    }
  }

  /** Build everything at once — used to warm the world before Enter. */
  function mountAll() {
    for (const zone of zones) mount(zone);
  }

  function disposeAll() {
    for (const key of [...live.keys()]) unmount(key);
  }

  return { update, mountAll, disposeAll, get liveCount() { return live.size; } };
}
