import assert from "node:assert/strict";
import { test } from "node:test";
import { parametricHull } from "./parametric.ts";
import {
  bottomPoint,
  bulbGeometry,
  bulbVolume,
  combine,
  foilGeometry,
  foilVolume,
  gyroFit,
  nacaArea,
  nacaCentroid,
  nacaHalf,
  retractableTip,
  sidePoint,
  sprayRails,
  throughHull,
  throughHullGeometry,
} from "./parts.ts";
import { halfAt } from "./sections.ts";
import type { HullBody } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);
const hull = parametricHull({ hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 }).bodies[0];
// a box section 10 m long, 4 m wide, from 1 m below the water to 1 m above
const box: HullBody = { center: 0, sections: [0, 10].map((x) => ({ x, points: [[-1, 2], [1, 2]] })) };

test("parts: the NACA 0012 section, its thickness, area and centre", () => {
  near(2 * Math.max(...Array.from({ length: 101 }, (_, i) => nacaHalf(0.12, i / 100))), 0.12, 2e-4, "greatest thickness");
  near(nacaHalf(0.12, 0), 0, 1e-12, "leading edge");
  // the published figure is 0.0822 c² (0.685 t c²); the open trailing edge of the usual coefficients gives a hair less
  near(nacaArea(0.12), 0.0822, 0.0008, "area");
  near(nacaCentroid(0.12), 0.42, 0.005, "centre of area");
});

test("parts: a fin keel hangs from its root, tapered and swept, its volume the sections' areas along its span", () => {
  const keel = { root: [6, -0.9, 0] as [number, number, number], rootChord: 1.2, tipChord: 0.8, span: 1.5, sweep: 10 };
  const g = foilGeometry(keel);
  // the tip ring is 1.5 m down, its leading edge swept 1.5 tan 10° aft
  const tip = g.rings[g.rings.length - 1];
  near(Math.max(...tip.map((p) => p[0])), 6 - 1.5 * Math.tan((10 * Math.PI) / 180), 1e-9, "tip leading edge");
  near(tip[0][1], -2.4, 1e-9, "tip height");
  // ∫ c² ds for a linear taper: span (c0² + c0 c1 + c1²) / 3
  const v = foilVolume(keel);
  near(v.volume, nacaArea(0.12) * 1.5 * (1.44 + 0.96 + 0.64) / 3, 1e-4, "volume");
  assert.ok(v.centroid[1] < -0.9 - 0.5 && v.centroid[1] > -2.4, "centre down the span, nearer the wider root");
  near(v.centroid[2], 0, 1e-12, "on the centre line");
});

test("parts: a foil's direction turns its span round the length; incidence turns its section", () => {
  const out = foilGeometry({ root: [5, -0.5, 1], rootChord: 0.4, tipChord: 0.4, span: 1, direction: 90 });
  const tip = out.rings[out.rings.length - 1];
  near(tip[0][2], 2, 1e-9, "reaching out to starboard");
  near(tip[0][1], -0.5, 1e-9, "level");
  const plain = foilGeometry({ root: [5, -0.5, 0], rootChord: 0.4, tipChord: 0.4, span: 1 });
  const turned = foilGeometry({ root: [5, -0.5, 0], rootChord: 0.4, tipChord: 0.4, span: 1, incidence: 10 });
  // the trailing edge (the first point) swings across; the quarter chord stays put
  assert.ok(Math.abs(turned.rings[0][0][2] - plain.rings[0][0][2]) > 0.04);
  near(foilVolume({ root: [5, -0.5, 0], rootChord: 0.4, tipChord: 0.4, span: 1, incidence: 10 }).volume, foilVolume({ root: [5, -0.5, 0], rootChord: 0.4, tipChord: 0.4, span: 1 }).volume, 1e-12, "same volume");
});

test("parts: a bulb's volume lies between its middle cylinder and a cylinder its whole length", () => {
  const b = { nose: [6.5, -2.4, 0] as [number, number, number], length: 2, diameter: 0.4 };
  const v = bulbVolume(b);
  const a = Math.PI * 0.04;
  assert.ok(v.volume > a * 2 * 0.25 && v.volume < a * 2, `${v.volume}`);
  near(v.centroid[1], -2.4, 1e-12, "on its axis");
  assert.ok(v.centroid[0] > 4.5 && v.centroid[0] < 6.5);
  const g = bulbGeometry(b);
  near(Math.max(...g.rings.flat().map((p) => p[0])), 6.5, 1e-9, "the nose");
  near(Math.min(...g.rings.flat().map((p) => p[0])), 4.5, 1e-9, "the tail");
});

