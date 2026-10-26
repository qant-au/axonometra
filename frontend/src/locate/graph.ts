// The plan as the locating service needs it: the rooms (with floor and Home Assistant area) and which rooms a door joins.

import { generateWalls, locateOpening, openingHost } from "../geometry/walls.ts";
import { pointInPolygon, type Building } from "../model.ts";

export interface LocateRoom {
  id: string;
  name: string;
  floor: string;
  area_id: string | null;
}

export function locateRooms(b: Building): LocateRoom[] {
  return b.floors.flatMap((f) => f.rooms.map((r) => ({ id: r.id, name: r.name, floor: f.name, area_id: r.area_id ?? null })));
}

/** Room pairs joined by a door or a passage (a window down to the floor counts, a normal window does not). */
export function doorPairs(b: Building): [string, string][] {
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const floor of b.floors) {
    const walls = generateWalls(floor.rooms, { exterior: b.settings.wall_exterior, interior: b.settings.wall_interior }, floor.walls ?? []).walls;
    for (const o of floor.openings) {
      if (o.type === "window" && !(o.sill < 0.1)) continue;
      const host = openingHost(o, floor.rooms, floor.walls ?? []);
      const at = host && locateOpening(walls, o, host);
      const a = at?.wall.roomLeft;
      const c = at?.wall.roomRight;
      if (!a || !c || a === c) continue;
      const key = [a, c].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, c]);
    }
  }
  return out;
}

/** The room a point of a floor lies in, or null. */
export function roomAt(b: Building, floorId: string, x: number, z: number): string | null {
  const floor = b.floors.find((f) => f.id === floorId);
  return floor?.rooms.find((r) => pointInPolygon([x, z], r.points))?.id ?? null;
}
