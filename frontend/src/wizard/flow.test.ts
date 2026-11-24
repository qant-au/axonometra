import assert from "node:assert/strict";
import { test } from "node:test";
import { shipdFeasible } from "../hull/shipd.ts";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { vesselMounts } from "../vessel/shell.ts";
import { vesselOf, type VesselSpec } from "../vessel/spec.ts";
import { EXAMPLE_DETAILS, noDetails } from "./details.ts";
import { engineMass, outboardRoom, proposeEquipment, tankMass, withEquipment } from "./equipment.ts";
import { finish, MAX_ENGINES, outboardsFit, problems, ready, startState, vesselDefaults, vesselProblems, vesselSpec, type FirstRunState, type VesselBasics } from "./flow.ts";
import { HULL_TYPES, hullType } from "./hulls.ts";
import { CARAVAN_SIZES, caravanPlan, caravanProblems, HOUSE_DEFAULTS, housePlan, houseProblems, MAX_LEVELS } from "./structures.ts";

const EXAMPLE = EXAMPLE_VESSELS["fishing-boat-6.5m"].spec;
const PLATE = hullType("fishing-boat-6.5m")!;
/** The plate boat's recipe at her own size. */
const RECIPE = PLATE.recipe(PLATE.measures);
const boat = (change: Partial<VesselBasics> = {}): FirstRunState => ({ ...startState(), kind: "vessel", vessel: { ...startState().vessel, ...change } });
/** A hull type's basics as it comes, with a change. */
const of = (hull: string, change: Partial<VesselBasics> = {}): VesselBasics => ({ ...vesselDefaults(hull), ...change });
const shipd = (spec: VesselSpec) => (spec.hull as { shipd: number[] }).shipd;
const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);

test("first run: two pages, what to plan and its basics; every kind starts with basics that can be finished", () => {
  const s = startState();
  assert.ok(!ready(s, "kind") && !ready(s, "basics"), "nothing chosen yet");
  assert.deepEqual(problems(s), []);
  for (const kind of ["vessel", "building", "caravan"] as const) {
    assert.ok(ready({ ...s, kind }, "kind"));
    assert.ok(ready({ ...s, kind }, "basics"), `${kind}: the defaults go straight through`);
  }
});

test("first run: every hull type can carry a plan, and starts at its own size and engines", () => {
  assert.deepEqual(HULL_TYPES.map((h) => h.id), ["fishing-boat-6.5m", "fin-keel-sloop", "semi-displacement-cruiser", "planing-cruiser", "rib", "catamaran", "launch"]);
  for (const h of HULL_TYPES) {
    assert.ok(h.title && h.room, h.id);
    assert.deepEqual(h.check(h.measures), [], `${h.id}: its own measures make its hull`);
    assert.deepEqual(vesselProblems(vesselDefaults(h.id)), [], `${h.id}: its own basics go straight through`);
    assert.ok(vesselOf({ vessel: h.recipe(h.measures) }), `${h.id}: a vessel's recipe`);
  }
  assert.equal(hullType("barge"), null);
  assert.deepEqual(vesselDefaults("fishing-boat-6.5m"), { hull: "fishing-boat-6.5m", length: 6.5, beam: 2.45, draft: 0.36, engine: "outboard", engines: 2 });
  assert.deepEqual(vesselDefaults("catamaran"), { hull: "catamaran", length: 12, beam: 6.7, draft: 0.7, hullBeam: 1.5, engine: "inboard", engines: 2 }, "a catamaran asks the beam of a hull too");
  assert.deepEqual(startState().vessel, vesselDefaults(HULL_TYPES[0].id), "the first hull type, at its own size");
});

