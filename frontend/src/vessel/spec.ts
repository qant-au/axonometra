// Axonometra: a vessel plan. A plan (Building) may carry a `vessel`: the recipe of the boat it is drawn in, kept with the
// plan (both hosts pass fields they do not know through). The geometry is made from the recipe wherever it is needed,
// never stored. This file is types only, so the 3D bundle can ask a plan whether it is a vessel without taking the
// hull code in; that comes with the vessel bundle (entry.ts, loaded by load-vessel.ts).

import type { OpenHullSpec } from "../hull/open.ts";
import type { ParametricHullSpec } from "../hull/parametric.ts";
import type { BulbSpec, FoilSpec } from "../hull/parts.ts";
import type { PlateHullSpec } from "../hull/plate.ts";
import type { TubeSpec } from "../hull/tube.ts";

/**
 * The hull, by what it is built from: a hard-chine plate hull; a hull in the Ship-D parameterisation (its 45 numbers,
 * the length overall first: hull/shipd.ts); or a parametric hull from its main dimensions, a catamaran's two with it.
 */
export type VesselHull = { plate: PlateHullSpec } | { shipd: number[] } | { parametric: ParametricHullSpec };

export interface VesselSpec {
  /** Her name and MMSI, when the owner gave them. */
  name?: string;
  mmsi?: string;
  hull: VesselHull;
  /** The boat in the hull: plating, sole, transom. A catamaran has it in each hull. */
  open: OpenHullSpec;
  /** A RIB's tube round the deck edge. */
  tube?: TubeSpec;
  /** What hangs under her: a fin keel and a rudder, a keel's bulb. */
  foils?: FoilSpec[];
  bulbs?: BulbSpec[];
  /** Outboard mounts across the transom (or its setback): "outboard", or "outboard 1", "outboard 2" … */
  outboards?: number;
  /** What the boat carries that is part of her: motors, tanks, batteries. Things on the decks are the plan's own items. */
  components?: VesselComponent[];
}

/**
 * A component: a mass and the box it takes up, its centre of gravity at the box's middle. It hangs on a mount (by the
 * mount's name, its middle `offset` from the mount), or stands at a point in the hull's frame. Generic: the box is
 * all there is of it to see, until components have models of their own.
 */
export interface VesselComponent {
  name: string;
  /** kg */
  mass: number;
  /** Along the boat, up, across (m). */
  size: [number, number, number];
  mount?: string;
  offset?: [number, number, number];
  at?: [number, number, number];
}

/** A plan's item with a mass (kg): it counts in the boat's load where it stands. Kept on the item (an extra field). */
export interface Weighted {
  component?: { mass: number };
}

/** The vessel a plan is drawn in, or null for a building. */
export function vesselOf(building: unknown): VesselSpec | null {
  const v = (building as { vessel?: Partial<VesselSpec> } | null)?.vessel;
  const hull = v?.hull as { plate?: unknown; shipd?: unknown; parametric?: unknown } | undefined;
  return v && (hull?.plate || hull?.shipd || hull?.parametric) && v.open ? (v as VesselSpec) : null;
}
