// P4 verification: 20 consecutive world-version switches (stress) + save parity.
// Headless Chrome + CDP, same harness as tools/screenshot-scenic.mjs.
// Checks: node count and asset count do not grow monotonically, the game save
// string (content + revision) is identical before/after, the input controller
// instance is unchanged (one tap = one selection; listeners are attached once),
// and the selected plot id survives every switch.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const url = process.env.SCENIC_URL || 'http://127.0.0.1:4328/';
const settleMs = Number(process.env.SCENIC_SETTLE_MS || 14000);
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
      } else if (data.method) events.push(data);
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

const probe = `(async () => {
  const demo = globalThis.__farmDemo;
  if (!demo) return { error: 'no __farmDemo handle' };
  const cc = await System.import('cc');
  const countNodes = () => { let n = 0; const walk = (node) => { n++; for (const c of node.children) walk(c); }; walk(cc.director.getScene()); return n; };
  const SAVE = 'shanju.cocos.farm.v1';
  const digest = (raw) => { const s = JSON.parse(raw); return { revision: s.record.entries.length, length: raw.length, date: s.state?.life?.calendar?.date ?? null, money: s.state?.family?.money ?? null, commands: s.record.entries.map(e => e.commandId ?? e.actionId ?? '').join('|') }; };
  // Warm both versions once so lazy assets are cached before measuring.
  await demo.switchWorldVersion('current');
  await demo.switchWorldVersion('scenic');
  await new Promise(r => setTimeout(r, 6000)); // settle: destroyed nodes are cleaned at frame end, toasts expire
  const before = { nodes: countNodes(), assets: cc.assetManager.assets.count, save: localStorage.getItem(SAVE), selected: demo.selected, input: demo.input };
  const selectedDuring = new Set();
  for (let i = 0; i < 20; i++) {
    await demo.switchWorldVersion(i % 2 ? 'scenic' : 'current');
    selectedDuring.add(demo.selected);
  }
  await new Promise(r => setTimeout(r, 6000)); // let switch toasts expire
  const after = { nodes: countNodes(), assets: cc.assetManager.assets.count, save: localStorage.getItem(SAVE), selected: demo.selected, input: demo.input };
  return {
    before: { nodes: before.nodes, assets: before.assets, save: digest(before.save), selected: before.selected },
    after: { nodes: after.nodes, assets: after.assets, save: digest(after.save), selected: after.selected },
    saveStringIdentical: before.save === after.save,
    sameInputController: before.input === after.input,
    selectedStable: selectedDuring.size === 1 && after.selected === before.selected,
    finalVersion: demo.worldVersion,
  };
})()`;

async function main() {
  let browser;
  for (const candidate of candidates) {
    try { await fs.access(candidate); browser = candidate; break; } catch { /* next */ }
  }
  if (!browser) throw new Error('No Chrome/Edge binary found; set CHROME_PATH.');
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'farm-p4-'));
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
      source: `localStorage.setItem('shanju.cocos.world.v1', JSON.stringify({version:'scenic',cameras:{}}));`,
    });
    await cdp.send('Page.navigate', { url });
    await sleep(settleMs);
    const result = await cdp.send('Runtime.evaluate', { expression: probe, awaitPromise: true, returnByValue: true });
    // After 22 switches, one tap must still produce exactly one selection.
    // Plot p1q2 (world (-130,-65)) under the default scenic camera lands at (454,713).
    const tap = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x, y, id: 1 }] });
    await tap('touchStart', 454, 713);
    await tap('touchEnd', 454, 713);
    await sleep(800);
    const tapped = await cdp.send('Runtime.evaluate', { expression: `globalThis.__farmDemo ? globalThis.__farmDemo.selected : 'gone'`, returnByValue: true });
    const errors = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
      .map((e) => JSON.stringify(e.params).slice(0, 300));
    console.log(JSON.stringify(result.result.value, null, 2));
    console.log('selected after one synthetic tap:', JSON.stringify(tapped.result.value), '(expect "p1q2" — one tap, one selection)');
    if (errors.length) console.log(`page errors: ${errors.join(' | ')}`);
    cdp.close();
  } finally {
    child.kill();
    await sleep(500);
    await fs.rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
