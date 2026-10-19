// Security. Most devices here are plan symbols (see README, "Symbols"): the
// plan shows a 40 cm symbol, while `size` and `parts` model the real device.
//
// Symbol frames: a circle for ceiling devices, a rounded square for wall and
// pole devices. Cameras are drawn dark, like the dome;
// every other device body is `soft`. One small security-red mark per glyph.

// A filled arrowhead with its tip at [x, y], pointing along `deg` (0° = +x, 90° = down).
function arrowHead([x, y], deg, len = 3.5, half = 2.2) {
  const a = (deg * Math.PI) / 180;
  const [dx, dy] = [Math.cos(a), Math.sin(a)];
  const bx = x - dx * len;
  const by = y - dy * len;
  return { line: [[x, y], [bx - dy * half, by + dx * half], [bx + dy * half, by - dx * half]], closed: true, fill: 'outline', stroke: 'outline' };
}

// A point on a circle, for arc ends.
const onCircle = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];

// A small wall device: one box, back on the wall (y = 0), face towards the room.
const wallBox = (w, d, h, role = 'body') => [{ x: 0, y: 0, z: 0, w, d, h, role, r: 1 }];

// A PTZ camera on its mount: a dark dome with a double-headed pan arrow round
// it on the plan. `parts` is the mount, and the camera (a 12 cm body and a
// 9 cm dome) stands on it at `at` = [cx, cy, z]. Authored upside down and
// installed facing down, so the dome hangs below the mount.
function ptz({ id, name, frame, size, mount, mountFrom = 'ceiling', parts, at: [cx, cy, z] }) {
  return {
    id,
    name,
    group: 'security',
    tags: ['security'],
    size,
    mount,
    mountFrom,
    facing: 'down',
    symbol: {
      frame,
      glyph: [
        { arc: [20, 20, 14, 150, 390], stroke: 'detail' },
        arrowHead(onCircle(20, 20, 14, 30), 120),
        arrowHead(onCircle(20, 20, 14, 150), 60),
        { circle: [20, 20, 8], fill: 'dark', stroke: 'outline' },
        { circle: [20, 24, 2.5], accent: 'security' }
      ]
    },
    parts: [
      ...parts,
      { cyl: [cx, cy, 11], z, h: 12 },
      { dome: [cx, cy, 9], z: z + 12, h: 9, role: 'dark' }
    ]
  };
}

