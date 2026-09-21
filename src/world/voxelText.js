/**
 * voxelText.js — headings built from cubes standing on the ground plane.
 *
 * The string is rasterised to a pixel grid (see pixels.js), then every filled
 * pixel becomes one instance of a single InstancedMesh. One heading = one
 * draw call however many cubes it contains.
 *
 * Most cubes are grey; roughly voxelText.ACCENT_RATIO of them carry an accent
 * colour, and which ones are accented is redealt on a timer so the heading
 * shimmers slowly.
 */

import * as THREE from 'three';
import { palette, voxelText as cfg } from '../config.js';
import { boxGeometry, litMaterial } from './resources.js';
import { textToPixels } from './pixels.js';

const _matrix = new THREE.Matrix4();
const _colour = new THREE.Color();
const _grey = new THREE.Color(palette.voxelGrey);

/**
 * @param {string|string[]} text
 * @param {object} placement
 * @param {THREE.Vector3} placement.position
 * @param {number} placement.rotationY
 * @param {'flat'|'upright'} placement.orientation
 *        'flat' lays the heading on the ground plane (body headings);
 *        'upright' stands it up as a wall (the opening monument, which the
 *        Enter transition flies between).
 * @returns {THREE.InstancedMesh & { update(dt:number):void }}
 */
export function createVoxelText(text, { position, rotationY = 0, orientation = 'flat' }) {
  const { width, height, coords } = textToPixels(text);

  if (coords.length === 0) return null;

  const mesh = new THREE.InstancedMesh(boxGeometry(), litMaterial(), coords.length);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.frustumCulled = false; // the bounding sphere of a flat slab misjudges this

  /* Auto-fit: a long heading shrinks its cubes rather than running off the
   * side of the frame, so any string from content.js stays inside the shot. */
  let step = cfg.CUBE_SIZE * (1 + cfg.CUBE_GAP);
  let cube = cfg.CUBE_SIZE;
  let cubeHeight = cfg.CUBE_HEIGHT;
  const naturalWidth = width * step;
  if (naturalWidth > cfg.MAX_WORLD_WIDTH) {
    const k = cfg.MAX_WORLD_WIDTH / naturalWidth;
    step *= k;
    cube *= k;
    cubeHeight *= k;
  }

  const halfW = (width - 1) / 2;
  const halfH = (height - 1) / 2;

  const upright = orientation === 'upright';

  coords.forEach((c, i) => {
    if (upright) {
      // Stand the grid up: canvas y becomes world height, and the slab is
      // one cube deep so the camera can pass between the blocks.
      _matrix.makeScale(cube, cube, cubeHeight);
      _matrix.setPosition((c.x - halfW) * step, (height - c.y - 0.5) * step, 0);
    } else {
      _matrix.makeScale(cube, cubeHeight, cube);
      _matrix.setPosition((c.x - halfW) * step, cubeHeight / 2, (c.y - halfH) * step);
    }
    mesh.setMatrixAt(i, _matrix);
    mesh.setColorAt(i, _grey);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;

  mesh.position.copy(position);
  mesh.rotation.y = rotationY;

  /* ---- accent shuffle ---------------------------------------------- */
  const accentCount = Math.max(1, Math.round(coords.length * cfg.ACCENT_RATIO));
  let accented = [];

  function reshuffle() {
    // Reset the previous pick rather than the whole buffer: O(accentCount).
    for (const i of accented) mesh.setColorAt(i, _grey);
    accented = [];
    for (let k = 0; k < accentCount; k++) {
      const i = (Math.random() * coords.length) | 0;
      _colour.setHex(palette.accents[(Math.random() * palette.accents.length) | 0]);
      mesh.setColorAt(i, _colour);
      accented.push(i);
    }
    mesh.instanceColor.needsUpdate = true;
  }

  reshuffle();

  let elapsed = 0;
  mesh.update = (dt) => {
    elapsed += dt * 1000;
    if (elapsed >= cfg.RESHUFFLE_MS) {
      elapsed = 0;
      reshuffle();
    }
  };

  // Geometry and material are shared — only the instance buffers are ours.
  mesh.userData.dispose = () => mesh.dispose();

  return mesh;
}
