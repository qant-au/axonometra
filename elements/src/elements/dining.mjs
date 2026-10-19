// Dining. Tables are tables only: chairs are placed separately.

// A splayed leg seen from above: a tube `t` cm thick from (x1, y1) under the
// seat to (x2, y2) at the foot, drawn as a filled strip so it reads at 1:50.
const splayedLeg = ([x1, y1, x2, y2], t = 2.5) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [nx, ny] = [(-(y2 - y1) / len) * (t / 2), ((x2 - x1) / len) * (t / 2)];
  const r = (v) => +v.toFixed(2);
  return {
    line: [[r(x1 + nx), r(y1 + ny)], [r(x2 + nx), r(y2 + ny)], [r(x2 - nx), r(y2 - ny)], [r(x1 - nx), r(y1 - ny)]],
    closed: true, fill: 'metal', stroke: 'outline'
  };
};

// The same leg as a solid: a strut `h` cm deep under the seat (top at z1),
// running from the seat out to the top of an upright leg, so the leg meets
// the seat in the 3D view. Its ring runs clockwise.
const legStrut = (l, t, z1, h = 3) => {
  const ring = splayedLeg(l, t).line;
  const area = ring.reduce((a, [x0, y0], i) => {
    const [x1, y1] = ring[(i + 1) % ring.length];
    return a + x0 * y1 - x1 * y0;
  }, 0);
  return { poly: area > 0 ? ring : ring.reverse(), z: z1 - h, h, role: 'metal', outline: true };
};


// A rectangular dining table: timber top on four legs, the legs and apron
// beneath shown dashed.
export function diningTable({ id, name, w, d, h = 75 }) {
  const leg = 6;
  const lh = h - 4;
  const inset = 5;
  return {
    id,
    name,
    group: 'dining',
    size: { w, d, h },
    parts: [
      {
        x: 0, y: 0, z: lh, w, d, h: 4, role: 'wood', r: 2,
        top: [{ rect: [inset, inset, w - 2 * inset, d - 2 * inset], dash: '3 3' }]
      },
      ...[[inset, inset], [w - inset - leg, inset], [inset, d - inset - leg], [w - inset - leg, d - inset - leg]].map(
        ([x, y]) => ({ x, y, z: 0, w: leg, d: leg, h: lh, role: 'wood' })
      )
    ]
  };
}

export default [
  { ...diningTable({ id: 'table', name: 'Table', w: 150, d: 90 }), surface: 75 },
  // Dining chair: backrest at the top, seat in front of it, four legs.
  {
    id: 'chair',
    name: 'Chair',
    group: 'dining',
    size: { w: 50, d: 50, h: 90 },
    parts: [
      { x: 2, y: 5, z: 41, w: 46, d: 45, h: 4, r: 3 },
      { x: 2, y: 0, z: 45, w: 46, d: 5, h: 45, role: 'wood', outline: true, r: 1 },
      { x: 3, y: 0, z: 0, w: 4, d: 5, h: 45, role: 'wood' },
      { x: 43, y: 0, z: 0, w: 4, d: 5, h: 45, role: 'wood' },
      { x: 3, y: 44, z: 0, w: 4, d: 4, h: 41, role: 'wood' },
      { x: 43, y: 44, z: 0, w: 4, d: 4, h: 41, role: 'wood' }
    ]
  },
  { ...diningTable({ id: 'dining-table-4', name: 'Dining Table, 4-Seat', w: 120, d: 80 }), surface: 75 },
  { ...diningTable({ id: 'dining-table-6', name: 'Dining Table, 6-Seat', w: 180, d: 90 }), surface: 75 },
  { ...diningTable({ id: 'dining-table-8', name: 'Dining Table, 8-Seat', w: 240, d: 100 }), surface: 75 },
  // Round table on a pedestal, the foot shown dashed beneath the top.
  {
    id: 'dining-table-round',
    name: 'Round Dining Table',
    group: 'dining',
    size: { w: 110, d: 110, h: 75 },
    surface: 75,
    parts: [
      { cyl: [55, 55, 55], z: 71, h: 4, role: 'wood', top: [{ circle: [55, 55, 30], dash: '3 3' }] },
      { cyl: [55, 55, 7], z: 4, h: 67, role: 'wood' },
      { cyl: [55, 55, 30], z: 0, h: 4, role: 'wood' }
    ]
  },
  // Bar stool: round seat on four splayed legs whose feet show at the corners.
  {
    id: 'bar-stool',
    name: 'Bar Stool',
    group: 'dining',
    size: { w: 40, d: 40, h: 75 },
    parts: [
      { cyl: [20, 20, 17], z: 71, h: 4, role: 'soft' },
      ...[[2, 2], [35, 2], [2, 35], [35, 35]].map(([x, y]) => ({ x, y, z: 0, w: 3, d: 3, h: 71, role: 'metal', outline: true }))
    ],
    // The splayed legs, seen from above between the seat and the feet.
    plan: [[8, 8, 3.5, 3.5], [32, 8, 36.5, 3.5], [8, 32, 3.5, 36.5], [32, 32, 36.5, 36.5]].map((l) => splayedLeg(l))
  },
  {
    id: 'sideboard',
    name: 'Sideboard',
    group: 'dining',
    size: { w: 180, d: 45, h: 80 },
    surface: 80,
    parts: [
      { x: 0, y: 0, z: 0, w: 180, d: 42, h: 80, role: 'wood', r: 1 },
      {
        x: 0, y: 42, z: 0, w: 180, d: 3, h: 80, role: 'soft', outline: true
      }
    ]
  },
  // High chair: splayed legs at the corners, seat and back, and the tray
  // across the front.
  {
    id: 'high-chair',
    name: 'High Chair',
    group: 'dining',
    size: { w: 55, d: 70, h: 105 },
    parts: [
      { x: 12, y: 20, z: 60, w: 31, d: 32, h: 4, r: 3 },
      { x: 12, y: 13, z: 64, w: 31, d: 7, h: 41, role: 'soft', outline: true, r: 2 },
      { x: 9, y: 20, z: 64, w: 3, d: 32, h: 12, role: 'soft' },
      { x: 43, y: 20, z: 64, w: 3, d: 32, h: 12, role: 'soft' },
      { x: 7, y: 53, z: 72, w: 41, d: 13, h: 3, outline: true, r: 3 },
      ...[[0, 0], [52, 0], [0, 67], [52, 67]].map(([x, y]) => ({ x, y, z: 0, w: 3, d: 3, h: 60, role: 'metal', outline: true })),
      ...[[9, 20, 1.5, 1.5], [46, 20, 53.5, 1.5], [9, 52, 1.5, 68.5], [46, 52, 53.5, 68.5]].map((l) => legStrut(l, 3, 60))
    ],
    plan: [[9, 20, 1.5, 1.5], [46, 20, 53.5, 1.5], [9, 52, 1.5, 68.5], [46, 52, 53.5, 68.5]].map((l) => splayedLeg(l, 3))
  },
  // Bench seat: a timber top of two boards on end supports.
  {
    id: 'bench-seat',
    name: 'Bench Seat',
    group: 'dining',
    size: { w: 150, d: 40, h: 45 },
    parts: [
      { x: 0, y: 0, z: 41, w: 150, d: 40, h: 4, role: 'wood', r: 1, top: [{ line: [[0, 20], [150, 20]] }] },
      { x: 8, y: 3, z: 0, w: 5, d: 34, h: 41, role: 'wood' },
      { x: 137, y: 3, z: 0, w: 5, d: 34, h: 41, role: 'wood' }
    ]
  }
];