const symbols = [
  {
    id: 'cctv-dome',
    name: 'CCTV Dome Camera',
    group: 'security',
    tags: ['security'],
    size: { w: 14, d: 14, h: 10 },
    mount: 0,
    mountFrom: 'ceiling',
    facing: 'down',
    symbol: {
      frame: 'circle',
      glyph: [
        { line: [[20, 20], [8, 36]], stroke: 'detail' },
        { line: [[20, 20], [32, 36]], stroke: 'detail' },
        { circle: [20, 20, 9], fill: 'dark', stroke: 'outline' },
        { circle: [20, 23, 3], accent: 'security' }
      ]
    },
    parts: [
      { cyl: [7, 7, 7], z: 0, h: 3 },
      { dome: [7, 7, 5.5], z: 3, h: 5.5, role: 'dark' }
    ]
  },
  {
    // Wall bracket at the top, barrel pointing down the symbol, lens at its tip.
    id: 'cctv-bullet',
    name: 'CCTV Bullet Camera',
    group: 'security',
    tags: ['security'],
    size: { w: 9, d: 30, h: 9 },
    mount: 250,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { line: [[17, 26], [8, 37]], stroke: 'detail' },
        { line: [[23, 26], [32, 37]], stroke: 'detail' },
        { rect: [16, 1, 8, 5], fill: 'soft', stroke: 'outline' },
        { rect: [14, 6, 12, 21], r: 2, fill: 'dark', stroke: 'outline' },
        { rect: [16.5, 23, 7, 2.5], accent: 'security' }
      ]
    },
    parts: [
      { x: 1, y: 0, z: 1, w: 7, d: 3, h: 7 },
      { x: 3, y: 3, z: 3, w: 3, d: 5, h: 3, role: 'metal' },
      { x: 0, y: 8, z: 0, w: 9, d: 22, h: 9, role: 'dark', r: 2 }
    ]
  },
  // A PTZ camera hangs below its mount, about 30 cm down from the ceiling:
  // from a drop tube (the default), off a wall arm, or off a pole arm.
  ptz({
    id: 'cctv-ptz',
    name: 'CCTV PTZ Camera, Pendant',
    frame: 'circle',
    size: { w: 22, d: 22, h: 51 },
    mount: 0,
    // Authored upside down, a 30 cm drop tube under the camera.
    parts: [{ cyl: [11, 11, 2.5], z: 0, h: 30, role: 'metal' }],
    at: [11, 11, 30]
  }),
  ptz({
    id: 'cctv-ptz-wall',
    name: 'CCTV PTZ Camera, Wall-Mounted',
    frame: 'square',
    size: { w: 22, d: 36, h: 25 },
    mount: 30,
    // Authored upside down: the wall plate and the arm under the camera.
    parts: [
      { x: 5, y: 0, z: 0, w: 12, d: 2, h: 15, role: 'metal' },
      { x: 8, y: 2, z: 0, w: 6, d: 23, h: 4, role: 'metal' }
    ],
    at: [11, 25, 4]
  }),
  ptz({
    id: 'cctv-ptz-pole',
    name: 'CCTV PTZ Camera, Pole-Mounted',
    frame: 'square',
    size: { w: 22, d: 36, h: 25 },
    // No ceiling outdoors: the arm's top at 4 m, a usual camera pole.
    mount: 375,
    mountFrom: 'floor',
    // Authored upside down: the pole clamp and the arm under the camera.
    parts: [
      { cyl: [11, 3, 3], z: 0, h: 15, role: 'metal' },
      { x: 8, y: 6, z: 0, w: 6, d: 19, h: 4, role: 'metal' }
    ],
    at: [11, 25, 4]
  }),
  {
    // Flat disc with a centred lens and eight ticks for the all-round view.
    id: 'cctv-fisheye',
    name: 'CCTV 360° Camera',
    group: 'security',
    tags: ['security'],
    size: { w: 15, d: 15, h: 5 },
    mount: 0,
    mountFrom: 'ceiling',
    facing: 'down',
    symbol: {
      frame: 'circle',
      glyph: [
        ...[0, 45, 90, 135, 180, 225, 270, 315].map((a) => ({ line: [onCircle(20, 20, 11.5, a), onCircle(20, 20, 16, a)], stroke: 'detail' })),
        { circle: [20, 20, 8], fill: 'dark', stroke: 'outline' },
        { circle: [20, 20, 3], accent: 'security' }
      ]
    },
    parts: [
      { cyl: [7.5, 7.5, 7.5], z: 0, h: 3 },
      { dome: [7.5, 7.5, 4.5], z: 3, h: 2, role: 'dark' }
    ]
  },
  {
    id: 'alarm-keypad',
    name: 'Alarm Keypad',
    group: 'security',
    tags: ['security'],
    size: { w: 18, d: 3, h: 12 },
    mount: 140,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [10, 5, 20, 30], r: 3, fill: 'soft', stroke: 'outline' },
        { rect: [13, 8, 10, 6], fill: 'glass', stroke: 'outline' },
        { circle: [26, 11, 1.5], accent: 'security' },
        ...[15, 20, 25].flatMap((x) => [19, 24, 29].map((y) => ({ circle: [x, y, 0.6], fill: 'outline', stroke: 'outline' })))
      ]
    },
    parts: wallBox(18, 3, 12)
  },
  {
    // Sensor on the wall at the top, a dashed fan of detection zones below.
    id: 'pir-sensor',
    name: 'Motion Detector (PIR)',
    group: 'security',
    tags: ['security'],
    size: { w: 6, d: 5, h: 11 },
    mount: 240,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        ...[[6, 34], [12.5, 36.5], [20, 37], [27.5, 36.5], [34, 34]].map((p) => ({ line: [[20, 12], p], stroke: 'detail', dash: '2 2' })),
        { rect: [12, 2, 16, 10], r: 3, fill: 'soft', stroke: 'outline' },
        { rect: [16, 8, 8, 3], r: 1.5, accent: 'security' }
      ]
    },
    parts: wallBox(6, 5, 11)
  },
  {
    // Reed on the frame, magnet on the door leaf, dashed door swing.
    id: 'door-contact',
    name: 'Door Contact',
    group: 'security',
    tags: ['security'],
    size: { w: 7, d: 1.5, h: 1.5 },
    mount: 200,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { arc: [7, 15, 26, 0, 55], stroke: 'detail', dash: '2 2' },
        { line: [[7, 15], [33, 15]], stroke: 'outline', weight: 'outline' },
        { rect: [22, 6, 11, 6], r: 1, fill: 'soft', stroke: 'outline' },
        { rect: [22, 18, 11, 5], r: 1, fill: 'dark', stroke: 'outline' },
        { circle: [27.5, 9, 1.5], accent: 'security' }
      ]
    },
    parts: [
      { x: 0, y: 0, z: 0, w: 3, d: 1.5, h: 1.5 },
      { x: 4, y: 0, z: 0, w: 3, d: 1.5, h: 1.5, role: 'dark' }
    ]
  },
  {
    // Detector above a pane with a crack running through it.
    id: 'glass-break',
    name: 'Glass-Break Detector',
    group: 'security',
    tags: ['security'],
    size: { w: 9, d: 2.5, h: 9 },
    mount: 240,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [7, 18, 26, 18], fill: 'glass', stroke: 'outline' },
        { line: [[21, 18], [17, 24], [23, 28], [18, 33], [20, 36]], stroke: 'outline' },
        { line: [[17, 24], [10, 27]], stroke: 'detail' },
        { line: [[23, 28], [30, 25]], stroke: 'detail' },
        { circle: [20, 9, 6], fill: 'soft', stroke: 'outline' },
        { circle: [20, 9, 2], accent: 'security' }
      ]
    },
    parts: wallBox(9, 2.5, 9)
  },
  {
    // Red strobe lens on the wall, horn and sound waves below.
    id: 'siren-strobe',
    name: 'Siren and Strobe',
    group: 'security',
    tags: ['security'],
    size: { w: 20, d: 9, h: 25 },
    mount: 250,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [13, 3, 14, 6], r: 1, accent: 'security' },
        { line: [[14, 9], [26, 9], [31, 20], [9, 20]], closed: true, fill: 'soft', stroke: 'outline' },
        { arc: [20, 20, 7, 40, 140], stroke: 'detail' },
        { arc: [20, 20, 12, 45, 135], stroke: 'detail' },
        { arc: [20, 20, 17, 50, 130], stroke: 'detail' }
      ]
    },
    parts: [
      { x: 0, y: 0, z: 0, w: 20, d: 7, h: 20, r: 2 },
      { x: 4, y: 1, z: 20, w: 12, d: 6, h: 5, role: 'security', r: 2 }
    ]
  },
  {
    // Reader on the wall, a card held up in front of it.
    id: 'card-reader',
    name: 'Access Card Reader',
    group: 'security',
    tags: ['security'],
    size: { w: 5, d: 2, h: 15 },
    mount: 110,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [12, 3, 16, 24], r: 3, fill: 'soft', stroke: 'outline' },
        { circle: [20, 8, 1.8], accent: 'security' },
        { rect: [8, 19, 24, 16], r: 2, fill: 'body', stroke: 'outline' },
        { rect: [11, 24, 6, 5], r: 1, fill: 'soft', stroke: 'detail' }
      ]
    },
    parts: wallBox(5, 2, 15, 'dark')
  },
  {
    // Plate with a round push button.
    id: 'exit-button',
    name: 'Request-to-Exit Button',
    group: 'security',
    tags: ['security'],
    size: { w: 8, d: 4, h: 12 },
    mount: 110,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [10, 4, 20, 32], r: 3, fill: 'soft', stroke: 'outline' },
        { circle: [20, 20, 7], fill: 'body', stroke: 'outline' },
        { circle: [20, 20, 3.5], accent: 'security' }
      ]
    },
    parts: [
      { x: 0, y: 0, z: 0, w: 8, d: 1.5, h: 12, r: 1 },
      { x: 2, y: 1.5, z: 4, w: 4, d: 2.5, h: 4, role: 'soft' }
    ]
  },
  {
    // Magnet under the door head, armature plate on the leaf below.
    id: 'maglock',
    name: 'Magnetic Door Lock',
    group: 'security',
    tags: ['security'],
    size: { w: 25, d: 5, h: 10 },
    mount: 200,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [5, 6, 30, 10], r: 1, fill: 'dark', stroke: 'outline' },
        { circle: [30, 11, 1.5], accent: 'security' },
        ...[12, 20, 28].map((x) => ({ line: [[x, 18], [x, 21]], stroke: 'detail' })),
        { rect: [7, 23, 26, 5], r: 1, fill: 'soft', stroke: 'outline' },
        { line: [[3, 31], [37, 31]], stroke: 'outline', weight: 'outline' }
      ]
    },
    parts: [
      { x: 0, y: 0, z: 4, w: 25, d: 5, h: 6, role: 'dark', r: 1 },
      { x: 1, y: 2, z: 0, w: 23, d: 3, h: 3.5, role: 'metal' }
    ]
  },
  {
    // Door station: camera lens at the top, speaker grille, call button.
    id: 'intercom',
    name: 'Video Intercom',
    group: 'security',
    tags: ['security'],
    size: { w: 12, d: 3.5, h: 25 },
    mount: 140,
    mountFrom: 'floor',
    symbol: {
      frame: 'square',
      glyph: [
        { rect: [11, 3, 18, 34], r: 3, fill: 'soft', stroke: 'outline' },
        { circle: [20, 10, 3.5], fill: 'dark', stroke: 'outline' },
        { circle: [20, 10, 1.4], accent: 'security' },
        ...[17, 20, 23].map((y) => ({ line: [[15, y], [25, y]], stroke: 'detail' })),
        { circle: [20, 30, 3.5], fill: 'body', stroke: 'outline' }
      ]
    },
    parts: wallBox(12, 3.5, 25)
  }
];

