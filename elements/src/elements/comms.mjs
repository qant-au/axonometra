// Comms and server room.

/** Overall cabinet height in cm for a rack of `u` units (1U = 4.445 cm, plus plinth and roof). */
export const rackHeight = (u) => Math.round(u * 4.445 + 13);

// A closed rack cabinet: dark body, roof panel with front and rear cable
// entries, and a network-blue status strip on the front edge so the door side
// reads on a plan.
function rack({ id, name, w, d, u, mount, sizeLabel }) {
  const h = rackHeight(u);
  return {
    id,
    name: `${name} ${u}U, ${sizeLabel}`,
    group: 'comms',
    tags: ['network'],
    size: { w, d, h },
    ...(mount ? { mount, mountFrom: 'floor' } : {}),
    parts: [
      {
        x: 0, y: 0, z: 0, w, d, h, role: 'dark', r: 1,
        top: [
          { rect: [6, 6, w - 12, d - 12], stroke: 'soft' },
          { rect: [w / 2 - 12, 9, 24, 4], r: 1, fill: 'soft', stroke: 'soft' },
          { rect: [w / 2 - 8, d - 3.5, 16, 2.5], r: 1, accent: 'network', view: 'plan' }
        ]
      }
    ]
  };
}

const wallRacks = [6, 9, 12, 15].map((u) =>
  rack({ id: `rack-wall-600x450-${u}u`, name: 'Wall-Mount Cabinet', w: 60, d: 45, u, mount: 150, sizeLabel: '600 × 450' })
);
const smallRacks = [18, 24, 27].map((u) =>
  rack({ id: `rack-600x600-${u}u`, name: 'Comms Cabinet', w: 60, d: 60, u, sizeLabel: '600 × 600' })
);
const mediumRacks = [27, 32, 37, 42].map((u) =>
  rack({ id: `rack-600x800-${u}u`, name: 'Network Cabinet', w: 60, d: 80, u, sizeLabel: '600 × 800' })
);
const serverRacks = [60, 80].flatMap((w) =>
  [100, 110, 120].flatMap((d) =>
    [42, 45].map((u) =>
      rack({ id: `rack-${w * 10}x${d * 10}-${u}u`, name: 'Server Rack', w, d, u, sizeLabel: `${w * 10} × ${d * 10}` })
    )
  )
);

// Open racks: posts and rails only, no cabinet.
function openRack({ id, name, w, d, u, posts }) {
  const h = rackHeight(u);
  // Rails run left to right at the top, between the posts: one pair for a
  // 2-post frame, front and rear pairs for a 4-post frame.
  const railYs = posts === 2 ? [d / 2 - 2.5] : [4, d - 9];
  return {
    id,
    name: `${name} ${u}U`,
    group: 'comms',
    tags: ['network'],
    size: { w, d, h },
    parts: [
      { x: 0, y: 0, z: 0, w, d, h: 5, role: 'metal' },
      ...railYs.flatMap((y) => [
        { x: 4, y, z: 5, w: 5, d: 5, h: h - 10, role: 'metal', outline: true },
        { x: w - 9, y, z: 5, w: 5, d: 5, h: h - 10, role: 'metal', outline: true },
        { x: 4, y, z: h - 5, w: w - 8, d: 5, h: 5, role: 'metal', outline: true }
      ])
    ],
    plan: [{ rect: [w / 2 - 8, d - 3.5, 16, 2.5], r: 1, accent: 'network' }]
  };
}

const openRacks = [
  openRack({ id: 'rack-open-2post-24u', name: 'Open Frame Rack, 2-Post', w: 53, d: 40, u: 24, posts: 2 }),
  openRack({ id: 'rack-open-2post-42u', name: 'Open Frame Rack, 2-Post', w: 53, d: 40, u: 42, posts: 2 }),
  openRack({ id: 'rack-open-4post-42u', name: 'Open Frame Rack, 4-Post', w: 60, d: 100, u: 42, posts: 4 })
];

// A small accent strip on the front edge of the plan, as on the racks, so the
// working side of a box reads on a plan.
const planStrip = (w, d, tag) => ({ rect: [w / 2 - Math.min(8, w / 2 - 4), d - 3.5, Math.min(16, w - 8), 2.5], r: 1, accent: tag, view: 'plan' });

