/**
 * resources.js — one registry that owns every shared geometry and material.
 *
 * Chunks must NOT dispose these. A chunk that disposed a shared BoxGeometry
 * would silently break every other chunk using it — that is the classic
 * chunk-streaming bug. Chunks own only their InstancedMesh wrappers and
 * their own canvas textures; those they do dispose. Everything here is
 * disposed once, at full teardown.
 */

import * as THREE from 'three';

const geometries = new Map();
const materials = new Map();
const textures = new Set();

/** The unit cube every voxel prop is built from. */
export function boxGeometry() {
  if (!geometries.has('box')) geometries.set('box', new THREE.BoxGeometry(1, 1, 1));
  return geometries.get('box');
}

export function planeGeometry() {
  if (!geometries.has('plane')) geometries.set('plane', new THREE.PlaneGeometry(1, 1));
  return geometries.get('plane');
}

/**
 * The white lit material used by every instanced prop. Per-instance colour
 * comes from InstancedMesh.setColorAt, which multiplies against this, so one
 * material serves the entire palette.
 */
export function litMaterial() {
  if (!materials.has('lit')) {
    materials.set(
      'lit',
      new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: false })
    );
  }
  return materials.get('lit');
}

/** Unlit flat material, for things that should not respond to the lights. */
export function flatMaterial() {
  if (!materials.has('flat')) {
    materials.set('flat', new THREE.MeshBasicMaterial({ color: 0xffffff }));
  }
  return materials.get('flat');
}

/** Register a per-chunk texture so teardown can catch anything left behind. */
export function trackTexture(tex) {
  textures.add(tex);
  return tex;
}

export function releaseTexture(tex) {
  if (!tex) return;
  textures.delete(tex);
  tex.dispose();
}

/** Full teardown. Only called when the whole 3D mode is destroyed. */
export function disposeAll() {
  for (const g of geometries.values()) g.dispose();
  for (const m of materials.values()) m.dispose();
  for (const t of textures) t.dispose();
  geometries.clear();
  materials.clear();
  textures.clear();
}

export function stats() {
  return { geometries: geometries.size, materials: materials.size, textures: textures.size };
}
