import assert from "node:assert/strict";
import { test } from "node:test";
import { combine } from "./loads.ts";

test("weights: the total is the displacement in tonnes, the centre of gravity mass-weighted", () => {
  const load = combine([
    { name: "hull", mass: 600, at: [3, 0.2, 0] },
    { name: "motor", mass: 200, at: [-0.3, 0.6, 0.4] },
    { name: "crew", mass: 200, at: [2, 1, -0.4] },
  ]);
  assert.equal(load.displacement, 1);
  assert.ok(Math.abs(load.lcg - (600 * 3 + 200 * -0.3 + 200 * 2) / 1000) < 1e-12);
  assert.ok(Math.abs(load.vcg - (600 * 0.2 + 200 * 0.6 + 200 * 1) / 1000) < 1e-12);
  assert.ok(Math.abs(load.tcg!) < 1e-12, "the motor and the crew balance across");
  assert.equal(load.density, undefined);
  assert.equal(combine([{ name: "x", mass: 1000, at: [0, 0, 0] }], 1.0).density, 1.0);
});

test("weights: nothing to float is an error, not a weightless boat", () => {
  assert.throws(() => combine([]), /no weight/);
});
