import assert from "node:assert/strict";
import { test } from "node:test";
import { asymmetricBody, foilOutrigger, outriggerBodies, placeBody, steppedBody, strutBody } from "./forms.ts";
import { hydrostatics } from "./hydrostatics.ts";
import { parametricHull } from "./parametric.ts";
import { foilVolume, nacaArea } from "./parts.ts";
import { pontoonBody, revolutionBody } from "./revolution.ts";
import { bottomAt, halfAt, sheerAt } from "./sections.ts";
import { restingHeel } from "./stability.ts";
import type { HullBody } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);
const DEG = Math.PI / 180;
const demi = parametricHull({ hull: "monohull", length: 12, beam: 1.6, draft: 0.7, freeboard: 1.0 }).bodies[0];

test("forms: an asymmetric demihull, flat inboard, keeps its outboard side and moves its centre outboard", () => {
  const sym = hydrostatics({ bodies: [demi] });
  const asym = asymmetricBody(demi, -1, 0.4);
  const h = hydrostatics({ bodies: [asym] });
  // every half-breadth inboard is 0.4 of what it was: the volume is (1 + 0.4) / 2 of the symmetric one
  near(h.volume, 0.7 * sym.volume, 1e-6 * sym.volume, "volume");
  assert.ok(h.tcb > 0.05, "centre of buoyancy to starboard, outboard");
  near(halfAt(asym, 6, 0, 1)!, halfAt(demi, 6, 0)!, 1e-12, "outboard side unchanged");
  near(halfAt(asym, 6, 0, -1)!, 0.4 * halfAt(demi, 6, 0)!, 1e-12, "inboard side narrowed");
  // a mirrored pair (inboard sides facing) is symmetric overall
  const pair = [placeBody(asymmetricBody(demi, 1, 0.4), -2.5), placeBody(asym, 2.5)];
  const both = hydrostatics({ bodies: pair });
  near(both.tcb, 0, 1e-9, "the pair's centre on the centre line");
  near(both.tcf, 0, 1e-9, "the pair's waterplane centre on the centre line");
  near(both.volume, 2 * h.volume, 1e-9, "twice one");
});

test("forms: on its own an asymmetric hull lists until B is under G", () => {
  const asym = asymmetricBody(demi, -1, 0.4);
  const h = hydrostatics({ bodies: [asym] });
  // G at the height of B, so GM is BM and it is stable (a demihull alone, with G higher, would capsize)
  const rest = restingHeel({ bodies: [asym] }, { displacement: h.displacement, lcg: h.lcb, vcg: h.vcb })!;
  assert.ok(rest.attitude.heel < -0.5 * DEG, `it lists to port, its narrow side: ${rest.attitude.heel / DEG}°`);
  near(rest.gz, 0, 1e-6, "no righting lever at rest");
  // with G over the centre of buoyancy it floats upright
  const level = restingHeel({ bodies: [asym] }, { displacement: h.displacement, lcg: h.lcb, vcg: h.vcb, tcg: h.tcb })!;
  near(level.attitude.heel, 0, 0.05 * DEG, "upright");
});

test("forms: a stepped bottom rises aft of each step and leaves the deck where it was", () => {
  const hull = parametricHull({ hull: "monohull", length: 10, beam: 3, draft: 0.6, freeboard: 1.0 }).bodies[0];
  const stepped = steppedBody(hull, [{ x: 4, height: 0.04 }, { x: 6, height: 0.03 }]);
  near(bottomAt(stepped, 5)! - bottomAt(hull, 5)!, 0.03, 1e-9, "between the steps: the forward step's rise");
  near(bottomAt(stepped, 3)! - bottomAt(hull, 3)!, 0.07, 1e-9, "aft of both: their rises added");
  near(bottomAt(stepped, 7)!, bottomAt(hull, 7)!, 1e-12, "forward of both: unchanged");
  near(sheerAt(stepped, 3)!, sheerAt(hull, 3)!, 1e-12, "the deck unchanged");
  // sharp: across a millimetre either side of the step the bottom jumps by its height
  near(bottomAt(stepped, 5.999)! - bottomAt(stepped, 6.001)!, 0.03, 2e-3, "a sharp step");
  assert.ok(hydrostatics({ bodies: [stepped] }).volume < hydrostatics({ bodies: [hull] }).volume);
});

