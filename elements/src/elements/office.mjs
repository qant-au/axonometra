// Office furniture. No tags or accents: colour stays in the devices.

const TOP = 3; // desk and table top thickness, cm
const H = 73; // desk and table height, cm

// A desk: timber top on four square metal legs, a modesty panel between the
// back legs, and a cable grommet at the back so the working side (bottom) reads.
// A sit-stand desk swaps the legs for two lifting columns on T feet (drawn as
// hidden lines on the plan) and adds the height paddle at the front right.
function desk({ id, name, w, d, sitStand = false }) {
  const z = H - TOP;
  const top = {
    x: 0, y: 0, z, w, d, h: TOP, role: 'wood', r: 1,
    top: [
      { circle: [w / 2, 7, 3] },
      ...(sitStand
        ? [
            { line: [[10, 6], [10, d - 6]], dash: '3 2' },
            { line: [[w - 10, 6], [w - 10, d - 6]], dash: '3 2' },
            { rect: [w - 30, d - 5, 14, 3], r: 1, fill: 'dark', stroke: 'dark' }
          ]
        : [])
    ]
  };
  const legs = sitStand
    ? [
        { x: 6, y: 6, z: 0, w: 8, d: d - 12, h: 3, role: 'metal' },
        { x: w - 14, y: 6, z: 0, w: 8, d: d - 12, h: 3, role: 'metal' },
        { x: 6, y: d / 2 - 5, z: 3, w: 8, d: 10, h: z - 6, role: 'metal' },
        { x: w - 14, y: d / 2 - 5, z: 3, w: 8, d: 10, h: z - 6, role: 'metal' },
        { x: 14, y: d / 2 - 2, z: z - 6, w: w - 28, d: 4, h: 6, role: 'metal' }
      ]
    : [
        ...[[2, 2], [w - 7, 2], [2, d - 7], [w - 7, d - 7]].map(([x, y]) => ({ x, y, z: 0, w: 5, d: 5, h: z, role: 'metal' })),
        { x: 7, y: 3, z: 30, w: w - 14, d: 2, h: z - 30, role: 'metal' }
      ];
  return { id, name, group: 'office', size: { w, d, h: H }, parts: [top, ...legs] };
}

// L-shaped desk: a 160 cm run against the back wall and a 60 cm return down
// the left, working from the inside corner.
function deskL({ id, name, w, d, run = 70, ret = 60 }) {
  const z = H - TOP;
  const leg = (x, y) => ({ x, y, z: 0, w: 5, d: 5, h: z, role: 'metal' });
  return {
    id, name, group: 'office',
    size: { w, d, h: H },
    parts: [
      {
        poly: [[0, 0], [w, 0], [w, run], [ret, run], [ret, d], [0, d]], z, h: TOP, role: 'wood',
        top: [
          { circle: [w - 30, 7, 3] },
          { line: [[ret, run], [ret, 0]], dash: '3 2' }
        ]
      },
      leg(2, 2), leg(w - 7, 2), leg(w - 7, run - 7), leg(2, d - 7), leg(ret - 7, d - 7)
    ]
  };
}

// Workstation pod: desks back to back in two rows, `cols` wide, on shared end
// frames; `screen` adds the acoustic divider between the rows. Desks only.
function pod({ id, name, cols, dw = 160, d = 150, screen = false }) {
  const w = cols * dw;
  const z = H - TOP;
  const gap = screen ? 3 : 1;
  const dd = (d - gap) / 2;
  const h = screen ? 120 : H;
  const frames = Array.from({ length: cols + 1 }, (_, i) => ({
    x: i === 0 ? 0 : i === cols ? w - 4 : i * dw - 2, y: 4, z: 0, w: 4, d: d - 8, h: z, role: 'metal'
  }));
  const tops = Array.from({ length: cols }, (_, i) =>
    [0, dd + gap].map((y) => ({
      x: i * dw + (i > 0 ? 0.5 : 0), y, z, w: dw - (i > 0 ? 0.5 : 0) - (i < cols - 1 ? 0.5 : 0), d: dd, h: TOP,
      role: 'wood', r: 1, outline: true,
      top: [{ circle: [dw / 2, y === 0 ? 7 : dd - 7, 3] }]
    }))
  ).flat();
  const divider = screen
    ? [{ x: 4, y: dd, z, w: w - 8, d: gap, h: h - z, role: 'soft', outline: true }]
    : [];
  return { id, name, group: 'office', size: { w, d, h }, parts: [...tops, ...frames, ...divider] };
}

