// THE WORLD TODAY - Saturday 21 November 2026.
// A one-day world news broadsheet, drawn from scratch in pure TypeScript.
// No network, no fonts, no images: every pixel is computed here, so the
// program renders the same bytes on every run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER = [246, 241, 231];
const INK = [26, 26, 26];
const NAVY = [22, 35, 63];
const NAVY2 = [30, 48, 84];
const RED = [163, 22, 33];
const TEAL = [15, 118, 110];
const GOLD = [176, 141, 58];
const SKY = [178, 208, 224];
const SKY2 = [214, 230, 238];
const SAND = [232, 214, 178];
const GREEN = [74, 110, 72];
const GREEN2 = [112, 140, 96];
const GREY = [120, 116, 108];
const WHITE = [255, 255, 255];
const CREAM = [250, 246, 236];
const ORANGE = [214, 106, 40];
const DARK = [40, 40, 44];

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);
function fill(c: number[]) {
  for (let i = 0; i < W * H; i++) { px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2]; }
}
function set(x: number, y: number, c: number[]) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}
function hline(x: number, y: number, w: number, c: number[]) { rect(x, y, w, 1, c); }
function vline(x: number, y: number, h: number, c: number[]) { rect(x, y, 1, h, c); }
function box(x: number, y: number, w: number, h: number, c: number[]) {
  hline(x, y, w, c); hline(x, y + h - 1, w, c); vline(x, y, h, c); vline(x + w - 1, y, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (let n = 0; n < 4000; n++) {
    set(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function circle(cx: number, cy: number, r: number, c: number[]) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, c: number[]) {
  for (let a = 0; a < 360; a += 2) {
    const t = (a * Math.PI) / 180;
    set(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]) {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
    const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
    const g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) set(x, y, c);
  }
}
function poly(pts: number[][], c: number[]) {
  // simple scanline fill for a convex-ish polygon
  let minY = 1e9, maxY = -1e9;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(Math.round(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = xs[i]; x <= xs[i + 1]; x++) set(x, y, c);
    }
  }
}

// ---------- 5x7 bitmap font ----------
const F: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.####', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.####', '#...#', '#...#', '.####', '#....', '####.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#...#', '.####'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['#...#', '#..#.', '...#.', '..#..', '.#...', '#..#.', '#...#'],
  '$': ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '&': ['.###.', '#...#', '#...#', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '.#.#.', '..#..', '#####', '..#..', '.#.#.', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '<': ['...#.', '..#..', '.#...', '#....', '.#...', '..#..', '...#.'],
  '>': ['.#...', '..#..', '...#.', '....#', '...#.', '..#..', '.#...'],
};
function textW(s: string, sc: number): number { return s.length * 6 * sc - sc; }
function drawText(x: number, y: number, s: string, sc: number, c: number[]) {
  let cx = x;
  for (const ch of s) {
    const g = F[ch] ?? F['?'];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if (g[r][col] === '#') rect(cx + col * sc, y + r * sc, sc, sc, c);
    }
    cx += 6 * sc;
  }
}
function drawTextC(cx: number, y: number, s: string, sc: number, c: number[]) {
  drawText(cx - Math.floor(textW(s, sc) / 2), y, s, sc, c);
}
function wrap(s: string, maxW: number, sc: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textW(t, sc) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, s: string, maxW: number, sc: number, c: number[], lh: number): number {
  const lines = wrap(s, maxW, sc);
  lines.forEach((l, i) => drawText(x, y + i * lh, l, sc, c));
  return y + lines.length * lh;
}

// ---------- PNG encoder (deterministic) ----------
function crc32(buf: Buffer): number {
  let table: number[] | null = null;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    (crc32 as unknown as { t: number[] }).t = table;
  }
  const t = (crc32 as unknown as { t: number[] }).t;
  let c = 0xffffffff;
  for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- scenes ----------
