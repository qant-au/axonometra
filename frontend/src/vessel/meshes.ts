// Accurona: a vessel's hull as meshes for the planner's 3D view, in plan coordinates (x along the plan, y up from the
// waterline, z down the plan), which are the hull's own: the hull's x runs from the stern forward, its z to starboard.

import { bodyMesh } from "../hull/mesh.ts";
import { axes, hullMiddle } from "../hull/stability.ts";
import type { Vec3 } from "../hull/parts.ts";
import { vesselFloat } from "./load.ts";
import { vesselShell } from "./shell.ts";
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

const OUTSIDE = 0x9fb3c8;
const PLATE = 0xa7b0bd;
const COMPONENT = 0xe0873a;

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

/** A box from its middle and its size (along, up, across). */
function box(c: Vec3, size: [number, number, number]): { positions: number[]; indices: number[] } {
  const [l, h, w] = size.map((v) => v / 2);
  const positions: number[] = [];
  for (const dx of [-l, l]) for (const dy of [-h, h]) for (const dz of [-w, w]) positions.push(c[0] + dx, c[1] + dy, c[2] + dz);
  // corners numbered x·4 + y·2 + z: two triangles per face
  const faces = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  return { positions, indices: faces.flatMap(([a, b, c2, d]) => [a, b, c2, a, c2, d]) };
}

export interface VesselScene {
  meshes: VesselMesh[];
  /** The water as the boat floats with her load: a point on it and its up direction, in the hull's frame. */
  water: { point: Vec3; up: Vec3 } | null;
}

/** A vessel plan in 3D: the hull's plates, its components as boxes, and the water where her load puts it. */
export function vesselScene(building: unknown, spec: VesselSpec): VesselScene {
  const meshes = vesselMeshes(spec);
  const f = vesselFloat(building, spec);
  for (const p of f.placed) meshes.push({ name: p.name, ...box(p.at, p.size), color: COMPONENT });
  const { up } = axes(f.attitude.heel, f.attitude.trim);
  return { meshes, water: { point: [hullMiddle(f.hull), f.attitude.level, 0], up } };
}
