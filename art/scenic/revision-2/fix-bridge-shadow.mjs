// Neutralize the bridge sprite's shadow and stray red pixels in place:
// - greenish painted pixels (the model's grass-green shadow blob) become a
//   neutral warm dark shadow color, alpha preserved;
// - strongly red pixels (rail artifacts) become wood brown.
// Usage: node fix-bridge-shadow.mjs <file>
import sharp from 'sharp';

const [, , file] = process.argv;
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let shadow = 0;
let red = 0;
for (let i = 0; i < info.width * info.height; i++) {
  const o = i * 4;
  const r = data[o];
  const g = data[o + 1];
  const b = data[o + 2];
  const a = data[o + 3];
  if (a === 0) continue;
  if (g > r + 6 && g > b + 6) {
    data[o] = 43;
    data[o + 1] = 38;
    data[o + 2] = 33;
    data[o + 3] = Math.min(a, 170);
    shadow++;
  } else if (r > 140 && g < 100 && b < 90) {
    data[o] = 122;
    data[o + 1] = 90;
    data[o + 2] = 58;
    red++;
  }
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(file);
console.log(`${file}: neutralized ${shadow} green-shadow px, ${red} red px`);
