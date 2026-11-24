import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { vesselOf } from "../vessel/spec.ts";
import { EXAMPLE_DETAILS, noDetails } from "./details.ts";
import { engineMass, outboardRoom, proposeEquipment, tankMass, withEquipment } from "./equipment.ts";
import { finish, MAX_ENGINES, outboardsFit, problems, ready, startState, vesselDefaults, vesselProblems, vesselSpec, type FirstRunState } from "./flow.ts";
import { fitHull, HULL_TYPES, hullRecipe } from "./hulls.ts";
import { CARAVAN_SIZES, caravanPlan, caravanProblems, HOUSE_DEFAULTS, housePlan, houseProblems, MAX_LEVELS } from "./structures.ts";

const RECIPE = hullRecipe("fishing-boat-6.5m")!;
const boat = (change: Partial<FirstRunState["vessel"]> = {}): FirstRunState => ({ ...startState(), kind: "vessel", vessel: { ...startState().vessel, ...change } });

test("first run: two pages, what to plan and its basics; every kind starts with basics that can be finished", () => {
  const s = startState();
  assert.ok(!ready(s, "kind") && !ready(s, "basics"), "nothing chosen yet");
  assert.deepEqual(problems(s), []);
  for (const kind of ["vessel", "building", "caravan"] as const) {
    assert.ok(ready({ ...s, kind }, "kind"));
    assert.ok(ready({ ...s, kind }, "basics"), `${kind}: the defaults go straight through`);
  }
});

test("first run: one hull type can carry a plan for now, the hull families to come are listed without a recipe", () => {
  assert.deepEqual(HULL_TYPES.filter((h) => h.spec).map((h) => h.id), ["fishing-boat-6.5m"]);
  assert.ok(HULL_TYPES.length > 1 && HULL_TYPES.slice(1).every((h) => !h.spec && h.title));
  assert.equal(hullRecipe("catamaran"), null);
  assert.deepEqual(vesselDefaults("fishing-boat-6.5m"), { hull: "fishing-boat-6.5m", length: 6.5, beam: 2.45, draft: 0.36, engine: "outboard", engines: 2 });
  assert.deepEqual(startState().vessel, vesselDefaults(HULL_TYPES[0].id), "the first hull type, at its own size");
});

test("first run: a boat's basics need a hull that can be drawn, a length, beam and draft, and engines that fit", () => {
  assert.deepEqual(vesselProblems(boat().vessel), []);
  assert.deepEqual(vesselProblems(boat({ length: NaN }).vessel), ["length"]);
  assert.deepEqual(vesselProblems(boat({ draft: -1 }).vessel), ["draft"]);
  assert.deepEqual(vesselProblems(boat({ beam: 7 }).vessel), ["beam"], "the beam less than the length");
  assert.deepEqual(vesselProblems(boat({ hull: "catamaran" }).vessel), ["hull"]);
  assert.deepEqual(vesselProblems(boat({ engines: 1.5 }).vessel), ["engines"]);
  assert.deepEqual(vesselProblems(boat({ engines: MAX_ENGINES + 1, engine: "inboard" }).vessel), ["engines"]);
  const fit = outboardsFit(boat().vessel)!;
  assert.equal(fit, outboardRoom(RECIPE), "as many as hang on the transom at her size");
  assert.deepEqual(vesselProblems(boat({ engines: fit + 1 }).vessel), ["engines"]);
  assert.deepEqual(vesselProblems(boat({ engines: fit + 1, engine: "inboard" }).vessel), [], "inboards do not hang on the transom");
  assert.equal(outboardsFit(boat({ length: NaN }).vessel), null);
  assert.ok(!ready(boat({ length: 0 }), "basics"));
});

test("first run: a hull is fitted to the boat's length, beam and draft", () => {
  const fitted = fitHull(RECIPE, { length: 7.8, beam: 2.6, draft: 0.4 });
  const p = fitted.hull.plate;
  assert.deepEqual([p.length, p.beam, p.draft], [7.8, 2.6, 0.4]);
  assert.ok(Math.abs(p.transom / p.beam - RECIPE.hull.plate.transom / RECIPE.hull.plate.beam) < 1e-3, "the shape stays");
  assert.equal(fitted.components, undefined, "her engines come from the basics");
  assert.deepEqual(RECIPE, EXAMPLE_VESSELS["fishing-boat-6.5m"].spec, "the recipe is not changed");
  assert.deepEqual(fitHull(RECIPE, {}).hull.plate, RECIPE.hull.plate, "no measures, her own size");
});

test("first run: equipment from a boat's readings: outboards on their mounts, tanks full, a battery", () => {
  const proposed = proposeEquipment(EXAMPLE_DETAILS, fitHull(RECIPE, EXAMPLE_DETAILS));
  assert.deepEqual(proposed.map((e) => e.key), ["engine:port", "engine:starboard", "tank:fuel.main", "battery:start"]);
  assert.deepEqual(proposed.slice(0, 2).map((e) => e.component.mount), ["outboard 1", "outboard 2"]);
  assert.equal(engineMass({ id: "x", kind: "outboard", power: 110000 }), 233);
  assert.equal(engineMass({ id: "x" }), 150, "an engine of unknown kind and power is taken as an outboard");
  assert.equal(tankMass({ id: "f", fluid: "fuel", capacity: 0.2 }), 168);
  assert.ok(proposed.every((e) => e.include));
  assert.deepEqual(proposed.map((e) => e.component.name), ["Outboard (port)", "Outboard (starboard)", "Fuel Tank (fuel.main), 200 L", "Battery (start)"]);
});

