import assert from "node:assert/strict";
import { test } from "node:test";
import { ALUMINIUM } from "./loads.ts";
import { meshArea } from "./mesh.ts";
import { aboveWater, asFitted, drains, openBodies, openHull, outboardMounts, shellWeights, SHAFT, type OpenHullSpec } from "./open.ts";
import { plateHull } from "./plate.ts";
import { halfAt } from "./sections.ts";
import { float } from "./stability.ts";

const body = plateHull({ length: 6.5, beam: 2.45, transom: 2.3, chineBeam: 2.0, draft: 0.36, freeboard: 0.88, deadrise: 18 }).bodies[0];
const spec = (transom: OpenHullSpec["transom"]): OpenHullSpec => ({ plating: 0.005, sole: 0.15, transom });
const well = openHull(body, spec({ height: SHAFT.xl, width: 1.4, well: 0.75 }));
const platform = openHull(body, spec({ height: SHAFT.xl, width: 1.4, setback: { length: 0.6, kind: "platform" } }));
const bracket = openHull(body, spec({ height: SHAFT.xl, width: 1.4, setback: { length: 0.75, kind: "bracket" } }));
const points = (m: { positions: number[] }) => Array.from({ length: m.positions.length / 3 }, (_, i) => m.positions.slice(i * 3, i * 3 + 3));
const piece = (o: typeof well, name: string) => o.pieces.find((p) => p.name === name)!.mesh;

test("open hull: the outboards mount at the shaft's height above the bottom of the boat", () => {
  assert.equal(well.keel, -0.36);
  assert.ok(Math.abs(well.mount - (-0.36 + 0.635)) < 1e-12);
  assert.equal(well.mountX, 0);
  assert.equal(bracket.mountX, -0.75);
  assert.throws(() => openHull(body, spec({ height: 2, width: 1.4 })), /above the transom/);
});

test("open hull: the transom is cut down to the mounting height between the motors, whole outside them", () => {
  const sheer = body.sections[0].points.at(-1)![0];
  const ps = points(piece(well, "transom"));
  assert.ok(ps.every((p) => p[0] === 0), "a plate at the transom");
  for (const p of ps) if (Math.abs(p[2]) < 0.69) assert.ok(p[1] <= well.mount + 1e-9, `above the cut at ${p}`);
  assert.ok(ps.some((p) => Math.abs(p[2]) > 0.71 && Math.abs(p[1] - sheer) < 1e-9), "full height outside the cut");
  // left whole with a setback
  assert.ok(points(piece(bracket, "transom")).some((p) => Math.abs(p[2]) < 0.1 && Math.abs(p[1] - sheer) < 1e-9));
});

test("open hull: the sole lies level above the waterline, inside the plating, from the well forward", () => {
  const ps = points(piece(well, "sole"));
  assert.ok(ps.every((p) => p[1] === 0.15));
  for (const [x, , z] of ps) assert.ok(Math.abs(z) <= (halfAt(well.inner, x, 0.15) ?? 0) + 1e-9);
  assert.equal(well.sole.from, 0.75);
  assert.ok(well.sole.to > 4 && well.sole.to < 6.5);
  assert.equal(platform.sole.from, 0.005, "no well: from the transom");
});

test("open hull: the self-draining well's floor sits between the sole and the cut, behind a bulkhead", () => {
  assert.ok(well.wellFloor! > well.sole.y && well.wellFloor! < well.mount);
  assert.ok(points(piece(well, "well bulkhead")).every((p) => p[0] === 0.75));
  assert.equal(platform.wellFloor, null);
});

test("open hull: a platform is a pod that floats with the hull; a bracket adds no buoyancy", () => {
  assert.equal(openBodies(platform).bodies.length, 2);
  assert.equal(openBodies(bracket).bodies.length, 1);
  assert.deepEqual(platform.pod!.sections.map((s) => s.x), [-0.6, 0]);
});

test("open hull: twin outboards on 26 inch centres, and only as many as the width takes", () => {
  const m = outboardMounts(well, 2);
  assert.deepEqual(m.map((x) => x.at[2]), [-0.33, 0.33]);
  assert.ok(m.every((x) => x.at[1] === well.mount && x.at[0] === 0));
  assert.deepEqual(outboardMounts(bracket, 1)[0].at, [-0.75, bracket.mount, 0]);
  assert.throws(() => outboardMounts(well, 4), /do not fit/);
  assert.deepEqual(outboardMounts(well, 0), []);
});

test("open hull: the plating weighs its area by its thickness and the alloy's density", () => {
  const w = shellWeights(well);
  assert.deepEqual(w.map((x) => x.name), well.pieces.map((p) => p.name));
  const skin = w.find((x) => x.name === "skin")!;
  assert.ok(Math.abs(skin.mass - meshArea(piece(well, "skin")).area * 0.005 * ALUMINIUM * 1000) < 1e-9);
  const total = w.reduce((s, x) => s + x.mass, 0);
  assert.ok(total > 350 && total < 650, `plating ${total} kg`);
});

test("open hull: as fitted with twin outboards she sits by the stern and still drains herself", () => {
  const motors = outboardMounts(well, 2).map((m) => ({ name: m.name, mass: 230, at: [m.at[0] - 0.25, m.at[1] + 0.25, m.at[2]] as [number, number, number] }));
  const load = asFitted(well, [...motors, { name: "crew", mass: 170, at: [2.5, 1, 0] }]);
  const f = float(openBodies(well), load, 0);
  assert.ok(f.attitude.trim < 0, "by the stern");
  const d = drains(well, f.attitude);
  assert.ok(d.ok && d.sole > 0.03 && d.well! > 0 && d.transom > 0.1, JSON.stringify(d));
  // overload her and the sole goes under: she no longer drains
  const heavy = asFitted(well, [...motors, { name: "cargo", mass: 900, at: [1, 0.4, 0] }]);
  assert.equal(drains(well, float(openBodies(well), heavy, 0).attitude).ok, false);
});

test("open hull: height above the water follows the floating attitude", () => {
  const hull = openBodies(well);
  assert.ok(Math.abs(aboveWater(hull, { heel: 0, trim: 0, level: 0 }, [2, 0.3, 0]) - 0.3) < 1e-12);
  assert.ok(Math.abs(aboveWater(hull, { heel: 0, trim: 0, level: 0.1 }, [2, 0.3, 0]) - 0.2) < 1e-12);
  // heeled to starboard, the starboard side is lower
  const h = { heel: 0.1, trim: 0, level: 0 };
  assert.ok(aboveWater(hull, h, [2, 0.3, 1]) < aboveWater(hull, h, [2, 0.3, -1]));
});