// Floor-standing equipment cabinets (UPS, battery, cooling). One box with a
// status strip on the front edge, and vents or a panel on top.
// `fans` puts that many fan rings on the roof, spaced along the longer side.
function cabinet({ id, name, tag, w, d, h, role = 'dark', vents = 0, fans = 0 }) {
  const ink = role === 'dark' ? 'soft' : 'detail';
  const along = w >= d;
  const pitch = ((along ? w : d) - 8) / Math.max(1, fans);
  const fanR = Math.min(pitch, (along ? d : w) - 8) / 2 - 3;
  const top = [
    { rect: [4, 4, w - 8, d - 8], stroke: ink },
    ...Array.from({ length: vents }, (_, i) => ({ line: [[8, 8 + ((d - 20) * (i + 0.5)) / vents], [w - 8, 8 + ((d - 20) * (i + 0.5)) / vents]], stroke: ink, view: 'plan' })),
    ...Array.from({ length: fans }, (_, i) => {
      const c = 4 + pitch * (i + 0.5);
      return { circle: along ? [c, d / 2 - 2, fanR] : [w / 2, c - 2, fanR], stroke: ink };
    }),
    planStrip(w, d, tag)
  ];
  return { id, name, group: 'comms', tags: [tag], size: { w, d, h }, parts: [{ x: 0, y: 0, z: 0, w, d, h, role, r: 1, top }] };
}

// Wall-mounted panels: a shallow box whose door faces the room.
function wallPanel({ id, name, tag, w, d, h, mount, role = 'body' }) {
  return {
    id, name, group: 'comms', tags: [tag], size: { w, d, h }, mount, mountFrom: 'floor',
    parts: [{
      x: 0, y: 0, z: 0, w, d, h, role, r: 1,
      top: [planStrip(w, d, tag)]
    }]
  };
}

const rows = (u, v, w, n, pitch) => Array.from({ length: n }, (_, i) => ({ line: [[u, v + i * pitch], [u + w, v + i * pitch]] }));

const power = [
  cabinet({ id: 'ups-tower', name: 'UPS, Tower', tag: 'power', w: 20, d: 45, h: 35, vents: 3 }),
  cabinet({ id: 'ups-large', name: 'UPS, Floor-Standing', tag: 'power', w: 35, d: 80, h: 130, vents: 4 }),
  cabinet({ id: 'battery-cabinet', name: 'Battery Cabinet', tag: 'power', w: 60, d: 85, h: 200, vents: 4 }),
  wallPanel({
    id: 'distribution-board', name: 'Distribution Board', tag: 'power', w: 60, d: 20, h: 90, mount: 110
  }),
  wallPanel({
    id: 'ats-panel', name: 'Transfer Switch Panel', tag: 'power', w: 60, d: 25, h: 80, mount: 110
  }),
  {
    id: 'generator',
    name: 'Standby Generator',
    group: 'comms',
    tags: ['power'],
    size: { w: 220, d: 110, h: 150 },
    parts: [
      { x: 0, y: 0, z: 0, w: 220, d: 110, h: 10, role: 'metal' },
      {
        x: 5, y: 5, z: 10, w: 210, d: 100, h: 130, r: 2, outline: true,
        top: [
          ...Array.from({ length: 6 }, (_, i) => ({ line: [[160 + i * 8, 12], [160 + i * 8, 88]], view: 'plan' })),
          { rect: [10, 10, 135, 80], stroke: 'soft' },
          planStrip(210, 100, 'power')
        ]
      },
      { cyl: [40, 40, 7], z: 140, h: 10, role: 'metal' }
    ]
  }
];

