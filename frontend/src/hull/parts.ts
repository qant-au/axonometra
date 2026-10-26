// Underwater parts: what is fixed to a hull below (or through) its skin without being the hull's shape. Each part
// gives its geometry as rings, closed loops of points in the hull's frame that the 3D view lofts between, and the
// parts that displace water give their volume and its centre (they are taken as wholly under the water).
//
// - foils: fin keels, rudders, skegs, centreboards, hydrofoils, struts (a NACA four-digit symmetric section)
// - bulbs: a keel's bulb, a sonar dome (a body of revolution)
// - spray rails: a strip of triangular section along the hull at a height
// - through-hull fittings: intakes, discharges, transducers, set into the skin at a point
// - retractable transducers: a through-hull fitting with a stroke, flush or lowered
// - a gyro stabiliser's footprint on the hull bottom, and whether the hull is wide enough there to take it

import { revolutionBody } from "./revolution.ts";
import { bottomAt, halfAt, sectionAt, sheerAt } from "./sections.ts";
import type { HullBody } from "./types.ts";

export type Vec3 = [x: number, y: number, z: number];

/** A part's geometry: closed rings of points along its length or span. */
export interface PartGeometry {
  rings: Vec3[][];
}

/** A volume and its centre, in the hull's frame. */
export interface PartVolume {
  volume: number;
  centroid: Vec3;
}

// ——— foils ———

/** The half-thickness of a NACA four-digit symmetric section at chord share s, as a share of the chord. */
export function nacaHalf(thickness: number, s: number): number {
  s = Math.min(1, Math.max(0, s));
  return 5 * thickness * (0.2969 * Math.sqrt(s) - 0.126 * s - 0.3516 * s * s + 0.2843 * s ** 3 - 0.1036 * s ** 4);
}

/** The area of a NACA four-digit symmetric section of chord 1 (about 0.685 times its thickness). */
export function nacaArea(thickness: number, n = 400): number {
  let a = 0;
  for (let i = 0; i < n; i++) {
    // cosine spacing: the leading edge's square root needs it
    const s0 = (1 - Math.cos((Math.PI * i) / n)) / 2;
    const s1 = (1 - Math.cos((Math.PI * (i + 1)) / n)) / 2;
    a += (nacaHalf(thickness, s0) + nacaHalf(thickness, s1)) * (s1 - s0);
  }
  return a;
}

export interface FoilSpec {
  /** The leading edge of the root (m, the hull's frame), where the foil meets the hull or its strut. */
  root: Vec3;
  /** Chords at the root and the tip (m), and the span (m). */
  rootChord: number;
  tipChord: number;
  span: number;
  /** How far the leading edge is swept aft, root to tip (degrees). */
  sweep?: number;
  /**
   * Which way the span runs, in degrees round the length from straight down: 0 is a keel or rudder hanging down,
   * 90 a foil reaching out to starboard, −90 to port, 180 straight up.
   */
  direction?: number;
  /** Thickness as a share of the chord (NACA 00xx: 0.12 for 0012). */
  thickness?: number;
  /** Angle of incidence (degrees): a rudder's helm, a foil's pitch, about the span at the quarter chord. */
  incidence?: number;
}

function spanAxis(direction: number): Vec3 {
  const a = (direction * Math.PI) / 180;
  return [0, -Math.cos(a), Math.sin(a)];
}

/** The foil's surface as rings at stations along its span. */
export function foilGeometry(f: FoilSpec, stations = 12, points = 24): PartGeometry {
  const t = f.thickness ?? 0.12;
  const sweep = Math.tan(((f.sweep ?? 0) * Math.PI) / 180);
  const s = spanAxis(f.direction ?? 0);
  // the section's thickness runs across the span and the chord: perpendicular to both
  const n: Vec3 = [0, s[2], -s[1]];
  const inc = ((f.incidence ?? 0) * Math.PI) / 180;
  const rings: Vec3[][] = [];
  for (let i = 0; i <= stations; i++) {
    const u = i / stations;
    const c = f.rootChord + (f.tipChord - f.rootChord) * u;
    const le: Vec3 = [f.root[0] - f.span * u * sweep, f.root[1] + s[1] * f.span * u, f.root[2] + s[2] * f.span * u];
    const ring: Vec3[] = [];
    for (let k = 0; k < points; k++) {
      // round the section: the upper side from the trailing edge forward, the lower side back
      const a = (2 * Math.PI * k) / points;
      const sc = (1 + Math.cos(a)) / 2;
      const side = Math.sin(a) >= 0 ? 1 : -1;
      const along = -sc * c; // aft of the leading edge
      const across = side * nacaHalf(t, sc) * c;
      // incidence turns the section about the quarter chord
      const ax = along + 0.25 * c;
      const rx = ax * Math.cos(inc) - across * Math.sin(inc) - 0.25 * c;
      const rn = ax * Math.sin(inc) + across * Math.cos(inc);
      ring.push([le[0] + rx, le[1] + n[1] * rn, le[2] + n[2] * rn]);
    }
    rings.push(ring);
  }
  return { rings };
}

