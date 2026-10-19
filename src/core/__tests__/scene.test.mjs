// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LEGACY_SCENE_FORMAT,
  SCENE_FORMAT,
  SCENE_SCHEMA_URL,
  isSceneDocument,
  emptyScene,
  hasRedacted,
  mergeScene,
  parseJson,
  parseScene,
  redactScene,
  sceneSchema,
  serializeScene,
  validateScene
} from '../index';

const doc = readFileSync(
  new URL('../../../docs/scene-format.md', import.meta.url),
  'utf8'
);

// Every complete scene in the spec is valid: the prose and the schema agree.
const examples = [...doc.matchAll(/```json\n([\s\S]*?)```/g)]
  .map((m) => m[1])
  .filter((text) => text.trimStart().startsWith('{'));

test('the spec has worked examples', () => {
  assert.ok(examples.length >= 4, `found ${examples.length}`);
});

examples.forEach((text, i) => {
  test(`spec example ${i + 1} is a valid scene`, () => {
    const result = parseScene(text);
    assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  });
});

const base = () => ({
  format: 'axonometra-scene',
  version: 1,
  id: 's',
  objects: [
    { id: 'a', name: 'A', ports: [{ id: 'p1' }] },
    { id: 'b', name: 'B' }
  ],
  connections: [{ id: 'c', from: 'a', fromPort: 'p1', to: 'b' }],
  views: [
    {
      id: 'd',
      kind: 'iso',
      name: 'Diagram',
      placements: [
        { object: 'a', tile: { x: 0, y: 0 } },
        { object: 'b', tile: { x: 2, y: 0 } }
      ],
      connectors: [
        {
          id: 'k',
          connection: 'c',
          anchors: [
            { id: 'k1', ref: { object: 'b' } },
            { id: 'k2', ref: { object: 'a' } }
          ]
        }
      ]
    }
  ]
});

const errorsOf = (value) => {
  const result = validateScene(value);
  assert.equal(result.ok, false, 'expected the scene to be refused');
  return result.errors.join('\n');
};

test('a scene with connected, placed objects is valid', () => {
  const result = validateScene(base());
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
});

test('a scene under the legacy format name reads as the current one', () => {
  const legacy = { ...base(), format: LEGACY_SCENE_FORMAT };
  assert.equal(isSceneDocument(legacy), true);
  const result = validateScene(legacy);
  assert.equal(result.ok, true);
  assert.equal(result.scene.format, SCENE_FORMAT);
  assert.match(serializeScene(result.scene), /"format": "axonometra-scene"/);
});

test('unknown keys are refused at every level', () => {
  const s = base();
  s.objects[0].colour = 'red';
  assert.match(errorsOf(s), /colour/);
});

test('an object anchor can name the side of the tile it leaves by', () => {
  const s = base();
  s.views[0].connectors[0].anchors[0].ref.side = '+X';
  s.views[0].connectors[0].anchors[1].ref.side = '-Y';
  const result = validateScene(s);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  s.views[0].connectors[0].anchors[0].ref.side = 'NORTH';
  assert.match(errorsOf(s), /side|ref/);
  const t = base();
  t.views[0].connectors[0].anchors[0].ref = { tile: { x: 1, y: 1 }, side: '+X' };
  errorsOf(t);
});

test('diagram placements, connectors, rectangles and text boxes can be locked', () => {
  const s = base();
  s.views[0].placements[0].locked = true;
  s.views[0].connectors[0].locked = true;
  s.views[0].rectangles = [
    { id: 'r', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, locked: true }
  ];
  s.views[0].textBoxes = [
    { id: 't', tile: { x: 3, y: 3 }, content: 'Note', locked: false }
  ];
  const result = validateScene(s);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  s.views[0].placements[0].locked = 'yes';
  assert.match(errorsOf(s), /locked/);
});

test('ids must be safe strings', () => {
  const s = base();
  s.objects[1].id = 'has space';
  assert.match(errorsOf(s), /Ids are/);
});

