'use strict';
/**
 * Pure Node.js PNG icon generator — no external dependencies.
 * Produces build/icon.png (512×512) for electron-builder.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length, 0);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function drawCircle(pixels, W, cx, cy, r, R, G, B, A, fill = true) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(W - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (fill ? d <= r : (d >= r - 1.5 && d <= r + 0.5)) {
        const a = Math.min(1, Math.max(0, fill ? r - d + 0.5 : 1 - Math.abs(d - r + 0.5)));
        const i = (y * W + x) * 4;
        const fa = (A / 255) * a;
        pixels[i]   = Math.round(pixels[i]   * (1 - fa) + R * fa);
        pixels[i+1] = Math.round(pixels[i+1] * (1 - fa) + G * fa);
        pixels[i+2] = Math.round(pixels[i+2] * (1 - fa) + B * fa);
        pixels[i+3] = Math.min(255, pixels[i+3] + Math.round(255 * fa));
      }
    }
  }
}

function drawLine(pixels, W, x0, y0, x1, y1, thick, R, G, B) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(len * 2);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const px = x0 + dx * t, py = y0 + dy * t;
    drawCircle(pixels, W, px, py, thick / 2, R, G, B, 255);
  }
}

function drawRoundedRect(pixels, W, H, cr, R, G, B) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = Math.max(0, Math.abs(x - W / 2) - (W / 2 - cr));
      const dy = Math.max(0, Math.abs(y - H / 2) - (H / 2 - cr));
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < cr) {
        const alpha = Math.min(1, cr - dist);
        const i = (y * W + x) * 4;
        pixels[i]   = Math.round(pixels[i]   * (1 - alpha) + R * alpha);
        pixels[i+1] = Math.round(pixels[i+1] * (1 - alpha) + G * alpha);
        pixels[i+2] = Math.round(pixels[i+2] * (1 - alpha) + B * alpha);
        pixels[i+3] = Math.min(255, Math.round(255 * alpha) + pixels[i+3]);
      }
    }
  }
}

// ── Main icon draw ─────────────────────────────────────────────────────────
function createIcon(SIZE) {
  const pixels = new Float32Array(SIZE * SIZE * 4); // float for blending

  const cx = SIZE / 2, cy = SIZE / 2;
  const cr = SIZE * 0.22; // corner radius

  // 1. Green rounded rectangle background
  drawRoundedRect(pixels, SIZE, SIZE, cr, 16, 185, 129);

  // 2. White clock face
  const faceR = SIZE * 0.37;
  drawCircle(pixels, SIZE, cx, cy, faceR, 255, 255, 255, 245);

  // 3. Subtle ring
  drawCircle(pixels, SIZE, cx, cy, faceR * 0.96, 16, 185, 129, 60, false);

  // 4. Hour tick marks (12, 3, 6, 9)
  for (let h = 0; h < 12; h++) {
    const angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = faceR * (h % 3 === 0 ? 0.76 : 0.84);
    const outer = faceR * 0.90;
    drawLine(pixels, SIZE,
      cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner,
      cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer,
      h % 3 === 0 ? SIZE * 0.022 : SIZE * 0.012,
      5, 150, 105
    );
  }

  // 5. Hour hand — 10 o'clock (300° clockwise from 12)
  const hAngle = (10 / 12) * Math.PI * 2 - Math.PI / 2;
  drawLine(pixels, SIZE,
    cx, cy,
    cx + Math.cos(hAngle) * faceR * 0.54,
    cy + Math.sin(hAngle) * faceR * 0.54,
    SIZE * 0.038, 5, 150, 105
  );

  // 6. Minute hand — 2 o'clock (60° clockwise from 12 = 10 past)
  const mAngle = (2 / 12) * Math.PI * 2 - Math.PI / 2;
  drawLine(pixels, SIZE,
    cx, cy,
    cx + Math.cos(mAngle) * faceR * 0.70,
    cy + Math.sin(mAngle) * faceR * 0.70,
    SIZE * 0.028, 16, 185, 129
  );

  // 7. Center dot
  drawCircle(pixels, SIZE, cx, cy, SIZE * 0.040, 5, 150, 105, 255);
  drawCircle(pixels, SIZE, cx, cy, SIZE * 0.020, 255, 255, 255, 255);

  // Convert to Uint8 scanlines with filter byte
  const scanlines = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    scanlines[y * (1 + SIZE * 4)] = 0; // filter: None
    for (let x = 0; x < SIZE; x++) {
      const src = (y * SIZE + x) * 4;
      const dst = y * (1 + SIZE * 4) + 1 + x * 4;
      scanlines[dst]   = Math.round(Math.max(0, Math.min(255, pixels[src])));
      scanlines[dst+1] = Math.round(Math.max(0, Math.min(255, pixels[src+1])));
      scanlines[dst+2] = Math.round(Math.max(0, Math.min(255, pixels[src+2])));
      scanlines[dst+3] = Math.round(Math.max(0, Math.min(255, pixels[src+3])));
    }
  }

  const compressed = zlib.deflateSync(scanlines, { level: 6 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outPath = path.join(__dirname, '..', 'build', 'icon.png');
const buf = createIcon(512);
fs.writeFileSync(outPath, buf);
console.log(`✅ Icon created: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