test("first run: a boat's basics need a hull type, a length, beam and draft that make its hull, and engines that fit", () => {
  assert.deepEqual(vesselProblems(boat().vessel), []);
  assert.deepEqual(vesselProblems(boat({ length: NaN }).vessel), ["length"]);
  assert.deepEqual(vesselProblems(boat({ draft: -1 }).vessel), ["draft"]);
  assert.deepEqual(vesselProblems(boat({ beam: 7 }).vessel), ["beam"], "the beam less than the length");
  assert.deepEqual(vesselProblems(boat({ hull: "barge" }).vessel), ["hull"]);
  assert.deepEqual(vesselProblems(boat({ engines: 1.5 }).vessel), ["engines"]);
  assert.deepEqual(vesselProblems(boat({ engines: MAX_ENGINES + 1, engine: "inboard" }).vessel), ["engines"]);
  const fit = outboardsFit(boat().vessel)!;
  assert.equal(fit, outboardRoom(RECIPE), "as many as hang on the transom at her size");
  assert.deepEqual(vesselProblems(boat({ engines: fit + 1 }).vessel), ["engines"]);
  assert.deepEqual(vesselProblems(boat({ engines: fit + 1, engine: "inboard" }).vessel), [], "inboards do not hang on the transom");
  assert.equal(outboardsFit(boat({ length: NaN }).vessel), null);
  assert.ok(!ready(boat({ length: 0 }), "basics"));
  // what makes no hull of the type is a problem of the measure to look at
  assert.deepEqual(vesselProblems(of("fin-keel-sloop", { draft: 0.6 })), ["draft"], "a sloop's draft is her keel's, deeper than her hull");
  assert.deepEqual(vesselProblems(of("fin-keel-sloop", { beam: 1.5 })), ["beam"], "too narrow for her round bottom");
  assert.deepEqual(vesselProblems(of("catamaran", { hullBeam: NaN })), ["hullBeam"]);
  assert.deepEqual(vesselProblems(of("catamaran", { hullBeam: 3.4 })), ["hullBeam"], "two hulls wider than she is");
  assert.deepEqual(vesselProblems(of("catamaran", { hullBeam: 0.3 })), ["hullBeam"], "no room for a sole in a hull that narrow");
  assert.deepEqual(vesselProblems(of("catamaran", { engine: "outboard", engines: 3 })), ["engines"], "an outboard on each hull");
  assert.equal(outboardsFit(of("catamaran")), 2);
  assert.deepEqual(vesselProblems(of("rib", { engines: 2 })), [], "a RIB's transom takes two");
});

test("first run: the plate boat is fitted to her length, beam and draft", () => {
  const fitted = PLATE.recipe({ length: 7.8, beam: 2.6, draft: 0.4 });
  const p = (fitted.hull as Extract<VesselSpec["hull"], { plate: unknown }>).plate;
  const own = (EXAMPLE.hull as typeof fitted.hull & { plate: typeof p }).plate;
  assert.deepEqual([p.length, p.beam, p.draft], [7.8, 2.6, 0.4]);
  assert.ok(Math.abs(p.transom / p.beam - own.transom / own.beam) < 1e-3, "the shape stays");
  assert.equal(fitted.components, undefined, "her engines come from the basics");
  assert.deepEqual(RECIPE.hull, EXAMPLE.hull, "at her own measures, her own hull");
  assert.deepEqual(RECIPE.open, EXAMPLE.open);
  assert.equal(EXAMPLE.components!.length, 4, "the example is not changed");
});

