// Bedroom.

// Swap x and y in a part and its top decals: turns a head-at-the-top bed into
// one with its head at the left.
function sideways(p) {
  const swap = ([u, v]) => [v, u];
  return {
    ...p,
    x: p.y, y: p.x, w: p.d, d: p.w,
    ...(p.top ? { top: p.top.map((dc) => ({ ...dc, line: dc.line.map(swap) })) } : {})
  };
}

// A bed with its head against the wall at the top: headboard, base, mattress,
// pillows, and a duvet over the lower part with its folded edge showing.
// `head: 'left'` lays it sideways (w and d are then the plan footprint).
export function bed({ id, name, w, d, head = 'top' }) {
  if (head === 'left') {
    const upright = bed({ id, name, w: d, d: w });
    return { ...upright, size: { w, d, h: 100 }, parts: upright.parts.map(sideways) };
  }
  const pillows = w >= 120 ? 2 : 1;
  const gap = 6;
  const pw = (w - 12 - gap * (pillows - 1)) / pillows;
  return {
    id,
    name,
    group: 'bedroom',
    size: { w, d, h: 100 },
    parts: [
      { x: 0, y: 0, z: 0, w, d: 8, h: 100, role: 'soft' },
      { x: 0, y: 8, z: 0, w, d: d - 8, h: 30, role: 'soft', outline: true, r: 2 },
      { x: 3, y: 10, z: 30, w: w - 6, d: d - 12, h: 22, r: 3, outline: true },
      ...Array.from({ length: pillows }, (_, i) => ({
        x: 6 + i * (pw + gap), y: 14, z: 52, w: pw, d: 28, h: 10, role: 'soft', r: 7
      })),
      {
        x: 3, y: Math.round(d * 0.3), z: 52, w: w - 6, d: d - 2 - Math.round(d * 0.3), h: 4, r: 3,
        top: [{ line: [[0, 8], [w - 6, 8]] }]
      }
    ]
  };
}

// Storage with its back to the wall: carcass plus a door or drawer front
// along the front edge, so the side you open reads on the plan.
function cabinet({ id, name, w, d, h, role = 'body', top = [] }) {
  return {
    id,
    name,
    group: 'bedroom',
    size: { w, d, h },
    parts: [
      { x: 0, y: 0, z: 0, w, d: d - 3, h, role, r: 1, top },
      { x: 0, y: d - 3, z: 0, w, d: 3, h, role: 'soft', outline: true }
    ]
  };
}

// A wardrobe: hanging rail and hangers drawn on the plan in the usual way.
function wardrobe({ id, name, w }) {
  const d = 60;
  const h = 200;
  const hangers = Math.round(w / 25);
  return cabinet({
    id,
    name,
    w,
    d,
    h,
    top: [
      { line: [[4, 28.5], [w - 4, 28.5]], dash: '4 2', view: 'plan' },
      ...Array.from({ length: hangers }, (_, i) => {
        const u = (w * (i + 0.5)) / hangers;
        return { line: [[u - 5, 18], [u + 5, 39]], view: 'plan' };
      })
    ]
  });
}

