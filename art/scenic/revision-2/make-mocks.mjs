// Render full-canvas MOCK sprites with the exact target geometry (2x final
// size). Mocks are fed to codex image_gen edit mode so the model only has to
// repaint style, not invent composition. Usage: node make-mocks.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'art/scenic/revision-2/templates';
mkdirSync(OUT, { recursive: true });

// deterministic pseudo-random
const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

// ---- river geometry on a 1200x720 canvas (= 2x the 600x360 target) ----
const W = 1200;
const H = 720;
const DIAMOND = '600,4 1196,360 600,716 4,360';
const f = (n) => Math.round(n * 10) / 10;

const defs = `<defs><clipPath id="cell"><polygon points="${DIAMOND}"/></clipPath></defs>`;
const bg = `<rect width="${W}" height="${H}" fill="#00ff00"/>`;

// band endpoints for each segment type
const SEG = {
  straight: { A: [300, 180], B: [900, 540] }, // UL -> LR (down-right)
  'straight-y': { A: [900, 180], B: [300, 540] }, // UR -> LL (down-left)
};
const WATER_HALF = 165; // 150-190px wide at 1x -> ~330 at 2x
const BANK_HALF = 365; // + ~100px grass each side at 1x

const straightSvg = (kind, seed) => {
  const rnd = lcg(seed);
  const { A, B } = SEG[kind];
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len = Math.hypot(dx, dy);
  const d = [dx / len, dy / len];
  const p = [-d[1], d[0]];
  const pt = (t, off) => [A[0] + dx * t + p[0] * off, A[1] + dy * t + p[1] * off];
  const poly = (half, grow) =>
    [pt(-grow, half), pt(1 + grow, half), pt(1 + grow, -half), pt(-grow, -half)]
      .map(([x, y]) => `${f(x)},${f(y)}`)
      .join(' ');
  const waterPoly = poly(WATER_HALF, 0.5);
  const bankPoly = poly(BANK_HALF, 0.5);

  let s = '';
  // banks
  s += `<clipPath id="banks"><polygon points="${bankPoly}"/></clipPath>`;
  s += `<g clip-path="url(#cell)"><polygon points="${bankPoly}" fill="#79ac63"/></g>`;
  // bank texture dots
  s += `<g clip-path="url(#banks)"><g clip-path="url(#cell)">`;
  for (let i = 0; i < 260; i++) {
    const t = rnd();
    const off = (rnd() * 2 - 1) * (BANK_HALF - 12);
    if (Math.abs(off) < WATER_HALF + 6) continue;
    const [x, y] = pt(t, off);
    const r = 2 + rnd() * 5;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${rnd() > 0.5 ? '#5d8f4c' : '#93c47d'}" opacity="0.8"/>`;
  }
  s += `</g></g>`;
  // stones along both waterlines
  for (let i = 0; i < 9; i++) {
    const t = 0.06 + (i / 9) * 0.88 + (rnd() - 0.5) * 0.04;
    const side = i % 2 === 0 ? 1 : -1;
    const off = side * (WATER_HALF + 14 + rnd() * 26);
    const [x, y] = pt(t, off);
    const rx = 12 + rnd() * 12;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.72)}" fill="#9a9a92"/>`;
    s += `<ellipse cx="${f(x)}" cy="${f(y + rx * 0.28)}" rx="${f(rx * 0.9)}" ry="${f(rx * 0.45)}" fill="#6f6f68" opacity="0.55"/>`;
  }
  // water base
  s += `<clipPath id="water"><polygon points="${waterPoly}"/></clipPath>`;
  s += `<g clip-path="url(#cell)"><polygon points="${waterPoly}" fill="#3ea6c2"/></g>`;
  // water edge shading + flow streaks
  s += `<g clip-path="url(#cell)"><g clip-path="url(#water)">`;
  s += `<polygon points="${poly(WATER_HALF, 0.5)}" fill="none" stroke="#256b7d" stroke-width="26" opacity="0.35"/>`;
  for (let off = -140; off <= 140; off += 18) {
    const w = 3 + rnd() * 6;
    const j1 = (rnd() - 0.5) * 30;
    const j2 = (rnd() - 0.5) * 30;
    const [x1, y1] = pt(-0.1, off + j1);
    const [x2, y2] = pt(1.1, off + j2);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${rnd() > 0.35 ? '#bfeaf2' : '#1f6f86'}" stroke-width="${f(w)}" opacity="${rnd() > 0.35 ? 0.4 : 0.25}"/>`;
  }
  s += `</g></g>`;
  return `${bg}${defs}${s}`;
};

