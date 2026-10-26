// The simple import format (docs/plan-format.md): what a person, a script or an AI writes easily – floors with rooms
// as outlines, walls, doors and windows by their middle, furniture by kind and size. The importer turns it into a
// proper plan. And the check for complete Accurona plans that were written by hand or by an AI: broken parts are
// repaired or left out, with a warning for each.

import type { Building, FurnitureType, SillBoard, Vec2 } from "../model.ts";
import { FURNITURE_SIZE, FURNITURE_TYPES, SILL_BOARDS, normalizeBuilding, uid } from "../model.ts";
import type { RawFloor, RawPlan, Warning } from "./builder.ts";
import { cleanPolygon } from "./geom.ts";
import { furnitureType } from "./furniture-map.ts";

export const SIMPLE_FORMAT = "neonplan-import";

const KNOWN = new Set<string>(FURNITURE_TYPES);
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
const pt = (v: unknown): Vec2 | null => (Array.isArray(v) && v.length >= 2 && Number.isFinite(+v[0]) && Number.isFinite(+v[1]) ? [+v[0], +v[1]] : v && typeof v === "object" && "x" in v ? [n((v as { x: unknown }).x, NaN), n((v as { z?: unknown; y?: unknown }).z ?? (v as { y?: unknown }).y, NaN)] : null);

export function isSimple(data: unknown): boolean {
  const d = data as { format?: string; floors?: { rooms?: unknown }[] };
  return d?.format === SIMPLE_FORMAT || (Array.isArray(d?.floors) && d.floors.some((f) => Array.isArray(f?.rooms) && (f.rooms as { points?: unknown }[]).some((r) => Array.isArray(r?.points))) && !(d as { version?: unknown }).version);
}

interface SimpleFloor {
  name?: string;
  elevation?: number;
  height?: number;
  rooms?: { name?: string; points?: unknown[] }[];
  walls?: { from?: unknown; to?: unknown; thickness?: number; height?: number }[];
  doors?: { at?: unknown; width?: number; height?: number }[];
  windows?: { at?: unknown; width?: number; height?: number; sill?: number; sill_board?: string }[];
  furniture?: { type?: string; name?: string; at?: unknown; width?: number; depth?: number; height?: number; rotation?: number; elevation?: number }[];
}

export function readSimple(data: unknown): RawPlan {
  const d = data as { units?: string; rooms_at?: string; floors?: SimpleFloor[] };
  const unit = d.units === "cm" ? 0.01 : d.units === "mm" ? 0.001 : 1;
  const u = (p: Vec2 | null): Vec2 | null => (p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? [p[0] * unit, p[1] * unit] : null);
  const warnings: Warning[] = [];
  const floors: RawFloor[] = (d.floors ?? []).map((f, i) => {
    let skipped = 0;
    const rooms = (f.rooms ?? []).flatMap((r) => {
      const pts = (r.points ?? []).map((p) => u(pt(p))).filter((p): p is Vec2 => !!p);
      if (pts.length < 3) {
        skipped++;
        return [];
      }
      return [{ name: String(r.name ?? ""), points: pts }];
    });
    if (skipped) warnings.push({ code: "rooms_skipped", n: skipped });
    const floor: RawFloor = {
      name: String(f.name ?? `Etage ${i + 1}`),
      elevation: f.elevation !== undefined ? n(f.elevation, 0) * unit : i * 2.8,
      height: f.height !== undefined ? n(f.height, 2.5 / unit) * unit : null,
      rooms,
      walls: (f.walls ?? []).flatMap((w) => {
        const a = u(pt(w.from));
        const b = u(pt(w.to));
        return a && b ? [{ a, b, thickness: w.thickness !== undefined ? n(w.thickness, 0.12) * unit : null, height: w.height !== undefined ? n(w.height, 2.5) * unit : null }] : [];
      }),
      openings: [
        ...(f.doors ?? []).flatMap((o) => {
          const at = u(pt(o.at));
          return at ? [{ kind: "door" as const, at, width: n(o.width, unit === 1 ? 0.9 : 90) * unit, height: n(o.height, unit === 1 ? 2.01 : 201) * unit, sill: 0 }] : [];
        }),
        ...(f.windows ?? []).flatMap((o) => {
          const at = u(pt(o.at));
          const sill_board = (SILL_BOARDS as readonly string[]).includes(o.sill_board ?? "") ? (o.sill_board as SillBoard) : undefined;
          return at ? [{ kind: "window" as const, at, width: n(o.width, unit === 1 ? 1.2 : 120) * unit, height: n(o.height, unit === 1 ? 1.3 : 130) * unit, sill: n(o.sill, unit === 1 ? 0.9 : 90) * unit, sill_board }] : [];
        }),
      ],
      furniture: (f.furniture ?? []).flatMap((m) => {
        const at = u(pt(m.at));
        if (!at) return [];
        const type = m.type && KNOWN.has(m.type) ? (m.type as FurnitureType) : null;
        const def = type ? FURNITURE_SIZE[type] : [0.6, 0.6, 0.8];
        return [{ name: String(m.name ?? m.type ?? ""), type, x: at[0], z: at[1], w: n(m.width, def[0] / unit) * unit, d: n(m.depth, def[1] / unit) * unit, h: n(m.height, def[2] / unit) * unit, rotation: n(m.rotation, 0), y: n(m.elevation, 0) * unit }];
      }),
    };
    return floor;
  });
  if (!floors.length) throw new Error("nothing_found");
  return { source: "Accurona", floors, roomsAtInnerFaces: d.rooms_at === "inner", warnings };
}