test("first run: no readings of equipment, and the hull's own is proposed", () => {
  const proposed = proposeEquipment({ ...noDetails(), length: 6.5 }, fitHull(RECIPE, { length: 6.5 }), RECIPE.components);
  assert.deepEqual(proposed.map((e) => e.component.name), RECIPE.components!.map((c) => c.name));
  assert.ok(proposed.every((e) => e.from === "hull"));
});

test("first run: leaving an outboard out hangs the other on the first mount; more than the transom takes stand inside", () => {
  const fitted = fitHull(RECIPE, EXAMPLE_DETAILS);
  const proposed = proposeEquipment(EXAMPLE_DETAILS, fitted);
  proposed[0].include = false;
  const spec = withEquipment(fitted, proposed);
  assert.equal(spec.outboards, 1);
  assert.deepEqual(spec.components!.filter((c) => c.mount).map((c) => c.mount), ["outboard"]);
  const many = proposeEquipment({ ...EXAMPLE_DETAILS, engines: Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, kind: "outboard" as const })) }, fitted);
  const room = outboardRoom(fitted);
  assert.equal(many.filter((p) => p.component.mount).length, room);
  assert.ok(many.slice(room).every((p) => p.component.at), "the rest stand in the boat for the owner to place");
  assert.doesNotThrow(() => withEquipment(fitted, many));
});

test("first run: finishing a boat writes a vessel plan on the hull at her size with her engines, opened in 3D", () => {
  const { building, open } = finish(boat({ length: 7.2 }));
  assert.equal(open, "view");
  const v = vesselOf(building)!;
  assert.ok(v, "a vessel plan");
  assert.equal(v.hull.plate.length, 7.2);
  assert.equal(v.outboards, 2);
  assert.deepEqual(v.components!.map((c) => [c.name, c.mount]), [["Outboard (1)", "outboard 1"], ["Outboard (2)", "outboard 2"]]);
  assert.ok(building.floors[0].rooms.length > 0, "her decks");

  const inboard = vesselSpec(boat({ engine: "inboard", engines: 1 }).vessel);
  assert.equal(inboard.outboards, 0);
  assert.deepEqual(inboard.components!.map((c) => [c.name, !!c.at]), [["Engine (1)", true]]);
  const none = vesselSpec(boat({ engines: 0 }).vessel);
  assert.equal(none.outboards, 0);
  assert.deepEqual(none.components, []);
});

test("first run: a building is its footprint on every level, the basement below the ground floor, opened in the editor", () => {
  assert.deepEqual(houseProblems(HOUSE_DEFAULTS), []);
  assert.deepEqual(houseProblems({ width: 0, depth: NaN, levels: 1.5, basement: false }), ["width", "depth", "levels"]);
  assert.deepEqual(houseProblems({ ...HOUSE_DEFAULTS, levels: MAX_LEVELS + 1 }), ["levels"]);
  const { building, open } = finish({ ...startState(), kind: "building", building: { width: 9, depth: 7, levels: 2, basement: true } });
  assert.equal(open, "editor");
  assert.equal(vesselOf(building), null);
  assert.deepEqual(building.floors.map((f) => [f.name, f.elevation]), [["Basement", -3], ["Ground Floor", 0], ["First Floor", 3]]);
  for (const f of building.floors) {
    assert.deepEqual(f.rooms.map((r) => r.points), [[[0, 0], [9, 0], [9, 7], [0, 7]]], f.name);
    assert.equal(f.rooms[0].name, f.name);
  }
  assert.equal(new Set(building.floors.flatMap((f) => [f.id, ...f.rooms.map((r) => r.id)])).size, 6, "every id its own");
  assert.equal(housePlan(HOUSE_DEFAULTS).floors.length, 1, "one level, no basement");
  assert.equal(housePlan({ ...HOUSE_DEFAULTS, levels: MAX_LEVELS }).floors.at(-1)!.name, "Ninth Floor");
});

test("first run: a caravan is its body with thin walls, a rigid mobile home with its cab at the front", () => {
  assert.deepEqual(startState().caravan, { type: "towed", ...CARAVAN_SIZES.towed });
  assert.deepEqual(caravanProblems({ type: "towed", length: 0, width: -1 }), ["length", "width"]);
  assert.deepEqual(caravanProblems({ type: "rigid", length: 2.5, width: 2.4 }), ["length"], "no room behind the cab");
  const towed = finish({ ...startState(), kind: "caravan" });
  assert.equal(towed.open, "editor");
  assert.deepEqual(towed.building.floors.map((f) => f.name), ["Caravan"]);
  assert.deepEqual(towed.building.floors[0].rooms.map((r) => [r.name, r.points[2]]), [["Living Area", [6.5, 2.4]]]);
  assert.ok(towed.building.settings.wall_exterior < 0.1);
  const rigid = caravanPlan({ type: "rigid", ...CARAVAN_SIZES.rigid });
  assert.deepEqual(rigid.floors.map((f) => f.name), ["Mobile Home"]);
  assert.deepEqual(rigid.floors[0].rooms.map((r) => [r.name, r.points[0][0], r.points[1][0]]), [["Cab", 0, 1.8], ["Living Area", 1.8, 8]]);
});