test('references must resolve', () => {
  const s = base();
  s.connections[0].toPort = 'nope';
  assert.match(errorsOf(s), /no port "nope"/);
  const t = base();
  t.views[0].placements.push({ object: 'ghost', tile: { x: 1, y: 1 } });
  assert.match(errorsOf(t), /Unknown object "ghost"/);
});

test('an object is placed at most once per view', () => {
  const s = base();
  s.views[0].placements.push({ object: 'a', tile: { x: 5, y: 5 } });
  assert.match(errorsOf(s), /placed twice/);
});

test("a connector's ends must match its connection", () => {
  const s = base();
  s.objects.push({ id: 'z' });
  s.views[0].placements.push({ object: 'z', tile: { x: 4, y: 4 } });
  s.views[0].connectors[0].anchors[0].ref = { object: 'z' };
  assert.match(errorsOf(s), /do not match connection/);
});

test('groups may not nest in a cycle', () => {
  const s = base();
  s.views[0].groups = [
    { id: 'g1', group: 'g2' },
    { id: 'g2', group: 'g1' }
  ];
  assert.match(errorsOf(s), /inside itself/);
});

test('a group can be collapsed', () => {
  const s = base();
  s.views[0].groups = [{ id: 'g1', name: 'Rack', collapsed: true }];
  const result = validateScene(s);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  s.views[0].groups[0].collapsed = 'yes';
  assert.match(errorsOf(s), /collapsed/);
});

test('link and icon urls are restricted', () => {
  const s = base();
  s.objects[0].links = [{ source: 'rmm', url: 'javascript:alert(1)' }];
  assert.match(errorsOf(s), /http: or https:/);
  const t = base();
  t.icons = [{ id: 'i', name: 'I', url: 'data:text/html,x' }];
  t.objects[0].icon = 'i';
  assert.match(errorsOf(t), /icon url/);
});

test('a newer version is refused, not half-read', () => {
  const s = base();
  s.version = 3;
  assert.match(errorsOf(s), /newer than this editor reads/);
});

test('parseJson drops prototype keys', () => {
  const value = parseJson('{"__proto__":{"polluted":true},"a":1}');
  assert.equal({}.polluted, undefined);
  assert.deepEqual(Object.keys(value), ['a']);
});

test('serializeScene writes $schema first and refuses an invalid scene', () => {
  const text = serializeScene(emptyScene('x', 'X'));
  const parsed = JSON.parse(text);
  assert.deepEqual(Object.keys(parsed).slice(0, 4), [
    '$schema',
    'format',
    'version',
    'id'
  ]);
  assert.equal(parsed.$schema, SCENE_SCHEMA_URL);
  const bad = base();
  bad.objects.push({ id: 'a' });
  assert.throws(() => serializeScene(bad), /invalid scene/);
});

// A plan view, owned by Axonometra, beside a diagram another editor owns.
const shared = () => {
  const s = base();
  s.objects.push({ id: 'sofa', element: 'sofa-3', props: { colour: 'grey' } });
  s.views.push({
    id: 'plan',
    kind: 'plan',
    name: 'Plan',
    floors: [{ id: 'g', nodes: [], walls: [] }],
    placements: [
      { object: 'a', floor: 'g', x: 0, y: 0, layer: 'l1' },
      { object: 'sofa', floor: 'g', x: 100, y: 100 }
    ]
  });
  s.layers = [{ id: 'l1', name: 'Kit' }];
  return s;
};

