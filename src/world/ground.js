/**
 * ground.js — the black floor and its faint dot grid.
 *
 * One draw call: the dot tile is baked onto an opaque background colour so
 * the plane needs no transparency and no second pass.
 */

import * as THREE from 'three';
import { hex, palette, world as cfg } from '../config.js';
import { makeDotTile } from '../ui/dotGrid.js';
import { trackTexture } from './resources.js';

export function createGround() {
  // One tile covers GRID_SPACING world units, so the dot's pixel size is
  // just its world size expressed as a fraction of the tile.
  const dotPx = Math.max(1, Math.round(cfg.GRID_TILE_PX * (cfg.GRID_DOT_WORLD / cfg.GRID_SPACING)));
  const tile = makeDotTile(cfg.GRID_TILE_PX, dotPx, hex(palette.grid), hex(palette.ground));

  const texture = trackTexture(new THREE.CanvasTexture(tile));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Without anisotropy the grid smears to flat grey a few metres out.
  texture.anisotropy = 16;

  const repeats = cfg.GROUND_SIZE / cfg.GRID_SPACING;
  texture.repeat.set(repeats, repeats);

  const geometry = new THREE.PlaneGeometry(cfg.GROUND_SIZE, cfg.GROUND_SIZE);
  const material = new THREE.MeshBasicMaterial({ map: texture });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02; // sit just below props so nothing z-fights
  mesh.name = 'ground';
  mesh.renderOrder = -1;

  // The ground is permanent, so it owns its geometry/material directly.
  mesh.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };

  return mesh;
}
