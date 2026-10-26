// Accurona: the open boat a vessel's recipe makes, and the mounts on it.

import { openHull, outboardMounts, type Mount, type OpenHull } from "../hull/open.ts";
import { plateHull } from "../hull/plate.ts";
import type { VesselSpec } from "./spec.ts";

export function vesselShell(spec: VesselSpec): OpenHull {
  return openHull(plateHull(spec.hull.plate).bodies[0], spec.open);
}

/** The mounts the recipe asks for: its outboards' clamping points. */
export function vesselMounts(spec: VesselSpec, shell = vesselShell(spec)): Mount[] {
  return outboardMounts(shell, spec.outboards ?? 0);
}
