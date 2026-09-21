/**
 * audio.js — sound, on the raw Web Audio API. No Howler, no <audio> tags.
 *
 * The rules this module exists to enforce:
 *
 *   1. The theme is ONE AudioBufferSourceNode with `loop = true`, created
 *      once in `init()` and never touched again. Scrolling, jumping between
 *      sections and switching 2D/3D do not reach it, so the track cannot
 *      restart or double up. Nothing outside this file gets a handle on it.
 *   2. Mute changes GAIN ONLY — a short ramp on the master node. Playback
 *      keeps running underneath, so unmuting drops you back into the track
 *      where it had got to, not at the beginning.
 *   3. Nothing is created before the visitor clicks Enter. A browser will
 *      refuse (or silently suspend) an AudioContext made without a gesture,
 *      so `init()` is called from the Enter handler and nowhere else.
 *   4. The loader tries each format in `audio.FORMATS` order, so dropping
 *      public/audio/theme.mp3 in beats the shipped .wav with no code change.
 *   5. Failure is never fatal. No audio file, no decoder, no AudioContext —
 *      the site carries on silently.
 */

import { audio as cfg } from '../config.js';

/* ------------------------------------------------------------------ */
/* Preference                                                          */
/* ------------------------------------------------------------------ */
/* sessionStorage rather than localStorage: a sound choice belongs to this
 * visit. Wrapped because Safari's private mode throws on access. */

export function readSoundPreference() {
  try {
    const v = sessionStorage.getItem(cfg.STORAGE_KEY);
    if (v === 'on') return true;
    if (v === 'off') return false;
  } catch {
    /* storage unavailable — fall through to the default */
  }
  return cfg.DEFAULT_ON;
}

function writeSoundPreference(on) {
  try {
    sessionStorage.setItem(cfg.STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore: the preference simply will not survive a reload */
  }
}

/* ------------------------------------------------------------------ */
/* Format probing                                                      */
/* ------------------------------------------------------------------ */

const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav' };

/** Drop formats this browser cannot decode before we spend a request on them. */
function playableFormats() {
  let probe;
  try {
    probe = document.createElement('audio');
  } catch {
    return cfg.FORMATS;
  }
  const usable = cfg.FORMATS.filter((f) => {
    const answer = probe.canPlayType?.(MIME[f] ?? '') ?? '';
    return answer !== ''; // '' = definitely not; 'maybe'/'probably' = try it
  });
  return usable.length ? usable : cfg.FORMATS;
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

export function createAudio() {
  /** @type {AudioContext|null} */
  let ctx = null;
  let master = null; // everything passes through this; mute lives here
  let themeGain = null;
  let themeSource = null; // created once, never recreated
  let started = false;
  let muted = !readSoundPreference();

  const sfxBuffers = new Map();
  const formats = playableFormats();

  /* ---------------- loading ---------------- */

  /**
   * Fetch and decode the first format of `name` that exists and decodes.
   * A missing file is an expected outcome, not an error: the whole point of
   * the cascade is that theme.mp3 usually is not there yet.
   */
  async function loadFirst(name) {
    for (const ext of formats) {
      const url = `${cfg.BASE}${name}.${ext}`;
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) continue;
        const bytes = await res.arrayBuffer();
        return await ctx.decodeAudioData(bytes);
      } catch {
        // try the next format
      }
    }
    return null;
  }

  /* ---------------- gain ---------------- */

  function applyGain(ramp = cfg.MUTE_RAMP) {
    if (!master) return;
    const now = ctx.currentTime;
    const target = muted ? 0.0001 : 1;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(target, now + ramp);
  }

  /** Browsers suspend contexts on tab switch; nudge it awake, quietly. */
  function resumeIfSuspended() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  /* ---------------- public ---------------- */

  const api = {
    /**
     * Create the context and start the loop. Call once, from the Enter
     * handler. Safe to call again — it returns the same promise.
     */
    init() {
      if (api._booting) return api._booting;
      api._booting = (async () => {
        const Ctx = window.AudioContext ?? window.webkitAudioContext;
        if (!Ctx) return false;

        try {
          ctx = new Ctx();
        } catch {
          return false;
        }

        // Created inside a click handler, but a context can still come up
        // suspended (background tab, autoplay policy). Ask, and keep asking
        // whenever the page becomes visible again.
        resumeIfSuspended();
        document.addEventListener('visibilitychange', resumeIfSuspended);
        window.addEventListener('pointerdown', resumeIfSuspended);

        master = ctx.createGain();
        master.gain.value = muted ? 0.0001 : 1;
        master.connect(ctx.destination);

        themeGain = ctx.createGain();
        themeGain.gain.value = 0.0001;
        themeGain.connect(master);

        const buffer = await loadFirst(cfg.THEME);
        if (!buffer) return false;

        themeSource = ctx.createBufferSource();
        themeSource.buffer = buffer;
        themeSource.loop = true; // seamless: the node never stops
        themeSource.connect(themeGain);
        themeSource.start(0);
        started = true;

        // Fade the track in on its own gain node, leaving `master` free to
        // mean nothing but "muted or not".
        const now = ctx.currentTime;
        themeGain.gain.setValueAtTime(0.0001, now);
        themeGain.gain.exponentialRampToValueAtTime(cfg.THEME_GAIN, now + cfg.FADE_IN);
        return true;
      })();

      return api._booting;
    },

    /** Play a one-shot. Unknown or unloaded names are a silent no-op. */
    async play(name) {
      if (!ctx || !cfg.SFX.includes(name)) return;
      resumeIfSuspended();

      if (!sfxBuffers.has(name)) {
        sfxBuffers.set(name, await loadFirst(name));
      }
      const buffer = sfxBuffers.get(name);
      if (!buffer) return;

      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = cfg.SFX_GAIN;
      src.buffer = buffer;
      src.connect(g);
      g.connect(master); // under the master gain, so mute covers sfx too
      src.start(0);
    },

    /**
     * Mute or unmute. This only ever ramps the master gain — it never stops,
     * restarts, disconnects or recreates the looping source.
     */
    setMuted(next) {
      muted = Boolean(next);
      writeSoundPreference(!muted);
      applyGain();
    },

    get muted() {
      return muted;
    },

    /** True once the loop is running. Read by tools/verify.mjs. */
    get playing() {
      return started;
    },

    /** Diagnostics for ?debug and the verification script. */
    stats() {
      return {
        state: ctx?.state ?? 'none',
        playing: started,
        muted,
        masterGain: master ? +master.gain.value.toFixed(4) : null,
        currentTime: ctx ? +ctx.currentTime.toFixed(2) : 0,
        formats,
      };
    },
  };

  return api;
}
