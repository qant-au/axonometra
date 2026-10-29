// Stability at an angle: the hull floating heeled and trimmed. The water surface is a plane in the hull's frame,
// y = level + z·tan(heel) + (x − xm)·tan(trim), with heel positive to starboard (the starboard side down) and trim
// positive by the bow (the bow down); xm is the middle of the hull's length. Each section is clipped by that
// plane exactly, so a hull wall-sided or not, a deck edge going under or a bilge coming out are all handled.
//
// For a load (a displacement and a centre of gravity) the hull is floated: the level and trim are found that give
// the displacement with the centre of buoyancy on the same vertical as the centre of gravity fore and aft. The
// righting lever GZ is then the horizontal distance across the boat from G to the vertical through B.

import { SEA_WATER } from "./hydrostatics.ts";
import { bodyRange, sampleXs, sectionAt } from "./sections.ts";
import type { Hull, HullBody } from "./types.ts";

export type Vec3 = [x: number, y: number, z: number];

export interface Attitude {
  /** Heel and trim (radians): heel positive with the starboard side down, trim positive with the bow down. */
  heel: number;
  trim: number;
  /** Height of the water surface (m) at the middle of the hull's length on its centre line. */
  level: number;
}

export interface Immersion {
  volume: number;
  /** Centre of buoyancy in the hull's frame. */
  centroid: Vec3;
}

export interface Load {
  /** Displacement (t). */
  displacement: number;
  /** Centre of gravity in the hull's frame (m): along the length, height, across (0 on the centre line). */
  lcg: number;
  vcg: number;
  tcg?: number;
  /** Water density (t/m³); sea water when not given. */
  density?: number;
}

export interface Floating extends Immersion {
  attitude: Attitude;
  /** The righting lever (m): positive when the buoyancy turns the boat back upright. */
  gz: number;
}

/** The middle of the hull's length, where trim turns the water surface. */
export function hullMiddle(hull: Hull): number {
  let a = Infinity;
  let b = -Infinity;
  for (const body of hull.bodies) {
    const [x0, x1] = bodyRange(body);
    a = Math.min(a, x0);
    b = Math.max(b, x1);
  }
  return (a + b) / 2;
}

/** A closed section polygon in (z, y), starboard side up from the bottom and port side back down. */
function sectionPolygon(body: HullBody, x: number): [number, number][] | null {
  const s = sectionAt(body, x);
  if (!s) return null;
  const starboard = s.points.map(([y, half, other]): [number, number] => [body.center + (other ?? half), y]);
  const port = s.points.map(([y, half]): [number, number] => [body.center - half, y]).reverse();
  return [...starboard, ...port];
}