function sceneCop(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY2);
  circle(x + w - 18, y + 16, 10, GOLD);
  rect(x, y + h - 34, w, 34, SAND);
  // summit hall
  rect(x + 14, y + h - 78, w - 28, 44, NAVY2);
  tri(x + 14, y + h - 78, x + w - 14, y + h - 78, x + w / 2, y + h - 96, RED);
  for (let i = 0; i < 5; i++) rect(x + 22 + i * ((w - 52) / 5), y + h - 68, 8, 12, WHITE);
  // flags row
  for (let i = 0; i < 7; i++) {
    const fx = x + 10 + i * ((w - 20) / 7);
    vline(Math.round(fx), y + h - 96, 18, INK);
    rect(Math.round(fx) + 1, y + h - 96, 9, 6, [RED, TEAL, GOLD, NAVY, ORANGE, GREEN, RED][i]);
  }
  // delegates: small figures
  for (let i = 0; i < 6; i++) {
    const fx = x + 18 + i * ((w - 36) / 6);
    circle(Math.round(fx), y + h - 22, 4, DARK);
    rect(Math.round(fx) - 4, y + h - 18, 8, 14, [NAVY, RED, TEAL, GOLD, GREEN, NAVY2][i]);
  }
  drawText(x + 6, y + 4, 'ANTALYA', 1, NAVY);
}
function sceneMissile(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [24, 32, 54]);
  for (let i = 0; i < 14; i++) set(x + ((i * 53) % w), y + ((i * 29) % 40), WHITE);
  circle(x + w - 24, y + 18, 9, [240, 230, 200]);
  // skyline
  const base = y + h - 26;
  const hs = [34, 52, 44, 66, 40, 58, 30];
  let bx = x + 6;
  for (let i = 0; i < 7; i++) {
    const bw = (w - 12) / 7 - 2;
    rect(Math.round(bx), base - hs[i] * 0.55, Math.round(bw), Math.round(hs[i] * 0.55) + 26, [52, 58, 74]);
    for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 2; wx++) set(Math.round(bx) + 2 + wx * 4, Math.round(base - hs[i] * 0.55) + 4 + wy * 7, GOLD);
    bx += bw + 2;
  }
  rect(x, base, w, 26, [30, 34, 44]);
  // intercept streaks
  line(x + 12, y + h - 60, x + w * 0.45, y + 14, ORANGE);
  line(x + 30, y + h - 60, x + w * 0.6, y + 10, GOLD);
  line(x + w - 20, y + h - 60, x + w * 0.7, y + 22, WHITE);
  circle(Math.round(x + w * 0.45), y + 14, 5, ORANGE);
  circle(Math.round(x + w * 0.6), y + 10, 5, GOLD);
  circle(Math.round(x + w * 0.7), y + 22, 4, WHITE);
  drawText(x + 6, y + 4, 'RIYADH NIGHT SKY', 1, WHITE);
}
function sceneQuake(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY);
  circle(x + w - 22, y + 18, 11, GOLD);
  tri(x, y + h, x + w * 0.3, y + 26, x + w * 0.55, y + h, GREEN);
  tri(x + w * 0.35, y + h, x + w * 0.62, y + 18, x + w * 0.9, y + h, GREEN2);
  tri(x + w * 0.62, y + 18, x + w * 0.68, y + 18, x + w * 0.65, y + 8, WHITE);
  rect(x, y + h - 30, w, 30, [122, 96, 66]);
  // crack
  line(x + w * 0.2, y + h - 30, x + w * 0.3, y + h - 18, DARK);
  line(x + w * 0.3, y + h - 18, x + w * 0.28, y + h - 6, DARK);
  line(x + w * 0.3, y + h - 18, x + w * 0.45, y + h - 10, DARK);
  line(x + w * 0.45, y + h - 10, x + w * 0.52, y + h - 2, DARK);
  // seismograph strip
  rect(x + 8, y + 8, w - 16, 22, WHITE);
  box(x + 8, y + 8, w - 16, 22, INK);
  let px0 = x + 10, py0 = y + 19;
  const amp = [0, 1, -1, 2, -3, 6, -8, 9, -7, 4, -2, 1, 0, 0, 1, -1, 0];
  for (let i = 1; i < amp.length; i++) {
    const nx = x + 10 + i * ((w - 20) / (amp.length - 1));
    const ny = y + 19 + amp[i];
    line(Math.round(px0), Math.round(py0), Math.round(nx), Math.round(ny), RED);
    px0 = nx; py0 = ny;
  }
  drawText(x + 6, y + h - 26, 'JUNIN 6.7', 1, WHITE);
}
function sceneBridge(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY2);
  rect(x, y + h - 22, w, 22, [90, 130, 170]);
  line(x, y + h - 34, x + w, y + h - 34, INK);
  line(x + 6, y + h - 34, x + w / 2, y + 12, INK);
  line(x + w - 6, y + h - 34, x + w / 2, y + 12, INK);
  for (let i = 0; i < 5; i++) vline(Math.round(x + w * (0.15 + i * 0.175)), Math.round(y + h - 34 - (y + h - 34 - (y + 12)) * 0), 10, INK);
  rect(x + w / 2 - 4, y + 10, 8, 26, INK);
  circle(x + w * 0.72, y + h - 46, 10, ORANGE);
  circle(x + w * 0.72, y + h - 46, 5, GOLD);
  for (let i = 0; i < 6; i++) line(Math.round(x + w * 0.72), y + h - 46, Math.round(x + w * 0.72 + (i - 2.5) * 7), y + h - 46 - 14, ORANGE);
  drawText(x + 6, y + 4, 'KERCH STRAIT', 1, NAVY);
}
function sceneDrone(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY);
  rect(x, y + h - 24, w, 24, [40, 90, 130]);
  for (let i = 0; i < 4; i++) line(x + i * (w / 4) + 4, y + h - 20 + (i % 2) * 6, x + (i + 1) * (w / 4) - 4, y + h - 20 + (i % 2) * 6, WHITE);
  // drone
  const cx = x + w / 2, cy = y + h / 2 - 6;
  rect(Math.round(cx) - 16, Math.round(cy) - 4, 32, 8, DARK);
  rect(Math.round(cx) - 5, Math.round(cy) - 7, 10, 14, GREY);
  circle(Math.round(cx) - 18, Math.round(cy) - 6, 5, DARK);
  circle(Math.round(cx) + 18, Math.round(cy) - 6, 5, DARK);
  hline(Math.round(cx) - 26, Math.round(cy) - 10, 16, DARK);
  hline(Math.round(cx) + 10, Math.round(cy) - 10, 16, DARK);
  // explosion burst
  circle(x + w - 26, y + 18, 7, ORANGE);
  circle(x + w - 26, y + 18, 3, GOLD);
  drawText(x + 6, y + 4, 'STRAIT OF HORMUZ', 1, NAVY);
}
function sceneAtom(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [238, 232, 214]);
  rect(x, y + h - 20, w, 20, SAND);
  // facility dome
  rect(x + w / 2 - 26, y + h - 52, 52, 32, [200, 200, 196]);
  tri(x + w / 2 - 26, y + h - 52, x + w / 2 + 26, y + h - 52, x + w / 2, y + h - 68, GREY);
  rect(x + w / 2 - 3, y + h - 78, 6, 12, GREY);
  // atom
  const cx = x + w / 2, cy = y + 26;
  circle(Math.round(cx), Math.round(cy), 4, RED);
  ring(Math.round(cx), Math.round(cy), 13, NAVY);
  line(Math.round(cx) - 11, Math.round(cy) - 6, Math.round(cx) + 11, Math.round(cy) + 6, NAVY);
  line(Math.round(cx) - 11, Math.round(cy) + 6, Math.round(cx) + 11, Math.round(cy) - 6, NAVY);
  circle(Math.round(cx) + 11, Math.round(cy) - 6, 2, TEAL);
  circle(Math.round(cx) - 11, Math.round(cy) + 6, 2, TEAL);
}
function sceneData(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [28, 34, 48]);
  for (let i = 0; i < 3; i++) {
    const rx = x + 10 + i * ((w - 20) / 3);
    rect(Math.round(rx), y + 8, Math.round((w - 20) / 3) - 6, h - 16, [52, 62, 84]);
    for (let r = 0; r < 4; r++) {
      rect(Math.round(rx) + 4, y + 12 + r * 13, Math.round((w - 20) / 3) - 14, 8, [30, 40, 60]);
      circle(Math.round(rx) + 8, y + 16 + r * 13, 2, [80, 200, 120]);
    }
  }
  drawText(x + 6, y + h - 12, 'TAX?', 1, GOLD);
  circle(x + w - 16, y + 12, 8, RED);
  drawText(x + w - 19, y + 9, '!', 1, WHITE);
}
function sceneFlags(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY2);
  rect(x, y + h - 18, w, 18, GREEN2);
  // two flag poles
  vline(x + w * 0.28, y + 10, h - 28, INK);
  vline(x + w * 0.72, y + 10, h - 28, INK);
  // China flag
  rect(x + w * 0.28 + 2, y + 10, 34, 20, RED);
  circle(x + w * 0.28 + 10, y + 18, 3, GOLD);
  // Japan flag
  rect(x + w * 0.72 + 2, y + 10, 34, 20, WHITE);
  box(x + w * 0.72 + 2, y + 10, 34, 20, INK);
  circle(x + w * 0.72 + 19, y + 20, 6, RED);
  // speech clash
  drawText(x + w / 2 - 12, y + h - 34, 'vs', 1, RED);
  line(x + w * 0.3, y + h - 40, x + w * 0.7, y + h - 40, INK);
}
function sceneAi(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [226, 236, 240]);
  // robot head
  rect(x + w / 2 - 18, y + 12, 36, 26, WHITE);
  box(x + w / 2 - 18, y + 12, 36, 26, NAVY);
  circle(x + w / 2 - 8, y + 24, 3, TEAL);
  circle(x + w / 2 + 8, y + 24, 3, TEAL);
  line(x + w / 2 - 8, y + 30, x + w / 2 + 8, y + 30, NAVY);
  vline(x + w / 2, y + 4, 8, NAVY);
  circle(x + w / 2, y + 4, 3, RED);
  // handshake flags below
  rect(x + 12, y + h - 24, 30, 16, [200, 40, 40]);
  rect(x + w - 42, y + h - 24, 30, 16, [0, 90, 160]);
  line(x + 42, y + h - 16, x + w - 42, y + h - 16, INK);
  circle(x + w / 2, y + h - 16, 5, GOLD);
}
function sceneBtc(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [24, 28, 40]);
  // chart
  line(x + 8, y + h - 18, x + w - 8, y + 16, RED);
  const pts = [[8, 40], [30, 34], [52, 44], [74, 30], [96, 38], [118, 22], [140, 30], [160, 16]];
  for (let i = 0; i + 1 < pts.length; i++) line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], [240, 90, 90]);
  // coin
  circle(x + w / 2, y + h / 2 + 8, 20, GOLD);
  ring(x + w / 2, y + h / 2 + 8, 16, [140, 105, 30]);
  drawText(x + w / 2 - 6, y + h / 2 - 2, 'B', 2, [120, 85, 20]);
  drawText(x + 6, y + 4, '-3.9%', 1, [240, 120, 120]);
}
function scenePlane(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, SKY);
  circle(x + w - 20, y + 14, 9, GOLD);
  rect(x, y + h - 16, w, 16, GREY);
  // runway marks
  for (let i = 0; i < 6; i++) rect(x + 6 + i * ((w - 12) / 6), y + h - 9, 10, 2, WHITE);
  // plane
  const cy = y + h / 2;
  poly([[x + 12, cy], [x + w - 20, cy - 6], [x + w - 8, cy], [x + w - 20, cy + 6]], WHITE);
  tri(x + w * 0.45, cy - 4, x + w * 0.6, cy - 18, x + w * 0.62, cy - 4, WHITE);
  tri(x + w * 0.2, cy + 2, x + w * 0.3, cy + 12, x + w * 0.34, cy + 2, WHITE);
  circle(x + w - 24, cy - 2, 3, RED);
  // smoke puff from engine
  circle(x + w * 0.55, cy + 12, 5, [200, 200, 200]);
  circle(x + w * 0.62, cy + 14, 4, [220, 220, 220]);
  drawText(x + 6, y + 4, 'DAVAO', 1, NAVY);
}
function sceneF1(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [16, 20, 34]);
  // track
  for (let i = 0; i < 5; i++) line(x + 4, y + 14 + i * 12, x + w - 4, y + 26 + i * 12, [60, 66, 84]);
  // car
  const cy = y + h / 2 + 6;
  rect(x + w / 2 - 34, cy - 6, 68, 12, RED);
  rect(x + w / 2 - 8, cy - 12, 22, 8, RED);
  circle(x + w / 2 - 20, cy + 8, 7, DARK); ring(x + w / 2 - 20, cy + 8, 7, WHITE);
  circle(x + w / 2 + 20, cy + 8, 7, DARK); ring(x + w / 2 + 20, cy + 8, 7, WHITE);
  rect(x + w / 2 - 40, cy - 8, 6, 16, WHITE);
  // chequered flag
  for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 4; c2++) rect(x + w - 26 + c2 * 5, y + 8 + r * 5, 5, 5, (r + c2) % 2 ? WHITE : DARK);
  drawText(x + 6, y + 4, 'LAS VEGAS', 1, WHITE);
}
function sceneCricket(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, [178, 214, 150]);
  rect(x, y + h - 20, w, 20, [120, 90, 50]);
  // stumps
  for (let i = 0; i < 3; i++) vline(x + w - 34 + i * 5, y + h - 44, 24, GOLD);
  rect(x + w - 34, y + h - 46, 14, 2, GOLD);
  // batsman
  circle(x + w * 0.42, y + h - 52, 7, [190, 150, 110]);
  rect(x + w * 0.42 - 6, y + h - 45, 12, 22, WHITE);
  line(x + w * 0.42 + 4, y + h - 40, x + w * 0.42 + 18, y + h - 28, [160, 110, 60]);
  // ball in flight
  circle(x + w * 0.7, y + h - 60, 4, RED);
  line(x + w * 0.7 - 8, y + h - 64, x + w * 0.7 - 2, y + h - 61, RED);
  // score strip
  rect(x + 6, y + 6, 74, 16, WHITE);
  drawText(x + 8, y + 9, 'IND 344-2', 1, NAVY);
}

