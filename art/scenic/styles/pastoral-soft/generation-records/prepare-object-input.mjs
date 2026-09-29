import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Align generated object cutouts to the established runtime canvas and anchor.
// Only transparent padding, uniform scale, and placement change; the painting is retained.
const [id, inputPath, outputPath] = process.argv.slice(2);
const target = {
  'object.house': {width: 1200, height: 1080, centerX: 600, bottom: 700, maxWidth: 900, maxHeight: 710},
  'object.tree': {width: 600, height: 720, centerX: 300, bottom: 540, maxWidth: 400, maxHeight: 430},
}[id];
if (!target || !inputPath || !outputPath) throw new Error('用法：node prepare-object-input.mjs <object.house|object.tree> <AI原稿> <输出>');
const {data, info} = await sharp(path.resolve(inputPath)).ensureAlpha().raw().toBuffer({resolveWithObject: true});
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 64) {
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
}
if (right < left) throw new Error(`${id}: 原稿为空`);
left = Math.max(0, left - 1); top = Math.max(0, top - 1);
right = Math.min(info.width - 1, right + 1); bottom = Math.min(info.height - 1, bottom + 1);
const width = right - left + 1, height = bottom - top + 1;
const scale = Math.min(target.maxWidth / width, target.maxHeight / height);
const outWidth = Math.round(width * scale), outHeight = Math.round(height * scale);
const extracted = await sharp(data, {raw: {width: info.width, height: info.height, channels: 4}})
  .extract({left, top, width, height}).resize(outWidth, outHeight, {kernel: 'lanczos3'}).png().toBuffer();
const outLeft = Math.round(target.centerX - outWidth / 2), outTop = target.bottom - outHeight;
await fs.mkdir(path.dirname(path.resolve(outputPath)), {recursive: true});
await sharp({create: {width: target.width, height: target.height, channels: 4, background: '#00000000'}})
  .composite([{input: extracted, left: outLeft, top: outTop}]).png().toFile(path.resolve(outputPath));
console.log(`${id}: 原稿内容 ${left},${top},${width},${height} -> ${outWidth}x${outHeight} at ${outLeft},${outTop}`);
