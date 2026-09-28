import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const recordDir = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(process.argv[2] ?? join(recordDir, 'raw/field-unknown.png'));
const outputPath = resolve(join(recordDir, '../sources/field-unknown.png'));
const canvasWidth = 456;
const canvasHeight = 284;
const alphaScale = 1.15;
const threshold = 6;

const { data: blackComposite, info } = await sharp(inputPath)
  .flatten({ background: '#000000' })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
const bounds = { left: info.width, top: info.height, right: -1, bottom: -1 };

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const source = (y * info.width + x) * info.channels;
    const target = (y * info.width + x) * 4;
    const baseAlpha = Math.max(blackComposite[source], blackComposite[source + 1], blackComposite[source + 2]);
    if (baseAlpha === 0) continue;
    for (let channel = 0; channel < 3; channel++) {
      rgba[target + channel] = Math.min(255, Math.round(blackComposite[source + channel] * 255 / baseAlpha));
    }
    const alpha = Math.min(255, Math.round(baseAlpha * alphaScale));
    rgba[target + 3] = alpha;
    if (alpha > threshold) {
      bounds.left = Math.min(bounds.left, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.right = Math.max(bounds.right, x);
      bounds.bottom = Math.max(bounds.bottom, y);
    }
  }
}

if (bounds.right < 0) throw new Error('No mist pixels exceeded the alpha threshold.');
const cropWidth = bounds.right - bounds.left + 1;
const cropHeight = bounds.bottom - bounds.top + 1;
const aspect = cropWidth / cropHeight;
if (Math.abs(aspect - 1.61) > 0.12) {
  throw new Error(`Mist aspect ${aspect.toFixed(3)} is too far from 1.61; regenerate.`);
}
const cropped = sharp(rgba, {
  raw: { width: info.width, height: info.height, channels: 4 },
}).extract({ left: bounds.left, top: bounds.top, width: cropWidth, height: cropHeight });
const resized = aspect >= canvasWidth / canvasHeight
  ? cropped.resize({ width: canvasWidth, kernel: 'lanczos3' })
  : cropped.resize({ height: canvasHeight, kernel: 'lanczos3' });
const { data: mist, info: resizedInfo } = await resized.png().toBuffer({ resolveWithObject: true });
await sharp({
  create: {
    width: canvasWidth,
    height: canvasHeight,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
}).composite([{
  input: mist,
  left: Math.floor((canvasWidth - resizedInfo.width) / 2),
  top: Math.floor((canvasHeight - resizedInfo.height) / 2),
}]).png().toFile(outputPath);

console.log(JSON.stringify({ inputPath, outputPath, crop: bounds, aspect, resized: [resizedInfo.width, resizedInfo.height], alphaMethod: 'max RGB after flattening on black', alphaScale }, null, 2));
