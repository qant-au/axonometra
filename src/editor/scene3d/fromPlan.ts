// Builds the geometry input for one floor from its saved form (plan format
// v2), so the 3D view works from plain data, the same data that is saved and
// sent to embedding hosts. Missing v2 fields take the defaults.
import {
  DOOR_HEIGHT,
  INTERIOR_WALL_THICKNESS,
  METER,
  SLAB_THICKNESS,
  STOREY_HEIGHT,
  WALL_HEIGHT,
  WALL_THICKNESS,
  WINDOW_SILL
} from '../editor/constants';
import type { FloorSerializable } from '../editor/persistence/FloorSerializable';
import type { FloorInput, GraphWall, Opening, Point } from './geometry';

const wallId = (a: number, b: number) => `${a}-${b}`;

/** `index` is the floor's position, lowest first; it sets the default elevation. */
export function floorInput(
  floor: FloorSerializable,
  index: number
): FloorInput {
  const nodes = new Map<number, Point>(
    floor.wallNodes.map((n) => [n.id, { x: n.x, y: n.y }])
  );
  const exterior = new Set(
    (floor.exteriorWalls ?? []).map(([a, b]) => wallId(a, b))
  );

  // A wall may be listed under both of its nodes; keep it once.
  const walls: GraphWall[] = [];
  const seen = new Set<string>();
  for (const [a, links] of floor.wallNodeLinks) {
    for (const b of links) {
      if (seen.has(wallId(a, b)) || seen.has(wallId(b, a))) continue;
      seen.add(wallId(a, b));
      const isExterior =
        exterior.has(wallId(a, b)) || exterior.has(wallId(b, a));
      walls.push({
        id: wallId(a, b),
        a,
        b,
        thickness: isExterior ? WALL_THICKNESS : INTERIOR_WALL_THICKNESS
      });
    }
  }
  const wallByPair = new Map<string, GraphWall>();
  for (const w of walls) {
    wallByPair.set(wallId(w.a, w.b), w);
    wallByPair.set(wallId(w.b, w.a), w);
  }

  const openings: Opening[] = [];
  for (const item of floor.furnitureArray) {
    if (item.attachedToLeft == null || item.attachedToRight == null) continue;
    const wall = wallByPair.get(
      wallId(item.attachedToLeft, item.attachedToRight)
    );
    const a = wall && nodes.get(wall.a);
    const b = wall && nodes.get(wall.b);
    if (!wall || !a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    // An attached item's x runs from the wall end with the smaller x (smaller
    // y when vertical), as Wall.setLineCoords draws it; measure from `a`.
    const aIsOrigin = a.x < b.x || (a.x === b.x && a.y < b.y);
    const from = item.x;
    const to = item.x + item.width * METER;
    const isDoor = item.texturePath === 'door';
    openings.push({
      wallId: wall.id,
      kind: isDoor ? 'door' : 'window',
      start: aIsOrigin ? from : length - to,
      end: aIsOrigin ? to : length - from,
      sill:
        item.mountM != null ? item.mountM * METER : isDoor ? 0 : WINDOW_SILL,
      height:
        item.heightM != null
          ? item.heightM * METER
          : isDoor
            ? DOOR_HEIGHT
            : DOOR_HEIGHT - WINDOW_SILL
    });
  }

  return {
    nodes,
    walls,
    openings,
    wallHeight:
      floor.wallHeightM != null ? floor.wallHeightM * METER : WALL_HEIGHT,
    elevation:
      floor.elevationM != null
        ? floor.elevationM * METER
        : index * STOREY_HEIGHT,
    slabThickness: SLAB_THICKNESS
  };
}
