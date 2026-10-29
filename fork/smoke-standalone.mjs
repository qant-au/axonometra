// Axonometra: a smoke check of the standalone build (run fork/build-standalone.mjs first).
//
//   cd frontend && node ../fork/smoke-standalone.mjs
//
// Serves dist/standalone, opens the demo page in a headless Chrome, and checks that the planner mounts with no
// Home Assistant: the panel renders, the editor opens, a plan saved through the host comes back. Any error the
// page throws fails the check. Writes dist/standalone-smoke.png. CHROME_PATH overrides the browser.

import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "dist/standalone");
const puppeteer = createRequire(join(root, "frontend/package.json"))("puppeteer-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };

if (!existsSync(join(dir, "axonometra-host.js"))) {
  console.error("No standalone build: run node ../fork/build-standalone.mjs first.");
  process.exit(2);
}
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(dir, path === "/" ? "index.html" : path);
  if (!file.startsWith(dir) || !existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${server.address().port}/index.html?fresh&lang=en`;

const executablePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean).find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const failures = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("pageerror", (err) => failures.push(`page error: ${err.message}`));
  page.on("requestfailed", (req) => failures.push(`request failed: ${req.url()}`));
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelector("h1"), { timeout: 15000 });

  const title = await page.evaluate(() => window.axonometra.element.shadowRoot.querySelector("h1").textContent.trim());
  if (title !== "Axonometra") failures.push(`panel title is "${title}"`);

  // the editor opens (its own bundle, loaded lazily beside the main one)
  await page.evaluate(() => {
    const tabs = [...window.axonometra.element.shadowRoot.querySelectorAll(".fp3d-seg button")];
    tabs.find((b) => b.getAttribute("aria-pressed") === "false" && !b.classList.contains("fp3d-tab-ext"))?.click();
  });
  await page.waitForFunction(() => customElements.get("axonometra-editor"), { timeout: 15000 });
  const tabs = await page.evaluate(() =>
    [...window.axonometra.element.shadowRoot.querySelectorAll(".fp3d-seg button")].filter((b) => getComputedStyle(b).display !== "none").length,
  );
  if (tabs !== 2) failures.push(`expected the View and Editor tabs only (no shop page), found ${tabs}`);

  // a plan saved through the host comes back from it
  const revision = await page.evaluate(async () => {
    const hass = window.axonometra.element.hass;
    const { building } = await hass.callWS({ type: "axonometra/building/get" });
    await hass.callWS({ type: "axonometra/building/save", building: { ...building, floors: [{ id: "f1", name: "Deck", elevation: 0, height: 2.1, rooms: [], walls: [], openings: [], furniture: [] }] } });
    return (await hass.callWS({ type: "axonometra/building/get" })).revision;
  });
  if (revision !== 1) failures.push(`saved plan came back at revision ${revision}`);

  await new Promise((ok) => setTimeout(ok, 1500));
  await page.screenshot({ path: join(root, "dist/standalone-smoke.png") });

  // Home Assistant's parts: hidden with no Home Assistant behind the host, shown when the page turns them on (?ha).
  // The 3D view draws its chips only for a plan with a room, so one is saved first; the time-travel chip stands in
  // for the rest (the hooks themselves are pinned by frontend/src/homeassistant.test.ts)
  const ttChip = async (address) => {
    await page.goto(address, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelector("h1"), { timeout: 15000 });
    await page.evaluate(async () => {
      const hass = window.axonometra.element.hass;
      const { building } = await hass.callWS({ type: "axonometra/building/get" });
      const room = { id: "r1", name: "Saloon", area_id: null, points: [[0, 0], [4, 0], [4, 3], [0, 3]], floor_material: "wood" };
      await hass.callWS({ type: "axonometra/building/save", building: { ...building, floors: [{ id: "f1", name: "Deck", elevation: 0, height: 2.1, cut_height: 1.15, rooms: [room], openings: [], furniture: [], placements: [], background: null, outdoor: [], walls: [], ha_floor: null }] } });
    });
    // the panel reads the plan when it opens: reload, then make sure the 3D view is showing (it keeps the last mode)
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelector(".fp3d-seg button"), { timeout: 15000 });
    await page.evaluate(() => {
      const first = window.axonometra.element.shadowRoot.querySelector(".fp3d-seg button");
      if (first.getAttribute("aria-pressed") !== "true") first.click();
    });
    await page.waitForFunction(() => window.axonometra.element.shadowRoot.querySelector(".fp3d-overlay"), { timeout: 15000 });
    return page.evaluate(() => !!window.axonometra.element.shadowRoot.querySelector(".axonometra-tt-chip"));
  };
  // a plan kept in the browser (not ?fresh), so it is there after the reload
  const kept = url.replace("?fresh", "?plan=smoke-ha");
  if (await ttChip(kept)) failures.push("the time-travel chip shows with no Home Assistant");
  if (!(await ttChip(`${kept}&ha`))) failures.push("with ?ha the time-travel chip does not show");

  // an example plan opens in memory (?example=), all its rooms in the 3D view (frontend/src/plans/examples.ts)
  await page.goto(url.replace("?fresh", "?example=peptide-lab"), { waitUntil: "networkidle0" });
  try {
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelectorAll(".fp3d-room-chip").length === 13, { timeout: 15000 });
  } catch {
    failures.push("?example=peptide-lab does not open the lab's 13 rooms");
  }

  // a plan drawn in a vessel loads the vessel bundle (the hull) and shows its decks' rooms (frontend/src/vessel/)
  const vesselBundle = page.waitForResponse((r) => r.url().includes("axonometra-vessel.js") && r.status() === 200, { timeout: 15000 }).catch(() => null);
  await page.goto(url.replace("?fresh", "?example=fishing-boat-6.5m"), { waitUntil: "networkidle0" });
  if (!(await vesselBundle)) failures.push("?example=fishing-boat-6.5m does not load axonometra-vessel.js");
  try {
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelectorAll(".fp3d-room-chip").length === 2, { timeout: 15000 });
  } catch {
    failures.push("?example=fishing-boat-6.5m does not open the boat's cockpit and motor well");
  }

  // the example boat, kept for the mass checks below (the wizard runs replace the page's plan)
  const boat = await page.evaluate(async () => (await window.axonometra.element.hass.callWS({ type: "axonometra/building/get" })).building);
  // the first-run wizard (frontend/src/wizard/): an empty plan opens it by itself; a boat from the example readings
  // goes through every step and lands on the water with her decks; a building lands in the editor, empty
  const wizard = async (kind, source) => {
    await page.goto(url, { waitUntil: "networkidle0" });
    try {
      await page.waitForFunction(() => document.querySelector("axonometra-first-run")?.shadowRoot?.querySelector("[data-kind]"), { timeout: 15000 });
    } catch {
      failures.push("an empty plan does not open the first-run wizard");
      return null;
    }
    return page.evaluate(
      async (kind, source) => {
        const settle = () => new Promise((ok) => setTimeout(ok, 150));
        const root = () => document.querySelector("axonometra-first-run")?.shadowRoot;
        const seen = [];
        const click = async (sel) => {
          const b = root().querySelector(sel);
          if (!b || b.disabled) throw new Error(`${sel} is ${b ? "disabled" : "missing"} on ${seen.at(-1)}`);
          b.click();
          await settle();
        };
        const step = () => root().querySelector("section").dataset.body;
        seen.push(step());
        await click(`[data-kind="${kind}"]`);
        if (kind === "vessel") {
          seen.push(step());
          await click(`[data-source="${source}"]`);
          if (source === "manual") {
            const len = root().querySelector('[data-field="length"]');
            len.value = "7.2";
            len.dispatchEvent(new Event("change"));
            await settle();
          }
          while (root().querySelector("[data-next]")) {
            seen.push(step());
            await click("[data-next]");
          }
        }
        seen.push(step());
        await click("[data-finish]");
        // the planner saves an edit after a short pause
        let building;
        for (let i = 0; i < 40; i++) {
          ({ building } = await window.axonometra.element.hass.callWS({ type: "axonometra/building/get" }));
          if (kind !== "vessel" || building.vessel) break;
          await settle();
        }
        return { seen, open: !!root(), vessel: building.vessel ?? null, floors: building.floors.length };
      },
      kind,
      source,
    );
  };
  const boatRun = await wizard("vessel", "example");
  if (boatRun) {
    if (boatRun.seen.join(",") !== "kind,source,details,hull,equipment,review") failures.push(`the wizard's steps for a boat were ${boatRun.seen}`);
    if (boatRun.open) failures.push("the wizard stays open after finishing");
    if (boatRun.vessel?.name !== "Example" || boatRun.vessel?.outboards !== 2 || boatRun.vessel?.components?.length !== 4) failures.push(`the wizard's boat came out as ${JSON.stringify(boatRun.vessel)}`);
    try {
      await page.waitForFunction(() => window.axonometra.element.shadowRoot.querySelectorAll(".fp3d-room-chip").length === 2, { timeout: 15000 });
    } catch {
      failures.push("the wizard's boat does not land in 3D with her cockpit and motor well");
    }
    await new Promise((ok) => setTimeout(ok, 1500));
    await page.screenshot({ path: join(root, "dist/standalone-smoke-wizard-boat.png") });
  }
  const typed = await wizard("vessel", "manual");
  if (typed && typed.vessel?.hull?.plate?.length !== 7.2) failures.push(`a boat typed in at 7.2 m came out as ${JSON.stringify(typed?.vessel?.hull)}`);
  const house = await wizard("building");
  if (house) {
    if (house.seen.join(",") !== "kind,review" || house.vessel || house.floors !== 0) failures.push(`the wizard's building run was ${JSON.stringify(house)}`);
    try {
      await page.waitForFunction(() => window.axonometra.element.shadowRoot.querySelector("axonometra-editor"), { timeout: 15000 });
    } catch {
      failures.push("finishing the wizard with a building does not open the editor");
    }
  }

  // mass calculation, off and on (frontend/src/vessel/mass.ts): the house settings show the switch as the plan has
  // it; with it on, an item on the deck has a mass field showing its default, and a mass typed in is saved with it
  for (const mass of [false, true]) {
    const label = `mass ${mass ? "on" : "off"}`;
    await page.goto(url.replace("?fresh", `?plan=smoke-mass-${mass}`), { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.axonometra?.element?.hass, { timeout: 15000 });
    await page.evaluate(async (boat, mass) => {
      const hass = window.axonometra.element.hass;
      const sideboard = { id: "smoke_item", type: "sideboard", x: 3, z: 0, rotation: 0, w: 0.6, d: 0.6, h: 0.5, variant: null, entity: null, power: null };
      const floors = boat.floors.map((f, i) => (i === 0 ? { ...f, furniture: [sideboard] } : f));
      await hass.callWS({ type: "axonometra/building/save", building: { ...boat, floors, settings: { ...boat.settings, mass } } });
    }, boat, mass);
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.axonometra?.element?.shadowRoot?.querySelector(".fp3d-seg button"), { timeout: 15000 });
    await page.evaluate(() => {
      const tabs = [...window.axonometra.element.shadowRoot.querySelectorAll(".fp3d-seg button")];
      tabs.find((b) => b.getAttribute("aria-pressed") === "false" && !b.classList.contains("fp3d-tab-ext"))?.click();
    });
    const editor = () => window.axonometra.element.shadowRoot.querySelector("axonometra-editor");
    await page.waitForFunction((editor) => new Function(`return (${editor})()`)()?.shadowRoot?.querySelector(".fp3d-seg-settings button"), { timeout: 15000 }, editor.toString());
    const shown = await page.evaluate(async (mass) => {
      const ed = window.axonometra.element.shadowRoot.querySelector("axonometra-editor");
      const settle = () => new Promise((ok) => setTimeout(ok, 200));
      ed.shadowRoot.querySelector(".fp3d-seg-settings button").click();
      await settle();
      [...ed.shadowRoot.querySelectorAll(".fp3d-menu-item")].find((b) => b.textContent.includes("House"))?.click();
      await settle();
      ed.shadowRoot.querySelector(".fp3d-dialog details")?.setAttribute("open", "");
      await settle();
      const check = [...ed.shadowRoot.querySelectorAll(".fp3d-dialog label.fp3d-check")].find((l) => l.textContent.includes("Calculate masses"));
      const out = { check: check ? check.querySelector("input").checked : null };
      ed.shadowRoot.querySelector(".fp3d-dialog-head button")?.click();
      // the item's form: selected as a tap on it would
      ed._furnitureId = "smoke_item";
      ed.requestUpdate();
      await settle();
      const field = [...ed.shadowRoot.querySelectorAll("label.fp3d-field")].find((l) => l.textContent.includes("Mass (kg)"));
      out.field = field ? field.querySelector("input").placeholder : null;
      if (field && mass) {
        const input = field.querySelector("input");
        input.value = "42";
        input.dispatchEvent(new Event("change"));
        await settle();
        field.scrollIntoView({ block: "center" });
      }
      return out;
    }, mass);
    if (shown.check !== mass) failures.push(`${label}: the house settings' switch reads ${shown.check}`);
    if (mass ? shown.field !== "Default 40 kg" : shown.field !== null) failures.push(`${label}: the item's mass field is ${JSON.stringify(shown.field)}`);
    if (mass) {
      await new Promise((ok) => setTimeout(ok, 2500));
      const saved = await page.evaluate(async () => (await window.axonometra.element.hass.callWS({ type: "axonometra/building/get" })).building.floors[0].furniture[0].component);
      if (saved?.mass !== 42) failures.push(`${label}: the mass typed in was saved as ${JSON.stringify(saved)}`);
    }
    await page.screenshot({ path: join(root, `dist/standalone-smoke-mass-${mass ? "on" : "off"}.png`) });
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log("ok   standalone planner mounts, opens the editor, keeps a saved plan, hides Home Assistant's parts unless asked, opens an example plan and an example vessel, walks the first-run wizard for a boat and a building, and takes masses with the switch off and on (dist/standalone-smoke*.png)");
