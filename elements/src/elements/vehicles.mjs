// Vehicles and EV charging. Every vehicle faces the front of the plan: rear
// at y = 0 (the top), nose at y = d (the bottom), so a vehicle placed against a
// wall backs onto it.

// Car, nose to the front (bottom of the plan): body, cabin with windscreen and
// rear window, mirrors, and the tyres showing just past the body sides.
const car = (() => {
  const w = 185;
  const d = 470;
  const body = [
    [25, 2], [160, 2], [175, 10], [180, 30], [180, 440], [172, 461], [150, 469],
    [35, 469], [13, 461], [5, 440], [5, 30], [10, 10]
  ];
  const cabin = [
    [30, 112], [155, 112], [166, 132], [168, 338], [156, 350], [29, 350], [17, 338], [19, 132]
  ];
  const wheel = (x, y) => ({ x, y, z: 0, w: 20, d: 66, h: 30, role: 'dark', r: 4 });
  return {
    id: 'car',
    name: 'Car, Sedan',
    group: 'vehicles',
    size: { w, d, h: 150 },
    parts: [
      {
        poly: body, z: 30, h: 65, outline: true,
        top: [
          { line: [[45, 352], [40, 440]] },
          { line: [[140, 352], [145, 440]] },
          { rect: [17, 450, 30, 8], r: 3, fill: 'glass' },
          { rect: [138, 450, 30, 8], r: 3, fill: 'glass' }
        ]
      },
      wheel(0, 48), wheel(165, 48), wheel(0, 348), wheel(165, 348),
      {
        poly: cabin, z: 95, h: 55, role: 'soft', outline: true,
        top: [
          { line: [[12, 50], [137, 50], [141, 180], [8, 180]], closed: true, fill: 'body' },
          { line: [[3, 180], [146, 180], [148, 238], [0, 238]], closed: true, fill: 'glass' },
          { line: [[11, 6], [136, 6], [140, 38], [7, 38]], closed: true, fill: 'glass' }
        ]
      },
      { x: 0, y: 316, z: 95, w: 15, d: 9, h: 9, r: 3, outline: true },
      { x: 170, y: 316, z: 95, w: 15, d: 9, h: 9, r: 3, outline: true }
    ]
  };
})();

// Bicycle, front wheel at the bottom: tyres, frame, cranks, saddle, bars.
const bicycle = {
  id: 'bicycle',
  name: 'Bicycle',
  group: 'vehicles',
  size: { w: 60, d: 175, h: 100 },
  parts: [
    { x: 27.5, y: 0, z: 0, w: 5, d: 68, h: 68, role: 'dark', r: 2.5, outline: true },
    { x: 27.5, y: 107, z: 0, w: 5, d: 68, h: 68, role: 'dark', r: 2.5, outline: true },
    { x: 28.5, y: 68, z: 30, w: 3, d: 39, h: 40, role: 'metal' },
    { x: 20, y: 80, z: 25, w: 20, d: 4, h: 5, role: 'metal' },
    { poly: [[23, 24], [37, 24], [36, 32], [32, 48], [28, 48], [24, 32]], z: 88, h: 8, role: 'dark' },
    { x: 2, y: 118, z: 95, w: 56, d: 4, h: 5, r: 2, role: 'metal', outline: true, top: [{ rect: [0, 0, 10, 4], r: 2, fill: 'dark' }, { rect: [46, 0, 10, 4], r: 2, fill: 'dark' }] }
  ]
};

