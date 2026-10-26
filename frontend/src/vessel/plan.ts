// Accurona: a vessel's decks as a plan. Each deck is a floor at its height above the waterline, its rooms the deck's
// outline inside the plating; the hull itself is not walls (its rooms have none) but the vessel bundle's meshes
// (meshes.ts), drawn round them in the 3D view.

import type { Building, Floor, Room, Vec2 } from "../model.ts";
import { emptyBuilding, newFloor } from "../model.ts";
import type { OpenHull } from "../hull/open.ts";
import { halfAt, sheerAt } from "../hull/sections.ts";
import { vesselShell } from "./meshes.ts";
import type { VesselSpec } from "./spec.ts";

/** How deep a floor's slab is drawn below it (viewer/build.ts SLAB): the outline is taken there, so it stays inside. */
const SLAB = 0.2;

/** A deck's outline inside the plating from x0 to x1 at height y: starboard forward, then port aft. */
export function deckOutline(shell: OpenHull, y: number, x0: number, x1: number, n = 24): Vec2[] {
  const half = (x: number) => Math.max(0, Math.min(halfAt(shell.inner, x, y) ?? 0, halfAt(shell.inner, x, y - SLAB) ?? 0));
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n).filter((x) => half(x) > 0.05);
  const r = (v: number) => Math.round(v * 1000) / 1000;
  return [...xs.map((x): Vec2 => [r(x), r(half(x))]), ...[...xs].reverse().map((x): Vec2 => [r(x), r(-half(x))])];
}

/** The plan of the decks: the sole, with the motor well aft of it when the boat has one. */
export function vesselFloors(spec: VesselSpec): Floor[] {
  const shell = vesselShell(spec);
  const sole = shell.sole;
  const floor = newFloor("deck_sole", "Sole", sole.y);
  floor.height = Math.round(((sheerAt(shell.inner, (sole.from + sole.to) / 2) ?? sole.y + 1) - sole.y) * 1000) / 1000;
  floor.cut_height = Math.min(floor.cut_height, floor.height / 2);
  const room = (id: string, name: string, points: Vec2[]): Room => ({ id, name, area_id: null, points, floor_material: "stone", wall_heights: points.map(() => 0) });
  floor.rooms.push(room("room_cockpit", "Cockpit", deckOutline(shell, sole.y, sole.from, sole.to)));
  if (spec.open.transom.well) floor.rooms.push(room("room_well", "Motor well", deckOutline(shell, sole.y, shell.body.sections[0].x + spec.open.plating, spec.open.transom.well)));
  return [floor];
}

/** A plan drawn in a vessel: its decks, and the recipe with it. */
export function vesselBuilding(spec: VesselSpec): Building & { vessel: VesselSpec } {
  const b = emptyBuilding();
  b.floors = vesselFloors(spec);
  return { ...b, vessel: structuredClone(spec) };
}
