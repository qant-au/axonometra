// Accurona: the vessel's hooks in upstream's files stay in place across upstream merges.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");

test("the 3D view draws a vessel plan's hull, and the build makes its bundle", () => {
  const viewer = read("../viewer/viewer3d.ts");
  for (const hook of ['import { VesselLayer } from "./vessel.ts";', "private readonly vessel = new VesselLayer(", "void this.vessel.set(building);", "this.vessel.dispose();"]) assert.ok(viewer.includes(hook), `viewer3d.ts: ${hook}`);
  const build = read("../../build.mjs");
  for (const hook of ['entryPoints: ["src/vessel/entry.ts"]', "viewerConfig.define.__FP3D_VESSEL_HASH__ = ", '"accurona-vessel.js": ']) assert.ok(build.includes(hook), `build.mjs: ${hook}`);
});

test("an empty planner opens the first-run wizard, and the build makes its bundle", () => {
  const panel = read("../panel.ts");
  for (const hook of ['import { firstRunLabel, loadWizard } from "./load-wizard.ts";', "if (b && !b.floors.length && this.isAdmin && !this.firstRunShown) {", "m.openFirstRun(this.hass?.language ?? \"en\", (r) => {", "data-first-run @click=${() => this.openFirstRun()}"]) assert.ok(panel.includes(hook), `panel.ts: ${hook}`);
  const build = read("../../build.mjs");
  for (const hook of ['entryPoints: ["src/wizard/entry.ts"]', "__FP3D_WIZARD_HASH__: JSON.stringify(wizardHash)", "hashOf(wizardConfig.outfile)", '"accurona-wizard.js": ']) assert.ok(build.includes(hook), `build.mjs: ${hook}`);
});

test("the editor shows the mass switch and an item's mass field, and draws a module's number field", () => {
  const editor = read("../components/editor.ts");
  for (const hook of ['import { massFields, massSettingFields } from "../vessel/mass.ts";', "this.renderFields(massFields(this._doc, f, ", "this.renderFields(massSettingFields(this._doc, ", 'case "number":', "f.set(numberField("]) assert.ok(editor.includes(hook), `editor.ts: ${hook}`);
  assert.ok(read("../modules.ts").includes('| { kind: "number"; label: string; value: number | null;'), "modules.ts: the number field");
});
