// The queries on a hull's sections: the shape between stations is found by height fraction, so a station's
// bottom and sheer interpolate along the length and each section's half-breadths interpolate at the same share
// of the way up. That keeps the skin closed between stations of different depths and shapes.

import type { Vec2 } from "../model.ts";
import type { Hull, HullBody, Section, SectionPoint } from "./types.ts";

const bottomOf = (s: Section): number => s.points[0][0];
const sheerOf = (s: Section): number => s.points[s.points.length - 1][0];

/** A point's half-breadth to port (side −1) or to starboard (side 1). */
const sideHalf = (p: SectionPoint, side: -1 | 1): number => (side > 0 ? (p[2] ?? p[1]) : p[1]);

/** Half-breadth of a section, port or starboard, at height fraction t (0 at its lowest point, 1 at the sheer). */
function halfAtFraction(s: Section, t: number, side: -1 | 1 = -1): number {
  const p = s.points;
  const y0 = bottomOf(s);
  const span = sheerOf(s) - y0;
  if (span <= 1e-9) return sideHalf(t <= 0 ? p[0] : p[p.length - 1], side);
  const y = y0 + span * Math.min(1, Math.max(0, t));
  for (let i = 1; i < p.length; i++) {
    if (y <= p[i][0]) {
      const dy = p[i][0] - p[i - 1][0];
      const w = dy > 1e-12 ? (y - p[i - 1][0]) / dy : 1;
      return sideHalf(p[i - 1], side) + (sideHalf(p[i], side) - sideHalf(p[i - 1], side)) * w;
    }
  }
  return sideHalf(p[p.length - 1], side);
}

/** Whether a section is asymmetric: some point gives its own starboard half-breadth. */
const asymmetric = (s: Section): boolean => s.points.some((p) => p[2] !== undefined);

/** The two stations either side of x and how far between them x lies, or null outside the body. */
function bracket(body: HullBody, x: number): { a: Section; b: Section; w: number } | null {
  const s = body.sections;
  if (x < s[0].x - 1e-9 || x > s[s.length - 1].x + 1e-9) return null;
  let i = 1;
  while (i < s.length - 1 && s[i].x < x) i++;
  const a = s[i - 1];
  const b = s[i];
  const dx = b.x - a.x;
  return { a, b, w: dx > 1e-12 ? Math.min(1, Math.max(0, (x - a.x) / dx)) : 0 };
}

/** Where the body starts and ends along the length. */
export function bodyRange(body: HullBody): [number, number] {
  return [body.sections[0].x, body.sections[body.sections.length - 1].x];
}

/** The lowest point of the body at x (keel line, or the stem's rise), or null outside it. */
export function bottomAt(body: HullBody, x: number): number | null {
  const k = bracket(body, x);
  return k && bottomOf(k.a) + (bottomOf(k.b) - bottomOf(k.a)) * k.w;
}

/** The height of the sheer (deck edge) at x, or null outside the body. */
export function sheerAt(body: HullBody, x: number): number | null {
  const k = bracket(body, x);
  return k && sheerOf(k.a) + (sheerOf(k.b) - sheerOf(k.a)) * k.w;
}

/**
 * Half-breadth of the body at x and height y, to port (side −1, and the same to starboard on a symmetric hull) or
 * to starboard (side 1): null outside the body's length, below its bottom or above its top (the sheer, or the top
 * of a part such as a bulb, or a submerged hull's top, that ends lower).
 */
export function halfAt(body: HullBody, x: number, y: number, side: -1 | 1 = -1): number | null {
  const k = bracket(body, x);
  if (!k) return null;
  const bottom = bottomOf(k.a) + (bottomOf(k.b) - bottomOf(k.a)) * k.w;
  if (y < bottom - 1e-9) return null;
  const sheer = sheerOf(k.a) + (sheerOf(k.b) - sheerOf(k.a)) * k.w;
  if (y > sheer + 1e-9) return null;
  const t = sheer - bottom > 1e-9 ? (y - bottom) / (sheer - bottom) : 1;
  return halfAtFraction(k.a, t, side) + (halfAtFraction(k.b, t, side) - halfAtFraction(k.a, t, side)) * k.w;
}

