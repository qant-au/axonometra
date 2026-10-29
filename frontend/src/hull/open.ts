// An open boat: the hull as a shell of plate with nothing over it, the kind a plate aluminium fishing boat or a
// runabout is. Inside the plating sits the sole (the deck you stand on), above the waterline so the boat drains itself;
// a gunwale caps the sheer; the transom is a plate of its own, cut down to the outboards' mounting height, with a
// self-draining motor well behind a bulkhead, or left whole with the motors on a bracket or a small platform set back
// aft of it. The outer body is unchanged, so the boat floats exactly as the closed hull does while the sole and the
// transom's cut-out stay above the water.

import { combine, ALUMINIUM, type Weight } from "./loads.ts";
import { bodyMesh, meshArea, type Mesh } from "./mesh.ts";
import type { Vec3 } from "./parts.ts";
import { bodyRange, halfAt, sheerAt } from "./sections.ts";
import { innerBody } from "./skin.ts";
import { axes, hullMiddle, type Attitude, type Load } from "./stability.ts";
import type { Hull, HullBody, SectionPoint } from "./types.ts";

/** Outboard shaft lengths: the mounting height above the bottom of the boat they suit (m). */
export const SHAFT = { short: 0.381, long: 0.508, xl: 0.635, xxl: 0.762 } as const;

export interface OpenHullSpec {
  /** Plate thickness (m): 0.005 is 5 mm alloy. */
  plating: number;
  /** Height of the sole above the waterline (m): above it, the boat drains itself through the transom. */
  sole: number;
  /** Where the sole stops forward (m from the stern): by default where the hull narrows to 0.6 m inside. */
  soleTo?: number;
  /** Width of the gunwale capping along the sheer (m). */
  gunwale?: number;
  transom: {
    /** Mounting height above the bottom of the boat at the transom (m): the shaft length the motors need (SHAFT). */
    height: number;
    /** Width the motors take across the transom (m): the cut-out, or the bracket or platform. */
    width: number;
    /** A self-draining motor well: its bulkhead this far forward of the transom (m). */
    well?: number;
    /**
     * Motors set back aft of a whole transom (m): on a bracket (open frame, no buoyancy), or on a platform, a pod
     * that extends the hull aft with a deck on top and floats like the hull does.
     */
    setback?: { length: number; kind: "bracket" | "platform" };
  };
}

export interface Piece {
  name: string;
  mesh: Mesh;
}

export interface OpenHull {
  /** The outer body and the inside of its plating; a platform's pod floats with the body (`hull`). */
  body: HullBody;
  pod: HullBody | null;
  inner: HullBody;
  spec: OpenHullSpec;
  /** The bottom of the boat at the transom: its lowest point there (m). */
  keel: number;
  /** The motors' mounting height in the hull's frame (m): the top of the transom's cut-out, or of the bracket. */
  mount: number;
  /** The motors' mounting face (m along the length): the transom, or the aft end of the setback. */
  mountX: number;
  sole: { y: number; from: number; to: number };
  wellFloor: number | null;
  /** The plates: the skin, the transom, the sole, the gunwale, the well and the setback. */
  pieces: Piece[];
}

const strips = (rows: Vec3[][]): Mesh => {
  // rows of points, each row the same length: quads between neighbouring rows
  const positions: number[] = [];
  const indices: number[] = [];
  const n = rows[0]?.length ?? 0;
  for (const row of rows) for (const p of row) positions.push(...p);
  for (let r = 0; r < rows.length - 1; r++)
    for (let i = 0; i < n - 1; i++) {
      const a = r * n + i;
      indices.push(a, a + n, a + n + 1, a, a + n + 1, a + 1);
    }
  return { positions, indices };
};

const span = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/** The lowest height on a section where its half-breadth reaches h (walking up from the bottom). */
function heightAt(points: readonly SectionPoint[], h: number): number {
  if (h <= points[0][1]) return points[0][0];
  for (let i = 1; i < points.length; i++) {
    const [ya, ha] = points[i - 1];
    const [yb, hb] = points[i];
    if (hb >= h) return hb > ha ? ya + ((yb - ya) * (h - ha)) / (hb - ha) : yb;
  }
  return points[points.length - 1][0];
}

/** The inside half-breadth at x and y, or 0 outside the hull. */
const inside = (inner: HullBody, x: number, y: number) => Math.max(0, halfAt(inner, x, y) ?? 0);

