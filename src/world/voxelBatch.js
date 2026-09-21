/**
 * voxelBatch.js — a cube accumulator that ends up as ONE InstancedMesh.
 *
 * Every scenery prop in the world is made of axis-aligned cubes drawn from
 * the same shared BoxGeometry and the same shared Lambert material, with
 * colour supplied per instance. That means a whole district's props — trees,
 * houses, a ship, a train, a hundred figures — can share a single
 * InstancedMesh and cost a single draw call, which is stricter than "one
 * InstancedMesh per prop type" and is why the whole scene fits in the
 * draw-call budget with room to spare.
 *
 * Two batches are built per district:
 *   - a static batch, written once at build time and never touched again;
 *   - an animated batch, whose matrices are rewritten each frame from a
 *     per-instance phase (the floating cubes, flags, water).
 *
 * The batch owns only its instance buffers. Geometry and material belong to
 * resources.js and must never be disposed here (see ARCHITECTURE gotcha 1).
 */

import * as THREE from 'three';
import { boxGeometry, litMaterial } from './resources.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _colour = new THREE.Color();
const _axisY = new THREE.Vector3(0, 1, 0);

/**
 * @param {{ animated?: boolean }} [options]
 * @returns a batch with `cube`, `brush`, `count` and `build`
 */
export function createVoxelBatch({ animated = false } = {}) {
  /** @type {Array<object>} */
  const items = [];

  /** Add one cube in WORLD space. `anim` is ignored by a static batch. */
  function cube(x, y, z, w, h, d, colour, rotY = 0, anim = null) {
    items.push({ x, y, z, w, h, d, colour, rotY, anim });
  }

  /**
   * A brush bound to a placement: props are authored in a local frame
   * (+x across, +y up, +z along the prop's forward) and the brush maps that
   * into world space, so every prop function below is written as if it stood
   * at the origin facing +z.
   *
   * @param {THREE.Vector3} origin
   * @param {number} rotY   the prop's heading, radians
   * @param {number} scale  uniform size multiplier
   */
  function brush(origin, rotY = 0, scale = 1) {
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    return function paint(lx, ly, lz, w, h, d, colour, localRotY = 0, anim = null) {
      const x = lx * scale;
      const y = ly * scale;
      const z = lz * scale;
      cube(
        origin.x + x * cos + z * sin,
        origin.y + y,
        origin.z - x * sin + z * cos,
        w * scale,
        h * scale,
        d * scale,
        colour,
        rotY + localRotY,
        anim
      );
    };
  }

  function build() {
    if (items.length === 0) return null;

    const mesh = new THREE.InstancedMesh(boxGeometry(), litMaterial(), items.length);
    mesh.instanceMatrix.setUsage(
      animated ? THREE.DynamicDrawUsage : THREE.StaticDrawUsage
    );
    // A district spans a long stretch of route; its batch bounding sphere is
    // huge and misjudges culling, exactly as it does for voxel headings.
    mesh.frustumCulled = false;

    items.forEach((it, i) => {
      _pos.set(it.x, it.y, it.z);
      _q.setFromAxisAngle(_axisY, it.rotY);
      _scale.set(it.w, it.h, it.d);
      _m.compose(_pos, _q, _scale);
      mesh.setMatrixAt(i, _m);
      _colour.setHex(it.colour);
      mesh.setColorAt(i, _colour);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;

    if (animated) {
      let t = 0;
      mesh.update = (dt) => {
        t += dt;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const a = it.anim;
          if (!a) continue;
          const phase = t * (a.speed ?? 1) + (a.phase ?? 0);
          _pos.set(
            it.x + Math.sin(phase * 0.7) * (a.sway ?? 0),
            it.y + Math.sin(phase) * (a.bob ?? 0),
            it.z + Math.cos(phase * 0.6) * (a.sway ?? 0)
          );
          _q.setFromAxisAngle(_axisY, it.rotY + phase * (a.spin ?? 0));
          _scale.set(it.w, it.h, it.d);
          _m.compose(_pos, _q, _scale);
          mesh.setMatrixAt(i, _m);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };
    }

    // Shared geometry and material are NOT ours to dispose.
    mesh.userData.dispose = () => mesh.dispose();
    return mesh;
  }

  return {
    cube,
    brush,
    build,
    get count() {
      return items.length;
    },
  };
}

/**
 * A small deterministic PRNG (mulberry32).
 *
 * District props are scattered randomly but must land in exactly the same
 * place every time a chunk is rebuilt, or scrubbing back up the page would
 * re-deal the scenery. Seeding per district gives variety between districts
 * and stability within one.
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
