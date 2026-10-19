// Facing down (docs/scene-format.md, Mounting and facing): the renderers mirror
// every part inside the item's height. Snapshots of three made-up elements live
// in elements/test/snapshots/; after a deliberate change to the drawings, regenerate
// them with `UPDATE_SNAPSHOTS=1 npm run test:elements` and review every changed SVG.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { installedParts } from '../src/render/geometry.mjs';
import { modelOf } from '../src/render/model.mjs';
import { planSvg } from '../src/render/plan.mjs';

const dir = new URL('./snapshots/', import.meta.url);

function snapshot(name, actual) {
  const file = new URL(name, dir);
  if (process.env.UPDATE_SNAPSHOTS || !existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  assert.equal(actual, readFileSync(file, 'utf8'), `${name} changed`);
}

const down = (el) => ({ ...el, facing: 'down' });

// A pendant: a base plate and a narrower can with a lens on its top.
const cylinder = {
  id: 'test-cylinder',
  size: { w: 30, d: 30, h: 20 },
  parts: [
    { cyl: [15, 15, 15], h: 4 },
    { cyl: [15, 15, 8], z: 4, h: 16, top: [{ circle: [8, 8, 3] }] }
  ]
};

// A dome camera: a mounting ring and the dome above it, authored facing up.
const dome = {
  id: 'test-dome',
  size: { w: 40, d: 40, h: 14 },
  parts: [
    { cyl: [20, 20, 20], h: 3 },
    { dome: [20, 20, 18], z: 3, h: 11, role: 'glass' }
  ]
};

// An AC cassette: a box with grille slots on its top.
const box = {
  id: 'test-box',
  size: { w: 60, d: 60, h: 25 },
  parts: [
    {
      x: 0,
      y: 0,
      w: 60,
      d: 60,
      h: 25,
      top: [{ rect: [10, 10, 40, 4] }, { rect: [10, 46, 40, 4] }]
    }
  ]
};

test('facing up leaves the parts as authored', () => {
  assert.equal(installedParts(cylinder), cylinder.parts);
});

test('facing down mirrors each part inside the height: z = H - z - h', () => {
  const parts = installedParts(down(cylinder));
  assert.deepEqual(
    parts.map((p) => [p.z, p.h]),
    [
      [16, 4],
      [0, 16]
    ]
  );
  assert.ok(parts.every((p) => p.flipped));
});

test('flipped cylinder', () => {
  const el = down(cylinder);
  snapshot('cylinder-down.plan.svg', planSvg(el));
  assert.deepEqual(
    modelOf(el).map((s) => [s.z, s.h]),
    [
      [16, 4],
      [0, 16]
    ]
  );
});

test('flipped dome narrows downwards', () => {
  const el = down(dome);
  const [ring, cap] = modelOf(el);
  assert.deepEqual([ring.z, ring.h], [11, 3]);
  assert.deepEqual([cap.z, cap.h, cap.down], [0, 11, true]);
  assert.equal(modelOf(dome)[1].down, undefined);
});

test('flipped top-decorated box: the plan shows the face as authored', () => {
  // The plan shows the face as authored, as a reflected ceiling plan does.
  assert.equal(planSvg(down(box)), planSvg(box));
});

test('a ceiling element is drawn reflected (dashed) on the plan', () => {
  const ceiling = { ...down(box), mount: 0, mountFrom: 'ceiling' };
  const plan = planSvg(ceiling);
  assert.match(plan, /stroke-dasharray/);
  assert.doesNotMatch(planSvg(box), /stroke-dasharray/);
  assert.doesNotMatch(planSvg(ceiling, { reflected: false }), /stroke-dasharray/);
  snapshot('box-ceiling.plan.svg', plan);
  const symbol = { ...ceiling, symbol: { frame: 'circle', glyph: [] } };
  assert.match(planSvg(symbol), /<circle [^>]*stroke-dasharray="4 3"/);
});
