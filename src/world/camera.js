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
import { cameraYawAt, pointAt, wrap } from './path.js';

export const FOV = cfg.FOV;
export const PITCH_DEG = cfg.PITCH_DEG;
export const YAW_DEG = cfg.YAW_DEG;
export const DISTANCE = cfg.DISTANCE;
export const LOOK_AHEAD = cfg.LOOK_AHEAD;
export const ROLL_DEG = cfg.ROLL_DEG;

const DEG = Math.PI / 180;

/**
 * Offset from a path point to the camera.
 *
 * The camera sits BEHIND the direction of travel and to one side, above,
 * looking forward down the route. PITCH raises it; YAW swings it around the
 * vertical. Both positive values read as you'd expect, which is why the X
 * term is negated here.
 *
 * `yaw` comes from cameraYawAt(), so on the closed circuit the whole rig
 * turns with the road and the composition holds all the way round. Pass the
 * yaw in rather than reading it here: the intro driver needs the same offset
 * for a specific point on the route.
 */
function rigOffset(distance = cfg.DISTANCE, target = new THREE.Vector3(), yaw = cfg.YAW_DEG * DEG) {
  const pitch = cfg.PITCH_DEG * DEG;
  const horizontal = Math.cos(pitch) * distance;
  return target.set(
    -Math.sin(yaw) * horizontal,
    Math.sin(pitch) * distance,
    Math.cos(yaw) * horizontal
  );
}