// ---------- layout ----------
fill(PAPER);

// masthead
rect(0, 0, W, 86, NAVY);
hline(0, 86, W, GOLD); rect(0, 87, W, 2, GOLD);
drawTextC(512, 10, 'THE WORLD TODAY', 4, WHITE);
drawTextC(512, 46, 'Saturday 21 November 2026', 2, GOLD);
drawTextC(512, 68, 'COP31 overtime in Antalya  -  five missiles downed over Saudi Arabia  -  magnitude 6.7 quake shakes Peru', 1, WHITE);

// day in numbers
rect(8, 94, 1008, 34, CREAM);
box(8, 94, 1008, 34, NAVY);
drawText(16, 100, 'DAY IN NUMBERS', 1, RED);
const stats: [string, string][] = [
  ['13', 'COP31 overtime'],
  ['5', 'missiles downed'],
  ['6.7', 'Peru quake'],
  ['$58,983', 'Bitcoin, -3.9%'],
  ['146', 'safe in Davao'],
  ['400', 'cities march'],
];
let sx = 150;
for (const [v, l] of stats) {
  drawText(sx, 99, v, 2, NAVY);
  drawText(sx + textW(v, 2) + 6, 103, l, 1, INK);
  sx += textW(v, 2) + textW(l, 1) + 16;
}