// Meeting table: timber top on four legs, with a cable hatch in the middle.
function table({ id, name, w, d, hatch = 30 }) {
  const z = H - TOP;
  const inset = Math.min(15, w * 0.1);
  return {
    id, name, group: 'office',
    size: { w, d, h: H },
    parts: [
      { x: 0, y: 0, z, w, d, h: TOP, role: 'wood', r: 3, top: [{ rect: [w / 2 - hatch / 2, d / 2 - 7, hatch, 14], r: 1 }] },
      ...[[inset, inset], [w - inset - 6, inset], [inset, d - inset - 6], [w - inset - 6, d - inset - 6]].map(([x, y]) => ({
        x, y, z: 0, w: 6, d: 6, h: z, role: 'metal'
      }))
    ]
  };
}

// Storage with a front of `cols` columns of drawers or doors, drawn on the
// plan as the front edge with its divisions.
function storage({ id, name, w, d, h, cols = 1, casters = false }) {
  const z0 = casters ? 4 : 0;
  const bh = h - z0;
  const cw = (w - 2) / cols;
  // Plan: the door or drawer fronts as a band along the front edge, split per column.
  const top = [
    { rect: [1.5, d - 5, w - 3, 3.5], fill: 'soft' },
    ...Array.from({ length: cols - 1 }, (_, i) => ({ line: [[1 + (i + 1) * cw, d - 5], [1 + (i + 1) * cw, d - 1.5]] })),
    // Full-height storage takes the drafting cross, so it reads apart from low units.
    ...(h >= 150 ? [{ line: [[1.5, 1.5], [w - 1.5, d - 5]] }, { line: [[w - 1.5, 1.5], [1.5, d - 5]] }] : [])
  ];
  const parts = [{ x: 0, y: 0, z: z0, w, d, h: bh, r: 1, top }];
  if (casters)
    for (const [x, y] of [[5, 5], [w - 5, 5], [5, d - 5], [w - 5, d - 5]]) parts.push({ cyl: [x, y, 2.5], z: 0, h: 4, role: 'dark' });
  return { id, name, group: 'office', size: { w, d, h }, parts };
}

