/** Render every fieldbook UI symbol as a textured image sprite. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve(import.meta.dirname, '../assets/resources/art-packs/fieldbook');
await fs.mkdir(dir, {recursive: true});
const ink = '#24483d', gold = '#b58a4b';
const icons = {
  back: '<path d="M41 13L21 32l20 19 M22 32h34"/>',
  close: '<path d="M17 17l30 30 M47 17L17 47"/>',
  next: '<path d="M23 11l20 21-20 21"/>',
  background: '<circle cx="32" cy="32" r="25"/><path d="M14 48q18 10 36 0"/>',
  field: '<rect x="8" y="12" width="48" height="40" rx="5"/><path d="M8 25h48 M8 39h48 M24 12v40 M40 12v40"/>',
  calendar: '<rect x="9" y="12" width="46" height="43" rx="4"/><path d="M9 24h46 M20 8v9 M44 8v9 M19 34h7 M37 34h7 M19 44h7"/>',
  list: '<rect x="12" y="9" width="40" height="48" rx="4"/><path d="M20 9v-3h24v3 M21 25l4 4 6-8 M35 27h9 M21 43l4 4 6-8 M35 45h9"/>',
  basket: '<path d="M10 27h44l-6 27H16z M18 27Q32 2 46 27 M22 35v11 M32 35v11 M42 35v11"/>',
  more: '<circle cx="15" cy="32" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="49" cy="32" r="3"/>',
  hoe: '<path d="M14 54L41 13 M34 11q11-4 20 3l-5 12q-7-6-17-6"/>',
  book: '<path d="M32 52L8 45V12l24 8 24-8v33z M32 20v32 M15 24l10 3 M39 27l10-3"/>',
  leaf: '<path d="M32 55V29 M32 45Q11 48 10 24q17-2 22 21 M32 37q2-24 22-25 2 21-22 25"/>',
  rest: '<path d="M43 11a22 22 0 1 0 10 37A23 23 0 0 1 43 11z M19 40h18 M24 34h11"/>',
  home: '<path d="M7 31L32 10l25 21 M13 27v28h38V27 M26 55V38h12v17"/>',
  coin: '<circle cx="32" cy="32" r="23"/><rect x="24" y="24" width="16" height="16" rx="2"/>',
  food: '<path d="M12 39q20 20 40 0z M19 41q1-14 13-17 13 3 13 17 M32 24V12 M32 18q-11 0-12-9 11 0 12 9 M32 21q10 0 12-9-11 0-12 9"/>',
  pressure: '<path d="M32 7q5 13-2 19-3-5-2-9-18 13-15 27 2 11 19 12 17-1 19-15Q52 28 42 21q0 10-5 12Q39 18 32 7z"/>',
  sun: '<circle cx="32" cy="32" r="12"/><path d="M32 5v9 M32 50v9 M5 32h9 M50 32h9 M13 13l7 7 M44 44l7 7 M13 51l7-7 M44 20l7-7"/>',
  rain: '<path d="M17 39h32q10-2 8-12-2-8-12-8-5-13-18-11-10 2-11 14Q6 21 6 31q0 8 11 8 M18 46l-3 9 M33 46l-3 9 M48 46l-3 9"/>',
  cloud: '<path d="M15 45h35q10-2 9-12-1-9-11-10Q44 10 31 13q-11 2-13 13Q5 25 5 35q0 9 10 10z"/>',
  snow: '<path d="M32 6v52 M9 19l46 26 M9 45l46-26 M25 12l7 7 7-7 M25 52l7-7 7 7"/>',
  wind: '<path d="M7 22h35q10 0 9-8-1-6-7-5 M7 32h47 M7 42h31q11 0 10 8-1 6-7 5"/>',
  target: '<circle cx="32" cy="32" r="21"/><circle cx="32" cy="32" r="8"/><path d="M32 4v9 M32 51v9 M4 32h9 M51 32h9"/>',
  info: '<circle cx="32" cy="32" r="24"/><path d="M32 28v17 M32 19v2"/>',
  settings: '<circle cx="32" cy="32" r="9"/><path d="M26 7h12l2 7 7 3 7-2 6 10-5 5v5l5 5-6 10-7-2-7 3-2 7H26l-2-7-7-3-7 2-6-10 5-5v-5l-5-5 6-10 7 2 7-3z"/>',
  lotus: '<path d="M32 48Q8 37 11 19q14 1 21 29 Q56 37 53 19 39 20 32 48z M32 48Q17 27 32 8q15 19 0 40z M12 54q20 8 40 0"/>',
  market: '<path d="M9 26h46l-4-14H13z M14 26v29h36V26 M23 55V39h18v16 M9 26q4 8 9 0 5 8 10 0 5 8 10 0 5 8 10 0 4 8 8 0"/>',
  seed: '<path d="M32 54V24 M32 39Q16 41 14 25q15-2 18 14 M32 34q1-15 17-18 1 16-17 18 M12 55h40"/>',
  sickle: '<path d="M18 54l24-31 M33 13q17-6 24 4-2 18-21 22 12-11 10-17-6-5-13-9z"/>',
  spade: '<path d="M32 11v29 M23 7h18v9H23z M21 40h22q0 14-11 18Q21 54 21 40z"/>',
  water: '<path d="M32 7q-20 25-20 37a20 20 0 0 0 40 0Q52 32 32 7z M20 44q0 10 10 12"/>',
  wood: '<path d="M13 48V26q0-17 19-18 19 1 19 18v22z M20 48q1-17 12-17 11 0 12 17 M11 56h42 M32 9v23"/>',
  clay: '<path d="M18 22q14 7 28 0l-3 25q-11 10-22 0z M22 22V11h20v11 M17 52q15 7 30 0"/>',
  flour: '<path d="M17 18h30l6 35H11z M21 18V9h22v9 M23 39q9-12 18 0 M32 31v16"/>',
  straw: '<path d="M32 55V12 M32 23q-12-4-11-13 11 1 11 13 M32 32q12-4 11-13-11 1-11 13 M32 41q-12-4-11-13 11 1 11 13 M17 55h30"/>',
  compost: '<path d="M12 25h40l-5 29H17z M9 25q23-16 46 0 M32 45V31 M32 39q-9 0-9-8 M32 36q9 0 9-8"/>',
};

const cropNames = ['wheat','soy','flax','rice','millet','adzuki','mallow','mustard'];
const cropVariants = {
  wheat: '<path d="M32 54V13 M32 20l-7-6 M32 25l7-7 M32 30l-7-6 M32 35l7-7 M32 40l-7-6"/><path d="M32 13l-4-7 M32 13l4-7"/>',
  soy: '<path d="M32 54V19 M32 36q-13-1-14-14 13-1 14 14 M32 29q12-2 14-14-13 0-14 14"/><circle cx="29" cy="12" r="3"/>',
  rice: '<path d="M25 54l8-42 M33 26q13-7 18-18 M31 32q-13-8-17-18 M36 32q9-1 14 7"/><circle cx="43" cy="18" r="2"/><circle cx="20" cy="22" r="2"/>',
  flax: '<path d="M32 54V20 M32 37q-12 0-13-11 M32 31q12-1 13-12"/><circle cx="32" cy="14" r="8"/>',
  millet: '<path d="M29 54l7-40 M36 14q13 2 7 22 M36 18q-10-1-10 10"/><circle cx="38" cy="15" r="2"/><circle cx="41" cy="21" r="2"/>',
  adzuki: '<path d="M32 54V24 M32 38Q18 39 16 25q16-1 16 13 M32 31q15 0 17-13-16-2-17 13"/><circle cx="27" cy="15" r="3"/><circle cx="37" cy="14" r="3"/>',
  mallow: '<path d="M32 54V22 M32 38q-15-2-17-17 16 0 17 17 M32 33q15-2 17-17-16 0-17 17"/><circle cx="32" cy="15" r="5"/>',
  mustard: '<path d="M32 54V22 M32 40q-14-2-16-15 15 0 16 15 M32 34q13-2 16-15-15 0-16 15"/><path d="M32 15q-6-8-11 0 M32 15q5-8 11 0"/>',
};
for (const name of cropNames) icons['crop-'+name] = cropVariants[name];

const images = {};
for (const [name, body] of Object.entries(icons)) {
  const file = `icon-${name}.png`;
  const wash = name.startsWith('crop-') ? '#dce9c8' : ['coin','food','basket','market'].includes(name) ? '#eee0b9' : '#dce7dc';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 64 64">
    <defs><radialGradient id="paper"><stop stop-color="#fffdf1"/><stop offset="1" stop-color="#e9dfc8"/></radialGradient>
    <radialGradient id="wash"><stop stop-color="${wash}"/><stop offset="1" stop-color="#f4efe0"/></radialGradient></defs>
    <circle cx="32" cy="33" r="28" fill="#907c55" opacity=".2"/>
    <circle cx="32" cy="31" r="28" fill="url(#paper)" stroke="#bca67e" stroke-width="1.6"/>
    <circle cx="32" cy="31" r="23" fill="url(#wash)" opacity=".94"/>
    <g fill="none" stroke="${gold}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".28">${body}</g>
    <g fill="none" stroke="${ink}" stroke-width="3.15" stroke-linecap="round" stroke-linejoin="round">${body}</g>
    <circle cx="54" cy="10" r="3.1" fill="${gold}" stroke="#fff7da" stroke-width="1"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, file));
  images['icon.'+name] = {file, width:64, height:64};
}
const manifestPath=path.join(dir,'manifest.json');
const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
Object.assign(manifest.images,images);
await fs.writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Updated ${Object.keys(images).length} fieldbook image icons without changing terrain slots.`);
