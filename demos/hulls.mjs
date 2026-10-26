#!/usr/bin/env node
// Records the hull turntables in docs/demos: each hull in the hull viewer, turned a full circle on the water.
//
//   cd frontend && npm run build && node ../fork/build-standalone.mjs
//   node ../demos/hulls.mjs                       # every hull below
//   node ../demos/hulls.mjs catamaran-12m         # one of them
//
// Opens hulls.html?bare (the 3D view alone, with the hull's name and note) and renders the turn (record.mjs).

import { recordTurn, withBrowser } from "./record.mjs";

/** The hulls, and how high above the water the camera circles each (degrees). */
const HULLS = {
  "sailing-yacht-10m-keel": 14,
  "rib-6.5m-with-tube": 20,
  "catamaran-12m": 18,
  "swath-25m": 12,
  "container-ship-300m": 16,
  "plate-alloy-fishing-6.5m": 10,
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(HULLS);
await withBrowser("accurona-hulls.js", async (page, base) => {
  for (const name of names) {
    if (!(name in HULLS)) throw new Error(`no such hull in the recording list: ${name}`);
    await page.goto(`${base}/hulls.html?bare&hull=${encodeURIComponent(name)}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.hullViewer?.state().curve.length === 17, { timeout: 60000 });
    // start on the starboard quarter and go once round
    await recordTurn(page, `hull-${name}`, (p, angle) =>
      p.evaluate(
        (az, el) =>
          new Promise((ok) => {
            window.hullViewer.orbit(az, el);
            requestAnimationFrame(() => requestAnimationFrame(ok));
          }),
        225 + angle,
        HULLS[name],
      ),
    );
  }
});