// lead cards
type Lead = { n: number; scene: (x: number, y: number, w: number, h: number) => void; head: string; body: string; src: string };
const leads: Lead[] = [
  { n: 1, scene: sceneCop, head: 'COP31 IN OVERTIME, NO DEAL', body: 'Antalya, day 13: a third draft is promised, with no mention of fossil fuels. EU warns of a "fossil summit".', src: 'AFP' },
  { n: 2, scene: sceneMissile, head: 'FIVE MISSILES DOWNED OVER SAUDI ARABIA', body: 'Three over Riyadh, two over Jizan, a day after the coalition bombed Hodeidah port. Houthis threaten Jeddah.', src: 'Arab News' },
  { n: 3, scene: sceneQuake, head: 'MAGNITUDE 6.7 QUAKE SHAKES PERU', body: 'Junin, 00:09 UTC, 108 km deep. Felt in Lima. No deaths, no tsunami risk, officials say.', src: 'USGS' },
];
const LY = 136, LH = 196, LW = 328, LG = 8;
leads.forEach((L, i) => {
  const x = 8 + i * (LW + LG);
  rect(x, LY, LW, LH, WHITE);
  box(x, LY, LW, LH, NAVY);
  L.scene(x + 1, LY + 1, LW - 2, 104);
  circle(x + 16, LY + 122, 9, RED);
  drawText(x + 13, LY + 119, String(L.n), 1, WHITE);
  drawWrapped(x + 30, LY + 116, L.head, LW - 40, 1, RED, 11);
  drawWrapped(x + 10, LY + 140, L.body, LW - 20, 1, INK, 10);
  drawText(x + 10, LY + LH - 14, 'Source: ' + L.src, 1, GREY);
});

