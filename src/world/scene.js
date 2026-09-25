/**
 * scene.js — builds and runs the 3D world.
 *
 * Owns the renderer, the scene graph, the render loop and teardown. Reads
 * normalised scroll progress from a state object supplied by the caller, so
 * the world knows nothing about ScrollTrigger, 2D mode or the UI.
 *
 * Lighting is deliberately two lights only — one directional, one ambient —
 * with Lambert materials. The reference look is flat-shaded, not physically
 * lit, and PBR here would cost frames for nothing.
 */

import * as THREE from 'three';
import { camera as camCfg, palette, perf as perfCfg, world as cfg } from '../config.js';
import { content } from '../content.js';
import { applyProgress, createCamera, makeIntroDriver, resize as resizeCamera } from './camera.js';
import { createBeam } from './beam.js';
import { createChunkManager } from './chunks.js';
import { createGround } from './ground.js';
import { createVoxelText } from './voxelText.js';
import { cameraYawAt, offsetFromPath, pointAt } from './path.js';
import { setMaxAnisotropy } from './groundText.js';
import { disposeAll as disposeSharedResources } from './resources.js';
import { onResize } from '../util/dom.js';

const DEG = Math.PI / 180;

export function createWorld(canvas) {
  /* ---------------- renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  /* Resolution is adaptive: it starts at the cap and steps down once if the
   * opening seconds do not hold perf.MIN_FPS. See measurePerformance below. */
  let pixelRatioCap = perfCfg.MAX_PIXEL_RATIO;
  const applyPixelRatio = () =>
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatioCap));

  applyPixelRatio();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(palette.background, 1);
  setMaxAnisotropy(renderer);

  /* ---------------- scene ---------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.background);
  scene.fog = new THREE.Fog(palette.background, cfg.FOG_NEAR, cfg.FOG_FAR);

  const cam = createCamera(window.innerWidth / window.innerHeight);

  // Two lights, no more. The directional light gives cubes distinct faces;
  // the ambient stops the unlit sides going fully black.
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  // Roughly camera-side, so the faces you see are the lit ones.
  sun.position.set(-45, 75, -38);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  /* ---------------- permanent geometry ---------------- */
  const ground = createGround();
  scene.add(ground);

  const beam = createBeam();
  scene.add(beam);

  // The opening monument: the wordmark standing up as a voxel wall, facing
  // the camera. The Enter transition flies between these blocks.
  const monument = createVoxelText(content.meta.nameLines, {
    position: offsetFromPath(0, 0, 32, 0),
    // cameraYawAt, not the raw YAW_DEG: with FOLLOW_PATH_HEADING on, the
    // rig's yaw at progress 0 is the one the monument has to face.
    rotationY: -cameraYawAt(0),
    orientation: 'upright',
  });
  if (monument) {
    monument.name = 'monument';
    // Scale it up so the opening reads as a landmark rather than a sign.
    monument.scale.setScalar(1.2);
    scene.add(monument);
  }

  /* What the Enter transition needs to fly into and between the blocks:
   * where the wall is, how big it is and which way it faces. */
  const monumentInfo = monument
    ? {
        centre: monument.position
          .clone()
          .setY((monument.userData.size.height * monument.scale.y) / 2),
        width: monument.userData.size.width * monument.scale.x,
        height: monument.userData.size.height * monument.scale.y,
        rotationY: monument.rotation.y,
      }
    : null;

  const chunks = createChunkManager(scene, content.sections);

  /* ---------------- ground follow ---------------- */
  const _anchor = new THREE.Vector3();
  function followGround(progress) {
    pointAt(progress, _anchor);
    // Snap to the grid spacing so the dots stay perfectly still as the
    // plane slides along under the camera.
    ground.position.x = Math.round(_anchor.x / cfg.GRID_SPACING) * cfg.GRID_SPACING;
    ground.position.z = Math.round(_anchor.z / cfg.GRID_SPACING) * cfg.GRID_SPACING;
  }

  /* ---------------- loop ---------------- */
  const state = {
    progress: 0,
    intro: 1,
    running: false,
    /* Camera zoom, as an index into camera.ZOOM_STEPS. Held here rather than
     * in the camera module so it survives a resize and so applyProgress stays
     * a pure function of (progress, zoom). */
    zoom: camCfg.ZOOM_DEFAULT,
  };
  const zoomScale = () => camCfg.ZOOM_STEPS[state.zoom] ?? 1;
  const driveIntro = makeIntroDriver(cam, monumentInfo);
  let raf = 0;
  let last = performance.now();

  /* ---------------- adaptive resolution ---------------- */
  /* Measured over the first perf.SAMPLE_SECONDS of actual rendering, then
   * decided once and never revisited: a threshold that could trip in both
   * directions would sit on the boundary flipping resolution every few
   * seconds, which is far more noticeable than the lower resolution is. */
  let sampleFrames = 0;
  let sampleStart = 0;
  let sampleDone = false;

  function measurePerformance(now) {
    if (sampleDone) return;
    if (!sampleStart) {
      sampleStart = now;
      return;
    }
    sampleFrames++;
    const elapsed = (now - sampleStart) / 1000;
    if (elapsed < perfCfg.SAMPLE_SECONDS) return;

    sampleDone = true;
    const fps = sampleFrames / elapsed;
    if (fps < perfCfg.MIN_FPS && pixelRatioCap > perfCfg.LOW_PIXEL_RATIO) {
      pixelRatioCap = perfCfg.LOW_PIXEL_RATIO;
      applyPixelRatio();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  function frame(now) {
    if (!state.running) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    measurePerformance(now);

    if (state.intro < 1) {
      driveIntro(state.intro);
    } else {
      applyProgress(cam, state.progress, zoomScale());
    }

    followGround(state.intro < 1 ? 0 : state.progress);
    chunks.update(state.intro < 1 ? 0 : state.progress, dt);
    if (monument) monument.update(dt);

    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }

  const stopResize = onResize(() => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    applyPixelRatio();
    resizeCamera(cam, window.innerWidth / window.innerHeight);
  });

  /* ---------------- background tabs ---------------- */
  /* A hidden tab has nothing to draw. Browsers throttle requestAnimationFrame
   * when a tab is backgrounded, but not when the window is merely occluded by
   * another one, so this is not redundant — and stopping the loop is cheaper
   * than a throttled one. `pausedByVisibility` keeps this separate from stop()
   * called for 2D mode: coming back to a hidden tab that was in the reading
   * view must NOT start the world rendering behind the document. */
  let pausedByVisibility = false;

  function onVisibility() {
    if (document.hidden) {
      if (!state.running) return;
      pausedByVisibility = true;
      api.stop();
    } else if (pausedByVisibility) {
      pausedByVisibility = false;
      api.start();
    }
  }
  document.addEventListener('visibilitychange', onVisibility);

  const api = {
    scene,
    camera: cam,
    renderer,

    /** Build every chunk once so nothing pops in on first scroll. */
    warm() {
      chunks.mountAll();
      applyProgress(cam, 0, zoomScale());
      renderer.render(scene, cam);
    },

    start() {
      if (state.running) return;
      state.running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },

    stop() {
      state.running = false;
      cancelAnimationFrame(raf);
    },

    setProgress(p) {
      state.progress = THREE.MathUtils.clamp(p, 0, 1);
    },

    getProgress: () => state.progress,

    /**
     * Step the zoom. `direction` is +1 to pull back, -1 to move in.
     * Returns where the range now stands so the overlay can grey out a
     * button at either end.
     */
    stepZoom(direction) {
      const last = camCfg.ZOOM_STEPS.length - 1;
      state.zoom = Math.max(0, Math.min(last, state.zoom + direction));
      applyProgress(cam, state.progress, zoomScale());
      return { atMin: state.zoom === 0, atMax: state.zoom === last };
    },

    zoomState() {
      const last = camCfg.ZOOM_STEPS.length - 1;
      return { atMin: state.zoom === 0, atMax: state.zoom === last };
    },

    /**
     * 0 → 1 drives the Enter fly-through; 1 hands control back to scroll.
     *
     * Applies immediately rather than waiting for the next rendered frame, so
     * setting it and reading the camera in the same tick agrees with what the
     * next frame will draw.
     */
    setIntro(k) {
      state.intro = k;
      if (k < 1) {
        driveIntro(k);
        return;
      }
      cam.fov = camCfg.FOV;
      cam.updateProjectionMatrix();
      applyProgress(cam, state.progress, zoomScale());
    },

    /** Draw calls and triangles for the current frame — used in the perf pass. */
    stats() {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        chunks: chunks.liveCount,
      };
    },

    dispose() {
      this.stop();
      stopResize();
      document.removeEventListener('visibilitychange', onVisibility);
      chunks.disposeAll();
      if (monument) {
        scene.remove(monument);
        monument.userData.dispose?.();
      }
      scene.remove(ground, beam);
      ground.userData.dispose?.();
      beam.userData.dispose?.();
      disposeSharedResources();
      renderer.dispose();
    },
  };

  return api;
}
