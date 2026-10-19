// Review sheets: one PNG per group in elements/review/, each element drawn at plan scale
// on a 10 cm grid plus as a drawer-sized thumbnail.
// Usage: npm run sheet -- [group...]
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { GROUPS, loadElements } from '../src/index.mjs';
import { footprint, planSvg } from '../src/render/plan.mjs';

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const elements = await loadElements();
const out = new URL('../review/', import.meta.url);
mkdirSync(out, { recursive: true });

const PX = 1.2; // px per cm at plan scale
const uri = (s) =>
  'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');
const grid = `background-color:#fff;background-image:linear-gradient(#e9eef3 1px,transparent 1px),linear-gradient(90deg,#e9eef3 1px,transparent 1px);background-size:${10 * PX}px ${10 * PX}px;`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
for (const group of GROUPS) {
  if (only.length && !only.includes(group.id)) continue;
  const items = elements.filter((e) => e.group === group.id);
  if (!items.length) continue;
  const scale = items
    .map((e) => {
      const fp = footprint(e);
      return `<figure style="margin:0;text-align:center;font-size:10px;max-width:${Math.max(90, fp.w * PX)}px"><img src="${uri(planSvg(e))}" style="width:${fp.w * PX}px;height:${fp.d * PX}px;display:block;margin:auto"><figcaption>${e.id}<br>${e.size.w}×${e.size.d}×${e.size.h}</figcaption></figure>`;
    })
    .join('');
  const thumbs = items
    .map(
      (e) =>
        `<div style="width:130px;background:#fff;border-radius:8px;box-shadow:0 1px 3px #0002;padding:6px;text-align:center;font-size:10px"><img src="${uri(planSvg(e))}" style="width:110px;height:100px;object-fit:contain"><div>${e.name}</div></div>`
    )
    .join('');
  await page.setContent(`<html><body style="margin:0;padding:16px;font:12px system-ui;background:#fafafa">
<h2 style="margin:0 0 8px">${group.name} (${items.length})</h2>
<h3 style="margin:0 0 6px">Plan scale, 1 square = 10 cm</h3>
<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end;padding:12px;${grid}">${scale}</div>
<h3 style="margin:14px 0 6px">Drawer thumbnails</h3>
<div style="display:flex;flex-wrap:wrap;gap:10px">${thumbs}</div></body></html>`);
  const path = new URL(`${group.id}.png`, out).pathname;
  await page.screenshot({ path, fullPage: true });
  console.log(path);
}
await browser.close();