/** The foil's volume and centre: each section's area, with its centre 0.42 of the chord aft of the leading edge. */
export function foilVolume(f: FoilSpec, stations = 64): PartVolume {
  const t = f.thickness ?? 0.12;
  const k = nacaArea(t);
  const sweep = Math.tan(((f.sweep ?? 0) * Math.PI) / 180);
  const s = spanAxis(f.direction ?? 0);
  const xc = nacaCentroid(t);
  let volume = 0;
  const m: Vec3 = [0, 0, 0];
  for (let i = 0; i < stations; i++) {
    const u = (i + 0.5) / stations;
    const c = f.rootChord + (f.tipChord - f.rootChord) * u;
    const dv = k * c * c * (f.span / stations);
    volume += dv;
    m[0] += dv * (f.root[0] - f.span * u * sweep - xc * c);
    m[1] += dv * (f.root[1] + s[1] * f.span * u);
    m[2] += dv * (f.root[2] + s[2] * f.span * u);
  }
  return { volume, centroid: [m[0] / volume, m[1] / volume, m[2] / volume] };
}

/** Where the area of a NACA four-digit symmetric section lies along its chord (a share of the chord, from the leading edge). */
export function nacaCentroid(thickness: number, n = 400): number {
  let a = 0;
  let m = 0;
  for (let i = 0; i < n; i++) {
    const s0 = (1 - Math.cos((Math.PI * i) / n)) / 2;
    const s1 = (1 - Math.cos((Math.PI * (i + 1)) / n)) / 2;
    const da = (nacaHalf(thickness, s0) + nacaHalf(thickness, s1)) * (s1 - s0);
    a += da;
    m += da * ((s0 + s1) / 2);
  }
  return m / a;
}

// ——— bulbs ———

export interface BulbSpec {
  /** The bulb's nose (m, the hull's frame) on its axis, which runs aft along the length. */
  nose: Vec3;
  length: number;
  diameter: number;
  /** Share of the length the nose and the tail take (an ellipse forward, a taper aft). */
  noseShare?: number;
  tailShare?: number;
}

function bulbRadius(b: BulbSpec): (x: number) => number {
  const R = b.diameter / 2;
  const nose = (b.noseShare ?? 0.3) * b.length;
  const tail = (b.tailShare ?? 0.45) * b.length;
  // x from the tail (0) to the nose (length)
  return (x) => {
    if (x > b.length - nose) return R * Math.sqrt(Math.max(0, 1 - ((x - (b.length - nose)) / nose) ** 2));
    if (x < tail) return R * Math.sqrt(Math.max(0, 1 - ((tail - x) / tail) ** 2)) ** 1.5;
    return R;
  };
}

/** The bulb as rings round its axis. */
export function bulbGeometry(b: BulbSpec, stations = 32, points = 24): PartGeometry {
  const r = bulbRadius(b);
  const rings: Vec3[][] = [];
  for (let i = 0; i <= stations; i++) {
    const x = (b.length * (1 - Math.cos((Math.PI * i) / stations))) / 2;
    const R = r(x);
    rings.push(Array.from({ length: points }, (_, k): Vec3 => {
      const a = (2 * Math.PI * k) / points;
      return [b.nose[0] - b.length + x, b.nose[1] + R * Math.sin(a), b.nose[2] + R * Math.cos(a)];
    }));
  }
  return { rings };
}

