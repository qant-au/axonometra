// Structure: stairs, columns, openings and other parts of the building.

const r2 = (n) => Math.round(n * 100) / 100;

const FLOOR = 300; // floor-to-floor height every stair here climbs, cm
const RISERS = 17;
const RISE = FLOOR / RISERS; // 17.6 cm
const GOING = 25; // cm, a comfortable residential going

// A plan arrow along a polyline: a dot at the start, a filled head at the end.
function arrow(points, head = 12) {
  const [x1, y1] = points[points.length - 1];
  const [x0, y0] = points[points.length - 2];
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const bx = x1 - ux * head;
  const by = y1 - uy * head;
  const s = head * 0.4;
  return [
    { circle: [...points[0], 3], fill: 'outline', stroke: 'outline' },
    { line: [...points.slice(0, -1), [r2(bx), r2(by)]], stroke: 'outline' },
    {
      line: [[r2(bx - uy * s), r2(by + ux * s)], [x1, y1], [r2(bx + uy * s), r2(by - ux * s)]],
      closed: true, fill: 'outline', stroke: 'outline'
    }
  ];
}

// The conventional break line across a flight, cut at about head height.
const breakLine = (x0, x1, y) => {
  const w = x1 - x0;
  return {
    line: [[x0, y + 10], [x0 + w * 0.45, y + 2], [x0 + w * 0.5, y + 10], [x0 + w * 0.55, y - 6], [x0 + w * 0.6, y + 2], [x1, y - 6]],
    stroke: 'outline'
  };
};

// One tread: a solid step block from the floor to its own top, so the 3D
// view gets real steps. `level` counts risers from the floor.
const tread = (x, y, w, d, level) => ({ x, y, z: 0, w, d, h: r2(level * RISE) });

const heavyOutline = (line) => ({ line, closed: true, stroke: 'outline', weight: 'outline' });

// Straight flight, climbing from the front (bottom of the plan) to the back.
function stairsStraight() {
  const w = 100;
  const n = RISERS - 1; // treads; the last riser lands on the upper floor
  const d = n * GOING;
  return {
    id: 'stairs-straight',
    name: 'Stairs, Straight',
    group: 'structure',
    size: { w, d, h: FLOOR },
    // The top tread is listed first so its heavy edge is the upper nosing.
    parts: Array.from({ length: n }, (_, i) => tread(0, d - (i + 1) * GOING, w, GOING, i + 1)).reverse(),
    plan: [
      heavyOutline([[0, 0], [w, 0], [w, d], [0, d]]),
      breakLine(0, w, d - 7.5 * GOING),
      ...arrow([[w / 2, d - 12], [w / 2, 10]])
    ]
  };
}

// L-shaped: up the left from the front, a square landing at the back left,
// then a short flight climbing to the right along the back.
function stairsL() {
  const fw = 100; // flight width
  const n2 = 4;
  const n1 = RISERS - 2 - n2;
  const w = fw + n2 * GOING;
  const d = fw + n1 * GOING;
  const parts = [
    tread(0, 0, fw, fw, n1 + 1),
    ...Array.from({ length: n1 }, (_, i) => tread(0, d - (i + 1) * GOING, fw, GOING, i + 1)),
    ...Array.from({ length: n2 }, (_, j) => tread(fw + j * GOING, 0, GOING, fw, n1 + 2 + j))
  ];
  return {
    id: 'stairs-l',
    name: 'Stairs, L-Shaped',
    group: 'structure',
    size: { w, d, h: FLOOR },
    parts,
    plan: [
      heavyOutline([[0, 0], [w, 0], [w, fw], [fw, fw], [fw, d], [0, d]]),
      breakLine(0, fw, d - 7.5 * GOING),
      ...arrow([[fw / 2, d - 12], [fw / 2, fw / 2], [w - 10, fw / 2]])
    ]
  };
}