const cooling = [
  cabinet({ id: 'crac-unit', name: 'Precision Air Conditioner (CRAC)', tag: 'cooling', w: 100, d: 90, h: 195, role: 'body', fans: 2 }),
  cabinet({ id: 'in-row-cooler', name: 'In-Row Cooler', tag: 'cooling', w: 30, d: 120, h: 200, fans: 4 }),
  {
    id: 'ac-ceiling-cassette',
    name: 'AC Ceiling Cassette',
    group: 'comms',
    tags: ['cooling'],
    size: { w: 84, d: 84, h: 25 },
    mount: -22, // recessed: the body in the void, the 3 cm panel below
    mountFrom: 'ceiling',
    facing: 'down',
    // The plan shows the grille face: four louvre slots round a return grille.
    // Authored facing up (body below, grille face on top), installed facing
    // down, so the grille is the underside and the body sits in the ceiling.
    parts: [
      {
        x: 0, y: 0, z: 22, w: 84, d: 84, h: 3, r: 3,
        top: [
          { rect: [18, 4, 48, 5], r: 2, fill: 'soft' },
          { rect: [18, 75, 48, 5], r: 2, fill: 'soft' },
          { rect: [4, 18, 5, 48], r: 2, fill: 'soft' },
          { rect: [75, 18, 5, 48], r: 2, fill: 'soft' }
        ]
      },
      { x: 14, y: 14, z: 0, w: 56, d: 56, h: 22, role: 'soft' }
    ],
    plan: [
      { rect: [18, 18, 48, 48], fill: 'body' },
      ...rows(22, 26, 40, 5, 8),
      { rect: [60, 70.5, 6, 2.5], r: 1, accent: 'cooling' }
    ]
  },
  {
    id: 'ac-condenser',
    name: 'AC Outdoor Unit',
    group: 'comms',
    tags: ['cooling'],
    size: { w: 85, d: 35, h: 70 },
    parts: [{
      x: 0, y: 0, z: 0, w: 85, d: 35, h: 70, r: 1,
      top: [
        ...Array.from({ length: 8 }, (_, i) => ({ line: [[6 + i * 7, 3], [6 + i * 7, 12]], view: 'plan' })),
        { line: [[64, 4], [64, 31]], stroke: 'soft' },
        { rect: [68, 31.5, 12, 2], r: 1, accent: 'cooling', view: 'plan' }
      ]
    }]
  },
  {
    id: 'containment-door',
    name: 'Aisle Containment Door',
    group: 'comms',
    tags: ['cooling'],
    size: { w: 120, d: 10, h: 200 },
    // Posts and header frame a pair of sliding glass leaves.
    parts: [
      { x: 0, y: 0, z: 0, w: 5, d: 10, h: 200, role: 'metal' },
      { x: 115, y: 0, z: 0, w: 5, d: 10, h: 200, role: 'metal', outline: true },
      {
        x: 5, y: 0, z: 190, w: 110, d: 10, h: 10, role: 'metal', outline: true
      },
      { x: 5, y: 3, z: 0, w: 55, d: 4, h: 190, role: 'glass' },
      { x: 60, y: 3, z: 0, w: 55, d: 4, h: 190, role: 'glass' }
    ],
    plan: [
      { line: [[60, 1.5], [60, 8.5]] },
      { line: [[20, 5], [45, 5]], dash: '2 2' },
      { line: [[75, 5], [100, 5]], dash: '2 2' },
      { rect: [55, 7.5, 10, 2], r: 1, accent: 'cooling' }
    ]
  },
  {
    id: 'raised-floor-tile',
    name: 'Perforated Floor Tile',
    group: 'comms',
    tags: ['cooling'],
    size: { w: 60, d: 60, h: 1 },
    parts: [{
      x: 0, y: 0, z: 0, w: 60, d: 60, h: 1, role: 'metal',
      top: [
        ...Array.from({ length: 7 }, (_, i) => ({ line: [[8, 8 + i * 7], [52, 8 + i * 7]], dash: '0.1 3.6' })),
        { rect: [25, 55, 10, 2.5], r: 1, accent: 'cooling' }
      ]
    }]
  }
];

// Gas suppression cylinder: red is the conventional finish, so the body is
// fire red and the valve and actuator sit on its shoulder.
const fire = [
  {
    id: 'fire-suppression',
    name: 'Gas Suppression Cylinder',
    group: 'comms',
    tags: ['fire'],
    size: { w: 40, d: 40, h: 170 },
    parts: [
      { cyl: [20, 20, 18], z: 0, h: 140, role: 'fire' },
      { dome: [20, 20, 18], z: 140, h: 14, role: 'fire' },
      { cyl: [20, 20, 5], z: 154, h: 10, role: 'metal', outline: true },
      { x: 16, y: 16, z: 164, w: 8, d: 8, h: 6, role: 'dark', outline: true }
    ],
    plan: [{ circle: [30, 28, 3], fill: 'body', stroke: 'outline' }]
  }
];

// Cable tray fittings. They match the 1 m straight section: 30 cm wide, a
// 1.5 cm base, 8.5 cm side rails 1.5 cm thick, hung below the ceiling, three dashed
// cable runs down the middle. Every fitting's straight ends meet a section
// flush, entering from the left.
const TRAY = 30; // width
const RAIL = 1.5;
const TRAY_GAP = 10; // hung 10 cm below the ceiling (top at 2.6 m under a 2.7 m one)
const rr = (n) => Math.round(n * 100) / 100;
const arcPts = (cx, cy, r, a0, a1, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [rr(cx + r * Math.cos(t)), rr(cy + r * Math.sin(t))];
  });
