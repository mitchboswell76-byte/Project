/**
 * pixels.js — text to a pixel grid, via an offscreen 2D canvas.
 *
 * This follows the brief's technique exactly:
 *   1. draw the string to an offscreen canvas with imageSmoothingEnabled off
 *   2. read it back with getImageData
 *   3. record every pixel above an alpha threshold as a grid coordinate
 *
 * The glyphs come from our own 5x7 bitmap font rather than ctx.font, so the
 * raster is identical on every machine. Keeping the canvas round-trip means
 * a real pixel font file could be dropped in later (draw with ctx.fillText
 * instead of drawGlyphs) without touching anything downstream.
 */

import { GLYPH_H, GLYPH_W, glyph } from './bitmapFont.js';
import { voxelText as cfg } from '../config.js';

/** Draw text into a canvas at exactly one canvas pixel per font pixel. */
function drawToCanvas(lines, letterSpacing, lineGap) {
  const rows = lines.map((line) => [...String(line).toUpperCase()]);
  const widths = rows.map((chars) =>
    chars.length ? chars.length * GLYPH_W + (chars.length - 1) * letterSpacing : 0
  );
  const width = Math.max(1, ...widths);
  const height = rows.length * GLYPH_H + Math.max(0, rows.length - 1) * lineGap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';

  rows.forEach((chars, row) => {
    const yOffset = row * (GLYPH_H + lineGap);
    chars.forEach((ch, i) => {
      const g = glyph(ch);
      const xOffset = i * (GLYPH_W + letterSpacing);
      for (let y = 0; y < GLYPH_H; y++) {
        for (let x = 0; x < GLYPH_W; x++) {
          if (g[y * GLYPH_W + x] === '#') ctx.fillRect(xOffset + x, yOffset + y, 1, 1);
        }
      }
    });
  });

  return { canvas, ctx, width, height };
}

/**
 * @param {string|string[]} text
 * @returns {{ width:number, height:number, coords:Array<{x:number,y:number}> }}
 *          coords are grid positions, origin top-left.
 */
export function textToPixels(text, { letterSpacing = 1, lineGap = 2 } = {}) {
  const lines = Array.isArray(text) ? text : [text];
  const { ctx, width, height } = drawToCanvas(lines, letterSpacing, lineGap);

  const { data } = ctx.getImageData(0, 0, width, height);
  const coords = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // index 3 of each RGBA quad is alpha
      if (data[(y * width + x) * 4 + 3] >= cfg.ALPHA_THRESHOLD) coords.push({ x, y });
    }
  }

  return { width, height, coords };
}
