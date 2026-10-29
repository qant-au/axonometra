// Floorplanner (floorplanner.com, its JSON/FML export): floors with designs; walls from a to b with thickness,
// height and the openings in them (t = where along the wall), areas as named polygons, items with size and
// rotation. Lengths are centimetres, y runs down the plan like Axonometra's z.

import type { Vec2 } from "../model.ts";
import type { RawFloor, RawOpening, RawPlan } from "./builder.ts";

interface P {
  x?: number;
  y?: number;
  z?: number;
}
interface FWall {
  a?: P;
  b?: P;
  thickness?: number;
  height?: number;
  openings?: { type?: string; t?: number; width?: number; z?: number; z_height?: number; refid?: string }[];
}
interface FArea {
  name?: string;
  poly?: P[];
}
interface FItem {
  name?: string;
  refid?: string;
  x?: number;
  y?: number;
  z?: number;
  width?: number;
  height?: number;
  z_height?: number;
  rotation?: number;
}
interface FDesign {
  walls?: FWall[];
  areas?: FArea[];
  items?: FItem[];
}
interface FFloor {
  name?: string;
  level?: number;
  height?: number;
  designs?: FDesign[];
}

export function isFloorplanner(data: unknown): boolean {
  const d = data as { floors?: FFloor[]; project?: { floors?: FFloor[] } };
  const floors = d?.floors ?? d?.project?.floors;
  return Array.isArray(floors) && floors.some((f) => Array.isArray(f?.designs));
}

export function readFloorplanner(data: unknown, lang = "de"): RawPlan {
  const d = data as { floors?: FFloor[]; project?: { floors?: FFloor[] } };
  const list = (d.floors ?? d.project?.floors ?? []).filter((f) => f.designs?.length);
  if (!list.length) throw new Error("nothing_found");
  const m = (v: number | undefined) => (v ?? 0) / 100;
  let elevation = 0;
  const sorted = [...list].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  const floors: RawFloor[] = sorted.map((f, i) => {
    const design = f.designs![0];
    const height = f.height ? m(f.height) : null;
    const floor: RawFloor = { name: f.name ?? (lang.startsWith("de") ? `Etage ${i + 1}` : `Floor ${i + 1}`), elevation, height, rooms: [], walls: [], openings: [], furniture: [] };
    elevation += height ?? 2.6;
    for (const w of design.walls ?? []) {
      const a: Vec2 = [m(w.a?.x), m(w.a?.y)];
      const b: Vec2 = [m(w.b?.x), m(w.b?.y)];
      floor.walls.push({ a, b, thickness: w.thickness ? m(w.thickness) : null, height: w.height ? m(w.height) : null });
      for (const o of w.openings ?? []) {
        const t = o.t ?? 0.5;
        const kind: RawOpening["kind"] = /window/i.test(`${o.type ?? ""} ${o.refid ?? ""}`) ? "window" : /door/i.test(`${o.type ?? ""} ${o.refid ?? ""}`) ? "door" : null;
        floor.openings.push({ kind, at: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], width: m(o.width ?? 90), height: m(o.z_height ?? (kind === "window" ? 130 : 210)), sill: m(o.z ?? 0) });
      }
    }
    for (const ar of design.areas ?? []) {
      const pts = (ar.poly ?? []).map((p) => [m(p.x), m(p.y)] as Vec2);
      if (pts.length >= 3) floor.rooms.push({ name: ar.name ?? "", points: pts });
    }
    for (const it of design.items ?? [])
      floor.furniture.push({ name: it.name ?? it.refid ?? "", x: m(it.x), z: m(it.y), w: m(it.width ?? 50), d: m(it.height ?? 50), h: m(it.z_height ?? 80), rotation: it.rotation ?? 0, y: m(it.z) });
    return floor;
  });
  return { source: "Floorplanner", floors, roomsAtInnerFaces: true };
}
