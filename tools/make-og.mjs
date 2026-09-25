/**
 * make-og.mjs — draws the social-card image at build time.
 *
 * A link to this site on LinkedIn, Slack or WhatsApp is a card, and a card
 * with no image is a grey box. The image is the entry wordmark on the dot
 * grid, drawn from the same bitmap font and the same palette as the site, so
 * it cannot drift from what the visitor then sees.
 *
 * It is written here rather than produced with a headless browser because a
 * build must not need one: this is a few hundred lines of pixels and a PNG
 * encoder over node:zlib, and it runs in milliseconds.
 */

import { deflateSync } from 'node:zlib';

import { palette, entry as entryCfg, pickAccentIndices } from '../src/config.js';
import { content } from '../src/content.js';
import { rasteriseBlock, toCoords } from '../src/world/bitmapFont.js';

/* ------------------------------------------------------------------ */
/* PNG encoding                                                        */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** @param {Buffer} rgb  width * height * 3 bytes, no filter bytes. */
function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // 10-12: compression, filter and interlace methods, all 0

  // Each scanline is prefixed with its filter type; 0 (none) throughout,
  // which compresses perfectly well on flat colour.
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ */
/* The card                                                           */
/* ------------------------------------------------------------------ */

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const rgbOf = (n) => [(n >> 16) & 255, (n >> 8) & 255, n & 255];

export function makeOgImage() {
  const w = OG_WIDTH;
  const h = OG_HEIGHT;
  const px = Buffer.alloc(w * h * 3);

  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
  };
  const fillRect = (x0, y0, rw, rh, colour) => {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) set(x, y, colour);
  };

  fillRect(0, 0, w, h, rgbOf(palette.background));

  // The same dot grid the site's background carries.
  const grid = rgbOf(palette.grid);
  for (let y = 0; y < h; y += 28) for (let x = 0; x < w; x += 28) fillRect(x, y, 2, 2, grid);

  // The wordmark, centred, at the size the card can carry.
  const mark = rasteriseBlock(content.meta.nameLines, {
    letterSpacing: 1,
    lineGap: 2,
    align: 'center',
  });
  const coords = toCoords(mark);
  const step = Math.floor(Math.min((w * 0.66) / mark.width, (h * 0.5) / mark.height));
  const pixel = Math.max(1, step - 1);
  const markW = mark.width * step;
  const markH = mark.height * step;
  const ox = Math.round((w - markW) / 2);
  const oy = Math.round((h - markH) / 2);

  /* The same deterministic accent pixels as the overlay mark, so the card and
   * the site agree rather than each picking their own. */
  const accents = new Map();
  pickAccentIndices(coords.length, entryCfg.FLICKER_BATCH * 3).forEach((idx, k) => {
    accents.set(idx, rgbOf(palette.accents[k % palette.accents.length]));
  });

  const grey = rgbOf(palette.voxelGrey);
  coords.forEach((c, i) => {
    fillRect(ox + c.x * step, oy + c.y * step, pixel, pixel, accents.get(i) ?? grey);
  });

  // The thin outline the entry gate draws around the wordmark.
  const pad = Math.round(step * 2.6);
  const rule = rgbOf(palette.inkMuted);
  fillRect(ox - pad, oy - pad, markW + pad * 2, 1, rule);
  fillRect(ox - pad, oy + markH + pad, markW + pad * 2, 1, rule);
  fillRect(ox - pad, oy - pad, 1, markH + pad * 2, rule);
  fillRect(ox + markW + pad, oy - pad, 1, markH + pad * 2 + 1, rule);

  return encodePng(w, h, px);
}