const equipment = [
  {
    id: 'nvr',
    name: 'Network Video Recorder',
    group: 'security',
    tags: ['security', 'network'],
    size: { w: 44, d: 40, h: 10 },
    parts: [{
      x: 0, y: 0, z: 0, w: 44, d: 40, h: 10, role: 'dark', r: 1,
      top: [
        ...[8, 12, 16].map((v) => ({ line: [[8, v], [36, v]], stroke: 'soft', view: 'plan' })),
        { line: [[3, 32], [41, 32]], stroke: 'soft' },
        { rect: [16, 36.5, 12, 2.5], r: 1, accent: 'security', view: 'plan' }
      ]
    }]
  },
  {
    id: 'alarm-panel',
    name: 'Alarm Control Panel',
    group: 'security',
    tags: ['security'],
    size: { w: 40, d: 10, h: 40 },
    mount: 150,
    mountFrom: 'floor',
    parts: [{
      x: 0, y: 0, z: 0, w: 40, d: 10, h: 40, r: 1,
      top: [{ rect: [14, 6.5, 12, 2], r: 1, accent: 'security', view: 'plan' }]
    }]
  },
  {
    // Tripod turnstile: a cabinet down one side, one arm across the lane.
    id: 'turnstile',
    name: 'Turnstile',
    group: 'security',
    tags: ['security'],
    size: { w: 50, d: 140, h: 100 },
    parts: [
      {
        x: 0, y: 0, z: 0, w: 25, d: 140, h: 100, role: 'metal', r: 2,
        top: [
          { rect: [4, 10, 17, 120], r: 2, stroke: 'soft' },
          { circle: [20, 70, 5], fill: 'soft' },
          { rect: [8, 126, 9, 2.5], r: 1, accent: 'security', view: 'plan' }
        ]
      },
      { x: 25, y: 68, z: 84, w: 25, d: 4, h: 3, role: 'metal', outline: true }
    ],
    plan: [
      { line: [[40, 20], [40, 50]] },
      { line: [[36, 44], [40, 50], [44, 44]] }
    ]
  },
  {
    // Two pedestals with glass wings meeting in the middle of the lane.
    id: 'speed-gate',
    name: 'Speed Gate Lane',
    group: 'security',
    tags: ['security'],
    size: { w: 120, d: 150, h: 100 },
    parts: [
      ...[0, 100].map((x, i) => ({
        x, y: 0, z: 0, w: 20, d: 150, h: 100, role: 'metal', r: 2, outline: i === 1,
        top: [
          { rect: [4, 8, 12, 134], r: 2, fill: 'glass', stroke: 'soft' },
          { rect: [6, 144, 8, 2.5], r: 1, accent: 'security', view: 'plan' }
        ]
      })),
      { x: 20, y: 73, z: 35, w: 38, d: 3, h: 55, role: 'glass', outline: true },
      { x: 62, y: 73, z: 35, w: 38, d: 3, h: 55, role: 'glass', outline: true }
    ],
    plan: [
      { line: [[60, 20], [60, 55]] },
      { line: [[55, 48], [60, 55], [65, 48]] }
    ]
  },
  {
    id: 'safe',
    name: 'Safe',
    group: 'security',
    tags: ['security'],
    size: { w: 50, d: 50, h: 70 },
    parts: [{
      x: 0, y: 0, z: 0, w: 50, d: 50, h: 70, role: 'dark', r: 1,
      top: [
        { line: [[3, 42], [47, 42]], stroke: 'soft' },
        { rect: [17, 46.5, 16, 2.5], r: 1, accent: 'security', view: 'plan' }
      ]
    }]
  },
  {
    id: 'key-cabinet',
    name: 'Key Cabinet',
    group: 'security',
    tags: ['security'],
    size: { w: 40, d: 10, h: 50 },
    mount: 140,
    mountFrom: 'floor',
    parts: [{
      x: 0, y: 0, z: 0, w: 40, d: 10, h: 50, role: 'metal', r: 1,
      top: [{ rect: [14, 6.5, 12, 2], r: 1, accent: 'security', view: 'plan' }]
    }]
  },
  {
    // Steel post with a red reflective band and a domed cap.
    id: 'bollard',
    name: 'Bollard',
    group: 'security',
    tags: ['security'],
    size: { w: 30, d: 30, h: 100 },
    parts: [
      { cyl: [15, 15, 15], z: 0, h: 78, role: 'metal' },
      { cyl: [15, 15, 15], z: 78, h: 6, role: 'security' },
      { cyl: [15, 15, 15], z: 84, h: 10, role: 'metal', outline: true },
      { dome: [15, 15, 11], z: 94, h: 6, role: 'metal' }
    ],
    plan: [{ circle: [15, 15, 3], accent: 'security' }]
  }
];

export default [...symbols, ...equipment];