/** The bulb's volume and centre. */
export function bulbVolume(b: BulbSpec): PartVolume {
  const body = revolutionBody(b.length, bulbRadius(b), { axis: b.nose[1], center: b.nose[2], aft: b.nose[0] - b.length, stations: 201 });
  let volume = 0;
  let mx = 0;
  const s = body.sections;
  for (let i = 1; i < s.length; i++) {
    const area = (k: number) => Math.PI * Math.max(...s[k].points.map(([, h]) => h)) ** 2;
    const dv = ((area(i - 1) + area(i)) / 2) * (s[i].x - s[i - 1].x);
    volume += dv;
    mx += dv * ((s[i].x + s[i - 1].x) / 2);
  }
  return { volume, centroid: [mx / volume, b.nose[1], b.nose[2]] };
}

// ——— the hull's surface ———

/** A point on the hull's surface and the outward normal there (in its section's plane). */
export interface SurfacePoint {
  point: Vec3;
  normal: Vec3;
}

/**
 * The point on the hull's bottom at x, a distance `off` across from the body's centre line (positive to
 * starboard): the lowest height at which the hull is that wide. Null where the hull is never that wide at x.
 */
export function bottomPoint(body: HullBody, x: number, off: number): SurfacePoint | null {
  const s = sectionAt(body, x);
  if (!s) return null;
  const w = Math.abs(off);
  // the half-breadth on the side asked for (an asymmetric hull has its own each side)
  const p = s.points.map(([y, half, other]): [number, number] => [y, off >= 0 ? (other ?? half) : half]);
  for (let i = 0; i < p.length; i++) {
    if (p[i][1] < w) continue;
    // where the section first reaches this breadth: between the point below and this one
    const [y1, h1] = p[i];
    const [y0, h0] = i > 0 ? p[i - 1] : p[i];
    const t = h1 - h0 > 1e-12 ? (w - h0) / (h1 - h0) : 1;
    const y = i > 0 ? y0 + (y1 - y0) * Math.max(0, t) : y1;
    // the normal: the section's slope there, turned outward and down
    const dy = y1 - y0;
    const dh = h1 - h0;
    const l = Math.hypot(dy, dh) || 1;
    const sgn = off >= 0 ? 1 : -1;
    return { point: [x, y, body.center + sgn * w], normal: i > 0 ? [0, -dh / l, (sgn * dy) / l] : [0, -1, 0] };
  }
  return null;
}

/** The point on the hull's side at x and height y, port (−1) or starboard (1), with the outward normal. */
export function sidePoint(body: HullBody, x: number, y: number, side: -1 | 1): SurfacePoint | null {
  const h = halfAt(body, x, y, side);
  if (h === null) return null;
  const e = 1e-3 * Math.max(1e-3, (sheerAt(body, x) ?? 0) - (bottomAt(body, x) ?? 0));
  const above = halfAt(body, x, y + e, side) ?? h;
  const below = halfAt(body, x, y - e, side) ?? h;
  const dh = (above - below) / (2 * e);
  const l = Math.hypot(1, dh);
  return { point: [x, y, body.center + side * h], normal: [0, -dh / l, side / l] };
}

// ——— spray rails ———

export interface SprayRailSpec {
  /** Height of the rail (m, the hull's frame) and where it runs along the length (m). */
  y: number;
  from: number;
  to: number;
  /** The rail's width out from the hull and its depth down the hull (m). */
  width: number;
  depth?: number;
}

/** A pair of spray rails, port and starboard: triangular rings along each, from aft forward. */
export function sprayRails(body: HullBody, r: SprayRailSpec, stations = 24): { port: PartGeometry; starboard: PartGeometry } {
  const depth = r.depth ?? r.width;
  const rail = (side: -1 | 1): PartGeometry => {
    const rings: Vec3[][] = [];
    for (let i = 0; i <= stations; i++) {
      const x = r.from + ((r.to - r.from) * i) / stations;
      const sp = sidePoint(body, x, r.y, side);
      if (!sp) continue;
      const [, y, z] = sp.point;
      // flat on top, sloping back to the hull underneath
      rings.push([
        [x, y, z],
        [x, y, z + side * r.width],
        [x, y - depth, z],
      ]);
    }
    return { rings };
  };
  return { port: rail(-1), starboard: rail(1) };
}

// ——— through-hull fittings and transducers ———

