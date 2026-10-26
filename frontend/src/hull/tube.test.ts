import assert from "node:assert/strict";
import { test } from "node:test";
import { SHIPD_EXAMPLES } from "./examples.ts";
import { bodyRange, sheerAt } from "./sections.ts";
import { shipdBody } from "./shipd.ts";
import { ribTube, tubeBottom } from "./tube.ts";
import type { HullBody } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);

// the example RIB hull: 6.5 m, deep V, its transom raked so the foot lies aft of the deck's end
const hull = shipdBody(SHIPD_EXAMPLES.find((v) => v.name === "rib-6.5m")!.bodies[0].vector);
const [stern, stem] = bodyRange(hull);

test("tube: from aft of the transom round the bow and back, the same both sides", () => {
  const t = ribTube(hull, { diameter: 0.5 });
  const n = t.path.length;
  assert.equal(t.radius.length, n);
  // it starts and ends 0.4 m (0.8 diameters) aft of the hull's aftmost point
  assert.ok(Math.abs(t.path[0][0] - (stern - 0.4)) < 1e-9);
  assert.ok(Math.abs(t.path[n - 1][0] - (stern - 0.4)) < 1e-9);
  // port and starboard mirror each other about the centre line
  for (let i = 0; i < n; i++) {
    const [x, y, z] = t.path[i];
    const [x2, y2, z2] = t.path[n - 1 - i];
    assert.ok(Math.abs(x - x2) < 1e-9 && Math.abs(y - y2) < 1e-9 && Math.abs(z + z2) < 1e-9);
  }
  // the front of the turn is at the stem plus the offset
  const front = Math.max(...t.path.map(([x]) => x));
  assert.ok(Math.abs(front - (stem + 0.125)) < 1e-6);
});

test("tube: the full radius along the sides, cones at the aft ends, parallel aft of the widest point", () => {
  const t = ribTube(hull, { diameter: 0.5, coneEnd: 0.5 });
  assert.ok(Math.abs(t.radius[0] - 0.125) < 1e-9, "the cone ends at half the radius");
  const sides = t.path.map(([x, , z], i) => ({ x, z, r: t.radius[i] })).filter((p, i) => i < t.path.length / 2 && p.x > stern && p.x < stem - 1.5);
  for (const p of sides) assert.equal(p.r, 0.25);
  // aft of amidships the port side keeps one distance off the centre line
  const aft = sides.filter((p) => p.x < (stern + stem) / 2).map((p) => p.z);
  assert.ok(Math.max(...aft) - Math.min(...aft) < 1e-9);
});

test("tube: it sits on the deck edge above the water, and lifts at the bow", () => {
  const t = ribTube(hull, { diameter: 0.5 });
  assert.ok(tubeBottom(t) > 0, "clear of the water at rest");
  const mid = t.path.find(([x]) => x > (stern + stem) / 2)!;
  assert.ok(Math.abs(mid[1] - (sheerAt(hull, mid[0])! + 0.05)) < 1e-9, "a tenth of the diameter above the sheer");
  const bow = t.path[Math.floor(t.path.length / 2)];
  assert.ok(bow[1] > mid[1] + 0.1);
});

test("tube: on a plain vertical transom the deck runs right aft, and the tubes past it", () => {
  // a box 5 m long, 2 m wide, its transom straight up at x = 0, its bow a point
  const punt: HullBody = {
    center: 0,
    sections: [0, 1, 2, 3, 4, 5].map((x) => {
      const h = x < 3 ? 1 : 1 - (x - 3) / 2;
      return { x, points: [[-0.3, h], [0.4, h]] as [number, number][] };
    }),
  };
  const t = ribTube(punt, { diameter: 0.4 });
  near(t.path[0][0], -0.32, 1e-9, "0.8 diameters aft of the transom");
  near(t.path[0][2], -1.1, 1e-9, "the deck's half-breadth plus a quarter diameter");
  near(t.path[0][1], 0.44, 1e-9, "a tenth of the diameter above the sheer");
});

test("tube: a given corner radius is kept, and never tighter than the tube itself", () => {
  const wide = ribTube(hull, { diameter: 0.5, corner: 0.9 });
  const front = wide.path[Math.floor(wide.path.length / 2)];
  assert.ok(Math.abs(Math.abs(front[2]) - 0) < 1e-9);
  const zs = wide.path.filter(([x]) => x > stem + 0.125 - 0.9).map(([, , z]) => Math.abs(z));
  assert.ok(Math.max(...zs) <= 0.9 + 1e-9);
  const tight = ribTube(hull, { diameter: 0.5, corner: 0.05 });
  const zt = tight.path.filter(([x]) => x > stem + 0.125 - 0.25 + 1e-6).map(([, , z]) => Math.abs(z));
  assert.ok(Math.max(...zt) <= 0.25 + 1e-9, "turned at the tube's own radius");
});
