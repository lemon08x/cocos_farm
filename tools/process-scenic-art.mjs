/**
 * Scenic art pipeline: validate art/scenic/sources and export the runtime pack
 * into assets/resources/art-packs/scenic (PNGs + manifest.json + Cocos .meta).
 *
 * Rules enforced (art/scenic/SPEC.md):
 *  - sources are ~2x display size; aspect must match the slot within 4% —
 *    perspective art is NEVER stretched with fit:'fill' (cover only).
 *  - slots marked transparent must have transparent canvas corners;
 *    ground.base must be fully opaque.
 *  - missing / invalid sources fail the run with a full report.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'art/scenic/sources');
const outDir = path.join(root, 'assets/resources/art-packs/scenic');

const PALETTE = {
  ink: '#213d2c', muted: '#75836f', paper: '#f8f3e6', cream: '#eee4cb',
  green: '#2e5240', gold: '#d9a441', line: '#d9cfb4', status: '#7aa95c',
  caption: '#8a9478', disabled: '#b9bfae', warning: '#c96f3b', shade: '#1c3527',
  base: '#5f8a4e'
};

// display = zoom-1 size; exported PNG is 2x. alpha: diamond | edge | opaque
const SLOTS = [
  { slot: 'field.soil.dry',      src: 'field-soil-dry.png',      file: 'field-soil-dry.png',      w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond' },
  { slot: 'field.soil.wet',      src: 'field-soil-wet.png',      file: 'field-soil-wet.png',      w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond' },
  { slot: 'field.unknown',       src: 'field-unknown.png',       file: 'field-unknown.png',       w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond' },
  { slot: 'field.ridge',         src: 'field-ridge.png',         file: 'field-ridge.png',         w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-hollow' },
  { slot: 'crop.wheat.growing',  src: 'crop-wheat-growing.png',  file: 'crop-wheat-growing.png',  w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-overlay' },
  { slot: 'crop.wheat.mature',   src: 'crop-wheat-mature.png',   file: 'crop-wheat-mature.png',   w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-overlay' },
  { slot: 'crop.default.growing',src: 'crop-default-growing.png',file: 'crop-default-growing.png',w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-overlay' },
  { slot: 'crop.default.mature', src: 'crop-default-mature.png', file: 'crop-default-mature.png', w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-overlay' },
  { slot: 'env.homestead',       src: 'env-homestead.png',       file: 'env-homestead.png',       w: 460, h: 380, anchor: [0.5, 0.8],  alpha: 'edge' },
  { slot: 'env.river.straight',  src: 'env-river-straight.png',  file: 'env-river-straight.png',  w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond' },
  { slot: 'env.river.corner',    src: 'env-river-corner.png',    file: 'env-river-corner.png',    w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond' },
  { slot: 'env.bridge',          src: 'env-bridge.png',          file: 'env-bridge.png',          w: 260, h: 200, anchor: [0.5, 0.75], alpha: 'edge' },
  { slot: 'env.tree.canopy',     src: 'env-tree-canopy.png',     file: 'env-tree-canopy.png',     w: 180, h: 240, anchor: [0.5, 0.92], alpha: 'edge' },
  { slot: 'env.flowers',         src: 'env-flowers.png',         file: 'env-flowers.png',         w: 260, h: 130, anchor: [0.5, 0.5],  alpha: 'diamond-overlay' },
  { slot: 'env.fence',           src: 'env-fence.png',           file: 'env-fence.png',           w: 260, h: 60,  anchor: [0.5, 0.8],  alpha: 'edge' },
  { slot: 'env.signpost',        src: 'env-signpost.png',        file: 'env-signpost.png',        w: 120, h: 160, anchor: [0.5, 0.92], alpha: 'edge' },
  { slot: 'ground.base',         src: 'ground-base.png',         file: 'ground-base.png',         w: 512, h: 512, anchor: [0.5, 0.5],  alpha: 'opaque' },
  ...['icon-date','icon-coin','icon-food','icon-pressure','icon-arrow','icon-todo','icon-seedling',
      'nav-field','nav-calendar','nav-basket','nav-more'].map(name => ({
    slot: name.replace('-', '.'), src: `icons/${name}.svg`, file: `${name}.png`,
    w: 64, h: 64, anchor: [0.5, 0.5], alpha: 'edge'
  }))
];

const errors = [];
const warnings = [];

function pngMeta(uuid, name, hasAlpha) {
  return {
    ver: '1.0.27', importer: 'image', imported: true, uuid,
    files: ['.json', '.png'],
    subMetas: {
      '6c48a': {
        importer: 'texture', uuid: `${uuid}@6c48a`, displayName: name, id: '6c48a', name: 'texture',
        userData: {
          wrapModeS: 'repeat', wrapModeT: 'repeat', minfilter: 'linear', magfilter: 'linear',
          mipfilter: 'none', anisotropy: 0, isUuid: true, imageUuidOrDatabaseUri: uuid, visible: false
        },
        ver: '1.0.22', imported: true, files: ['.json'], subMetas: {}
      }
    },
    userData: { type: 'texture', fixAlphaTransparencyArtifacts: false, hasAlpha, redirect: `${uuid}@6c48a` }
  };
}

function ensureMeta(metaPath, build) {
  if (fs.existsSync(metaPath)) return false;
  fs.writeFileSync(metaPath, JSON.stringify(build(), null, 2) + '\n');
  return true;
}

async function sampleAlpha(buf, w, h, points) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return points.map(([fx, fy]) => {
    const x = Math.min(info.width - 1, Math.max(0, Math.round(fx * (info.width - 1))));
    const y = Math.min(info.height - 1, Math.max(0, Math.round(fy * (info.height - 1))));
    return data[(y * info.width + x) * 4 + 3];
  });
}

fs.mkdirSync(outDir, { recursive: true });
const manifest = { version: 1, id: 'scenic', name: '田园场景 · 第二版', palette: PALETTE, images: {} };
let metasCreated = 0;

for (const s of SLOTS) {
  const srcPath = path.join(sourceDir, s.src);
  const outPath = path.join(outDir, s.file);
  const tw = s.w * 2, th = s.h * 2;
  if (!fs.existsSync(srcPath)) { errors.push(`MISSING source: art/scenic/sources/${s.src} (slot ${s.slot})`); continue; }

  let img = sharp(srcPath);
  const meta = await img.metadata();
  if (s.src.endsWith('.svg')) {
    img = sharp(srcPath, { density: 384 }).resize(tw, th, { fit: 'fill' }); // vector glyph: exact rasterisation, no perspective art
  } else {
    const srcAspect = meta.width / meta.height, dstAspect = tw / th;
    if (Math.abs(srcAspect / dstAspect - 1) > 0.04) {
      errors.push(`ASPECT mismatch: ${s.src} is ${meta.width}x${meta.height} (${srcAspect.toFixed(3)}), slot ${s.slot} needs ${dstAspect.toFixed(3)} — regenerate, never fill-stretch`);
      continue;
    }
    if (meta.width < tw || meta.height < th) warnings.push(`LOW-RES source ${s.src}: ${meta.width}x${meta.height} < ${tw}x${th}, upscaled`);
    img = img.resize(tw, th, { fit: 'cover', position: 'center' });
  }
  const buf = await img.png({ compressionLevel: 9 }).toBuffer();

  // transparency contract checks
  if (s.alpha === 'opaque') {
    const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minA = 255;
    for (let i = 3; i < data.length; i += 4) if (data[i] < minA) minA = data[i];
    if (minA < 250) { errors.push(`OPACITY: ${s.src} must be fully opaque (min alpha ${minA})`); continue; }
  } else {
    const corners = await sampleAlpha(buf, tw, th, [[0.004, 0.004], [0.996, 0.004], [0.004, 0.996], [0.996, 0.996]]);
    if (Math.max(...corners) >= 160) { errors.push(`TRANSPARENCY: ${s.src} corner alpha ${corners} >= 160, slot ${s.slot} requires transparent background`); continue; }
    if (s.alpha === 'diamond') {
      const [centerA] = await sampleAlpha(buf, tw, th, [[0.5, 0.5]]);
      if (centerA < 128) errors.push(`TRANSPARENCY: ${s.src} diamond center is transparent (alpha ${centerA}) — expected painted plot`);
    }
    if (s.alpha === 'diamond-overlay') {
      const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let sum = 0, n = 0;
      for (let i = 3; i < data.length; i += 4) { sum += data[i]; n++; }
      const mean = sum / n;
      if (!(mean > 8)) { errors.push(`OVERLAY: ${s.src} carries almost no paint (mean alpha ${mean.toFixed(1)})`); continue; }
    }
    if (s.alpha === 'diamond-hollow') {
      const [centerA] = await sampleAlpha(buf, tw, th, [[0.5, 0.5]]);
      if (centerA >= 128) warnings.push(`RIDGE: ${s.src} center alpha ${centerA} — ridge overlay should have a hollow center`);
    }
  }

  fs.writeFileSync(outPath, buf);
  const hasAlpha = s.alpha !== 'opaque';
  const name = s.file.replace(/\.png$/, '');
  if (ensureMeta(`${outPath}.meta`, () => pngMeta(crypto.randomUUID(), name, hasAlpha))) metasCreated++;
  manifest.images[s.slot] = { file: s.file, width: s.w, height: s.h, anchor: s.anchor };
}

if (errors.length) {
  console.error('Scenic art export FAILED:');
  for (const e of errors) console.error('  - ' + e);
  for (const w of warnings) console.warn('  ~ ' + w);
  process.exit(1);
}

const sorted = { ...manifest, images: Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b))) };
const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n');
if (ensureMeta(`${manifestPath}.meta`, () => ({ ver: '2.0.1', importer: 'json', imported: true, uuid: crypto.randomUUID(), files: ['.json'], subMetas: {}, userData: {} }))) metasCreated++;
if (ensureMeta(`${outDir}.meta`, () => ({ ver: '1.2.0', importer: 'directory', imported: true, uuid: crypto.randomUUID(), files: [], subMetas: {}, userData: {} }))) metasCreated++;

for (const w of warnings) console.warn('warning: ' + w);
console.log(`Scenic pack exported: ${Object.keys(sorted.images).length} slots -> ${path.relative(root, outDir)} (${metasCreated} meta files created)`);
