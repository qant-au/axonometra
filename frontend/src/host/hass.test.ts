// Axonometra: the engine's calls answered without Home Assistant.

import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBuilding, newFloor } from "../model.ts";
import { createHass } from "./hass.ts";
import { staticSignals } from "./signals.ts";
import { memoryStore } from "./store.ts";

test("a new host starts from an empty plan and keeps what the editor saves", async () => {
  const store = memoryStore();
  const { hass } = await createHass({ store });
  const first = await hass.callWS<{ building: { floors: unknown[] }; revision: number }>({ type: "axonometra/building/get" });
  assert.equal(first.revision, 0);
  assert.deepEqual(first.building.floors, []);

  const plan = { ...emptyBuilding(), floors: [newFloor("a", "Deck", 0)] };
  const seen: number[] = [];
  await hass.connection.subscribeMessage<{ revision: number }>((m) => seen.push(m.revision), { type: "axonometra/building/subscribe" });
  const saved = await hass.callWS<{ revision: number }>({ type: "axonometra/building/save", building: plan });
  assert.equal(saved.revision, 1);
  assert.deepEqual(seen, [1]);
  assert.equal((await store.load())?.building.floors[0].name, "Deck");

  // a second host on the same store opens the saved plan
  const again = await createHass({ store });
  const loaded = await again.hass.callWS<{ revision: number }>({ type: "axonometra/building/get" });
  assert.equal(loaded.revision, 1);
});

test("pictures round-trip and a missing one is not_found", async () => {
  const { hass } = await createHass({ store: memoryStore() });
  await hass.callWS({ type: "axonometra/image/set", image_id: "p1", data: "data:image/png;base64,AA==" });
  assert.deepEqual(await hass.callWS({ type: "axonometra/image/get", image_id: "p1" }), { data: "data:image/png;base64,AA==" });
  await assert.rejects(hass.callWS({ type: "axonometra/image/get", image_id: "nope" }), { code: "not_found" });
});

test("restore points bring an earlier plan back as a new revision", async () => {
  const { hass } = await createHass({ store: memoryStore() });
  await hass.callWS({ type: "axonometra/building/save", building: { ...emptyBuilding(), floors: [newFloor("a", "One", 0)] } });
  await hass.callWS({ type: "axonometra/history/snapshot" });
  await hass.callWS({ type: "axonometra/building/save", building: emptyBuilding() });
  const { snapshots } = await hass.callWS<{ snapshots: { id: string; floors: number }[] }>({ type: "axonometra/history/list" });
  assert.equal(snapshots[0].floors, 1);
  assert.deepEqual(await hass.callWS({ type: "axonometra/history/restore", snapshot_id: snapshots[0].id }), { revision: 3 });
});

test("what only Home Assistant can answer is refused the way Home Assistant refuses it", async () => {
  const { hass } = await createHass({ store: memoryStore() });
  await assert.rejects(hass.callWS({ type: "assist_pipeline/pipeline/list" }), { code: "not_supported" });
  await assert.rejects(hass.callWS({ type: "recorder/statistics_during_period" }), { code: "not_supported" });
  await assert.rejects(hass.callService("light", "turn_on", { entity_id: "light.x" }), { code: "not_supported" });
  const lic = await hass.callWS<{ active: boolean }>({ type: "axonometra/license/get" });
  assert.equal(lic.active, false);
});

test("signals become states, and each change brings a new object", async () => {
  const signals = staticSignals({ "sensor.fuel": { state: "62", attributes: { unit_of_measurement: "%" } } });
  const handle = await createHass({ store: memoryStore(), signals });
  const before = handle.hass;
  assert.equal(before.states["sensor.fuel"].state, "62");
  const changes: string[] = [];
  handle.onChange((h) => changes.push(h.states["sensor.fuel"].state));
  signals.set("sensor.fuel", "61");
  assert.deepEqual(changes, ["61"]);
  assert.notEqual(handle.hass, before);
  assert.equal(handle.hass.states["sensor.fuel"].attributes.unit_of_measurement, "%");
  handle.dispose();
  signals.set("sensor.fuel", "60");
  assert.deepEqual(changes, ["61"]);
});

test("a source that takes commands receives the plan's service calls", async () => {
  const calls: string[] = [];
  const signals = { ...staticSignals(), act: async (domain: string, service: string, data: Record<string, unknown>) => void calls.push(`${domain}.${service} ${String(data.entity_id)}`) };
  const { hass } = await createHass({ store: memoryStore(), signals });
  await hass.callService("switch", "turn_on", { entity_id: "switch.bilge_pump" });
  assert.deepEqual(calls, ["switch.turn_on switch.bilge_pump"]);
});
