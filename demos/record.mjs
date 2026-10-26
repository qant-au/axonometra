// What the demo recordings share: the standalone build served locally, a headless Chrome, and frames made into a GIF.

import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "dist/standalone");
const out = join(root, "docs/demos");
const work = join(root, "dist/demo-frames");
const puppeteer = createRequire(join(root, "frontend/package.json"))("puppeteer-core");

/** One full turn takes SECONDS (a comfortable 6 s, played at half speed), at FPS frames a second, WIDTH pixels wide. */
export const SECONDS = 12;
export const FPS = 15;
export const WIDTH = 800;
export const HEIGHT = 450;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/**
 * Serves dist/standalone and opens a headless Chrome on it at the recording size; `record` gets the page and the
 * server's address. CHROME_PATH overrides the browser.
 */
export async function withBrowser(needs, record) {
  if (!existsSync(join(dir, needs))) {
    console.error("No standalone build: run node ../fork/build-standalone.mjs first.");
    process.exit(2);
  }
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file)) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const executablePath = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
    .filter(Boolean)
    .find((p) => existsSync(p));
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  mkdirSync(out, { recursive: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await record(page, `http://127.0.0.1:${server.address().port}`);
  } finally {
    await browser.close();
    server.close();
  }
}

/**
 * Records one full turn as docs/demos/<file>.gif: `turn(page, angle)` sets the camera to each angle in degrees
 * (from 0 to just short of 360) and resolves once it is drawn, then the frame is taken. One frame at a time, so the
 * motion is exactly even whatever the machine. The frames become a GIF with ffmpeg (a palette from the frames
 * themselves) and, when it is installed, gifsicle; fewer `colors` and more `lossy` make it smaller.
 */
export async function recordTurn(page, file, turn, { colors = 128, lossy = 40 } = {}) {
  const frames = join(work, file);
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });
  // PREVIEW=1: four frames a quarter turn apart, left in dist/demo-frames/<file>, and no GIF (for setting a camera up)
  const preview = !!process.env.PREVIEW;
  const count = preview ? 4 : SECONDS * FPS;
  for (let i = 0; i < count; i++) {
    await turn(page, (360 * i) / count);
    writeFileSync(join(frames, `${String(i).padStart(4, "0")}.png`), await page.screenshot({ type: "png" }));
  }
  if (preview) return console.log(`${frames}  ${count} preview frames`);
  const gif = join(out, `${file}.gif`);
  const filters = ["split[a][b]", `[a]palettegen=max_colors=${colors}:stats_mode=full[p]`, "[b][p]paletteuse=dither=bayer:bayer_scale=4"].join(";");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(frames, "%04d.png"), "-filter_complex", filters, "-loop", "0", gif], { stdio: "inherit" });
  try {
    execFileSync("gifsicle", ["-O3", `--lossy=${lossy}`, "-o", gif, gif], { stdio: "inherit" });
  } catch {
    console.warn("gifsicle not found: GIF left unoptimised");
  }
  console.log(`${gif}  ${Math.round(statSync(gif).size / 1024)} KB, ${count} frames`);
}