/** The height fractions (0 to 1) of a section's points. */
function fractions(s: Section): number[] {
  const y0 = bottomOf(s);
  const span = sheerOf(s) - y0;
  return span > 1e-9 ? s.points.map(([y]) => (y - y0) / span) : [0, 1];
}

/**
 * The section at any x along the body: between stations, a point at every height fraction either station has a
 * point at, so it is exact (the shape between those points is a straight line). Null outside the body.
 */
export function sectionAt(body: HullBody, x: number): Section | null {
  const k = bracket(body, x);
  if (!k) return null;
  const ts = [...new Set([...fractions(k.a), ...fractions(k.b)].map((t) => Math.round(t * 1e12) / 1e12))].sort((p, q) => p - q);
  const bottom = bottomOf(k.a) + (bottomOf(k.b) - bottomOf(k.a)) * k.w;
  const sheer = sheerOf(k.a) + (sheerOf(k.b) - sheerOf(k.a)) * k.w;
  const at = (t: number, side: -1 | 1) => halfAtFraction(k.a, t, side) + (halfAtFraction(k.b, t, side) - halfAtFraction(k.a, t, side)) * k.w;
  const both = asymmetric(k.a) || asymmetric(k.b);
  return { x, points: ts.map((t): SectionPoint => (both ? [bottom + (sheer - bottom) * t, at(t, -1), at(t, 1)] : [bottom + (sheer - bottom) * t, at(t, -1)])) };
}

/** The station positions with each interval split into `split` parts: where the queries are sampled along x. */
export function sampleXs(body: HullBody, split = 4): number[] {
  const s = body.sections;
  const xs = [s[0].x];
  for (let i = 1; i < s.length; i++) for (let j = 1; j <= split; j++) xs.push(s[i - 1].x + ((s[i].x - s[i - 1].x) * j) / split);
  return xs;
}

/** The x between a (the body is there at height y) and b (it is not) where its edge passes through y. */
function crossing(body: HullBody, y: number, a: number, b: number): number {
  for (let i = 0; i < 40; i++) {
    const mid = (a + b) / 2;
    if (halfAt(body, mid, y) !== null) a = mid;
    else b = mid;
  }
  return a;
}

/**
 * The outline of one body at height y in plan ([x, z]): port side from aft forward, then starboard back. Null
 * when the body is nowhere at that height. Where it is there in more than one stretch (a keel line rising through
 * y at both ends, a bulb below the waterline), the longest is taken.
 */
export function bodyOutlineAt(body: HullBody, y: number): Vec2[] | null {
  const xs = sampleXs(body);
  const reaches = xs.map((x) => halfAt(body, x, y) !== null);
  let best: [number, number] | null = null;
  for (let i = 0; i < xs.length; ) {
    if (!reaches[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < xs.length && reaches[j + 1]) j++;
    if (!best || xs[j] - xs[i] > xs[best[1]] - xs[best[0]]) best = [i, j];
    i = j + 1;
  }
  if (!best) return null;
  const [i0, i1] = best;
  const x0 = i0 > 0 ? crossing(body, y, xs[i0], xs[i0 - 1]) : xs[i0];
  const x1 = i1 < xs.length - 1 ? crossing(body, y, xs[i1], xs[i1 + 1]) : xs[i1];
  const along = [x0, ...xs.slice(i0, i1 + 1).filter((x) => x > x0 + 1e-9 && x < x1 - 1e-9), x1];
  const halves = along.map((x) => halfAt(body, x, y) ?? 0);
  const outer = along.map((x) => halfAt(body, x, y, 1) ?? 0);
  const port: Vec2[] = along.map((x, k) => [x, body.center - halves[k]]);
  const starboard: Vec2[] = along.map((x, k): Vec2 => [x, body.center + outer[k]]).reverse();
  // a half-breadth of zero at either end is one point, not two
  if (halves[halves.length - 1] < 1e-9 && outer[outer.length - 1] < 1e-9) starboard.shift();
  if (halves[0] < 1e-9 && outer[0] < 1e-9) starboard.pop();
  return [...port, ...starboard];
}

/** The outlines of every body at height y (the waterline at 0, a deck at its sole height). */
export function outlineAt(hull: Hull, y: number): Vec2[][] {
  return hull.bodies.map((b) => bodyOutlineAt(b, y)).filter((o): o is Vec2[] => !!o);
}
