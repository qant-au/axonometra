// Axonometra: the boat a vessel's recipe makes: the open boat on each of her hulls, and the mounts on them.

import type { Mesh } from "../hull/mesh.ts";
import { openHull, outboardMounts, type Mount, type OpenHull } from "../hull/open.ts";
import { parametricHull } from "../hull/parametric.ts";
import { plateHull } from "../hull/plate.ts";
import { shipdBody } from "../hull/shipd.ts";
import type { HullBody } from "../hull/types.ts";
import type { VesselSpec } from "./spec.ts";

/** How many hulls she has: two for a catamaran. */
export function hullCount(spec: VesselSpec): number {
  return "parametric" in spec.hull && spec.hull.parametric.hull === "catamaran" ? 2 : 1;
}

/** Her hull's bodies, each where it lies across the boat. */
export function vesselBodies(spec: VesselSpec): HullBody[] {
  const h = spec.hull;
  if ("plate" in h) return plateHull(h.plate).bodies;
  if ("shipd" in h) return [shipdBody(h.shipd)];
  return parametricHull(h.parametric).bodies;
}

/** The open boat on one hull, built on its own centre line, and where that lies across the vessel (0 on a monohull). */
export interface Shell {
  open: OpenHull;
  center: number;
}

/** The open boat on each of her hulls, port to starboard. */
export function vesselShells(spec: VesselSpec): Shell[] {
  return vesselBodies(spec).map((b) => ({ center: b.center, open: openHull({ ...b, center: 0 }, spec.open) }));
}

/** A mesh moved across the boat, onto its hull's centre line. */
export function across(mesh: Mesh, center: number): Mesh {
  return center === 0 ? mesh : { positions: mesh.positions.map((v, i) => (i % 3 === 2 ? v + center : v)), indices: mesh.indices };
}

/** The mounts the recipe asks for: its outboards' clamping points, shared out over her hulls. */
export function vesselMounts(spec: VesselSpec, shells = vesselShells(spec)): Mount[] {
  const n = spec.outboards ?? 0;
  const each = (k: number) => Math.floor(n / shells.length) + (k < n % shells.length ? 1 : 0);
  const at = shells.flatMap(({ open, center }, k) => outboardMounts(open, each(k)).map((m) => [m.at[0], m.at[1], m.at[2] + center] as Mount["at"]));
  return at.map((p, i) => ({ name: n === 1 ? "outboard" : `outboard ${i + 1}`, at: p }));
}
