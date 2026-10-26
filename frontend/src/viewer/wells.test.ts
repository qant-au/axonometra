import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBuilding, newFloor, setTerrain, type Building, type Opening, type Room } from "../model.ts";
import { windowGetsWell } from "../geometry/wells.ts";
import { buildFloorGeometry } from "./build.ts";
import { buildEarth } from "./earth.ts";

const rect = (id: string, x0: number, x1: number, z1: number): Room => ({ id, name: id, area_id: null, points: [[x0, 0], [x1, 0], [x1, z1], [x0, z1]], floor_material: "wood" });

function house(terrain?: Building["settings"]["terrain"], cellarElevation = -2.6): Building {
  const b = emptyBuilding();
  // two cellar rooms side by side: edge 1 of room "k" is the wall between them
  b.floors = [{ ...newFloor("ug", "UG", cellarElevation), height: 2.4, rooms: [rect("k", 0, 5, 8), rect("l", 5, 10, 8)] }, { ...newFloor("eg", "EG", 0), rooms: [rect("a", 0, 10, 8)] }];
  b.settings = { ...b.settings, wall_exterior: 0.3, wall_interior: 0.12, terrain };
  setTerrain(b);
  return b;
}

const win = (extra: Partial<Opening> = {}): Opening => ({ id: "w", room_id: "k", edge: 0, offset: 2.5, width: 1, type: "window", sill: 1.65, height: 0.5, hinge: "left", leaves: 1, swing: "in", contact2: null, ...extra }) as Opening;

/** Whether 3D draws a well for the window (with its switch on). */
function drawn(b: Building): boolean {
  const f = b.floors[0];
  const earth = buildEarth(b, f, buildFloorGeometry(f, b.settings.wall_exterior, b.settings.wall_interior).openings);
  return !!earth && earth.wells.count > 0;
}

test("the editor offers the light well switch exactly where 3D draws a light well (#524)", () => {
  const cases: [string, Building, Partial<Opening>][] = [
    // the case of #524: no ground of its own (the lawn 0.2 m under the ground floor), a cellar window high in the wall
    ["cellar, default ground", house(), {}],
    ["cellar window low in the wall", house(), { sill: 0.4 }],
    ["semi-basement, sill above the ground", house({ level: -1.2 }), {}],
    ["semi-basement, sill below the ground", house({ level: -1.2 }), { sill: 0.5 }],
    ["earth switched off", house({ earth: false }), {}],
    ["window in an inner wall", house(), { edge: 1, offset: 4 }],
    ["a raised ground floor without cellar", house(undefined, 0), {}],
    ["a door is no window", house(), { type: "door", sill: 0 }],
  ];
  let some = false;
  for (const [name, b, extra] of cases) {
    b.floors[0].openings = [win(extra)];
    setTerrain(b);
    const want = drawn(b);
    some ||= want;
    assert.equal(windowGetsWell(b, b.floors[0], b.floors[0].openings[0]), want, name);
  }
  assert.ok(some, "at least one case draws a well");
  // switched off by hand: no well in 3D, but the switch stays offered so it can be turned on again
  const b = house();
  b.floors[0].openings = [win({ well: false })];
  setTerrain(b);
  assert.ok(!drawn(b) && windowGetsWell(b, b.floors[0], b.floors[0].openings[0]));
});
