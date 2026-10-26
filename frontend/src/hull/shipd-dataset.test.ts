import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOGUE } from "./catalogue.ts";
import { hydrostatics } from "./hydrostatics.ts";
import { SHIPD_PARAMETERS, shipdBody, shipdFeasible } from "./shipd.ts";
import { parseShipDVectors, SHIPD_DATASET } from "./shipd-dataset.ts";

test("the picked dataset hulls: feasible, no bulbs, small-craft proportions, and they float", () => {
  assert.ok(SHIPD_DATASET.length >= 3);
  for (const e of SHIPD_DATASET) {
    const v = e.vector;
    assert.equal(v.length, SHIPD_PARAMETERS.length, `row ${e.row}`);
    assert.ok(shipdFeasible(v), `row ${e.row}: feasible as bundled (rounded to 9 places)`);
    assert.deepEqual([v[31], v[32]], [0, 0], `row ${e.row}: no bulbous bow or stern`);
    assert.ok(v[3] >= 0.28 && v[4] >= 0.12 && v[6] >= 0.3 && v[6] <= 0.6, `row ${e.row}: small-craft proportions`);
    const h = hydrostatics({ bodies: [shipdBody([8, ...v.slice(1)], { stations: 41, levels: 30 })] });
    assert.ok(h.volume > 0 && h.waterplane > 0, `row ${e.row}`);
  }
});

test("the picked dataset hulls are in the hull viewer's catalogue, at 8 m, under their own group", () => {
  for (const e of SHIPD_DATASET) {
    const entry = CATALOGUE.find((c) => c.name === `shipd-set1-row-${e.row}`);
    assert.ok(entry && entry.group === "Ship-D dataset", `row ${e.row}`);
    const body = entry.build().hull.bodies[0];
    assert.ok(Math.abs(body.sections.at(-1)!.x - body.sections[0].x - 8) < 0.5, `row ${e.row}: about 8 m long`);
  }
});

const header = SHIPD_PARAMETERS.join(",");
const line = (v: number[], sep = ",") => v.join(sep);

test("import: an Input_Vectors file with its header, comma or tab separated, rows numbered after the header", () => {
  const [a, b, c] = SHIPD_DATASET.map((e) => e.vector);
  const got = parseShipDVectors([header, line(a), line(b, "\t"), line(c)].join("\r\n"));
  assert.deepEqual(got.map((g) => g.row), [1, 2, 3]);
  assert.deepEqual(got[1].vector, b);
  assert.deepEqual(parseShipDVectors([line(a), "", line(b)].join("\n")).map((g) => g.row), [1, 2], "no header, blank lines skipped");
});

test("import: rows of the wrong width or with a gap are skipped but keep their number; bulbs and constraints filter", () => {
  const a = SHIPD_DATASET[0].vector;
  const bulb = [...a];
  bulb[31] = 1;
  const broken = [...a];
  broken[3] = 5; // a beam of five lengths breaks the constraints
  const text = [header, line(a.slice(0, 44)), line(a).replace(/,[^,]*,/, ",,"), line(bulb), line(broken), line(a)].join("\n");
  assert.deepEqual(parseShipDVectors(text).map((g) => g.row), [3, 4, 5]);
  assert.deepEqual(parseShipDVectors(text, { bulbs: false }).map((g) => g.row), [4, 5]);
  assert.deepEqual(parseShipDVectors(text, { bulbs: false, feasible: true }).map((g) => g.row), [5]);
});