// A four-wheeled vehicle: body, tyres just past the body sides, a cabin roof
// with windscreen and (optionally) rear window, headlights at the nose.
// `cabin` is [back, front] in y; `wheels` the rear and front tyre centres.
// `rear` is for what sits behind the body: a ute tray or a 4WD's spare wheel.
function vehicle({ id, name, w, d, h, cabin: [c0, c1], wheels: [wr, wf], bodyH = 65, rearWindow = true, y0 = 1, extra = [], roof = [] }) {
  const tw = 20; // tyre width
  const tl = 66; // tyre length in plan
  const body = [
    [14, y0], [w - 14, y0], [w - 4, y0 + 10], [w - 4, d - 40], [w - 12, d - 13], [w - 32, d - 1],
    [32, d - 1], [12, d - 13], [4, d - 40], [4, y0 + 10]
  ];
  const cw = w - 28; // cabin width at the back
  const cabinPoly = [[16, c0], [w - 16, c0], [w - 14, c1 - 30], [w - 26, c1], [26, c1], [14, c1 - 30]];
  const cl = c1 - c0;
  const wheel = (x, y) => ({ x, y: y - tl / 2, z: 0, w: tw, d: tl, h: 30, role: 'dark', r: 4 });
  return {
    id,
    name,
    group: 'vehicles',
    size: { w, d, h },
    parts: [
      {
        poly: body, z: 30, h: bodyH, outline: true,
        top: [
          { rect: [14, d - y0 - 24, 30, 9], r: 3, fill: 'glass' },
          { rect: [w - 52, d - y0 - 24, 30, 9], r: 3, fill: 'glass' }
        ]
      },
      wheel(0, wr), wheel(w - tw, wr), wheel(0, wf), wheel(w - tw, wf),
      {
        poly: cabinPoly, z: 30 + bodyH, h: h - 30 - bodyH, role: 'soft', outline: true,
        top: [
          ...(rearWindow ? [{ line: [[6, 5], [cw - 2, 5], [cw - 1, 32], [5, 32]], closed: true, fill: 'glass' }] : []),
          { line: [[2, cl - 88], [w - 30, cl - 88], [w - 38, cl - 4], [10, cl - 4]], closed: true, fill: 'glass' },
          ...roof
        ]
      },
      { x: 0, y: c1 - 38, z: 30 + bodyH, w: 15, d: 9, h: 9, r: 3, outline: true },
      { x: w - 15, y: c1 - 38, z: 30 + bodyH, w: 15, d: 9, h: 9, r: 3, outline: true },
      ...extra
    ]
  };
}

// Motorbike, front wheel at the bottom: tyres, seat over the rear, tank ahead
// of it, engine beneath, then bars and mirrors.
const motorbike = {
  id: 'motorbike',
  name: 'Motorbike',
  group: 'vehicles',
  size: { w: 80, d: 210, h: 115 },
  parts: [
    { x: 31, y: 0, z: 0, w: 18, d: 64, h: 64, role: 'dark', r: 6, outline: true },
    { x: 32, y: 146, z: 0, w: 16, d: 64, h: 64, role: 'dark', r: 6, outline: true },
    { x: 26, y: 70, z: 25, w: 28, d: 40, h: 35, role: 'metal' },
    { poly: [[29, 38], [51, 38], [53, 92], [27, 92]], z: 70, h: 12, role: 'dark', outline: true },
    { poly: [[26, 94], [54, 94], [52, 126], [44, 136], [36, 136], [28, 126]], z: 70, h: 20, role: 'soft', outline: true, top: [{ line: [[14, 4], [14, 38]], stroke: 'outline' }] },
    { x: 4, y: 140, z: 95, w: 72, d: 5, h: 4, r: 2, role: 'metal', outline: true, top: [{ rect: [0, 0, 12, 5], r: 2, fill: 'dark' }, { rect: [60, 0, 12, 5], r: 2, fill: 'dark' }] },
    { x: 14, y: 134, z: 100, w: 10, d: 5, h: 6, r: 2, outline: true },
    { x: 56, y: 134, z: 100, w: 10, d: 5, h: 6, r: 2, outline: true },
    { x: 33, y: 190, z: 64, w: 14, d: 10, h: 8, r: 3, role: 'glass', outline: true }
  ]
};

