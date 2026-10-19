// Kitchen.
//
// Under-bench units share one build: a recessed plinth, a carcass 58 deep and a
// 30 mm benchtop 60 deep, top at 90. Sinks and cooktops are base cabinets with
// something on or in the benchtop. Tall and overhead units are plain boxes.

const KICK = 10; // plinth height
const CARCASS_D = 58;
const TOP = 3; // benchtop thickness

// Plinth, carcass and benchtop. `benchZ` lets a cooktop sit on top of the bench
// without the element growing past 90. `top` decals go on the benchtop.
function underBench({ w, top = [], benchZ = 90 - TOP }) {
  const ch = benchZ - KICK;
  // Benchtop first: the first part gets the heavy outline, inset to stay inside the footprint.
  return [
    { x: 0, y: 0, z: benchZ, w, d: 60, h: TOP, role: 'soft', top },
    { x: 0, y: 0, z: KICK, w, d: CARCASS_D, h: ch },
    { x: 0, y: 0, z: 0, w, d: CARCASS_D - 5, h: KICK, role: 'soft' }
  ];
}

// The carcass face under the benchtop, dashed: says "cupboard below" on a plan.
const faceLine = (w, x0 = 0) => ({ line: [[x0 + 2, CARCASS_D], [x0 + w - 2, CARCASS_D]], dash: '3 2', view: 'plan' });

function baseCabinet({ id, name, w }) {
  return {
    id,
    name,
    group: 'kitchen',
    size: { w, d: 60, h: 90 },
    parts: underBench({
      w,
      top: [faceLine(w)]
    })
  };
}

// A tap: base on the benchtop behind the bowl, spout reaching over it.
const tap = (x, y, reach) => [
  { circle: [x, y, 2], fill: 'metal', stroke: 'outline' },
  { line: [[x, y + 2], [x, y + reach]], stroke: 'outline' }
];

// A sink: `bowls` side by side (widths in cm), stainless, each with a drain.
function sink({ id, name, w, bowls, ceramic = false }) {
  const gap = 4;
  const bw = bowls.reduce((a, b) => a + b, 0) + gap * (bowls.length - 1);
  let x = (w - bw) / 2;
  const marks = [];
  const y = ceramic ? 11 : 13;
  const bd = ceramic ? 45 : 40;
  if (ceramic) marks.push({ rect: [x - 3, y - 3, bw + 6, bd + 6], r: 5, fill: 'body', stroke: 'outline' });
  for (const b of bowls) {
    marks.push(
      { rect: [x, y, b, bd], r: 4, fill: 'glass', stroke: ceramic ? 'detail' : 'outline' },
      { circle: [x + b / 2, y + bd / 2, 2.5], fill: 'body' }
    );
    x += b + gap;
  }
  const tx = bowls.length > 1 ? (w - bw) / 2 + bowls[0] + gap / 2 : w / 2;
  return {
    id,
    name,
    group: 'kitchen',
    size: { w, d: 60, h: 90 },
    parts: underBench({ w, top: [...marks, ...tap(tx, 5, bowls.length > 1 ? 14 : 12)] })
  };
}

// A burner: flame ring and a dark cap.
const burner = (x, y, r) => [
  { circle: [x, y, r], stroke: 'outline' },
  { circle: [x, y, r * 0.45], fill: 'dark' }
];

// A chargrill module: a dark grate of bars over two burners, two knobs.
const chargrill = (w, d) => [
  { rect: [3, 3, w - 6, d - 12], r: 1, fill: 'dark', stroke: 'outline' },
  ...Array.from({ length: Math.floor((w - 10) / 3.5) }, (_, i) => ({ line: [[6.5 + i * 3.5, 5], [6.5 + i * 3.5, d - 11]], stroke: 'metal' })),
  ...[-3.5, 3.5].map((dx) => ({ circle: [w / 2 + dx, d - 4, 1.8], fill: 'dark' }))
];