test("first run: a family's hull is fitted to her measures: the length hers, the breadths by her beam, her draft under the family's freeboard", () => {
  const cruiser = hullType("planing-cruiser")!;
  const own = shipd(cruiser.recipe(cruiser.measures));
  const v = shipd(cruiser.recipe({ length: 9, beam: 3.2, draft: 0.6 }));
  assert.equal(v[0], 9);
  near(v[3] * v[0], 3.2, 1e-4, "her beam");
  near(v[6] * v[4] * v[0], 0.6, 1e-4, "her draft");
  near((1 - v[6]) * v[4] * v[0], ((1 - own[6]) * own[4] * own[0] * 9) / 12, 1e-4, "the freeboard the family has at 9 m");
  near(v[7] / v[3], own[7] / own[3], 1e-4, "the chine keeps its share of the beam");
  assert.ok(shipdFeasible(v));
  // a RIB's beam is over her tube; the hull is inside it
  const rib = hullType("rib")!.recipe({ length: 6.5, beam: 2.95, draft: 0.45 });
  assert.equal(rib.tube!.diameter, 0.502);
  near(shipd(rib)[3] * 6.5 + 1.5 * rib.tube!.diameter, 2.95, 2e-3, "the hull and the tube either side make her beam");
  // a sloop's draft is to the bottom of her keel's bulb; her canoe body keeps its own, by her length
  const sloop = hullType("fin-keel-sloop")!.recipe({ length: 10, beam: 3.3, draft: 1.9 });
  near(shipd(sloop)[6] * shipd(sloop)[4] * 10, 0.55, 1e-4, "the canoe body's draft");
  near(sloop.bulbs![0].nose[1] - sloop.bulbs![0].diameter / 2, -1.9, 1e-3, "the bulb's bottom at her draft");
  near(sloop.foils![0].root[1] - sloop.foils![0].span, sloop.bulbs![0].nose[1], 1e-3, "the fin down to the bulb");
  assert.equal(sloop.foils!.length, 2, "her keel and her rudder");
  // a catamaran's hulls stand apart by her beam less a hull's
  const cat = hullType("catamaran")!.recipe({ length: 10, beam: 5.6, draft: 0.6, hullBeam: 1.2 });
  assert.deepEqual(cat.hull, { parametric: { hull: "catamaran", length: 10, beam: 5.6, hullBeam: 1.2, draft: 0.6, freeboard: 0.75 } });
  assert.equal(cat.open.transom.width, 0, "her transoms stay whole");
});

test("first run: equipment from a boat's readings: outboards on their mounts, tanks full, a battery", () => {
  const proposed = proposeEquipment(EXAMPLE_DETAILS, RECIPE);
  assert.deepEqual(proposed.map((e) => e.key), ["engine:port", "engine:starboard", "tank:fuel.main", "battery:start"]);
  assert.deepEqual(proposed.slice(0, 2).map((e) => e.component.mount), ["outboard 1", "outboard 2"]);
  assert.equal(engineMass({ id: "x", kind: "outboard", power: 110000 }), 233);
  assert.equal(engineMass({ id: "x" }), 150, "an engine of unknown kind and power is taken as an outboard");
  assert.equal(tankMass({ id: "f", fluid: "fuel", capacity: 0.2 }), 168);
  assert.ok(proposed.every((e) => e.include));
  assert.deepEqual(proposed.map((e) => e.component.name), ["Outboard (port)", "Outboard (starboard)", "Fuel Tank (fuel.main), 200 L", "Battery (start)"]);
});

test("first run: no readings of equipment, and the hull's own is proposed", () => {
  const proposed = proposeEquipment({ ...noDetails(), length: 6.5 }, RECIPE, EXAMPLE.components);
  assert.deepEqual(proposed.map((e) => e.component.name), EXAMPLE.components!.map((c) => c.name));
  assert.ok(proposed.every((e) => e.from === "hull"));
});

test("first run: leaving an outboard out hangs the other on the first mount; more than the transom takes stand inside", () => {
  const proposed = proposeEquipment(EXAMPLE_DETAILS, RECIPE);
  proposed[0].include = false;
  const spec = withEquipment(RECIPE, proposed);
  assert.equal(spec.outboards, 1);
  assert.deepEqual(spec.components!.filter((c) => c.mount).map((c) => c.mount), ["outboard"]);
  const many = proposeEquipment({ ...EXAMPLE_DETAILS, engines: Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, kind: "outboard" as const })) }, RECIPE);
  const room = outboardRoom(RECIPE);
  assert.equal(many.filter((p) => p.component.mount).length, room);
  assert.ok(many.slice(room).every((p) => p.component.at), "the rest stand in the boat for the owner to place");
  assert.doesNotThrow(() => withEquipment(RECIPE, many));
});

