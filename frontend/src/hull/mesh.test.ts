import assert from "node:assert/strict";
import { test } from "node:test";
import { asymmetricBody } from "./forms.ts";
import { hydrostatics } from "./hydrostatics.ts";
import { bodyMesh, meshVolume, ringsMesh, tubeGeometry } from "./mesh.ts";
import { parametricHull } from "./parametric.ts";
import { bulbGeometry, bulbVolume, foilGeometry, foilVolume } from "./parts.ts";
import { pontoonBody } from "./revolution.ts";
import { ribTube } from "./tube.ts";
import type { HullBody } from "./types.ts";

const near = (a: number, b: number, eps: number, what: string) => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} vs ${b}`);
const box: HullBody = { center: 0, sections: [0, 10].map((x) => ({ x, points: [[-1, 2], [1, 2]] })) };
const hull = parametricHull({ hull: "monohull", length: 12, beam: 3.8, draft: 0.9, freeboard: 1.1 }).bodies[0];

/** Every edge of a closed mesh is shared by exactly two triangles, running opposite ways. */
function closed(m: { indices: number[] }): boolean {
  const edges = new Map<string, number>();
  for (let i = 0; i < m.indices.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = m.indices[i + k];
      const b = m.indices[i + ((k + 1) % 3)];
      const key = `${a},${b}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  for (const [key, n] of edges) {
    const [a, b] = key.split(",");
    if (n !== 1 || edges.get(`${b},${a}`) !== 1) return false;
  }
  return true;
}

test("mesh: a body's mesh is closed, faces outward and holds the body's volume", () => {
  for (const [name, body, tol] of [
    ["box", box, 1e-9],
    ["V hull", hull, 0.002],
    ["pontoon", pontoonBody({ length: 8, diameter: 0.6 }), 0.01],
    ["asymmetric", asymmetricBody(hull, -1, 0.5), 0.002],
  ] as [string, HullBody, number][]) {
    const m = bodyMesh(body);
    assert.ok(closed(m), `${name}: closed`);
    const v = hydrostatics({ bodies: [body] }, 100).volume;
    near(meshVolume(m), v, tol * v, `${name}: volume`);
  }
});

test("mesh: left open, the deck is off and the rest is the same", () => {
  const shut = bodyMesh(hull);
  const open = bodyMesh(hull, 32, true);
  assert.equal(shut.indices.length - open.indices.length, 6 * (hull.sections.length - 1), "one quad a station interval");
  assert.equal(closed(open), false);
});

test("mesh: parts and tubes loft into closed meshes facing outward, whichever way their rings run", () => {
  const keel = { root: [6, -0.9, 0] as [number, number, number], rootChord: 1.2, tipChord: 0.8, span: 1.5, sweep: 10 };
  const f = ringsMesh(foilGeometry(keel, 24, 64));
  assert.ok(closed(f));
  near(meshVolume(f), foilVolume(keel).volume, 0.02 * foilVolume(keel).volume, "foil volume");
  const bulb = { nose: [6, -2.4, 0] as [number, number, number], length: 2, diameter: 0.4 };
  const b = ringsMesh(bulbGeometry(bulb, 64, 48));
  near(meshVolume(b), bulbVolume(bulb).volume, 0.02 * bulbVolume(bulb).volume, "bulb volume");
  const t = ribTube(hull, { diameter: 0.5 });
  const tm = ringsMesh(tubeGeometry(t));
  assert.ok(closed(tm) && meshVolume(tm) > 0);
  // roughly its cross-section times its length
  let length = 0;
  for (let i = 1; i < t.path.length; i++) length += Math.hypot(...t.path[i].map((v, k) => v - t.path[i - 1][k]));
  near(meshVolume(tm), Math.PI * 0.0625 * length, 0.1 * Math.PI * 0.0625 * length, "tube volume");
  assert.deepEqual(ringsMesh({ rings: [] }), { positions: [], indices: [] });
});

test("mesh: a deck left off forward of an x keeps what lies aft of it (a raked transom's face)", () => {
  const three: HullBody = { center: 0, sections: [0, 5, 10].map((x) => ({ x, points: [[-1, 2], [1, 2]] })) };
  const all = bodyMesh(three, 8).indices.length;
  assert.equal(bodyMesh(three, 8, true).indices.length, all - 12, "the deck off both intervals");
  assert.equal(bodyMesh(three, 8, 5).indices.length, all - 6, "the deck off the forward one only");
  assert.equal(bodyMesh(three, 8, 0).indices.length, all - 12);
});

test("mesh: a body's knuckle keeps a row either side of it on every section", () => {
  // a step at the waterline, 0.2 wide below and 1 above, on a bottom that deepens: the step's share of the depth changes
  const stepped = (knuckles?: number[]): HullBody => ({
    center: 0,
    sections: [[0, -1], [10, -2]].map(([x, low]) => ({ x, points: [[low, 0.2], [-1e-7, 0.2], [1e-7, 1], [1, 1]] })),
    ...(knuckles ? { knuckles } : {}),
  });
  const atStep = (m: { positions: number[] }) => Array.from({ length: m.positions.length / 3 }, (_, i) => m.positions.slice(i * 3, i * 3 + 3)).filter(([, y, z]) => Math.abs(y) < 1e-3 && Math.abs(z) > 1e-9);
  assert.equal(atStep(bodyMesh(stepped(), 12)).length, 0, "rows by share of the depth pass the step by");
  const m = bodyMesh(stepped([0]), 12);
  // on each of the two sections, both sides: a row just under the step on the narrow part, one just over it on the wide
  assert.deepEqual(atStep(m).map(([, y, z]) => [y < 0, Math.round(Math.abs(z) * 1000) / 1000]).sort().join(" "), [...Array(4).fill("false,1"), ...Array(4).fill("true,0.2")].join(" "));
  near(meshVolume(m), 26, 1e-3, "the stepped body's volume");
  assert.ok(closed(m));
  assert.equal(m.positions.length, bodyMesh(stepped(), 12).positions.length, "the same rows, placed otherwise");
  assert.equal(bodyMesh(stepped([5]), 12).positions.length, m.positions.length, "a knuckle outside the body is no knuckle");
});
