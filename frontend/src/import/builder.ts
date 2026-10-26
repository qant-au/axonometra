// The common end of every importer: floors with rooms, walls, doors, windows and furniture as another program
// describes them (plan units in metres, x to the right, z down the plan) become a clean Accurona plan – rooms
// tidied and joined, every door and window placed on a room edge, furniture mapped to Accurona's types.

import type { Building, Floor, FreeWall, Furniture, FurnitureType, Opening, Room, SillBoard, Vec2 } from "../model.ts";
import { canLift, emptyBuilding, FURNITURE_SIZE, FURNITURE_TYPES, newFloor, normalizeBuilding, pointInPolygon, polygonArea } from "../model.ts";
import { closeGaps, suggestedThickness } from "../geometry/gaps.ts";
import { bridgeGaps, cleanPolygon, faces, squareUp, type Seg } from "./geom.ts";
import { furnitureType, isDecor } from "./furniture-map.ts";

export interface RawRoom {
  name: string;
  points: Vec2[];
}

export interface RawWall {
  a: Vec2;
  b: Vec2;
  thickness?: number | null;
  height?: number | null;
}

export interface RawOpening {
  /** null: told by its size (low and tall = door, else window). */
  kind: "door" | "window" | "garage" | null;
  /** Its middle in the plan. */
  at: Vec2;
  width: number;
  height: number;
  /** Bottom edge above the floor. */
  sill: number;
  /** Windows: board and sill as the plan says (default automatic, #655). */
  sill_board?: SillBoard;
}

export interface RawFurniture {
  name: string;
  /** Known already (an exact category); else told by the name. */
  type?: FurnitureType | null;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** Degrees, clockwise in the plan; 0 = its front facing down the plan (+z). */
  rotation: number;
  /** Bottom above the floor (a wall cabinet, a lamp). */
  y?: number;
}

export interface RawFloor {
  name: string;
  elevation: number;
  height?: number | null;
  rooms: RawRoom[];
  walls: RawWall[];
  openings: RawOpening[];
  furniture: RawFurniture[];
  /** Texts in the plan (a CAD drawing's room names): a room without a name takes the one inside it. */
  labels?: { at: Vec2; text: string }[];
}

export interface RawPlan {
  source: string;
  floors: RawFloor[];
  /** Rooms were drawn at the inner faces of their walls (Sweet Home 3D, scans, CAD): neighbours get joined. */
  roomsAtInnerFaces?: boolean;
  /** Walls are drawn as their two faces (CAD, a model's section), not as centre lines. */
  wallFaces?: boolean;
  /** Gaps in the wall lines are doors (CAD, a model's section). */
  doorsFromGaps?: boolean;
  /** The plan may lie at any angle (a scan, a model, a robot map): turn it so its walls run along x and z. */
  align?: boolean;
  warnings?: Warning[];
}

export interface BuildOptions {
  /** Join rooms whose facing edges lie a wall's thickness apart (default: when rooms are at inner faces). */
  join?: boolean;
  /** Without rooms: find them as the areas the walls enclose. */
  roomsFromWalls?: boolean;
  /** Edges a few degrees off made exactly straight. */
  square?: boolean;
  furniture?: boolean;
  /** Mirror left–right (some programs save the plan mirrored). */
  mirror?: boolean;
  /** Turn the whole plan by 90° steps. */
  turn?: 0 | 90 | 180 | 270;
  /** Turn the plan so most walls run along x and z (default: for scans, models and robot maps). */
  align?: boolean;
  /** Language of made-up names ("Raum 3" / "Room 3"). */
  lang?: string;
}

export interface Warning {
  code: string;
  floor?: string;
  n?: number;
  name?: string;
}

export interface BuildResult {
  building: Building;
  warnings: Warning[];
  stats: { floors: number; rooms: number; doors: number; windows: number; walls: number; furniture: number };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}

