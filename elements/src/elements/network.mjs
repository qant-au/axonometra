// Networking and AV. Desk and shelf devices are dark boxes with a status
// strip in the tag colour on the front edge of the top (as the racks in
// comms.mjs). Ceiling and wall devices are plan symbols (see README, "Symbols").

// The status strip at the front edge of the top, as on the racks.
const strip = (w, d, accent) => {
  const s = Math.min(10, Math.round(w * 0.3));
  return { rect: [w / 2 - s / 2, d - 3, s, 2], r: 0.5, accent, view: 'plan' };
};

// Vent slots across the back of the top.
const vents = (w, n, y0 = 3, gap = 2) =>
  Array.from({ length: n }, (_, i) => ({ line: [[w * 0.2, y0 + i * gap], [w * 0.8, y0 + i * gap]] }));

// A low desktop box: switch, router, firewall, NBN box.
function appliance({ id, name, tags, w, d, h, mount, role = 'dark', accent = tags[0] }) {
  return {
    id, name, group: 'network', tags,
    size: { w, d, h },
    ...(mount ? { mount, mountFrom: 'floor' } : {}),
    parts: [
      {
        x: 0, y: 0, z: 0, w, d, h, role, r: 1,
        top: [...vents(w, 3), strip(w, d, accent)]
      }
    ]
  };
}

// A tower case standing on its narrow side: front bezel faces the user.
function tower({ id, name, w, d, h }) {
  return {
    id, name, group: 'network', tags: ['network'],
    size: { w, d, h },
    parts: [
      {
        x: 0, y: 0, z: 0, w, d, h, role: 'dark', r: 1,
        top: [
          ...[0.3, 0.5, 0.7].map((k) => ({ line: [[w * k, d * 0.25], [w * k, d * 0.6]] })),
          strip(w, d, 'network')
        ]
      }
    ]
  };
}

// A desktop monitor: panel on a neck and a flat foot that reaches the front.
// `radius` curves the panel (e.g. 180 for an 1800R ultrawide): its ends come
// towards the viewer, so the plan shows the curve.
function monitor({ id, name, w, h, radius, foot = 24 }) {
  const sag = radius ? radius - Math.sqrt(radius ** 2 - (w / 2) ** 2) : 0;
  const y0 = 6;
  const panelTop = [{ rect: [w - 11, 1.8 + sag, 4, 1.2], accent: 'network', view: 'plan' }];
  let panel = { x: 0, y: y0, z: 10, w, d: 3, h, role: 'dark', r: 1, top: panelTop };
  if (radius) {
    const n = 10;
    const back = Array.from({ length: n + 1 }, (_, i) => {
      const x = (w * i) / n;
      return [+x.toFixed(2), +(y0 + sag * ((x - w / 2) / (w / 2)) ** 2).toFixed(2)];
    });
    const frontEdge = back.map(([x, y]) => [x, +(y + 3).toFixed(2)]).reverse();
    panel = { poly: [...back, ...frontEdge], z: 10, h, role: 'dark', top: [{ rect: [w - 11, 1.8 + sag * 0.8, 4, 1.2], accent: 'network', view: 'plan' }] };
  }
  return {
    id,
    name,
    group: 'network',
    tags: ['network'],
    size: { w, d: Math.max(20, Math.ceil(y0 + sag + 5)), h: 10 + h },
    parts: [
      panel,
      { x: (w - 6) / 2, y: 2, z: 2, w: 6, d: 4, h: 28, role: 'metal' },
      { x: (w - foot) / 2, y: 2, z: 0, w: foot, d: 16, h: 2, role: 'metal', r: 4, outline: true }
    ]
  };
}

// A wall-mounted display: a thin dark panel off a wall bracket, the AV mark on
// its top edge. Sizes are the panel with bezel; the centre sits 152 cm up.
function wallDisplay({ id, name, w, h }) {
  return {
    id,
    name,
    group: 'network',
    tags: ['av'],
    size: { w, d: 10, h },
    mount: Math.round(152 - h / 2),
    mountFrom: 'floor',
    parts: [
      { x: 0, y: 4, z: 0, w, d: 6, h, role: 'dark', r: 1 },
      { x: w / 2 - 20, y: 0, z: h / 2 - 20, w: 40, d: 4, h: 40, role: 'metal' }
    ],
    plan: [{ rect: [w / 2 - 10, 8.3, 20, 1.2], accent: 'av' }]
  };
}

