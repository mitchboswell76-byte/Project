/**
 * path.js — the single curve the whole journey is built around.
 *
 * Scroll progress 0 → 1 maps to distance along this curve. Section anchors,
 * the beam, the chunks and the camera all read from it, so the world can be
 * relaid out entirely by editing world.PATH_POINTS in config.js.
 *
 * The curve is CLOSED. Progress 1 is progress 0 — the same point, with the
 * same tangent — so the journey has no end to fall off. Everything here
 * therefore WRAPS progress rather than clamping it: `wrap(1.02)` is 0.02, and
 * a section at 0.97 whose copy runs 0.12 further simply continues past the
 * join. Clamping instead would pile the whole tail of the world onto one
 * point, which is what the old open curve did at its ends.
 */

import * as THREE from 'three';
import { camera as cameraCfg, world as cfg } from '../config.js';

const points = cfg.PATH_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/* centripetal Catmull-Rom avoids the cusps and overshoot that 'chordal' and
 * uniform produce on unevenly spaced control points. `true` closes the loop:
 * three.js joins the last control point back to the first and keeps the
 * tangent continuous across the join, so there is no kink to hide. */
export const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);

/** Fold any progress value onto the loop. Pure, and total: wrap(-0.1) = 0.9. */
export const wrap = (u) => {
  const t = u % 1;
  return t < 0 ? t + 1 : t;
};

/**
 * Distance between two progress values measured THE SHORT WAY ROUND, which
 * on a loop is the only meaningful distance: 0.98 and 0.02 are 0.04 apart,
 * not 0.96. Chunk streaming depends on this being circular, or districts
 * either side of the join would never load.
 */
export const loopDistance = (a, b) => {
  const d = Math.abs(wrap(a) - wrap(b));
  return Math.min(d, 1 - d);
};

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

export function pointAt(u, target = new THREE.Vector3()) {
  return curve.getPointAt(wrap(u), target);
}

export function tangentAt(u, target = new THREE.Vector3()) {
  return curve.getTangentAt(wrap(u), target).normalize();
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
    // On the loop the camera turns with the road, so this has to track it —
    // a constant here would leave the copy skewed on every corner.
    return -cameraYawAt(u);
  }
  return headingAt(u) - Math.PI / 2;
}

/**
 * The camera's yaw at a point on the route, in radians.
 *
 * This is the ONE definition of how the rig is oriented, shared by the camera
 * itself and by anything that has to line up with the screen. With
 * FOLLOW_PATH_HEADING the rig holds a constant angle to the ROAD rather than
 * to the world axes, which is what lets a closed loop work at all: a
 * world-fixed rig ends up in front of the camera's own direction of travel on
 * the far side of the circuit, and the shot flips.
 */
export function cameraYawAt(u) {
  const base = (cameraCfg.YAW_DEG * Math.PI) / 180;
  if (!cameraCfg.FOLLOW_PATH_HEADING) return base;
  // Relative to the reference heading the angle was tuned against (+X), so
  // a straight running along +X composes exactly as it always did.
  return base - (headingAt(u) - Math.PI / 2);
}

export const totalLength = curve.getLength();
