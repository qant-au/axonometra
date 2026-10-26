// A hard-chine plate hull: the kind an aluminium boat is built from, flat plates bent along their length. Each section
// is a straight bottom panel from the keel up to the chine at the boat's deadrise, a narrow reverse chine (the ledge
// that turns spray down), and a straight, flared topside up to the sheer. The deadrise holds aft and steepens into a
// fine entry; the keel line runs level aft and sweeps up into a raked stem.

import type { Hull, Section, SectionPoint } from "./types.ts";

export interface PlateHullSpec {
  /** Length overall (m), transom to stem head. */
  length: number;
  /** Greatest beam at the sheer (m). */
  beam: number;
  /** Width across the top of the transom (m): wide for twin outboards. */
  transom: number;
  /** Width across the chines at the transom (m). */
  chineBeam: number;
  /** Depth of the keel below the waterline aft (m). */
  draft: number;
  /** Height of the sheer above the waterline at the transom (m); it rises towards the bow. */
  freeboard: number;
  /** Deadrise of the bottom aft (degrees), held to 40 % of the length and steepening to 60° at the stem. */
  deadrise: number;
  /** Width of the reverse chine's ledge (m). */
  ledge?: number;
  stations?: number;
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const DEG = Math.PI / 180;

/** The hull's measures at u (share of the length from the transom). */
function lines(s: PlateHullSpec, u: number) {
  const fwd = clamp01((u - 0.5) / 0.5);
  const sheer = s.freeboard * (1 + 0.38 * u * u);
  // the deck line: the transom's width aft, the greatest beam amidships, closing to the stem
  const half = u <= 0.5 ? s.transom / 2 + (s.beam / 2 - s.transom / 2) * Math.sin((Math.PI / 2) * (u / 0.5)) : (s.beam / 2) * (1 - Math.pow(fwd, 1.9));
  // the keel: level aft and through most of the length, so the waterline is long, then sweeping up into the stem
  const forefoot = clamp01((u - 0.55) / 0.45);
  const keel = -s.draft + (sheer - 0.02 + s.draft) * Math.pow(forefoot, 2.6);
  const deadrise = s.deadrise + (60 - s.deadrise) * Math.pow(clamp01((u - 0.4) / 0.6), 1.5);
  let chine = Math.max(0, Math.min((s.chineBeam / 2) * (1 - Math.pow(fwd, 1.6)), half - 0.08));
  // the chine stays below the sheer: forward, where the bottom is steep, it is held lower and closer in
  const rise = Math.tan(deadrise * DEG);
  const top = keel + 0.9 * (sheer - keel);
  if (keel + chine * rise > top) chine = (top - keel) / rise;
  return { sheer, half, keel, deadrise, chine, ledge: (s.ledge ?? 0.05) * (chine / (s.chineBeam / 2)) };
}

/** One section: keel to chine in a straight line, the ledge, then the topside straight to the sheer. */
function section(s: PlateHullSpec, u: number): Section {
  const { sheer, half, keel, deadrise, chine, ledge } = lines(s, u);
  const x = u * s.length;
  if (half <= 1e-6) return { x, points: [[keel, 0], [sheer, 0]] };
  // right forward the chine has run out: the stem's narrow V, keel to sheer
  if (chine < 0.02) return { x, points: [0, 1, 2, 3].map((j): SectionPoint => [keel + ((sheer - keel) * j) / 3, (half * j) / 3]) };
  const chineY = keel + chine * Math.tan(deadrise * DEG);
  const points: SectionPoint[] = [];
  for (let j = 0; j <= 3; j++) points.push([keel + ((chineY - keel) * j) / 3, (chine * j) / 3]);
  const lip = Math.min(0.012, (sheer - chineY) / 4);
  const out = Math.min(chine + ledge, half);
  for (let j = 0; j <= 2; j++) points.push([chineY + lip + ((sheer - chineY - lip) * j) / 2, out + ((half - out) * j) / 2]);
  return { x, points };
}

/** The hull: one body on the centre line. */
export function plateHull(spec: PlateHullSpec): Hull {
  const n = Math.max(3, Math.round(spec.stations ?? 81));
  return { bodies: [{ center: 0, sections: Array.from({ length: n }, (_, i) => section(spec, i / (n - 1))) }] };
}