/** A level plate inside the hull at height y from x0 to x1, out to the plating each side. */
function levelPlate(inner: HullBody, y: number, x0: number, x1: number): Mesh {
  const xs = span(x0, x1, 40);
  return strips(span(-1, 1, 1).map((s) => xs.map((x): Vec3 => [x, y, s * inside(inner, x, y)])));
}

/** A transverse plate inside the hull at x, from y0 up to y1, out to the plating each side. */
function bulkhead(inner: HullBody, x: number, y0: number, y1: number): Mesh {
  const ys = span(y0, y1, 16);
  return strips(span(-1, 1, 1).map((s) => ys.map((y): Vec3 => [x, y, s * inside(inner, x, y)])));
}

/** A flat rectangle from its four corners. */
const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3): Mesh => strips([[a, b], [d, c]]);

/** The open boat on a hull body. */
export function openHull(body: HullBody, spec: OpenHullSpec): OpenHull {
  const t = spec.plating;
  const inner = innerBody(body, t);
  const [x0, x1] = bodyRange(body);
  const stern = body.sections[0].points;
  const keel = stern[0][0];
  const sheer = stern[stern.length - 1][0];
  const half = stern[stern.length - 1][1];
  const { height, width, well, setback } = spec.transom;
  const mount = keel + height;
  if (mount >= sheer) throw new Error("the mounting height is above the transom");
  const cut = setback ? null : mount;
  const pieces: Piece[] = [];
  pieces.push({ name: "skin", mesh: bodyMesh(body, 32, true, false) });

  // the transom: strips across it from the bottom up to the top, which drops to the cut-out between the motors
  const zs = [...new Set([...span(-half, half, 48), -width / 2, width / 2].map((z) => Math.round(z * 1e9) / 1e9))].sort((a, b) => a - b);
  const plate: Vec3[][] = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const [za, zb] = [zs[i], zs[i + 1]];
    const top = cut !== null && Math.abs((za + zb) / 2) < width / 2 ? cut : sheer;
    const low = (z: number) => Math.min(top, heightAt(stern, Math.abs(z)));
    plate.push([[x0, low(za), za], [x0, top, za]], [[x0, low(zb), zb], [x0, top, zb]]);
  }
  const transom: Mesh = { positions: [], indices: [] };
  for (let i = 0; i < plate.length; i += 2) {
    const m = strips([plate[i], plate[i + 1]]);
    const base = transom.positions.length / 3;
    transom.positions.push(...m.positions);
    transom.indices.push(...m.indices.map((k) => k + base));
  }
  pieces.push({ name: "transom", mesh: transom });

  // the sole, from the well's bulkhead (or the transom) forward to where the hull narrows
  const soleY = spec.sole;
  const from = well ?? x0 + t;
  let to = spec.soleTo ?? x0;
  if (spec.soleTo === undefined) for (let x = from; x < x1; x += 0.02) if (inside(inner, x, soleY) >= 0.3) to = x;
  if (to <= from) throw new Error("the sole has no room: it is above the hull or the hull too narrow");
  pieces.push({ name: "sole", mesh: levelPlate(inner, soleY, from, to) });

  // the self-draining well: its floor halfway between the sole and the cut-out, its bulkhead full height
  let wellFloor: number | null = null;
  if (well) {
    wellFloor = soleY + 0.5 * (mount - soleY);
    pieces.push({ name: "well floor", mesh: levelPlate(inner, wellFloor, x0 + t, well) });
    pieces.push({ name: "well bulkhead", mesh: bulkhead(inner, well, soleY, (sheerAt(inner, well) ?? sheer) - 0.02) });
  }

  // the gunwale: a flat capping along the sheer, out from the plating
  const g = spec.gunwale ?? 0.12;
  const capped = body.sections.filter((s) => s.points[s.points.length - 1][1] > g);
  for (const side of [-1, 1])
    pieces.push({
      name: side < 0 ? "gunwale (port)" : "gunwale (starboard)",
      mesh: strips(
        [0, 1].map((k) =>
          capped.map((s): Vec3 => {
            const [y, h] = s.points[s.points.length - 1];
            return [s.x, y, side * (h - k * g)];
          }),
        ),
      ),
    });

  // a setback: two side plates and a top; a platform is the transom's width, a bracket the motors'
  let mountX = x0;
  let pod: HullBody | null = null;
  if (setback) {
    const L = setback.length;
    const w = setback.kind === "platform" ? 0.9 * half : width / 2;
    const top = setback.kind === "platform" ? Math.min(sheer, mount + 0.1) : mount;
    const low = mount - 0.45;
    mountX = x0 - L;
    pieces.push({ name: `${setback.kind} top`, mesh: quad([x0 - L, top, -w], [x0, top, -w], [x0, top, w], [x0 - L, top, w]) });
    for (const z of [-w, w]) pieces.push({ name: `${setback.kind} side`, mesh: quad([x0 - L, low, z], [x0, low, z], [x0, top, z], [x0 - L, top, z]) });
    pieces.push({ name: `${setback.kind} face`, mesh: quad([x0 - L, low, -w], [x0 - L, low, w], [x0 - L, top, w], [x0 - L, top, -w]) });
    if (setback.kind === "platform") {
      // the pod's bottom closes it underneath, a little above the hull's bottom so it lifts clear when running
      const bottom = keel + 0.15;
      pieces.push({ name: "platform bottom", mesh: quad([x0 - L, bottom, w], [x0, bottom, w], [x0, bottom, -w], [x0 - L, bottom, -w]) });
      for (const z of [-w, w]) pieces.push({ name: "platform side", mesh: quad([x0 - L, bottom, z], [x0, bottom, z], [x0, low, z], [x0 - L, low, z]) });
      pieces.push({ name: "platform face", mesh: quad([x0 - L, bottom, -w], [x0 - L, bottom, w], [x0 - L, low, w], [x0 - L, low, -w]) });
      const box = (x: number) => ({ x, points: [[bottom, w], [top, w]] as SectionPoint[] });
      pod = { center: 0, sections: [box(x0 - L), box(x0)] };
    }
  }

  return { body, pod, inner, spec, keel, mount, mountX, sole: { y: soleY, from, to }, wellFloor, pieces };
}

