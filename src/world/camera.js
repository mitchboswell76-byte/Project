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
 * The intro fly-through: starts inside the monument with a wide FOV and
 * pulls back to the resting rig. Returns a function taking 0 → 1.
 */
export function makeIntroDriver(cam) {
  return (k) => {
    const distanceScale = THREE.MathUtils.lerp(
      cfg.INTRO_START_DISTANCE / cfg.DISTANCE,
      1,
      k
    );
    cam.fov = THREE.MathUtils.lerp(cfg.INTRO_START_FOV, cfg.FOV, k);
    cam.updateProjectionMatrix();
    applyProgress(cam, 0, distanceScale);
  };
}

export function resize(cam, aspect) {
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
}
