/**
 * groundText.js — flat, crisp text lying on the ground plane.
 *
 * Each block is drawn to a high-resolution offscreen canvas and mapped onto a
 * PlaneGeometry laid flat, so the text reads as printed on the floor of the
 * diorama and sorts correctly against the scenery in front of and behind it.
 *
 * Why not CSS3DRenderer? A CSS3D layer sits in its own stacking context and
 * cannot be occluded by WebGL geometry — props would never pass in front of a
 * paragraph, and the two renderers visibly desync under a scrubbed scroll. The
 * cost of the canvas approach is that this text is not selectable; 2D mode is
 * where the genuinely selectable, screen-reader-correct copy lives.
 */

import * as THREE from 'three';
import { groundText as cfg, hex, palette } from '../config.js';
import { planeGeometry } from './resources.js';

/* Set from the live renderer at boot so we never ask for more anisotropy
 * than the GPU supports. 16 is a safe assumption until then. */
let maxAnisotropy = 16;

export function setMaxAnisotropy(renderer) {
  maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
}

const BODY_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** Greedy word wrap against a measured max width. */
function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function applyLetterSpacing(ctx, spacing) {
  // letterSpacing is supported in current Chrome/Safari/Firefox; harmless
  // where it is not, the text simply renders without tracking.
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
}

/**
 * Build a flat ground-text plane.
 *
 * @param {string|string[]} text          one paragraph, or several
 * @param {object} opts
 * @param {THREE.Vector3} opts.position
 * @param {number} opts.rotationY
 * @param {number} opts.worldWidth        width of the plane in world units
 * @param {'body'|'label'} opts.variant
 * @param {'left'|'center'} opts.align
 * @param {number} opts.colour            hex number
 * @param {number} opts.opacity
 */
export function createGroundText(
  text,
  {
    position,
    rotationY = 0,
    worldWidth = 34,
    variant = 'body',
    align = 'left',
    colour = palette.ink,
    opacity = 1,
  }
) {
  const paragraphs = (Array.isArray(text) ? text : [text]).filter(Boolean);
  if (paragraphs.length === 0) return null;

  const isLabel = variant === 'label';
  // Font size is authored in world units and converted here, so raising
  // PIXELS_PER_UNIT sharpens the text without also making it bigger.
  const fontPx = Math.round(
    (isLabel ? cfg.LABEL_FONT_UNITS : cfg.BODY_FONT_UNITS) * cfg.PIXELS_PER_UNIT
  );
  const lineHeight = Math.round(fontPx * (isLabel ? 1.35 : cfg.BODY_LINE_HEIGHT));
  const padding = Math.round(fontPx * 0.8);

  // Canvas width is derived from the world width so on-screen density is
  // consistent across blocks of different sizes.
  const canvasW = Math.min(
    cfg.MAX_TEXTURE_PX,
    Math.max(256, Math.round(worldWidth * cfg.PIXELS_PER_UNIT))
  );

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  const ctx = canvas.getContext('2d');

  const font = isLabel
    ? `700 ${fontPx}px ${MONO_STACK}`
    : `400 ${fontPx}px ${BODY_STACK}`;

  // Measure first (height depends on wrapping), then size the canvas and
  // re-apply the font — resizing a canvas resets its 2D context state.
  ctx.font = font;
  applyLetterSpacing(ctx, isLabel ? cfg.LABEL_LETTER_SPACING_UNITS * cfg.PIXELS_PER_UNIT : 0);

  const maxTextWidth = canvasW - padding * 2;
  const blocks = paragraphs.map((p) =>
    wrap(ctx, isLabel ? String(p).toUpperCase() : p, maxTextWidth)
  );

  const paragraphGap = isLabel ? 0 : Math.round(lineHeight * 0.55);
  const totalLines = blocks.reduce((n, b) => n + b.length, 0);
  const canvasH = Math.min(
    cfg.MAX_TEXTURE_PX,
    padding * 2 + totalLines * lineHeight + (blocks.length - 1) * paragraphGap
  );
  canvas.height = canvasH;

  ctx.font = font;
  applyLetterSpacing(ctx, isLabel ? cfg.LABEL_LETTER_SPACING_UNITS * cfg.PIXELS_PER_UNIT : 0);
  ctx.textBaseline = 'top';
  ctx.textAlign = align === 'center' ? 'center' : 'left';
  ctx.fillStyle = hex(colour);

  const x = align === 'center' ? canvasW / 2 : padding;
  let y = padding;
  blocks.forEach((lines, bi) => {
    for (const line of lines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    if (bi < blocks.length - 1) y += paragraphGap;
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  // Anisotropy is what stops ground text turning to mush at a grazing angle.
  texture.anisotropy = maxAnisotropy;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  const worldHeight = worldWidth * (canvasH / canvasW);
  const mesh = new THREE.Mesh(planeGeometry(), material);
  mesh.scale.set(worldWidth, worldHeight, 1);
  // Yaw first about world Y, then lay the plane flat about its own X axis.
  // Doing it in this order avoids depending on Euler evaluation order.
  mesh.rotateY(rotationY);
  mesh.rotateX(-Math.PI / 2);
  mesh.position.copy(position);
  mesh.renderOrder = 2;

  mesh.userData.dispose = () => {
    material.dispose();
    texture.dispose();
  };

  return mesh;
}
