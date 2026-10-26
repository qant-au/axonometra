// Accurona: a vessel plan. A plan (Building) may carry a `vessel`: the recipe of the boat it is drawn in, kept with the
// plan (both hosts pass fields they do not know through). The geometry is made from the recipe wherever it is needed,
// never stored. This file is types only, so the 3D bundle can ask a plan whether it is a vessel without taking the
// hull code in; that comes with the vessel bundle (entry.ts, loaded by load-vessel.ts).

import type { OpenHullSpec } from "../hull/open.ts";
import type { PlateHullSpec } from "../hull/plate.ts";

export interface VesselSpec {
  /** The hull: a plate hull for now (the other hull sources follow). */
  hull: { plate: PlateHullSpec };
  /** The open boat on it: plating, sole, transom. */
  open: OpenHullSpec;
}

/** The vessel a plan is drawn in, or null for a building. */
export function vesselOf(building: unknown): VesselSpec | null {
  const v = (building as { vessel?: Partial<VesselSpec> } | null)?.vessel;
  return v && v.hull?.plate && v.open ? (v as VesselSpec) : null;
}