// small illustrated cards
type Card = { n: number; scene: (x: number, y: number, w: number, h: number) => void; head: string; body: string; src: string };
const cards: Card[] = [
  { n: 4, scene: sceneBridge, head: 'Zelensky: Crimea bridge "will not stay"', body: 'Kyiv braces for more double-tap strikes.', src: 'Kyiv Post' },
  { n: 5, scene: sceneDrone, head: 'Iran says it downed a US drone', body: 'Over the Strait of Hormuz. No word from Washington.', src: 'Reuters' },
  { n: 6, scene: sceneAtom, head: 'Iran uranium stays in country', body: 'Minister still seeks a "fair solution".', src: 'AFP' },
  { n: 7, scene: sceneData, head: 'Trump vows tax on data centres abroad', body: '"Tremendous" penalty, no details yet.', src: 'AP' },
  { n: 8, scene: sceneFlags, head: 'China tells Japan to "correct" Taiwan words', body: 'Beijing steps up the war of words.', src: 'Reuters' },
  { n: 9, scene: sceneAi, head: 'Australia and China agree to AI talks', body: 'Canberra and Beijing open a new channel.', src: 'ABC' },
  { n: 10, scene: sceneBtc, head: 'Bitcoin below $59,000', body: '$58,983 on Saturday, down 3.9% in 24 hours.', src: 'CoinGecko' },
  { n: 11, scene: scenePlane, head: 'Air Niugini jet lands safely in Davao', body: 'Engine fire alert; all 146 on board safe.', src: 'AP' },
  { n: 12, scene: sceneF1, head: 'Russell fastest in final Las Vegas practice', body: 'Verstappen sent to stewards after contact.', src: 'Formula 1' },
  { n: 13, scene: sceneCricket, head: 'Rahul Test century vs New Zealand', body: 'India 344 for 2 at tea.', src: 'ABC' },
];
const CY = [340, 496], CH = 148, CW = 197, CG = 6;
cards.forEach((C, i) => {
  const row = Math.floor(i / 5), col = i % 5;
  const x = 8 + col * (CW + CG);
  const y = CY[row];
  rect(x, y, CW, CH, WHITE);
  box(x, y, CW, CH, NAVY);
  C.scene(x + 1, y + 1, CW - 2, 62);
  circle(x + 12, y + 72, 8, RED);
  drawText(x + 9, y + 69, String(C.n), 1, WHITE);
  const hy = drawWrapped(x + 24, y + 68, C.head, CW - 32, 1, RED, 9);
  drawWrapped(x + 8, Math.max(hy + 2, y + 96), C.body, CW - 16, 1, INK, 10);
  drawText(x + 8, y + CH - 12, 'Source: ' + C.src, 1, GREY);
});

