// Revision-2 smoke check for the scenic (田园场景) world view.
// Headless Chrome + CDP, same harness as tools/screenshot-scenic.mjs.
// Asserts the NEW r2 geometry (wx=(x−y)·150, wy=(x+y−4)·90) end to end:
// boots into 'scenic' without page errors, the version registry lists the
// entry, the live art pack serves manifest + PNGs over HTTP, focusPlot /
// setCamera / getCamera / hitTest agree with the projection, a render tick
// throws nothing, and one 720x1280 screenshot is captured as a
// load-verification artifact.
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'art/scenic/revision-2/screenshots');
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

// p2q2 is the home plot: logical (2,2) -> world (0,0) under the r2 projection.
const probe = `(async () => {
  const demo = globalThis.__farmDemo;
  if (!demo) return { error: 'no __farmDemo handle' };
  const cc = await System.import('cc');
  const out = { checks: {} };
  const ok = (name, pass, detail) => { out.checks[name] = { pass: !!pass, detail }; };
  const countNodes = () => { let n = 0; const walk = (node) => { n++; for (const c of node.children) walk(c); }; walk(cc.director.getScene()); return n; };

  ok('boots into scenic', demo.worldVersion === 'scenic', 'worldVersion=' + demo.worldVersion);
  const versions = demo.worldViews.list().map(v => v.id + ':' + v.name);
  ok('registry lists scenic', versions.some(v => v.startsWith('scenic:')), versions.join(','));

  const view = demo.scenicView;
  ok('scenic view mounted', !!view, null);
  if (!view) return out;

  const focus = view.focusPlot('p2q2'); // r2: home plot sits at world origin
  ok('focusPlot home plot', focus && Math.abs(focus.x) < 1e-6, focus && JSON.stringify(focus));

  const zoomBefore = view.getCamera().zoom;
  demo.selectAndFocus('p2q2');
  const cam = view.getCamera();
  ok('selection focuses camera', demo.selected === 'p2q2' && Math.abs(cam.x - focus.x) < 1 && Math.abs(cam.y - focus.y) < 1,
    JSON.stringify({ selected: demo.selected, cam }));

  view.setCamera({ x: 300, y: -180, zoom: 1.3 });
  const moved = view.getCamera();
  ok('camera set/get roundtrip', Math.abs(moved.x - 300) < 1e-6 && Math.abs(moved.y + 180) < 1e-6 && Math.abs(moved.zoom - 1.3) < 1e-6,
    JSON.stringify(moved));
  view.setCamera({ ...focus, zoom: zoomBefore });

  const hit = view.hitTest({ x: 0, y: 0 }); // world origin must hit the home plot quad
  ok('hitTest at home quad', hit === 'p2q2', 'hit=' + hit);
  const off = view.hitTest({ x: 0, y: 95 }); // between cells (outside the 228x142 quad, inside 300x180 cell)
  ok('hitTest misses belt', off !== 'p2q2', 'hit=' + off);

  demo.renderPlots(); // explicit render tick; exceptions surface as page errors below
  await new Promise(r => setTimeout(r, 500));
  ok('scene populated', countNodes() > 30, 'nodes=' + countNodes());
  out.nodes = countNodes();
  return out;
})()`;

async function httpCheck(p) {
  try {
    const res = await fetch(new URL(p, url));
    return { path: p, status: res.status, ok: res.status === 200 };
  } catch (error) {
    return { path: p, status: 0, ok: false, error: error.message };
  }
}

async function main() {
  let browser;
  for (const candidate of candidates) {
    try { await fs.access(candidate); browser = candidate; break; } catch { /* next */ }
  }
  if (!browser) throw new Error('No Chrome/Edge binary found; set CHROME_PATH.');
  await fs.mkdir(outDir, { recursive: true });

  const http = [
    await httpCheck('/art-packs/scenic/manifest.json'),
    await httpCheck('/art-packs/scenic/field-soil-dry.png'),
    await httpCheck('/art-packs/scenic/env-river-straight-y.png'),
  ];

  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'farm-r2-'));
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
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const outName = 'scenic-r2-first-screen-720x1280.png';
    const out = path.join(outDir, outName);
    await fs.writeFile(out, Buffer.from(shot.data, 'base64'));
    const pageErrors = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown'
        || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'))
      .map((e) => JSON.stringify(e.params).slice(0, 300));
    cdp.close();

    const value = result.result.value || { error: 'probe returned nothing: ' + JSON.stringify(result).slice(0, 300) };
    const checks = Object.entries(value.checks || {});
    let failed = 0;
    console.log('== scenic r2 smoke check ==');
    for (const { path: p, status, ok: isOk } of http) {
      console.log(`${isOk ? 'PASS' : 'FAIL'}  http ${p} -> ${status}`);
      if (!isOk) failed++;
    }
    for (const [name, c] of checks) {
      console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${name}${c.detail ? '  (' + c.detail + ')' : ''}`);
      if (!c.pass) failed++;
    }
    console.log(`page errors: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}`);
    console.log(`screenshot: ${path.relative(root, out)} (${(await fs.stat(out)).size} bytes)`);
    if (pageErrors.length) failed++;
    if (failed) { console.error(`smoke check FAILED (${failed} failures)`); process.exitCode = 1; }
    else console.log('smoke check passed');
  } finally {
    child.kill();
    await sleep(500);
    await fs.rm(profile, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
