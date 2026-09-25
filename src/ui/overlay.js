/**
 * overlay.js — the persistent chrome, fixed to the top-left corner.
 *
 * It is built once and never rebuilt. It does not move, scroll, fade or
 * reflow: the same element is on screen in 3D mode, in 2D mode, and while
 * the camera is flying between sections. Everything below it changes; this
 * does not.
 *
 * Contents, top to bottom:
 *   - the pixel logo mark, inside a thin rectangle, a few pixels
 *     permanently accent-coloured (not flickering — that is the entry gate)
 *   - the site name on three lines, muted
 *   - the section nav; the current one is bold white and carries aria-current
 *   - "View :"  3D icon → document icon
 *   - "Zoom :"  – / + , which pulls the camera back or moves it in
 *   - "Sound :" On / Off
 *
 * Every control is a real <button>, reachable by keyboard, with a visible
 * focus ring (see :focus-visible in style.css) and an accessible name from
 * content.ui.a11y.
 */

import { content } from '../content.js';
import { hex, overlay as cfg, palette, pickAccentIndices } from '../config.js';
import { rasteriseLine, toCoords } from '../world/bitmapFont.js';

const GREY = hex(palette.voxelGrey);

/* ------------------------------------------------------------------ */
/* Logo mark                                                           */
/* ------------------------------------------------------------------ */
/* Drawn on a canvas rather than composed from DOM nodes: one element
 * instead of a few dozen, and the pixels land on exact device pixels. */

