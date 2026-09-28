// Captures the scenic (田园场景) graybox at 720x1280 via headless Chrome + CDP.
// Same approach as tools/screenshot-baseline.mjs, but seeds the world-view
// preference so the game boots into the scenic map version.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'art/scenic/reviews');
const url = process.env.SCENIC_URL || 'http://127.0.0.1:4328/';
const settleMs = Number(process.env.SCENIC_SETTLE_MS || 14000);
const outName = process.env.SCENIC_OUT || 'graybox-720x1280.png';
const [viewW, viewH] = (process.env.SCENIC_SIZE || '720x1280').split('x').map(Number);

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) {
        const { resolve: ok, reject: fail } = pending.get(data.id);
        pending.delete(data.id);
        data.error ? fail(new Error(data.error.message)) : ok(data.result);
      } else if (data.method) {
        events.push(data);
      }
    };
    ws.onopen = () => resolve({
      events,
      send: (method, params = {}) => new Promise((ok, fail) => {
        const callId = ++id;
        pending.set(callId, { resolve: ok, reject: fail });
        ws.send(JSON.stringify({ id: callId, method, params }));
      }),
      close: () => ws.close(),
    });
    ws.onerror = () => reject(new Error('WebSocket connection failed'));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let browser;
  for (const candidate of candidates) {
    try { await fs.access(candidate); browser = candidate; break; } catch { /* next */ }
  }
  if (!browser) throw new Error('No Chrome/Edge binary found; set CHROME_PATH.');
  await fs.mkdir(outDir, { recursive: true });
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'farm-scenic-'));
  const port = 9222 + Math.floor(Math.random() * 2000);
  const child = spawn(browser, [
    '--headless=new', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    `--window-size=${viewW},${viewH}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    let wsUrl;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        wsUrl = list.find((entry) => entry.type === 'page')?.webSocketDebuggerUrl;
      } catch { /* retry */ }
    }
    if (!wsUrl) throw new Error('DevTools endpoint did not come up');
    const cdp = await connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewW, height: viewH, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('shanju.cocos.world.v1', JSON.stringify({version:'scenic',cameras:${process.env.SCENIC_CAMERA || '{}'}}));`,
    });
    await cdp.send('Page.navigate', { url });
    await sleep(settleMs);
    const state = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({world:localStorage.getItem('shanju.cocos.world.v1'),canvas:(()=>{const c=document.querySelector('canvas');return c?c.width+'x'+c.height:null})()})`,
      returnByValue: true,
    });
    const errors = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
      .map((e) => JSON.stringify(e.params).slice(0, 300));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const out = path.join(outDir, outName);
    await fs.writeFile(out, Buffer.from(shot.data, 'base64'));
    const stat = await fs.stat(out);
    console.log(`${outName}: ${viewW}x${viewH}, ${stat.size} bytes, page=${state.result.value}`);
    if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`);
    cdp.close();
  } finally {
    child.kill();
    await sleep(500);
    await fs.rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