/** What floats: the hull body, and a platform's pod with it. */
export function openBodies(open: OpenHull): Hull {
  return { bodies: open.pod ? [open.body, open.pod] : [open.body] };
}

/** The plates as weights: each one's area, times the plating's thickness and the metal's density. */
export function shellWeights(open: OpenHull, density = ALUMINIUM): Weight[] {
  return open.pieces.map((p) => {
    const { area, centroid } = meshArea(p.mesh);
    return { name: p.name, mass: area * open.spec.plating * density * 1000, at: centroid };
  });
}

export interface Mount {
  name: string;
  at: Vec3;
}

/** Where outboards clamp on: `count` of them across the mounting face, `spacing` apart (0.66 m = 26 in centres). */
export function outboardMounts(open: OpenHull, count: number, spacing = 0.66): Mount[] {
  if (count < 1) return [];
  if ((count - 1) * spacing > open.spec.transom.width) throw new Error("the motors do not fit the mounting width");
  return Array.from({ length: count }, (_, i) => ({
    name: count === 1 ? "outboard" : `outboard ${i + 1}`,
    at: [open.mountX, open.mount, (i - (count - 1) / 2) * spacing] as Vec3,
  }));
}

/** How far a point in the hull's frame is above the water when the boat floats at this attitude (m). */
export function aboveWater(hull: Hull, attitude: Attitude, p: Vec3): number {
  const { up } = axes(attitude.heel, attitude.trim);
  const o: Vec3 = [hullMiddle(hull), attitude.level, 0];
  return (p[0] - o[0]) * up[0] + (p[1] - o[1]) * up[1] + (p[2] - o[2]) * up[2];
}

/**
 * Whether the boat drains itself, floating this way: the lowest corner of the sole and of the well floor above the
 * water, and the top of the cut-out above it too (else the sea comes in over the transom). The margins are in metres.
 */
export function drains(open: OpenHull, attitude: Attitude): { sole: number; well: number | null; transom: number; ok: boolean } {
  const hull = openBodies(open);
  const lowest = (y: number, x: number) => {
    const h = inside(open.inner, x, y);
    return Math.min(aboveWater(hull, attitude, [x, y, -h]), aboveWater(hull, attitude, [x, y, h]));
  };
  const sole = Math.min(lowest(open.sole.y, open.sole.from), lowest(open.sole.y, open.sole.to));
  const x0 = open.body.sections[0].x;
  const well = open.wellFloor === null ? null : lowest(open.wellFloor, x0 + open.spec.plating);
  const w = open.spec.transom.width / 2;
  const transom = Math.min(aboveWater(hull, attitude, [x0, open.mount, -w]), aboveWater(hull, attitude, [x0, open.mount, w]));
  return { sole, well, transom, ok: sole > 0 && (well === null || well > 0) && transom > 0 };
}

/** The boat's load: its plating plus the weights it carries. */
export function asFitted(open: OpenHull, carried: readonly Weight[] = [], density = ALUMINIUM): Load {
  return combine([...shellWeights(open, density), ...carried]);
}
