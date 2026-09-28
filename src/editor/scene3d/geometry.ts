// 3D scene geometry for a floor, as plain data: mitred wall outlines, walls
// split around door and window openings, rooms found in the wall graph, and
// floor and ceiling slabs. No renderer: everything here is a prism (a plan
// polygon extruded between two heights), which the 3D view turns into meshes.
//
// Plan units throughout (1 unit = 1 cm, METER = 100), x right, y down, z up.

export interface Point {
  x: number;
  y: number;
}

export interface GraphWall {
  id: string;
  /** node ids; the wall runs from a to b */
  a: number;
  b: number;
  thickness: number;
}

export interface Opening {
  wallId: string;
  kind: 'door' | 'window';
  /** distance along the wall from its `a` end */
  start: number;
  end: number;
  /** height of the opening's bottom above the floor, and of the opening */
  sill: number;
  height: number;
}

export interface FloorInput {
  nodes: Map<number, Point>;
  walls: GraphWall[];
  openings: Opening[];
  wallHeight: number;
  /** height of the floor surface above ground */
  elevation: number;
  slabThickness: number;
}

export type PrismKind = 'wall' | 'sill' | 'lintel' | 'floor' | 'ceiling';

export interface Prism {
  kind: PrismKind;
  /** plan polygon, in order around the edge */
  footprint: Point[];
  z0: number;
  z1: number;
  /** the wall a wall/sill/lintel piece belongs to */
  wallId?: string;
}

export interface Room {
  polygon: Point[];
  area: number;
}

export interface FloorGeometry {
  walls: Prism[];
  floors: Prism[];
  ceilings: Prism[];
  rooms: Room[];
}

/** A mitre longer than this many wall thicknesses is squared off instead. */
const MITRE_LIMIT = 4;
const EPS = 1e-9;
/** Rooms smaller than this (plan units², i.e. cm²) are slivers, not rooms. */
const MIN_ROOM_AREA = 100;

const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y });
const add = (p: Point, q: Point): Point => ({ x: p.x + q.x, y: p.y + q.y });
const mul = (p: Point, k: number): Point => ({ x: p.x * k, y: p.y * k });
const dot = (p: Point, q: Point) => p.x * q.x + p.y * q.y;
const cross = (p: Point, q: Point) => p.x * q.y - p.y * q.x;
const unit = (p: Point): Point => mul(p, 1 / (Math.hypot(p.x, p.y) || 1));
/** p turned a quarter towards increasing angle (atan2 sense). */
const perp = (p: Point): Point => ({ x: -p.y, y: p.x });

/** Where the lines p + s·d and q + t·e meet, or null when they are parallel. */
function intersect(p: Point, d: Point, q: Point, e: Point): Point | null {
  const den = cross(d, e);
  if (Math.abs(den) < EPS) return null;
  return add(p, mul(d, cross(sub(q, p), e) / den));
}

/** Signed area, positive when the points run anticlockwise in atan2 terms. */
export function signedArea(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    sum += cross(poly[i], poly[(i + 1) % poly.length]);
  }
  return sum / 2;
}

interface End {
  wall: GraphWall;
  /** unit direction from this node along the wall */
  dir: Point;
}

/** Each node's wall ends, sorted by the direction they leave the node. */
function endsByNode(nodes: Map<number, Point>, walls: GraphWall[]) {
  const ends = new Map<number, End[]>();
  const push = (id: number, end: End) => {
    const list = ends.get(id) ?? [];
    list.push(end);
    ends.set(id, list);
  };
  for (const wall of walls) {
    const a = nodes.get(wall.a);
    const b = nodes.get(wall.b);
    if (!a || !b) continue;
    const d = unit(sub(b, a));
    push(wall.a, { wall, dir: d });
    push(wall.b, { wall, dir: mul(d, -1) });
  }
  for (const list of ends.values()) {
    list.sort(
      (p, q) => Math.atan2(p.dir.y, p.dir.x) - Math.atan2(q.dir.y, q.dir.x)
    );
  }
  return ends;
}

