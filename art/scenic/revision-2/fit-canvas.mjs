// Center-crop an image to the target aspect ratio, then resize to the exact
// target size and save as PNG. Usage:
//   node fit-canvas.mjs <input> <output> <width> <height>
import sharp from 'sharp';

const [, , input, output, w, h] = process.argv;
const W = Number(w);
const H = Number(h);
if (!input || !output || !W || !H) {
  console.error('usage: node fit-canvas.mjs <input> <output> <width> <height>');
  process.exit(1);
}

const meta = await sharp(input).metadata();
const targetAspect = W / H;
let cw = meta.width;
let ch = meta.height;
if (cw / ch > targetAspect) cw = Math.round(ch * targetAspect);
else ch = Math.round(cw / targetAspect);
const left = Math.round((meta.width - cw) / 2);
const top = Math.round((meta.height - ch) / 2);

await sharp(input)
  .extract({ left, top, width: cw, height: ch })
  .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
  .png()
  .toFile(output);
console.log(`${output} ${W}x${H} <= ${meta.width}x${meta.height} crop ${cw}x${ch} @${left},${top}`);
