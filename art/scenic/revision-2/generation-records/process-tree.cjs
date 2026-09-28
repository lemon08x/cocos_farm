const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(__dirname, 'raw', 'env-tree-canopy-raw.png');
const output = path.join(root, 'sources', 'env-tree-canopy.png');
const canvasWidth = 360;
const canvasHeight = 480;
const trunkBaseY = 442;

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

async function main() {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const distance = Math.hypot(255 - red, green, 255 - blue);
      const distanceFraction = Math.max(0, Math.min(1, (distance - 60) / 100));
      const magentaExcess = Math.min(red - green, blue - green);
      const spillFraction = magentaExcess > 8
        ? Math.max(0, 1 - (magentaExcess - 8) / 212)
        : 1;
      const fraction = Math.min(distanceFraction, spillFraction);
      const alpha = clamp(255 * fraction);

      if (alpha === 0) {
        data.fill(0, index, index + 4);
        continue;
      }

      if (alpha < 255) {
        const opacity = alpha / 255;
        const uncovered = 1 - opacity;
        let cleanRed = clamp((red - uncovered * 245) / opacity);
        const cleanGreen = clamp((green - uncovered * 12) / opacity);
        let cleanBlue = clamp((blue - uncovered * 245) / opacity);
        const despill = Math.max(uncovered * 0.65, Math.min(0.7, magentaExcess / 120));
        cleanRed -= Math.max(0, cleanRed - cleanGreen) * despill;
        cleanBlue -= Math.max(0, cleanBlue - cleanGreen) * despill;
        data[index] = clamp(cleanRed);
        data[index + 1] = cleanGreen;
        data[index + 2] = clamp(cleanBlue);
        data[index + 3] = alpha;
      }

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  const width = right - left + 1;
  const height = bottom - top + 1;
  if (width <= 0 || height <= 0) throw new Error('No tree pixels survived chroma keying');
  const scale = Math.min(348 / width, 433 / height);
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);
  const x = Math.round((canvasWidth - resizedWidth) / 2);
  const y = trunkBaseY - resizedHeight + 1;
  if (y < 0) throw new Error('Tree does not fit above the trunk anchor');

  const tree = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).extract({ left, top, width, height }).resize(resizedWidth, resizedHeight).png().toBuffer();

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: tree, left: x, top: y }]).png().toFile(output);

  console.log(JSON.stringify({ source: { width: info.width, height: info.height }, bounds: { left, top, right, bottom }, placed: { x, y, width: resizedWidth, height: resizedHeight, trunkBaseY }, output }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
