import assert from "node:assert/strict";
import { test } from "node:test";
import { hydrostatics } from "./hydrostatics.ts";
import { pontoonBody, revolutionBody } from "./revolution.ts";
import { bodyRange, halfAt } from "./sections.ts";

const rel = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${what}: ${a} not within ${tol * 100} % of ${b}`);

test("revolution: a submerged cylinder has its exact volume, on its axis", () => {
  const h = hydrostatics({ bodies: [revolutionBody(10, () => 1, { axis: -5 })] });
  // 33 points round a half circle: the inscribed polygon's area is slightly under π r²
  rel(h.volume, Math.PI * 10, 0.005, "volume");
  rel(h.vcb, -5, 1e-9, "VCB");
  rel(h.lcb, 5, 1e-9, "LCB");
});

test("pontoon: a round tube the given length and diameter, the rounded cone's tip at the bow", () => {
  const p = pontoonBody({ length: 12, diameter: 0.64, axis: 0.02 });
  const [x0, x1] = bodyRange(p);
  assert.equal(x0, 0);
  assert.equal(x1, 12);
  // amidships, at the axis, the full radius; at the very bow nothing
  rel(halfAt(p, 6, 0.02)!, 0.32, 0.001, "radius amidships");
  assert.ok(halfAt(p, 12, 0.02)! < 1e-6);
  // the cone: narrowing steadily over its 0.96 m, then the rounded tip
  const r = (x: number) => halfAt(p, x, 0.02)!;
  assert.ok(r(11.04) > 0.315 && r(11.5) < r(11.2) && r(11.9) < r(11.5));
  // a flat end cap aft: the full radius right at the stern
  rel(r(0), 0.32, 0.001, "radius at the stern");
});

test("pontoon: its volume lies between the parallel tube alone and a cylinder its full length", () => {
  const p = pontoonBody({ length: 8, diameter: 0.6, axis: -2, nose: 1.2, tail: 0.3 });
  const v = hydrostatics({ bodies: [p] }).volume;
  const area = Math.PI * 0.09;
  assert.ok(v > area * (8 - 1.2 - 0.3) && v < area * 8, `${v}`);
});

test("pontoon: a houseboat on two tubes floats each one to a circular segment, and is stiff across", () => {
  // two 0.64 m tubes 2.4 m apart, axes 2 cm above the water: each immersed section is a segment of the circle
  const tubes = [-1.2, 1.2].map((c) => pontoonBody({ length: 12, diameter: 0.64, axis: 0.02, center: c }));
  const h = hydrostatics({ bodies: tubes });
  const R = 0.32;
  const d = 0.02;
  const segment = R * R * Math.acos(d / R) - d * Math.sqrt(R * R - d * d);
  // the parallel part of the tubes alone, and the most the cone could add
  assert.ok(h.volume > 2 * segment * (12 - 0.96) && h.volume < 2 * segment * 12, `${h.volume}`);
  rel(h.bwl, 2.4 + 2 * Math.sqrt(R * R - d * d), 0.001, "breadth at the waterline");
  // stiffness across comes from the spacing: about each tube's waterplane times 1.2² over the volume
  assert.ok(h.bmT > 4, `BMt ${h.bmT}`);
});