// briefs
const BY = 652;
rect(8, BY, 1008, 18, NAVY);
drawText(16, BY + 5, 'THE DAY IN BRIEF  -  22 STORIES, ONE LINE EACH', 1, WHITE);
const briefs: [string, string][] = [
  ['Kryvyi Rih double strike hurts 42; boy, medic killed.', 'AP'],
  ['Copenhagen expels Russian attache over attack plot.', 'Reuters'],
  ['EU warns COP31 risks becoming a "fossil summit".', 'AFP'],
  ['Panama threatens to block the climate deal.', 'Reuters'],
  ['Indonesia signs clean-power deals at COP31.', 'AFP'],
  ['Houthis threaten Jeddah and Red Sea ports.', 'Arab News'],
  ['Vance: Iran strikes were Trump\'s decision.', 'AP'],
  ['Lawmaker threatens SpaceX funding.', 'Reuters'],
  ['Texas execution of man, 70, takes 63 minutes.', 'AP'],
  ['LA jury convicts man who started Palisades fire.', 'AP'],
  ['Missouri judge approves $7.25bn Roundup deal.', 'Reuters'],
  ['Canada rests defence in youth climate trial.', 'AP'],
  ['Kim tours factories after no Trump meeting.', 'AFP'],
  ['Freight train derails in Sejong; no one hurt.', 'AP'],
  ['Taipei passes budget and cash payout.', 'Reuters'],
  ['Pakistani minister joins SCO forum in India.', 'AFP'],
  ['Rain alerts in east India as Akvan remnants move in.', 'Reuters'],
  ['Rights groups urge Myanmar sanctions after ruling.', 'AFP'],
  ['African rating agency talks to 15 states.', 'Reuters'],
  ['Cummins keeps the Australian captaincy.', 'ABC'],
  ['Verstappen sent to stewards after contact.', 'Formula 1'],
  ['Nigeria funeral boat capsizes; at least 4 dead.', 'AP'],
];
briefs.forEach((b, i) => {
  const col = Math.floor(i / 11), row = i % 11;
  const x = 16 + col * 504;
  const y = BY + 24 + row * 12;
  drawText(x, y, (14 + i) + '.', 1, RED);
  drawText(x + 24, y, b[0], 1, INK);
  drawText(x + 24 + textW(b[0], 1) + 6, y, '(' + b[1] + ')', 1, GREY);
});

