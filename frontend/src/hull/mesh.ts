// Hulls and their parts as triangle meshes for a 3D view: plain arrays of positions and indices in the hull's frame
// (x forward, y up, z to starboard), so any renderer can take them. A body's mesh is closed: both sides of the skin,
// the deck across the sheer, and the ends (a transom, a stem section, a bulb's tip) capped.

import type { PartGeometry, Vec3 } from "./parts.ts";
import type { Tube } from "./tube.ts";
import type { HullBody, Section } from "./types.ts";

export interface Mesh {
  positions: number[];
  indices: number[];
}

/**
 * A section's half-breadths, port and starboard, at n heights spaced by the same shares of its depth on every
 * section, so that the rings of neighbouring sections join point to point (as the section queries interpolate).
 */
function resample(s: Section, n: number): { y: number[]; port: number[]; starboard: number[] } {
  const p = s.points;
  const y0 = p[0][0];
  const y1 = p[p.length - 1][0];
  const y: number[] = [];
  const port: number[] = [];
  const starboard: number[] = [];
  for (let k = 0; k < n; k++) {
    const h = y0 + ((y1 - y0) * k) / (n - 1);
    let i = 1;
    while (i < p.length - 1 && p[i][0] < h) i++;
    const [ya, pa, sa] = p[i - 1];
    const [yb, pb, sb] = p[i];
    // at the very bottom, the bottom point itself (a flat bottom starts there at its full breadth)
    const f = k === 0 ? 0 : yb > ya ? Math.min(1, Math.max(0, (h - ya) / (yb - ya))) : 1;
    y.push(h);
    port.push(pa + (pb - pa) * f);
    starboard.push((sa ?? pa) + ((sb ?? pb) - (sa ?? pa)) * f);
  }
  return { y, port, starboard };
}

/**
 * The body as a mesh: each section a ring (up the starboard side, across the deck, down the port side). Closed
 * unless `open` leaves the deck off, to look into it (an inner skin).
 */
export function bodyMesh(body: HullBody, levels = 32, open = false): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const rings: Vec3[][] = [];
  for (const s of body.sections) {
    const x = s.x;
    const { y, port, starboard } = resample(s, levels);
    const count = y.length;
    const ring: Vec3[] = [];
    for (let i = 0; i < count; i++) ring.push([x, y[i], body.center + starboard[i]]);
    for (let i = count - 1; i >= 0; i--) ring.push([x, y[i], body.center - port[i]]);
    rings.push(ring);
  }
  const m = rings[0].length;
  for (const ring of rings) for (const [x, y, z] of ring) positions.push(x, y, z);
  // the skin: quads between neighbouring rings, round the closed ring (its last point back to its first is the
  // bottom across the centre line: zero wide on a keel, the flat on a flat bottom)
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < m; i++) {
      // the quad from the starboard sheer to the port sheer is the deck
      if (open && i === m / 2 - 1) continue;
      const a = k * m + i;
      const b = k * m + ((i + 1) % m);
      const c = (k + 1) * m + ((i + 1) % m);
      const d = (k + 1) * m + i;
      indices.push(a, d, c, a, c, b);
    }
  }
  // the ends: each end ring capped with a fan from its middle
  const cap = (k: number, flip: boolean) => {
    const ring = rings[k];
    const mid = ring.reduce<Vec3>((s, p) => [s[0] + p[0] / m, s[1] + p[1] / m, s[2] + p[2] / m], [0, 0, 0]);
    const c = positions.length / 3;
    positions.push(...mid);
    for (let i = 0; i < m; i++) {
      const a = k * m + i;
      const b = k * m + ((i + 1) % m);
      if (flip) indices.push(c, b, a);
      else indices.push(c, a, b);
    }
  };
  cap(0, false);
  cap(rings.length - 1, true);
  return { positions, indices };
}

/** A part's rings (a foil's sections, a bulb's stations) lofted into a closed mesh, its two end rings capped. */
export function ringsMesh(g: PartGeometry): Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const rings = g.rings.filter((r) => r.length >= 3);
  if (rings.length < 2) return { positions, indices };
  const m = rings[0].length;
  for (const ring of rings) for (const [x, y, z] of ring) positions.push(x, y, z);
  for (let k = 0; k < rings.length - 1; k++) {
    for (let i = 0; i < m; i++) {
      const a = k * m + i;
      const b = k * m + ((i + 1) % m);
      const c = (k + 1) * m + ((i + 1) % m);
      const d = (k + 1) * m + i;
      indices.push(a, b, c, a, c, d);
    }
  }
  for (const [k, flip] of [[0, true], [rings.length - 1, false]] as [number, boolean][]) {
    const c = positions.length / 3;
    const ring = rings[k];
    positions.push(...ring.reduce<Vec3>((s, p) => [s[0] + p[0] / m, s[1] + p[1] / m, s[2] + p[2] / m], [0, 0, 0]));
    for (let i = 0; i < m; i++) {
      const a = k * m + i;
      const b = k * m + ((i + 1) % m);
      if (flip) indices.push(c, b, a);
      else indices.push(c, a, b);
    }
  }
  // which way round a part's rings run depends on the part: turn the triangles to face outward if they do not
  const mesh = { positions, indices };
  if (meshVolume(mesh) < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  return mesh;
}

/** A RIB's tube swept along its centre line as rings of its radius. */
export function tubeGeometry(t: Tube, points = 16): PartGeometry {
  const rings: Vec3[][] = [];
  const n = t.path.length;
  for (let i = 0; i < n; i++) {
    const a = t.path[Math.max(0, i - 1)];
    const b = t.path[Math.min(n - 1, i + 1)];
    // the direction along the tube, and two directions across it: one level, one from that and the direction
    let d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(...d) || 1;
    d = [d[0] / l, d[1] / l, d[2] / l];
    let u: Vec3 = [-d[2], 0, d[0]];
    const lu = Math.hypot(...u) || 1;
    u = [u[0] / lu, u[1] / lu, u[2] / lu];
    const v: Vec3 = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    const [cx, cy, cz] = t.path[i];
    const r = t.radius[i];
    rings.push(Array.from({ length: points }, (_, k): Vec3 => {
      const ang = (2 * Math.PI * k) / points;
      const c = Math.cos(ang) * r;
      const s = Math.sin(ang) * r;
      return [cx + u[0] * c + v[0] * s, cy + u[1] * c + v[1] * s, cz + u[2] * c + v[2] * s];
    }));
  }
  return { rings };
}

/** The volume a closed mesh encloses (the divergence theorem over its triangles): a check that it is closed and outward. */
export function meshVolume(m: Mesh): number {
  let v = 0;
  const p = m.positions;
  for (let i = 0; i < m.indices.length; i += 3) {
    const [a, b, c] = [m.indices[i] * 3, m.indices[i + 1] * 3, m.indices[i + 2] * 3];
    v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}
