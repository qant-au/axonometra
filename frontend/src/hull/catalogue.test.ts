import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOGUE } from "./catalogue.ts";
import { SHIPD_EXAMPLES } from "./examples.ts";
import { hydrostatics } from "./hydrostatics.ts";
import { meshVolume, bodyMesh } from "./mesh.ts";

test("catalogue: every hull builds, floats, and its mesh holds its volume", () => {
  const names = new Set<string>();
  for (const e of CATALOGUE) {
    assert.ok(!names.has(e.name), `${e.name} twice`);
    names.add(e.name);
    assert.ok(e.group && e.note, `${e.name}: a group and a note`);
    const c = e.build();
    const h = hydrostatics(c.hull, c.waterline ?? 0);
    assert.ok(h.displacement > 0 && Number.isFinite(h.vcb), `${e.name}: floats`);
    // submerged hulls are all under the water, the rest have a waterplane
    if ((c.waterline ?? 0) > 0) assert.equal(h.waterplane, 0, `${e.name}: submerged`);
    else assert.ok(h.waterplane > 0, `${e.name}: a waterplane`);
    const full = hydrostatics(c.hull, 1e4).volume;
    const mesh = c.hull.bodies.reduce((s, b) => s + meshVolume(bodyMesh(b)), 0);
    assert.ok(Math.abs(mesh - full) < 0.02 * full, `${e.name}: mesh ${mesh} against ${full}`);
  }
  // every Ship-D example is in it, grouped
  for (const x of SHIPD_EXAMPLES) assert.notEqual(CATALOGUE.find((e) => e.name === x.name)?.group, "Other", x.name);
});
