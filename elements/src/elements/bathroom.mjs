// Bathroom and laundry.
import { tallCupboard } from './kitchen.mjs';

// Points on an ellipse (clockwise on the plan, y down), for curved polygons.
const arc = (cx, cy, rx, ry, a0, a1, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [+(cx + rx * Math.cos(t)).toFixed(2), +(cy + ry * Math.sin(t)).toFixed(2)];
  });

// A toilet pan in plan: a neck `neckW` wide running forward from y0, flaring
// into an elongated bowl centred at (cx, cy). Clockwise, y down.
const toiletPan = (cx, y0, cy, ry, rx = cx - 1, neckW = 24) => [
  [cx - neckW / 2, y0], [cx + neckW / 2, y0], [cx + neckW / 2 + 1, cy - ry * 0.6],
  ...arc(cx, cy, rx, ry, -30, 210, 20),
  [cx - neckW / 2 - 1, cy - ry * 0.6]
];
// Seat ring, hinge line and water, in the pan's bounding-box coordinates:
// (u, v) is the centre of the opening.
const toiletSeat = (u, v) => [
  { ellipse: [u, v, 14.5, 19], fill: 'body' },
  { ellipse: [u, v + 1, 10, 14], fill: 'glass' },
  { line: [[u - 9, v - 22], [u + 9, v - 22]], stroke: 'outline' }
];

// A basin seen from above: rim, water-coloured bowl, drain, and a tap behind.
const basin = (cx, cy, rx, ry) => [
  { ellipse: [cx, cy, rx, ry], fill: 'body', stroke: 'outline' },
  { ellipse: [cx, cy + 1, rx - 3.5, ry - 3.5], fill: 'glass' },
  { circle: [cx, cy + 1, 1.8], fill: 'body' }
];
const tap = (x, y, reach) => [
  { circle: [x, y, 1.8], fill: 'metal', stroke: 'outline' },
  { line: [[x, y + 1.8], [x, y + reach]], stroke: 'outline' }
];

// A vanity: cabinet with a stone top and one or more basins set into it.
function vanity({ id, name, w, d, basins }) {
  const pitch = w / basins;
  return {
    id,
    name,
    group: 'bathroom',
    size: { w, d, h: 85 },
    parts: [
      {
        x: 0, y: 0, z: 82, w, d, h: 3, role: 'soft',
        top: Array.from({ length: basins }, (_, i) => [
          ...basin(pitch * (i + 0.5), d / 2 + 3, Math.min(22, pitch / 2 - 8), d / 2 - 9),
          ...tap(pitch * (i + 0.5), 4, 5)
        ]).flat()
      },
      {
        x: 0, y: 0, z: 15, w, d: d - 2, h: 67
      },
      { x: 2, y: 2, z: 0, w: w - 4, d: d - 8, h: 15, role: 'soft' }
    ]
  };
}

// A shower: low tray, glass screen along the front (and the open side, if any),
// centre drain with the cross that marks a shower on a plan, rose on the back wall.
function shower({ id, name, w, d, walkIn = false }) {
  const g = 1.5; // glass thickness
  const e = 3; // screens stand just inside the tray's edge
  const screens = walkIn
    ? [{ x: e, y: d - g - e, z: 3, w: w - 50, d: g, h: 197, role: 'glass', outline: true }]
    : [
        { x: e, y: d - g - e, z: 3, w: w - g - 2 * e, d: g, h: 197, role: 'glass', outline: true },
        { x: w - g - e, y: e, z: 3, w: g, d: d - 2 * e, h: 197, role: 'glass', outline: true }
      ];
  const inner = walkIn ? w : w - g - e;
  const dy = d - g - e;
  const drain = [{ circle: [inner / 2, dy / 2, 3], fill: 'metal', stroke: 'outline' }];
  return {
    id,
    name,
    group: 'bathroom',
    size: { w, d, h: 200 },
    parts: [
      {
        x: 0, y: 0, z: 0, w, d, h: 3, role: 'soft',
        top: [
          { line: [[0, 0], [inner, dy]], view: 'plan' },
          { line: [[inner, 0], [0, dy]], view: 'plan' },
          ...drain,
          { rect: [inner / 2 - 5, 0, 10, 3], fill: 'metal', stroke: 'outline' },
          { circle: [inner / 2, 6, 4], fill: 'metal', stroke: 'outline' }
        ]
      },
      ...screens
    ]
  };
}

