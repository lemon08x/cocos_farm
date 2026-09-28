// Render geometry guide images for river/bridge generation with codex image_gen
// edit mode. Guides are drawn at 1536x1024 on flat #00ff00 with the active
// composition box and the exact band geometry used by the generation prompts.
// Usage: node make-guides.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const OUT = 'art/scenic/revision-2/templates';
mkdirSync(OUT, { recursive: true });

const W = 1536;
const H = 1024;
const DIAMOND = `768,152 1368,512 768,872 168,512`;

const END = {
  UL: [468, 332],
  UR: [1068, 332],
  LL: [468, 692],
  LR: [1068, 692],
};

const riverSvg = (band, endpoints) => `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#00ff00"/>
  <defs>
    <clipPath id="cell"><polygon points="${DIAMOND}"/></clipPath>
  </defs>
  <polygon points="${DIAMOND}" fill="#8a8a8a" opacity="0.55"/>
  <g clip-path="url(#cell)">
    ${band(560, '#7cb26b')}
    ${band(340, '#2e9bb8')}
  </g>
  ${endpoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="26" fill="#ff0000"/>`).join('')}
</svg>`;

const line = (a, b) => (width, color) =>
  `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}"/>`;

// The bend is an annular sector centered on the diamond's left vertex (168,512)
// with centerline radius 350: it passes through both left edge midpoints and
// enters/exits perpendicular to the cell edges.
const bend = (width, color) =>
  `<path d="M ${END.UL[0]},${END.UL[1]} A 350,350 0 0 1 ${END.LL[0]},${END.LL[1]}" stroke="${color}" stroke-width="${width}" fill="none"/>`;

const guides = [
  ['guide-env-river-straight.png', riverSvg(line(END.UL, END.LR), [END.UL, END.LR])],
  ['guide-env-river-straight-y.png', riverSvg(line(END.UR, END.LL), [END.UR, END.LL])],
  ['guide-env-river-corner.png', riverSvg(bend, [END.UL, END.LL])],
];

for (const [name, svg] of guides) {
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}`);
  console.log('wrote', `${OUT}/${name}`);
}

// Bridge guide: 13:10 active region (102,0)-(1434,1024), deck (70%,15%)->(30%,85%), shadow at (50%,75%).
const bx = 102;
const bw = 1332;
const deckA = [bx + 0.7 * bw, 0.15 * H];
const deckB = [bx + 0.3 * bw, 0.85 * H];
const shadowC = [bx + 0.5 * bw, 0.75 * H];
const bridgeSvg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#00ff00"/>
  <rect x="${bx}" y="0" width="${bw}" height="${H}" fill="none" stroke="#ffffff" stroke-width="4" stroke-dasharray="24 16"/>
  <ellipse cx="${shadowC[0]}" cy="${shadowC[1]}" rx="270" ry="95" fill="#333333" opacity="0.5"/>
  <line x1="${deckA[0]}" y1="${deckA[1]}" x2="${deckB[0]}" y2="${deckB[1]}" stroke="#8a6b4a" stroke-width="240" stroke-linecap="round" opacity="0.85"/>
</svg>`;
await sharp(Buffer.from(bridgeSvg)).png().toFile(`${OUT}/guide-env-bridge.png`);
console.log('wrote', `${OUT}/guide-env-bridge.png`);