// The corner of wall end `i` on `side` (+1 = the perp(dir) side) at a node:
// its face on that side meets the facing side of the neighbouring wall end.
function corner(node: Point, list: End[], i: number, side: 1 | -1): Point {
  const e = list[i];
  const square = add(node, mul(perp(e.dir), (side * e.wall.thickness) / 2));
  if (list.length < 2) return square;
  const k = list.length;
  const f = list[side > 0 ? (i + 1) % k : (i - 1 + k) % k];
  const q = add(node, mul(perp(f.dir), (-side * f.wall.thickness) / 2));
  const x = intersect(square, e.dir, q, f.dir);
  if (!x) return square;
  const limit = MITRE_LIMIT * Math.max(e.wall.thickness, f.wall.thickness);
  return Math.hypot(x.x - node.x, x.y - node.y) > limit ? square : x;
}

export interface WallOutline {
  wall: GraphWall;
  /** corners: a and b on the left (perp of a→b) side, then b and a on the right */
  aL: Point;
  bL: Point;
  bR: Point;
  aR: Point;
}

/** Every wall's plan outline, with its ends mitred against its neighbours. */
export function wallOutlines(
  nodes: Map<number, Point>,
  walls: GraphWall[]
): WallOutline[] {
  const ends = endsByNode(nodes, walls);
  const out: WallOutline[] = [];
  for (const wall of walls) {
    const a = nodes.get(wall.a);
    const b = nodes.get(wall.b);
    if (!a || !b) continue;
    const atA = ends.get(wall.a)!;
    const atB = ends.get(wall.b)!;
    const i = atA.findIndex(
      (e) => e.wall === wall && dot(e.dir, sub(b, a)) > 0
    );
    const j = atB.findIndex(
      (e) => e.wall === wall && dot(e.dir, sub(a, b)) > 0
    );
    // At b the wall leaves in the opposite direction, so its left side is
    // that end's -1 side.
    out.push({
      wall,
      aL: corner(a, atA, i, 1),
      aR: corner(a, atA, i, -1),
      bL: corner(b, atB, j, -1),
      bR: corner(b, atB, j, 1)
    });
  }
  return out;
}

// The part of a wall outline between two distances along it. The mitred ends
// are kept at 0 and at the full length; cuts in between are square.
function slice(
  o: WallOutline,
  a: Point,
  u: Point,
  length: number,
  from: number,
  to: number
): Point[] {
  const along = (edgeStart: Point, at: number) =>
    add(edgeStart, mul(u, at - dot(sub(edgeStart, a), u)));
  return [
    from <= 0 ? o.aL : along(o.aL, from),
    to >= length ? o.bL : along(o.aL, to),
    to >= length ? o.bR : along(o.aR, to),
    from <= 0 ? o.aR : along(o.aR, from)
  ];
}

/** A wall as prisms: full-height runs, and a sill and lintel at each opening. */
export function wallPieces(
  outline: WallOutline,
  nodes: Map<number, Point>,
  openings: Opening[],
  wallHeight: number,
  base: number
): Prism[] {
  const a = nodes.get(outline.wall.a)!;
  const b = nodes.get(outline.wall.b)!;
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const u = unit(sub(b, a));
  const wallId = outline.wall.id;
  const piece = (
    kind: PrismKind,
    from: number,
    to: number,
    z0: number,
    z1: number
  ): Prism => ({
    kind,
    wallId,
    footprint: slice(outline, a, u, length, from, to),
    z0: base + z0,
    z1: base + z1
  });

  const pieces: Prism[] = [];
  let cursor = 0;
  const sorted = openings
    .map((o) => ({
      ...o,
      start: Math.max(0, o.start),
      end: Math.min(length, o.end)
    }))
    .filter((o) => o.end > o.start)
    .sort((p, q) => p.start - q.start);
  for (const o of sorted) {
    const start = Math.max(o.start, cursor);
    if (o.end <= start) continue;
    if (start > cursor)
      pieces.push(piece('wall', cursor, start, 0, wallHeight));
    const top = Math.min(wallHeight, o.sill + o.height);
    if (o.sill > 0)
      pieces.push(piece('sill', start, o.end, 0, Math.min(o.sill, wallHeight)));
    if (top < wallHeight)
      pieces.push(piece('lintel', start, o.end, top, wallHeight));
    cursor = o.end;
  }
  if (cursor < length)
    pieces.push(piece('wall', cursor, length, 0, wallHeight));
  return pieces;
}

