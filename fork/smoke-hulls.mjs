// Axonometra: a smoke check of the hull viewer (run fork/build-standalone.mjs first).
//
//   cd frontend && node ../fork/smoke-hulls.mjs
//
// Serves dist/standalone, opens hulls.html in a headless Chrome and shows every hull in the catalogue: each must draw,
// float with finite numbers and a righting-lever curve, with no page errors. Heels one and checks it floats heeled.
// Writes dist/hulls-smoke.png (the yacht with its keel) and dist/hulls-smoke-heeled.png. CHROME_PATH overrides the
// browser.

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "dist/standalone");
const puppeteer = createRequire(join(root, "frontend/package.json"))("puppeteer-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".png": "image/png" };

if (!existsSync(join(dir, "axonometra-hulls.js"))) {
  console.error("No standalone build: run node ../fork/build-standalone.mjs first.");
  process.exit(2);
}
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(dir, path === "/" ? "hulls.html" : path);
  if (!file.startsWith(dir) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${server.address().port}/hulls.html?hull=sailing-yacht-10m-keel`;

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean).find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const failures = [];
let shown = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 860 });
  page.on("pageerror", (err) => failures.push(`page error: ${err.message}`));
  page.on("requestfailed", (req) => failures.push(`request failed: ${req.url()}`));
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.hullViewer?.state().curve.length === 17, { timeout: 30000 });

  // the canvas has something drawn on it (not one flat colour)
  const drawn = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const g = document.createElement("canvas");
    g.width = 64;
    g.height = 64;
    const x = g.getContext("2d");
    x.drawImage(c, 0, 0, 64, 64);
    const d = x.getImageData(0, 0, 64, 64).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return seen.size;
  });
  if (drawn < 8) failures.push(`the 3D view looks empty (${drawn} colours)`);
  await page.screenshot({ path: join(root, "dist/hulls-smoke.png") });

  // every hull in the catalogue: shown, floated, numbers finite
  const names = await page.evaluate(() => [...document.querySelectorAll("[data-pick] option")].map((o) => o.value));
  for (const name of names) {
    const s = await page.evaluate((n) => {
      window.hullViewer.show(n);
      const st = window.hullViewer.state();
      return { name: st.name, disp: st.hydro.displacement, gz: st.gz, vcg: st.load.vcg };
    }, name);
    if (s.name !== name) failures.push(`${name}: showed ${s.name}`);
    if (!(s.disp > 0) || !Number.isFinite(s.gz) || !Number.isFinite(s.vcg)) failures.push(`${name}: displacement ${s.disp}, GZ ${s.gz}, VCG ${s.vcg}`);
    shown++;
  }

  // heeled: the trawler at 20° floats there with a positive righting lever
  await page.evaluate(() => window.hullViewer.show("trawler-14m"));
  await page.waitForFunction(() => window.hullViewer.state().curve.length === 17, { timeout: 30000 });
  const heeled = await page.evaluate(() => {
    window.hullViewer.heel(20);
    return window.hullViewer.state();
  });
  if (Math.abs(heeled.heel - (20 * Math.PI) / 180) > 1e-9 || !(heeled.gz > 0)) failures.push(`trawler at 20°: heel ${heeled.heel}, GZ ${heeled.gz}`);
  if (!heeled.curve.every(([, g]) => Number.isFinite(g))) failures.push("trawler: the GZ curve has gaps");
  await new Promise((ok) => setTimeout(ok, 300));
  await page.screenshot({ path: join(root, "dist/hulls-smoke-heeled.png") });
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`ok   hull viewer shows all ${shown} hulls, floats them, heels the trawler (dist/hulls-smoke.png, dist/hulls-smoke-heeled.png)`);
