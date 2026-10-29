// Shop pictures of furniture packs, drawn with the real 3D bundle (run `npm run build` first):
// one transparent PNG per item and an overview sheet with all items of the pack.
// Usage (from frontend/): node pack-images.mjs <pack source .json>... [--out <dir>]
// Pictures go to <dir>/<pack id>/ (default: next to each source, in a folder named after the pack).

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const outAt = args.indexOf("--out");
const outRoot = outAt >= 0 ? resolve(args[outAt + 1]) : null;
const sources = args.filter((a, i) => a !== "--out" && i !== outAt + 1).map((a) => resolve(a));
if (!sources.length) {
  console.error("usage: node pack-images.mjs <pack source .json>... [--out <dir>]");
  process.exit(1);
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;

const candidates = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter(Boolean);
const browser = await puppeteer.launch({
  executablePath: candidates.find((p) => existsSync(p)),
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const fonts = "/custom_components/axonometra/frontend/fonts";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Figtree"; src: url(${fonts}/figtree.woff2) format("woff2"); font-weight: 300 900; }
@font-face { font-family: "Bricolage Grotesque"; src: url(${fonts}/bricolage-grotesque.woff2) format("woff2"); font-weight: 200 800; }
body { margin: 0; background: #070b14; }
</style></head><body></body></html>`;

for (const source of sources) {
  const pack = JSON.parse(readFileSync(source, "utf8"));
  const dir = join(outRoot ?? dirname(source), pack.id);
  mkdirSync(join(dir, "items"), { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
  await page.goto(`${base}/preview/index.html?empty`, { waitUntil: "domcontentloaded" });
  await page.setContent(PAGE, { waitUntil: "load" });
  const result = await page.evaluate(
    async (bundle, pack) => {
      await document.fonts.load("700 20px 'Bricolage Grotesque'");
      await document.fonts.load("500 20px Figtree");
      const mod = await import(bundle);
      const name = (it) => it.name.de ?? it.name.en ?? Object.values(it.name)[0];
      const items = pack.items.map((it) => ({
        id: it.id,
        name: name(it),
        url: mod.furniturePreview({ type: `pack:${pack.id}:${it.id}`, w: it.size[0], d: it.size[1], h: it.size[2], variant: null, lamp: null }, 480, [{ licensee: null, ...pack }], 1.9),
      }));
      const load = (src) => new Promise((ok) => {
        const img = new Image();
        img.onload = () => ok(img);
        img.src = src;
      });
      // overview sheets: title, then up to 12 items per sheet in a grid of tiles
      const PER_PAGE = 12;
      const pages = Math.ceil(items.length / PER_PAGE);
      const sheet = async (page, pageNo) => {
        const W = 1600;
        const H = 1200;
        const c = document.createElement("canvas");
        c.width = W * 2;
        c.height = H * 2;
        const g = c.getContext("2d");
        g.scale(2, 2);
        const bg = g.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.45, W * 0.75);
        bg.addColorStop(0, "#15213d");
        bg.addColorStop(1, "#060a13");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        // faint floor grid
        g.strokeStyle = "rgba(91,124,255,0.07)";
        g.lineWidth = 1;
        for (let x = 0; x <= W; x += 40) g.strokeRect(x, 0, 0, H);
        for (let y = 0; y <= H; y += 40) g.strokeRect(0, y, W, 0);
        g.fillStyle = "#37e0ff";
        g.font = "600 22px Figtree";
        g.fillText("AXONOMETRA 3D · MÖBEL-PACK", 70, 86);
        g.fillStyle = "#f2f5ff";
        g.font = "800 64px 'Bricolage Grotesque'";
        g.fillText(pack.name, 68, 150);
        g.fillStyle = "#8d9bc2";
        g.font = "500 24px Figtree";
        g.fillText(`${pack.items.length} Möbel · für Home Assistant${pack.publisher ? ` · von ${pack.publisher}` : ""}${pages > 1 ? ` · Seite ${pageNo} von ${pages}` : ""}`, 70, 192);
        const n = page.length;
        const cols = n <= 4 ? n : n <= 6 ? 3 : n <= 8 ? 4 : n <= 12 ? 4 : 5;
        const rows = Math.ceil(n / cols);
        const top = 240;
        const gap = 22;
        const tw = (W - 140 - gap * (cols - 1)) / cols;
        const th = Math.min(tw * 1.08, (H - top - 60 - gap * (rows - 1)) / rows);
        for (let i = 0; i < n; i++) {
          const x = 70 + (i % cols) * (tw + gap);
          const y = top + Math.floor(i / cols) * (th + gap);
          g.fillStyle = "rgba(27,40,72,0.55)";
          g.strokeStyle = "rgba(55,224,255,0.22)";
          g.lineWidth = 1.5;
          g.beginPath();
          g.roundRect(x, y, tw, th, 20);
          g.fill();
          g.stroke();
          const img = await load(page[i].url);
          const s = Math.min(tw - 30, th - 70);
          g.drawImage(img, x + (tw - s) / 2, y + 12, s, s);
          g.fillStyle = "#e8eeff";
          g.font = `600 ${tw < 260 ? 18 : 21}px Figtree`;
          g.textAlign = "center";
          g.fillText(page[i].name, x + tw / 2, y + th - 24, tw - 20);
          g.textAlign = "left";
        }
        return c.toDataURL("image/png");
      };
      const overviews = [];
      for (let p = 0; p < pages; p++) overviews.push(await sheet(items.slice(p * PER_PAGE, (p + 1) * PER_PAGE), p + 1));
      return { items, overviews };
    },
    `${base}/custom_components/axonometra/frontend/axonometra-3d.js`,
    pack,
  );
  const save = (file, url) => writeFileSync(file, Buffer.from(url.split(",")[1], "base64"));
  result.overviews.forEach((url, i) => save(join(dir, i ? `overview-${i + 1}.png` : "overview.png"), url));
  for (const it of result.items) save(join(dir, "items", `${it.id}.png`), it.url);
  console.log(`${basename(source)}: ${result.items.length} items -> ${dir}`);
  await page.close();
}
await browser.close();
server.close();