/**
 * A complete Accurona plan as a person or an AI wrote it, checked and repaired: rooms with fewer than three usable
 * points go, outlines are tidied, doors and windows on edges that do not exist go, positions are kept on their
 * edge, unknown furniture becomes the nearest known kind, ids are made unique.
 */
export function repairPlan(input: Building): { building: Building; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const b = structuredClone(input);
  const ids = new Set<string>();
  const fresh = (id: unknown, prefix: string) => {
    let s = typeof id === "string" && id && id.length <= 64 ? id : uid(prefix);
    while (ids.has(s)) s = uid(prefix);
    ids.add(s);
    return s;
  };
  b.floors = (Array.isArray(b.floors) ? b.floors : []).map((f, i) => {
    const floor = { ...f };
    floor.id = fresh(f.id, "floor");
    floor.name = String(f.name ?? `Etage ${i + 1}`);
    floor.elevation = n(f.elevation, 0);
    floor.height = Math.min(8, Math.max(1.8, n(f.height, 2.5)));
    floor.cut_height = n(f.cut_height, 1.15);
    let dropped = 0;
    const roomIds = new Map<string, string>();
    floor.rooms = (Array.isArray(f.rooms) ? f.rooms : []).flatMap((r) => {
      const pts = cleanPolygon((Array.isArray(r.points) ? r.points : []).map((p) => pt(p)).filter((p): p is Vec2 => !!p && Number.isFinite(p[0]) && Number.isFinite(p[1])));
      if (pts.length < 3) {
        dropped++;
        return [];
      }
      const id = fresh(r.id, "room");
      roomIds.set(r.id, id);
      // the edges may have changed with tidying: per-edge lists only fit when the count stayed
      const same = pts.length === r.points?.length;
      return [{ ...r, id, name: String(r.name ?? ""), area_id: r.area_id ?? null, points: pts, floor_material: r.floor_material ?? "wood", ...(same ? {} : { wall_heights: undefined, wall_thickness: undefined, wall_splits: undefined }) }];
    });
    if (dropped) warnings.push({ code: "rooms_skipped", floor: floor.name, n: dropped });
    let bad = 0;
    floor.openings = (Array.isArray(f.openings) ? f.openings : []).flatMap((o) => {
      const room = floor.rooms.find((r) => r.id === roomIds.get(o.room_id));
      const edge = Math.round(n(o.edge, -1));
      if (!room || edge < 0 || edge >= room.points.length) {
        bad++;
        return [];
      }
      const a = room.points[edge];
      const c = room.points[(edge + 1) % room.points.length];
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const width = Math.min(Math.max(0.3, n(o.width, 0.9)), Math.max(0.3, len - 0.02));
      const type = o.type === "window" || o.type === "garage" ? o.type : "door";
      const height = Math.min(floor.height, Math.max(0.3, n(o.height, type === "window" ? 1.3 : 2.01)));
      return [{ ...o, id: fresh(o.id, "opening"), room_id: room.id, edge, type, width, height, sill: type === "window" ? Math.max(0, Math.min(floor.height - height, n(o.sill, 0.9))) : 0, offset: Math.min(Math.max(width / 2, n(o.offset, len / 2)), Math.max(width / 2, len - width / 2)) }];
    });
    if (bad) warnings.push({ code: "openings_dropped", floor: floor.name, n: bad });
    let unknown = 0;
    floor.furniture = (Array.isArray(f.furniture) ? f.furniture : []).flatMap((m) => {
      if (!Number.isFinite(n(m.x, NaN)) || !Number.isFinite(n(m.z, NaN))) return [];
      let type = String(m.type ?? "");
      if (!KNOWN.has(type) && !type.startsWith("pack:")) {
        type = furnitureType(`${type} ${m.name ?? ""}`) ?? "sideboard";
        unknown++;
      }
      const def = FURNITURE_SIZE[type as FurnitureType] ?? [0.6, 0.6, 0.8];
      return [{ ...m, id: fresh(m.id, "furn"), type, x: n(m.x, 0), z: n(m.z, 0), rotation: ((n(m.rotation, 0) % 360) + 360) % 360, w: n(m.w, def[0]), d: n(m.d, def[1]), h: n(m.h, def[2]), variant: m.variant ?? null }];
    });
    if (unknown) warnings.push({ code: "furniture_mapped", floor: floor.name, n: unknown });
    floor.placements = Array.isArray(f.placements) ? f.placements : [];
    floor.outdoor = Array.isArray(f.outdoor) ? f.outdoor.filter((a) => Array.isArray(a.points) && a.points.length >= 3) : [];
    floor.walls = Array.isArray(f.walls) ? f.walls.filter((w) => pt(w.a) && pt(w.b)).map((w) => ({ ...w, id: fresh(w.id, "wall") })) : [];
    floor.background = null;
    floor.ha_floor = f.ha_floor ?? null;
    return floor;
  });
  b.version = 1;
  if (!b.floors.length) throw new Error("not_plan");
  return { building: normalizeBuilding(b), warnings };
}
