/** Build art/scenic/reviews/contact-sheet.png from the exported scenic pack. */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '../../..');
const pack = path.join(root, 'assets/resources/art-packs/scenic');
const out = path.join(import.meta.dirname, 'contact-sheet.png');
const manifest = JSON.parse(fs.readFileSync(path.join(pack, 'manifest.json'), 'utf8'));
const slots = Object.entries(manifest.images);

const cols = 5, cw = 300, ch = 300, labelH = 46;
const rows = Math.ceil(slots.length / cols);
const composites = [];
for (let i = 0; i < slots.length; i++) {
  const [slot, img] = slots[i];
  const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
  const thumb = await sharp(path.join(pack, img.file))
    .resize(cw - 24, ch - labelH - 16, { fit: 'inside', withoutEnlargement: true })
    .png().toBuffer();
  const m = await sharp(thumb).metadata();
  composites.push({ input: thumb, left: x + Math.round((cw - m.width) / 2), top: y + 8 + Math.round((ch - labelH - 16 - m.height) / 2) });
  const label = Buffer.from(`<svg width="${cw}" height="${labelH}" xmlns="http://www.w3.org/2000/svg">
    <text x="${cw / 2}" y="20" font-family="monospace" font-size="15" fill="#213d2c" text-anchor="middle">${slot}</text>
    <text x="${cw / 2}" y="40" font-family="monospace" font-size="12" fill="#75836f" text-anchor="middle">${img.width}×${img.height} @ [${img.anchor.join(', ')}]</text></svg>`);
  composites.push({ input: label, left: x, top: y + ch - labelH });
}
await sharp({
  create: { width: cols * cw, height: rows * ch, channels: 4, background: '#e9e3d0' }
}).composite(composites).png({ compressionLevel: 9 }).toFile(out);
console.log('contact sheet ->', path.relative(root, out), `${slots.length} slots`);
