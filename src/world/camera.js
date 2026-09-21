/**
 * camera.js — the camera rig.
 *
 * ------------------------------------------------------------------
 * TUNING CONSTANTS — re-exported from config.js so the angle of the
 * whole diorama is controlled from one obvious place.
 * ------------------------------------------------------------------
 *   FOV        narrow (25-35) reads isometric but keeps a little depth
 *   PITCH_DEG  downward tilt of the camera
 *   YAW_DEG    rotation about the vertical axis
 *   DISTANCE   how far back the camera sits along that pitch/yaw
 *   LOOK_AHEAD how far ahead on the curve the camera looks
 *   ROLL_DEG   peak roll, oscillated across the journey
 *
 * The camera does NOT sit on the path. Its position is the path point plus
 * a WORLD-FIXED spherical offset. That is what makes the world slide past at
 * a constant isometric angle instead of the camera swinging round every bend,
 * and it means the constants above mean what they say whatever the path does.
 */

import * as THREE from 'three';
import { camera as cfg } from '../config.js';
import { pointAt } from './path.js';

export const FOV = cfg.FOV;
export const PITCH_DEG = cfg.PITCH_DEG;
export const YAW_DEG = cfg.YAW_DEG;
export const DISTANCE = cfg.DISTANCE;
export const LOOK_AHEAD = cfg.LOOK_AHEAD;
export const ROLL_DEG = cfg.ROLL_DEG;

const DEG = Math.PI / 180;

/**
 * World-fixed offset from a path point to the camera.
 *
 * The route runs broadly along +X, so the camera sits BEHIND it (-X) and to
 * the +Z side, above, looking forward down the route. PITCH raises it;
 * YAW swings it around the vertical. Both positive values read as you'd
 * expect, which is why the X term is negated here.
 */
function rigOffset(distance = cfg.DISTANCE, target = new THREE.Vector3()) {
  const pitch = cfg.PITCH_DEG * DEG;
  const yaw = cfg.YAW_DEG * DEG;
  const horizontal = Math.cos(pitch) * distance;
  return target.set(
    -Math.sin(yaw) * horizontal,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * horizontal
  );
}

export function createCamera(aspect) {
  const cam = new THREE.PerspectiveCamera(cfg.FOV, aspect, cfg.NEAR, cfg.FAR);
  cam.position.copy(rigOffset());
  return cam;
}

const _anchor = new THREE.Vector3();
const _look = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3();

/**
 * Drive the camera from normalised progress.
 * Pure function of `progress` — nothing accumulates, so scrubbing backwards
 * lands on exactly the same transform as scrubbing forwards. That is what
 * keeps the scroll from drifting.
 *
 * @param {THREE.PerspectiveCamera} cam
 * @param {number} progress 0 → 1 along the path
 * @param {number} distanceScale 1 = normal; <1 pulls in for the intro flight
 */
export function applyProgress(cam, progress, distanceScale = 1) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);

  pointAt(p, _anchor);
  rigOffset(cfg.DISTANCE * distanceScale, _offset);
  cam.position.copy(_anchor).add(_offset);

  pointAt(Math.min(p + cfg.LOOK_AHEAD, 1), _look);
  _look.y += cfg.LOOK_HEIGHT;

  // Roll: tilt `up` around the view direction. Oscillated so the journey
  // breathes slightly rather than sitting rigid.
  const roll = Math.sin(p * Math.PI * 2 * cfg.ROLL_CYCLES) * cfg.ROLL_DEG * DEG;
  _dir.subVectors(_look, cam.position).normalize();
  _up.set(0, 1, 0).applyAxisAngle(_dir, roll);
  cam.up.copy(_up);

  cam.lookAt(_look);
}

