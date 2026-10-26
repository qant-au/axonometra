// Accurona: what a vessel plan weighs and how she floats with it. Her plating (from her recipe), her components (on
// their mounts or at their points) and every item on her decks that carries a mass, summed into a load; the hull floats
// with it, and the answer says how she sits and whether she drains herself.

import type { Floor } from "../model.ts";
import type { Weight } from "../hull/loads.ts";
import { asFitted, drains, openBodies } from "../hull/open.ts";
import type { Vec3 } from "../hull/parts.ts";
import { float, type Attitude, type Load } from "../hull/stability.ts";
import type { Hull } from "../hull/types.ts";
import { vesselMounts, vesselShell } from "./shell.ts";
import type { VesselSpec, Weighted } from "./spec.ts";

export interface Placed {
  name: string;
  at: Vec3;
  size: [number, number, number];
}

export interface VesselFloat {
  hull: Hull;
  load: Load;
  attitude: Attitude;
  drains: ReturnType<typeof drains>;
  /** Everything counted besides the plating. */
  weights: Weight[];
  /** The components where they hang or stand (their boxes' middles). */
  placed: Placed[];
  /** Components on a mount the boat does not have: left out of the load, by name. */
  unplaced: string[];
}

/** The plan's items that carry a mass, as weights at their middles (plan x and z are the hull's, the floor's height y). */
export function deckWeights(floors: readonly Floor[]): Weight[] {
  const out: Weight[] = [];
  for (const floor of floors)
    for (const item of floor.furniture) {
      const mass = (item as Weighted).component?.mass;
      if (!(typeof mass === "number" && mass > 0)) continue;
      out.push({ name: item.name ?? item.type, mass, at: [item.x, floor.elevation + (item.mount_y ?? 0) + item.h / 2, item.z] });
    }
  return out;
}

/** The vessel with her load: plating, components and the decks' items. */
export function vesselFloat(building: unknown, spec: VesselSpec): VesselFloat {
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
    weights.push({ name: c.name, mass: c.mass, at });
  }
  weights.push(...deckWeights((building as { floors?: Floor[] } | null)?.floors ?? []));
  const hull = openBodies(shell);
  const load = asFitted(shell, weights);
  const attitude = float(hull, load, 0).attitude;
  return { hull, load, attitude, drains: drains(shell, attitude), weights, placed, unplaced };
}