/** Distance of a point to a segment, and how far along it (metres from a) its foot lies. */
function toSegment(p: Vec2, a: Vec2, b: Vec2): { d: number; s: number; len: number } {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 1e-9) return { d: Math.hypot(p[0] - a[0], p[1] - a[1]), s: 0, len };
  const s = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / len;
  const t = clamp(s, 0, len);
  const fx = a[0] + ((b[0] - a[0]) * t) / len;
  const fz = a[1] + ((b[1] - a[1]) * t) / len;
  return { d: Math.hypot(p[0] - fx, p[1] - fz), s, len };
}

const KNOWN = new Set<string>(FURNITURE_TYPES);

const centroidOf = (pts: readonly Vec2[]): Vec2 => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

export function buildPlan(raw: RawPlan, options: BuildOptions = {}): BuildResult {
  const warnings: Warning[] = [...(raw.warnings ?? [])];
  const opt = { join: raw.roomsAtInnerFaces ?? false, roomsFromWalls: true, square: true, furniture: true, mirror: false, turn: 0, ...options };
  const de = (opt.lang ?? "de").startsWith("de");
  let ids = 0;
  const id = (p: string) => `${p}_${(++ids).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  // a scan lies at any angle: the walls' main direction (lengths weighted, folded onto 90°) turned onto x
  let tilt = 0;
  if (opt.align ?? raw.align ?? false) {
    let sx = 0;
    let sz = 0;
    const edge = (a: Vec2, b: Vec2) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 4;
      sx += len * Math.cos(ang);
      sz += len * Math.sin(ang);
    };
    for (const f of raw.floors) {
      for (const r of f.rooms) r.points.forEach((p, i) => edge(p, r.points[(i + 1) % r.points.length]));
      for (const w of f.walls) edge(w.a, w.b);
    }
    if (Math.hypot(sx, sz) > 1e-6) tilt = -Math.atan2(sz, sx) / 4;
  }
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  // the whole plan turned or mirrored first, so everything below works in the final orientation
  const turn = (p: Vec2): Vec2 => {
    let [x, z] = [p[0] * ct - p[1] * st, p[0] * st + p[1] * ct];
    if (opt.mirror) x = -x;
    switch (opt.turn) {
      case 90:
        return [-z, x];
      case 180:
        return [-x, -z];
      case 270:
        return [z, -x];
      default:
        return [x, z];
    }
  };
  const turnAngle = (deg: number) => (opt.mirror ? -(deg + (tilt * 180) / Math.PI) : deg + (tilt * 180) / Math.PI) + opt.turn;
  const floorsIn = raw.floors.map((f) => ({
    ...f,
    rooms: f.rooms.map((r) => ({ ...r, points: r.points.map(turn) })),
    walls: f.walls.map((w) => ({ ...w, a: turn(w.a), b: turn(w.b) })),
    openings: f.openings.map((o) => ({ ...o, at: turn(o.at) })),
    furniture: f.furniture.map((m) => {
      const [x, z] = turn([m.x, m.z]);
      return { ...m, x, z, rotation: turnAngle(m.rotation) };
    }),
  }));

  // the plan moved so it starts near the origin (other programs often keep large offsets)
  const all: Vec2[] = floorsIn.flatMap((f) => [...f.rooms.flatMap((r) => r.points), ...f.walls.flatMap((w) => [w.a, w.b])]);
  const minX = all.length ? Math.min(...all.map((p) => p[0])) : 0;
  const minZ = all.length ? Math.min(...all.map((p) => p[1])) : 0;
  const shift = (p: Vec2): Vec2 => [r3(p[0] - minX), r3(p[1] - minZ)];

  const thickAll = floorsIn.flatMap((f) => f.walls.map((w) => w.thickness ?? NaN)).filter((t) => t > 0.03 && t < 1);
  const thickSorted = [...thickAll].sort((a, b) => a - b);
  // the thicker walls are the outer ones, the thinner the inner ones
  let exterior = thickSorted.length ? thickSorted[Math.floor(thickSorted.length * 0.85)] : null;
  let interior = thickSorted.length ? thickSorted[Math.floor(thickSorted.length * 0.25)] : null;
  const gapsSeen: number[] = [];

  const sortedFloors = [...floorsIn].sort((a, b) => a.elevation - b.elevation);
  const floors: Floor[] = [];
  const stats = { floors: 0, rooms: 0, doors: 0, windows: 0, walls: 0, furniture: 0 };
  sortedFloors.forEach((src, fi) => {
    const floor = newFloor(`floor_${fi + 1}`, src.name.trim() || (sortedFloors.length === 1 ? (de ? "Erdgeschoss" : "Ground floor") : `${de ? "Etage" : "Floor"} ${fi + 1}`), r3(sortedFloors.length === 1 ? 0 : src.elevation));
    const wallHeights = src.walls.map((w) => w.height ?? NaN).filter((h) => h > 1.5 && h < 8);
    floor.height = r3(clamp(src.height ?? median(wallHeights) ?? 2.5, 1.8, 8));
    const walls = src.walls.map((w) => ({ ...w, a: shift(w.a), b: shift(w.b) })).filter((w) => Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) > 0.02);

    // rooms: the drawn ones, else the areas the walls enclose
    let rooms: Room[] = src.rooms
      .map((r) => ({ name: r.name, points: cleanPolygon(r.points.map(shift)) }))
      .filter((r) => r.points.length >= 3)
      .map((r) => ({ id: id("room"), name: r.name.trim(), area_id: null, points: r.points, floor_material: "wood" }));
    let fromWalls = false;
    if (!rooms.length && walls.length && opt.roomsFromWalls) {
      // wall ends a little longer, so walls that stop just short of each other (a scan) still meet; the stubs
      // that stick out are left over as loose ends and ignored
      const segs: Seg[] = walls.map((w) => {
        const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
        const e = Math.min(0.1, len * 0.2) / len;
        return { a: [w.a[0] - (w.b[0] - w.a[0]) * e, w.a[1] - (w.b[1] - w.a[1]) * e] as Vec2, b: [w.b[0] + (w.b[0] - w.a[0]) * e, w.b[1] + (w.b[1] - w.a[1]) * e] as Vec2 };
      });
      const bridges = bridgeGaps(walls.map((w) => ({ a: w.a, b: w.b })));
      // a gap in the wall lines is a door (drawn as an opening, not as a door symbol)
      if (raw.doorsFromGaps) for (const g of bridges) src.openings.push({ kind: "door", at: [(g.a[0] + g.b[0]) / 2 + minX, (g.a[1] + g.b[1]) / 2 + minZ], width: Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]), height: 2.01, sill: 0 });
      const found = faces([...segs, ...bridges], 0.02);
      // drawn as two faces per wall: the thin strips between them are the walls themselves, not rooms
      const isStrip = (pts: Vec2[], area: number) => {
        let per = 0;
        for (let i = 0; i < pts.length; i++) per += Math.hypot(pts[(i + 1) % pts.length][0] - pts[i][0], pts[(i + 1) % pts.length][1] - pts[i][1]);
        return (2 * area) / per < 0.35;
      };
      // an area that holds another one is no room: the outline of the whole house around the rooms (an outer
      // wall face that touches nothing inside)
      // (a wardrobe cut through inside a room is no reason: what it holds must make up much of its area)
      const box = (pts: Vec2[]) => ({ x0: Math.min(...pts.map((p) => p[0])), z0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), z1: Math.max(...pts.map((p) => p[1])) });
      const boxes = new Map(found.map((f) => [f, box(f.points)]));
      const holds = (f: { points: Vec2[]; area: number }) => {
        const fb = boxes.get(f)!;
        let held = 0;
        for (const g of found) {
          if (g === f || g.area >= f.area * 0.98) continue;
          const gb = boxes.get(g)!;
          if (gb.x0 < fb.x0 - 0.05 || gb.x1 > fb.x1 + 0.05 || gb.z0 < fb.z0 - 0.05 || gb.z1 > fb.z1 + 0.05) continue;
          if (pointInPolygon(centroidOf(g.points), f.points) && g.points.every((p) => pointInPolygon(p, f.points) || f.points.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.03))) held += g.area;
        }
        return held >= f.area * 0.4;
      };
      rooms = found
        .filter((f) => f.area >= 1.0 && !isStrip(f.points, f.area) && !holds(f))
        .map((f) => ({ id: id("room"), name: "", area_id: null, points: cleanPolygon(f.points), floor_material: "wood" }));
      fromWalls = true;
      if (!rooms.length) warnings.push({ code: "no_rooms_found", floor: floor.name });
    }
    rooms = rooms.filter((r) => {
      if (polygonArea(r.points) >= 0.3) return true;
      warnings.push({ code: "room_tiny", floor: floor.name, name: r.name });
      return false;
    });
    if (opt.square) rooms = rooms.map((r) => ({ ...r, points: cleanPolygon(squareUp(r.points)) }));
    // rooms at inner faces (or found between wall faces): neighbours a wall apart share one edge
    if (rooms.length > 1 && (opt.join || (fromWalls && raw.wallFaces))) {
      const maxGap = clamp((exterior ?? 0.4) + 0.08, 0.2, 0.7);
      const res = closeGaps(rooms, maxGap);
      rooms = res.rooms.map((r) => ({ ...r, points: cleanPolygon(r.points) }));
      gapsSeen.push(...res.gaps);
    }
    // unnamed rooms take a label lying inside them
    for (const l of src.labels ?? []) {
      const at = shift(l.at);
      const r = rooms.find((x) => !x.name && pointInPolygon(at, x.points));
      if (r) r.name = l.text;
    }
    rooms.forEach((r, i) => (r.name = r.name || `${de ? "Raum" : "Room"} ${i + 1}`));
    floor.rooms = rooms;

    // walls not along any room edge stand on their own (a partition, a half-height wall)
    const edges = rooms.flatMap((r) => r.points.map((p, i) => ({ room: r, edge: i, a: p, b: r.points[(i + 1) % r.points.length] })));
    const covered = (w: RawWall) => {
      const t = (w.thickness ?? interior ?? 0.12) / 2 + 0.08;
      let hit = 0;
      for (let k = 0; k <= 8; k++) {
        const p: Vec2 = [w.a[0] + ((w.b[0] - w.a[0]) * k) / 8, w.a[1] + ((w.b[1] - w.a[1]) * k) / 8];
        if (edges.some((e) => toSegment(p, e.a, e.b).d <= t)) hit++;
      }
      return hit >= 6;
    };
    const free: FreeWall[] = [];
    if (!(fromWalls && raw.wallFaces))
      for (const w of walls) {
        if (rooms.length && covered(w)) continue;
        if (rooms.length || !fromWalls) {
          free.push({ id: id("wall"), a: w.a, b: w.b, thickness: w.thickness ? r3(clamp(w.thickness, 0.05, 0.6)) : null, height: w.height && w.height < floor.height - 0.05 ? r3(w.height) : null });
        }
      }
    floor.walls = free;
    stats.walls += free.length;

    // doors and windows: onto the nearest room edge (or a free wall), centred where they were
    const openings: Opening[] = [];
    let dropped = 0;
    for (const o of src.openings) {
      const at = shift(o.at);
      const reach = Math.max(0.35, (exterior ?? 0.3) * 0.75 + 0.1);
      let best: { room: Room; edge: number; s: number; len: number; d: number } | null = null;
      for (const e of edges) {
        const m = toSegment(at, e.a, e.b);
        if (m.d <= reach && m.s > -0.05 && m.s < m.len + 0.05 && (!best || m.d < best.d)) best = { room: e.room, edge: e.edge, s: m.s, len: m.len, d: m.d };
      }
      let wallId: string | null = null;
      if (!best) {
        for (const w of free) {
          const m = toSegment(at, w.a, w.b);
          if (m.d <= reach && (!best || m.d < best.d)) {
            best = { room: rooms[0], edge: 0, s: m.s, len: m.len, d: m.d };
            wallId = w.id;
          }
        }
        if (best && !rooms.length) best = null;
      }
      if (!best) {
        dropped++;
        continue;
      }
      const width = r3(clamp(Math.min(o.width, best.len - 0.04), 0.3, 12));
      const offset = r3(clamp(best.s, width / 2 + 0.01, Math.max(width / 2 + 0.01, best.len - width / 2 - 0.01)));
      const height = r3(clamp(o.height, 0.3, floor.height));
      const sill = r3(clamp(o.sill, 0, Math.max(0, floor.height - height)));
      let type: Opening["type"] = o.kind ?? (sill < 0.15 && height > 1.7 ? "door" : "window");
      if (type === "door" && width >= 2.2) type = "garage";
      // the same opening twice (both rooms of a wall listed it): keep one – a window above another one
      // (a transom light, a split front) is no duplicate
      const bottom = type === "window" ? sill : 0;
      if (openings.some((x) => x.room_id === best!.room.id && x.edge === best!.edge && (x.wall ?? null) === wallId && Math.abs(x.offset - offset) < 0.2 && x.sill < bottom + height - 0.05 && bottom < x.sill + x.height - 0.05)) continue;
      openings.push({
        id: id("opening"),
        room_id: best.room.id,
        edge: best.edge,
        offset,
        wall: wallId,
        width,
        type,
        sill: type === "window" ? sill : 0,
        height,
        hinge: "left",
        leaves: type === "window" && width > 1.4 ? 2 : type === "door" && width > 1.25 ? 2 : 1,
        swing: "in",
        cover: null,
        contact: null,
        contact2: null,
        tilt: null,
        ...(type === "window" && o.sill_board && o.sill_board !== "auto" ? { sill_board: o.sill_board } : {}),
      });
      if (type === "window") stats.windows++;
      else stats.doors++;
    }
    if (dropped) warnings.push({ code: "openings_dropped", floor: floor.name, n: dropped });
    floor.openings = openings;

    // furniture
    const furniture: Furniture[] = [];
    let unknown = 0;
    let skipped = 0;
    if (opt.furniture)
      for (const m of src.furniture) {
        const [x, z] = shift([m.x, m.z]);
        const y = m.y ?? 0;
        let type = (m.type && KNOWN.has(m.type) ? m.type : null) ?? furnitureType(m.name, m.h, y);
        let name: string | null = null;
        // decoration and small things (frames, vases, curtains, sockets, fence posts …) are left out
        if (!type && (isDecor(m.name) || Math.max(m.w, m.d) < 0.35 || m.h < 0.12)) {
          skipped++;
          continue;
        }
        if (!type) {
          type = "sideboard";
          name = m.name.trim().slice(0, 60) || null;
          unknown++;
        }
        const def = FURNITURE_SIZE[type];
        const ok = (v: number, d: number) => (Number.isFinite(v) && v > 0.02 && v < 20 ? v : d);
        const f: Furniture = {
          id: id("furn"),
          type,
          x,
          z,
          rotation: r3(((m.rotation % 360) + 360) % 360),
          w: r3(ok(m.w, def[0])),
          d: r3(ok(m.d, def[1])),
          h: r3(ok(m.h, def[2])),
          variant: null,
          entity: null,
          power: null,
          ...(name ? { name } : {}),
        };
        if (y > 0.05 && canLift(f)) f.mount_y = r3(clamp(y, 0, floor.height));
        furniture.push(f);
      }
    if (unknown) warnings.push({ code: "furniture_unknown", floor: floor.name, n: unknown });
    if (skipped) warnings.push({ code: "furniture_decor", floor: floor.name, n: skipped });
    floor.furniture = furniture;
    stats.furniture += furniture.length;
    stats.rooms += rooms.length;
    floors.push(floor);
  });
  stats.floors = floors.length;

  const b = emptyBuilding();
  b.floors = floors;
  const fromGaps = suggestedThickness(gapsSeen);
  interior = fromGaps ?? interior;
  if (exterior !== null && interior !== null && exterior < interior) [exterior, interior] = [interior, exterior];
  if (exterior) b.settings.wall_exterior = r3(clamp(exterior, 0.1, 0.6));
  if (interior) b.settings.wall_interior = r3(clamp(interior, 0.06, 0.4));
  if (!stats.rooms) warnings.push({ code: "no_rooms" });
  return { building: normalizeBuilding(b), warnings, stats };
}