test("first run: finishing a boat writes a vessel plan on the hull at her size with her engines, opened in 3D", () => {
  const { building, open } = finish(boat({ length: 7.2 }));
  assert.equal(open, "view");
  const v = vesselOf(building)!;
  assert.ok(v, "a vessel plan");
  assert.equal((v.hull as { plate: { length: number } }).plate.length, 7.2);
  assert.equal(v.outboards, 2);
  assert.deepEqual(v.components!.map((c) => [c.name, c.mount]), [["Outboard (1)", "outboard 1"], ["Outboard (2)", "outboard 2"]]);
  assert.deepEqual(building.floors[0].rooms.map((r) => r.name), ["Cockpit", "Motor well"], "her decks");

  const inboard = vesselSpec(boat({ engine: "inboard", engines: 1 }).vessel);
  assert.equal(inboard.outboards, 0);
  assert.deepEqual(inboard.components!.map((c) => [c.name, !!c.at]), [["Engine (1)", true]]);
  const none = vesselSpec(boat({ engines: 0 }).vessel);
  assert.equal(none.outboards, 0);
  assert.deepEqual(none.components, []);
});

test("first run: every hull type finishes into a plan of her: her sole, her engines where her type has them", () => {
  const rooms = (hull: string, change: Partial<VesselBasics> = {}) => {
    const { building, open } = finish({ ...startState(), kind: "vessel", vessel: of(hull, change) });
    assert.equal(open, "view");
    return { v: vesselOf(building)!, floors: building.floors.map((f) => [f.name, f.rooms.map((r) => r.name)]) };
  };
  for (const [hull, room] of [["fin-keel-sloop", "Cabin"], ["semi-displacement-cruiser", "Cabin"], ["planing-cruiser", "Cabin"], ["rib", "Cockpit"], ["launch", "Cockpit"]]) {
    const { v, floors } = rooms(hull);
    assert.deepEqual(floors, [["Sole", [room]]], hull);
    assert.equal(shipd(v)[0], hullType(hull)!.measures.length, `${hull}: her family's hull at her length`);
    assert.equal(v.components!.length, hullType(hull)!.engines, `${hull}: her engines`);
  }
  // a sloop's engine stands in her; a RIB's outboard hangs on her transom's face, and a second beside it
  assert.deepEqual(rooms("fin-keel-sloop").v.components!.map((c) => [c.name, c.at![2]]), [["Engine (1)", 0]]);
  const rib = rooms("rib", { engines: 2 }).v;
  assert.deepEqual([rib.outboards, rib.components!.map((c) => c.mount), vesselMounts(rib).map((m) => m.at[2])], [2, ["outboard 1", "outboard 2"], [-0.33, 0.33]]);
  assert.ok(rib.tube, "inside her tube");
  // a catamaran: a sole in each hull under her bridge deck, an engine in each hull, or an outboard on each
  const cat = rooms("catamaran");
  assert.deepEqual(cat.floors, [["Sole", ["Port Hull", "Starboard Hull"]], ["Bridge Deck", ["Bridge Deck"]]]);
  assert.deepEqual(cat.v.components!.map((c) => [c.name, c.at![2]]), [["Engine (1)", -2.6], ["Engine (2)", 2.6]]);
  const hung = rooms("catamaran", { engine: "outboard" }).v;
  assert.deepEqual([hung.outboards, vesselMounts(hung).map((m) => m.at[2])], [2, [-2.6, 2.6]]);
  // twin inboards on one hull stand side by side
  assert.deepEqual(rooms("planing-cruiser").v.components!.map((c) => c.at![2]), [-0.4, 0.4]);
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
