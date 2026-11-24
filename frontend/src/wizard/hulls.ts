// Axonometra: the hull types the first-run wizard offers, and how one is fitted to the boat's measures. A type that
// can carry a vessel plan has a recipe (one plate alloy boat for now); the hull families still to come are listed
// without one, so the wizard shows them and cannot choose them. A recipe is scaled to the length, beam and draft the
// owner gave: the shape stays, the size is hers.

import { EXAMPLE_VESSELS } from "../plans/examples.ts";
import type { VesselSpec } from "../vessel/spec.ts";
import type { VesselDetails } from "./details.ts";

export interface HullType {
  id: string;
  title: string;
  /** The recipe at its own size; absent while a vessel plan cannot be drawn in this hull yet. */
  spec?: VesselSpec;
}

export const HULL_TYPES: HullType[] = [
  ...Object.entries(EXAMPLE_VESSELS).map(([id, v]) => ({ id, title: v.title, spec: v.spec })),
  { id: "fin-keel-sloop", title: "Fin-Keel Sloop" },
  { id: "semi-displacement-cruiser", title: "Semi-Displacement Cruiser" },
  { id: "planing-cruiser", title: "Planing Cruiser" },
  { id: "rib", title: "RIB" },
  { id: "catamaran", title: "Catamaran" },
  { id: "launch", title: "Launch" },
];

/** The recipe of a hull type that has one. */
export function hullRecipe(id: string): VesselSpec | null {
  return HULL_TYPES.find((h) => h.id === id)?.spec ?? null;
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/** A recipe at the boat's size: along by her length, across by her beam, down by her draft. */
export function fitHull(recipe: VesselSpec, details: Pick<VesselDetails, "length" | "beam" | "draft">): VesselSpec {
  const spec = structuredClone(recipe);
  const p = spec.hull.plate;
  const ratio = (given: number | undefined, own: number) => (given && given > 0 ? given / own : 1);
  const along = ratio(details.length, p.length);
  const across = ratio(details.beam, p.beam);
  const down = ratio(details.draft, p.draft);
  spec.hull.plate = { ...p, length: r3(p.length * along), beam: r3(p.beam * across), transom: r3(p.transom * across), chineBeam: r3(p.chineBeam * across), draft: r3(p.draft * down), ...(p.ledge ? { ledge: r3(p.ledge * across) } : {}) };
  const t = spec.open.transom;
  spec.open = {
    ...spec.open,
    ...(spec.open.soleTo ? { soleTo: r3(spec.open.soleTo * along) } : {}),
    transom: { ...t, width: r3(Math.min(t.width * across, spec.hull.plate.transom)), ...(t.well ? { well: r3(t.well * along) } : {}) },
  };
  // her own engines come from the wizard's basics
  delete spec.components;
  return spec;
}