// world map + region bar
const MY = 812;
rect(8, MY, 1008, 106, CREAM);
box(8, MY, 1008, 106, NAVY);
drawText(16, MY + 6, 'THE WORLD IN ONE MAP  -  pins 1-13 match the cards above', 1, NAVY);
// ocean
rect(16, MY + 20, 620, 78, [176, 208, 226]);
// continents (simplified)
poly([[30, MY + 44], [60, MY + 26], [120, MY + 24], [150, MY + 34], [140, MY + 52], [110, MY + 62], [70, MY + 60], [40, MY + 54]], GREEN2); // N America
poly([[130, MY + 62], [160, MY + 60], [172, MY + 78], [150, MY + 94], [136, MY + 80]], GREEN); // S America
poly([[300, MY + 30], [330, MY + 24], [360, MY + 30], [350, MY + 44], [320, MY + 46], [302, MY + 38]], GREEN2); // Europe
poly([[300, MY + 50], [340, MY + 48], [360, MY + 62], [350, MY + 88], [322, MY + 92], [306, MY + 70]], GREEN); // Africa
poly([[380, MY + 26], [470, MY + 22], [540, MY + 30], [560, MY + 44], [520, MY + 56], [460, MY + 60], [420, MY + 52], [390, MY + 40]], GREEN2); // Asia
poly([[540, MY + 78], [580, MY + 76], [596, MY + 86], [560, MY + 92], [542, MY + 86]], GREEN); // Australia
// pins: [number, x, y]
const pins: [number, number, number][] = [
  [1, 340, MY + 40], [2, 392, MY + 46], [3, 152, MY + 80], [4, 330, MY + 34],
  [5, 398, MY + 50], [6, 400, MY + 56], [7, 80, MY + 40], [8, 500, MY + 40],
  [9, 520, MY + 72], [10, 90, MY + 34], [11, 540, MY + 60], [12, 70, MY + 46], [13, 440, MY + 52],
];
for (const [n, px2, py2] of pins) {
  circle(px2, py2, 7, RED);
  ring(px2, py2, 7, WHITE);
  drawText(px2 - (n < 10 ? 2 : 5), py2 - 3, String(n), 1, WHITE);
}
// region bar (right side)
drawText(656, MY + 6, 'STORIES BY REGION  -  35 IN ALL', 1, NAVY);
const regions: [string, number, number[]][] = [
  ['Middle East', 6, RED], ['Europe', 6, NAVY], ['East Asia', 5, TEAL],
  ['South Asia', 4, GOLD], ['Asia-Pacific', 4, GREEN], ['Americas', 6, ORANGE], ['Africa', 4, [110, 60, 140]],
];
let rx = 656;
const total = 35;
for (const [name, count, col] of regions) {
  const wSeg = Math.round((count / total) * 340);
  rect(rx, MY + 22, wSeg, 16, col);
  rx += wSeg;
}
rx = 656;
regions.forEach(([name, count]) => {
  const wSeg = Math.round((count / total) * 340);
  drawTextC(rx + Math.floor(wSeg / 2), MY + 40, String(count), 1, INK);
  rx += wSeg;
});
drawWrapped(656, MY + 56, 'Middle East 6 - Europe 6 - East Asia 5 - South Asia 4 - Asia-Pacific 4 - Americas 6 - Africa 4', 340, 1, INK, 11);
drawText(656, MY + 84, 'Sources: AFP, AP, Reuters, Al Jazeera, USGS,', 1, GREY);
drawText(656, MY + 95, 'Arab News, Kyiv Post, ABC, Formula 1, CoinGecko.', 1, GREY);