test('merge keeps views and object fields the editor does not own', () => {
  const opened = shared();
  // The diagram editor renames A and moves it; it knows nothing of the plan.
  const merged = mergeScene(opened, {
    viewKinds: ['iso', 'schematic'],
    views: [
      {
        id: 'd',
        kind: 'iso',
        name: 'Diagram',
        placements: [
          { object: 'a', tile: { x: 1, y: 1 } },
          { object: 'b', tile: { x: 2, y: 0 } }
        ],
        connectors: [
          {
            id: 'k',
            anchors: [
              { id: 'k1', ref: { object: 'b' } },
              { id: 'k2', ref: { object: 'a' } }
            ]
          }
        ]
      }
    ],
    objects: [
      { id: 'a', name: 'A2' },
      { id: 'b', name: 'B' }
    ],
    objectFields: ['name', 'description', 'icon'],
    preserve: { connector: ['connection', 'layer'] }
  });
  assert.equal(validateScene(merged).ok, true);
  const a = merged.objects.find((o) => o.id === 'a');
  assert.equal(a.name, 'A2');
  assert.deepEqual(a.ports, [{ id: 'p1' }]);
  assert.ok(merged.objects.some((o) => o.id === 'sofa'));
  assert.deepEqual(
    merged.views.map((v) => v.id),
    ['d', 'plan']
  );
  assert.equal(merged.views[0].connectors[0].connection, 'c');
  assert.equal(merged.connections.length, 1);
});

test('merge deletes an object the editor removed, unless placed elsewhere', () => {
  const opened = shared();
  // Axonometra deletes the sofa and A from its plan.
  const merged = mergeScene(opened, {
    viewKinds: ['plan'],
    views: [
      {
        id: 'plan',
        kind: 'plan',
        name: 'Plan',
        floors: [{ id: 'g', nodes: [], walls: [] }],
        placements: []
      }
    ],
    objects: [],
    objectFields: ['element']
  });
  assert.equal(validateScene(merged).ok, true);
  const ids = merged.objects.map((o) => o.id);
  assert.ok(!ids.includes('sofa'), 'sofa was only on the plan');
  assert.ok(ids.includes('a'), 'A is still in the diagram');
});

test('merge keeps objects no editor has placed', () => {
  const opened = emptyScene('n');
  opened.objects = [{ id: 'fw', element: 'firewall' }];
  const merged = mergeScene(opened, {
    viewKinds: ['plan'],
    views: [],
    objects: [],
    objectFields: ['element']
  });
  assert.deepEqual(merged.objects, [{ id: 'fw', element: 'firewall' }]);
});

test('merge drops connections to deleted objects and their connector links', () => {
  const opened = base();
  const merged = mergeScene(opened, {
    viewKinds: ['iso'],
    views: [
      {
        id: 'd',
        kind: 'iso',
        name: 'Diagram',
        placements: [{ object: 'a', tile: { x: 0, y: 0 } }]
      }
    ],
    objects: [{ id: 'a', name: 'A' }],
    objectFields: ['name', 'description', 'icon']
  });
  assert.equal(validateScene(merged).ok, true);
  assert.deepEqual(merged.connections, []);
});

test('merge writes the layers an editor sets', () => {
  const merged = mergeScene(base(), {
    viewKinds: ['iso'],
    views: base().views,
    objects: base().objects,
    objectFields: ['name'],
    set: { layers: [{ id: 'detail', name: 'Detail', visible: false }] }
  });
  assert.equal(validateScene(merged).ok, true);
  assert.deepEqual(merged.layers, [
    { id: 'detail', name: 'Detail', visible: false }
  ]);
});

test('a scene with nothing redacted is left as it is', () => {
  const scene = base();
  assert.equal(hasRedacted(scene), false);
  assert.deepEqual(redactScene(scene), scene);
});

