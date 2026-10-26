import assert from "node:assert/strict";
import { test } from "node:test";
import { hydrostatics } from "./hydrostatics.ts";
import { parametricHull, type ParametricHullSpec } from "./parametric.ts";
import { bottomAt, halfAt, sheerAt } from "./sections.ts";

const cruiser: ParametricHullSpec = { hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 };
const cat: ParametricHullSpec = { hull: "catamaran", length: 12, beam: 6.4, draft: 0.8, freeboard: 1.2 };

test("parametric: every section runs bottom to sheer with y increasing and no negative breadth", () => {
  for (const spec of [cruiser, cat]) {
    for (const body of parametricHull(spec).bodies) {
      assert.equal(body.sections.length, 41);
      for (const s of body.sections) {
        assert.ok(s.points.length >= 2);
        for (let i = 1; i < s.points.length; i++) assert.ok(s.points[i][0] >= s.points[i - 1][0] - 1e-12, `y falls at x = ${s.x}`);
        for (const [, half] of s.points) assert.ok(half >= 0);
      }
    }
  }
});

test("parametric: the keel is at the draft amidships, the transom immersed, the stem a point at the sheer", () => {
  const body = parametricHull(cruiser).bodies[0];
  assert.ok(Math.abs(bottomAt(body, 6)! + cruiser.draft) < 1e-9);
  assert.ok(bottomAt(body, 0)! < 0);
  assert.ok(Math.abs(bottomAt(body, 12)! - sheerAt(body, 12)!) < 1e-9);
  assert.ok(halfAt(body, 12, sheerAt(body, 12)!)! < 1e-9);
  // the deck line is the beam at its widest
  const widest = Math.max(...body.sections.map((s) => s.points[s.points.length - 1][1]));
  assert.ok(Math.abs(2 * widest - cruiser.beam) < 0.01);
});

test("parametric: the monohull's displacement is a plausible block coefficient, its centre of buoyancy aft of amidships", () => {
  const h = hydrostatics(parametricHull(cruiser));
  const cb = h.volume / (h.lwl * h.bwl * cruiser.draft);
  assert.ok(cb > 0.35 && cb < 0.6, `block coefficient ${cb.toFixed(3)}`);
  assert.ok(h.lcb > 0.4 * cruiser.length && h.lcb < 0.55 * cruiser.length, `lcb ${h.lcb.toFixed(2)}`);
  assert.ok(h.vcb < 0 && h.vcb > -cruiser.draft);
  assert.ok(h.bmT > 0);
});

test("parametric: a catamaran is two equal hulls either side of the centre line, within the overall beam", () => {
  const hull = parametricHull(cat);
  assert.equal(hull.bodies.length, 2);
  const [port, starboard] = hull.bodies;
  assert.equal(port.center, -starboard.center);
  const h = hydrostatics(hull);
  assert.ok(h.bwl <= cat.beam + 1e-9);
  // the two hulls' spacing makes it far stiffer across than one of them alone
  const alone = hydrostatics({ bodies: [{ ...port, center: 0 }] });
  assert.ok(Math.abs(h.volume - 2 * alone.volume) < 1e-9 * h.volume);
  assert.ok(h.bmT > 5 * alone.bmT);
});
