import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const stamp = path.join(root, 'build/web-mobile/.build-state');
const inputs = ['assets', 'core', 'settings', 'art/grok-qinghe', 'build-config.json',
  'package.json', 'package-lock.json', 'tsconfig.json', 'tools/build.ps1',
  'tools/build-core.mjs', 'tools/export-art-packs.mjs', 'tools/build-state.mjs'];

async function fingerprint() {
  const hash = createHash('sha256');
  async function visit(relative) {
    const file = path.join(root, relative);
    const stat = await fs.stat(file);
    if (stat.isDirectory()) {
      for (const name of (await fs.readdir(file)).sort()) await visit(`${relative}/${name}`);
    } else {
      hash.update(relative + '\0');
      hash.update(await fs.readFile(file));
      hash.update('\0');
    }
  }
  for (const input of inputs) await visit(input);
  return hash.digest('hex');
}

try {
  if (process.argv.includes('--write')) {
    await fs.writeFile(stamp, await fingerprint());
  } else {
    let previous;
    try {
      await fs.access(path.join(root, 'build/web-mobile/index.html'));
      previous = await fs.readFile(stamp, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (!previous || previous !== await fingerprint()) {
      console.log('Build missing or source/configuration changed. Rebuilding...');
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error('Cannot check build state:', error.message);
  process.exitCode = 2;
}
