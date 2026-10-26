// Accurona: a vessel's hull as meshes for the planner's 3D view, in plan coordinates (x along the plan, y up from the
// waterline, z down the plan), which are the hull's own: the hull's x runs from the stern forward, its z to starboard.

import { bodyMesh } from "../hull/mesh.ts";
import { openHull, type OpenHull } from "../hull/open.ts";
import { plateHull } from "../hull/plate.ts";
import type { VesselSpec } from "./spec.ts";

export interface VesselMesh {
  name: string;
  positions: number[];
  indices: number[];
  /** sRGB, 0xRRGGBB. */
  color: number;
  /** Drawn see-through, so the decks inside show (the outside of the hull). */
  see?: boolean;
}

/** The open boat a recipe makes. */
export function vesselShell(spec: VesselSpec): OpenHull {
  return openHull(plateHull(spec.hull.plate).bodies[0], spec.open);
}

const OUTSIDE = 0x9fb3c8;
const PLATE = 0xa7b0bd;

/**
 * The hull's plates: the outside of the skin see-through, the inside and every other plate solid. Not the sole: the
 * plan draws its decks itself (plan.ts), and two surfaces at one height flicker.
 */
export function vesselMeshes(spec: VesselSpec): VesselMesh[] {
  const shell = vesselShell(spec);
  const out: VesselMesh[] = shell.pieces.filter((p) => p.name !== "sole").map((p) => ({ name: p.name, ...p.mesh, color: p.name === "skin" ? OUTSIDE : PLATE, ...(p.name === "skin" ? { see: true } : {}) }));
  out.push({ name: "inside", ...bodyMesh(shell.inner, 32, true, false), color: PLATE });
  return out;
}
