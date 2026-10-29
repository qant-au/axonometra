#!/usr/bin/env node
// Records the plan turntables in docs/demos: each example plan (frontend/src/plans/examples.ts) in the planner's own
// 3D view, turned a full circle.
//
//   cd frontend && npm run build && node ../fork/build-standalone.mjs
//   node ../demos/plans.mjs                       # every plan below
//   node ../demos/plans.mjs peptide-lab           # one of them
//
// Opens the standalone page on the example (index.html?example=<name>), hides the planner's controls, its labels and
// the roof, so the rooms show from above, and renders the turn (record.mjs) from the front left.

import { recordTurn, withBrowser } from "./record.mjs";

/** The plans: how high the camera circles (degrees above the ground) and how close, against the planner's own fit. */
const PLANS = {
  "family-home-two-storey": { elevation: 42, zoom: 1.12 },
  "ranch-home-basement": { elevation: 40, zoom: 1.0 },
  "acreage-home": { elevation: 40, zoom: 0.85 },
  "peptide-lab": { elevation: 46, zoom: 1.0 },
  "real-estate-office": { elevation: 46, zoom: 1.02 },
  "shed-workshop": { elevation: 34, zoom: 0.95 },
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLANS);
await withBrowser("axonometra-plans.js", async (page, base) => {
  for (const name of names) {
    if (!(name in PLANS)) throw new Error(`no such plan in the recording list: ${name}`);
    await page.goto(`${base}/index.html?example=${encodeURIComponent(name)}&lang=en`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelector("axonometra-view3d")?.viewer, { timeout: 30000 });
    const { elevation, zoom } = PLANS[name];
    // the view alone, roof off, floors settled where the house view puts them
    await page.evaluate(async () => {
      const style = (root, css) => root.appendChild(Object.assign(document.createElement("style"), { textContent: css }));
      const panel = window.axonometra.element.shadowRoot;
      style(panel, ".fp3d-header, .fp3d-nav, .fp3d-overlay { display: none !important; }");
      const view = panel.querySelector("axonometra-view3d");
      style(view.shadowRoot, ".fp3d-thumbs, .fp3d-find-btn, .fp3d-walk-btn, .fp3d-eye, .fp3d-labels { display: none !important; }");
      view.hideRoof = true;
      await new Promise((ok) => setTimeout(ok, 500));
      view.viewer.resetView();
      await new Promise((ok) => setTimeout(ok, 2500));
    });
    await recordTurn(page, `plan-${name}`, (p, angle) =>
      p.evaluate(
        (angle, elevation, zoom) =>
          new Promise((ok) => {
            const viewer = window.axonometra.element.shadowRoot.querySelector("axonometra-view3d").viewer;
            const view = viewer.controls.view;
            // the fitted view, kept from the first frame: the house view's side (front left), distance and target
            window.__fit ??= { theta: view.theta, radius: view.radius };
            view.theta = window.__fit.theta + (angle * Math.PI) / 180;
            view.radius = window.__fit.radius * zoom;
            view.phi = ((90 - elevation) * Math.PI) / 180;
            // the ground's grid turning with the camera is most of a GIF's size: the building stands on its own
            viewer.ground.visible = false;
            viewer.invalidate();
            requestAnimationFrame(() => requestAnimationFrame(ok));
          }),
        angle,
        elevation,
        zoom,
      ),
      // thin glowing lines on dark: a small palette loses nothing you can see
      { colors: 64, lossy: 80 },
    );
  }
});