test("parts: points on the hull's skin, with outward normals", () => {
  const flat = bottomPoint(box, 5, 1)!;
  assert.deepEqual(flat.point, [5, -1, 1]);
  assert.deepEqual(flat.normal, [0, -1, 0]);
  const side = sidePoint(box, 5, 0, -1)!;
  assert.deepEqual(side.point, [5, 0, -2]);
  near(side.normal[2], -1, 1e-9, "port side faces port");
  assert.equal(bottomPoint(box, 5, 2.5), null, "nowhere that wide");
  // on a V the bottom point lies on the skin and the normal faces out and down
  const v = bottomPoint(hull, 6, 0.5)!;
  near(halfAt(hull, 6, v.point[1])!, 0.5, 1e-6, "on the skin");
  assert.ok(v.normal[1] < 0 && v.normal[2] > 0);
});

test("parts: spray rails run along the skin at their height, both sides", () => {
  const { port, starboard } = sprayRails(hull, { y: -0.2, from: 4, to: 10, width: 0.05 });
  assert.ok(port.rings.length > 10 && port.rings.length === starboard.rings.length);
  for (const r of starboard.rings) near(r[0][2], halfAt(hull, r[0][0], -0.2)!, 1e-9, "on the skin");
  for (let i = 0; i < port.rings.length; i++) near(port.rings[i][1][2], -starboard.rings[i][1][2], 1e-9, "mirrored");
});

test("parts: through-hull fittings sit in the skin and stand proud of it along the normal", () => {
  const intake = throughHull(box, "intake", { x: 3, off: -0.5 }, 0.05)!;
  assert.deepEqual(intake.at.point, [3, -1, -0.5]);
  const g = throughHullGeometry(intake);
  near(g.rings[1][0][1], -1.01, 1e-9, "proud of the bottom");
  const discharge = throughHull(box, "discharge", { x: 3, y: 0.3, side: 1 }, 0.04)!;
  near(discharge.at.point[2], 2, 1e-9, "on the starboard side");
  near(throughHullGeometry(discharge).rings[1][0][2], 2.01, 1e-9, "proud of the side");
});

test("parts: a retractable transducer lowers by its stroke", () => {
  const fitting = throughHull(box, "transducer", { x: 4, off: 0 }, 0.06)!;
  near(retractableTip({ fitting, stroke: 0.3, deployed: 0 })[1], -1, 1e-12, "flush");
  near(retractableTip({ fitting, stroke: 0.3, deployed: 0.5 })[1], -1.15, 1e-12, "half way");
  near(retractableTip({ fitting, stroke: 0.3, deployed: 3 })[1], -1.3, 1e-12, "no further than the stroke");
});

test("parts: a gyro stabiliser fits a wide hull and not a narrow one", () => {
  const fit = gyroFit(box, { x: 5, length: 1, width: 0.8, height: 0.7 })!;
  assert.equal(fit.fits, true);
  near(fit.base, -1, 1e-12, "on the bottom");
  const narrow: HullBody = { center: 0, sections: [0, 10].map((x) => ({ x, points: [[-1, 0.3], [1, 0.3]] })) };
  assert.equal(gyroFit(narrow, { x: 5, length: 1, width: 0.8, height: 0.7 }), null, "nowhere wide enough for its base");
  // in a V it sits higher, where the hull is wide enough for its base
  const v = gyroFit(hull, { x: 6, length: 0.8, width: 0.7, height: 0.6 })!;
  assert.ok(v.base > -0.9);
});

test("parts: volumes combine with their joint centre", () => {
  const c = combine({ volume: 1, centroid: [0, 0, 0] }, { volume: 3, centroid: [4, -1, 2] });
  near(c.volume, 4, 0, "volume");
  assert.deepEqual(c.centroid, [3, -0.75, 1.5]);
});