// A wok burner module: a triple-ring burner under a heavy four-arm trivet.
const wokPlate = (w, d) => {
  const [cx, cy] = [w / 2, (d - 8) / 2 + 1];
  const arm = (a) => {
    const t = ((a + 45) * Math.PI) / 180;
    const p = (r) => [+(cx + r * Math.cos(t)).toFixed(2), +(cy + r * Math.sin(t)).toFixed(2)];
    return { line: [p(8), p(15.5)], stroke: 'outline', weight: 'outline' };
  };
  return [
    { circle: [cx, cy, 13], stroke: 'outline' },
    { circle: [cx, cy, 9] },
    { circle: [cx, cy, 4.5], fill: 'dark' },
    ...[0, 90, 180, 270].map(arm),
    { circle: [cx, d - 4, 2.2], fill: 'dark' }
  ];
};

// A gas hob plate: burners as [x, y, r] in plate cm, one knob per burner along the front.
function hobPlate(w, d, burners) {
  const kx = (i) => w / 2 + (i - (burners.length - 1) / 2) * 7;
  return [
    ...burners.flatMap(([x, y, r]) => burner(x, y, r)),
    ...burners.map((_, i) => ({ circle: [kx(i), d - 4, 1.8], fill: 'dark' }))
  ];
}

// `plate` replaces the gas burners, for grill and wok modules.
function cooktop({ id, name, w, burners, plate }) {
  const pw = w - 4;
  return {
    id,
    name,
    group: 'kitchen',
    size: { w, d: 60, h: 90 },
    parts: [
      ...underBench({ w, benchZ: 90 - TOP - 1 }),
      { x: 2, y: 4, z: 89, w: pw, d: 52, h: 1, role: 'metal', outline: true, r: 1, top: plate ? plate(pw, 52) : hobPlate(pw, 52, burners) }
    ]
  };
}

// A full-height cupboard: tall box with the diagonal cross plans use for tall units.
export function tallCupboard({ id, name, group, w, d, h, extra = [] }) {
  return {
    id,
    name,
    group,
    size: { w, d, h },
    parts: [
      {
        x: 0, y: 0, z: 0, w, d, h,
        top: [{ line: [[0, 0], [w, d]], view: 'plan' }, { line: [[w, 0], [0, d]], view: 'plan' }, ...extra]
      }
    ]
  };
}