test('redaction removes the layer and what only it held', () => {
  const scene = base();
  const view = scene.views[0];
  view.placements[1].layer = 'redacted';
  view.textBoxes = [
    { id: 't1', tile: { x: 0, y: 1 }, content: '10.0.0.1', layer: 'redacted' },
    { id: 't2', tile: { x: 0, y: 2 }, content: 'Office' }
  ];
  // A second connector that ends on the first one's anchor.
  view.connectors.push({
    id: 'k3',
    anchors: [
      { id: 'j1', ref: { anchor: 'k1' } },
      { id: 'j2', ref: { tile: { x: 4, y: 4 } } }
    ]
  });
  scene.objects.push({ id: 'spare', name: 'Unplaced' });
  assert.equal(validateScene(scene).ok, true);
  assert.equal(hasRedacted(scene), true);

  const out = redactScene(scene);
  assert.equal(validateScene(out).ok, true);
  assert.deepEqual(
    out.objects.map((o) => o.id),
    ['a', 'spare']
  );
  assert.deepEqual(out.connections, []);
  const outView = out.views[0];
  assert.deepEqual(
    outView.placements.map((p) => p.object),
    ['a']
  );
  assert.deepEqual(outView.connectors, [], 'both connectors ended on B');
  assert.deepEqual(
    outView.textBoxes.map((t) => t.id),
    ['t2']
  );
  assert.equal(scene.views[0].textBoxes.length, 2, 'the input is untouched');
});

test('redaction keeps an object that is still placed elsewhere', () => {
  const scene = base();
  scene.views.push({
    id: 'd2',
    kind: 'schematic',
    name: 'Flat',
    placements: [{ object: 'b', tile: { x: 0, y: 0 } }]
  });
  scene.views[0].placements[1].layer = 'redacted';
  const out = redactScene(scene);
  assert.equal(validateScene(out).ok, true);
  assert.ok(out.objects.some((o) => o.id === 'b'));
  assert.equal(out.connections.length, 1);
});

test('redaction removes plan walls and detaches what was fixed into them', () => {
  const scene = emptyScene('p');
  scene.objects = [{ id: 'door', element: 'door' }];
  scene.views = [
    {
      id: 'plan',
      kind: 'plan',
      name: 'Plan',
      floors: [
        {
          id: 'f',
          nodes: [
            { id: 'n1', x: 0, y: 0 },
            { id: 'n2', x: 1000, y: 0 }
          ],
          walls: [{ id: 'w', from: 'n1', to: 'n2', layer: 'redacted' }]
        }
      ],
      placements: [
        { object: 'door', floor: 'f', x: 500, y: 0, attach: { wall: 'w' } }
      ]
    }
  ];
  assert.equal(validateScene(scene).ok, true);
  assert.equal(hasRedacted(scene), true);
  const out = redactScene(scene);
  assert.equal(validateScene(out).ok, true);
  assert.deepEqual(out.views[0].floors[0].walls, []);
  assert.deepEqual(out.views[0].placements, [
    { object: 'door', floor: 'f', x: 500, y: 0 }
  ]);
});

// Mounting and facing, scene version 2 (docs/scene-format.md).
const planScene = (placements, version = 2) => ({
  format: 'axonometra-scene',
  version,
  id: 'm',
  objects: [{ id: 'light' }, { id: 'desk' }, { id: 'lamp' }],
  views: [
    {
      id: 'plan',
      kind: 'plan',
      name: 'Plan',
      floors: [
        { id: 'f', wallHeightMm: 2400 },
        { id: 'g', wallHeightMm: 2700 }
      ],
      placements
    }
  ]
});

test('a version 1 placement with mountMm only loads as floor-referenced', () => {
  const v1 = planScene(
    [
      { object: 'light', floor: 'f', x: 0, y: 0, mountMm: 2100 },
      { object: 'desk', floor: 'f', x: 0, y: 0 }
    ],
    1
  );
  const result = validateScene(v1);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  assert.equal(result.scene.version, 2);
  const [light, desk] = result.scene.views[0].placements;
  assert.equal(light.mountFrom, 'floor');
  assert.equal(light.mountMm, 2100);
  assert.equal(desk.mountFrom, undefined, 'no mountMm: follows the element');
  assert.equal(v1.version, 1, 'the input is untouched');
  assert.equal(v1.views[0].placements[0].mountFrom, undefined);
});

test('sceneSchema migrates a version 1 file itself, for readers that call it directly', () => {
  const v1 = planScene([{ object: 'light', floor: 'f', x: 0, y: 0, mountMm: 900 }], 1);
  const result = sceneSchema.safeParse(v1);
  assert.equal(result.success, true);
  assert.equal(result.data.version, 2);
  assert.equal(result.data.views[0].placements[0].mountFrom, 'floor');
});

