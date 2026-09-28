// Verify generated scenic art: exact size, canvas-corner alpha, center alpha,
// and (for rivers) alpha at the diamond edge midpoints where water connects.
// Usage: node verify-art.mjs <file> <width> <height> <river|bridge>
import sharp from 'sharp';

const [, , file, w, h, kind] = process.argv;
const W = Number(w);
const H = Number(h);

const img = sharp(file);
const meta = await img.metadata();
const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const alphaAt = (x, y) => data[(Math.round(y) * info.width + Math.round(x)) * 4 + 3];
const regionAlpha = (cx, cy, r) => {
  let sum = 0;
  let n = 0;
  for (let y = Math.round(cy) - r; y <= Math.round(cy) + r; y++) {
    for (let x = Math.round(cx) - r; x <= Math.round(cx) + r; x++) {
      if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
      sum += alphaAt(x, y);
      n++;
    }
  }
  return n ? Math.round(sum / n) : 0;
};

const corners = [
  ['TL', 4, 4],
  ['TR', W - 5, 4],
  ['BL', 4, H - 5],
  ['BR', W - 5, H - 5],
];
const cornerAlpha = corners.map(([name, x, y]) => [name, regionAlpha(x, y, 2)]);

console.log(`${file}: ${meta.width}x${meta.height} (expect ${W}x${H})`);
console.log(`corner alpha: ${cornerAlpha.map(([n, a]) => `${n}=${a}`).join(' ')}`);
const sizeOk = meta.width === W && meta.height === H;
const cornersOk = cornerAlpha.every(([, a]) => a < 160);

if (kind === 'river') {
  const mid = {
    UL: [0.25 * W, 0.25 * H],
    UR: [0.75 * W, 0.25 * H],
    LL: [0.25 * W, 0.75 * H],
    LR: [0.75 * W, 0.75 * H],
  };
  const center = regionAlpha(W / 2, H / 2, 8);
  const mids = Object.entries(mid).map(([n, [x, y]]) => `${n}=${regionAlpha(x, y, 6)}`).join(' ');
  console.log(`center alpha=${center} (need >=128); edge-midpoint alpha: ${mids}`);
  console.log(sizeOk && cornersOk && center >= 128 ? 'PASS' : 'FAIL');
} else {
  const anchor = regionAlpha(W / 2, H * 0.75, 10);
  console.log(`anchor(0.5,0.75) alpha=${anchor} (need >=128)`);
  console.log(sizeOk && cornersOk && anchor >= 128 ? 'PASS' : 'FAIL');
}