// corner: annular bend centered on the left vertex (0,360), radius 350 (2x)
const cornerSvg = (seed) => {
  const rnd = lcg(seed);
  const C = [0, 360];
  const A0 = -Math.atan2(180, 300); // -31 deg
  const arc = (r, a) => `${f(C[0] + r * Math.cos(a))},${f(C[1] + r * Math.sin(a))}`;
  const arcPath = (r, a0, a1) => `M ${arc(r, a0)} A ${r},${r} 0 0 1 ${arc(r, a1)}`;
  let s = '';
  s += `<g clip-path="url(#cell)">`;
  s += `<path d="${arcPath(350, A0 - 0.35, -A0 + 0.35)}" stroke="#79ac63" stroke-width="${BANK_HALF * 2}" fill="none"/>`;
  s += `</g>`;
  // bank dots
  s += `<g clip-path="url(#cell)">`;
  for (let i = 0; i < 240; i++) {
    const a = A0 + rnd() * (-2 * A0);
    const r = 350 + (rnd() * 2 - 1) * (BANK_HALF - 14);
    if (Math.abs(r - 350) < WATER_HALF + 6) continue;
    const x = C[0] + r * Math.cos(a);
    const y = C[1] + r * Math.sin(a);
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2 + rnd() * 5)}" fill="${rnd() > 0.5 ? '#5d8f4c' : '#93c47d'}" opacity="0.8"/>`;
  }
  s += `</g>`;
  // stones
  for (let i = 0; i < 8; i++) {
    const a = A0 + 0.06 + rnd() * (-2 * A0 - 0.12);
    const side = i % 2 === 0 ? 1 : -1;
    const r = 350 + side * (WATER_HALF + 14 + rnd() * 24);
    const x = C[0] + r * Math.cos(a);
    const y = C[1] + r * Math.sin(a);
    const rx = 12 + rnd() * 12;
    s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.72)}" fill="#9a9a92"/>`;
  }
  // water
  s += `<g clip-path="url(#cell)"><path d="${arcPath(350, A0 - 0.3, -A0 + 0.3)}" stroke="#3ea6c2" stroke-width="${WATER_HALF * 2}" fill="none"/></g>`;
  // flow streak arcs lie inside the water band by construction (r = 350 +/- 140)
  for (let r = 350 - 140; r <= 350 + 140; r += 18) {
    const a1 = A0 - 0.05 + rnd() * 0.08;
    const a2 = -A0 + 0.05 - rnd() * 0.08;
    s += `<path d="${arcPath(r, a1, a2)}" stroke="${rnd() > 0.35 ? '#bfeaf2' : '#1f6f86'}" stroke-width="${f(3 + rnd() * 6)}" fill="none" opacity="${rnd() > 0.35 ? 0.4 : 0.25}"/>`;
  }
  return `${bg}${defs}${s}`;
};

const riverDoc = (inner) =>
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const mocks = [
  ['mock-env-river-straight.png', riverDoc(straightSvg('straight', 7))],
  ['mock-env-river-straight-y.png', riverDoc(straightSvg('straight-y', 19))],
  ['mock-env-river-corner.png', riverDoc(cornerSvg(31))],
];
for (const [name, svg] of mocks) {
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}`);
  console.log('wrote', `${OUT}/${name}`);
}

// ---- bridge mock on 1040x800 (= 2x the 520x400 target) ----
{
  const rnd = lcg(47);
  const BW = 1040;
  const BH = 800;
  const A = [0.7 * BW, 0.15 * BH]; // upper-right
  const B = [0.3 * BW, 0.85 * BH]; // lower-left
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len = Math.hypot(dx, dy);
  const d = [dx / len, dy / len];
  const p = [-d[1], d[0]];
  const pt = (t, off) => [A[0] + dx * t + p[0] * off, A[1] + dy * t + p[1] * off];
  const seg = (t0, t1, off) => {
    const [x1, y1] = pt(t0, off);
    const [x2, y2] = pt(t1, off);
    return `${f(x1)},${f(y1)} ${f(x2)},${f(y2)}`;
  };
  let s = `<rect width="${BW}" height="${BH}" fill="#00ff00"/>`;
  s += `<ellipse cx="${BW / 2}" cy="${BH * 0.75}" rx="250" ry="80" fill="#3a3a3a" opacity="0.5"/>`;
  // deck
  s += `<polygon points="${[pt(0, 95), pt(1, 95), pt(1, -95), pt(0, -95)].map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="#8a6b4a"/>`;
  // planks
  for (let t = 0.03; t < 1; t += 0.055) {
    const [x1, y1] = pt(t, 95);
    const [x2, y2] = pt(t, -95);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#6b4f33" stroke-width="5" opacity="0.7"/>`;
  }
  // rails
  for (const off of [-120, 120]) {
    const [x1, y1] = pt(-0.02, off);
    const [x2, y2] = pt(1.02, off);
    s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#7a5a3c" stroke-width="16"/>`;
  }
  // posts
  for (let t = 0.02; t <= 1; t += 0.24) {
    for (const off of [-120, 120]) {
      const [x, y] = pt(t, off);
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="${f(y - 46)}" stroke="#5f452b" stroke-width="12"/>`;
    }
  }
  const svg = `<svg width="${BW}" height="${BH}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/mock-env-bridge.png`);
  console.log('wrote', `${OUT}/mock-env-bridge.png`);
}