// Plan polygons run clockwise (y down): reverse any that do not.
const cw = (p) => {
  let a = 0;
  p.forEach(([x0, y0], i) => {
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  });
  return a > 0 ? p : p.reverse();
};
const trayBase = (poly, top) => ({ poly: cw(poly), z: 0, h: RAIL, role: 'metal', top });
const trayRail = (poly) => ({ poly: cw(poly), z: RAIL, h: 10 - RAIL, role: 'metal', outline: true });

// A horizontal bend turning `deg` towards the front, inner rail on a 30 cm radius.
function trayBend(deg, id) {
  const R = 30;
  const [cx, cy] = [0, R + TRAY];
  const a1 = -90 + deg;
  const n = Math.max(4, Math.round(deg / 7.5));
  const band = (r0, r1) => [...arcPts(cx, cy, r1, -90, a1, n), ...arcPts(cx, cy, r0, a1, -90, n)];
  const outline = band(R, R + TRAY);
  const extent = (k) => Math.ceil(Math.max(...outline.map((p) => p[k])));
  return {
    id,
    name: `Cable Tray Bend, ${deg}°`,
    group: 'comms',
    tags: ['network'],
    size: { w: extent(0), d: extent(1), h: 10 },
    mount: TRAY_GAP,
    mountFrom: 'ceiling',
    parts: [
      trayBase(band(R, R + TRAY), [9, 15, 21].map((v) => ({ arc: [cx, cy, R + TRAY - v, -90, a1], dash: '4 3' }))),
      trayRail(band(R + TRAY - RAIL, R + TRAY)),
      trayRail(band(R, R + RAIL))
    ]
  };
}

// A tee (branch to the front) or a cross (branches front and back): a 90 cm
// run with a 30 cm branch, the corners filleted on a 15 cm radius.
function trayJunction({ id, name, back }) {
  const F = 15;
  const L = 90;
  const [x0, x1] = [(L - TRAY) / 2, (L + TRAY) / 2];
  const yT = back ? TRAY : 0; // the run's back edge
  const yB = yT + TRAY; // its front edge
  const d = yB + TRAY;
  // The run's edge from x = 0 to L, detouring round a branch where there is one.
  const topEdge = back
    ? [[0, yT], ...arcPts(x0 - F, yT - F, F, 90, 0, 6), [x0, 0], [x1, 0], ...arcPts(x1 + F, yT - F, F, 180, 90, 6), [L, yT]]
    : [[0, 0], [L, 0]];
  const bottomEdge = [[L, yB], ...arcPts(x1 + F, yB + F, F, 270, 180, 6), [x1, d], [x0, d], ...arcPts(x0 - F, yB + F, F, 0, -90, 6), [0, yB]];
  // A rail following a filleted corner, `s` = +1 on the front side, -1 on the back.
  const corner = (side, s) => {
    const cxs = side < 0 ? x0 - F : x1 + F;
    const cyc = s > 0 ? yB + F : yT - F;
    const edgeY = s > 0 ? yB : yT;
    const branchX = side < 0 ? x0 : x1;
    const farY = s > 0 ? d : 0;
    const farX = side < 0 ? 0 : L;
    const aRun = s > 0 ? (side < 0 ? -90 : 270) : 90;
    const aBr = side < 0 ? 0 : 180;
    const outer = [[farX, edgeY], ...arcPts(cxs, cyc, F, aRun, aBr, 6), [branchX, farY]];
    const inner = [[branchX - side * RAIL, farY], ...arcPts(cxs, cyc, F + RAIL, aBr, aRun, 6), [farX, edgeY - s * RAIL]];
    return trayRail([...outer, ...inner]);
  };
  const runs = [yT + 9, yT + 15, yT + 21].map((v) => ({ line: [[4, v], [L - 4, v]], dash: '4 3' }));
  const branches = [x0 + 9, x0 + 15, x0 + 21].flatMap((u) => [
    { line: [[u, yB + 4], [u, d - 4]], dash: '4 3' },
    ...(back ? [{ line: [[u, 4], [u, yT - 4]], dash: '4 3' }] : [])
  ]);
  return {
    id,
    name,
    group: 'comms',
    tags: ['network'],
    size: { w: L, d, h: 10 },
    mount: TRAY_GAP,
    mountFrom: 'ceiling',
    parts: [
      trayBase([...topEdge, ...bottomEdge], [...runs, ...branches]),
      corner(-1, 1),
      corner(1, 1),
      ...(back ? [corner(-1, -1), corner(1, -1)] : [trayRail([[0, 0], [L, 0], [L, RAIL], [0, RAIL]])])
    ]
  };
}