// An under-bench laundry machine: white box, drum shown dashed, a door edge at
// the front. `kind` sets the one mark that tells them apart.
function machine({ id, name, kind }) {
  const dryer = kind === 'dryer';
  return {
    id,
    name,
    group: 'bathroom',
    size: { w: 60, d: 60, h: 85 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 60, d: 56, h: 85, r: 1,
        top: [
          { circle: [30, 30, 20], dash: '3 2', view: 'plan' },
          dryer
            ? { line: [[14, 8], [46, 8]], view: 'plan' }
            : { rect: [4, 44, 14, 9], r: 1, view: 'plan' },
          dryer ? { line: [[14, 12], [46, 12]], view: 'plan' } : { circle: [44, 49, 3], view: 'plan' }
        ]
      },
      {
        x: 0, y: 56, z: 0, w: 60, d: 4, h: 85, outline: true
      }
    ]
  };
}

export default [
  {
    // Close-coupled toilet: the cistern sits across the back on the pan's neck,
    // and the pan narrows under it before flaring into an elongated bowl.
    id: 'toilet',
    name: 'Toilet',
    group: 'bathroom',
    size: { w: 40, d: 70, h: 80 },
    parts: [
      {
        poly: toiletPan(20, 12, 46, 24), z: 0, h: 40, outline: true,
        top: toiletSeat(19, 34)
      },
      { x: 0, y: 0, z: 40, w: 40, d: 18, h: 40, r: 3, outline: true, top: [{ circle: [16, 9, 2.5] }, { circle: [24, 9, 2.5] }] }
    ]
  },
  {
    id: 'toilet-wall-hung',
    name: 'Toilet, Wall-Hung',
    group: 'bathroom',
    size: { w: 38, d: 55, h: 40 },
    // Cistern in the wall; the pan hangs off the wall, seat 40 up.
    parts: [
      {
        poly: toiletPan(19, 0, 32, 22.5), z: 12, h: 28, outline: true,
        top: toiletSeat(18.5, 32)
      }
    ]
  },
  {
    id: 'urinal',
    name: 'Urinal',
    group: 'bathroom',
    size: { w: 40, d: 35, h: 60 },
    mount: 50,
    mountFrom: 'floor',
    parts: [
      {
        poly: [[0.5, 0.5], [39.5, 0.5], ...arc(20, 5, 19.5, 29.5, 0, 180)], z: 0, h: 60,
        top: [
          { line: [[5, 5], [35, 5], ...arc(20, 5, 15, 24, 0, 180, 10)], closed: true, fill: 'glass' },
          { circle: [20, 18, 2], fill: 'body' }
        ]
      }
    ]
  },
  vanity({ id: 'basin-vanity', name: 'Vanity Basin', w: 75, d: 45, basins: 1 }),
  vanity({ id: 'basin-vanity-double', name: 'Double Vanity', w: 150, d: 50, basins: 2 }),
  {
    id: 'basin-wall',
    name: 'Wall Basin',
    group: 'bathroom',
    size: { w: 50, d: 40, h: 20 },
    mount: 80,
    mountFrom: 'floor',
    parts: [
      {
        poly: [[0.5, 0.5], [49.5, 0.5], ...arc(25, 12, 24.5, 27.5, 0, 180)], z: 0, h: 20,
        top: [
          { line: [[4, 8], [46, 8], ...arc(25, 12, 21, 24, 0, 180, 10)], closed: true, fill: 'glass' },
          { circle: [25, 22, 1.8], fill: 'body' },
          ...tap(25, 4, 6)
        ]
      }
    ]
  },
  {
    id: 'basin-pedestal',
    name: 'Pedestal Basin',
    group: 'bathroom',
    size: { w: 55, d: 45, h: 85 },
    parts: [
      {
        poly: [[0.5, 0.5], [54.5, 0.5], ...arc(27.5, 15, 27, 29.5, 0, 180)], z: 68, h: 17,
        top: [
          { line: [[4, 9], [51, 9], ...arc(27.5, 15, 23.5, 25, 0, 180, 10)], closed: true, fill: 'glass' },
          { circle: [27.5, 24, 1.8], fill: 'body' },
          ...tap(27.5, 4, 6)
        ]
      },
      { cyl: [27.5, 15, 10, 9], z: 0, h: 68 }
    ]
  },
  {
    id: 'bath',
    name: 'Bath',
    group: 'bathroom',
    size: { w: 170, d: 75, h: 55 },
    // Built in along the back wall; taps and waste at the left end.
    parts: [
      {
        x: 0, y: 0, z: 0, w: 170, d: 75, h: 55,
        top: [
          { rect: [8, 8, 154, 59], r: 22, fill: 'glass', stroke: 'outline' },
          { circle: [20, 37.5, 2.5], fill: 'body' },
          ...[[4, 30], [4, 45]].map(([x, y]) => ({ circle: [x, y, 1.8], fill: 'metal', stroke: 'outline' })),
          { line: [[4, 37.5], [12, 37.5]], stroke: 'outline' }
        ]
      }
    ]
  },
  {
    id: 'bath-freestanding',
    name: 'Freestanding Bath',
    group: 'bathroom',
    size: { w: 170, d: 80, h: 60 },
    parts: [
      {
        cyl: [85, 40, 85, 40], z: 0, h: 60,
        top: [
          { ellipse: [85, 40, 78, 33], fill: 'glass', stroke: 'outline' },
          { circle: [85, 40, 2.5], fill: 'body' }
        ]
      }
    ]
  },
  {
    id: 'bath-corner',
    name: 'Corner Bath',
    group: 'bathroom',
    size: { w: 140, d: 140, h: 55 },
    // Walls at the top and the left; a curved front across the corner.
    parts: [
      {
        poly: [[0.75, 0.75], [139.25, 0.75], [139.25, 50], ...arc(0, 0, 148.66, 148.66, 19.65, 70.35, 10).slice(1, -1), [50, 139.25], [0.75, 139.25]], z: 0, h: 55,
        top: [
          { line: arc(8, 8, 118, 118, 0, 90, 16).concat([[8, 8]]), closed: true, fill: 'glass', stroke: 'outline' },
          { circle: [42, 42, 2.5], fill: 'body' },
          { circle: [18, 18, 2], fill: 'metal', stroke: 'outline' }
        ]
      }
    ]
  },
  shower({ id: 'shower-900', name: 'Shower, 900 Square', w: 90, d: 90 }),
  shower({ id: 'shower-rect', name: 'Shower, 1200 × 900', w: 120, d: 90 }),
  shower({ id: 'shower-walk-in', name: 'Walk-In Shower', w: 140, d: 90, walkIn: true }),
  {
    id: 'towel-rail',
    name: 'Heated Towel Rail',
    group: 'bathroom',
    size: { w: 60, d: 10, h: 90 },
    mount: 60,
    mountFrom: 'floor',
    // Two uprights on wall brackets, rails between them.
    parts: [
      { cyl: [3, 6, 2.5], z: 0, h: 90, role: 'metal' },
      { cyl: [57, 6, 2.5], z: 0, h: 90, role: 'metal', outline: true },
      ...[8, 30, 52, 74, 86].map((z) => ({ x: 5.5, y: 5, z, w: 49, d: 2, h: 2, role: 'metal', outline: z === 86 })),
      { x: 2, y: 0, z: 10, w: 2, d: 3.5, h: 3, role: 'metal' },
      { x: 56, y: 0, z: 10, w: 2, d: 3.5, h: 3, role: 'metal' }
    ]
  },
  machine({ id: 'washing-machine', name: 'Washing Machine', kind: 'washer' }),
  machine({ id: 'dryer', name: 'Clothes Dryer', kind: 'dryer' }),
  {
    id: 'laundry-tub',
    name: 'Laundry Tub',
    group: 'bathroom',
    size: { w: 60, d: 50, h: 90 },
    parts: [
      {
        x: 0, y: 0, z: 72, w: 60, d: 50, h: 18, role: 'metal', r: 1,
        top: [
          { rect: [6, 12, 48, 34], r: 4, fill: 'glass', stroke: 'outline' },
          { circle: [30, 29, 2.5], fill: 'body' },
          ...tap(30, 5, 12)
        ]
      },
      { x: 0, y: 0, z: 0, w: 60, d: 48, h: 72 }
    ]
  },
  tallCupboard({
    id: 'linen-cupboard', name: 'Linen Cupboard', group: 'bathroom', w: 60, d: 45, h: 200
  })
];