test('a version 1 file holding version 2 fields is refused', () => {
  const v1 = planScene(
    [{ object: 'light', floor: 'f', x: 0, y: 0, mirror: { z: true } }],
    1
  );
  assert.match(errorsOf(v1), /mirror\.z: Not in scene version 1/);
  const v1b = planScene(
    [{ object: 'light', floor: 'f', x: 0, y: 0, mountFrom: 'ceiling' }],
    1
  );
  assert.match(errorsOf(v1b), /mountFrom: Not in scene version 1/);
});

test('a ceiling placement facing down round-trips', () => {
  const scene = planScene([
    {
      object: 'light',
      floor: 'f',
      x: 1200,
      y: 800,
      mountFrom: 'ceiling',
      mountMm: 0,
      mirror: { z: true }
    }
  ]);
  const text = serializeScene(scene);
  const result = parseScene(text);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
  assert.deepEqual(
    result.scene.views[0].placements,
    scene.views[0].placements
  );
  assert.equal(JSON.parse(text).version, 2);
});

test('mirror.z is accepted beside x and y', () => {
  const scene = planScene([
    { object: 'light', floor: 'f', x: 0, y: 0, mirror: { x: true, y: false, z: true } }
  ]);
  const result = validateScene(scene);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));
});

test('bad mounting and facing values are refused', () => {
  const at = (p) => planScene([{ object: 'light', floor: 'f', x: 0, y: 0, ...p }]);
  assert.match(errorsOf(at({ mountFrom: 'wall' })), /mountFrom/);
  assert.match(errorsOf(at({ mountFrom: 'Ceiling' })), /mountFrom/);
  assert.match(errorsOf(at({ mirror: { z: 'yes' } })), /mirror\.z/);
  assert.match(errorsOf(at({ mirror: { w: true } })), /mirror/);
  assert.match(errorsOf(at({ mountMm: '2700' })), /mountMm/);
  assert.match(errorsOf(at({ facing: 'down' })), /facing/, 'facing is the element\'s; a placement flips with mirror.z');
});

test('a surface mount stands on an object on the same floor', () => {
  const ok = planScene([
    { object: 'desk', floor: 'f', x: 0, y: 0 },
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'surface', mountOn: 'desk' }
  ]);
  const result = validateScene(ok);
  assert.equal(result.ok, true, result.ok ? '' : result.errors.join('\n'));

  const noSupport = planScene([
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'surface' }
  ]);
  assert.match(errorsOf(noSupport), /surface mount needs mountOn/);

  const notSurface = planScene([
    { object: 'desk', floor: 'f', x: 0, y: 0 },
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'floor', mountOn: 'desk' }
  ]);
  assert.match(errorsOf(notSurface), /only for mountFrom "surface"/);

  const otherFloor = planScene([
    { object: 'desk', floor: 'g', x: 0, y: 0 },
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'surface', mountOn: 'desk' }
  ]);
  assert.match(errorsOf(otherFloor), /not placed on floor "f"/);

  const cycle = planScene([
    { object: 'desk', floor: 'f', x: 0, y: 0, mountFrom: 'surface', mountOn: 'lamp' },
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'surface', mountOn: 'desk' }
  ]);
  assert.match(errorsOf(cycle), /stands on itself/);
});

test('redaction stands an item on the floor when its support is removed', () => {
  const scene = planScene([
    { object: 'desk', floor: 'f', x: 0, y: 0, layer: 'redacted' },
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'surface', mountOn: 'desk' }
  ]);
  assert.equal(validateScene(scene).ok, true);
  const out = redactScene(scene);
  assert.equal(validateScene(out).ok, true);
  assert.deepEqual(out.views[0].placements, [
    { object: 'lamp', floor: 'f', x: 0, y: 0, mountFrom: 'floor' }
  ]);
});
