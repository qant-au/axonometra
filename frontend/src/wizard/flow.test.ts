import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { vesselOf } from "../vessel/spec.ts";
import { EXAMPLE_DETAILS, EXAMPLE_SOURCE, noDetails, VESSEL_SOURCES } from "./details.ts";
import { engineMass, outboardRoom, proposeEquipment, tankMass, withEquipment } from "./equipment.ts";
import { detailsProblems, finish, nextStep, previousStep, reachable, startState, stepsFor, withDetails, type FirstRunState } from "./flow.ts";
import { fitHull, HULL_CHOICES, hullDistance, rankHulls } from "./hulls.ts";

const boat = (): FirstRunState => withDetails({ ...startState(), kind: "vessel", source: "example" }, structuredClone(EXAMPLE_DETAILS));

test("first run: a building is the kind step then the review; a boat goes through her source, details, hull and equipment", () => {
  const s = startState();
  assert.deepEqual(stepsFor(s), ["kind", "review"]);
  assert.equal(nextStep(s, "kind"), null, "nothing chosen yet");
  assert.equal(nextStep({ ...s, kind: "building" }, "kind"), "review");
  const v = { ...s, kind: "vessel" as const };
  assert.deepEqual(stepsFor(v), ["kind", "source", "details", "hull", "equipment", "review"]);
  assert.equal(nextStep(v, "source"), null, "no source chosen");
  assert.equal(previousStep(v, "details"), "source");
  assert.equal(previousStep(v, "kind"), null);
  assert.ok(reachable(v, "source") && !reachable(v, "details"), "the stepper only goes as far as the steps are ready");
});

test("first run: the details need a length, and every measure given must be positive (the beam less than the length)", () => {
  assert.deepEqual(detailsProblems(noDetails()), ["length"]);
  assert.deepEqual(detailsProblems({ ...noDetails(), length: 6, draft: -1 }), ["draft"]);
  assert.deepEqual(detailsProblems({ ...noDetails(), length: 6, beam: 7 }), ["beam"]);
  assert.deepEqual(detailsProblems(EXAMPLE_DETAILS), []);
  const s = boat();
  assert.ok(reachable(s, "review"), "the example readings go straight through");
});

test("first run: the example source reads a copy of made-up readings, and is among the sources", async () => {
  assert.ok(VESSEL_SOURCES.includes(EXAMPLE_SOURCE));
  assert.deepEqual(await EXAMPLE_SOURCE.available(), { ok: true });
  const a = await EXAMPLE_SOURCE.read();
  assert.deepEqual(a, EXAMPLE_DETAILS);
  a.tanks.pop();
  assert.equal(EXAMPLE_DETAILS.tanks.length, 1, "a copy");
});

test("first run: the library ranks hulls by fit, and a hull is fitted to the boat's length, beam and draft", () => {
  const choice = HULL_CHOICES[0];
  assert.equal(hullDistance(choice, noDetails()), 0, "no measures, nothing to be off by");
  assert.equal(rankHulls(EXAMPLE_DETAILS)[0].id, "fishing-boat-6.5m");
  const fitted = fitHull(choice, { ...noDetails(), length: 7.8, beam: 2.6, draft: 0.4 });
  const p = fitted.hull.plate;
  assert.deepEqual([p.length, p.beam, p.draft], [7.8, 2.6, 0.4]);
  assert.ok(Math.abs(p.transom / p.beam - choice.spec.hull.plate.transom / choice.spec.hull.plate.beam) < 1e-3, "the shape stays");
  assert.equal(fitted.components, undefined, "the equipment comes from its own step");
  assert.deepEqual(choice.spec, EXAMPLE_VESSELS["fishing-boat-6.5m"].spec, "the library is not changed");
  assert.deepEqual(fitHull(choice, noDetails()).hull.plate, choice.spec.hull.plate, "no measures, her own size");
});

test("first run: the equipment proposed from the readings: outboards on their mounts, tanks full, a battery", () => {
  const s = boat();
  assert.deepEqual(s.equipment.map((e) => e.key), ["engine:port", "engine:starboard", "tank:fuel.main", "battery:start"]);
  assert.deepEqual(s.equipment.slice(0, 2).map((e) => e.component.mount), ["outboard 1", "outboard 2"]);
  assert.equal(engineMass({ id: "x", kind: "outboard", power: 110000 }), 233);
  assert.equal(engineMass({ id: "x" }), 150, "an engine of unknown kind and power is taken as an outboard");
  assert.equal(tankMass({ id: "f", fluid: "fuel", capacity: 0.2 }), 168);
  assert.ok(s.equipment.every((e) => e.include));
});

test("first run: no readings of equipment, and the hull's own is proposed", () => {
  const s = withDetails({ ...startState(), kind: "vessel", source: "manual" }, { ...noDetails(), length: 6.5 });
  assert.deepEqual(s.equipment.map((e) => e.component.name), EXAMPLE_VESSELS["fishing-boat-6.5m"].spec.components!.map((c) => c.name));
  assert.ok(s.equipment.every((e) => e.from === "hull"));
});

test("first run: leaving an outboard out hangs the other on the first mount; more than the transom takes stand inside", () => {
  const s = boat();
  s.equipment[0].include = false;
  const spec = withEquipment(fitHull(HULL_CHOICES[0], s.details), s.equipment);
  assert.equal(spec.outboards, 1);
  assert.deepEqual(spec.components!.filter((c) => c.mount).map((c) => c.mount), ["outboard"]);
  const fitted = fitHull(HULL_CHOICES[0], EXAMPLE_DETAILS);
  const many = proposeEquipment({ ...EXAMPLE_DETAILS, engines: Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, kind: "outboard" as const })) }, fitted);
  const room = outboardRoom(fitted);
  assert.equal(many.filter((p) => p.component.mount).length, room);
  assert.ok(many.slice(room).every((p) => p.component.at), "the rest stand in the boat for the owner to place");
  assert.doesNotThrow(() => withEquipment(fitted, many));
});

test("first run: finishing a boat writes a vessel plan with her name, hull and confirmed equipment, opened in 3D", () => {
  const s = boat();
  s.equipment[3].include = false;
  const { building, open } = finish(s);
  assert.equal(open, "view");
  const v = vesselOf(building)!;
  assert.ok(v, "a vessel plan");
  assert.equal(v.name, "Example");
  assert.equal(v.mmsi, "000000000");
  assert.equal(v.outboards, 2);
  assert.deepEqual(v.components!.map((c) => c.name), ["Outboard (port)", "Outboard (starboard)", "Fuel tank (fuel.main), 200 L"]);
  assert.ok(building.floors[0].rooms.length > 0, "her decks");
});

test("first run: finishing a building writes an empty plan and opens the editor", () => {
  const { building, open } = finish({ ...startState(), kind: "building" });
  assert.equal(open, "editor");
  assert.deepEqual(building.floors, []);
  assert.equal(vesselOf(building), null);
});
