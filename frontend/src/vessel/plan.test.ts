import assert from "node:assert/strict";
import { test } from "node:test";
import { halfAt } from "../hull/sections.ts";
import { pointInPolygon } from "../model.ts";
import { EXAMPLE_VESSELS, examplePlan } from "../plans/examples.ts";
import { vesselMeshes } from "./meshes.ts";
import { vesselShell } from "./shell.ts";
import { vesselBuilding, vesselFloors } from "./plan.ts";
import { vesselOf } from "./spec.ts";

const spec = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;

test("vessel: a plan says whether it is drawn in a vessel", () => {
  assert.equal(vesselOf(null), null);
  assert.equal(vesselOf({ floors: [] }), null);
  assert.equal(vesselOf({ vessel: { hull: {} } }), null, "half a recipe is no vessel");
  assert.deepEqual(vesselOf({ vessel: spec }), spec);
});

test("vessel: the sole is a floor at its height, its rooms the cockpit and the motor well, with no walls", () => {
  const [floor, ...rest] = vesselFloors(spec);
  assert.equal(rest.length, 0);
  assert.equal(floor.elevation, 0.15);
  assert.ok(floor.height > 0.6 && floor.height < 1.2, `${floor.height} m to the sheer`);
  assert.deepEqual(floor.rooms.map((r) => r.name), ["Cockpit", "Motor well"]);
  for (const r of floor.rooms) assert.ok(r.wall_heights!.length === r.points.length && r.wall_heights!.every((h) => h === 0), `${r.name}: the hull is its side`);
});

test("vessel: the deck lies inside the plating, the cockpit forward of the well", () => {
  const shell = vesselShell(spec);
  const [cockpit, well] = vesselFloors(spec)[0].rooms;
  for (const r of [cockpit, well])
    for (const [x, z] of r.points) assert.ok(Math.abs(z) <= (halfAt(shell.inner, x, 0.15) ?? 0) + 1e-3, `${r.name} at ${x}, ${z}`);
  assert.ok(Math.min(...cockpit.points.map((p) => p[0])) >= 0.75 - 1e-9);
  assert.ok(Math.max(...well.points.map((p) => p[0])) <= 0.75 + 1e-9);
  assert.ok(pointInPolygon([3, 0], cockpit.points) && pointInPolygon([0.4, 0], well.points));
});

test("vessel: the plan carries its recipe, and the example opens as one", () => {
  const b = vesselBuilding(spec);
  assert.deepEqual(b.vessel, spec);
  assert.notEqual(b.vessel, spec, "a copy, not the example itself");
  const { building, warnings } = examplePlan("fishing-boat-6.5m");
  assert.deepEqual(warnings, []);
  assert.deepEqual(vesselOf(building), spec);
});

test("vessel: the 3D view gets the hull's plates, but not the sole the plan draws itself", () => {
  const meshes = vesselMeshes(spec);
  const names = meshes.map((m) => m.name);
  assert.ok(names.includes("skin") && names.includes("transom") && names.includes("inside") && !names.includes("sole"));
  assert.equal(meshes.find((m) => m.name === "skin")!.see, true);
  for (const m of meshes) {
    assert.equal(m.positions.length % 3, 0);
    assert.ok(m.indices.length > 0 && m.indices.every((i) => i < m.positions.length / 3), `${m.name}: indices in range`);
  }
});