/**
 * The rooms of a wall graph: its enclosed faces, traced along wall centre
 * lines. Walls must meet at nodes (the editor splits a wall where another
 * joins it); a wall that dead-ends inside a room is part of that room. A
 * closed ring of walls standing inside a room does not cut a hole in it.
 */
export function findRooms(
  nodes: Map<number, Point>,
  walls: GraphWall[]
): Room[] {
  const ends = endsByNode(nodes, walls);
  // Half-edges as "from>to", walked with the face on their left.
  const key = (from: number, to: number) => `${from}>${to}`;
  const other = (end: End, at: number) =>
    end.wall.a === at ? end.wall.b : end.wall.a;
  const visited = new Set<string>();
  const rooms: Room[] = [];

  for (const wall of walls) {
    for (const [start, next] of [
      [wall.a, wall.b],
      [wall.b, wall.a]
    ]) {
      if (
        visited.has(key(start, next)) ||
        !nodes.has(start) ||
        !nodes.has(next)
      )
        continue;
      const cycle: number[] = [];
      let from = start;
      let to = next;
      while (!visited.has(key(from, to))) {
        visited.add(key(from, to));
        cycle.push(from);
        // At `to`, turn to the wall end just clockwise of the one we came in on.
        const list = ends.get(to)!;
        const back = list.findIndex((e) => other(e, to) === from);
        const turn = list[(back - 1 + list.length) % list.length];
        from = to;
        to = other(turn, from);
      }
      const polygon = removeSpikes(cycle.map((id) => nodes.get(id)!));
      const area = signedArea(polygon);
      // Bounded faces run anticlockwise; the outside of each building runs the
      // other way and is not a room.
      if (area > MIN_ROOM_AREA) rooms.push({ polygon, area });
    }
  }
  return rooms;
}

// A wall that dead-ends inside a room is walked out and back, leaving a
// zero-width spike (A, B, A) in the polygon. Remove them.
function removeSpikes(poly: Point[]): Point[] {
  const same = (p: Point, q: Point) =>
    Math.abs(p.x - q.x) < EPS && Math.abs(p.y - q.y) < EPS;
  const out = [...poly];
  let changed = true;
  while (changed && out.length > 3) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const prev = out[(i - 1 + out.length) % out.length];
      const next = out[(i + 1) % out.length];
      if (same(prev, next)) {
        // Drop the spike tip and one copy of the point it returns to.
        out.splice(i, 1);
        out.splice(i % out.length, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** Everything a floor needs drawn: wall pieces, and a floor and ceiling slab per room. */
export function floorGeometry(input: FloorInput): FloorGeometry {
  const { nodes, walls, openings, wallHeight, elevation, slabThickness } =
    input;
  const byWall = new Map<string, Opening[]>();
  for (const o of openings) {
    const list = byWall.get(o.wallId) ?? [];
    list.push(o);
    byWall.set(o.wallId, list);
  }
  const wallPrisms = wallOutlines(nodes, walls).flatMap((outline) =>
    wallPieces(
      outline,
      nodes,
      byWall.get(outline.wall.id) ?? [],
      wallHeight,
      elevation
    )
  );
  const rooms = findRooms(nodes, walls);
  return {
    walls: wallPrisms,
    rooms,
    floors: rooms.map((r) => ({
      kind: 'floor' as const,
      footprint: r.polygon,
      z0: elevation - slabThickness,
      z1: elevation
    })),
    ceilings: rooms.map((r) => ({
      kind: 'ceiling' as const,
      footprint: r.polygon,
      z0: elevation + wallHeight,
      z1: elevation + wallHeight + slabThickness
    }))
  };
}