export default [
  bed({ id: 'bed', name: 'Bed, Double', w: 200, d: 150, head: 'left' }),
  bed({ id: 'bed-single', name: 'Bed, Single', w: 92, d: 188 }),
  bed({ id: 'bed-king-single', name: 'Bed, King Single', w: 107, d: 203 }),
  bed({ id: 'bed-queen', name: 'Bed, Queen', w: 153, d: 203 }),
  bed({ id: 'bed-king', name: 'Bed, King', w: 183, d: 203 }),
  // Bunk bed: four corner posts, the upper bunk with its guard rails (a gap
  // on the right for the ladder), and the lower bunk hidden beneath.
  {
    id: 'bunk-bed',
    name: 'Bunk Bed',
    group: 'bedroom',
    size: { w: 97, d: 200, h: 160 },
    parts: [
      { x: 5, y: 5, z: 100, w: 87, d: 190, h: 15, role: 'wood' },
      ...[[0, 0], [92, 0], [0, 195], [92, 195]].map(([x, y]) => ({ x, y, z: 0, w: 5, d: 5, h: 160, role: 'wood', outline: true })),
      { x: 5, y: 0, z: 115, w: 87, d: 5, h: 45, role: 'wood', outline: true },
      { x: 5, y: 195, z: 115, w: 87, d: 5, h: 35, role: 'wood', outline: true },
      { x: 0, y: 5, z: 130, w: 5, d: 190, h: 20, role: 'wood', outline: true },
      { x: 92, y: 5, z: 130, w: 5, d: 130, h: 20, role: 'wood', outline: true },
      { x: 92, y: 145, z: 0, w: 5, d: 45, h: 150, role: 'metal', outline: true, top: [11, 22.5, 34].map((v) => ({ line: [[0, v], [5, v]] })) },
      { x: 5, y: 5, z: 20, w: 87, d: 190, h: 15, role: 'soft' },
      { x: 6, y: 6, z: 35, w: 85, d: 188, h: 18 },
      { x: 6, y: 6, z: 115, w: 85, d: 188, h: 18, outline: true, r: 3 },
      { x: 11, y: 10, z: 133, w: 75, d: 26, h: 8, role: 'soft', r: 7 },
      {
        x: 6, y: 60, z: 133, w: 85, d: 134, h: 3, r: 3,
        top: [{ line: [[0, 8], [85, 8]] }]
      }
    ]
  },
  // Cot: slatted sides seen as a timber rail all round, mattress inside.
  {
    id: 'cot',
    name: 'Cot',
    group: 'bedroom',
    size: { w: 75, d: 135, h: 90 },
    parts: [
      { x: 5, y: 5, z: 30, w: 65, d: 125, h: 5, role: 'wood' },
      ...[[0, 0], [70, 0], [0, 130], [70, 130]].map(([x, y]) => ({ x, y, z: 0, w: 5, d: 5, h: 90, role: 'wood', outline: true })),
      { x: 5, y: 0, z: 35, w: 65, d: 5, h: 55, role: 'wood', outline: true },
      { x: 5, y: 130, z: 35, w: 65, d: 5, h: 55, role: 'wood', outline: true },
      {
        x: 0, y: 5, z: 35, w: 5, d: 125, h: 55, role: 'wood', outline: true,
        top: [20, 40, 60, 80, 100].map((v) => ({ line: [[0, v], [5, v]] }))
      },
      {
        x: 70, y: 5, z: 35, w: 5, d: 125, h: 55, role: 'wood', outline: true,
        top: [20, 40, 60, 80, 100].map((v) => ({ line: [[0, v], [5, v]] }))
      },
      { x: 6, y: 6, z: 35, w: 63, d: 123, h: 10, r: 3 },
      { x: 6, y: 50, z: 45, w: 63, d: 79, h: 3, role: 'soft', r: 3, top: [{ line: [[0, 6], [63, 6]] }] }
    ]
  },
  {
    ...cabinet({
      id: 'bedside-table',
      name: 'Bedside Table',
      w: 45,
      d: 40,
      h: 55,
      role: 'wood'
    }),
    surface: 55
  },
  { ...cabinet({ id: 'chest-of-drawers', name: 'Chest of Drawers', w: 90, d: 45, h: 100, role: 'wood' }), surface: 100 },
  { ...cabinet({ id: 'dresser', name: 'Dresser', w: 140, d: 50, h: 80, role: 'wood' }), surface: 80 },
  wardrobe({ id: 'wardrobe-2', name: 'Wardrobe, 2-Door', w: 100 }),
  wardrobe({ id: 'wardrobe-3', name: 'Wardrobe, 3-Door', w: 150 }),
  // Built-in robe: two sliding doors on staggered tracks across the front.
  {
    id: 'wardrobe-sliding',
    name: 'Built-In Robe, Sliding',
    group: 'bedroom',
    size: { w: 240, d: 60, h: 240 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 240, d: 53, h: 240,
        top: [
          { line: [[4, 26.5], [236, 26.5]], dash: '4 2', view: 'plan' },
          ...Array.from({ length: 9 }, (_, i) => {
            const u = (240 * (i + 0.5)) / 9;
            return { line: [[u - 5, 16], [u + 5, 37]], view: 'plan' };
          })
        ]
      },
      { x: 0, y: 53, z: 0, w: 122, d: 3.5, h: 240, role: 'soft', outline: true },
      { x: 118, y: 56.5, z: 0, w: 122, d: 3.5, h: 240, role: 'soft', outline: true }
    ]
  },
  // Dressing table: a timber top over two drawer pedestals, knee space
  // between them shown dashed.
  {
    id: 'dressing-table',
    name: 'Dressing Table',
    group: 'bedroom',
    size: { w: 100, d: 45, h: 75 },
    surface: 75,
    parts: [
      {
        x: 0, y: 0, z: 71, w: 100, d: 45, h: 4, role: 'wood', r: 1,
        top: [{ line: [[32, 45], [32, 8], [68, 8], [68, 45]], dash: '3 2' }]
      },
      { x: 0, y: 0, z: 0, w: 32, d: 45, h: 71, role: 'wood' },
      { x: 68, y: 0, z: 0, w: 32, d: 45, h: 71, role: 'wood' }
    ]
  }
];
