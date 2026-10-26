import assert from "node:assert/strict";
import { test } from "node:test";
import { SHIPD_EXAMPLES } from "./examples.ts";
import { hydrostatics, SEA_WATER } from "./hydrostatics.ts";
import { parametricHull } from "./parametric.ts";
import { revolutionBody } from "./revolution.ts";
import { shipdBody } from "./shipd.ts";
import { axes, float, gzCurve, immersion, restingHeel } from "./stability.ts";
import type { Hull } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);
const DEG = Math.PI / 180;

// a box barge 20 m by 6 m, 3 m deep: wall-sided, so its righting lever has a closed form
const L = 20;
const B = 6;
// (stations every half metre: under trim the moment along the length is quadratic between them)
const box: Hull = { bodies: [{ center: 0, sections: Array.from({ length: 41 }, (_, i) => ({ x: i * 0.5, points: [[-1.5, B / 2], [1.5, B / 2]] as [number, number][] })) }] };

test("stability: upright and level, the immersion is the hydrostatics'", () => {
  const hull = parametricHull({ hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 });
  const h = hydrostatics(hull);
  const im = immersion(hull, { heel: 0, trim: 0, level: 0 }, 8);
  near(im.volume, h.volume, 1e-6 * h.volume, "volume");
  near(im.centroid[0], h.lcb, 1e-6, "LCB");
  near(im.centroid[1], h.vcb, 1e-6, "VCB");
  near(im.centroid[2], 0, 1e-9, "TCB");
});

test("stability: the world's axes at an attitude are square and the right way round", () => {
  const { up, along, across } = axes(10 * DEG, 3 * DEG);
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  near(dot(up, along), 0, 1e-12, "up·along");
  near(dot(up, across), 0, 1e-12, "up·across");
  near(dot(along, across), 0, 1e-12, "along·across");
  // heeled to starboard, the hull's starboard side (+z) points down
  assert.ok(up[2] < 0);
  // trimmed by the bow, the hull's bow (+x) points down
  assert.ok(up[0] < 0);
});

test("stability: a wall-sided box's righting lever is sin φ (GM + ½ BM tan² φ)", () => {
  // floating 1.5 m deep (half the depth), G 0.5 m above the waterline
  const T = 1.5;
  const load = { displacement: L * B * T * SEA_WATER, lcg: L / 2, vcg: 0.5 };
  const BM = (B * B) / (12 * T);
  const GM = -T / 2 + BM - 0.5;
  // wall-sided holds while neither the deck edge goes under nor the bilge comes out: tan φ < 1.5 / 3
  for (const deg of [2, 5, 10, 15, 20]) {
    const phi = deg * DEG;
    const f = float(box, load, phi);
    near(f.gz, Math.sin(phi) * (GM + 0.5 * BM * Math.tan(phi) ** 2), 2e-4, `GZ at ${deg}°`);
    near(f.volume, L * B * T, 1e-4, "it keeps its displacement");
    near(f.attitude.trim, 0, 1e-6, "no trim with G amidships");
  }
});

test("stability: a stable boat rests upright; one with G over its metacentre lolls; one far over capsizes", () => {
  const T = 1.5;
  const BM = (B * B) / (12 * T);
  const disp = L * B * T * SEA_WATER;
  const upright = restingHeel(box, { displacement: disp, lcg: L / 2, vcg: 0.5 })!;
  near(upright.attitude.heel, 0, 1e-12, "stable: upright");
  // GM = −0.2: wall-sided, the lever is 0 again where tan² φ = −2 GM / BM, about 24°
  const vcg = -T / 2 + BM + 0.2;
  const loll = restingHeel(box, { displacement: disp, lcg: L / 2, vcg })!;
  near(Math.tan(loll.attitude.heel), Math.sqrt(0.4 / BM), 2e-3, "the angle of loll");
  near(loll.gz, 0, 1e-6, "at rest there");
  // G 5 m up: no angle within 60° brings the lever back
  assert.equal(restingHeel(box, { displacement: disp, lcg: L / 2, vcg: 5 }), null);
});