// Box trailer, 7 × 4 ft: a steel tub over one axle, mudguards, and the A-frame
// drawbar with its coupling to the front.
const trailer = {
  id: 'trailer-box',
  name: 'Box Trailer, 7 × 4',
  group: 'vehicles',
  size: { w: 170, d: 330, h: 90 },
  parts: [
    {
      x: 24, y: 0, z: 45, w: 122, d: 213, h: 45, role: 'metal', outline: true, r: 2,
      top: [{ rect: [3, 3, 116, 207], r: 1 }, ...[50, 100, 150].map((v) => ({ line: [[3, v], [119, v]], dash: '4 3' }))]
    },
    { x: 0, y: 80, z: 45, w: 24, d: 70, h: 20, r: 6, role: 'soft', outline: true },
    { x: 146, y: 80, z: 45, w: 24, d: 70, h: 20, r: 6, role: 'soft', outline: true },
    { x: 4, y: 83, z: 0, w: 18, d: 64, h: 45, role: 'dark', r: 4 },
    { x: 148, y: 83, z: 0, w: 18, d: 64, h: 45, role: 'dark', r: 4 },
    { poly: [[30, 213], [44, 213], [88, 318], [82, 318]], z: 40, h: 8, role: 'metal', outline: true },
    { poly: [[126, 213], [140, 213], [88, 318], [82, 318]], z: 40, h: 8, role: 'metal', outline: true },
    { cyl: [85, 322, 7], z: 40, h: 8, role: 'dark', outline: true }
  ]
};

// EV charger, wall-mounted: a home wallbox bolted to a garage wall. On a
// plan it is its own footprint off the wall, with the power strip on its front
// edge like the wall panels in comms.mjs.
const evChargerWall = {
  id: 'ev-charger-wall',
  name: 'EV Charger, Wall-Mounted',
  group: 'vehicles',
  tags: ['power'],
  size: { w: 25, d: 12, h: 35 },
  mount: 110,
  mountFrom: 'floor',
  parts: [
    {
      x: 0, y: 0, z: 0, w: 25, d: 12, h: 35, r: 3,
      top: [{ rect: [6.5, 8.5, 12, 2.5], r: 1, accent: 'power', view: 'plan' }]
    }
  ]
};

// EV charger, pedestal: a car-park post with a screen and two holstered plugs.
const evChargerPedestal = {
  id: 'ev-charger-pedestal',
  name: 'EV Charger, Pedestal',
  group: 'vehicles',
  tags: ['power'],
  size: { w: 40, d: 30, h: 140 },
  parts: [
    {
      x: 5, y: 3, z: 10, w: 30, d: 24, h: 130, r: 4, role: 'body', outline: true,
      top: [
        { rect: [6, 17, 18, 4], r: 1, fill: 'dark' },
        { rect: [12, 3, 6, 3], accent: 'power' }
      ]
    },
    { x: 0, y: 0, z: 0, w: 40, d: 30, h: 10, r: 2, role: 'soft' }
  ],
  plan: [
    { circle: [3.5, 18, 3], fill: 'dark', stroke: 'outline' },
    { circle: [36.5, 18, 3], fill: 'dark', stroke: 'outline' }
  ]
};

export default [
  car,
  vehicle({ id: 'station-wagon', name: 'Station Wagon', w: 185, d: 480, h: 150, cabin: [60, 330], wheels: [95, 385], roof: [{ line: [[14, 40], [14, 200]] }, { line: [[143, 40], [143, 200]] }] }),
  vehicle({
    id: 'ute', name: 'Ute (Pickup)', w: 186, d: 530, h: 180, cabin: [175, 395], wheels: [110, 440], bodyH: 70,
    extra: [{ x: 12, y: 8, z: 100, w: 162, d: 162, h: 4, role: 'metal', outline: true, top: [{ rect: [4, 4, 154, 154], r: 2 }, ...[40, 81, 122].map((u) => ({ line: [[u, 8], [u, 150]] }))] }]
  }),
  vehicle({
    id: 'van', name: 'Van', w: 170, d: 527, h: 200, cabin: [12, 430], wheels: [100, 435], bodyH: 70, rearWindow: false,
    roof: [60, 140, 220, 300].map((v) => ({ line: [[12, v], [130, v]] }))
  }),
  vehicle({
    id: '4wd', name: '4WD', w: 198, d: 500, h: 195, cabin: [70, 370], wheels: [120, 405], bodyH: 75, y0: 24,
    roof: [{ line: [[14, 20], [14, 250]], weight: 'outline' }, { line: [[156, 20], [156, 250]], weight: 'outline' }],
    extra: [{ x: 64, y: 0, z: 50, w: 70, d: 24, h: 70, r: 10, role: 'dark', outline: true, top: [{ rect: [20, 4, 30, 16], r: 6, fill: 'metal' }] }]
  }),
  motorbike,
  bicycle,
  trailer,
  evChargerWall,
  evChargerPedestal
];
