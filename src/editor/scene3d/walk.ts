// Walking through a floor, as plain data: which wall pieces block a person,
// moving a walker so it slides along walls instead of passing through them,
// where to start, and where to arrive after taking the stairs. No renderer:
// collision is a circle (the walker seen from above) against the plan
// footprints of the wall pieces at body height.
//
// Plan units throughout (1 unit = 1 cm), x right, y down, z up.
import { furnitureFootprint } from '../axonometric/axonometric';
import { METER } from '../editor/constants';
import type { FloorSerializable } from '../editor/persistence/FloorSerializable';
import type { FloorGeometry, Point, Prism } from './geometry';

/** The walker's radius seen from above. */
export const WALKER_RADIUS = 0.25 * METER;
/** Eye height above the floor. */
export const EYE_HEIGHT = 1.6 * METER;
/** Anything lower than this is stepped over, taller than BODY_HEIGHT passed under. */
const STEP_HEIGHT = 0.3 * METER;
const BODY_HEIGHT = 1.8 * METER;
/** How close to a stair marker's footprint counts as standing at it. */
const STAIRS_REACH = 0.6 * METER;
const EPS = 1e-6;

/** A convex-or-not plan polygon that the walker cannot enter. */
export type Obstacle = Point[];

/**
 * The wall, sill and lintel pieces a person on a floor at `elevation` would
 * walk into: door lintels sit above head height, so doorways stay open, and
 * window sills block.
 */
export function obstacles(prisms: Prism[], elevation: number): Obstacle[] {
  return prisms
    .filter(
      (p) =>
        (p.kind === 'wall' || p.kind === 'sill' || p.kind === 'lintel') &&
        p.footprint.length >= 3 &&
        p.z1 > elevation + STEP_HEIGHT &&
        p.z0 < elevation + BODY_HEIGHT
    )
    .map((p) => p.footprint);
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 < EPS
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

function inside(p: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    ) {
      hit = !hit;
    }
  }
  return hit;
}

/** The point on the polygon's edge nearest `p`, and whether `p` is inside it. */
function nearestEdge(p: Point, poly: Point[]) {
  let best = poly[0];
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const q = closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]);
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return { point: best, distance: bestD, inside: inside(p, poly) };
}

/** Push a circle at `p` out of every obstacle it overlaps. */
function resolve(p: Point, blocks: Obstacle[], radius: number): Point {
  let pos = p;
  // A few passes settle corners, where pushing out of one wall pushes into another.
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const poly of blocks) {
      const edge = nearestEdge(pos, poly);
      if (!edge.inside && edge.distance >= radius) continue;
      const dx = pos.x - edge.point.x;
      const dy = pos.y - edge.point.y;
      const len = Math.hypot(dx, dy);
      if (len < EPS) continue;
      // Inside: out through the nearest edge, then clear of it by the radius.
      const sign = edge.inside ? -1 : 1;
      const push = edge.inside ? radius + len : radius - len;
      pos = {
        x: pos.x + ((sign * dx) / len) * push,
        y: pos.y + ((sign * dy) / len) * push
      };
      moved = true;
    }
    if (!moved) break;
  }
  return pos;
}

/**
 * Move a walker by `delta`, sliding along anything in the way. The move is
 * cut into steps shorter than the radius so a fast step cannot jump a wall.
 */
export function move(
  from: Point,
  delta: Point,
  blocks: Obstacle[],
  radius = WALKER_RADIUS
): Point {
  const length = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(length / (radius / 2)));
  let pos = from;
  for (let i = 0; i < steps; i++) {
    pos = resolve(
      { x: pos.x + delta.x / steps, y: pos.y + delta.y / steps },
      blocks,
      radius
    );
  }
  return pos;
}

/** Whether a walker fits at `p` without touching anything. */
export function canStand(
  p: Point,
  blocks: Obstacle[],
  radius = WALKER_RADIUS
): boolean {
  return blocks.every((poly) => {
    const edge = nearestEdge(p, poly);
    return !edge.inside && edge.distance >= radius - EPS;
  });
}

function centroid(poly: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const q of poly) {
    x += q.x;
    y += q.y;
  }
  return { x: x / poly.length, y: y / poly.length };
}

/**
 * Where to stand on arriving at a floor: in the middle of its largest room,
 * or failing that the middle of its walls, or the nearest free spot to it.
 */
export function startPoint(
  geometry: FloorGeometry,
  blocks: Obstacle[],
  radius = WALKER_RADIUS
): Point {
  const rooms = [...geometry.rooms].sort((a, b) => b.area - a.area);
  for (const room of rooms) {
    const c = centroid(room.polygon);
    if (inside(c, room.polygon) && canStand(c, blocks, radius)) return c;
  }
  const corners = geometry.walls.flatMap((w) => w.footprint);
  const centre = corners.length ? centroid(corners) : { x: 0, y: 0 };
  return nearestFree(centre, blocks, radius);
}

/** The nearest spot to `p` a walker fits, searching outwards in rings. */
function nearestFree(p: Point, blocks: Obstacle[], radius: number): Point {
  if (canStand(p, blocks, radius)) return p;
  for (let ring = 1; ring <= 40; ring++) {
    const r = ring * radius;
    const count = 8 * ring;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const q = { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) };
      if (canStand(q, blocks, radius)) return q;
    }
  }
  return p;
}

/** The stair markers on a floor, as plan footprints. */
export function stairsOn(floor: FloorSerializable): Point[][] {
  return floor.furnitureArray
    .filter(
      (item) =>
        item.texturePath.startsWith('stairs-') &&
        (item.attachedToLeft == null || item.attachedToRight == null)
    )
    .map((item) =>
      furnitureFootprint({
        kind: item.texturePath,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation
      })
    );
}

/** Whether `p` is on or beside one of the stair markers. */
export function atStairs(p: Point, stairs: Point[][]): boolean {
  return stairs.some((poly) => {
    const edge = nearestEdge(p, poly);
    return edge.inside || edge.distance <= STAIRS_REACH;
  });
}

/**
 * Whether the walker may change floor from `p`: at a stair marker, or
 * anywhere on a floor with no stairs drawn, so such a plan is not a dead end.
 */
export function canChangeFloor(p: Point, stairs: Point[][]): boolean {
  return stairs.length === 0 || atStairs(p, stairs);
}

/**
 * Where to stand after changing floor from `from`: on the new floor's
 * stairs if it has some (the nearest set), else the same spot if there is
 * room, else the new floor's start point.
 */
export function arrival(
  from: Point,
  stairs: Point[][],
  geometry: FloorGeometry,
  blocks: Obstacle[],
  radius = WALKER_RADIUS
): Point {
  if (stairs.length) {
    const centres = stairs.map(centroid);
    centres.sort(
      (a, b) =>
        Math.hypot(a.x - from.x, a.y - from.y) -
        Math.hypot(b.x - from.x, b.y - from.y)
    );
    return nearestFree(centres[0], blocks, radius);
  }
  if (canStand(from, blocks, radius)) return from;
  return startPoint(geometry, blocks, radius);
}