test("forms: a SWATH floats on its struts: two submerged hulls, the waterplane only the struts'", () => {
  const R = 1;
  const L = 16;
  const t = 0.6;
  const bodies: HullBody[] = [];
  for (const c of [-4, 4]) {
    bodies.push(revolutionBody(20, () => R, { axis: -2.5, center: c }));
    // the strut's foot on the hull's top
    bodies.push(strutBody({ length: L, thickness: t, bottom: -2.5 + R, top: 3, center: c, aft: 2 }));
  }
  const h = hydrostatics({ bodies });
  near(h.waterplane, 2 * nacaArea(t / L) * L * L, 0.005 * h.waterplane, "waterplane: the two struts' sections");
  // the volume: the two hulls (33-point polygons, a hair under π r²) and the struts from their feet to the water
  const hulls = 2 * hydrostatics({ bodies: [revolutionBody(20, () => R, { axis: -2.5 })] }).volume;
  near(h.volume, hulls + 2 * nacaArea(t / L) * L * L * 1.5, 0.002 * h.volume, "volume");
  // small waterplane, far apart: stiff across for its waterplane, but its BM is from the spacing
  assert.ok(h.bmT > 0 && h.waterplane < 0.2 * 2 * 20 * 2 * R);
});

test("forms: outriggers place floats beside the main hull, one or a pair", () => {
  const ama = pontoonBody({ length: 4, diameter: 0.25, axis: 0.05 });
  const single = outriggerBodies(ama, { spacing: 2, side: 1 });
  assert.equal(single.length, 1);
  assert.equal(single[0].center, 2);
  const pair = outriggerBodies(ama, { spacing: 2, side: 0, shift: 1 });
  assert.deepEqual(pair.map((b) => b.center), [-2, 2]);
  near(pair[0].sections[0].x, ama.sections[0].x + 1, 1e-12, "moved along");
});

test("forms: an outrigger canoe with G on its centre line heels away from its float until the float stops lifting it", () => {
  // a 6 m round-bottomed canoe and a 4 m float 2 m to starboard, its axis 5 cm above the water
  const canoe = revolutionBody(6, (x) => 0.35 * Math.sqrt(Math.max(0, 1 - ((2 * x) / 6 - 1) ** 2)) ** 0.5, { axis: 0.1 });
  const hull = { bodies: [canoe, ...outriggerBodies(pontoonBody({ length: 4, diameter: 0.25, axis: 0.05, nose: 0.4 }), { spacing: 2, side: 1, shift: 1 })] };
  const h = hydrostatics(hull);
  // G low on the canoe's centre line: the float to starboard carries buoyancy at rest, so the canoe heels to port
  // until it does not, lifting the float
  const rest = restingHeel(hull, { displacement: h.displacement, lcg: h.lcb, vcg: h.vcb })!;
  assert.ok(rest.attitude.heel < 0, `heels away from the float: ${rest.attitude.heel / DEG}°`);
  near(rest.gz, 0, 1e-5, "at rest");
});

test("forms: a hydrofoil outrigger is a strut and a T foil at its foot", () => {
  const foils = foilOutrigger({ at: [3, 0.5, 2.2], strut: 1.2, strutChord: 0.25, span: 1.0, chord: 0.3, incidence: 3 });
  assert.equal(foils.length, 3);
  const [strut, starboard, port] = foils;
  near(strut.root[1] - strut.span, -0.7, 1e-12, "strut down to its foot");
  near(starboard.root[1], -0.7, 1e-12, "foil at the foot");
  assert.equal(starboard.direction, 90);
  assert.equal(port.direction, -90);
  near(starboard.span + port.span, 1.0, 1e-12, "the whole span");
  const v = foils.map((f) => foilVolume(f).volume).reduce((a, b) => a + b, 0);
  near(v, nacaArea(0.12) * (0.25 * 0.25 * 1.2 + 0.3 * 0.3 * 1.0), 1e-6, "volume");
});
