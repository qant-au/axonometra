// A simple parametric hull: a monohull or a catamaran from its main dimensions, as sections at stations. It is
// the hull a plan gets before a better one is chosen, and the first hull behind the interface; the shape terms
// are deliberately few (the deck line in plan, the keel line, the bilge, the flare).

import type { Hull, HullBody, Section, SectionPoint } from "./types.ts";

export interface ParametricHullSpec {
  hull: "monohull" | "catamaran";
  /** Length overall (m). */
  length: number;
  /** Greatest beam (m); a catamaran's across both hulls. */
  beam: number;
  /** Depth of the hull body below the waterline (m), appendages not included. */
  draft: number;
  /** Height of the sheer above the waterline at the stern (m); it rises towards the bow. */
  freeboard: number;
  /** A catamaran's hull: its greatest beam (m); a quarter of the overall beam when not given. */
  hullBeam?: number;
  /** Stations along the length (at least 3) and points per section (at least 4). */
  stations?: number;
  levels?: number;
}

interface Shape {
  /** The deck line's breadth at the transom, as a share of the greatest. */
  transom: number;
  /** Where the deck line is widest (share of the length). */
  widest: number;
  /** The keel's depth at the transom, as a share of the draft. */
  stern: number;
  /** The waterline's breadth amidships as a share of the deck line's (the rest is flare). */
  full: number;
  /** The flat of the bottom amidships as a share of the waterline breadth (0 = a round or V bottom). */
  flat: number;
}

const MONOHULL: Shape = { transom: 0.78, widest: 0.42, stern: 0.3, full: 0.82, flat: 0.15 };
const CAT_HULL: Shape = { transom: 0.7, widest: 0.5, stern: 0.4, full: 0.92, flat: 0.08 };

/** The keel line reaches full depth here and holds it to `KEEL_END`, then rises to the forefoot at `FOREFOOT`. */
const KEEL_FULL = 0.35;
const KEEL_END = 0.6;
const FOREFOOT = 0.94;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** The sheer at u (share of the length): the freeboard aft, rising a quarter by the stem. */
function sheer(freeboard: number, u: number): number {
  return freeboard * (1 + 0.25 * u * u);
}

/** The deck line's half-breadth at u, 0 at the stem. */
function deckHalf(half: number, s: Shape, u: number): number {
  if (u <= s.widest) return half * (s.transom + (1 - s.transom) * Math.sin((Math.PI / 2) * (u / s.widest)));
  const w = (u - s.widest) / (1 - s.widest);
  return half * Math.max(0, 1 - Math.pow(w, 2.2));
}

/** The lowest point at u: the keel line below the water, forward of the forefoot the stem rising to the sheer. */
function bottom(draft: number, freeboard: number, s: Shape, u: number): number {
  if (u <= KEEL_FULL) return -draft * (s.stern + (1 - s.stern) * Math.sin((Math.PI / 2) * (u / KEEL_FULL)));
  if (u <= KEEL_END) return -draft;
  if (u <= FOREFOOT) return -draft * Math.cos((Math.PI / 2) * ((u - KEEL_END) / (FOREFOOT - KEEL_END)));
  return sheer(freeboard, 1) * Math.pow((u - FOREFOOT) / (1 - FOREFOOT), 1.5);
}

/** One section: the bilge below the water (a flat turning into a round), the topsides flaring to the deck line. */
function section(x: number, u: number, deck: number, low: number, top: number, s: Shape, levels: number): Section {
  const points: SectionPoint[] = [];
  if (low >= 0 || deck <= 1e-9) {
    // the stem above the water: a narrow V up to the deck line
    for (let j = 0; j < levels; j++) {
      const t = j / (levels - 1);
      points.push([low + (top - low) * t, deck * t]);
    }
    return { x, points };
  }
  // finer forward: less of the deck breadth at the water, less flat
  const fwd = clamp01((u - 0.55) / 0.45);
  const wl = deck * s.full * (1 - 0.55 * Math.pow(fwd, 1.5));
  const flat = s.flat * (1 - fwd);
  const below = Math.max(2, Math.round((levels * 2) / 3));
  for (let j = 0; j < below; j++) {
    const t = j / (below - 1);
    const round = 1 - Math.pow(1 - t, 1.7);
    points.push([low * (1 - t), wl * (flat + (1 - flat) * round)]);
  }
  const above = Math.max(2, levels - below + 1);
  for (let j = 1; j < above; j++) {
    const t = j / (above - 1);
    points.push([top * t, wl + (deck - wl) * t]);
  }
  return { x, points };
}

function body(spec: ParametricHullSpec, half: number, center: number, s: Shape): HullBody {
  const n = Math.max(3, Math.round(spec.stations ?? 41));
  const levels = Math.max(4, Math.round(spec.levels ?? 13));
  const sections: Section[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = u * spec.length;
    sections.push(section(x, u, deckHalf(half, s, u), bottom(spec.draft, spec.freeboard, s, u), sheer(spec.freeboard, u), s, levels));
  }
  return { center, sections };
}

/** The hull for these dimensions: one body, or a catamaran's two either side of the centre line. */
export function parametricHull(spec: ParametricHullSpec): Hull {
  if (spec.hull === "catamaran") {
    const hullBeam = Math.min(spec.beam / 2, spec.hullBeam ?? spec.beam / 4);
    const offset = (spec.beam - hullBeam) / 2;
    return { bodies: [body(spec, hullBeam / 2, -offset, CAT_HULL), body(spec, hullBeam / 2, offset, CAT_HULL)] };
  }
  return { bodies: [body(spec, spec.beam / 2, 0, MONOHULL)] };
}
