import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, loadElements } from '../src/index.mjs';
import { TAGS } from '../src/palette.mjs';
import { bounds } from '../src/render/geometry.mjs';
import { mountingErrors } from '../src/mounting.mjs';
import { planSvg } from '../src/render/plan.mjs';
import { titleCase } from './title-case.mjs';

const elements = await loadElements();
const groupIds = new Set(GROUPS.map((g) => g.id));
// Saved Axonometra plans refer to these; they must always exist.
const LEGACY_IDS = ['bed', 'chair', 'table'];
const TOLERANCE = 0.5; // cm

// Solids must not overlap: each part is one separate solid of the model. Only box against box is checked, because for cylinders,
// domes and polygons the bounding boxes can overlap while the shapes do not.
const isBox = (p) => !p.cyl && !p.dome && !p.poly;
const overlap = (a, b, k, s) =>
  Math.min(a[k] + a[s], b[k] + b[s]) - Math.max(a[k], b[k]);

test('ids are unique kebab-case', () => {
  const seen = new Set();
  for (const el of elements) {
    assert.match(el.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, el.id);
    assert.ok(!seen.has(el.id), `duplicate id ${el.id}`);
    seen.add(el.id);
  }
});

test('mounting values are checked', () => {
  assert.deepEqual(mountingErrors({ mount: 0, mountFrom: 'ceiling', facing: 'down' }), []);
  assert.deepEqual(mountingErrors({ mount: 30, mountFrom: 'surface' }), []);
  assert.deepEqual(mountingErrors({}), []);
  assert.equal(mountingErrors({ mount: -1 }).length, 1);
  // A ceiling mount may be negative, a recess, down to the item's height.
  assert.deepEqual(mountingErrors({ size: { h: 25 }, mount: -22, mountFrom: 'ceiling' }), []);
  assert.equal(mountingErrors({ size: { h: 25 }, mount: -26, mountFrom: 'ceiling' }).length, 1);
  assert.equal(mountingErrors({ size: { h: 25 }, mount: -1, mountFrom: 'surface' }).length, 1);
  assert.equal(mountingErrors({ mount: '270' }).length, 1);
  assert.equal(mountingErrors({ mountFrom: 'wall' }).length, 1);
  assert.equal(mountingErrors({ facing: 'sideways' }).length, 1);
  // A support's top is above its underside and no higher than the item.
  assert.deepEqual(mountingErrors({ size: { h: 73 }, surface: 73 }), []);
  assert.equal(mountingErrors({ size: { h: 73 }, surface: 74 }).length, 1);
  assert.equal(mountingErrors({ size: { h: 73 }, surface: 0 }).length, 1);
  assert.equal(mountingErrors({ size: { h: 73 }, surface: 73, mountFrom: 'surface' }).length, 1);
});

test('legacy Axonometra ids are present', () => {
  for (const id of LEGACY_IDS)
    assert.ok(
      elements.some((e) => e.id === id),
      id
    );
});

for (const el of elements) {
  test(`${el.id}: well formed`, () => {
    assert.ok(el.name, 'name');
    assert.equal(el.name, titleCase(el.name), 'name is Title Case');
    assert.ok(groupIds.has(el.group), `group ${el.group}`);
    for (const t of el.tags ?? []) assert.ok(TAGS.includes(t), `tag ${t}`);
    assert.deepEqual(mountingErrors(el), [], 'mount, mountFrom, facing');
    const { w, d, h } = el.size;
    assert.ok(w > 0 && d > 0 && h > 0, 'size');
    assert.ok(el.parts?.length, 'parts');
    for (const p of el.parts) {
      const b = bounds(p);
      assert.ok(
        b.w > 0 && b.d > 0 && b.h > 0,
        `part size ${JSON.stringify(p)}`
      );
      assert.ok(
        b.x >= -TOLERANCE && b.y >= -TOLERANCE && b.z >= -TOLERANCE,
        `part below origin ${JSON.stringify(b)}`
      );
      assert.ok(
        b.x + b.w <= w + TOLERANCE,
        `part past width ${JSON.stringify(b)}`
      );
      assert.ok(
        b.y + b.d <= d + TOLERANCE,
        `part past depth ${JSON.stringify(b)}`
      );
      assert.ok(
        b.z + b.h <= h + TOLERANCE,
        `part past height ${JSON.stringify(b)}`
      );
    }
  });

  test(`${el.id}: boxes do not overlap`, () => {
    const boxes = el.parts.filter(isBox).map(bounds);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const into = [
          overlap(a, b, 'x', 'w'),
          overlap(a, b, 'y', 'd'),
          overlap(a, b, 'z', 'h')
        ];
        assert.ok(
          into.some((v) => v <= TOLERANCE),
          `parts ${JSON.stringify(a)} and ${JSON.stringify(b)} overlap`
        );
      }
  });

  test(`${el.id}: renders`, () => {
    const plan = planSvg(el);
    assert.ok(!/NaN|undefined|Infinity/.test(plan), 'plan has a bad number');
    assert.ok(plan.length < 4096, `plan SVG is ${plan.length} bytes`);
  });
}
