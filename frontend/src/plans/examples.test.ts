// Axonometra: the example plans build cleanly and make sense as buildings: every door and window lands where the
// example puts it, no two rooms overlap, and every room can be walked to from outside.

import assert from "node:assert/strict";
import { test } from "node:test";
import { FLOOR_MATERIALS, pointInPolygon, polygonArea, type Floor, type Room, type Vec2 } from "../model.ts";
import { pointOnRoomEdge } from "../geometry/walls.ts";
import { EXAMPLE_PLANS, examplePlan } from "./examples.ts";

const names = Object.keys(EXAMPLE_PLANS);

/** Distance from a point to a room's outline. */
function toOutline(p: Vec2, room: Room): number {
  let d = Infinity;
  room.points.forEach((a, i) => {
    const b = room.points[(i + 1) % room.points.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (len * len)));
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * (b[0] - a[0]), p[1] - a[1] - t * (b[1] - a[1])));
  });
  return d;
}

const bounds = (pts: Vec2[]) => ({ x0: Math.min(...pts.map((p) => p[0])), z0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), z1: Math.max(...pts.map((p) => p[1])) });

test("there are example plans: homes, rooms inside a building, a shed", () => {
  assert.ok(names.length >= 6);
  assert.ok(names.some((n) => EXAMPLE_PLANS[n].kind === "rooms"));
  assert.throws(() => examplePlan("no-such-plan"), /no example plan/);
});

for (const name of names) {
  const spec = EXAMPLE_PLANS[name];
  const { building, warnings } = examplePlan(name);

  test(`${name}: builds with no warnings, its floors in order`, () => {
    assert.deepEqual(warnings, []);
    assert.deepEqual(
      building.floors.map((f) => [f.name, f.elevation, f.height]),
      spec.floors.map((f) => [f.name, spec.floors.length === 1 ? 0 : f.elevation, f.height]),
    );
    for (const [i, f] of building.floors.entries()) assert.deepEqual(f.rooms.map((r) => r.name), spec.floors[i].rooms.map((r) => r.name));
  });

  test(`${name}: every door and window is where the example puts it, of its kind and look`, () => {
    for (const [i, floor] of building.floors.entries()) {
      const own = spec.floors[i].openings;
      assert.equal(floor.openings.length, own.length, `${floor.name}: openings`);
      for (const o of floor.openings) {
        const at = pointOnRoomEdge(floor.rooms.find((r) => r.id === o.room_id)!, o.edge, o.offset);
        const match = own.find((s) => Math.hypot(s.at[0] - at[0], s.at[1] - at[1]) < 0.02);
        assert.ok(match, `${floor.name}: an opening at ${at} that the example does not list`);
        assert.equal(o.type, match.kind, `${floor.name}: the opening at ${match.at}`);
        assert.equal(o.width, match.width, `${floor.name}: the opening at ${match.at} kept its width`);
        assert.equal(o.style ?? undefined, match.style, `${floor.name}: the opening at ${match.at}`);
      }
    }
  });

  test(`${name}: no two rooms on a floor overlap, and each has a floor finish`, () => {
    for (const floor of building.floors) {
      for (const r of floor.rooms) {
        assert.ok((FLOOR_MATERIALS as readonly string[]).includes(r.floor_material), `${r.name}: ${r.floor_material}`);
        assert.ok(polygonArea(r.points) > 1.2, `${r.name} is a room`);
      }
      // sample each room's inside on a 10 cm grid (off the edges): no sample lies inside another room
      for (const a of floor.rooms) {
        const box = bounds(a.points);
        for (let x = box.x0 + 0.05; x < box.x1; x += 0.1)
          for (let z = box.z0 + 0.05; z < box.z1; z += 0.1) {
            if (!pointInPolygon([x, z], a.points) || toOutline([x, z], a) < 0.02) continue;
            const b = floor.rooms.find((r) => r !== a && pointInPolygon([x, z], r.points) && toOutline([x, z], r) > 0.02);
            assert.ok(!b, `${floor.name}: ${a.name} and ${b?.name} overlap at ${x.toFixed(2)}, ${z.toFixed(2)}`);
          }
      }
    }
  });

  test(`${name}: every room can be reached from outside, through doors and up or down the stairs`, () => {
    const key = (f: Floor, r: Room) => `${f.id}/${r.id}`;
    const links = new Map<string, Set<string>>();
    const link = (a: string, b: string) => {
      (links.get(a) ?? links.set(a, new Set()).get(a)!).add(b);
      (links.get(b) ?? links.set(b, new Set()).get(b)!).add(a);
    };
    for (const floor of building.floors) {
      for (const o of floor.openings) {
        if (o.type === "window") continue;
        const host = floor.rooms.find((r) => r.id === o.room_id)!;
        const at = pointOnRoomEdge(host, o.edge, o.offset);
        const other = floor.rooms.filter((r) => r !== host && toOutline(at, r) < 0.02);
        if (!other.length) link(key(floor, host), "outside");
        for (const r of other) link(key(floor, host), key(floor, r));
      }
      // a stair joins the room it stands in to the room above it, at its top end
      for (const s of floor.furniture.filter((f) => f.type === "stairs")) {
        const above = building.floors.find((f) => f.elevation > floor.elevation && Math.abs(f.elevation - floor.elevation - s.h) < 0.05);
        assert.ok(above, `${floor.name}: the stair reaches a floor`);
        const top: Vec2 = [s.x + Math.sin((s.rotation * Math.PI) / 180) * (s.d / 2 - 0.3), s.z - Math.cos((s.rotation * Math.PI) / 180) * (s.d / 2 - 0.3)];
        const here = floor.rooms.find((r) => pointInPolygon([s.x, s.z], r.points))!;
        const there = above.rooms.find((r) => pointInPolygon(top, r.points));
        assert.ok(here && there, `${floor.name}: the stair stands in a room and arrives in one`);
        link(key(floor, here), key(above, there));
      }
    }
    const seen = new Set(["outside"]);
    const todo = ["outside"];
    while (todo.length) for (const n of links.get(todo.pop()!) ?? []) if (!seen.has(n)) seen.add(n), todo.push(n);
    for (const floor of building.floors) for (const r of floor.rooms) assert.ok(seen.has(key(floor, r)), `${floor.name}: ${r.name} cannot be reached`);
  });
}

test("a building has a roof, a fit-out of rooms has none", () => {
  for (const name of names) {
    const { building } = examplePlan(name);
    assert.equal(building.settings.roof.type === "none", EXAMPLE_PLANS[name].kind === "rooms", name);
  }
});

test("the ranch home shows feet and inches; its basement lies below the ground", () => {
  const { building } = examplePlan("ranch-home-basement");
  assert.equal(building.settings.units, "imperial");
  assert.ok(building.floors[0].elevation < 0);
});
