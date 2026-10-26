// A hull's hydrostatics at a waterline, from the section queries alone, so every hull source gets the same
// numbers: the immersed volume and its centre, the waterplane and its moments, the metacentric radii. The
// centre of gravity is not the hull's to know (it comes from what is aboard), so the metacentric heights are
// left to the caller: GM = VCB + BM − VCG, VCB and VCG as heights in the hull's frame (y; at the design waterline
// that is the height above the water). A hull wholly under the water
// (a submarine) has no waterplane, so BM is 0 and its stability is VCB − VCG alone: the centre of gravity has to
// sit below the centre of buoyancy.

import type { Vec2 } from "../model.ts";
import { outlineAt, sampleXs, sectionAt } from "./sections.ts";
import type { Hull, HullBody, SectionPoint } from "./types.ts";

/** Sea water (t/m³). */
export const SEA_WATER = 1.025;

export interface Hydrostatics {
  /** Immersed volume (m³) and the mass it carries (t). */
  volume: number;
  displacement: number;
  /** Centre of buoyancy: along the length (x), its height (y, negative below the waterline) and across (z, 0 on the centre line of a hull symmetric about it). */
  lcb: number;
  vcb: number;
  tcb: number;
  /** Waterplane area (m²) and its centre: along the length (the centre of flotation) and across. */
  waterplane: number;
  lcf: number;
  tcf: number;
  /** Second moments of the waterplane about its own centre: across (heel) and along (trim). */
  iT: number;
  iL: number;
  /** Metacentric radii, transverse and longitudinal (m). */
  bmT: number;
  bmL: number;
  /** Length and greatest breadth of the waterplane (m). */
  lwl: number;
  bwl: number;
}

/**
 * Immersed area of the section at x below height wl, and its first moment about y = 0: exact, strip by strip
 * between the section's points (the breadth is a straight line across each strip).
 */
function sectionArea(body: HullBody, x: number, wl: number): { area: number; my: number; mz: number } {
  const s = sectionAt(body, x);
  if (!s || s.points[0][0] >= wl) return { area: 0, my: 0, mz: 0 };
  let area = 0;
  let my = 0;
  let mz = 0;
  // a strip between two heights, w the breadth and c the middle of it across (off the centre line when asymmetric)
  const strip = (y0: number, w0: number, c0: number, y1: number, w1: number, c1: number) => {
    const dy = y1 - y0;
    area += ((w0 + w1) / 2) * dy;
    my += (dy * (w0 * (2 * y0 + y1) + w1 * (y0 + 2 * y1))) / 6;
    mz += (dy * (w0 * (2 * c0 + c1) + w1 * (c0 + 2 * c1))) / 6;
  };
  const p = s.points;
  const breadth = (q: SectionPoint) => q[1] + (q[2] ?? q[1]);
  const middle = (q: SectionPoint) => body.center + ((q[2] ?? q[1]) - q[1]) / 2;
  for (let i = 1; i < p.length; i++) {
    const y0 = p[i - 1][0];
    let y1 = p[i][0];
    if (y0 >= wl) break;
    const w0 = breadth(p[i - 1]);
    const c0 = middle(p[i - 1]);
    let w1 = breadth(p[i]);
    let c1 = middle(p[i]);
    if (y1 > wl) {
      const f = (wl - y0) / (y1 - y0);
      w1 = w0 + (w1 - w0) * f;
      c1 = c0 + (c1 - c0) * f;
      y1 = wl;
    }
    strip(y0, w0, c0, y1, w1, c1);
  }
  // a waterline over the section's top (a submerged hull, a bulb) adds nothing: the hull ends there
  return { area, my, mz };
}

/** Area, first moment along x and second moments of a plan polygon ([x, z]): about z = 0 and about x = 0. */
function planeMoments(poly: readonly Vec2[]): { area: number; sx: number; sz: number; izz: number; ixx: number } {
  let area = 0;
  let sx = 0;
  let sz = 0;
  let izz = 0;
  let ixx = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, z0] = poly[i];
    const [x1, z1] = poly[(i + 1) % poly.length];
    const cross = x0 * z1 - x1 * z0;
    area += cross;
    sx += (x0 + x1) * cross;
    sz += (z0 + z1) * cross;
    izz += (z0 * z0 + z0 * z1 + z1 * z1) * cross;
    ixx += (x0 * x0 + x0 * x1 + x1 * x1) * cross;
  }
  const sign = area < 0 ? -1 : 1;
  return { area: (sign * area) / 2, sx: (sign * sx) / 6, sz: (sign * sz) / 6, izz: (sign * izz) / 12, ixx: (sign * ixx) / 12 };
}

/** The hull's hydrostatics floating at height `waterline` (0 = the design waterline), in water of `density`. */
export function hydrostatics(hull: Hull, waterline = 0, density = SEA_WATER): Hydrostatics {
  let volume = 0;
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (const body of hull.bodies) {
    // the trapezoid rule over the stations, each interval split (a section's area varies as the square between
    // stations): eightfold for a sparse hull, less as stations get denser, down to none from 800 stations
    const xs = sampleXs(body, Math.min(8, Math.max(1, Math.ceil(800 / body.sections.length))));
    const s = xs.map((x) => sectionArea(body, x, waterline));
    for (let i = 1; i < xs.length; i++) {
      const dx = xs[i] - xs[i - 1];
      volume += ((s[i - 1].area + s[i].area) / 2) * dx;
      mx += ((s[i - 1].area * xs[i - 1] + s[i].area * xs[i]) / 2) * dx;
      my += ((s[i - 1].my + s[i].my) / 2) * dx;
      mz += ((s[i - 1].mz + s[i].mz) / 2) * dx;
    }
  }
  let waterplane = 0;
  let sx = 0;
  let sz = 0;
  let izz = 0;
  let ixx = 0;
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const outline of outlineAt(hull, waterline)) {
    const m = planeMoments(outline);
    waterplane += m.area;
    sx += m.sx;
    sz += m.sz;
    izz += m.izz;
    ixx += m.ixx;
    for (const [x, z] of outline) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
  }
  const safeV = Math.max(1e-9, volume);
  const lcf = waterplane > 0 ? sx / waterplane : 0;
  const tcf = waterplane > 0 ? sz / waterplane : 0;
  // the transverse second moment about the waterplane's own centre across (0 for a hull symmetric overall)
  const iT = Math.max(0, izz - waterplane * tcf * tcf);
  // the longitudinal second moment moved to the centre of flotation (parallel axis)
  const iL = Math.max(0, ixx - waterplane * lcf * lcf);
  return {
    volume,
    displacement: volume * density,
    lcb: volume > 0 ? mx / safeV : 0,
    vcb: volume > 0 ? my / safeV : 0,
    tcb: volume > 0 ? mz / safeV : 0,
    waterplane,
    lcf,
    tcf,
    iT,
    iL,
    bmT: volume > 0 ? iT / safeV : 0,
    bmL: volume > 0 ? iL / safeV : 0,
    lwl: waterplane > 0 ? x1 - x0 : 0,
    bwl: waterplane > 0 ? z1 - z0 : 0,
  };
}
