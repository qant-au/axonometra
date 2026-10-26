// Round hulls: a body of revolution about a horizontal axis, as sections of the hull interface. A houseboat's
// pontoons are this (an aluminium tube with a rounded cone at the bow), and so is a submarine or a research
// submersible's pressure hull.

import type { HullBody, SectionPoint } from "./types.ts";

export interface RevolutionOptions {
  /** The body's centre line across the boat (m). */
  center?: number;
  /** Height of the axis (m): 0 is on the waterline, negative below it. */
  axis?: number;
  /** Where the body's stern sits along the length (m). */
  aft?: number;
  /** Stations along the length and points round each half section. */
  stations?: number;
  levels?: number;
}

/** A body of revolution: radius(x) for x from 0 at the stern to length at the bow. */
export function revolutionBody(length: number, radius: (x: number) => number, options: RevolutionOptions = {}): HullBody {
  const n = Math.max(3, Math.round(options.stations ?? 121));
  const m = Math.max(3, Math.round(options.levels ?? 33));
  const axis = options.axis ?? 0;
  const aft = options.aft ?? 0;
  // stations closer together at the ends, where the radius changes fastest
  const xs = Array.from({ length: n }, (_, i) => (length * (1 - Math.cos((Math.PI * i) / (n - 1)))) / 2);
  return {
    center: options.center ?? 0,
    sections: xs.map((x) => {
      const r = Math.max(0, radius(x));
      const points: SectionPoint[] = Array.from({ length: m }, (_, j) => {
        const a = -Math.PI / 2 + (Math.PI * j) / (m - 1);
        return [axis + r * Math.sin(a), r * Math.cos(a)];
      });
      return { x: aft + x, points };
    }),
  };
}

export interface PontoonSpec extends RevolutionOptions {
  /** Length overall (m) and the tube's diameter (m). */
  length: number;
  diameter: number;
  /** Length of the nose cone (m); 1.5 diameters when not given. */
  nose?: number;
  /** Radius of the rounded tip of the cone, as a share of the tube's radius; 0.25 when not given. */
  tip?: number;
  /** Length of a taper at the stern to six tenths of the radius, capped flat (m); 0 (a flat end cap) when not given. */
  tail?: number;
}

/**
 * A pontoon: a round tube with a rounded cone at the bow, and a flat end cap or a short cone at the stern. Give
 * `axis` as the height of the tube's centre: a tube floating with its axis 5 cm above the water is axis 0.05.
 */
export function pontoonBody(spec: PontoonSpec): HullBody {
  const L = spec.length;
  const R = spec.diameter / 2;
  const nose = Math.min(L, spec.nose ?? 3 * R);
  const rt = Math.min(0.99, Math.max(0, spec.tip ?? 0.25)) * R;
  const tail = Math.min(L - nose, Math.max(0, spec.tail ?? 0));
  // the cone's half-angle, so that a cone tangent to a tip sphere of radius rt (its front at L) reaches the full
  // radius `nose` aft of the front: nose = rt − rt / sin α + R / tan α
  const length = (a: number) => rt - rt / Math.sin(a) + R / Math.tan(a);
  let lo = 1e-4;
  let hi = Math.PI / 2 - 1e-4;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (length(mid) > nose) lo = mid;
    else hi = mid;
  }
  const alpha = (lo + hi) / 2;
  const xc = L - rt; // the tip sphere's centre
  const apex = xc + rt / Math.sin(alpha);
  const tangent = xc + rt * Math.sin(alpha);
  const radius = (x: number): number => {
    if (x < tail) return R * (0.6 + 0.4 * (x / tail));
    if (x <= L - nose) return R;
    if (x <= tangent) return Math.min(R, (apex - x) * Math.tan(alpha));
    return Math.sqrt(Math.max(0, rt * rt - (x - xc) ** 2));
  };
  return revolutionBody(L, radius, spec);
}
