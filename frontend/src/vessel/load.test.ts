import assert from "node:assert/strict";
import { test } from "node:test";
import type { Furniture } from "../model.ts";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { deckWeights, vesselFloat } from "./load.ts";
import { vesselScene } from "./meshes.ts";
import { vesselBuilding } from "./plan.ts";
import { vesselMounts } from "./shell.ts";
import type { VesselSpec } from "./spec.ts";

const spec = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;
const item = (x: number, z: number, mass: number | null, extra: Partial<Furniture> = {}): Furniture =>
  ({ id: `i${x}${z}`, type: "sideboard", x, z, rotation: 0, w: 0.6, d: 0.6, h: 0.5, variant: null, entity: null, power: null, ...(mass === null ? {} : { component: { mass } }), ...extra }) as Furniture;

test("components: outboards hang on their mounts, the rest stand at their points", () => {
  const mounts = vesselMounts(spec);
  assert.deepEqual(mounts.map((m) => m.name), ["outboard 1", "outboard 2"]);
  const f = vesselFloat(null, spec);
  assert.deepEqual(f.unplaced, []);
  const o1 = f.placed.find((p) => p.name === "Outboard 1")!;
  assert.deepEqual(o1.at, [mounts[0].at[0] - 0.45, mounts[0].at[1] + 0.1, mounts[0].at[2]]);
  assert.deepEqual(f.placed.find((p) => p.name === "Battery")!.at, [0.4, 0.38, 0.5]);
});

test("components: one on a mount the boat does not have is left out, by name", () => {
  const odd: VesselSpec = { ...spec, outboards: 1, components: [{ name: "Kicker", mass: 40, size: [0.4, 1, 0.3], mount: "outboard 2" }] };
  const f = vesselFloat(null, odd);
  assert.deepEqual(f.unplaced, ["Kicker"]);
  assert.equal(f.weights.length, 0);
});

test("components: the load is the plating plus every component, its centre of gravity among them", () => {
  const f = vesselFloat(null, spec);
  const carried = spec.components!.reduce((s, c) => s + c.mass, 0);
  assert.ok(f.load.displacement * 1000 > carried + 300, `plating on top of ${carried} kg`);
  assert.equal(f.weights.reduce((s, w) => s + w.mass, 0), carried);
  assert.ok(f.load.lcg < 2, "the motors pull it aft");
});

test("components: twin outboards put her down by the stern; she still drains", () => {
  const f = vesselFloat(null, spec);
  assert.ok(f.attitude.trim < 0, `trim ${f.attitude.trim}`);
  assert.ok(f.drains.ok, JSON.stringify(f.drains));
});

test("deck items with a mass count where they stand; items without one do not", () => {
  const b = vesselBuilding(spec);
  b.floors[0].furniture.push(item(4.5, 0, 180), item(3, 0.5, null), item(2, -0.5, 0));
  const w = deckWeights(b.floors);
  assert.equal(w.length, 1);
  assert.deepEqual(w[0].at, [4.5, 0.15 + 0.25, 0]);
  const lifted = deckWeights([{ ...b.floors[0], furniture: [item(1, 0, 20, { mount_y: 0.8 })] }]);
  assert.deepEqual(lifted[0].at, [1, 0.15 + 0.8 + 0.25, 0]);
});

test("moving weight forward on the deck brings the bow down", () => {
  const aft = vesselBuilding(spec);
  aft.floors[0].furniture.push(item(1.5, 0, 180));
  const fwd = vesselBuilding(spec);
  fwd.floors[0].furniture.push(item(4.5, 0, 180));
  assert.ok(vesselFloat(fwd, spec).attitude.trim > vesselFloat(aft, spec).attitude.trim);
});

test("heavy items to one side heel her that way", () => {
  const b = vesselBuilding(spec);
  b.floors[0].furniture.push(item(3, 0.8, 200));
  assert.equal(vesselFloat(b, spec).load.tcg! > 0, true);
});

test("the 3D scene: the plates, a box per component, and the water's up direction", () => {
  const s = vesselScene(null, spec);
  for (const c of spec.components!) assert.ok(s.meshes.some((m) => m.name === c.name && m.positions.length === 24 && m.indices.length === 36), c.name);
  const up = s.water!.up;
  assert.ok(Math.abs(Math.hypot(...up) - 1) < 1e-12);
  assert.ok(up[0] > 0, "trimmed by the stern, the water's up leans forward in the boat's frame");
});