// U-shaped (dog-leg with a well): up the left, a full-width half landing at
// the back, then back down the page on the right, still climbing.
function stairsU() {
  const fw = 100;
  const well = 20;
  const n1 = 8;
  const n2 = RISERS - 2 - n1;
  const w = 2 * fw + well;
  const d = fw + n1 * GOING;
  const x2 = fw + well;
  const parts = [
    tread(0, 0, w, fw, n1 + 1),
    ...Array.from({ length: n1 }, (_, i) => tread(0, d - (i + 1) * GOING, fw, GOING, i + 1)),
    ...Array.from({ length: n2 }, (_, j) => tread(x2, fw + j * GOING, fw, GOING, n1 + 2 + j))
  ];
  return {
    id: 'stairs-u',
    name: 'Stairs, U-Shaped',
    group: 'structure',
    size: { w, d, h: FLOOR },
    parts,
    plan: [
      heavyOutline([[0, 0], [w, 0], [w, d], [x2, d], [x2, fw], [fw, fw], [fw, d], [0, d]]),
      breakLine(0, fw, d - 5.5 * GOING),
      ...arrow([[fw / 2, d - 12], [fw / 2, fw / 2], [x2 + fw / 2, fw / 2], [x2 + fw / 2, fw + n2 * GOING - 5]])
    ]
  };
}

// Spiral: a centre column and 16 floating wedge treads, 22.5° each, one full
// turn clockwise from the front. Each wedge is a flat poly slab (a simplified
// helix: no nosing, no handrail).
function stairsSpiral() {
  const c = 80;
  const R = 80;
  const col = 8;
  const n = RISERS - 1;
  const step = (2 * Math.PI) / n;
  const start = Math.PI / 2 - step / 2; // first tread centred on the front
  const at = (r, t) => [r2(c + r * Math.cos(t)), r2(c + r * Math.sin(t))];
  const wedges = Array.from({ length: n }, (_, i) => {
    const a0 = start + i * step;
    const a1 = a0 + step;
    const outer = [0, 1, 2, 3].map((k) => at(R, a0 + (step * k) / 3));
    return {
      poly: [at(col + 1, a0), ...outer, at(col + 1, a1)],
      z: r2((i + 1) * RISE - 5),
      h: 5
    };
  });
  const ar = 52;
  const arc = Array.from({ length: 13 }, (_, k) => at(ar, Math.PI / 2 + (k * 1.62 * Math.PI) / 12));
  return {
    id: 'stairs-spiral',
    name: 'Spiral Stairs',
    group: 'structure',
    size: { w: 2 * R, d: 2 * R, h: FLOOR },
    parts: [{ cyl: [c, c, col], z: 0, h: FLOOR, role: 'metal' }, ...wedges],
    plan: [{ circle: [c, c, R - 0.75], stroke: 'outline', weight: 'outline' }, ...arrow(arc, 10)]
  };
}

