// Accurona: what a vessel plan weighs and how she floats with it. Her plating (from her recipe), her components (on
// their mounts or at their points) and every item on her decks (its own mass, else its type's default), summed into a
// load; the hull floats with it, and the answer says how she sits and whether she drains herself. Only while the plan
// calculates masses (mass.ts): with it off she sits at her design waterline, level, and nothing is weighed.

import type { Floor, Furniture } from "../model.ts";
import type { Weight } from "../hull/loads.ts";
import { asFitted, drains, openBodies } from "../hull/open.ts";
import type { Vec3 } from "../hull/parts.ts";
import { float, restingHeel, type Attitude, type Load } from "../hull/stability.ts";
import type { Hull } from "../hull/types.ts";
import { itemMass, massOn } from "./mass.ts";
import { vesselMounts, vesselShell } from "./shell.ts";
import type { VesselSpec, Weighted } from "./spec.ts";

export interface Placed {
  name: string;
  at: Vec3;
  size: [number, number, number];
}

export interface VesselFloat {
  /** Whether masses were calculated; without, there is no load and no draining to tell. */
  mass: boolean;
  hull: Hull;
  load: Load | null;
  attitude: Attitude;
  drains: ReturnType<typeof drains> | null;
  /** No resting heel within 60°: the load turns her over (she is drawn upright). */
  capsizes: boolean;
  /** Everything counted besides the plating. */
  weights: Weight[];
  /** The components where they hang or stand (their boxes' middles). */
  placed: Placed[];
  /** Components on a mount the boat does not have: left out of the load, by name. */
  unplaced: string[];
}

/** The plan's items as weights at their middles (plan x and z are the hull's, the floor's height y); weightless ones left out. */
export function deckWeights(floors: readonly Floor[]): Weight[] {
  const out: Weight[] = [];
  for (const floor of floors)
    for (const item of floor.furniture) {
      const mass = itemMass(item as Furniture & Weighted);
      if (!(mass > 0)) continue;
      out.push({ name: item.name ?? item.type, mass, at: [item.x, floor.elevation + (item.mount_y ?? 0) + item.h / 2, item.z] });
    }
  return out;
}

/** The design waterline: level, her middle at the water. */
export const DESIGN: Attitude = { heel: 0, trim: 0, level: 0 };

/** The vessel with her load (plating, components and the decks' items), or at her design waterline with masses off. */
export function vesselFloat(building: unknown, spec: VesselSpec, mass = massOn(building)): VesselFloat {
  const shell = vesselShell(spec);
  const mounts = new Map(vesselMounts(spec, shell).map((m) => [m.name, m]));
  const placed: Placed[] = [];
  const unplaced: string[] = [];
  const weights: Weight[] = [];
  for (const c of spec.components ?? []) {
    let at: Vec3 | null = c.at ?? null;
    if (c.mount !== undefined) {
      const m = mounts.get(c.mount);
      const o = c.offset ?? [-c.size[0] / 2, 0, 0];
      at = m ? [m.at[0] + o[0], m.at[1] + o[1], m.at[2] + o[2]] : null;
    }
    if (!at) {
      unplaced.push(c.name);
      continue;
    }
    placed.push({ name: c.name, at, size: c.size });
    if (mass) weights.push({ name: c.name, mass: c.mass, at });
  }
  const hull = openBodies(shell);
  if (!mass) return { mass, hull, load: null, attitude: DESIGN, drains: null, capsizes: false, weights, placed, unplaced };
  weights.push(...deckWeights((building as { floors?: Floor[] } | null)?.floors ?? []));
  const load = asFitted(shell, weights);
  // she rests where the righting lever is nil: upright with the load on her centre line, listing with it to one side
  const rest = restingHeel(hull, load);
  const attitude = (rest ?? float(hull, load, 0)).attitude;
  return { mass, hull, load, attitude, drains: drains(shell, attitude), capsizes: !rest, weights, placed, unplaced };
}
