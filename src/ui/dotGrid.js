/**
 * dotGrid.js — generates the fine dot-grid texture used in three places:
 * the entry screen background, the 3D ground plane, and the 2D document.
 *
 * Generated in code, so there is no image file and no network request.
 */

import { hex, palette } from '../config.js';

/**
 * Draw one repeating tile of the dot grid.
 * @param {number} spacing  px between dots in the tile
 * @param {number} dotSize  px diameter of a dot
 * @param {string} colour   CSS colour for the dots
 * @param {string|null} bg  fill colour, or null for transparent
 */
export function makeDotTile(spacing = 28, dotSize = 2, colour = hex(palette.grid), bg = null) {
  const c = document.createElement('canvas');
  c.width = spacing;
  c.height = spacing;
  const ctx = c.getContext('2d');

  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, spacing, spacing);
  }

  ctx.fillStyle = colour;
  // Dot in the tile centre so the grid reads as evenly spaced when tiled.
  const o = (spacing - dotSize) / 2;
  ctx.fillRect(o, o, dotSize, dotSize);

  return c;
}

/** The same tile as a data URI, for CSS `background-image`. */
export function makeDotDataUri(spacing, dotSize, colour, bg) {
  return makeDotTile(spacing, dotSize, colour, bg).toDataURL('image/png');
}

/**
 * Apply the dot grid to an element as a repeating CSS background.
 * Used by the entry screen and by 2D mode.
 */
export function applyDotGridCss(el, spacing = 28, dotSize = 2) {
  const uri = makeDotDataUri(spacing, dotSize, hex(palette.grid), null);
  el.style.backgroundImage = `url(${uri})`;
  el.style.backgroundRepeat = 'repeat';
  el.style.backgroundSize = `${spacing}px ${spacing}px`;
}
