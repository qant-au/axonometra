// CAD drawings (DXF, as AutoCAD, ArchiCAD, Revit, LibreCAD, magicplan or an architect export them): lines and
// polylines sorted by their layer into walls, rooms, doors and windows. A wall drawn as its two faces with a gap
// for each door is the usual case: the gaps become doors, the areas between the walls rooms. Block references
// named like a door or window become openings; texts inside a room name it.

import type { Vec2 } from "../model.ts";
import type { RawPlan } from "./builder.ts";

export type LayerRole = "wall" | "room" | "door" | "window" | "ignore";

export interface DxfLayer {
  name: string;
  count: number;
  role: LayerRole;
}

interface Entity {
  type: string;
  layer: string;
  pts: Vec2[];
  closed: boolean;
  /** INSERT: the block, its point, scale and turn; TEXT: the text. */
  block?: string;
  at?: Vec2;
  sx?: number;
  sy?: number;
  rot?: number;
  text?: string;
}

/** A role guessed from a layer's name (German, English, French, Spanish, Italian and AIA names). */
export function guessRole(name: string): LayerRole {
  const n = name.toLowerCase();
  if (/dim|bema|text|hatch|schraff|möbel|moebel|furn|mobil|achs|axis|grid|raster|electr|elektr|sanit|plumb|rahmen|title|stempel|defpoints|vport/.test(n)) return "ignore";
  if (/window|fenster|fen[eê]tre|ventana|finestr|a-glaz/.test(n)) return "window";
  if (/door|t[üu]r|tuer|porte|puerta|porta|a-door/.test(n)) return "door";
  if (/room|raum|räume|space|area|fläche|flaeche|zone|pi[eè]ce|habitaci|stanz|a-area/.test(n)) return "room";
  if (/wall|wand|w[äa]nde|mauer|mur|muro|pared|a-wall|beton|concrete|mauerwerk/.test(n)) return "wall";
  return "ignore";
}

/** The group code / value pairs of a DXF text. */
function pairs(text: string): [number, string][] {
  const lines = text.split(/\r?\n/);
  const out: [number, string][] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    if (Number.isFinite(code)) out.push([code, lines[i + 1].trim()]);
  }
  return out;
}

/** Entities of one section (ENTITIES, or one block). */
function entities(p: [number, string][], from: number, until: (i: number) => boolean): { list: Entity[]; end: number } {
  const list: Entity[] = [];
  let i = from;
  let cur: Entity | null = null;
  let poly: Entity | null = null;
  let x: number | null = null;
  const flush = () => {
    if (cur && cur.type !== "VERTEX" && cur.type !== "POLYLINE" && cur.type !== "SEQEND") list.push(cur);
    cur = null;
  };
  for (; i < p.length && !until(i); i++) {
    const [c, v] = p[i];
    if (c === 0) {
      flush();
      if (v === "VERTEX" && poly) {
        cur = { type: "VERTEX", layer: poly.layer, pts: [], closed: false };
        continue;
      }
      if (v === "SEQEND" && poly) {
        list.push(poly);
        poly = null;
        continue;
      }
      if (v === "POLYLINE") {
        poly = { type: "LWPOLYLINE", layer: "0", pts: [], closed: false };
        cur = { type: "POLYLINE", layer: "0", pts: [], closed: false };
        continue;
      }
      cur = { type: v, layer: "0", pts: [], closed: false, sx: 1, sy: 1, rot: 0 };
      continue;
    }
    if (!cur) continue;
    const e: Entity = cur;
    const num = parseFloat(v);
    if (c === 8) {
      e.layer = v;
      if (e.type === "POLYLINE" && poly) poly.layer = v;
    } else if (c === 70 && e.type === "LWPOLYLINE") e.closed = (parseInt(v, 10) & 1) === 1;
    else if (c === 70 && e.type === "POLYLINE" && poly) poly.closed = (parseInt(v, 10) & 1) === 1;
    else if (c === 2 && e.type === "INSERT") e.block = v;
    else if ((c === 1 || c === 3) && (e.type === "TEXT" || e.type === "MTEXT")) e.text = (e.text ?? "") + v;
    else if (c === 41) e.sx = num;
    else if (c === 42 && e.type === "INSERT") e.sy = num;
    else if (c === 50) e.rot = num;
    else if (c === 10 || c === 11) x = num;
    else if ((c === 20 || c === 21) && x !== null) {
      const pt: Vec2 = [x, num];
      if (e.type === "VERTEX" && poly) poly.pts.push(pt);
      else if (e.type === "INSERT" || e.type === "TEXT" || e.type === "MTEXT") {
        if (c === 20 && !e.at) e.at = pt;
      } else e.pts.push(pt);
      x = null;
    }
  }
  flush();
  return { list, end: i };
}

