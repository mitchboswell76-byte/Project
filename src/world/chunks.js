/**
 * chunks.js — streams districts in and out as the camera travels.
 *
 * A chunk is built the first time the camera comes within CHUNK_RADIUS of its
 * anchor, and torn down once it falls outside that range. Only the chunk's own
 * objects are disposed: shared geometry and materials belong to resources.js
 * and must outlive any individual chunk.
 */

import { world as cfg } from '../config.js';
import { buildDistrict } from './districts.js';

export function createChunkManager(scene, sections) {
  /** @type {Map<number, {objects:any[], updatables:any[]}>} */
  const live = new Map();

  function mount(index) {
    if (live.has(index)) return;
    const section = sections[index];
    const u = cfg.SECTION_ANCHORS[index];
    if (!section || u === undefined) return;

    const chunk = buildDistrict(section, u, index);
    for (const obj of chunk.objects) scene.add(obj);
    live.set(index, chunk);
  }

  function unmount(index) {
    const chunk = live.get(index);
    if (!chunk) return;
    for (const obj of chunk.objects) {
      scene.remove(obj);
      // Every object built by districts.js carries its own disposer, which
      // releases only what that object owns.
      obj.userData?.dispose?.();
    }
    live.delete(index);
  }

  /** Called every frame with the current normalised progress. */
  function update(progress, dt) {
    for (let i = 0; i < sections.length; i++) {
      const anchor = cfg.SECTION_ANCHORS[i];
      if (anchor === undefined) continue;
      // A district's content runs forward from its anchor, so the window is
      // asymmetric: reach further ahead than behind.
      const inRange = progress > anchor - cfg.CHUNK_RADIUS && progress < anchor + cfg.CHUNK_RADIUS * 1.6;
      if (inRange) mount(i);
      else unmount(i);
    }

    for (const chunk of live.values()) {
      for (const obj of chunk.updatables) obj.update(dt);
    }
  }

  /** Build everything at once — used to warm the world before Enter. */
  function mountAll() {
    for (let i = 0; i < sections.length; i++) mount(i);
  }

  function disposeAll() {
    for (const index of [...live.keys()]) unmount(index);
  }

  return { update, mountAll, disposeAll, get liveCount() { return live.size; } };
}
