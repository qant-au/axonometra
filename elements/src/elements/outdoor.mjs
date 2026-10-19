// Outdoor and small buildings.
import { cloud, leaf, random, spine } from '../foliage.mjs';

const r2 = (n) => Math.round(n * 100) / 100;

/** Points round a centre, clockwise on the plan (y down). `radius(t)` gives the radius at angle t. */
function ring(cx, cy, n, radius, from = 0) {
  return Array.from({ length: n }, (_, i) => {
    const t = from + (2 * Math.PI * i) / n;
    const r = radius(t);
    return [r2(cx + r * Math.cos(t)), r2(cy + r * Math.sin(t))];
  });
}

/** A thin bar from p0 to p1 as a clockwise polygon, for arms and rails at an angle. */
function bar([x0, y0], [x1, y1], hw) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = (-(y1 - y0) / len) * hw;
  const ny = ((x1 - x0) / len) * hw;
  const p = [
    [x0 - nx, y0 - ny],
    [x1 - nx, y1 - ny],
    [x1 + nx, y1 + ny],
    [x0 + nx, y0 + ny]
  ].map(([x, y]) => [r2(x), r2(y)]);
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = p[i];
    const [bx, by] = p[(i + 1) % 4];
    a += ax * by - bx * ay;
  }
  return a > 0 ? p : p.reverse();
}

// Timber slats as lines across a top face, every `pitch` cm down its depth.
const slats = (w, d, pitch, inset = 0) =>
  Array.from({ length: Math.floor((d - 1) / pitch) }, (_, i) => ({
    line: [[inset, (i + 1) * pitch], [w - inset, (i + 1) * pitch]]
  }));

// Tree, seen from above: an irregular leafy canopy, the overlapping clusters
// of leaves inside it, a few limbs leaving the trunk, and the trunk itself.
const tree = {
  id: 'tree',
  name: 'Tree',
  group: 'outdoor',
  size: { w: 400, d: 400, h: 600 },
  parts: [
    { poly: cloud(200, 200, 198, { lobes: 11, seed: 7, jitter: 0.12, depth: 0.12 }), z: 250, h: 350, role: 'plant', outline: true },
    { cyl: [200, 200, 20], z: 0, h: 250, role: 'wood' }
  ],
  plan: [
    ...[[130, 150, 88, 3], [262, 140, 80, 5], [215, 262, 92, 9], [120, 262, 66, 11]].map(([cx, cy, r, seed]) => ({
      line: cloud(cx, cy, r, { lobes: 7, seed, jitter: 0.15, depth: 0.2 }), closed: true
    })),
    ...[[-150, 120], [-60, 105], [30, 125], [110, 110], [190, 95]].map(([deg, len]) => {
      const t = (deg * Math.PI) / 180;
      const bend = t + 0.25;
      return {
        line: [
          [200 + 16 * Math.cos(t), 200 + 16 * Math.sin(t)],
          [200 + len * 0.55 * Math.cos(bend), 200 + len * 0.55 * Math.sin(bend)],
          [200 + len * Math.cos(t), 200 + len * Math.sin(t)]
        ].map(([x, y]) => [r2(x), r2(y)])
      };
    }),
    { circle: [200, 200, 16], fill: 'wood', stroke: 'outline' }
  ]
};

// Palm tree: long feathered fronds arching out from the crown, uneven in
// angle and length the way a real crown grows.
const palm = (() => {
  const c = 200;
  const r1 = (n) => Math.round(n * 10) / 10;
  const fronds = [[-4, 182, 24], [41, 160, -20], [92, 190, 28], [128, 168, -22], [181, 186, 18], [219, 158, -26], [266, 180, 22], [312, 170, -18]];
  // Leaflets: a zigzag either side of the frond's arching spine.
  const feather = ([deg, len, bend]) =>
    spine(c, c, len, deg, bend, 7)
      .slice(1)
      .map(({ x, y, a }, i) => {
        const half = 18 * Math.sin((Math.PI * (i + 1)) / 8) * (i % 2 ? 1 : -1);
        return [r1(x - Math.sin(a) * half), r1(y + Math.cos(a) * half)];
      });
  return {
    id: 'palm-tree',
    name: 'Palm Tree',
    group: 'outdoor',
    size: { w: 400, d: 400, h: 700 },
    parts: [
      { poly: cloud(c, c, 34, { lobes: 7, seed: 4, depth: 0.25 }), z: 600, h: 100, role: 'plant', outline: true },
      { cyl: [c, c, 18], z: 0, h: 600, role: 'wood' }
    ],
    plan: [
      ...fronds.map(([deg, len, bend]) => ({ line: leaf(c, c, len, 40, deg, 6, bend), closed: true, fill: 'plant', stroke: 'outline' })),
      ...fronds.map((f) => ({ line: feather(f) })),
      { circle: [c, c, 14], fill: 'wood', stroke: 'outline' }
    ]
  };
})();

