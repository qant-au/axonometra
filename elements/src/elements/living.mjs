// Living room.
import { cloud, leaf, midrib } from '../foliage.mjs';

// A sofa or armchair with its back against the wall at the top: base, back,
// two arms and one seat cushion per seat.
function sofa({ id, name, w, d = 90, h = 85, seats, arm = 17, back = 20 }) {
  const gap = 1.5;
  const cw = (w - 2 * arm - 2 - gap * (seats - 1)) / seats;
  return {
    id,
    name,
    group: 'living',
    size: { w, d, h },
    parts: [
      { x: 0, y: 0, z: 0, w, d, h: 38, r: 6 },
      { x: arm, y: 0, z: 38, w: w - 2 * arm, d: back, h: h - 38, role: 'soft', r: 4 },
      { x: 0, y: 0, z: 38, w: arm, d, h: 24, role: 'soft', r: 4 },
      { x: w - arm, y: 0, z: 38, w: arm, d, h: 24, role: 'soft', r: 4 },
      ...Array.from({ length: seats }, (_, i) => ({
        x: arm + 1 + i * (cw + gap), y: back + 1, z: 38, w: cw, d: d - back - 4, h: 10, r: 3
      }))
    ]
  };
}

// A low table: timber top on four legs.
function lowTable({ id, name, w, d, h }) {
  const leg = 4;
  const lh = h - 4;
  return {
    id,
    name,
    group: 'living',
    size: { w, d, h },
    parts: [
      {
        x: 0, y: 0, z: lh, w, d, h: 4, role: 'wood', r: 2,
        top: [{ rect: [5, 5, w - 10, d - 10], r: 1, dash: '2 2' }]
      },
      ...[[4, 4], [w - 4 - leg, 4], [4, d - 4 - leg], [w - 4 - leg, d - 4 - leg]].map(([x, y]) => ({
        x, y, z: 0, w: leg, d: leg, h: lh, role: 'wood'
      }))
    ]
  };
}

// A cabinet with its back to the wall: carcass plus a door or drawer front
// along the front edge, so the side you open reads on the plan.
function cabinet({ id, name, w, d, h, role = 'body', frontRole = 'soft', top = [] }) {
  return {
    id,
    name,
    group: 'living',
    size: { w, d, h },
    parts: [
      { x: 0, y: 0, z: 0, w, d: d - 3, h, role, r: 1, top },
      { x: 0, y: d - 3, z: 0, w, d: 3, h, role: frontRole, outline: true }
    ]
  };
}

// Corner sofa, L-shaped along the back and right-hand walls.
const cornerSofa = {
  id: 'sofa-corner',
  name: 'Corner Sofa',
  group: 'living',
  size: { w: 250, d: 250, h: 85 },
  parts: [
    { poly: [[0, 0], [250, 0], [250, 250], [160, 250], [160, 90], [0, 90]], z: 0, h: 38 },
    { x: 17, y: 0, z: 38, w: 233, d: 20, h: 47, role: 'soft', r: 4 },
    { x: 230, y: 20, z: 38, w: 20, d: 213, h: 47, role: 'soft', r: 4 },
    { x: 0, y: 0, z: 38, w: 17, d: 90, h: 24, role: 'soft', r: 4 },
    { x: 160, y: 233, z: 38, w: 90, d: 17, h: 24, role: 'soft', r: 4 },
    ...[0, 1, 2].map((i) => ({ x: 18 + i * 71, y: 21, z: 38, w: 69.5, d: 66, h: 10, r: 3 })),
    ...[0, 1].map((i) => ({ x: 162, y: 88.5 + i * 72.5, z: 38, w: 66, d: 71, h: 10, r: 3 }))
  ]
};

// The indoor plant's leaves: [angle, length, width, bend], uneven on purpose.
const PLANT_LEAVES = [[-100, 22, 11, 18], [-40, 20, 10, -14], [8, 23, 12, 20], [62, 21, 11, -16], [115, 23, 12, 22], [165, 20, 10, -12], [212, 22, 11, 16], [-150, 17, 9, -20]];