test("stability: the righting lever is odd in the heel, and beyond the deck edge falls away from the formula", () => {
  const load = { displacement: L * B * 1.5 * SEA_WATER, lcg: L / 2, vcg: 0.5 };
  const [a, b] = [float(box, load, 12 * DEG), float(box, load, -12 * DEG)];
  near(a.gz, -b.gz, 1e-6, "GZ(−φ) = −GZ(φ)");
  // at 45° the deck edge is under: the lever is well short of the wall-sided figure
  const BM = (B * B) / (12 * 1.5);
  const wall = Math.sin(45 * DEG) * (-0.75 + BM - 0.5 + 0.5 * BM);
  assert.ok(float(box, load, 45 * DEG).gz < 0.9 * wall);
});

test("stability: a round hull's lever is the height of its axis over G times sin φ", () => {
  // a long cylinder floating with its axis 0.2 m above the water: B always lies under the axis
  const tube: Hull = { bodies: [revolutionBody(20, () => 1, { axis: 0.2, stations: 9 })] };
  const im = immersion(tube, { heel: 0, trim: 0, level: 0 }, 2);
  const load = { displacement: im.volume * SEA_WATER, lcg: im.centroid[0], vcg: -0.3 };
  for (const deg of [10, 30, 60]) near(float(tube, load, deg * DEG).gz, 0.5 * Math.sin(deg * DEG), 2e-3, `GZ at ${deg}°`);
});

test("stability: G aft of amidships trims a box by the stern, by the moment over its longitudinal stiffness", () => {
  const T = 1.5;
  const load = { displacement: L * B * T * SEA_WATER, lcg: L / 2 - 0.5, vcg: 0.5 };
  const f = float(box, load, 0);
  // small trim: tan τ = (LCG − LCB) / GML, GML = BML + VCB − VCG
  const GML = (L * L) / (12 * T) - T / 2 - 0.5;
  near(Math.tan(f.attitude.trim), -0.5 / GML, 0.03 * (0.5 / GML), "trim");
  assert.ok(f.attitude.trim < 0, "by the stern");
  // B ends up on the vertical through G
  const { along } = axes(0, f.attitude.trim);
  const d = [f.centroid[0] - load.lcg, f.centroid[1] - load.vcg, f.centroid[2]];
  near(d[0] * along[0] + d[1] * along[1] + d[2] * along[2], 0, 1e-5, "balance");
});

test("stability: a monohull's curve starts at the slope of its metacentric height", () => {
  const hull = parametricHull({ hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 });
  const h = hydrostatics(hull, 0);
  const vcg = 0.3;
  const load = { displacement: h.displacement, lcg: h.lcb, vcg };
  const GM = h.vcb + h.bmT - vcg;
  const curve = gzCurve(hull, load, [-30, -3, 0, 3, 30].map((d) => d * DEG));
  near(curve[2].gz, 0, 1e-6, "upright");
  near(curve[3].gz / Math.sin(3 * DEG), GM, 0.04 * GM, "slope at the origin");
  near(curve[0].gz, -curve[4].gz, 1e-4, "symmetric");
  assert.ok(curve[4].gz > 0);
});

test("stability: a catamaran's lever peaks where the windward hull lifts out, then falls away", () => {
  const cat = SHIPD_EXAMPLES.find((v) => v.name === "catamaran-12m")!;
  const hull: Hull = { bodies: cat.bodies.map((b) => shipdBody(b.vector, { center: b.center })) };
  const h = hydrostatics(hull);
  // G 1.2 m above the water; the hulls 5.2 m apart, 0.7 m deep: the windward one lifts out near atan(0.7 / 2.6) ≈ 15°
  const curve = gzCurve(hull, { displacement: h.displacement, lcg: h.lcb, vcg: 1.2 }, [5, 10, 15, 20, 30, 45].map((d) => d * DEG));
  const peak = curve.reduce((a, b) => (b.gz > a.gz ? b : a));
  assert.ok(peak.heel >= 10 * DEG && peak.heel <= 20 * DEG, `peak at ${peak.heel / DEG}°`);
  assert.ok(curve[5].gz < 0.7 * peak.gz && curve[5].gz > 0);
  // far stiffer than a monohull of its length: the lever at 5° is over a metre
  assert.ok(curve[0].gz > 1);
});
