// Hull forms the Ship-D parameterisation does not reach, built on the hull interface: asymmetric demihulls, stepped
// planing bottoms, the thin struts of a SWATH, and outriggers (floats beside a main hull, and hydrofoil outriggers).

import { nacaHalf, type FoilSpec } from "./parts.ts";
import { bodyRange, sectionAt } from "./sections.ts";
import type { HullBody, Section, SectionPoint } from "./types.ts";

/**
 * A body made asymmetric: its inboard side (port −1 or starboard 1) narrowed to `share` of its half-breadth, as an
 * asymmetric catamaran demihull is fuller outboard and nearly flat inboard. 1 leaves it as it was.
 */
export function asymmetricBody(body: HullBody, inboard: -1 | 1, share: number): HullBody {
  const k = Math.min(1, Math.max(0, share));
  return {
    center: body.center,
    sections: body.sections.map((s) => ({
      x: s.x,
      points: s.points.map(([y, half, other]): SectionPoint => {
        const port = half;
        const starboard = other ?? half;
        return inboard < 0 ? [y, port * k, starboard] : [y, port, starboard * k];
      }),
    })),
  };
}

export interface Step {
  /** Where the step is along the length (m), and how far the bottom aft of it rises (m). */
  x: number;
  height: number;
}

/**
 * A stepped planing bottom: aft of each step the bottom is raised by the step's height (the steps forward of a
 * station add up), keeping its shape, and easing back to nothing at the sheer so the topsides and deck are
 * unchanged. Each step gets a station either side of it, so it is sharp.
 */
export function steppedBody(body: HullBody, steps: readonly Step[], sharpness = 1e-3): HullBody {
  const [x0, x1] = bodyRange(body);
  const extra = steps.flatMap((s) => [s.x - sharpness, s.x + sharpness]).filter((x) => x > x0 && x < x1);
  const xs = [...new Set([...body.sections.map((s) => s.x), ...extra])].sort((a, b) => a - b);
  const sections: Section[] = [];
  for (const x of xs) {
    const s = sectionAt(body, x);
    if (!s) continue;
    // the steps forward of this station: their rise is what this part of the bottom has been lifted by
    const lift = steps.filter((st) => st.x > x).reduce((sum, st) => sum + st.height, 0);
    const bottom = s.points[0][0];
    const top = s.points[s.points.length - 1][0];
    const span = Math.max(1e-9, top - bottom);
    sections.push({
      x,
      points: s.points.map(([y, ...h]): SectionPoint => [y + lift * (1 - (y - bottom) / span), ...h] as SectionPoint),
    });
  }
  return { center: body.center, sections };
}

export interface StrutSpec {
  /** Length along the waterline (m) and greatest thickness (m), a NACA four-digit section in plan. */
  length: number;
  thickness: number;
  /** Heights of the strut's foot and head (m), its centre line across (m), and where its trailing edge is (m). */
  bottom: number;
  top: number;
  center?: number;
  aft?: number;
  stations?: number;
}

/**
 * A strut: a thin, wall-sided body with a foil's shape in plan, joining a SWATH's submerged hulls to its deck.
 * Its foot can sit on a submerged hull's top: the two touch along a line without overlapping.
 */
export function strutBody(s: StrutSpec): HullBody {
  const n = Math.max(3, Math.round(s.stations ?? 81));
  const aft = s.aft ?? 0;
  const t = s.thickness / s.length;
  return {
    center: s.center ?? 0,
    sections: Array.from({ length: n }, (_, i) => {
      // closer together at the leading edge, where the section's square root turns fastest
      const fromBow = ((1 - Math.cos((Math.PI * i) / (n - 1))) / 2) * s.length;
      const x = aft + s.length - fromBow;
      const h = nacaHalf(t, fromBow / s.length) * s.length;
      return { x, points: [[s.bottom, h], [s.top, h]] as SectionPoint[] };
    }).reverse(),
  };
}

/** A body moved: across to a new centre line and along by `shift` (m). */
export function placeBody(body: HullBody, center: number, shift = 0): HullBody {
  return { center, sections: body.sections.map((s) => ({ x: s.x + shift, points: s.points })) };
}

export interface OutriggerSpec {
  /** How far the floats' centre lines are from the main hull's (m). */
  spacing: number;
  /** One float to port (−1) or starboard (1), or one each side (0). */
  side: -1 | 0 | 1;
  /** How far the floats are moved along (m), forward positive. */
  shift?: number;
}

/**
 * Outrigger floats beside a main hull: one (a canoe's ama, to one side) or a pair (a double outrigger). `float` is
 * the float's own body at centre line 0; the main hull's centre line is taken as 0.
 */
export function outriggerBodies(float: HullBody, o: OutriggerSpec): HullBody[] {
  const sides = o.side === 0 ? [-1, 1] : [o.side];
  return sides.map((sd) => placeBody(float, sd * o.spacing, o.shift ?? 0));
}

export interface FoilOutriggerSpec {
  /** Where the strut meets the outrigger arm: along, height, across (m). */
  at: [number, number, number];
  /** The strut's length down and its chord (m). */
  strut: number;
  strutChord: number;
  /** The foil at the strut's foot: its whole span (half each side of the strut) and chord (m). */
  span: number;
  chord: number;
  thickness?: number;
  /** The foil's angle of incidence (degrees): its lift. */
  incidence?: number;
}

/**
 * A hydrofoil outrigger: a strut hanging from an outrigger arm with a T foil at its foot, as the foils of a
 * trimaran's floats or a stabilised small craft. Given as foils, so they have the parts' geometry and volume.
 */
export function foilOutrigger(f: FoilOutriggerSpec): FoilSpec[] {
  const [x, y, z] = f.at;
  const thickness = f.thickness ?? 0.12;
  const foot: [number, number, number] = [x + (f.chord - f.strutChord) / 2, y - f.strut, z];
  return [
    { root: [x, y, z], rootChord: f.strutChord, tipChord: f.strutChord, span: f.strut, direction: 0, thickness },
    { root: foot, rootChord: f.chord, tipChord: f.chord, span: f.span / 2, direction: 90, thickness, incidence: f.incidence },
    { root: foot, rootChord: f.chord, tipChord: f.chord, span: f.span / 2, direction: -90, thickness, incidence: f.incidence },
  ];
}
