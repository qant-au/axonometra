// Axonometra: the hull types the first-run wizard offers, and the boat each one makes from her measures. Every type is
// a hull the hull code builds: the plate alloy boat (hull/plate.ts), the hull families in the Ship-D parameterisation
// (hull/examples.ts) and the parametric catamaran (hull/parametric.ts). A type starts at its own size and engines; the
// length, beam and draft the owner gives then size the hull: the shape stays, the size is hers.

import { SHIPD_EXAMPLES } from "../hull/examples.ts";
import { SHAFT } from "../hull/open.ts";
import { shipdFeasible } from "../hull/shipd.ts";
import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import { vesselShells } from "../vessel/shell.ts";
import type { VesselSpec } from "../vessel/spec.ts";

export interface HullMeasures {
  /** Length overall, greatest beam and greatest draft (m). */
  length: number;
  beam: number;
  draft: number;
  /** A catamaran: the beam of one of her hulls (m); with her beam overall, how far apart they stand. */
  hullBeam?: number;
}

export interface HullType {
  id: string;
  title: string;
  /** Her own size, which the basics start from; a type that asks a hull beam gives one here. */
  measures: HullMeasures;
  /** Her usual engines. */
  engine: "outboard" | "inboard";
  engines: number;
  /** What the room on her sole is called (a catamaran's are named by their hulls). */
  room: string;
  /** The measures that make no hull of this type, by field: none when the recipe can be made. */
  check(m: HullMeasures): (keyof HullMeasures)[];
  /** The boat at these measures, without her engines. */
  recipe(m: HullMeasures): VesselSpec;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** Plating of 5 mm, as the plate alloy boat has. */
const PLATING = 0.005;
/** A self-draining sole's height above the waterline (m), and a cabin sole's depth below it as a share of the hull's draft. */
const OPEN_SOLE = 0.15;
const CABIN_SOLE = 0.3;
/** The mounting height the stern takes: the extra-long shaft, or three quarters of the stern's height on a small boat. */
const shaft = (stern: number) => r3(Math.min(SHAFT.xl, 0.75 * stern));

// ——— the plate alloy boat ———

const PLATE = EXAMPLE_VESSELS["fishing-boat-6.5m"];

/** The plate boat's recipe at a size: along by her length, across by her beam, down by her draft. */
function plateRecipe(m: HullMeasures): VesselSpec {
  const spec = structuredClone(PLATE.spec);
  const p = (spec.hull as Extract<VesselSpec["hull"], { plate: unknown }>).plate;
  const along = m.length / p.length;
  const wider = m.beam / p.beam;
  const plate = { ...p, length: r3(m.length), beam: r3(m.beam), transom: r3(p.transom * wider), chineBeam: r3(p.chineBeam * wider), draft: r3(m.draft), ...(p.ledge ? { ledge: r3(p.ledge * wider) } : {}) };
  const t = spec.open.transom;
  // her own engines come from the basics
  delete spec.components;
  return {
    ...spec,
    hull: { plate },
    open: { ...spec.open, ...(spec.open.soleTo ? { soleTo: r3(spec.open.soleTo * along) } : {}), transom: { ...t, width: r3(Math.min(t.width * wider, plate.transom)), ...(t.well ? { well: r3(t.well * along) } : {}) } },
  };
}

// ——— the families in the Ship-D parameterisation ———

/** The numbers of a Ship-D vector that are breadths by the length: the deck's, the chine's, the transom chine's. */
const BREADTHS = [3, 7, 28];

/**
 * A family's vector at a size: the length is hers, the breadths follow her beam, and her draft goes under the
 * freeboard the family has at that length.
 */
function fitShipd(base: readonly number[], m: HullMeasures): number[] {
  const v = [...base];
  const freeboard = (1 - base[6]) * base[4] * m.length;
  const depth = m.draft + freeboard;
  const wider = m.beam / (base[3] * m.length);
  v[0] = m.length;
  for (const k of BREADTHS) v[k] = base[k] * wider;
  v[4] = depth / m.length;
  v[6] = m.draft / depth;
  return v.map(r6);
}

interface Family {
  /** The family's vector (hull/examples.ts), by name. */
  vector: string;
  /** A cabin boat's sole lies below the waterline; an open boat's above it, to drain. */
  cabin: boolean;
}

const vectorOf = (name: string) => SHIPD_EXAMPLES.find((e) => e.name === name)!.bodies[0].vector;

/** A family's boat on a hull of these measures. */
function shipdRecipe(f: Family, m: HullMeasures): VesselSpec {
  const v = fitShipd(vectorOf(f.vector), m);
  const depth = v[4] * v[0];
  // the stern's height: from the transom's foot, or the water under a counter, up to the deck
  const stern = depth * (1 - Math.min(v[23], v[6]));
  return {
    hull: { shipd: v },
    open: { plating: PLATING, sole: f.cabin ? r3(-CABIN_SOLE * m.draft) : OPEN_SOLE, transom: { height: shaft(stern), width: r3(0.6 * v[5] * m.beam) } },
  };
}

const shipdCheck = (f: Family, m: HullMeasures): (keyof HullMeasures)[] => (shipdFeasible(fitShipd(vectorOf(f.vector), m)) ? [] : ["beam"]);

const family = (f: Family) => ({ check: (m: HullMeasures) => shipdCheck(f, m), recipe: (m: HullMeasures) => shipdRecipe(f, m) });

// ——— the fin-keel sloop: the family's canoe body, with her keel, its bulb and her rudder under it ———

const SLOOP: Family = { vector: "sailing-yacht-10m", cabin: true };
/** The canoe body's draft and the keel bulb's diameter, as shares of her length. */
const CANOE = 0.055;
const BULB = 0.038;

/** A sloop's draft is her keel's: her canoe body keeps its own, by her length. */
const canoe = (m: HullMeasures): HullMeasures => ({ ...m, draft: CANOE * m.length });
/** The fin's span: from just inside the canoe body down to the bulb's middle. */
const finSpan = (m: HullMeasures) => m.draft - (BULB * m.length) / 2 - 0.05 * m.length;

function sloopRecipe(m: HullMeasures): VesselSpec {
  const L = m.length;
  const span = finSpan(m);
  return {
    ...shipdRecipe(SLOOP, canoe(m)),
    foils: [
      { root: [r3(0.56 * L), r3(-0.05 * L), 0], rootChord: r3(0.11 * L), tipChord: r3(0.075 * L), span: r3(span), sweep: 12, thickness: 0.12 },
      { root: [r3(0.14 * L), r3(-0.035 * L), 0], rootChord: r3(0.045 * L), tipChord: r3(0.032 * L), span: r3(0.58 * m.draft), sweep: 6, thickness: 0.12 },
    ],
    bulbs: [{ nose: [r3(0.555 * L), r3(-0.05 * L - span), 0], length: r3(0.18 * L), diameter: r3(BULB * L) }],
  };
}

// ——— the RIB: the family's deep-V hull inside her tube ———

const RIB: Family = { vector: "rib-6.5m", cabin: false };
/** The tube's diameter as a share of her beam overall; it sits three quarters of its diameter outboard of the deck edge. */
const TUBE = 0.17;
const inTube = (m: HullMeasures): HullMeasures => ({ ...m, beam: m.beam * (1 - 1.5 * TUBE) });

// ——— the catamaran: the parametric hull's two ———

function catamaranRecipe(m: HullMeasures): VesselSpec {
  const freeboard = r3(0.075 * m.length);
  return {
    hull: { parametric: { hull: "catamaran", length: r3(m.length), beam: r3(m.beam), hullBeam: r3(m.hullBeam ?? m.beam / 4), draft: r3(m.draft), freeboard } },
    // her transoms stay whole: an outboard hangs on each
    open: { plating: PLATING, sole: OPEN_SOLE, transom: { height: shaft(0.4 * m.draft + freeboard), width: 0 } },
  };
}

function catamaranCheck(m: HullMeasures): (keyof HullMeasures)[] {
  if (!(m.hullBeam && m.hullBeam > 0 && m.hullBeam * 2 < m.beam)) return ["hullBeam"];
  try {
    // a hull too narrow has no room for its sole
    vesselShells(catamaranRecipe(m));
    return [];
  } catch {
    return ["hullBeam"];
  }
}

export const HULL_TYPES: HullType[] = [
  { id: "fishing-boat-6.5m", title: PLATE.title, measures: { length: 6.5, beam: 2.45, draft: 0.36 }, engine: "outboard", engines: 2, room: "Cockpit", check: () => [], recipe: plateRecipe },
  { id: "fin-keel-sloop", title: "Fin-Keel Sloop", measures: { length: 10, beam: 3.3, draft: 1.9 }, engine: "inboard", engines: 1, room: "Cabin", check: (m) => (finSpan(m) > 0.02 * m.length ? shipdCheck(SLOOP, canoe(m)) : ["draft"]), recipe: sloopRecipe },
  { id: "semi-displacement-cruiser", title: "Semi-Displacement Cruiser", measures: { length: 14, beam: 4.6, draft: 1.2 }, engine: "inboard", engines: 1, room: "Cabin", ...family({ vector: "trawler-14m", cabin: true }) },
  { id: "planing-cruiser", title: "Planing Cruiser", measures: { length: 12, beam: 3.9, draft: 0.75 }, engine: "inboard", engines: 2, room: "Cabin", ...family({ vector: "planing-cruiser-12m", cabin: true }) },
  { id: "rib", title: "RIB", measures: { length: 6.5, beam: 2.95, draft: 0.45 }, engine: "outboard", engines: 1, room: "Cockpit", check: (m) => shipdCheck(RIB, inTube(m)), recipe: (m) => ({ ...shipdRecipe(RIB, inTube(m)), tube: { diameter: r3(TUBE * m.beam) } }) },
  { id: "catamaran", title: "Catamaran", measures: { length: 12, beam: 6.7, draft: 0.7, hullBeam: 1.5 }, engine: "inboard", engines: 2, room: "Hull", check: catamaranCheck, recipe: catamaranRecipe },
  { id: "launch", title: "Launch", measures: { length: 11, beam: 3.6, draft: 0.6 }, engine: "inboard", engines: 2, room: "Cockpit", ...family({ vector: "police-launch-11m", cabin: false }) },
];

/** A hull type by its id. */
export function hullType(id: string): HullType | null {
  return HULL_TYPES.find((h) => h.id === id) ?? null;
}
