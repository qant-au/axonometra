import assert from "node:assert/strict";
import { test } from "node:test";
import { readSimple, repairPlan, isSimple } from "./simple.ts";
import { buildPlan } from "./builder.ts";
import { readFile } from "./detect.ts";
import { emptyBuilding, newFloor, type Building } from "../model.ts";
import { parseExport } from "../transfer.ts";

const simple = {
  format: "neonplan-import",
  units: "cm",
  floors: [
    {
      name: "Erdgeschoss",
      rooms: [
        { name: "Wohnen", points: [[0, 0], [600, 0], [600, 450], [0, 450]] },
        { name: "Küche", points: [[600, 0], [1000, 0], [1000, 450], [600, 450]] },
        { name: "kaputt", points: [[0, 0], [1, 1]] },
      ],
      doors: [{ at: [600, 225], width: 90 }],
      windows: [
        { at: [300, 0], width: 150, sill: 90 },
        // a transom light directly above the kitchen window: not a duplicate, and its sill setting is kept (#655)
        { at: [800, 0], width: 120, sill: 90, height: 100 },
        { at: [800, 0], width: 120, sill: 190, height: 50, sill_board: "none" },
      ],
      furniture: [
        { type: "sofa", at: [300, 300], rotation: 180 },
        { name: "Esstisch", at: [800, 200], width: 160, depth: 90, height: 75 },
      ],
    },
    { name: "Obergeschoss", elevation: 280, rooms: [{ name: "Schlafen", points: [[0, 0], [1000, 0], [1000, 450], [0, 450]] }] },
  ],
};

test("the simple format: units, doors and windows on their edges, furniture by kind or name", () => {
  assert.ok(isSimple(simple));
  const { building: b, warnings, stats } = buildPlan(readSimple(simple));
  assert.equal(b.floors.length, 2);
  assert.equal(b.floors[1].elevation, 2.8);
  assert.equal(b.floors[0].rooms.length, 2);
  assert.equal(stats.doors, 1);
  assert.equal(stats.windows, 3);
  assert.equal(b.floors[0].openings.find((o) => o.type === "window")!.width, 1.5);
  const stacked = b.floors[0].openings.filter((o) => o.type === "window" && o.width === 1.2);
  assert.deepEqual(stacked.map((o) => [o.sill, o.height, o.sill_board]), [[0.9, 1, undefined], [1.9, 0.5, "none"]]);
  assert.deepEqual(b.floors[0].furniture.map((f) => f.type), ["sofa", "table"]);
  assert.ok(warnings.some((w) => w.code === "rooms_skipped"));
});

test("a Accurona plan written by an AI with mistakes is repaired", () => {
  const b = emptyBuilding();
  const f = newFloor("eg", "EG", 0);
  f.rooms = [
    { id: "r1", name: "A", area_id: null, floor_material: "wood", points: [[0, 0], [4, 0], [4, 0], [4, 3], [0, 3]] },
    { id: "r1", name: "B", area_id: null, floor_material: "wood", points: [[4, 0], [8, 0], [8, 3], [4, 3]] },
    { id: "r3", name: "C", area_id: null, floor_material: "wood", points: [[0, 0]] },
  ];
  f.openings = [
    { id: "o1", room_id: "r1", edge: 1, offset: 9, width: 0.9, type: "door", sill: 0, height: 2.01, hinge: "left", leaves: 1, swing: "in", cover: null, contact: null, contact2: null, tilt: null },
    { id: "o2", room_id: "r9", edge: 0, offset: 1, width: 0.9, type: "door", sill: 0, height: 2.01, hinge: "left", leaves: 1, swing: "in", cover: null, contact: null, contact2: null, tilt: null },
  ];
  f.furniture = [{ id: "m1", type: "couch" as never, x: 2, z: 1.5, rotation: 450, w: 2, d: 0.9, h: 0.8, variant: null }];
  b.floors = [f];
  const { building: out, warnings } = repairPlan(b as Building);
  const fl = out.floors[0];
  assert.equal(fl.rooms.length, 2);
  assert.notEqual(fl.rooms[0].id, fl.rooms[1].id);
  // the doubled corner is gone: 4 points
  assert.equal(fl.rooms[0].points.length, 4);
  assert.equal(fl.openings.length, 1);
  // its offset kept on its edge (3 m long)
  assert.ok(fl.openings[0].offset <= 3 - 0.45 + 1e-9);
  assert.equal(fl.furniture[0].type, "sofa");
  assert.equal(fl.furniture[0].rotation, 90);
  assert.ok(warnings.some((w) => w.code === "openings_dropped"));
  // what comes out is a plan the editor reads
  assert.ok(parseExport(JSON.stringify({ format: "neonplan3d", version: 1, building: out })));
});

test("files are told apart by name and content", async () => {
  const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o));
  assert.equal((await readFile("plan.json", enc(simple))).kind, "simple");
  assert.equal((await readFile("x.json", enc({ format: "neonplan3d", version: 1, building: { ...emptyBuilding(), floors: [newFloor("a", "A", 0)] } }))).kind, "accurona");
  await assert.rejects(readFile("x.json", enc({ hello: 1 })), /unknown_format/);
  await assert.rejects(readFile("x.json", new TextEncoder().encode("{ broken")), /not_json/);
});

test("a plan lying at an angle is squared to the axes, furniture turned with it", () => {
  const a = (20 * Math.PI) / 180;
  const rot = ([x, z]: number[]) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
  const plan = readSimple({ format: "neonplan-import", floors: [{ name: "EG", rooms: [{ name: "A", points: [[0, 0], [5, 0], [5, 3], [0, 3]].map(rot) }], furniture: [{ type: "bed", at: rot([2, 1.5]), rotation: 20 }] }] });
  const { building: b } = buildPlan(plan, { align: true });
  const pts = b.floors[0].rooms[0].points;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    assert.ok(Math.abs(p[0] - q[0]) < 0.01 || Math.abs(p[1] - q[1]) < 0.01, JSON.stringify(pts));
  }
  // the bed was turned 20° with the room: square again
  const r = b.floors[0].furniture[0].rotation % 90;
  assert.ok(r < 0.5 || r > 89.5, String(b.floors[0].furniture[0].rotation));
});