function drawLogoMark(canvas) {
  const grid = rasteriseLine(content.meta.logoText, 1);
  const coords = toCoords(grid);
  const step = cfg.LOGO_PIXEL_PX + cfg.LOGO_GAP_PX;
  const w = grid.width * step - cfg.LOGO_GAP_PX;
  const h = grid.height * step - cfg.LOGO_GAP_PX;

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // The same few pixels every load — deterministic, so the mark is stable.
  const accentAt = new Map();
  pickAccentIndices(coords.length, cfg.LOGO_ACCENT_PIXELS).forEach((idx, k) => {
    accentAt.set(idx, hex(palette.accents[k % palette.accents.length]));
  });

  coords.forEach((c, i) => {
    ctx.fillStyle = accentAt.get(i) ?? GREY;
    ctx.fillRect(c.x * step, c.y * step, cfg.LOGO_PIXEL_PX, cfg.LOGO_PIXEL_PX);
  });

  return { w, h };
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */
/* Inline SVG, sized from config, coloured by currentColor so the active
 * and inactive states are pure CSS. */

const ICON_3D = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect class="icon__frame" x="1.5" y="1.5" width="21" height="21" />
    <path class="icon__fill" d="M4 16 L12 6 L20 16 Z" />
    <path class="icon__rule" d="M4 19 H20" />
  </svg>`;

const ICON_DOC = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect class="icon__frame" x="1.5" y="1.5" width="21" height="21" />
    <path class="icon__rule" d="M6 7 H18 M6 11 H18 M6 15 H14" />
  </svg>`;

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

/**
 * @param {object} o
 * @param {(index:number)=>void} o.onNavigate   a nav label was clicked
 * @param {(mode:'2d'|'3d')=>void} o.onViewChange
 * @param {(on:boolean)=>void} o.onSoundChange
 * @param {'2d'|'3d'} o.mode      initial view mode
 * @param {boolean} o.sound       initial sound state
 */
export function createOverlay({
  onNavigate,
  onHome,
  onViewChange,
  onSoundChange,
  onZoomChange,
  mode,
  sound,
}) {
  const root = document.getElementById('overlay');
  const ui = content.ui;

  root.hidden = false;
  root.innerHTML = `
    <div class="overlay__scrim" aria-hidden="true"></div>

    <div class="overlay__inner">
      <button type="button" class="overlay__mark" aria-label="Return to the introduction">
        <canvas class="overlay__logo" role="img" aria-label="${ui.a11y.logo}"></canvas>
      </button>

      <p class="overlay__name">${content.meta.nameLines
        .map((line) => `<span>${line}</span>`)
        .join('')}</p>

      <nav class="overlay__nav" aria-label="${ui.navLabel}">
        <ul>
          ${content.sections
            .map(
              (s, i) => `<li><button type="button" class="navlink" data-index="${i}"
                 aria-label="${ui.a11y.navItem(s.navLabel)}"><span class="navlink__number" aria-hidden="true">${s.number}</span>${s.navLabel}</button></li>`
            )
            .join('')}
        </ul>
      </nav>

      <div class="overlay__row">
        <span class="overlay__label" id="view-label">${ui.viewLabel}</span>
        <div class="overlay__icons" role="group" aria-labelledby="view-label">
          <button type="button" class="icon icon--3d" data-mode="3d"
                  aria-label="${ui.a11y.view3d}">${ICON_3D}</button>
          <span class="overlay__arrow" aria-hidden="true">&rarr;</span>
          <button type="button" class="icon icon--doc" data-mode="2d"
                  aria-label="${ui.a11y.view2d}">${ICON_DOC}</button>
        </div>
      </div>

      <div class="overlay__row overlay__row--zoom">
        <span class="overlay__label" id="zoom-label">${ui.zoomLabel}</span>
        <div class="overlay__zoom" role="group" aria-labelledby="zoom-label">
          <button type="button" class="zoombtn" data-step="1"
                  aria-label="${ui.a11y.zoomOut}">${ui.zoomOut}</button>
          <span class="overlay__sep" aria-hidden="true">${ui.separator}</span>
          <button type="button" class="zoombtn" data-step="-1"
                  aria-label="${ui.a11y.zoomIn}">${ui.zoomIn}</button>
        </div>
      </div>

      <div class="overlay__row">
        <span class="overlay__label" id="sound-label">${ui.soundLabel}</span>
        <div class="overlay__sound" role="group" aria-labelledby="sound-label">
          <button type="button" class="soundbtn" data-on="true"
                  aria-label="${ui.a11y.soundOn}">${ui.on}</button>
          <span class="overlay__sep" aria-hidden="true">${ui.separator}</span>
          <button type="button" class="soundbtn" data-on="false"
                  aria-label="${ui.a11y.soundOff}">${ui.off}</button>
        </div>
      </div>
    </div>
    <aside class="scene-card" aria-label="Current section">
      <p class="scene-card__eyebrow"><span class="scene-card__number">01 / 04</span><span>SCROLL TO EXPLORE ↓</span></p>
      <h1 class="scene-card__title"></h1>
      <p class="scene-card__summary"></p>
      <div class="scene-card__actions"><button type="button" class="scene-card__read" aria-label="Read this section">Read this section ↗</button><button type="button" class="scene-card__next" aria-label="Next section">→</button></div>
      <div class="scene-card__track" aria-hidden="true"><span></span></div>
    </aside>`;

  root.querySelector('.overlay__mark').addEventListener('click', () => onHome?.());
  const logo = root.querySelector('.overlay__logo');
  const mark = root.querySelector('.overlay__mark');
  const { w, h } = drawLogoMark(logo);
  mark.style.padding = `${cfg.LOGO_PAD_PX}px`;
  mark.style.width = `${w + cfg.LOGO_PAD_PX * 2 + 2}px`;
  mark.style.height = `${h + cfg.LOGO_PAD_PX * 2 + 2}px`;

  const navButtons = [...root.querySelectorAll('.navlink')];
  const iconButtons = [...root.querySelectorAll('.icon')];
  const soundButtons = [...root.querySelectorAll('.soundbtn')];
  const zoomButtons = [...root.querySelectorAll('.zoombtn')];
  const live = document.getElementById('live-region');

  navButtons.forEach((b) =>
    b.addEventListener('click', () => onNavigate(Number(b.dataset.index)))
  );
  iconButtons.forEach((b) => b.addEventListener('click', () => onViewChange(b.dataset.mode)));
  soundButtons.forEach((b) =>
    b.addEventListener('click', () => onSoundChange(b.dataset.on === 'true'))
  );
  zoomButtons.forEach((b) =>
    b.addEventListener('click', () => onZoomChange?.(Number(b.dataset.step)))
  );

  /* ---------------- state ---------------- */

  let current = -1;
  root.querySelector('.scene-card__read').addEventListener('click', () => onViewChange('2d'));
  root.querySelector('.scene-card__next').addEventListener('click', () => onNavigate((current + 1) % content.sections.length));

  const api = {
    element: root,

    /** Highlight section `i`. Cheap enough to call on every scroll frame. */
    setSection(i) {
      if (i === current) return; // no DOM writes on an unchanged frame
      current = i;
      navButtons.forEach((b, k) => {
        const on = k === i;
        b.classList.toggle('is-current', on);
        if (on) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
      const section = content.sections[i];
      root.querySelector('.scene-card__number').textContent = `${section.number} / 04`;
      root.querySelector('.scene-card__title').textContent = section.voxelHeading;
      root.querySelector('.scene-card__summary').textContent = section.summary;
      root.querySelector('.scene-card__track span').style.width = `${(i + 1) / content.sections.length * 100}%`;
      root.querySelector('.scene-card__next').setAttribute('aria-label', `Next section: ${content.sections[(i + 1) % content.sections.length].navLabel}`);
      const label = content.sections[i]?.navLabel;
      if (live && label) live.textContent = ui.a11y.sectionAnnounce(label);
    },

    setMode(m) {
      iconButtons.forEach((b) => {
        const on = b.dataset.mode === m;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    },

    /** Grey out a zoom button once the camera is at the end of its range. */
    setZoom({ atMin, atMax }) {
      zoomButtons.forEach((b) => {
        const out = b.dataset.step === '1';
        const spent = out ? atMax : atMin;
        b.disabled = spent;
        b.setAttribute('aria-disabled', String(spent));
      });
    },

    setSound(on) {
      soundButtons.forEach((b) => {
        const active = (b.dataset.on === 'true') === on;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    },
  };

  api.setSection(0);
  api.setMode(mode);
  api.setSound(sound);

  window.addEventListener('resize', () => drawLogoMark(logo));

  return api;
}
