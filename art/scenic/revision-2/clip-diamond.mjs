// Clip a river sprite's alpha to the cell diamond (corners at the canvas edge
// midpoints). Removes any painted spill outside the cell so tiles composite
// cleanly. Usage: node clip-diamond.mjs <file> <width> <height>
import sharp from 'sharp';

const [, , file, w, h] = process.argv;
const W = Number(w);
const H = Number(h);
const SS = 4; // supersample for smooth diamond edges
const svg = `<svg width="${W * SS}" height="${H * SS}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${W * SS / 2},${SS} ${W * SS - SS},${H * SS / 2} ${W * SS / 2},${H * SS - SS} ${SS},${H * SS / 2}" fill="#ffffff"/>
</svg>`;
const mask = await sharp(Buffer.from(svg)).resize(W, H).png().toBuffer();
const out = await sharp(file)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer();
await sharp(out).toFile(file);
console.log(`clipped ${file} to ${W}x${H} diamond`);
