// A RIB's inflatable tube (its collar): not part of the hull's shape, but a part that sits on the hull, following
// the deck edge from aft of the transom, round the bow and back. Given as a centre line with a radius at each point,
// for the 3D view to sweep a circle along.

import { bodyRange, halfAt, sheerAt } from "./sections.ts";
import type { HullBody } from "./types.ts";

export interface TubeSpec {
  /** The tube's diameter along the sides (m). */
  diameter: number;
  /** How far the centre sits outboard of the deck edge and above the sheer (m); a quarter and a tenth of the diameter when not given. */
  out?: number;
  up?: number;
  /** The radius the tube's centre line turns round the bow in plan (m); the half-breadth it meets there, at least the tube's own radius. */
  corner?: number;
  /** How far the tubes run aft of the hull's aftmost point (m), and the length of the cone each one ends in (m). */
  aft?: number;
  cone?: number;
  /** How far the bow section rises above the sides (m), and the share of the radius each aft cone ends at. */
  rise?: number;
  coneEnd?: number;
}

export interface Tube {
  /** The centre line, [x, y, z] from the port aft end forward, round the bow, and aft to the starboard end. */
  path: [number, number, number][];
  /** The tube's radius at each point of the path. */
  radius: number[];
}

/** The tube for a hull body, following its deck edge. */
export function ribTube(body: HullBody, spec: TubeSpec): Tube {
  const R = spec.diameter / 2;
  const out = spec.out ?? 0.25 * spec.diameter;
  const up = spec.up ?? 0.1 * spec.diameter;
  const aft = spec.aft ?? 0.8 * spec.diameter;
  const cone = Math.min(aft, spec.cone ?? 0.6 * spec.diameter);
  const rise = spec.rise ?? 0.3 * spec.diameter;
  const coneEnd = spec.coneEnd ?? 0.55;
  const [xStern, x1] = bodyRange(body);
  // where the deck ends aft: the tops of the sections aft of it are a raked transom's face, falling steeper than
  // any deck line does, so walk aft from amidships until the top line drops at more than 45°
  const x0 = ((): number => {
    const step = (x1 - xStern) / 400;
    for (let x = (xStern + x1) / 2; x - step >= xStern; x -= step) {
      if ((sheerAt(body, x) ?? 0) - (sheerAt(body, x - step) ?? 0) > step) return x;
    }
    return xStern;
  })();
  const deckHalf = (x: number) => halfAt(body, x, sheerAt(body, x) ?? 0) ?? 0;
  const side = (x: number) => deckHalf(x) + out;
  // where the bow turn starts: the arc's front is at the stem (plus the offset) and its radius is the side's
  // half-breadth there, so the side line runs into the arc without a step
  const [xa, corner] = ((): [number, number] => {
    if (spec.corner !== undefined) {
      const c = Math.max(R, spec.corner);
      return [x1 + out - c, c];
    }
    let lo = x0;
    let hi = x1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (mid + side(mid) < x1 + out) lo = mid;
      else hi = mid;
    }
    return [lo, Math.max(R, side(lo))];
  })();
  const sheer = (x: number) => sheerAt(body, Math.min(x1, Math.max(x0, x))) ?? 0;
  // the bow lifts the tube a little, rising from where the turn starts
  const lift = (x: number) => (x <= xa ? 0 : rise * Math.min(1, (x - xa) / Math.max(1e-9, x1 + out - xa)) ** 2);
  const height = (x: number) => sheer(x) + up + lift(x);
  const path: [number, number, number][] = [];
  const radius: number[] = [];
  const add = (x: number, y: number, z: number, r: number) => {
    path.push([x, y, z]);
    radius.push(r);
  };
  // the port side, from its aft end forward: the cone, then along the deck edge (straight aft of the transom)
  const sideXs: number[] = [];
  const steps = 48;
  // the tubes end aft of the hull's aftmost point (a raked transom's foot can lie aft of the deck's end)
  const end = Math.min(x0, xStern) - aft;
  for (let i = 0; i <= 8; i++) sideXs.push(end + ((x0 - end) * i) / 8);
  for (let i = 1; i <= steps; i++) sideXs.push(x0 + ((xa - x0) * i) / steps);
  const radiusAt = (x: number) => (x >= end + cone ? R : R * (coneEnd + (1 - coneEnd) * ((x - end) / cone)));
  // over the last corner-radius before the turn the side eases onto the arc's radius (it is already there when the
  // corner is worked out from the hull, not when it is given)
  // aft of the deck's widest point the tubes run straight and parallel, as a RIB's do, not in to a narrower transom
  const widest = ((): number => {
    let best = x0;
    for (let i = 0; i <= 200; i++) {
      const x = x0 + ((xa - x0) * i) / 200;
      if (side(x) > side(best)) best = x;
    }
    return best;
  })();
  const zSide = (x: number) => {
    const z = side(Math.max(widest, x));
    const t = (x - (xa - corner)) / corner;
    return t <= 0 ? z : z + (corner - z) * Math.min(1, t) ** 2;
  };
  for (const x of sideXs) add(x, height(x), body.center - zSide(x), radiusAt(x));
  // round the bow: a half circle in plan centred on the body's centre line
  const arc = 32;
  for (let i = 1; i < arc; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / arc;
    const x = xa + corner * Math.cos(a);
    add(x, height(x), body.center + corner * Math.sin(a), R);
  }
  // the starboard side, back aft
  for (let i = sideXs.length - 1; i >= 0; i--) {
    const x = sideXs[i];
    add(x, height(x), body.center + zSide(x), radiusAt(x));
  }
  return { path, radius };
}

/** The tube's lowest point (m, in the hull's frame): below 0 it is in the water at rest. */
export function tubeBottom(tube: Tube): number {
  return Math.min(...tube.path.map(([, y], i) => y - tube.radius[i]));
}