export type ThroughHullKind = "intake" | "discharge" | "transducer" | "other";

export interface ThroughHull {
  kind: ThroughHullKind;
  /** Where it is set into the skin, and the outward normal there. */
  at: SurfacePoint;
  /** The fitting's outside diameter (m), and how far it stands proud of the skin (m). */
  diameter: number;
  proud: number;
}

/** A through-hull fitting on the bottom at x, `off` across from the centre line, or on a side at a height. */
export function throughHull(
  body: HullBody,
  kind: ThroughHullKind,
  where: { x: number; off: number } | { x: number; y: number; side: -1 | 1 },
  diameter: number,
  proud = 0.01,
): ThroughHull | null {
  const at = "off" in where ? bottomPoint(body, where.x, where.off) : sidePoint(body, where.x, where.y, where.side);
  return at ? { kind, at, diameter, proud } : null;
}

/** A fitting's outside face as a ring, standing proud of the skin along its normal. */
export function throughHullGeometry(f: ThroughHull, points = 16): PartGeometry {
  const [nx, ny, nz] = f.at.normal;
  // two directions in the skin's plane: one across the normal in the section plane, one along the length
  const u: Vec3 = [0, nz, -ny];
  const v: Vec3 = [1, 0, 0];
  const ring = (lift: number, r: number) =>
    Array.from({ length: points }, (_, k): Vec3 => {
      const a = (2 * Math.PI * k) / points;
      const c = Math.cos(a) * r;
      const s = Math.sin(a) * r;
      return [f.at.point[0] + nx * lift + u[0] * c + v[0] * s, f.at.point[1] + ny * lift + u[1] * c + v[1] * s, f.at.point[2] + nz * lift + u[2] * c + v[2] * s];
    });
  return { rings: [ring(0, f.diameter / 2), ring(f.proud, f.diameter / 2)] };
}

export interface Retractable {
  fitting: ThroughHull;
  /** How far the transducer lowers (m), and how far it is lowered now (0 flush, 1 all the way). */
  stroke: number;
  deployed: number;
}

/** A retractable transducer's face: flush with the fitting, or lowered straight down by its stroke. */
export function retractableTip(r: Retractable): Vec3 {
  const d = Math.min(1, Math.max(0, r.deployed)) * r.stroke;
  const [x, y, z] = r.fitting.at.point;
  return [x, y - d, z];
}

// ——— a gyro stabiliser's footprint ———

export interface GyroSpec {
  /** Where the unit's centre is along the length (m), and its footprint along and across, and its height (m). */
  x: number;
  length: number;
  width: number;
  height: number;
  /** Clearance it needs round it (m). */
  clearance?: number;
}

/**
 * Where a gyro stabiliser sits on the hull bottom: its base (the bottom at the centre line, at its length's ends,
 * whichever is higher), and whether the hull is wide enough at its top to take it with its clearance.
 */
export function gyroFit(body: HullBody, g: GyroSpec): { base: number; fits: boolean; box: [Vec3, Vec3] } | null {
  const c = g.clearance ?? 0.05;
  const xs = [g.x - g.length / 2, g.x, g.x + g.length / 2];
  const bottoms = xs.map((x) => bottomPoint(body, x, g.width / 2 + c)?.point[1]);
  if (bottoms.some((b) => b === undefined)) return null;
  const base = Math.max(...(bottoms as number[]));
  const top = base + g.height + c;
  const fits = xs.every((x) => (halfAt(body, x, top) ?? 0) >= g.width / 2 + c && (halfAt(body, x, base) ?? 0) >= g.width / 2 + c);
  return { base, fits, box: [[g.x - g.length / 2, base, body.center - g.width / 2], [g.x + g.length / 2, base + g.height, body.center + g.width / 2]] };
}

/** Volumes added together, with their joint centre. */
export function combine(...parts: PartVolume[]): PartVolume {
  const volume = parts.reduce((s, p) => s + p.volume, 0);
  const m = parts.reduce<Vec3>((s, p) => [s[0] + p.volume * p.centroid[0], s[1] + p.volume * p.centroid[1], s[2] + p.volume * p.centroid[2]], [0, 0, 0]);
  return { volume, centroid: volume > 0 ? [m[0] / volume, m[1] / volume, m[2] / volume] : [0, 0, 0] };
}