export default [
  stairsStraight(),
  stairsL(),
  stairsU(),
  stairsSpiral(),
  {
    id: 'column-square',
    name: 'Column, Square',
    group: 'structure',
    size: { w: 40, d: 40, h: 270 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 40, d: 40, h: 270, role: 'soft',
        top: [
          { line: [[0, 13], [13, 0]] },
          { line: [[0, 27], [27, 0]] },
          { line: [[0, 40], [40, 0]] },
          { line: [[13, 40], [40, 13]] },
          { line: [[27, 40], [40, 27]] }
        ]
      }
    ]
  },
  {
    id: 'column-round',
    name: 'Column, Round',
    group: 'structure',
    size: { w: 40, d: 40, h: 270 },
    parts: [
      {
        cyl: [20, 20, 20], z: 0, h: 270, role: 'soft',
        top: [
          { line: [[5.86, 5.86], [34.14, 34.14]] },
          { line: [[5.86, 34.14], [34.14, 5.86]] }
        ]
      }
    ]
  },
  {
    id: 'fireplace',
    name: 'Fireplace',
    group: 'structure',
    size: { w: 150, d: 60, h: 110 },
    parts: [
      // Chimney breast with the splayed firebox opening cut into its front.
      { poly: [[0, 0], [150, 0], [150, 40], [110, 40], [95, 12], [55, 12], [40, 40], [0, 40]], z: 0, h: 110, role: 'soft' },
      {
        poly: [[55, 12], [95, 12], [110, 40], [40, 40]], z: 0, h: 5, role: 'dark',
        top: [{ line: [[18, 12], [52, 20]], stroke: 'soft' }, { line: [[18, 20], [52, 12]], stroke: 'soft' }]
      },
      { x: 0, y: 40, z: 0, w: 150, d: 20, h: 5, role: 'ground', outline: true }
    ]
  },
  {
    id: 'lift',
    name: 'Lift',
    group: 'structure',
    size: { w: 160, d: 160, h: 270 },
    parts: [
      // Shaft walls: back and sides, then the front wall either side of the doors.
      { poly: [[0, 0], [160, 0], [160, 150], [150, 150], [150, 10], [10, 10], [10, 150], [0, 150]], z: 0, h: 270, role: 'soft' },
      { x: 0, y: 150, z: 0, w: 35, d: 10, h: 270, role: 'soft', outline: true },
      { x: 125, y: 150, z: 0, w: 35, d: 10, h: 270, role: 'soft', outline: true },
      {
        x: 12, y: 12, z: 0, w: 136, d: 136, h: 240, role: 'metal', outline: true,
        top: [{ line: [[0, 0], [136, 136]] }, { line: [[0, 136], [136, 0]] }]
      },
      { x: 35, y: 151, z: 0, w: 45, d: 4, h: 210, role: 'dark' },
      { x: 80, y: 151, z: 0, w: 45, d: 4, h: 210, role: 'dark' }
    ]
  },
  {
    id: 'ramp',
    name: 'Ramp',
    group: 'structure',
    size: { w: 120, d: 400, h: 33 },
    // A sloped solid is not a part type yet: four stepped slabs rising 1 in 12.
    parts: Array.from({ length: 4 }, (_, i) => ({
      x: 0, y: 400 - (i + 1) * 100, z: 0, w: 120, d: 100, h: r2((33 * (i + 1)) / 4), role: 'ground'
    })),
    plan: [
      heavyOutline([[0, 0], [120, 0], [120, 400], [0, 400]]),
      { line: [[0, 400], [60, 0], [120, 400]], dash: '8 6' },
      ...arrow([[60, 385], [60, 12]], 14)
    ]
  },
  {
    id: 'ladder',
    name: 'Fixed Ladder',
    group: 'structure',
    size: { w: 50, d: 30, h: 300 },
    parts: [
      { x: 0, y: 15, z: 0, w: 5, d: 8, h: 300, role: 'metal' },
      { x: 45, y: 15, z: 0, w: 5, d: 8, h: 300, role: 'metal', outline: true },
      ...Array.from({ length: 10 }, (_, i) => ({ x: 5, y: 17.5, z: 25 + i * 28, w: 40, d: 3, h: 3, role: 'metal' })),
      ...[40, 260].flatMap((z) => [
        { x: 0, y: 0, z, w: 5, d: 15, h: 5, role: 'metal' },
        { x: 45, y: 0, z, w: 5, d: 15, h: 5, role: 'metal' }
      ])
    ]
  },
  {
    id: 'skylight',
    name: 'Skylight',
    group: 'structure',
    size: { w: 60, d: 120, h: 1 },
    mount: 0,
    mountFrom: 'ceiling',
    parts: [
      // Overhead, so dashed on the plan.
      { x: 0, y: 0, z: 0, w: 60, d: 120, h: 0.5, role: 'soft', dash: '6 4' },
      { x: 5, y: 5, z: 0.5, w: 50, d: 110, h: 0.5, role: 'glass', dash: '4 3' }
    ],
    plan: [
      { line: [[5, 5], [55, 115]], dash: '5 4' },
      { line: [[5, 115], [55, 5]], dash: '5 4' }
    ]
  },
  {
    id: 'void',
    name: 'Void / Opening',
    group: 'structure',
    size: { w: 200, d: 200, h: 1 },
    parts: [{ x: 0, y: 0, z: 0, w: 200, d: 200, h: 1 }],
    plan: [{ line: [[0, 0], [200, 200]] }, { line: [[0, 200], [200, 0]] }]
  }
];
