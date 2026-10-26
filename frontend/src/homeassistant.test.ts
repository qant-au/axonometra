// Accurona: the planner's Home Assistant-only parts show with Home Assistant behind the host, and only then.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { haFeatures } from "./homeassistant.ts";
import { createHass } from "./host/hass.ts";
import { memoryStore } from "./host/store.ts";

test("Home Assistant's own object carries no mark: everything shows, as upstream", () => {
  assert.equal(haFeatures({ states: {}, language: "en" }), true);
});

test("the standalone host hides the Home Assistant-only parts unless the embedder turns them on", async () => {
  const off = await createHass({ store: memoryStore() });
  assert.equal(haFeatures(off.hass), false);
  const on = await createHass({ store: memoryStore(), homeAssistant: true });
  assert.equal(haFeatures(on.hass), true);
});

test("the hooks stay in place across upstream merges", () => {
  // hooks in upstream's components, not units of their own: this keeps each one there
  const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
  const panel = read("./panel.ts");
  for (const hook of ["this._micProbe && this.hass && haFeatures(this.hass)", "const ha = haFeatures(this.hass);", "${this._roomId && ha\n", "${this.tt.session && ha ?", ".voice=${this._voiceHere && ha}", ".central=${ha}"]) {
    assert.ok(panel.includes(hook), `panel.ts: ${hook}`);
  }
  const editor = read("./components/editor.ts");
  for (const hook of ['const haOnly: SettingsTopic[] = ["director", "voice", "locate", "favorites"];', "${ha ? this.renderEnergyChecklist() : nothing}", "haFeatures(this.hass) ? this.renderDeviceList(room) : nothing"]) {
    assert.ok(editor.includes(hook), `editor.ts: ${hook}`);
  }
  assert.ok(read("./components/view3d.ts").includes("!this.isConnected || !haFeatures(hass)) return;"), "view3d.ts: Assist");
});