export default [
  { ...baseCabinet({ id: 'base-cabinet-600', name: 'Base Cabinet 600', w: 60 }), surface: 90 },
  { ...baseCabinet({ id: 'base-cabinet-900', name: 'Base Cabinet 900', w: 90 }), surface: 90 },
  {
    id: 'corner-cabinet',
    name: 'Corner Base Cabinet',
    group: 'kitchen',
    size: { w: 90, d: 90, h: 90 },
    surface: 90,
    // Walls at the top and the left; the L opens to the bottom right.
    parts: [
      {
        poly: [[0.75, 0.75], [89.25, 0.75], [89.25, 59.25], [59.25, 59.25], [59.25, 89.25], [0.75, 89.25]], z: 87, h: TOP, role: 'soft',
        top: [{ line: [[87.25, 57.25], [57.25, 57.25], [57.25, 87.25]], dash: '3 2', view: 'plan' }]
      },
      { poly: [[0, 0], [90, 0], [90, 58], [58, 58], [58, 90], [0, 90]], z: KICK, h: 77 },
      { poly: [[0, 0], [90, 0], [90, 53], [53, 53], [53, 90], [0, 90]], z: 0, h: KICK, role: 'soft' }
    ]
  },
  {
    id: 'wall-cabinet-600',
    name: 'Wall Cabinet 600',
    group: 'kitchen',
    size: { w: 60, d: 35, h: 70 },
    mount: 145,
    mountFrom: 'floor',
    // Overhead: dashed cross, the plan convention for units above the cut line.
    parts: [
      {
        x: 0, y: 0, z: 0, w: 60, d: 35, h: 70,
        top: [{ line: [[0, 0], [60, 35]], dash: '3 2', view: 'plan' }, { line: [[60, 0], [0, 35]], dash: '3 2', view: 'plan' }]
      }
    ]
  },
  tallCupboard({
    id: 'pantry', name: 'Pantry Cupboard', group: 'kitchen', w: 60, d: 60, h: 220
  }),
  sink({ id: 'sink-single', name: 'Sink, Single Bowl', w: 60, bowls: [44] }),
  sink({ id: 'sink-double', name: 'Sink, Double Bowl', w: 120, bowls: [44, 44] }),
  sink({ id: 'butler-sink', name: "Butler's Sink", w: 80, bowls: [62], ceramic: true }),
  cooktop({ id: 'cooktop', name: 'Cooktop, 4 Burner', w: 60, burners: [[14, 14, 8], [42, 14, 6], [14, 36, 6], [42, 36, 7]] }),
  // Domino modules: narrow cooktops set side by side along a benchtop.
  cooktop({ id: 'cooktop-2', name: 'Cooktop, 2 Burner', w: 30, burners: [[13, 14, 7], [13, 36, 6]] }),
  cooktop({ id: 'cooktop-grill', name: 'Chargrill, 2 Burner', w: 40, plate: chargrill }),
  cooktop({ id: 'cooktop-wok', name: 'Wok Burner', w: 40, plate: wokPlate }),
  cooktop({ id: 'cooktop-5', name: 'Cooktop, 5 Burner', w: 90, burners: [[15, 14, 7], [15, 36, 6], [43, 25, 10], [71, 14, 6], [71, 36, 7]] }),
  {
    id: 'oven-freestanding',
    name: 'Freestanding Oven',
    group: 'kitchen',
    size: { w: 60, d: 60, h: 90 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 60, d: 60, h: 88, role: 'metal', r: 1,
        top: [{ line: [[1, 54], [59, 54]], view: 'plan' }]
      },
      { x: 1, y: 1, z: 88, w: 58, d: 52, h: 2, role: 'dark', outline: true, top: [[14, 14, 8], [42, 14, 6], [14, 37, 6], [42, 37, 7]].map(([x, y, r]) => ({ circle: [x, y, r], stroke: 'soft' })) }
    ],
    plan: [12, 24, 36, 48].map((x) => ({ circle: [x, 57, 1.8], fill: 'dark' }))
  },
  tallCupboard({
    id: 'wall-oven', name: 'Wall Oven Tower', group: 'kitchen', w: 60, d: 60, h: 220,
    extra: [{ line: [[4, 3], [56, 3], [56, 57], [4, 57]], closed: true, dash: '3 2', view: 'plan' }]
  }),
  {
    id: 'rangehood',
    name: 'Rangehood',
    group: 'kitchen',
    size: { w: 90, d: 50, h: 60 },
    mount: 160,
    mountFrom: 'floor',
    // Canopy and chimney. Ridges from the chimney to the canopy corners read as
    // a hood from above; dashed like every other overhead unit's cross.
    parts: [
      {
        x: 0, y: 0, z: 0, w: 90, d: 50, h: 8, role: 'metal',
        top: [
          { line: [[33, 25], [0, 50]], dash: '3 2', view: 'plan' },
          { line: [[57, 25], [90, 50]], dash: '3 2', view: 'plan' }
        ]
      },
      { x: 33, y: 0.75, z: 8, w: 24, d: 24.25, h: 52, role: 'metal', outline: true }
    ]
  },
  {
    id: 'fridge',
    name: 'Fridge',
    group: 'kitchen',
    size: { w: 70, d: 70, h: 180 },
    parts: [
      { x: 0, y: 0, z: 0, w: 70, d: 64, h: 180, r: 2, top: [{ line: [[6, 4], [64, 4]], view: 'plan' }, { line: [[6, 7], [64, 7]], view: 'plan' }] },
      {
        x: 0.75, y: 64, z: 1, w: 68.5, d: 4.25, h: 178, outline: true
      },
      { x: 62, y: 68.25, z: 60, w: 4, d: 1.5, h: 90, role: 'metal' }
    ]
  },
  {
    id: 'fridge-french',
    name: 'Fridge, French Door',
    group: 'kitchen',
    size: { w: 90, d: 75, h: 180 },
    parts: [
      { x: 0, y: 0, z: 0, w: 90, d: 69, h: 180, r: 2, top: [{ line: [[6, 4], [84, 4]], view: 'plan' }, { line: [[6, 7], [84, 7]], view: 'plan' }] },
      { x: 0.75, y: 69, z: 60, w: 43.75, d: 4.25, h: 119, outline: true },
      { x: 45.5, y: 69, z: 60, w: 43.75, d: 4.25, h: 119, outline: true },
      { x: 0.75, y: 69, z: 1, w: 88.5, d: 4.25, h: 58, outline: true },
      { x: 39, y: 73.25, z: 90, w: 3, d: 1.5, h: 70, role: 'metal' },
      { x: 48, y: 73.25, z: 90, w: 3, d: 1.5, h: 70, role: 'metal' }
    ]
  },
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    group: 'kitchen',
    size: { w: 60, d: 60, h: 85 },
    // Under-bench: the benchtop over it is the neighbouring run's. Racks dashed
    // inside, stainless door at the front.
    parts: [
      {
        x: 0, y: 0, z: 0, w: 60, d: 56, h: 85,
        top: [{ rect: [5, 5, 50, 20], dash: '3 2', view: 'plan' }, { rect: [5, 29, 50, 22], dash: '3 2', view: 'plan' }]
      },
      {
        x: 0.75, y: 56, z: 8, w: 58.5, d: 3.25, h: 77, role: 'metal', outline: true,
        top: [{ rect: [40, 1, 14, 2], fill: 'dark', stroke: 'dark' }]
      }
    ]
  },
  {
    id: 'microwave',
    name: 'Microwave',
    group: 'kitchen',
    size: { w: 50, d: 40, h: 30 },
    mountFrom: 'surface',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 50, d: 37, h: 30, r: 1,
        top: [{ line: [[3, 5], [30, 5]], view: 'plan' }, { line: [[3, 9], [30, 9]], view: 'plan' }, { line: [[3, 13], [30, 13]], view: 'plan' }]
      },
      {
        x: 0.5, y: 37, z: 0, w: 49, d: 2.5, h: 30, role: 'dark', outline: true
      }
    ]
  },
  {
    id: 'island-bench',
    name: 'Island Bench',
    group: 'kitchen',
    size: { w: 240, d: 100, h: 90 },
    surface: 90,
    // Cupboards open to the front; the benchtop overhangs 35 at the back for stools.
    parts: [
      {
        x: 0, y: 0, z: 87, w: 240, d: 100, h: TOP, role: 'soft',
        top: [{ line: [[2, 35], [238, 35], [238, 98], [2, 98]], closed: true, dash: '3 2', view: 'plan' }]
      },
      { x: 0, y: 35, z: KICK, w: 240, d: 63, h: 77 },
      { x: 5, y: 40, z: 0, w: 230, d: 53, h: KICK, role: 'soft' }
    ]
  },
  {
    id: 'breakfast-bar',
    name: 'Breakfast Bar',
    group: 'kitchen',
    size: { w: 180, d: 50, h: 105 },
    surface: 105,
    // A raised top on a back panel; stools pull up at the front.
    parts: [
      { x: 0, y: 0, z: 102, w: 180, d: 50, h: TOP, role: 'wood', r: 1, top: [{ line: [[2, 12], [178, 12]], dash: '3 2', view: 'plan' }] },
      { x: 0, y: 0, z: 0, w: 180, d: 12, h: 102 }
    ]
  },
  {
    id: 'kitchen-bin',
    name: 'Kitchen Bin',
    group: 'kitchen',
    size: { w: 40, d: 35, h: 65 },
    // Pedal bin: lid hinged at the back, pedal at the front.
    parts: [
      { x: 0, y: 0, z: 60, w: 40, d: 32, h: 5, role: 'metal', r: 5, top: [{ line: [[4, 5], [36, 5]] }] },
      { x: 0, y: 0, z: 0, w: 40, d: 32, h: 60, role: 'metal', r: 5 },
      { x: 12, y: 32, z: 0, w: 16, d: 3, h: 3, role: 'dark' }
    ]
  }
];