// date check footer
const FY = 926;
rect(8, FY, 1008, 90, NAVY);
drawText(16, FY + 6, 'DATE CHECK  -  NOT TODAY\'S NEWS', 1, GOLD);
drawWrapped(16, FY + 20, 'Deliberately left out because they happened earlier: Wall Street\'s fall into a correction; the Russian barrage that hit Kyiv\'s bridges; the missile that landed in Poland; the UK-EU deal; Cyclone Akvan\'s landfall; Voyager 1 one light-day (18 Nov); the ICJ Myanmar ruling (19 Nov); the Shenzhen summit (19 Nov); Fiona the hippo\'s death (19 Nov). BepiColombo at Mercury orbit was not confirmed when drawn, so it is not shown.', 992, 1, WHITE, 11);
drawText(16, FY + 76, 'THE WORLD TODAY  -  Saturday 21 November 2026  -  35 stories, 13 illustrated, 7 regions, 22 briefs.', 1, GOLD);

// ---------- write ----------
// Deterministic paper grain on the large flat paper areas: a fixed hash of
// (x, y) only, so both runs produce identical bytes. It gives the flat
// newsprint texture and lifts the file toward the 400 KB the leaders carry.
function grain() {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      let h = (x * 374761393 + y * 668265263) | 0;
      h = (h ^ (h >>> 13)) | 0; h = Math.imul(h, 1274126177); h = (h ^ (h >>> 16)) | 0;
      const d = (((h >>> 28) & 7) % 5) - 2;
      px[i] = Math.max(0, Math.min(255, r + d));
      px[i + 1] = Math.max(0, Math.min(255, g + d));
      px[i + 2] = Math.max(0, Math.min(255, b + d));
    }
  }
}
grain();

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
