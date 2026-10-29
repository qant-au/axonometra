import assert from "node:assert/strict";
import { test } from "node:test";
import { hydrostatics } from "./hydrostatics.ts";
import { plateHull, type PlateHullSpec } from "./plate.ts";

const FISHING: PlateHullSpec = { length: 6.5, beam: 2.45, transom: 2.3, chineBeam: 2.0, draft: 0.36, freeboard: 0.88, deadrise: 18 };
const body = plateHull(FISHING).bodies[0];
const at = (u: number) => body.sections[Math.round(u * (body.sections.length - 1))];

test("plate hull: sections run up from the keel to the sheer, transom to stem", () => {
  assert.equal(body.center, 0);
  assert.equal(body.sections[0].x, 0);
  assert.equal(body.sections.at(-1)!.x, 6.5);
  for (const s of body.sections) {
    for (let i = 1; i < s.points.length; i++) assert.ok(s.points[i][0] > s.points[i - 1][0], `x ${s.x}: heights rise`);
    assert.equal(s.points[0][1], 0, `x ${s.x}: the keel is on the centre line`);
  }
  // the stem head closes to nothing
  assert.ok(body.sections.at(-1)!.points.every((p) => p[1] === 0));
});

test("plate hull: the transom is the given width at the top, its bottom at the given deadrise to the chine", () => {
  const t = at(0).points;
  assert.ok(Math.abs(t.at(-1)![1] - 1.15) < 1e-9);
  // keel, two points along the bottom panel, the chine: in one straight line at 18°
  const [keel, , , chine] = t;
  assert.ok(Math.abs(keel[0] + 0.36) < 1e-9);
  assert.ok(Math.abs(chine[1] - 1.0) < 1e-9);
  assert.ok(Math.abs(Math.atan2(chine[0] - keel[0], chine[1]) / (Math.PI / 180) - 18) < 1e-9);
  for (const p of t.slice(1, 3)) assert.ok(Math.abs((p[0] - keel[0]) / p[1] - Math.tan((18 * Math.PI) / 180)) < 1e-9);
});

test("plate hull: the reverse chine steps out just above the chine, then the topside flares to the sheer", () => {
  const t = at(0).points;
  const [chine, lip, , sheer] = t.slice(3);
  assert.ok(lip[0] - chine[0] > 0 && lip[0] - chine[0] < 0.02, "the ledge is nearly level");
  assert.ok(Math.abs(lip[1] - chine[1] - 0.05) < 1e-9, "5 cm wide");
  assert.ok(sheer[1] > lip[1], "the topside flares out");
});

test("plate hull: the bottom steepens into a fine entry, and the keel sweeps up into the stem", () => {
  const deadrise = (u: number) => {
    const p = at(u).points;
    return Math.atan2(p[3][0] - p[0][0], p[3][1]) / (Math.PI / 180);
  };
  assert.ok(Math.abs(deadrise(0.3) - 18) < 1e-9, "held aft");
  assert.ok(deadrise(0.7) > 25 && deadrise(0.9) > deadrise(0.7), "steeper forward");
  assert.equal(at(0.5).points[0][0], -0.36, "the keel runs level past amidships");
  assert.ok(at(0.75).points[0][0] < 0 && at(0.9).points[0][0] > 0, "the forefoot comes out of the water forward of 80 %");
});

test("plate hull: a 6.5 m boat floats on her lines at about 1.7 t, her buoyancy aft of amidships", () => {
  const h = hydrostatics({ bodies: [body] }, 0);
  assert.ok(h.displacement > 1.5 && h.displacement < 1.9, `displacement ${h.displacement}`);
  assert.ok(h.lwl > 5.2, `waterline length ${h.lwl}`);
  assert.ok(h.lcb < 0.5 * 6.5, `LCB ${h.lcb}`);
  assert.ok(h.bwl > 1.8 && h.bwl < 2.3, `waterline beam ${h.bwl}`);
});