export default [
  sofa({ id: 'sofa-2', name: 'Sofa, 2-Seat', w: 160, seats: 2 }),
  {
    id: 'sofa-3',
    name: 'Sofa, 3-Seat',
    group: 'living',
    size: { w: 210, d: 90, h: 85 },
    parts: [
      { x: 0, y: 0, z: 0, w: 210, d: 90, h: 38, r: 6 },
      { x: 17, y: 0, z: 38, w: 176, d: 20, h: 47, role: 'soft', r: 4 },
      { x: 0, y: 0, z: 38, w: 17, d: 90, h: 24, role: 'soft', r: 4 },
      { x: 193, y: 0, z: 38, w: 17, d: 90, h: 24, role: 'soft', r: 4 },
      { x: 18, y: 21, z: 38, w: 57, d: 66, h: 10, r: 3 },
      { x: 76.5, y: 21, z: 38, w: 57, d: 66, h: 10, r: 3 },
      { x: 135, y: 21, z: 38, w: 57, d: 66, h: 10, r: 3 }
    ]
  },
  cornerSofa,
  sofa({ id: 'armchair', name: 'Armchair', w: 85, d: 85, seats: 1, arm: 15, back: 18 }),
  // A recliner: thick padded back and arms, and the fold of the footrest
  // across the front of the seat.
  {
    id: 'recliner',
    name: 'Recliner',
    group: 'living',
    size: { w: 90, d: 95, h: 100 },
    parts: [
      { x: 0, y: 0, z: 0, w: 90, d: 95, h: 40, r: 8 },
      { x: 16, y: 0, z: 40, w: 58, d: 26, h: 60, role: 'soft', r: 8 },
      { x: 0, y: 0, z: 40, w: 16, d: 92, h: 25, role: 'soft', r: 7 },
      { x: 74, y: 0, z: 40, w: 16, d: 92, h: 25, role: 'soft', r: 7 },
      {
        x: 17, y: 27, z: 40, w: 56, d: 66, h: 10, r: 4,
        top: [{ line: [[3, 44], [53, 44]] }]
      }
    ]
  },
  {
    id: 'ottoman',
    name: 'Ottoman',
    group: 'living',
    size: { w: 60, d: 60, h: 45 },
    parts: [
      { x: 0, y: 0, z: 0, w: 60, d: 60, h: 37, r: 6 },
      {
        x: 3, y: 3, z: 37, w: 54, d: 54, h: 8, role: 'soft', r: 5,
        top: [{ circle: [27, 27, 1.5], fill: 'detail' }]
      }
    ]
  },
  { ...lowTable({ id: 'coffee-table', name: 'Coffee Table', w: 110, d: 60, h: 45 }), surface: 45 },
  {
    id: 'coffee-table-round',
    name: 'Round Coffee Table',
    group: 'living',
    size: { w: 80, d: 80, h: 45 },
    surface: 45,
    parts: [
      { cyl: [40, 40, 40], z: 41, h: 4, role: 'wood', top: [{ circle: [40, 40, 35], dash: '2 2' }] },
      { cyl: [40, 40, 5], z: 3, h: 38, role: 'wood' },
      { cyl: [40, 40, 22], z: 0, h: 3, role: 'wood' }
    ]
  },
  { ...lowTable({ id: 'side-table', name: 'Side Table', w: 50, d: 50, h: 55 }), surface: 55 },
  {
    ...cabinet({
      id: 'tv-unit',
      name: 'TV Unit',
      w: 180,
      d: 45,
      h: 50,
      role: 'wood'
    }),
    surface: 50
  },
  // Wall-mounted TV: a slim bracket against the wall and the screen in front.
  {
    id: 'tv-wall',
    name: 'Wall-Mounted TV, 65"',
    group: 'living',
    tags: ['av'],
    size: { w: 145, d: 10, h: 85 },
    mount: 110,
    mountFrom: 'floor',
    parts: [
      { x: 0, y: 4, z: 0, w: 145, d: 6, h: 85, role: 'dark', r: 1 },
      { x: 52, y: 0, z: 22, w: 40, d: 4, h: 40, role: 'metal' }
    ],
    plan: [{ rect: [62, 8.3, 20, 1.2], accent: 'av' }]
  },
  // Bookcase: the carcass with the shelves showing as a dashed line.
  cabinet({
    id: 'bookcase',
    name: 'Bookcase',
    w: 90,
    d: 35,
    h: 200,
    role: 'wood',
    frontRole: 'wood',
    top: [
      { rect: [3, 2, 84, 28], dash: '3 2', view: 'plan' },
      ...[12, 20, 30, 44, 52, 66, 74].map((u) => ({ line: [[u, 6], [u, 28]], view: 'plan' }))
    ]
  }),
  // Display cabinet: glass front and sides.
  {
    id: 'display-cabinet',
    name: 'Display Cabinet',
    group: 'living',
    size: { w: 100, d: 40, h: 190 },
    parts: [
      { x: 0, y: 0, z: 0, w: 100, d: 36, h: 190, role: 'wood', r: 1, top: [{ rect: [4, 4, 92, 28], dash: '3 2', view: 'plan' }] },
      {
        x: 0, y: 36, z: 0, w: 100, d: 4, h: 190, role: 'glass', outline: true
      }
    ]
  },
  // Floor lamp: weighted base, stem and a drum shade seen from above.
  {
    id: 'floor-lamp',
    name: 'Floor Lamp',
    group: 'living',
    size: { w: 40, d: 40, h: 170 },
    parts: [
      {
        cyl: [20, 20, 20], z: 140, h: 30, role: 'soft',
        top: [{ circle: [20, 20, 13] }, { circle: [20, 20, 4], fill: 'body' }]
      },
      { cyl: [20, 20, 1.5], z: 3, h: 137, role: 'metal' },
      { cyl: [20, 20, 14], z: 0, h: 3, role: 'metal' }
    ]
  },
  // Table lamp: stands on whatever carrying item it is placed over (a
  // bedside table, a side table), on the floor when there is none.
  {
    id: 'table-lamp',
    name: 'Table Lamp',
    group: 'living',
    size: { w: 30, d: 30, h: 50 },
    mountFrom: 'surface',
    parts: [
      {
        cyl: [15, 15, 15], z: 30, h: 20, role: 'soft',
        top: [{ circle: [15, 15, 10] }, { circle: [15, 15, 3], fill: 'body' }]
      },
      { cyl: [15, 15, 1], z: 2, h: 28, role: 'metal' },
      { cyl: [15, 15, 7], z: 0, h: 2, role: 'metal' }
    ]
  },
  // Pendant light: a shade on a 55 cm drop, hung flush from the ceiling by
  // its canopy. Authored as installed, so it faces up like the floor lamp.
  {
    id: 'pendant-light',
    name: 'Pendant Light',
    group: 'living',
    size: { w: 40, d: 40, h: 80 },
    mount: 0,
    mountFrom: 'ceiling',
    parts: [
      { dome: [20, 20, 20], z: 0, h: 23, role: 'soft' },
      { cyl: [20, 20, 0.5], z: 23, h: 55, role: 'metal' },
      { cyl: [20, 20, 6], z: 78, h: 2, role: 'metal' }
    ]
  },
  // Recessed downlight: the can in the ceiling void, the 1 cm trim below.
  // Authored facing up (trim on top), installed facing down.
  {
    id: 'downlight',
    name: 'Downlight, Recessed',
    group: 'living',
    size: { w: 11, d: 11, h: 10 },
    mount: -9,
    mountFrom: 'ceiling',
    facing: 'down',
    symbol: {
      frame: 'circle',
      glyph: [
        { circle: [20, 20, 9], fill: 'glass', stroke: 'outline' },
        { line: [[13.6, 13.6], [26.4, 26.4]], stroke: 'outline' },
        { line: [[26.4, 13.6], [13.6, 26.4]], stroke: 'outline' }
      ]
    },
    parts: [
      { cyl: [5.5, 5.5, 4.5], z: 0, h: 9, role: 'metal' },
      { cyl: [5.5, 5.5, 5.5], z: 9, h: 1, role: 'glass' }
    ]
  },
  {
    id: 'rug-rect',
    name: 'Rug',
    group: 'living',
    size: { w: 200, d: 140, h: 1 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 200, d: 140, h: 1, role: 'ground',
        top: [{ rect: [10, 10, 180, 120] }, { rect: [18, 18, 164, 104], dash: '3 3' }]
      }
    ]
  },
  {
    id: 'rug-round',
    name: 'Round Rug',
    group: 'living',
    size: { w: 160, d: 160, h: 1 },
    parts: [
      {
        cyl: [80, 80, 80], z: 0, h: 1, role: 'ground',
        top: [{ circle: [80, 80, 70] }, { circle: [80, 80, 62], dash: '3 3' }]
      }
    ]
  },
  // Upright piano: the case against the wall, the keyboard projecting to the
  // front between two cheeks.
  {
    id: 'piano-upright',
    name: 'Upright Piano',
    group: 'living',
    size: { w: 150, d: 60, h: 125 },
    parts: [
      { x: 0, y: 0, z: 0, w: 150, d: 38, h: 125, role: 'wood', r: 1 },
      { x: 0, y: 38, z: 0, w: 8, d: 22, h: 80, role: 'wood', outline: true },
      { x: 142, y: 38, z: 0, w: 8, d: 22, h: 80, role: 'wood', outline: true },
      {
        x: 8, y: 38, z: 65, w: 134, d: 20, h: 10, role: 'body', outline: true,
        top: [
          { rect: [0, 0, 134, 6], fill: 'soft' },
          ...[17, 34, 50, 67, 84, 100, 117].map((u) => ({ line: [[u, 6], [u, 20]] }))
        ]
      }
    ]
  },
  // Indoor plant: seen from above, broad pointed leaves fanning out over the pot
  // at uneven angles and lengths, each with its midrib.
  {
    id: 'plant-pot',
    name: 'Indoor Plant',
    group: 'living',
    size: { w: 50, d: 50, h: 120 },
    parts: [
      { cyl: [25, 25, 16], z: 0, h: 40, role: 'body' },
      { poly: cloud(25, 25, 12, { lobes: 5, seed: 3, depth: 0.2 }), z: 40, h: 80, role: 'plant', outline: true }
    ],
    plan: [
      ...PLANT_LEAVES.map(([deg, len, wid, bend]) => ({ line: leaf(25, 25, len, wid, deg, 5, bend), closed: true, fill: 'plant', stroke: 'outline' })),
      ...PLANT_LEAVES.map(([deg, len, , bend]) => ({ line: midrib(25, 25, len, deg, bend) }))
    ]
  }
];