export default [
  { ...desk({ id: 'desk', name: 'Desk', w: 150, d: 75 }), surface: 73 },
  { ...desk({ id: 'desk-small', name: 'Desk, Compact', w: 120, d: 60 }), surface: 73 },
  { ...deskL({ id: 'desk-l', name: 'L-Shaped Desk', w: 160, d: 160 }), surface: 73 },
  { ...desk({ id: 'desk-sit-stand', name: 'Sit-Stand Desk', w: 160, d: 80, sitStand: true }), surface: 73 },
  { ...pod({ id: 'workstation-pod-2', name: 'Workstation Pod, 2', cols: 1 }), surface: 73 },
  { ...pod({ id: 'workstation-pod-4', name: 'Workstation Pod, 4', cols: 2, screen: true }), surface: 73 },

  // Task chair: seat and backrest as solids on a gas column; the five-star
  // base is drawn on the hub so its arms and castors show round the seat.
  {
    id: 'office-chair',
    name: 'Office Chair',
    group: 'office',
    size: { w: 65, d: 65, h: 110 },
    parts: [
      { x: 11, y: 13, z: 45, w: 43, d: 41, h: 7, role: 'soft', r: 8 },
      { x: 12, y: 4, z: 57, w: 41, d: 7, h: 53, role: 'soft', r: 3, outline: true },
      { x: 9, y: 20, z: 62, w: 4, d: 24, h: 4, r: 2, outline: true },
      { x: 52, y: 20, z: 62, w: 4, d: 24, h: 4, r: 2, outline: true },
      { x: 10, y: 30, z: 52, w: 2, d: 4, h: 10, role: 'dark' },
      { x: 53, y: 30, z: 52, w: 2, d: 4, h: 10, role: 'dark' },
      { cyl: [32.5, 35, 3], z: 5, h: 40, role: 'metal' },
      {
        cyl: [32.5, 35, 4], z: 0, h: 5, role: 'dark',
        top: [270, 342, 54, 126, 198].flatMap((deg) => {
          const a = (deg * Math.PI) / 180;
          const [u, v] = [4 + 28 * Math.cos(a), 4 + 28 * Math.sin(a)];
          return [
            { line: [[4, 4], [u, v]], stroke: 'outline', weight: 'outline' },
            { circle: [u, v, 2.5], fill: 'dark', stroke: 'outline' }
          ];
        })
      }
    ]
  },

  // Visitor chair: four legs, upholstered seat and back, and armrests.
  {
    id: 'visitor-chair',
    name: 'Visitor Chair',
    group: 'office',
    size: { w: 55, d: 55, h: 85 },
    parts: [
      { x: 5, y: 10, z: 42, w: 45, d: 43, h: 6, role: 'soft', r: 4 },
      { x: 5, y: 2, z: 48, w: 45, d: 6, h: 37, role: 'soft', r: 2, outline: true },
      { x: 0, y: 12, z: 62, w: 4, d: 36, h: 3, r: 1.5, role: 'metal', outline: true },
      { x: 51, y: 12, z: 62, w: 4, d: 36, h: 3, r: 1.5, role: 'metal', outline: true },
      ...[[6.5, 11.5], [48.5, 11.5], [6.5, 52.5], [48.5, 52.5]].map(([cx, cy]) => ({ cyl: [cx, cy, 1.5], z: 0, h: 42, role: 'metal' }))
    ]
  },

  { ...table({ id: 'meeting-table-4', name: 'Meeting Table, 4', w: 120, d: 120 }), surface: 73 },
  { ...table({ id: 'meeting-table-8', name: 'Boardroom Table, 8', w: 300, d: 120, hatch: 50 }), surface: 73 },
  {
    id: 'meeting-table-round',
    name: 'Round Meeting Table',
    group: 'office',
    size: { w: 100, d: 100, h: H },
    surface: 73,
    parts: [
      { cyl: [50, 50, 50], z: H - TOP, h: TOP, role: 'wood', top: [{ circle: [50, 50, 30], dash: '3 2' }, { circle: [50, 50, 5] }] },
      { cyl: [50, 50, 5], z: 4, h: H - TOP - 4, role: 'metal' },
      { cyl: [50, 50, 30], z: 0, h: 4, role: 'metal' }
    ]
  },

  // Reception desk: staff work surface behind (top), a raised transaction
  // ledge over the visitor-facing fascia at the front (bottom).
  {
    id: 'reception-desk',
    name: 'Reception Desk',
    group: 'office',
    size: { w: 240, d: 80, h: 110 },
    surface: 73,
    parts: [
      { x: 0, y: 0, z: 70, w: 240, d: 60, h: 3, role: 'wood', top: [{ circle: [60, 8, 3] }, { circle: [180, 8, 3] }] },
      { x: 0, y: 50, z: 106, w: 240, d: 30, h: 4, role: 'soft', r: 1, outline: true, top: [{ line: [[3, 26], [237, 26]] }] },
      { x: 0, y: 60, z: 0, w: 240, d: 20, h: 106 },
      { x: 0, y: 0, z: 0, w: 3, d: 60, h: 70 },
      { x: 237, y: 0, z: 0, w: 3, d: 60, h: 70 }
    ]
  },

  { ...storage({ id: 'filing-cabinet', name: 'Filing Cabinet, 4-Drawer', w: 47, d: 62, h: 132 }), surface: 132 },
  { ...storage({ id: 'lateral-filer', name: 'Lateral Filer', w: 90, d: 45, h: 100 }), surface: 100 },
  storage({ id: 'storage-cupboard', name: 'Storage Cupboard', w: 90, d: 45, h: 200, cols: 2 }),
  storage({ id: 'lockers', name: 'Lockers, Bank of 4', w: 120, d: 45, h: 180, cols: 4 }),
  storage({ id: 'mobile-pedestal', name: 'Mobile Pedestal', w: 40, d: 55, h: 60, casters: true }),

  // Floor-standing MFD: paper-tray base, print engine, then the scanner with
  // its document feeder on top and the control panel at the front.
  {
    id: 'printer-mfd',
    name: 'Multifunction Printer',
    group: 'office',
    size: { w: 60, d: 65, h: 115 },
    parts: [
      { x: 0, y: 0, z: 70, w: 60, d: 65, h: 30, r: 2 },
      { x: 2, y: 3, z: 100, w: 56, d: 47, h: 15, r: 2, role: 'soft', outline: true, top: [{ rect: [8, 6, 40, 26], r: 1 }, { line: [[8, 38], [48, 38]] }] },
      { x: 8, y: 52, z: 100, w: 44, d: 11, h: 5, r: 1, role: 'dark', top: [{ rect: [4, 2.5, 18, 6], fill: 'glass', stroke: 'glass' }] },
      {
        x: 0, y: 0, z: 0, w: 60, d: 65, h: 70
      }
    ]
  },

  {
    id: 'shredder',
    name: 'Shredder',
    group: 'office',
    size: { w: 40, d: 30, h: 65 },
    parts: [
      { x: 0, y: 0, z: 52, w: 40, d: 30, h: 13, role: 'dark', r: 2, top: [{ rect: [6, 12, 28, 2.5], r: 1, fill: 'outline', stroke: 'outline' }, { circle: [33, 23, 2] }] },
      { x: 1, y: 1, z: 0, w: 38, d: 28, h: 52, r: 2 }
    ]
  },

  // Mobile whiteboard: board on two uprights, T feet with castors, pen tray.
  {
    id: 'whiteboard-mobile',
    name: 'Mobile Whiteboard',
    group: 'office',
    size: { w: 180, d: 60, h: 190 },
    parts: [
      { x: 8, y: 28.5, z: 90, w: 164, d: 3, h: 100, role: 'body' },
      { x: 30, y: 31.5, z: 86, w: 120, d: 5, h: 3, role: 'metal' },
      { x: 0, y: 0, z: 0, w: 8, d: 60, h: 6, r: 2, role: 'metal', outline: true },
      { x: 172, y: 0, z: 0, w: 8, d: 60, h: 6, r: 2, role: 'metal', outline: true },
      { x: 2, y: 27, z: 6, w: 4, d: 6, h: 184, role: 'metal', outline: true },
      { x: 174, y: 27, z: 6, w: 4, d: 6, h: 184, role: 'metal', outline: true }
    ]
  },

  // Wall-hung meeting-room display on a flat bracket; screen faces the room.
  {
    id: 'display-screen',
    name: 'Meeting Room Display',
    group: 'office',
    size: { w: 170, d: 10, h: 100 },
    mount: 90,
    mountFrom: 'floor',
    parts: [
      { x: 0, y: 4, z: 0, w: 170, d: 6, h: 100, role: 'dark', r: 1 },
      { x: 60, y: 0, z: 30, w: 50, d: 4, h: 40, role: 'metal' }
    ]
  },

  // Phone booth: acoustic walls and roof, glass front, a shelf at the back.
  // The plan shows the roof with the wall line, glass front and shelf beneath.
  {
    id: 'phone-booth',
    name: 'Phone Booth',
    group: 'office',
    size: { w: 100, d: 100, h: 220 },
    parts: [
      {
        x: 0, y: 0, z: 215, w: 100, d: 100, h: 5,
        top: [
          { rect: [6, 6, 88, 90] },
          { rect: [6, 96, 88, 3.5], fill: 'glass', stroke: 'detail' },
          { rect: [9, 9, 82, 28], dash: '3 2' }
        ]
      },
      { x: 0, y: 0, z: 0, w: 100, d: 100, h: 5, role: 'soft' },
      { x: 0, y: 0, z: 5, w: 100, d: 6, h: 210 },
      { x: 0, y: 6, z: 5, w: 6, d: 94, h: 210 },
      { x: 94, y: 6, z: 5, w: 6, d: 94, h: 210 },
      { x: 6, y: 96, z: 5, w: 88, d: 4, h: 210, role: 'glass' },
      { x: 6, y: 6, z: 100, w: 88, d: 30, h: 4, role: 'wood' }
    ]
  },

  // Breakout lounge chair: plinth, back and arms, seat cushion.
  {
    id: 'lounge-chair',
    name: 'Breakout Lounge Chair',
    group: 'office',
    size: { w: 75, d: 75, h: 80 },
    parts: [
      { x: 0, y: 0, z: 0, w: 75, d: 75, h: 20, r: 5 },
      { x: 0, y: 0, z: 20, w: 75, d: 18, h: 60, role: 'soft', r: 4 },
      { x: 0, y: 18, z: 20, w: 12, d: 57, h: 35, role: 'soft', r: 4 },
      { x: 63, y: 18, z: 20, w: 12, d: 57, h: 35, role: 'soft', r: 4 },
      { x: 13, y: 19, z: 20, w: 49, d: 54, h: 20, r: 4, outline: true }
    ]
  },

  // Water cooler: cabinet with taps at the front, bottle on top.
  {
    id: 'water-cooler',
    name: 'Water Cooler',
    group: 'office',
    size: { w: 35, d: 35, h: 110 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 35, d: 35, h: 85, r: 2,
        top: [{ circle: [12, 32, 1.5], fill: 'dark' }, { circle: [23, 32, 1.5], fill: 'dark' }]
      },
      { cyl: [17.5, 16, 13], z: 85, h: 25, role: 'glass', outline: true, top: [{ circle: [13, 13, 5] }] }
    ]
  }
];