// Shrub: a smaller leafy mound, one inner cluster, the stem at the centre.
const shrub = {
  id: 'shrub',
  name: 'Shrub',
  group: 'outdoor',
  size: { w: 100, d: 100, h: 100 },
  parts: [
    { poly: cloud(50, 50, 49, { lobes: 8, seed: 12, jitter: 0.14, depth: 0.2 }), z: 15, h: 85, role: 'plant', outline: true },
    { cyl: [50, 50, 5], z: 0, h: 15, role: 'wood' }
  ],
  plan: [
    { line: cloud(44, 46, 26, { lobes: 6, seed: 5, depth: 0.25 }), closed: true },
    { circle: [50, 50, 3], fill: 'wood' }
  ]
};

// Hedge, a 1 m section: a leafy strip with straight ends so sections join.
const hedge = (() => {
  const [w, d] = [100, 60];
  const rand = random(21);
  const edge = (y, out) => {
    const pts = [];
    let x = 0;
    while (x < w) {
      const span = Math.min(w - x, 14 + rand() * 12);
      const bump = 5 + rand() * 4;
      for (let s = 0; s < 4; s++) {
        const t = s / 4;
        pts.push([r2(x + t * span), r2(y + out * bump * Math.sin(Math.PI * t) ** 0.6)]);
      }
      x += span;
    }
    pts.push([w, y]);
    return pts;
  };
  return {
    id: 'hedge',
    name: 'Hedge, 1 m',
    group: 'outdoor',
    size: { w, d, h: 150 },
    parts: [{ poly: [...edge(9, -1), ...edge(d - 9, 1).reverse()], z: 0, h: 150, role: 'plant', outline: true }],
    plan: [
      { line: cloud(28, 30, 17, { lobes: 5, seed: 8, depth: 0.25 }), closed: true },
      { line: cloud(72, 28, 19, { lobes: 6, seed: 9, depth: 0.25 }), closed: true }
    ]
  };
})();

// Market umbrella: an octagonal canopy with its ribs, over a pole and base.
const umbrella = {
  id: 'umbrella',
  name: 'Market Umbrella',
  group: 'outdoor',
  size: { w: 270, d: 270, h: 250 },
  parts: [
    {
      poly: ring(135, 135, 8, () => 135), z: 215, h: 35, role: 'soft',
      top: [
        ...ring(135, 135, 8, () => 135).map((p) => ({ line: [[135, 135], p] })),
        { circle: [135, 135, 6], fill: 'body', stroke: 'outline' }
      ]
    },
    { cyl: [135, 135, 25], z: 0, h: 8, role: 'dark' },
    { cyl: [135, 135, 2.5], z: 8, h: 207, role: 'metal' }
  ]
};

// Rotary clothesline: centre pole, four arms to the corners, wire squares.
const clothesline = (() => {
  const c = 150;
  const arms = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => ({
    poly: bar([c + sx * 6, c + sy * 6], [c + sx * 145, c + sy * 145], 1.5),
    z: 190, h: 3, role: 'metal', outline: true
  }));
  return {
    id: 'clothesline',
    name: 'Rotary Clothesline',
    group: 'outdoor',
    size: { w: 300, d: 300, h: 200 },
    parts: [
      { cyl: [c, c, 4], z: 0, h: 185, role: 'metal' },
      { cyl: [c, c, 7], z: 185, h: 15, role: 'metal', outline: true },
      ...arms
    ],
    plan: [145, 110, 75, 40].map((s, i) => ({
      rect: [c - s, c - s, 2 * s, 2 * s],
      ...(i === 0 ? { stroke: 'outline' } : {})
    }))
  };
})();