export interface DxfRead {
  layers: DxfLayer[];
  /** Drawing units in metres per unit. */
  unit: number;
  plan: RawPlan;
}

/**
 * Reads a DXF; `roles` overrides the guessed role of layers, `unit` the drawing unit (metres per unit, null =
 * from the header or guessed from the drawing's size).
 */
export function readDxf(text: string, roles: Record<string, LayerRole> = {}, unit: number | null = null, lang = "de"): DxfRead {
  const p = pairs(text);
  // header: the drawing's units
  let insUnits = 0;
  const h = p.findIndex(([c, v]) => c === 9 && v === "$INSUNITS");
  if (h >= 0 && p[h + 1]?.[0] === 70) insUnits = parseInt(p[h + 1][1], 10);
  // blocks (for references): name -> entities
  const blocks = new Map<string, Entity[]>();
  for (let i = 0; i < p.length; i++) {
    if (p[i][0] === 0 && p[i][1] === "BLOCK") {
      let name = "";
      let j = i + 1;
      for (; j < p.length && p[j][0] !== 0; j++) if (p[j][0] === 2) name = p[j][1];
      const res = entities(p, j, (k) => p[k][0] === 0 && p[k][1] === "ENDBLK");
      blocks.set(name, res.list);
      i = res.end;
    }
  }
  const start = p.findIndex(([c, v], i) => c === 0 && v === "SECTION" && p[i + 1]?.[1] === "ENTITIES");
  if (start < 0) throw new Error("dxf_broken");
  const { list } = entities(p, start + 2, (k) => p[k][0] === 0 && p[k][1] === "ENDSEC");

  // block references: a door or window block becomes an opening, any other block is drawn out (walls in blocks)
  const flat: Entity[] = [];
  const openings: { kind: "door" | "window"; at: Vec2; width: number }[] = [];
  for (const e of list) {
    if (e.type !== "INSERT" || !e.block) {
      flat.push(e);
      continue;
    }
    const inner = blocks.get(e.block) ?? [];
    const rot = ((e.rot ?? 0) * Math.PI) / 180;
    const tf = ([x, y]: Vec2): Vec2 => {
      const sx = x * (e.sx ?? 1);
      const sy = y * (e.sy ?? 1);
      return [(e.at?.[0] ?? 0) + sx * Math.cos(rot) - sy * Math.sin(rot), (e.at?.[1] ?? 0) + sx * Math.sin(rot) + sy * Math.cos(rot)];
    };
    const role = guessRole(e.block);
    const pts = inner.flatMap((x) => x.pts).map(tf);
    if ((role === "door" || role === "window") && pts.length) {
      // its width: the longer side of the block's extent
      const xs = inner.flatMap((x) => x.pts).map((q) => q[0] * Math.abs(e.sx ?? 1));
      const ys = inner.flatMap((x) => x.pts).map((q) => q[1] * Math.abs(e.sy ?? 1));
      const width = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
      const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
      openings.push({ kind: role, at: [cx, cy], width });
      continue;
    }
    for (const x of inner) flat.push({ ...x, layer: x.layer === "0" ? e.layer : x.layer, pts: x.pts.map(tf), at: x.at ? tf(x.at) : undefined });
  }

  // layers and their roles
  const counts = new Map<string, number>();
  for (const e of flat) counts.set(e.layer, (counts.get(e.layer) ?? 0) + 1);
  const layers: DxfLayer[] = [...counts.entries()].map(([name, count]) => ({ name, count, role: roles[name] ?? guessRole(name) })).sort((a, b) => b.count - a.count);
  // no wall layer recognised: every line not marked otherwise counts as wall
  if (!layers.some((l) => l.role === "wall")) for (const l of layers) if (l.role === "ignore" && !roles[l.name] && !/dim|bema|text|hatch|schraff/i.test(l.name)) l.role = "wall";
  const roleOf = new Map(layers.map((l) => [l.name, l.role]));

  // units: the header, else guessed from the size of the drawing (a house spans 5–40 m)
  const all = flat.flatMap((e) => e.pts);
  const span = all.length ? Math.max(Math.max(...all.map((q) => q[0])) - Math.min(...all.map((q) => q[0])), Math.max(...all.map((q) => q[1])) - Math.min(...all.map((q) => q[1]))) : 0;
  const fromHeader: Record<number, number> = { 1: 0.0254, 2: 0.3048, 4: 0.001, 5: 0.01, 6: 1 };
  const u = unit ?? fromHeader[insUnits] ?? (span > 2500 ? 0.001 : span > 150 ? 0.01 : 1);
  // DXF y runs up the drawing, Axonometra's z down the plan
  const m = ([x, y]: Vec2): Vec2 => [x * u, -y * u];

  const walls: RawPlan["floors"][number]["walls"] = [];
  const rooms: RawPlan["floors"][number]["rooms"] = [];
  const texts: { at: Vec2; text: string }[] = [];
  for (const e of flat) {
    const role = roleOf.get(e.layer);
    if ((e.type === "TEXT" || e.type === "MTEXT") && e.at && e.text) {
      // MTEXT formatting codes out; areas and numbers are no names
      const t = e.text.replace(/\\[A-Za-z][^;]*;|[{}]|\\P/g, " ").replace(/\s+/g, " ").trim();
      if (t && t.length <= 30 && !/^[\d.,\s]+(m²|m2|qm)?$/.test(t) && !/m²|m2\b|qm\b/.test(t)) texts.push({ at: m(e.at), text: t });
      continue;
    }
    if (role === "room" && e.pts.length >= 3 && (e.closed || Math.hypot(e.pts[0][0] - e.pts[e.pts.length - 1][0], e.pts[0][1] - e.pts[e.pts.length - 1][1]) * u < 0.02)) {
      rooms.push({ name: "", points: e.pts.map(m) });
      continue;
    }
    if (role !== "wall" || e.pts.length < 2) continue;
    const pts = e.pts.map(m);
    for (let k = 0; k + 1 < pts.length; k++) walls.push({ a: pts[k], b: pts[k + 1] });
    if (e.closed && pts.length > 2) walls.push({ a: pts[pts.length - 1], b: pts[0] });
  }
  if (!walls.length && !rooms.length) throw new Error("nothing_found");
  const floor = {
    name: lang.startsWith("de") ? "Erdgeschoss" : "Ground floor",
    elevation: 0,
    rooms,
    walls,
    openings: openings.map((o) => ({ kind: o.kind, at: m(o.at), width: o.width * u, height: o.kind === "door" ? 2.01 : 1.3, sill: o.kind === "door" ? 0 : 0.9 })),
    furniture: [],
    labels: texts,
  };
  return { layers, unit: u, plan: { source: "DXF", floors: [floor], roomsAtInnerFaces: true, wallFaces: true, doorsFromGaps: true } };
}
