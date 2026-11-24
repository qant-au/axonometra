// Axonometra: a vessel's hull as meshes for the planner's 3D view, in plan coordinates (x along the plan, y up from the
// waterline, z down the plan), which are the hull's own: the hull's x runs from the stern forward, its z to starboard.

import { bodyMesh, ringsMesh, tubeGeometry } from "../hull/mesh.ts";
import { axes, hullMiddle } from "../hull/stability.ts";
import { bulbGeometry, foilGeometry, type Vec3 } from "../hull/parts.ts";
import { ribTube } from "../hull/tube.ts";
import { vesselFloat } from "./load.ts";
import { across, vesselShells } from "./shell.ts";
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
const TUBE = 0x5f6b7a;
const COMPONENT = 0xe0873a;

/**
 * The plates of each of her hulls: the outside of the skin see-through, the inside and every other plate solid. Not
 * the sole: the plan draws its decks itself (plan.ts), and two surfaces at one height flicker. With them what sits
 * on the hull without being its shape: a RIB's tube, a keel, its bulb and a rudder.
 */
export function vesselMeshes(spec: VesselSpec): VesselMesh[] {
  const shells = vesselShells(spec);
  const out: VesselMesh[] = [];
  for (const { open, center } of shells) {
    for (const p of open.pieces) if (p.name !== "sole") out.push({ name: p.name, ...across(p.mesh, center), color: p.name === "skin" ? OUTSIDE : PLATE, ...(p.name === "skin" ? { see: true } : {}) });
    out.push({ name: "inside", ...across(bodyMesh(open.inner, 32, open.deck, false), center), color: PLATE });
  }
  if (spec.tube) out.push({ name: "tube", ...ringsMesh(tubeGeometry(ribTube(shells[0].open.body, spec.tube))), color: TUBE });
  for (const f of spec.foils ?? []) out.push({ name: "foil", ...ringsMesh(foilGeometry(f)), color: PLATE });
  for (const b of spec.bulbs ?? []) out.push({ name: "bulb", ...ringsMesh(bulbGeometry(b)), color: PLATE });
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