export default [
  {
    id: 'outdoor-table',
    name: 'Outdoor Table',
    group: 'outdoor',
    size: { w: 180, d: 90, h: 75 },
    parts: [
      { x: 0, y: 0, z: 71, w: 180, d: 90, h: 4, r: 2, role: 'wood', top: slats(180, 90, 15, 1) },
      ...[[6, 6], [168, 6], [6, 78], [168, 78]].map(([x, y]) => ({ x, y, z: 0, w: 6, d: 6, h: 71, role: 'metal' }))
    ]
  },
  {
    id: 'outdoor-chair',
    name: 'Outdoor Chair',
    group: 'outdoor',
    size: { w: 55, d: 60, h: 85 },
    parts: [
      { x: 0, y: 0, z: 0, w: 55, d: 60, h: 40, r: 2, role: 'wood', top: slats(55, 60, 10, 7).slice(1) },
      { x: 7, y: 0, z: 40, w: 41, d: 8, h: 45, r: 2, role: 'wood', outline: true },
      { x: 0, y: 0, z: 40, w: 7, d: 60, h: 25, r: 2, role: 'wood', outline: true },
      { x: 48, y: 0, z: 40, w: 7, d: 60, h: 25, r: 2, role: 'wood', outline: true }
    ]
  },
  {
    id: 'sun-lounger',
    name: 'Sun Lounger',
    group: 'outdoor',
    size: { w: 70, d: 195, h: 35 },
    parts: [
      { x: 0, y: 0, z: 0, w: 70, d: 65, h: 35, r: 3, role: 'wood', top: slats(70, 65, 13, 4) },
      { x: 0, y: 65, z: 0, w: 70, d: 130, h: 30, r: 3, role: 'wood', outline: true, top: slats(70, 130, 13, 4) }
    ]
  },
  {
    id: 'bbq',
    name: 'BBQ, Hooded',
    group: 'outdoor',
    size: { w: 140, d: 60, h: 110 },
    parts: [
      {
        x: 32, y: 0, z: 0, w: 76, d: 60, h: 110, r: 4, role: 'dark',
        top: [
          { line: [[8, 14], [68, 14]], stroke: 'soft' },
          { line: [[8, 26], [68, 26]], stroke: 'soft' },
          { line: [[8, 38], [68, 38]], stroke: 'soft' },
          { rect: [10, 52, 56, 4], r: 2, fill: 'metal', stroke: 'metal' }
        ]
      },
      { x: 0, y: 8, z: 0, w: 32, d: 50, h: 90, role: 'metal', outline: true },
      {
        x: 108, y: 8, z: 0, w: 32, d: 50, h: 90, role: 'metal', outline: true,
        top: [{ circle: [16, 22, 10] }, { circle: [16, 22, 4] }]
      }
    ]
  },
  // Kettle BBQ: a round charcoal kettle on a tripod, seen from above as the
  // domed lid with its handle, vents and side handles.
  {
    id: 'bbq-kettle',
    name: 'BBQ, Kettle',
    group: 'outdoor',
    size: { w: 64, d: 64, h: 100 },
    parts: [
      {
        dome: [32, 32, 29], z: 70, h: 30, role: 'dark', outline: true,
        top: [
          { circle: [29, 29, 21], stroke: 'soft' },
          { rect: [21, 12, 16, 4], r: 2, fill: 'wood', stroke: 'outline' },
          ...[[29, 38], [24, 43], [34, 43]].map(([u, v]) => ({ circle: [u, v, 1.6], fill: 'soft' }))
        ]
      },
      { cyl: [32, 32, 29], z: 45, h: 25, role: 'dark' },
      { cyl: [32, 32, 12], z: 25, h: 3, role: 'metal' },
      ...[[32, 2.5], [5, 48], [59, 48]].map(([cx, cy]) => ({ cyl: [cx, cy, 2], z: 0, h: 45, role: 'metal', outline: true }))
    ],
    plan: [
      { rect: [0, 29, 4, 6], r: 1, fill: 'metal', stroke: 'outline' },
      { rect: [60, 29, 4, 6], r: 1, fill: 'metal', stroke: 'outline' }
    ]
  },
  // Built-in BBQ bench: an outdoor-kitchen run with a hooded four-burner BBQ
  // set into a stone top and a side burner to its right.
  {
    id: 'bbq-built-in',
    name: 'BBQ, Built-In',
    group: 'outdoor',
    size: { w: 240, d: 65, h: 115 },
    parts: [
      {
        x: 0, y: 0, z: 87, w: 240, d: 65, h: 3, role: 'soft',
        top: [
          { circle: [197, 30, 9], stroke: 'outline' },
          { circle: [197, 30, 4], fill: 'dark' },
          { circle: [197, 55, 1.8], fill: 'dark' }
        ]
      },
      {
        x: 2, y: 0, z: 10, w: 236, d: 60, h: 77
      },
      { x: 4, y: 0, z: 0, w: 232, d: 55, h: 10, role: 'soft' },
      {
        x: 70, y: 4, z: 90, w: 86, d: 54, h: 25, r: 3, role: 'metal', outline: true,
        top: [
          { line: [[6, 10], [80, 10]] },
          { rect: [14, 46, 58, 4], r: 2, fill: 'dark', stroke: 'outline' },
          ...[20, 34, 52, 66].map((u) => ({ circle: [u, 41, 1.8], fill: 'dark' }))
        ]
      }
    ]
  },
  // Pellet smoker: a barrel cook chamber with the pellet hopper on its left
  // and a chimney at the back right.
  {
    id: 'smoker',
    name: 'BBQ, Pellet Smoker',
    group: 'outdoor',
    size: { w: 125, d: 60, h: 130 },
    parts: [
      {
        x: 34, y: 6, z: 55, w: 88, d: 48, h: 50, r: 16, role: 'dark', outline: true,
        top: [
          { line: [[4, 30], [84, 30]], stroke: 'soft' },
          { rect: [22, 40, 44, 4], r: 2, fill: 'metal', stroke: 'outline' }
        ]
      },
      {
        x: 0, y: 4, z: 55, w: 34, d: 44, h: 55, r: 2, role: 'dark', outline: true,
        top: [{ rect: [5, 5, 24, 30], r: 2, stroke: 'soft' }]
      },
      { x: 38, y: 54, z: 80, w: 80, d: 6, h: 2, role: 'metal', outline: true },
      { cyl: [110, 13, 5], z: 105, h: 25, role: 'metal', outline: true },
      ...[[44, 14], [108, 14], [44, 40], [108, 40]].map(([x, y]) => ({ x, y, z: 0, w: 5, d: 5, h: 55, role: 'metal' }))
    ]
  },
  {
    id: 'outdoor-sofa',
    name: 'Outdoor Sofa',
    group: 'outdoor',
    size: { w: 200, d: 85, h: 75 },
    parts: [
      { x: 0, y: 0, z: 0, w: 200, d: 85, h: 38, r: 3, role: 'wood' },
      { x: 12, y: 0, z: 38, w: 176, d: 18, h: 37, role: 'soft', r: 4 },
      { x: 0, y: 0, z: 38, w: 12, d: 85, h: 22, role: 'wood', r: 2, outline: true },
      { x: 188, y: 0, z: 38, w: 12, d: 85, h: 22, role: 'wood', r: 2, outline: true },
      { x: 13, y: 19, z: 38, w: 86.5, d: 63, h: 12, role: 'soft', r: 4 },
      { x: 100.5, y: 19, z: 38, w: 86.5, d: 63, h: 12, role: 'soft', r: 4 }
    ]
  },
  umbrella,
  {
    id: 'planter',
    name: 'Planter Box',
    group: 'outdoor',
    size: { w: 100, d: 40, h: 50 },
    parts: [
      { x: 0, y: 0, z: 0, w: 100, d: 40, h: 40, role: 'wood', top: [{ rect: [4, 4, 92, 32], fill: 'ground' }] },
      ...[[20, 20, 14, 31], [50, 19, 18, 32], [80, 21, 15, 33]].map(([cx, cy, r, seed]) => ({
        poly: cloud(cx, cy, r, { lobes: 6, seed, depth: 0.22 }), z: 40, h: 10, role: 'plant', outline: true
      }))
    ]
  },
  tree,
  palm,
  shrub,
  hedge,
  {
    id: 'water-tank',
    name: 'Water Tank, 5000 L',
    group: 'outdoor',
    size: { w: 180, d: 180, h: 220 },
    parts: [
      {
        cyl: [90, 90, 90], z: 0, h: 220,
        top: [
          { circle: [90, 90, 80] },
          { circle: [90, 90, 22], fill: 'soft' },
          { circle: [140, 90, 8], fill: 'dark' }
        ]
      }
    ]
  },
  {
    id: 'hot-water-system',
    name: 'Hot Water System',
    group: 'outdoor',
    size: { w: 60, d: 60, h: 170 },
    parts: [
      {
        cyl: [30, 30, 30], z: 0, h: 170, role: 'metal',
        top: [
          { circle: [30, 30, 22] },
          { circle: [30, 30, 5], fill: 'soft' },
          { rect: [26, 52, 8, 7], fill: 'dark' }
        ]
      }
    ]
  },
  {
    id: 'heat-pump',
    name: 'Heat Pump Water Heater',
    group: 'outdoor',
    size: { w: 60, d: 60, h: 190 },
    parts: [
      { cyl: [30, 30, 30], z: 0, h: 150, role: 'metal' },
      {
        cyl: [30, 30, 29], z: 150, h: 40, role: 'dark', outline: true,
        top: [
          { circle: [29, 29, 20], stroke: 'soft' },
          { circle: [29, 29, 13], stroke: 'soft' },
          { line: [[9, 29], [49, 29]], stroke: 'soft' },
          { line: [[29, 9], [29, 49]], stroke: 'soft' }
        ]
      }
    ]
  },
  {
    id: 'solar-inverter',
    name: 'Solar Inverter',
    group: 'outdoor',
    tags: ['power'],
    size: { w: 45, d: 20, h: 60 },
    mount: 120,
    mountFrom: 'floor',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 45, d: 20, h: 60, r: 2,
        top: [
          { line: [[4, 5], [41, 5]], view: 'plan' },
          { line: [[4, 9], [41, 9]], view: 'plan' },
          { rect: [16, 15, 13, 2.5], accent: 'power', view: 'plan' }
        ]
      }
    ]
  },
  {
    id: 'wheelie-bin',
    name: 'Wheelie Bin',
    group: 'outdoor',
    size: { w: 60, d: 75, h: 105 },
    parts: [
      { x: 0, y: 4, z: 95, w: 60, d: 71, h: 10, r: 3, role: 'dark', top: [{ line: [[4, 62], [56, 62]], stroke: 'soft' }] },
      { x: 3, y: 6, z: 25, w: 54, d: 66, h: 70, r: 3, role: 'dark' },
      { x: 3, y: 20, z: 0, w: 54, d: 52, h: 25, r: 3, role: 'dark' },
      { x: 5, y: 0, z: 85, w: 50, d: 4, h: 15, r: 2, role: 'metal', outline: true },
      { x: 3, y: 4, z: 0, w: 6, d: 16, h: 20, role: 'metal' },
      { x: 51, y: 4, z: 0, w: 6, d: 16, h: 20, role: 'metal' }
    ]
  },
  clothesline,
  {
    id: 'workbench',
    name: 'Workbench',
    group: 'outdoor',
    size: { w: 180, d: 70, h: 90 },
    parts: [
      { x: 0, y: 0, z: 84, w: 180, d: 62, h: 6, role: 'wood', top: slats(180, 62, 15.5) },
      { x: 4, y: 3, z: 0, w: 172, d: 56, h: 84, role: 'metal' },
      { x: 14, y: 62, z: 72, w: 26, d: 8, h: 16, role: 'metal', outline: true, top: [{ line: [[13, 0], [13, 8]] }] }
    ]
  },
  {
    id: 'garden-shed',
    name: 'Garden Shed, 2.4 × 1.8',
    group: 'outdoor',
    size: { w: 240, d: 180, h: 210 },
    parts: [
      {
        x: 0, y: 0, z: 180, w: 240, d: 172, h: 30, role: 'metal',
        top: [
          { line: [[0, 86], [240, 86]], stroke: 'outline', weight: 'outline' },
          { rect: [4, 4, 232, 164], dash: '6 5' }
        ]
      },
      { x: 4, y: 4, z: 0, w: 232, d: 166, h: 180 },
      { x: 80, y: 172, z: 0, w: 80, d: 8, h: 175, role: 'wood', outline: true, top: [{ line: [[40, 0], [40, 8]] }] }
    ]
  },
  {
    id: 'pool',
    name: 'Swimming Pool',
    group: 'outdoor',
    size: { w: 700, d: 350, h: 150 },
    parts: [
      { x: 0, y: 0, z: 0, w: 700, d: 30, h: 150, role: 'ground' },
      { x: 0, y: 320, z: 0, w: 700, d: 30, h: 150, role: 'ground', outline: true },
      { x: 0, y: 30, z: 0, w: 30, d: 290, h: 150, role: 'ground', outline: true },
      { x: 670, y: 30, z: 0, w: 30, d: 290, h: 150, role: 'ground', outline: true },
      {
        x: 30, y: 30, z: 0, w: 640, d: 290, h: 140, role: 'glass',
        top: [
          { line: [[35, 0], [35, 290]] },
          { line: [[70, 0], [70, 290]] },
          { line: [[260, 120], [290, 110], [320, 120], [350, 110], [380, 120]] },
          { line: [[300, 170], [330, 160], [360, 170], [390, 160], [420, 170]] }
        ]
      }
    ]
  }
];
