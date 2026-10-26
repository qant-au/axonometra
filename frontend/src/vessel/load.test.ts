import assert from "node:assert/strict";
import { test } from "node:test";
import type { Building, Furniture } from "../model.ts";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { deckWeights, DESIGN, vesselFloat } from "./load.ts";
import { MASS_DEFAULTS } from "./mass.ts";
import { vesselScene } from "./meshes.ts";
import { vesselBuilding } from "./plan.ts";
import { vesselMounts } from "./shell.ts";
import type { VesselSpec } from "./spec.ts";

// Every test that depends on masses runs twice: with the plan's mass calculation on, and off (the default).
const MODES = [true, false] as const;
const spec = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;
const item = (x: number, z: number, mass: number | null, extra: Partial<Furniture> = {}): Furniture =>
  ({ id: `i${x}${z}`, type: "sideboard", x, z, rotation: 0, w: 0.6, d: 0.6, h: 0.5, variant: null, entity: null, power: null, ...(mass === null ? {} : { component: { mass } }), ...extra }) as Furniture;
const plan = (mass: boolean, s: VesselSpec = spec, ...items: Furniture[]): Building => {
  const b = vesselBuilding(s);
  (b.settings as { mass?: boolean }).mass = mass;
  b.floors[0].furniture.push(...items);
  return b;
};
const on = (mass: boolean) => (mass ? "mass on" : "mass off");

test("mass is off unless the plan turns it on", () => {
  const b = vesselBuilding(spec);
  assert.equal(vesselFloat(b, spec).mass, false);
  assert.equal(vesselFloat(null, spec).mass, false);
  assert.equal(vesselFloat(plan(true), spec).mass, true);
});

for (const mass of MODES) {
  test(`components (${on(mass)}): outboards hang on their mounts, the rest stand at their points`, () => {
    const mounts = vesselMounts(spec);
    assert.deepEqual(mounts.map((m) => m.name), ["outboard 1", "outboard 2"]);
    const f = vesselFloat(plan(mass), spec);
    assert.deepEqual(f.unplaced, []);
    const o1 = f.placed.find((p) => p.name === "Outboard 1")!;
    assert.deepEqual(o1.at, [mounts[0].at[0] - 0.45, mounts[0].at[1] + 0.1, mounts[0].at[2]]);
    assert.deepEqual(f.placed.find((p) => p.name === "Battery")!.at, [0.4, 0.38, 0.5]);
  });

  test(`components (${on(mass)}): one on a mount the boat does not have is left out, by name`, () => {
    const odd: VesselSpec = { ...spec, outboards: 1, components: [{ name: "Kicker", mass: 40, size: [0.4, 1, 0.3], mount: "outboard 2" }] };
    const f = vesselFloat(plan(mass, odd), odd);
    assert.deepEqual(f.unplaced, ["Kicker"]);
    assert.equal(f.weights.length, 0);
  });

  test(`the load (${on(mass)}): plating plus every component, or none at all`, () => {
    const f = vesselFloat(plan(mass), spec);
    const carried = spec.components!.reduce((s, c) => s + c.mass, 0);
    if (!mass) {
      assert.equal(f.load, null);
      assert.deepEqual(f.weights, []);
      return;
    }
    assert.ok(f.load!.displacement * 1000 > carried + 300, `plating on top of ${carried} kg`);
    assert.equal(f.weights.reduce((s, w) => s + w.mass, 0), carried);
    assert.ok(f.load!.lcg < 2, "the motors pull it aft");
  });

  test(`how she sits (${on(mass)}): down by the stern with twin outboards, and drains; or at her design waterline`, () => {
    const f = vesselFloat(plan(mass), spec);
    assert.equal(f.capsizes, false);
    if (!mass) {
      assert.deepEqual(f.attitude, DESIGN);
      assert.equal(f.drains, null);
      return;
    }
    assert.ok(f.attitude.trim < 0, `trim ${f.attitude.trim}`);
    assert.ok(f.drains!.ok, JSON.stringify(f.drains));
  });

  test(`deck items (${on(mass)}): counted with their own mass or their default, only while masses are on`, () => {
    const items = [item(4.5, 0, 180), item(3, 0.5, null), item(2, -0.5, 0)];
    const f = vesselFloat(plan(mass, spec, ...items), spec);
    const deck = f.weights.filter((w) => w.name === "sideboard");
    if (!mass) return assert.deepEqual(deck, []);
    assert.deepEqual(deck.map((w) => w.mass), [180, MASS_DEFAULTS.sideboard], "an entered 0 is weightless and left out");
  });

  test(`moving weight forward (${on(mass)}): brings the bow down, or changes nothing`, () => {
    const aft = vesselFloat(plan(mass, spec, item(1.5, 0, 180)), spec).attitude;
    const fwd = vesselFloat(plan(mass, spec, item(4.5, 0, 180)), spec).attitude;
    if (mass) assert.ok(fwd.trim > aft.trim);
    else assert.deepEqual([aft, fwd], [DESIGN, DESIGN]);
  });

  test(`heavy items to one side (${on(mass)}): heel her that way, or change nothing`, () => {
    const f = vesselFloat(plan(mass, spec, item(3, 0.8, 200)), spec);
    if (mass) assert.ok(f.load!.tcg! > 0 && f.attitude.heel !== 0);
    else assert.equal(f.attitude.heel, 0);
  });

  test(`the 3D scene (${on(mass)}): the plates, a box per component, and the water's up direction`, () => {
    const s = vesselScene(plan(mass), spec);
    for (const c of spec.components!) assert.ok(s.meshes.some((m) => m.name === c.name && m.positions.length === 24 && m.indices.length === 36), c.name);
    const up = s.water!.up;
    assert.ok(Math.abs(Math.hypot(...up) - 1) < 1e-12);
    if (mass) assert.ok(up[0] > 0, "trimmed by the stern, the water's up leans forward in the boat's frame");
    else assert.ok(Math.abs(up[0]) < 1e-12 && Math.abs(up[2]) < 1e-12 && s.water!.point[1] === 0, "level, at the design waterline");
  });
}

test("deck weights: at the middle of each item, its own mass or its default; weightless ones left out", () => {
  const b = vesselBuilding(spec);
  b.floors[0].furniture.push(item(4.5, 0, 180), item(3, 0.5, null), item(2, -0.5, 0), item(1, 0, null, { type: "stairwell" }));
  const w = deckWeights(b.floors);
  assert.deepEqual(w.map((x) => x.mass), [180, MASS_DEFAULTS.sideboard]);
  assert.deepEqual(w[0].at, [4.5, 0.15 + 0.25, 0]);
  const lifted = deckWeights([{ ...b.floors[0], furniture: [item(1, 0, 20, { mount_y: 0.8 })] }]);
  assert.deepEqual(lifted[0].at, [1, 0.15 + 0.8 + 0.25, 0]);
});