/** Area and first moments (about z = 0 and y = 0) of the part of a (z, y) polygon below y = a + b·z. */
function clippedMoments(poly: [number, number][], a: number, b: number): { area: number; mz: number; my: number } {
  const below = (p: [number, number]) => a + b * p[0] - p[1];
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const dp = below(p);
    const dq = below(q);
    if (dp >= 0) out.push(p);
    if (dp >= 0 !== dq >= 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  let area = 0;
  let mz = 0;
  let my = 0;
  for (let i = 0; i < out.length; i++) {
    const [z0, y0] = out[i];
    const [z1, y1] = out[(i + 1) % out.length];
    const c = z0 * y1 - z1 * y0;
    area += c;
    mz += (z0 + z1) * c;
    my += (y0 + y1) * c;
  }
  const sgn = area < 0 ? -1 : 1;
  return { area: (sgn * area) / 2, mz: (sgn * mz) / 6, my: (sgn * my) / 6 };
}


/** Each body's section polygons at its sample positions, worked out once per body and sampling. */
const polygonCache = new WeakMap<HullBody, Map<number, { xs: number[]; polys: ([number, number][] | null)[] }>>();

function polygons(body: HullBody, split: number): { xs: number[]; polys: ([number, number][] | null)[] } {
  let bySplit = polygonCache.get(body);
  if (!bySplit) polygonCache.set(body, (bySplit = new Map()));
  let entry = bySplit.get(split);
  if (!entry) {
    const xs = sampleXs(body, split);
    // a point a hair off the straight line between its neighbours changes nothing but the time: drop it
    let depth = 0;
    for (const s of body.sections) depth = Math.max(depth, s.points[s.points.length - 1][0] - s.points[0][0]);
    const eps = 1e-6 * depth;
    entry = { xs, polys: xs.map((x) => simplify(sectionPolygon(body, x), eps)) };
    bySplit.set(split, entry);
  }
  return entry;
}

/** A closed polygon without the points that lie within eps of the line joining their neighbours. */
function simplify(poly: [number, number][] | null, eps: number): [number, number][] | null {
  if (!poly || poly.length < 4) return poly;
  // repeated points first (a V section's keel is its last port point and its first starboard one): measured against
  // its own twin, a corner lies on the line through it and would be dropped, cutting the whole V off
  poly = poly.filter((p, i) => {
    const q = poly![(i + 1) % poly!.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > eps;
  });
  if (poly.length < 4) return poly.length >= 3 ? poly : null;
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = out.length ? out[out.length - 1] : poly[poly.length - 1];
    const p = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    const off = l > 0 ? Math.abs(dx * (p[1] - a[1]) - dy * (p[0] - a[0])) / l : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (off > eps) out.push(p);
  }
  return out.length >= 3 ? out : poly;
}

/** The immersed volume and its centre at an attitude. `split` sets how finely between stations it is sampled. */
export function immersion(hull: Hull, attitude: Attitude, split = 1): Immersion {
  const xm = hullMiddle(hull);
  const tanHeel = Math.tan(attitude.heel);
  const tanTrim = Math.tan(attitude.trim);
  let volume = 0;
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (const body of hull.bodies) {
    const { xs, polys } = polygons(body, split);
    const m = xs.map((x, i) => {
      const poly = polys[i];
      return poly ? clippedMoments(poly, attitude.level + (x - xm) * tanTrim, tanHeel) : { area: 0, mz: 0, my: 0 };
    });
    for (let i = 1; i < xs.length; i++) {
      const dx = xs[i] - xs[i - 1];
      volume += ((m[i - 1].area + m[i].area) / 2) * dx;
      mx += ((m[i - 1].area * xs[i - 1] + m[i].area * xs[i]) / 2) * dx;
      my += ((m[i - 1].my + m[i].my) / 2) * dx;
      mz += ((m[i - 1].mz + m[i].mz) / 2) * dx;
    }
  }
  const v = Math.max(1e-12, volume);
  return { volume, centroid: volume > 0 ? [mx / v, my / v, mz / v] : [xm, attitude.level, 0] };
}

/** The world's up, along and across directions at an attitude, in the hull's frame. */
export function axes(heel: number, trim: number): { up: Vec3; along: Vec3; across: Vec3 } {
  const norm = (v: Vec3): Vec3 => {
    const l = Math.hypot(...v);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const up = norm([-Math.tan(trim), 1, -Math.tan(heel)]);
  const along = norm([1 - up[0] * up[0], -up[0] * up[1], -up[0] * up[2]]);
  const ez: Vec3 = [0, 0, 1];
  const a = dot(ez, up);
  const b = dot(ez, along);
  const across = norm([-a * up[0] - b * along[0], -a * up[1] - b * along[1], 1 - a * up[2] - b * along[2]]);
  return { up, along, across };
}

/**
 * Solve f(t) = 0 for t in [lo, hi] where f rises with t (the Illinois form of false position: a secant step that
 * keeps the root bracketed, so it converges in a handful of evaluations without overshooting).
 */
function rising(f: (t: number) => number, lo: number, hi: number, tol: number): number {
  let fa = f(lo);
  let fb = f(hi);
  if (fa >= 0) return lo;
  if (fb <= 0) return hi;
  let side = 0;
  for (let i = 0; i < 100 && hi - lo > tol; i++) {
    const t = (lo * fb - hi * fa) / (fb - fa);
    const ft = f(t);
    if (ft === 0) return t;
    if (ft < 0) {
      lo = t;
      fa = ft;
      if (side === -1) fb /= 2;
      side = -1;
    } else {
      hi = t;
      fb = ft;
      if (side === 1) fa /= 2;
      side = 1;
    }
  }
  return (lo * fb - hi * fa) / (fb - fa);
}

/** A hull's lowest and highest points and its reach across and along: the bounds a water level can lie in. */
const extentCache = new WeakMap<Hull, { lo: number; hi: number; across: number; along: number }>();

function extent(hull: Hull): { lo: number; hi: number; across: number; along: number } {
  let e = extentCache.get(hull);
  if (!e) {
    let lo = Infinity;
    let hi = -Infinity;
    let across = 0;
    let along = 0;
    const xm = hullMiddle(hull);
    for (const body of hull.bodies) {
      const [x0, x1] = bodyRange(body);
      along = Math.max(along, Math.abs(x0 - xm), Math.abs(x1 - xm));
      for (const s of body.sections) for (const [y, half, other] of s.points) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
        across = Math.max(across, Math.abs(body.center) + Math.max(half, other ?? half));
      }
    }
    e = { lo, hi, across, along };
    extentCache.set(hull, e);
  }
  return e;
}

/**
 * The water level that immerses `volume` at a heel and trim (the volume only grows with the level). Given a guess
 * (the level a neighbouring attitude floated at), the root is bracketed close round it first, which saves most of
 * the work when a curve is run heel by heel.
 */
function levelFor(hull: Hull, volume: number, heel: number, trim: number, split: number, guess?: number): number {
  const e = extent(hull);
  // the tilted plane can reach further than the hull's own depth, across its breadth and along its length
  const pad = Math.max(e.across, Math.abs(Math.tan(trim)) * e.along) * (Math.abs(Math.tan(heel)) + 1) + 1e-3;
  const tol = 1e-9 * Math.max(1, e.hi - e.lo);
  const f = (level: number) => immersion(hull, { heel, trim, level }, split).volume - volume;
  let lo = e.lo - pad;
  let hi = e.hi + pad;
  if (guess !== undefined && Number.isFinite(guess)) {
    let d = 0.01 * Math.max(1e-3, e.hi - e.lo);
    const fg = f(guess);
    // walk out from the guess, doubling, until the volume crosses
    let a = guess;
    for (let i = 0; i < 30; i++) {
      const b = fg < 0 ? Math.min(hi, a + d) : Math.max(lo, a - d);
      const fb = f(b);
      if ((fg < 0 && fb >= 0) || (fg >= 0 && fb <= 0)) {
        lo = Math.min(a, b);
        hi = Math.max(a, b);
        break;
      }
      a = b;
      d *= 2;
      if (a <= lo || a >= hi) break;
    }
  }
  return rising(f, lo, hi, tol);
}

/**
 * The hull floating with a load at a heel: the level and trim that carry the displacement with the centre of
 * buoyancy on the vertical through the centre of gravity fore and aft, and the righting lever there. `start`, an
 * attitude it floated at nearby (the last heel of a curve), lets the search begin there.
 */
export function float(hull: Hull, load: Load, heel = 0, split = 1, start?: Attitude): Floating {
  const volume = load.displacement / (load.density ?? SEA_WATER);
  const G: Vec3 = [load.lcg, load.vcg, load.tcg ?? 0];
  let levelGuess = start?.level;
  const state = (trim: number) => {
    const level = levelFor(hull, volume, heel, trim, split, levelGuess);
    levelGuess = level;
    const im = immersion(hull, { heel, trim, level }, split);
    const { along, across } = axes(heel, trim);
    const d: Vec3 = [im.centroid[0] - G[0], im.centroid[1] - G[1], im.centroid[2] - G[2]];
    return { trim, level, im, balance: d[0] * along[0] + d[1] * along[1] + d[2] * along[2], gz: d[0] * across[0] + d[1] * across[1] + d[2] * across[2] };
  };
  // the trim that balances fore and aft. Near its floating trim a boat is stable fore and aft, so trimming by the
  // bow moves B forward of G and the balance rises with the trim; far from it (a high G, a deck under) it need not.
  // So the root is bracketed outward from where it starts (level, or the trim it floated at nearby), in widening
  // steps, and the nearest one taken.
  const t0 = start?.trim ?? 0;
  let last = state(t0);
  if (Math.abs(last.balance) > 1e-9) {
    const dir = last.balance < 0 ? 1 : -1;
    let inner = t0;
    let outer: number | null = null;
    let closest = last;
    for (const step of [0.002, 0.005, 0.02, 0.05, 0.1, 0.2, 0.35, 0.5, 0.8]) {
      const t = t0 + dir * step;
      if (Math.abs(t) > 1) break;
      const s = state(t);
      if (Math.abs(s.balance) < Math.abs(closest.balance)) closest = s;
      if ((dir > 0 && s.balance >= 0) || (dir < 0 && s.balance <= 0)) {
        outer = t;
        break;
      }
      inner = t;
    }
    if (outer !== null) {
      const solved = rising(
        (trim) => {
          last = state(trim);
          return last.balance;
        },
        Math.min(inner, outer),
        Math.max(inner, outer),
        1e-7,
      );
      if (last.trim !== solved) last = state(solved);
    } else last = closest; // no trim balances it (G too high to be stable fore and aft): the nearest to balance
  }
  return { volume: last.im.volume, centroid: last.im.centroid, attitude: { heel, trim: last.trim, level: last.level }, gz: last.gz };
}

/**
 * The heel a boat rests at with its load: 0 for a symmetric hull with G on its centre line, a list when the hull or
 * the load is lopsided (a single outrigger, an asymmetric demihull, weight to one side). Found where the righting
 * lever is 0, bracketing outward from upright. A boat balanced upright but unstable there (G above the metacentre)
 * rests at its angle of loll instead. Null if no rest is found within 60°: it capsizes.
 */
export function restingHeel(hull: Hull, load: Load, split = 1): Floating | null {
  let near: Attitude | undefined;
  const at = (heel: number) => {
    const f = float(hull, load, heel, split, near);
    near = f.attitude;
    return f;
  };
  const upright = at(0);
  let dir: number;
  let inner = 0;
  let innerGz = upright.gz;
  if (Math.abs(upright.gz) < 1e-9) {
    // balanced upright: at rest there if it is stable, but with G above the metacentre the lever pushes it on over,
    // and it lolls to one side or the other until the lever comes back to 0 (the starboard one is found)
    const small = at((0.5 * Math.PI) / 180);
    if (small.gz > 0) return upright;
    dir = 1;
    inner = (0.5 * Math.PI) / 180;
    innerGz = small.gz;
  } else {
    // a positive lever turns the boat back towards port (it rights a starboard heel), so the rest lies to port of here
    dir = upright.gz > 0 ? -1 : 1;
  }
  for (const deg of [0.5, 1, 2, 4, 8, 15, 25, 40, 60]) {
    if (deg * (Math.PI / 180) <= Math.abs(inner)) continue;
    const heel = (dir * deg * Math.PI) / 180;
    const f = at(heel);
    if (Math.sign(f.gz) !== Math.sign(innerGz)) {
      // the lever rises with the heel through a stable rest, so the root is a rising one in the heel's direction
      const lo = Math.min(inner, heel);
      const hi = Math.max(inner, heel);
      const sign = at(lo).gz < 0 ? 1 : -1;
      const h = rising((t) => sign * at(t).gz, lo, hi, 1e-6);
      return at(h);
    }
    inner = heel;
    innerGz = f.gz;
  }
  return null;
}

/** The righting lever at each heel (radians), floating the load free to trim at each, each starting from the last. */
export function gzCurve(hull: Hull, load: Load, heels: readonly number[], split = 1): { heel: number; gz: number; trim: number }[] {
  let near: Attitude | undefined;
  return heels.map((heel) => {
    const f = float(hull, load, heel, split, near);
    near = f.attitude;
    return { heel, gz: f.gz, trim: f.attitude.trim };
  });
}
