// Captures baseline screenshots of the current farm build via headless Chrome
// and the DevTools protocol. Each target uses a fresh temporary profile, so
// localStorage is empty and the game starts as a new session (home plot p2q2,
// default camera panX=0 panY=0 zoom=0.82).
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'art/scenic/reviews');
const url = process.env.BASELINE_URL || 'http://127.0.0.1:4328/';
const settleMs = Number(process.env.BASELINE_SETTLE_MS || 12000);

const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

const targets = [
  { name: 'baseline-v1-390x844.png', width: 390, height: 844, mobile: true },
  { name: 'baseline-v1-430x932.png', width: 430, height: 932, mobile: true },
  { name: 'baseline-v1-desktop-720x1280.png', width: 720, height: 1280, mobile: false },
];

async function findBrowser() {
  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; } catch { /* next */ }
  }
  throw new Error('No Chrome/Edge binary found; set CHROME_PATH.');
}

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

async function capture(browser, target) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'farm-baseline-'));
  const port = 9222 + Math.floor(Math.random() * 2000);
  const child = spawn(browser, [
    '--headless=new',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
    '--mute-audio',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    `--window-size=${target.width},${target.height}`,
    'about:blank',
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
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: target.width, height: target.height, deviceScaleFactor: 1, mobile: target.mobile,
    });
    await cdp.send('Page.navigate', { url });
    await sleep(settleMs);
    const state = await cdp.send('Runtime.evaluate', {
      expression: `JSON.stringify({save:!!localStorage.getItem('shanju.cocos.farm.v1'),style:localStorage.getItem('shanju.cocos.art.v2'),canvas:(()=>{const c=document.querySelector('canvas');return c?c.width+'x'+c.height:null})()})`,
      returnByValue: true,
    });
    const errors = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
      .map((e) => JSON.stringify(e.params).slice(0, 300));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const out = path.join(outDir, target.name);
    await fs.writeFile(out, Buffer.from(shot.data, 'base64'));
    const stat = await fs.stat(out);
    console.log(`${target.name}: ${target.width}x${target.height}, ${stat.size} bytes, page=${state.result.value}`);
    if (errors.length) console.log(`  page errors: ${errors.join(' | ')}`);
    cdp.close();
  } finally {
    child.kill();
    await sleep(500);
    await fs.rm(profile, { recursive: true, force: true });
  }
}

async function main() {
  const browser = await findBrowser();
  await fs.mkdir(outDir, { recursive: true });
  for (const target of targets) await capture(browser, target);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