// A motorised roller screen, the fabric let down: the 10 cm case at the top,
// the fabric hanging to a bottom bar. Only its mounting differs by variant.
function projectorScreen({ id, name, mount, mountFrom }) {
  return {
    id,
    name,
    group: 'network',
    tags: ['av'],
    size: { w: 240, d: 15, h: 180 },
    mount,
    mountFrom,
    parts: [
      {
        x: 0, y: 0, z: 170, w: 240, d: 15, h: 10, r: 3,
        top: [{ line: [[8, 7.5], [232, 7.5]], dash: '4 3' }, { rect: [220, 10, 12, 2.5], accent: 'av' }]
      },
      { x: 6, y: 7, z: 2, w: 228, d: 1, h: 168 },
      { x: 6, y: 6, z: 0, w: 228, d: 3, h: 2, role: 'metal' }
    ]
  };
}

export default [
  // Ceiling access point: a flat disc with a status ring.
  {
    id: 'wifi-ap',
    name: 'Wi-Fi Access Point',
    group: 'network',
    tags: ['network'],
    size: { w: 22, d: 22, h: 4 },
    mount: 0,
    mountFrom: 'ceiling',
    facing: 'down',
    symbol: {
      frame: 'circle',
      glyph: [
        { arc: [20, 28, 16, 225, 315], weight: 'outline' },
        { arc: [20, 28, 10.5, 225, 315], weight: 'outline' },
        { arc: [20, 28, 5, 225, 315], weight: 'outline' },
        { circle: [20, 28, 2.2], accent: 'network' }
      ]
    },
    parts: [{ cyl: [11, 11, 11], z: 0, h: 4, top: [{ circle: [11, 11, 3], stroke: 'network' }, { circle: [11, 11, 1], accent: 'network' }] }]
  },

  { ...appliance({ id: 'network-switch', name: 'Network Switch (Desktop)', tags: ['network'], w: 44, d: 30, h: 5 }), mountFrom: 'surface' },
  { ...appliance({ id: 'router', name: 'Router', tags: ['network'], w: 30, d: 20, h: 5 }), mountFrom: 'surface' },
  appliance({ id: 'modem-nbn', name: 'NBN Connection Box', tags: ['network'], w: 30, d: 20, h: 10, mount: 30, role: 'body' }),

  // Wall data outlet, double: a plate with two jacks. Plan symbol: the data
  // triangle, base against the wall (top), with the two ports.
  {
    id: 'data-outlet',
    name: 'Data Outlet',
    group: 'network',
    tags: ['network'],
    size: { w: 7, d: 1.5, h: 11.5 },
    mount: 30,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { line: [[7, 9], [33, 9], [20, 33]], closed: true, weight: 'outline' },
        { rect: [13, 12.5, 5, 4.5], accent: 'network' },
        { rect: [22, 12.5, 5, 4.5], accent: 'network' }
      ]
    },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 7, d: 1.5, h: 11.5, r: 0.5
      }
    ]
  },

  // Floor box: flush lid over a recessed tub, data on the left, power on the right.
  {
    id: 'floor-box',
    name: 'Floor Box',
    group: 'network',
    tags: ['network', 'power'],
    size: { w: 40, d: 40, h: 10 },
    parts: [
      {
        x: 0, y: 0, z: 9, w: 40, d: 40, h: 1, role: 'metal', r: 2,
        top: [
          { rect: [4, 4, 32, 32], r: 1 },
          { line: [[20, 7], [20, 33]] },
          { rect: [8, 26, 8, 3], accent: 'network' },
          { rect: [24, 26, 8, 3], accent: 'power' },
          { rect: [10, 10, 4, 10], r: 1 },
          { rect: [26, 10, 4, 10], r: 1 }
        ]
      },
      { x: 1, y: 1, z: 0, w: 38, d: 38, h: 9, role: 'dark' }
    ]
  },

  // Ceiling projector on a drop pole; the lens faces the front (bottom).
  // Authored as it hangs (ceiling plate on top), so it faces up.
  {
    id: 'projector',
    name: 'Ceiling Projector',
    group: 'network',
    tags: ['av'],
    size: { w: 35, d: 30, h: 25 },
    mount: 0,
    mountFrom: 'ceiling',
    symbol: {
      frame: 'circle',
      glyph: [
        { line: [[16, 25], [9, 34]], stroke: 'detail' },
        { line: [[24, 25], [31, 34]], stroke: 'detail' },
        { rect: [8, 9, 24, 13], r: 2, fill: 'dark', stroke: 'outline' },
        { rect: [16, 22, 8, 3], accent: 'av' }
      ]
    },
    parts: [
      { x: 0, y: 0, z: 0, w: 35, d: 26, h: 12, r: 2, top: [{ rect: [4, 4, 12, 6], stroke: 'detail' }] },
      { x: 20, y: 26, z: 2, w: 10, d: 4, h: 8, role: 'dark' },
      { x: 15, y: 10, z: 12, w: 5, d: 5, h: 10, role: 'metal' },
      { x: 10, y: 7, z: 22, w: 15, d: 11, h: 3, role: 'metal' }
    ]
  },

  // Motorised roller screen: case at the top, fabric hanging to a bottom bar.
  // Hung from the ceiling (the default), on a wall, or with its case recessed
  // into the ceiling so only the fabric shows.
  projectorScreen({ id: 'projector-screen', name: 'Projector Screen, Ceiling-Mounted', mount: 0, mountFrom: 'ceiling' }),
  projectorScreen({ id: 'projector-screen-wall', name: 'Projector Screen, Wall-Mounted', mount: 90, mountFrom: 'floor' }),
  projectorScreen({ id: 'projector-screen-in-ceiling', name: 'Projector Screen, In-Ceiling', mount: -10, mountFrom: 'ceiling' }),

  // Ceiling speaker: round grille flush with the ceiling, back can above.
  // Authored facing up (grille on top) and installed facing down.
  {
    id: 'speaker-ceiling',
    name: 'Ceiling Speaker',
    group: 'network',
    tags: ['av'],
    size: { w: 21, d: 21, h: 12 },
    mount: -11, // recessed: the can in the void, the 1 cm grille ring below
    mountFrom: 'ceiling',
    facing: 'down',
    symbol: {
      frame: 'circle',
      glyph: [
        { rect: [9, 16, 5, 8], fill: 'dark', stroke: 'outline' },
        { line: [[14, 16], [21, 10], [21, 30], [14, 24]], closed: true, fill: 'dark', stroke: 'outline' },
        { arc: [22, 20, 5, -45, 45], stroke: 'av', weight: 'outline' },
        { arc: [22, 20, 10, -45, 45], stroke: 'av', weight: 'outline' }
      ]
    },
    parts: [
      { cyl: [10.5, 10.5, 8], z: 0, h: 11, role: 'metal' },
      { cyl: [10.5, 10.5, 10.5], z: 11, h: 1 }
    ]
  },

  // Video bar under the display: camera in the middle, speakers either side.
  {
    id: 'video-bar',
    name: 'Video Conferencing Bar',
    group: 'network',
    tags: ['av'],
    size: { w: 90, d: 10, h: 10 },
    mount: 150,
    mountFrom: 'floor',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 90, d: 10, h: 10, role: 'dark', r: 3,
        top: [{ circle: [45, 6.5, 2.2], accent: 'av' }]
      }
    ]
  },

  tower({ id: 'pc-tower', name: 'Desktop PC', w: 20, d: 45, h: 45 }),

  { ...monitor({ id: 'monitor-24', name: 'Monitor, 24"', w: 54, h: 32 }), mountFrom: 'surface' },
  { ...monitor({ id: 'monitor', name: 'Monitor, 27"', w: 62, h: 35 }), mountFrom: 'surface' },
  { ...monitor({ id: 'monitor-34-ultrawide', name: 'Monitor, Ultrawide 34"', w: 81, h: 37, radius: 180, foot: 30 }), mountFrom: 'surface' },
  { ...monitor({ id: 'monitor-38-ultrawide', name: 'Monitor, Ultrawide 38"', w: 90, h: 40, radius: 230, foot: 30 }), mountFrom: 'surface' },
  { ...monitor({ id: 'monitor-49-ultrawide', name: 'Monitor, Super-Ultrawide 49"', w: 120, h: 36, radius: 180, foot: 34 }), mountFrom: 'surface' },
  // Two 27" monitors on a desk-clamped arm: the pole at the back, a crossbar,
  // and a panel on each end.
  {
    id: 'monitor-arm-dual',
    name: 'Dual Monitor Arm, 2 × 27"',
    group: 'network',
    tags: ['network'],
    size: { w: 126, d: 16, h: 60 },
    mountFrom: 'surface',
    parts: [
      ...[0, 64].map((x) => ({
        x, y: 11, z: 22, w: 62, d: 3, h: 35, role: 'dark', r: 1, outline: true,
        top: [{ rect: [51, 1.8, 4, 1.2], accent: 'network', view: 'plan' }]
      })),
      { x: 20, y: 5, z: 36, w: 86, d: 3, h: 3, role: 'metal', outline: true },
      { cyl: [63, 4, 2.5], z: 3, h: 50, role: 'metal', outline: true },
      { x: 56, y: 0, z: 0, w: 14, d: 9, h: 3, r: 1, role: 'metal' }
    ]
  },
  wallDisplay({ id: 'display-wall-43', name: 'Wall Display, 43"', w: 97, h: 56 }),
  wallDisplay({ id: 'display-wall-55', name: 'Wall Display, 55"', w: 124, h: 71 }),
  wallDisplay({ id: 'display-wall-75', name: 'Wall Display, 75"', w: 168, h: 96 }),
  wallDisplay({ id: 'display-wall-86', name: 'Wall Display, 86"', w: 193, h: 110 }),

  // Laptop, open: the plan shows the keyboard and trackpad below the lid.
  {
    id: 'laptop',
    name: 'Laptop',
    group: 'network',
    tags: ['network'],
    size: { w: 34, d: 24, h: 23 },
    mountFrom: 'surface',
    parts: [
      {
        x: 0, y: 1.5, z: 0, w: 34, d: 22.5, h: 2, role: 'metal', r: 1.5,
        top: [
          { rect: [3, 2, 28, 10], r: 0.5, fill: 'soft' },
          { rect: [12, 13.5, 10, 7], r: 0.5 },
          { rect: [29, 20.5, 2.5, 1], accent: 'network' }
        ]
      },
      { x: 0, y: 0, z: 0, w: 34, d: 1.5, h: 23, role: 'dark', r: 0.5, outline: true }
    ]
  },

  // Desk phone: raised back with the display, keypad in front, handset on the left.
  {
    id: 'ip-phone',
    name: 'Desk Phone',
    group: 'network',
    tags: ['network'],
    size: { w: 22, d: 20, h: 15 },
    mountFrom: 'surface',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 22, d: 8, h: 15, role: 'dark', r: 1,
        top: [{ rect: [9, 1.5, 11, 5], fill: 'glass', stroke: 'glass' }, { rect: [3.5, 3, 2.5, 1.5], accent: 'network' }]
      },
      {
        x: 0, y: 8, z: 0, w: 22, d: 12, h: 6, role: 'dark', r: 1, outline: true,
        top: [0, 1, 2, 3].flatMap((r) => [0, 1, 2].map((c) => ({ circle: [12 + c * 3.5, 2 + r * 2.7, 0.8], fill: 'soft', stroke: 'soft' })))
      },
      { x: 1, y: 8.5, z: 6, w: 7, d: 11, h: 3, role: 'dark', r: 2, outline: true }
    ]
  },

  appliance({ id: 'firewall', name: 'Firewall Appliance (Desktop)', tags: ['network', 'security'], w: 30, d: 20, h: 5, accent: 'security' }),

  tower({ id: 'server-tower', name: 'Tower Server', w: 20, d: 60, h: 45 }),

  // NAS: a small dark box, vents and the status strip on top.
  {
    id: 'nas',
    name: 'Network Storage (NAS)',
    group: 'network',
    tags: ['network'],
    size: { w: 20, d: 25, h: 25 },
    mountFrom: 'surface',
    parts: [
      {
        x: 0, y: 0, z: 0, w: 20, d: 25, h: 25, role: 'dark', r: 1,
        top: [...vents(20, 3, 4, 2.5), strip(20, 25, 'network')]
      }
    ]
  }
];
