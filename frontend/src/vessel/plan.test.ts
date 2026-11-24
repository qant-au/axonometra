import assert from "node:assert/strict";
import { test } from "node:test";
import { halfAt } from "../hull/sections.ts";
import { pointInPolygon } from "../model.ts";
import { EXAMPLE_VESSELS, examplePlan } from "../plans/examples.ts";
import { SHIPD_EXAMPLES } from "../hull/examples.ts";
import { vesselMeshes } from "./meshes.ts";
import { hullCount, vesselMounts, vesselShells } from "./shell.ts";
import { vesselBuilding, vesselFloors } from "./plan.ts";
import { vesselOf, type VesselSpec } from "./spec.ts";

const spec = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;
const vesselShell = (s: VesselSpec) => vesselShells(s)[0].open;
// the other hull sources: a RIB on its family's Ship-D vector with its tube, a catamaran on the parametric hull
const rib: VesselSpec = { hull: { shipd: SHIPD_EXAMPLES.find((e) => e.name === "rib-6.5m")!.bodies[0].vector }, open: { plating: 0.005, sole: 0.15, transom: { height: 0.6, width: 1.2 } }, tube: { diameter: 0.5 }, outboards: 2 };
const cat: VesselSpec = { hull: { parametric: { hull: "catamaran", length: 12, beam: 6.7, hullBeam: 1.5, draft: 0.7, freeboard: 0.9 } }, open: { plating: 0.005, sole: 0.15, transom: { height: 0.635, width: 0 } } };
const zs = (m: { positions: number[] }) => m.positions.filter((_, i) => i % 3 === 2);

test("vessel: a plan says whether it is drawn in a vessel", () => {
  assert.equal(vesselOf(null), null);
  assert.equal(vesselOf({ floors: [] }), null);
  assert.equal(vesselOf({ vessel: { hull: {} } }), null, "half a recipe is no vessel");
  assert.deepEqual(vesselOf({ vessel: spec }), spec);
  for (const s of [rib, cat]) assert.equal(vesselOf({ vessel: s }), s, "whatever her hull is built from");
  assert.deepEqual([spec, rib, cat].map(hullCount), [1, 1, 2]);
});

test("vessel: a hull with a stern of its own has its sole, its tube and its mounts on the transom's face", () => {
  const [floor, ...rest] = vesselFloors(rib);
  assert.equal(rest.length, 0);
  assert.deepEqual(floor.rooms.map((r) => r.name), ["Cockpit"]);
  const shell = vesselShell(rib);
  for (const [x, z] of floor.rooms[0].points) assert.ok(Math.abs(z) <= (halfAt(shell.inner, x, 0.15) ?? 0) + 1e-3, `the sole inside the plating at ${x}, ${z}`);
  const meshes = vesselMeshes(rib);
  assert.deepEqual([...new Set(meshes.map((m) => m.name))], ["skin", "gunwale (port)", "gunwale (starboard)", "inside", "tube"]);
  const tube = meshes.find((m) => m.name === "tube")!;
  assert.ok(Math.max(...zs(tube)) > Math.max(...zs(meshes[0])), "the tube outboard of the hull");
  const mounts = vesselMounts(rib);
  assert.deepEqual(mounts.map((m) => m.name), ["outboard 1", "outboard 2"]);
  assert.ok(mounts.every((m) => m.at[0] === shell.mountX && m.at[1] === shell.mount) && shell.mountX > 0);
  const keeled: VesselSpec = { ...rib, tube: undefined, foils: [{ root: [3.6, -0.3, 0], rootChord: 0.7, tipChord: 0.5, span: 0.8 }], bulbs: [{ nose: [3.6, -1.1, 0], length: 1.2, diameter: 0.25 }] };
  assert.deepEqual(vesselMeshes(keeled).slice(-2).map((m) => m.name), ["foil", "bulb"], "a keel and its bulb are drawn under her");
});

test("vessel: a catamaran has a sole in each hull and her bridge deck across them", () => {
  const [sole, bridge, ...rest] = vesselFloors(cat);
  assert.equal(rest.length, 0);
  assert.deepEqual(sole.rooms.map((r) => r.name), ["Port Hull", "Starboard Hull"]);
  assert.deepEqual([bridge.name, bridge.elevation, bridge.rooms.map((r) => r.name)], ["Bridge Deck", 0.9, ["Bridge Deck"]]);
  assert.equal(sole.height, 0.75, "from the sole up to the bridge deck");
  const [port, starboard] = sole.rooms.map((r) => r.points.map((p) => p[1]));
  // the hulls stand 5.2 m apart: her beam less a hull's
  assert.ok(Math.max(...port) < -1.8 && Math.min(...port) > -3.35 && Math.min(...starboard) > 1.8 && Math.max(...starboard) < 3.35);
  assert.deepEqual(port.map((z) => -z).sort(), [...starboard].sort(), "the same either side");
  const deck = bridge.rooms[0].points;
  assert.ok(Math.min(...deck.map((p) => p[1])) < -3.2 && Math.max(...deck.map((p) => p[1])) > 3.2, "out to the outside of both hulls");
  assert.ok(Math.abs(Math.max(...deck.map((p) => p[0])) - 0.65 * 12) < 0.05, "forward of it the bows stand apart");
  assert.ok(pointInPolygon([3, 0], deck), "across the water between the hulls");
  const skins = vesselMeshes(cat).filter((m) => m.name === "skin");
  assert.deepEqual(skins.map((m) => Math.round(((Math.min(...zs(m)) + Math.max(...zs(m))) / 2) * 100) / 100), [-2.6, 2.6]);
  assert.deepEqual(vesselMounts({ ...cat, outboards: 2 }).map((m) => [m.name, m.at[2]]), [["outboard 1", -2.6], ["outboard 2", 2.6]], "an outboard on each hull");
  assert.deepEqual(vesselMounts({ ...cat, outboards: 1 }).map((m) => [m.name, m.at[2]]), [["outboard", -2.6]]);
  assert.throws(() => vesselMounts({ ...cat, outboards: 3 }), /do not fit/, "a whole transom takes one");
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
