/**
 * beam.js — the long, low grey beam that runs alongside the route.
 *
 * Read it as a road or rail. It is built as one continuous ribbon that
 * follows the camera path exactly, so it stays parallel however the route
 * bends, and it costs a single draw call for the whole world.
 *
 * The raised ends that carry the section labels are built per chunk
 * (see districts.js), because they arrive and leave with their district.
 */

import * as THREE from 'three';
import { palette, world as cfg } from '../config.js';
import { frameAt, offsetFromPath, headingAt, textHeadingAt } from './path.js';
import { boxGeometry, litMaterial } from './resources.js';

/** The continuous ribbon. One mesh, one draw call, permanent. */
export function createBeam() {
  const n = cfg.BEAM_SAMPLES;
  const halfW = cfg.BEAM_WIDTH / 2;
  const h = cfg.BEAM_HEIGHT;

  const positions = [];
  const normals = [];

  const rail = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const { position, right } = frameAt(u);
    const centre = position.clone().addScaledVector(right, cfg.BEAM_SIDE);
    rail.push({
      l: centre.clone().addScaledVector(right, -halfW),
      r: centre.clone().addScaledVector(right, halfW),
      right: right.clone(),
    });
  }

  const pushTri = (a, b, c, nx, ny, nz) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    for (let k = 0; k < 3; k++) normals.push(nx, ny, nz);
  };

  const v = (p, y) => new THREE.Vector3(p.x, y, p.z);

  for (let i = 0; i < n; i++) {
    const a = rail[i];
    const b = rail[i + 1];

    // top face
    pushTri(v(a.l, h), v(a.r, h), v(b.r, h), 0, 1, 0);
    pushTri(v(a.l, h), v(b.r, h), v(b.l, h), 0, 1, 0);

    // outer side (along -right)
    const o = a.right;
    pushTri(v(a.l, 0), v(b.l, 0), v(b.l, h), -o.x, 0, -o.z);
    pushTri(v(a.l, 0), v(b.l, h), v(a.l, h), -o.x, 0, -o.z);

    // inner side (along +right)
    pushTri(v(a.r, h), v(b.r, h), v(b.r, 0), o.x, 0, o.z);
    pushTri(v(a.r, h), v(b.r, 0), v(a.r, 0), o.x, 0, o.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  const material = new THREE.MeshLambertMaterial({
    color: palette.beam,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'beam';
  mesh.userData.dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return mesh;
}

/**
 * The raised block at a section entrance. Its top face is where the
 * `01 PROFILE` label is printed (the label plane is added by districts.js).
 *
 * @param {number} u normalised path position of the section anchor
 */
export function createRiser(u) {
  const mesh = new THREE.Mesh(boxGeometry(), litMaterial().clone());
  mesh.material.color.setHex(palette.beamTop);

  mesh.scale.set(cfg.RISER_WIDTH, cfg.RISER_HEIGHT, cfg.RISER_LENGTH);
  mesh.position.copy(offsetFromPath(u, cfg.BEAM_SIDE, 0, cfg.RISER_HEIGHT / 2));
  mesh.rotation.y = headingAt(u);

  mesh.userData.dispose = () => mesh.material.dispose();
  return mesh;
}

/** Where a label plane should sit: on the riser's top face. */
export function riserLabelTransform(u) {
  return {
    position: offsetFromPath(u, cfg.BEAM_SIDE, 0, cfg.RISER_HEIGHT + 0.02),
    rotationY: textHeadingAt(u),
    width: cfg.RISER_LENGTH * 0.86,
    height: cfg.RISER_WIDTH * 0.7,
  };
}
