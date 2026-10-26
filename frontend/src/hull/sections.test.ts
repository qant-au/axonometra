import assert from "node:assert/strict";
import { test } from "node:test";
import { bodyOutlineAt, bottomAt, halfAt, outlineAt, sectionAt, sheerAt } from "./sections.ts";
import type { HullBody } from "./types.ts";

const near = (a: number | null, b: number, eps = 1e-9) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} ≠ ${b}`);

// two stations of the same depth, the second wider: halfway along, halfway between
const widening: HullBody = {
  center: 0,
  sections: [
    { x: 0, points: [[-1, 1], [1, 1]] },
    { x: 2, points: [[-1, 3], [1, 3]] },
  ],
};

test("sections: exact on a station, linear between stations at the same height", () => {
  near(halfAt(widening, 0, 0), 1);
  near(halfAt(widening, 2, 0.5), 3);
  near(halfAt(widening, 1, 0), 2);
  near(halfAt(widening, 0.5, -0.5), 1.5);
});

test("sections: nothing below the bottom, above the top or outside the length", () => {
  assert.equal(halfAt(widening, 1, -1.01), null);
  assert.equal(halfAt(widening, -0.1, 0), null);
  assert.equal(halfAt(widening, 2.1, 0), null);
  assert.equal(bottomAt(widening, 3), null);
  assert.equal(halfAt(widening, 1, 1.01), null);
  near(halfAt(widening, 1, 1), 2);
});

test("sections: a section's shape is followed between its points", () => {
  // a V below the water and vertical topsides above it
  const v: HullBody = { center: 0, sections: [0, 4].map((x) => ({ x, points: [[-1, 0], [0, 1], [1, 1]] })) };
  near(halfAt(v, 2, -0.5), 0.5);
  near(halfAt(v, 2, -1), 0);
  near(halfAt(v, 2, 0.5), 1);
});

test("sections: bottom and sheer interpolate along the length, and the shape follows by height fraction", () => {
  const rising: HullBody = {
    center: 0,
    sections: [
      { x: 0, points: [[-2, 1], [1, 1]] },
      { x: 2, points: [[0, 0], [2, 1]] },
    ],
  };
  near(bottomAt(rising, 1), -1);
  near(sheerAt(rising, 1), 1.5);
  // at x = 1 the bottom of both stations (fraction 0) gives (1 + 0) / 2
  near(halfAt(rising, 1, -1), 0.5);
  assert.equal(halfAt(rising, 1, -1.5), null);
});

test("outline: a box body's waterline is its rectangle, port side first", () => {
  const box: HullBody = { center: 0, sections: [0, 10].map((x) => ({ x, points: [[-1, 2], [1, 2]] })) };
  const o = bodyOutlineAt(box, 0)!;
  assert.deepEqual(o[0], [0, -2]);
  assert.deepEqual(o[o.length - 1], [0, 2]);
  assert.ok(o.some(([x, z]) => x === 10 && z === -2) && o.some(([x, z]) => x === 10 && z === 2));
  assert.equal(bodyOutlineAt(box, -1.5), null);
});

test("outline: a pointed end is one point, the outline closed and symmetric about the body's centre", () => {
  const lens: HullBody = {
    center: 3,
    sections: [0, 1, 2, 3, 4].map((x) => {
      const h = x === 0 || x === 4 ? 0 : 1 - ((x - 2) / 2) ** 2;
      return { x, points: [[-1, h], [1, h]] };
    }),
  };
  const o = bodyOutlineAt(lens, 0)!;
  const ends = o.filter(([x]) => x === 0 || x === 4);
  assert.equal(ends.length, 2);
  for (const [x, z] of o) assert.ok(o.some(([x2, z2]) => Math.abs(x2 - x) < 1e-9 && Math.abs(z2 - (6 - z)) < 1e-9), `no mirror for ${x}, ${z}`);
});

test("outline: where the keel rises at both ends, the waterline outline starts and ends where it crosses", () => {
  const canoe: HullBody = {
    center: 0,
    sections: [
      { x: 0, points: [[0.5, 1], [1, 1]] },
      { x: 2, points: [[-1, 1], [1, 1]] },
      { x: 4, points: [[0.5, 1], [1, 1]] },
    ],
  };
  const o = bodyOutlineAt(canoe, 0)!;
  const xs = o.map(([x]) => x);
  // the bottom passes through 0 a third of the way between the end stations and the middle
  near(Math.min(...xs), 2 / 3, 1e-6);
  near(Math.max(...xs), 4 - 2 / 3, 1e-6);
  assert.equal(outlineAt({ bodies: [canoe, canoe] }, 0).length, 2);
});

test("sections: an asymmetric body has its own half-breadth each side, interpolated and outlined", () => {
  // port 1 m, starboard 2 m at the first station; port 1 m, starboard 3 m at the second
  const asym: HullBody = {
    center: 5,
    sections: [
      { x: 0, points: [[-1, 1, 2], [1, 1, 2]] },
      { x: 2, points: [[-1, 1, 3], [1, 1, 3]] },
    ],
  };
  near(halfAt(asym, 1, 0, -1), 1);
  near(halfAt(asym, 1, 0, 1), 2.5);
  assert.deepEqual(sectionAt(asym, 1)!.points[0], [-1, 1, 2.5]);
  const o = bodyOutlineAt(asym, 0)!;
  assert.equal(Math.min(...o.map(([, z]) => z)), 4);
  assert.equal(Math.max(...o.map(([, z]) => z)), 8);
  // a symmetric section between symmetric stations stays two numbers a point
  assert.equal(sectionAt(widening, 1)!.points[0].length, 2);
});

test("sectionAt: on a station it is that station; between stations it has every point either one has", () => {
  const a: HullBody = { center: 0, sections: [{ x: 0, points: [[-1, 0], [0, 1], [1, 1]] }, { x: 2, points: [[-1, 1], [1, 1]] }] };
  assert.deepEqual(sectionAt(a, 0)!.points, [[-1, 0], [0, 1], [1, 1]]);
  const mid = sectionAt(a, 1)!;
  assert.equal(mid.points.length, 3);
  near(mid.points[0][1], 0.5);
  near(mid.points[1][1], 1);
  assert.equal(sectionAt(a, 3), null);
});
