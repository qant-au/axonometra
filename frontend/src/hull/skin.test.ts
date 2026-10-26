import assert from "node:assert/strict";
import { test } from "node:test";
import { SHIPD_EXAMPLES } from "./examples.ts";
import { asymmetricBody } from "./forms.ts";
import { hydrostatics } from "./hydrostatics.ts";
import { parametricHull } from "./parametric.ts";
import { revolutionBody } from "./revolution.ts";
import { shipdBody } from "./shipd.ts";
import { bodyRange, bottomAt, halfAt, sectionAt, sheerAt } from "./sections.ts";
import { innerBody } from "./skin.ts";
import type { HullBody } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);

test("skin: a box's inside is the box less the plating each side, below and at each end", () => {
  // 10 m by 4 m, from 1 m below the water to 1 m above, 20 mm plate; open at the deck
  const box: HullBody = { center: 0, sections: Array.from({ length: 11 }, (_, i) => ({ x: i, points: [[-1, 2], [1, 2]] })) };
  const t = 0.02;
  const inner = innerBody(box, t);
  assert.deepEqual(bodyRange(inner), [t, 10 - t]);
  near(halfAt(inner, 5, 0)!, 2 - t, 1e-12, "sides");
  near(bottomAt(inner, 5)!, -1 + t, 1e-12, "bottom");
  near(sheerAt(inner, 5)!, 1, 1e-12, "up to the deck");
  near(hydrostatics({ bodies: [inner] }, 1).volume, (10 - 2 * t) * (4 - 2 * t) * (2 - t), 1e-6, "volume inside");
});

test("skin: a round hull's inside is the circle less the plating", () => {
  const tube = revolutionBody(10, () => 1, { axis: -3, levels: 65 });
  const inner = innerBody(tube, 0.05);
  // at its widest the inside is 0.95, all round within the polygon's own rounding
  near(halfAt(inner, 5, -3)!, 0.95, 2e-3, "at the axis");
  near(bottomAt(inner, 5)!, -3.95, 2e-3, "at the bottom");
  const v = hydrostatics({ bodies: [inner] }).volume;
  near(v, Math.PI * 0.95 * 0.95 * 9.9, 0.01 * v, "volume");
});

test("skin: on a V hull every inside point is the plating's thickness from the outside", () => {
  const body = parametricHull({ hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 }).bodies[0];
  const t = 0.03;
  const inner = innerBody(body, t);
  const outer = sectionAt(body, 6)!.points.map(([y, h]) => [h, y]);
  const dist = (p: number[]) => {
    // distance from a point to the outside's polyline
    let d = Infinity;
    for (let i = 1; i < outer.length; i++) {
      const [ax, ay] = outer[i - 1];
      const [bx, by] = outer[i];
      const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
      const u = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / l2)) : 0;
      d = Math.min(d, Math.hypot(p[0] - ax - u * (bx - ax), p[1] - ay - u * (by - ay)));
    }
    return d;
  };
  const pts = sectionAt(inner, 6)!.points;
  // all but the top point (the deck edge, kept at the sheer) and points on the centre line
  for (const [y, h] of pts.slice(0, -1)) if (h > 1e-6) near(dist([h, y]), t, 0.004, `at height ${y.toFixed(3)}`);
  const vo = hydrostatics({ bodies: [body] }, 1).volume;
  const vi = hydrostatics({ bodies: [inner] }, 1).volume;
  assert.ok(vi < vo && vi > 0.9 * vo);
});

test("skin: Ship-D hulls with bulbs, transoms and chines get a whole inside", () => {
  for (const name of ["container-ship-300m", "planing-cruiser-12m", "double-ender-8m", "ddg-1000-wave-piercer-186m"]) {
    const body = shipdBody(SHIPD_EXAMPLES.find((v) => v.name === name)!.bodies[0].vector);
    const [x0, x1] = bodyRange(body);
    const inner = innerBody(body, (x1 - x0) / 400);
    for (const s of inner.sections) {
      s.points.forEach((p, i) => {
        assert.ok(p.every(Number.isFinite) && p[1] >= 0, `${name}: a bad point at ${s.x}`);
        if (i) assert.ok(p[0] >= s.points[i - 1][0], `${name}: heights out of order at ${s.x}`);
      });
    }
    const ratio = hydrostatics({ bodies: [inner] }, 1e3).volume / hydrostatics({ bodies: [body] }, 1e3).volume;
    assert.ok(ratio > 0.85 && ratio < 0.99, `${name}: inside ${ratio} of outside`);
  }
});

test("skin: an asymmetric hull's inside keeps each side's own shape", () => {
  const body = asymmetricBody(parametricHull({ hull: "monohull", length: 12, beam: 1.6, draft: 0.7, freeboard: 1.0 }).bodies[0], -1, 0.4);
  const inner = innerBody(body, 0.02);
  const p = halfAt(inner, 6, 0, -1)!;
  const s = halfAt(inner, 6, 0, 1)!;
  assert.ok(s > p + 0.3, "the full side stays the wider");
  near(s, halfAt(body, 6, 0, 1)! - 0.02, 0.006, "starboard less the plating");
});