const network = [
  {
    id: 'cable-tray',
    name: 'Cable Tray Section, 1 m',
    group: 'comms',
    tags: ['network'],
    size: { w: 100, d: 30, h: 10 },
    mount: TRAY_GAP,
    mountFrom: 'ceiling',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 100, d: 30, h: 1.5, role: 'metal', noInset: true,
        top: [
          ...[9, 15, 21].map((v) => ({ line: [[6, v], [94, v]], dash: '4 3' })),
          { rect: [84, 25.5, 10, 2], r: 1, accent: 'network', view: 'plan' }
        ]
      },
      { x: 0, y: 0, z: 1.5, w: 100, d: 1.5, h: 8.5, role: 'metal', outline: true },
      { x: 0, y: 28.5, z: 1.5, w: 100, d: 1.5, h: 8.5, role: 'metal', outline: true }
    ]
  },
  trayBend(22.5, 'cable-tray-bend-22'),
  trayBend(45, 'cable-tray-bend-45'),
  trayBend(90, 'cable-tray-bend-90'),
  trayJunction({ id: 'cable-tray-tee', name: 'Cable Tray Tee' }),
  trayJunction({ id: 'cable-tray-cross', name: 'Cable Tray Cross', back: true }),
  {
    id: 'ladder-rack',
    name: 'Ladder Rack Section, 1 m',
    group: 'comms',
    tags: ['network'],
    size: { w: 100, d: 45, h: 5 },
    mount: 25,
    mountFrom: 'ceiling',
    parts: [
      { x: 0, y: 0, z: 0, w: 100, d: 4, h: 5, role: 'metal' },
      { x: 0, y: 41, z: 0, w: 100, d: 4, h: 5, role: 'metal', outline: true, top: [{ rect: [44, 1, 12, 2], r: 1, accent: 'network' }] },
      ...[8, 34, 60, 86].map((x) => ({ x, y: 4, z: 1, w: 6, d: 37, h: 3, role: 'metal', outline: true }))
    ]
  },
  {
    id: 'odf-panel',
    name: 'Fibre Termination Cabinet',
    group: 'comms',
    tags: ['network'],
    size: { w: 60, d: 30, h: 60 },
    mount: 120,
    mountFrom: 'floor',
    parts: [{
      x: 0, y: 0, z: 0, w: 60, d: 30, h: 60, role: 'metal', r: 1,
      top: [
        { circle: [15, 8, 3] },
        { circle: [30, 8, 3] },
        { circle: [45, 8, 3] },
        planStrip(60, 30, 'network')
      ]
    }]
  },
  {
    id: 'kvm-console',
    name: 'KVM Console Cart',
    group: 'comms',
    tags: ['network'],
    size: { w: 60, d: 70, h: 110 },
    // Castored base, a rear column carrying the monitor, and a keyboard tray.
    parts: [
      { x: 0, y: 0, z: 6, w: 60, d: 70, h: 6, role: 'metal', r: 3 },
      ...[[6, 6], [54, 6], [6, 64], [54, 64]].map(([cx, cy]) => ({ cyl: [cx, cy, 3], z: 0, h: 6, role: 'dark' })),
      { x: 25, y: 0, z: 12, w: 10, d: 6, h: 98, role: 'metal', outline: true },
      {
        x: 5, y: 6, z: 80, w: 50, d: 4, h: 30, role: 'dark', outline: true,
        top: [{ rect: [21, 1, 8, 2], accent: 'network', view: 'plan' }]
      },
      {
        x: 5, y: 14, z: 72, w: 50, d: 50, h: 4, role: 'soft', outline: true,
        top: [{ rect: [4, 6, 42, 16], r: 1, fill: 'body' }, { rect: [18, 28, 14, 10], r: 1 }]
      }
    ]
  }
];

export default [
  ...wallRacks,
  ...smallRacks,
  ...mediumRacks,
  ...serverRacks,
  ...openRacks,
  {
    id: 'split-ac-indoor',
    name: 'Split AC, Wall Unit',
    group: 'comms',
    tags: ['cooling'],
    size: { w: 90, d: 25, h: 30 },
    mount: 210,
    mountFrom: 'floor',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 90, d: 25, h: 30, r: 4,
        top: [
          { line: [[6, 13], [84, 13]], view: 'plan' },
          { line: [[6, 17], [84, 17]], view: 'plan' },
          { line: [[6, 21], [84, 21]], view: 'plan' },
          { rect: [72, 4, 10, 2.5], accent: 'cooling', view: 'plan' }
        ]
      }
    ]
  },
  ...power,
  ...cooling,
  ...fire,
  ...network
];
