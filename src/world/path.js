/**
 * path.js — the single curve the whole journey is built around.
 *
 * Scroll progress 0 → 1 maps to distance along this curve. Section anchors,
 * the beam, the chunks and the camera all read from it, so the world can be
 * relaid out entirely by editing world.PATH_POINTS in config.js.
 */

import * as THREE from 'three';
import { camera as cameraCfg, world as cfg } from '../config.js';

const points = cfg.PATH_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/* centripetal Catmull-Rom avoids the cusps and overshoot that 'chordal' and
 * uniform produce on unevenly spaced control points. */
export const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

export function pointAt(u, target = new THREE.Vector3()) {
  return curve.getPointAt(THREE.MathUtils.clamp(u, 0, 1), target);
}

export function tangentAt(u, target = new THREE.Vector3()) {
  return curve.getTangentAt(THREE.MathUtils.clamp(u, 0, 1), target).normalize();
}

/**
 * A local frame at u: position, forward (along the path) and right (lateral,
 * on the ground plane). Used to place the beam, labels and district props
 * relative to the route rather than to world axes.
 */
export function frameAt(u) {
  const position = pointAt(u, _p.clone());
  const forward = tangentAt(u, _t.clone());
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  return { position, forward, right };
}

/** Place a point relative to the route: `ahead` along it, `side` across it. */
export function offsetFromPath(u, side = 0, ahead = 0, height = 0) {
  const { position, forward, right } = frameAt(u);
  return position
    .clone()
    .addScaledVector(right, side)
    .addScaledVector(forward, ahead)
    .setY(position.y + height);
}

/** Heading in radians so a PROP can be rotated to face along the path. */
export function headingAt(u) {
  const t = tangentAt(u, _t.clone());
  return Math.atan2(t.x, t.z);
}

/**
 * Heading for a flat TEXT plane, which is a different thing from a prop's.
 *
 * A PlaneGeometry laid flat has its reading direction along local +X, and a
 * prop's forward is local +Z, so the two conventions are a quarter turn
 * apart. Rotating ground text by headingAt() directly renders it mirrored —
 * hence this helper rather than a stray `- Math.PI / 2` at each call site.
 */
export function textHeadingAt(u) {
  if (cfg.GROUND_TEXT_ALIGN === 'screen') {
    // Align to the camera's yaw instead, so text always reads horizontally.
    return -cameraYawRadians();
  }
  return headingAt(u) - Math.PI / 2;
}

function cameraYawRadians() {
  return (cameraCfg.YAW_DEG * Math.PI) / 180;
}

export const totalLength = curve.getLength();
