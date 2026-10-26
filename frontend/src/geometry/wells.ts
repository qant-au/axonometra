// When a cellar window gets a light well (#524): one decision for the 3D view (earth.ts draws the well) and the
// editor (it offers the "Light well" switch exactly where 3D draws one). No three.js here, the editor bundle uses it.

import type { Building, Floor, Opening, Vec2 } from "../model.ts";
import { terrainAt } from "../model.ts";
import { floorOutline } from "../roof-sections.ts";
import { generateWalls, locateOpening, openingHost } from "./walls.ts";

/** The outline of a floor's outer walls, null without rooms. */
export function earthOutline(b: Building, floor: Floor): Vec2[] | null {
  if (!floor.rooms.some((r) => r.points.length >= 3)) return null;
  return floorOutline(floor.rooms, floor.walls ?? [], b.settings.wall_exterior, b.settings.wall_interior);
}

/** Whether a floor reaches below the ground somewhere along its outer walls (and so gets earth). */
export function inGround(b: Building, floor: Floor): boolean {
  if (b.settings.terrain?.earth === false || floor.elevation > 0.3) return false;
  const outline = earthOutline(b, floor);
  return !!outline && outline.some(([x, z]) => terrainAt(x, z) - floor.elevation > -0.15);
}

/**
 * Whether a window in an outer wall with its sill at `sill` (the floor's heights) gets a light well in 3D, its own
 * "no light well" switch aside: the floor lies in the ground and the sill lies more than 5 cm under the ground at
 * `at` (the window's outer face).
 */
export function wellBelowGround(b: Building, floor: Floor, exterior: boolean, sill: number, at: Vec2): boolean {
  if (!exterior || !inGround(b, floor)) return false;
  return sill < Math.min(floor.height, terrainAt(at[0], at[1]) - floor.elevation) - 0.05;
}

/**
 * The editor's side of the same decision: where the window sits in the walls (an outer wall, its sill as 3D clamps
 * it under a lower wall top) and whether 3D gives it a light well there.
 */
export function windowGetsWell(b: Building, floor: Floor, o: Opening): boolean {
  if (o.type !== "window") return false;
  const host = openingHost(o, floor.rooms, floor.walls ?? []);
  if (!host) return false;
  const walls = generateWalls(floor.rooms, { exterior: b.settings.wall_exterior, interior: b.settings.wall_interior }, floor.walls ?? []).walls;
  const hit = locateOpening(walls, o, host);
  if (!hit) return false;
  const { wall, s } = hit;
  const len = Math.hypot(wall.b[0] - wall.a[0], wall.b[1] - wall.a[1]);
  const u: Vec2 = len > 1e-9 ? [(wall.b[0] - wall.a[0]) / len, (wall.b[1] - wall.a[1]) / len] : [1, 0];
  const top = Math.min(Math.min(floor.height, wall.height ?? floor.height) - 0.02, o.sill + o.height);
  const sill = Math.max(0, Math.min(o.sill, top - 0.1));
  return wellBelowGround(b, floor, wall.exterior, sill, [wall.a[0] + u[0] * s, wall.a[1] + u[1] * s]);
}