export function createCamera(aspect) {
  const cam = new THREE.PerspectiveCamera(cfg.FOV, aspect, cfg.NEAR, cfg.FAR);
  cam.position.copy(rigOffset(cfg.DISTANCE, new THREE.Vector3(), cameraYawAt(0)));
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
  // WRAPPED, not clamped: the route is a loop, so progress 1.02 is 0.02 and
  // scrolling past the end simply continues. Still a pure function of
  // progress — wrapping accumulates nothing — so scrubbing back up the page
  // reproduces every transform exactly.
  const p = wrap(progress);

  pointAt(p, _anchor);
  rigOffset(cfg.DISTANCE * distanceScale, _offset, cameraYawAt(p));
  cam.position.copy(_anchor).add(_offset);

  pointAt(p + cfg.LOOK_AHEAD, _look);
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
 * It opens HEAD-ON: the camera sits square on the monument's own normal axis,
 * far enough back that the whole wordmark is inside the frame and at the
 * resting field of view, so the name reads flat and undistorted the moment
 * the world appears. It then pushes in, passes BETWEEN the blocks — the slab
 * is deliberately one cube deep, see voxelText.js — comes out the back, and
 * arcs round to the resting rig position for progress 0.
 *
 * The route is a Catmull-Rom curve through points expressed in the monument's
 * own frame, so it stays correct if the monument moves, the path changes or
 * YAW_DEG is flipped. The last point IS the resting rig position, and at
 * k = 1 the driver hands over to applyProgress exactly, so there is no seam
 * between the transition and the first scroll frame.
 *
 * @param {THREE.PerspectiveCamera} cam
 * @param {{centre:THREE.Vector3, width:number, height:number, rotationY:number}|null} monument
 * @returns {(k:number)=>void} takes 0 → 1
 */
export function makeIntroDriver(cam, monument = null) {
  /* Where the camera ends up: the ordinary rig at progress 0. */
  const rest = pointAt(0, new THREE.Vector3()).add(
    rigOffset(cfg.DISTANCE, new THREE.Vector3(), cameraYawAt(0))
  );
  const restLook = pointAt(cfg.LOOK_AHEAD, new THREE.Vector3());
  restLook.y += cfg.LOOK_HEIGHT;

  if (!monument) {
    // Nothing to fly through — fall back to a straight pull-back.
    return (k) => {
      const e = smootherstep(k);
      cam.fov = THREE.MathUtils.lerp(cfg.INTRO_PEAK_FOV, cfg.FOV, easeOut(k));
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

  /**
   * How far back the camera has to sit, on the normal axis, for the whole
   * wordmark to fit in shot at the resting FOV. Derived from the monument's
   * measured size rather than guessed, so a longer name pulls the opening
   * shot back on its own instead of running off the edges.
   */
  function headOnDistance() {
    const vFov = cfg.FOV * DEG;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (cam.aspect || 16 / 9));
    return (
      Math.max(width / 2 / Math.tan(hFov / 2), height / 2 / Math.tan(vFov / 2)) *
      cfg.INTRO_FRAMING
    );
  }

  const D = headOnDistance();
  const cy = centre.y; // the middle of the wall, vertically
  const gap = Math.max(2, width * 0.12);

  const route = new THREE.CatmullRomCurve3(
    [
      at(D, 0, cy), // 0 — head-on, square, whole name in frame
      at(D * 0.44, 0, cy), // 1 — push straight in, still square on
      at(3.0, -gap * 0.5, cy), // 2 — right up at the face, drifting to a gap
      at(-3.0, gap * 0.6, cy * 1.12), // 3 — through, between the blocks
      at(-D * 0.5, gap * 1.8, height * 0.95), // 4 — out the back, rising
      rest, // 5 — the resting rig
    ],
    false,
    'centripetal',
    0.5
  );

  const _pos = new THREE.Vector3();
  const _target = new THREE.Vector3();
  const _ahead = new THREE.Vector3();

  /**
   * Where a control point falls along the curve in ARC LENGTH, which is what
   * getPointAt takes. These cannot be assumed evenly spaced: the final swing
   * out to the resting rig is far longer than the approach, so splitting the
   * curve evenly would blow through the head-on shot in a few frames. Found
   * by dense sampling rather than assumed.
   */
  function arcLengthOf(point) {
    const SAMPLES = 400;
    let best = 0;
    let bestD = Infinity;
    const probe = new THREE.Vector3();
    for (let i = 0; i <= SAMPLES; i++) {
      const u = i / SAMPLES;
      const d = route.getPointAt(u, probe).distanceToSquared(point);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  /* The three beats, in arc length: head-on approach, the pass between the
   * blocks, then the settle out to the resting rig. */
  const E_PUSHED_IN = arcLengthOf(route.points[1]);
  const E_THROUGH = arcLengthOf(route.points[3]);

  /* ...and the share of the transition's CLOCK each beat gets. The opening
   * beat is deliberately long and covers little ground: that is the hold on
   * the name. */
  const HOLD_K = 0.34;
  const PASS_K = 0.68;

  return (k) => {
    if (k >= 1) {
      cam.fov = cfg.FOV;
      cam.updateProjectionMatrix();
      applyProgress(cam, 0);
      return;
    }

    const t = THREE.MathUtils.clamp(k, 0, 1);

    /* Position along the curve, eased per beat rather than as one sweep. */
    let e;
    if (t < HOLD_K) {
      e = easeInOut(t / HOLD_K) * E_PUSHED_IN;
    } else if (t < PASS_K) {
      e =
        E_PUSHED_IN +
        smootherstep((t - HOLD_K) / (PASS_K - HOLD_K)) * (E_THROUGH - E_PUSHED_IN);
    } else {
      e = E_THROUGH + easeOut((t - PASS_K) / (1 - PASS_K)) * (1 - E_THROUGH);
    }

    route.getPointAt(THREE.MathUtils.clamp(e, 0, 1), _pos);
    cam.position.copy(_pos);

    /* Look at the name while it is the subject, then at where we are going,
     * then at the shot the scroll driver takes over with. */
    route.getPointAt(Math.min(e + 0.08, 1), _ahead);
    const toAhead = smootherstep(THREE.MathUtils.clamp((t - 0.3) / 0.25, 0, 1));
    const toRest = smootherstep(THREE.MathUtils.clamp((t - 0.58) / 0.42, 0, 1));
    _target.copy(centre).lerp(_ahead, toAhead).lerp(restLook, toRest);

    /* FOV widens only for the pass itself and comes back — so the opening
     * and closing shots are both at the honest resting field of view. */
    const flare = Math.sin(Math.PI * THREE.MathUtils.clamp((t - 0.18) / 0.62, 0, 1));
    cam.fov = cfg.FOV + (cfg.INTRO_PEAK_FOV - cfg.FOV) * flare;

    cam.up.set(0, 1, 0);
    cam.updateProjectionMatrix();
    cam.lookAt(_target);
  };
}

/* Easing. Kept here rather than pulled from GSAP so the camera module has
 * no dependency on the animation library that happens to drive it. */
const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function resize(cam, aspect) {
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
}
