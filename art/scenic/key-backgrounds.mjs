/**
 * One-off / reusable source preparation: color-key solid backgrounds in
 * art/scenic/sources to transparency with a feathered edge.
 * process-scenic-art.mjs only VALIDATES transparency — this script creates it.
 * Usage: node art/scenic/key-backgrounds.mjs
 */
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve(import.meta.dirname, 'sources');

function sample(buf, info, fx, fy) {
  const x = Math.round(fx * (info.width - 1)), y = Math.round(fy * (info.height - 1));
  const i = (y * info.width + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}

// keys: [{color:[r,g,b]|'corner'|'center', t0, t1}] — pixels within t0 of any key color
// become transparent, beyond t1 stay opaque, feathered in between.
async function keyOut(file, keys) {
  const p = path.join(dir, file);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const resolved = keys.map(k => ({
    ...k,
    color: k.color === 'corner' ? sample(data, info, 0.005, 0.005)
         : k.color === 'center' ? sample(data, info, 0.5, 0.5) : k.color
  }));
  for (let i = 0; i < data.length; i += 4) {
    let keep = 1;
    for (const k of resolved) {
      const d = Math.hypot(data[i] - k.color[0], data[i + 1] - k.color[1], data[i + 2] - k.color[2]);
      keep = Math.min(keep, Math.min(1, Math.max(0, (d - k.t0) / (k.t1 - k.t0))));
    }
    data[i + 3] = Math.min(data[i + 3], Math.round(keep * 255));
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 }).toFile(p);
  console.log('keyed:', file, resolved.map(k => k.color.join(',')).join(' | '));
}

await keyOut('field-soil-dry.png', [{ color: 'corner', t0: 18, t1: 48 }]);
await keyOut('field-ridge.png', [{ color: 'corner', t0: 18, t1: 48 }, { color: 'center', t0: 14, t1: 40 }]);
await keyOut('crop-wheat-growing.png', [{ color: 'corner', t0: 20, t1: 50 }]);
await keyOut('env-flowers.png', [{ color: 'corner', t0: 20, t1: 52 }]);
await keyOut('crop-default-growing.png', [{ color: [242, 242, 238], t0: 24, t1: 56 }]);
