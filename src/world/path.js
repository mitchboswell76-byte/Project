/**
 * path.js — the single curve the whole journey is built around.
 *
 * Scroll progress 0 → 1 maps to distance along this curve. Section anchors,
 * the beam, the chunks and the camera all read from it, so the world can be
 * relaid out entirely by editing world.PATH_POINTS in config.js.
 *
 * The curve is OPEN and runs broadly one way, like a long page rather than a
 * track: the world always flows the same direction down the screen. Progress
 * still WRAPS rather than clamping — `wrap(1.02)` is 0.02 — so scrolling past
 * the end returns you to the beginning instead of piling the tail of the
 * world onto one point. That return is a cut, not a seam: the two ends are
 * different places. Both are built dead straight on the same heading and kept
 * clear of landmarks so the shot does not change shape across it.
 */

import * as THREE from 'three';
import { camera as cameraCfg, world as cfg } from '../config.js';

const points = cfg.PATH_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z));

/* centripetal Catmull-Rom avoids the cusps and overshoot that 'chordal' and
 * uniform produce on unevenly spaced control points. NOT closed: closing it
 * would run a straight return leg back across the whole world, which doubles
 * the length and puts a 2,700-unit empty dash in the middle of the journey. */
export const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);

/**
 * Fold any progress value onto the route. Pure, and total: wrap(-0.1) = 0.9.
 *
 * NOTE that wrap(1) is 0. That is right for PROGRESS — scrolling past the end
 * returns you to the start — but it means `pointAt(1)` gives you the first
 * point of the curve, not the last. Anything that wants the route's actual
 * end has to ask for it by name: see `routeEnd` below.
 */
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

/**
 * The very last point of the route, and the direction it is heading there.
 *
 * Computed once, directly off the curve, because `pointAt(1)` wraps to the
 * beginning. The camera needs these to keep looking FORWARD as it runs off
 * the end of the route rather than swinging round to stare back at the start,
 * which is what it did until this existed.
 */
export const routeEnd = curve.getPointAt(1, new THREE.Vector3());
export const routeEndTangent = curve.getTangentAt(1, new THREE.Vector3()).normalize();