/**
 * The intro fly-through.
 *
 * The camera does not simply dolly back. It starts behind the monument at
 * close range, flies INTO the wall of blocks, passes BETWEEN them — the slab
 * is deliberately one cube deep, see voxelText.js — comes out the front, and
 * only then swings back and up to the resting rig position for progress 0.
 *
 * The route is a Catmull-Rom curve through five points expressed in the
 * monument's own frame, so it stays correct if the monument moves, the path
 * changes or YAW_DEG is flipped. The last point IS the resting rig position,
 * and at k = 1 the driver hands over to applyProgress exactly, so there is
 * no seam between the transition and the first scroll frame.
 *
 * @param {THREE.PerspectiveCamera} cam
 * @param {{centre:THREE.Vector3, width:number, height:number, rotationY:number}|null} monument
 * @returns {(k:number)=>void} takes 0 → 1
 */
export function makeIntroDriver(cam, monument = null) {
  /* Where the camera ends up: the ordinary rig at progress 0. */
  const rest = pointAt(0, new THREE.Vector3()).add(rigOffset(cfg.DISTANCE, new THREE.Vector3()));
  const restLook = pointAt(Math.min(cfg.LOOK_AHEAD, 1), new THREE.Vector3());
  restLook.y += cfg.LOOK_HEIGHT;

  if (!monument) {
    // Nothing to fly through — fall back to a straight pull-back.
    return (k) => {
      const e = smootherstep(k);
      cam.fov = THREE.MathUtils.lerp(cfg.INTRO_START_FOV, cfg.FOV, easeOut(k));
      cam.updateProjectionMatrix();
      applyProgress(cam, 0, THREE.MathUtils.lerp(cfg.INTRO_START_DISTANCE / cfg.DISTANCE, 1, e));
    };
  }

  const { centre, height, width, rotationY } = monument;
  // The monument's own axes: +n is the face it presents to the camera,
  // +x runs along its reading direction.
  const n = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const x = new THREE.Vector3(Math.cos(rotationY), 0, -Math.sin(rotationY));

  const at = (alongN, alongX, y) =>
    centre
      .clone()
      .addScaledVector(n, alongN)
      .addScaledVector(x, alongX)
      .setY(y);

  const gap = Math.max(2, width * 0.12);
  const route = new THREE.CatmullRomCurve3(
    [
      at(-cfg.INTRO_START_DISTANCE * 1.6, -gap, height * 0.55), // behind, close in
      at(-cfg.INTRO_START_DISTANCE * 0.4, gap * 0.6, height * 0.46), // entering
      at(1.2, -gap * 0.5, height * 0.5), // between the blocks
      at(cfg.INTRO_START_DISTANCE * 2.4, gap * 1.2, height * 0.8), // out the front
      rest, // the resting rig
    ],
    false,
    'centripetal',
    0.5
  );

  const _pos = new THREE.Vector3();
  const _target = new THREE.Vector3();
  const _ahead = new THREE.Vector3();

  return (k) => {
    if (k >= 1) {
      cam.fov = cfg.FOV;
      cam.updateProjectionMatrix();
      applyProgress(cam, 0);
      return;
    }

    const e = smootherstep(THREE.MathUtils.clamp(k, 0, 1));
    route.getPointAt(e, _pos);
    cam.position.copy(_pos);

    /* Early on, look where you are going; later, blend to the shot the
     * scroll driver will take over with, so the handover is invisible. */
    route.getPointAt(Math.min(e + 0.08, 1), _ahead);
    const settle = smootherstep(THREE.MathUtils.clamp((k - 0.4) / 0.6, 0, 1));
    _target.lerpVectors(_ahead, restLook, settle);

    cam.up.set(0, 1, 0);
    cam.fov = THREE.MathUtils.lerp(cfg.INTRO_START_FOV, cfg.FOV, easeOut(k));
    cam.updateProjectionMatrix();
    cam.lookAt(_target);
  };
}

/* Easing. Kept here rather than pulled from GSAP so the camera module has
 * no dependency on the animation library that happens to drive it. */
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOut = (t) => 1 - (1 - t) ** 3;

export function resize(cam, aspect) {
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
}
