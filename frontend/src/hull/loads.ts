// Weights and where they sit: a boat's load as a list of masses at their centres of gravity, summed into the
// displacement and centre of gravity the stability code floats the hull with (stability.ts). The hull's own plating
// comes from its shell (open.ts); everything else a boat carries is added the same way, one weight at a time.

import type { Vec3 } from "./parts.ts";
import type { Load } from "./stability.ts";

export interface Weight {
  name: string;
  /** kg */
  mass: number;
  /** Its centre of gravity in the hull's frame (m): x from the stern forward, y up from the waterline, z to starboard. */
  at: Vec3;
}

/** Aluminium plate (marine 5083), t/m³. */
export const ALUMINIUM = 2.66;

/** The weights together: their total as a displacement (t) and their mass-weighted centre of gravity. */
export function combine(weights: readonly Weight[], density?: number): Load {
  const mass = weights.reduce((s, w) => s + w.mass, 0);
  if (mass <= 0) throw new Error("no weight to float");
  const moment = (k: 0 | 1 | 2) => weights.reduce((s, w) => s + w.mass * w.at[k], 0) / mass;
  return { displacement: mass / 1000, lcg: moment(0), vcg: moment(1), tcg: moment(2), ...(density ? { density } : {}) };
}
