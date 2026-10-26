// The hull's inner skin: the hull with its plating's thickness taken off, so decks, tanks and rooms are fitted to the
// inside of the hull rather than its outside. Each section's port and starboard curves are offset inward along
// their normals in the section's plane, and both ends come in by the thickness. Along the length the offset is in
// the section's plane only, so where the hull narrows steeply (a fine bow) the skin there is a little thinner than
// given; for plating and planking, a few centimetres on a hull metres long, that difference is negligible.

import { bodyRange, sectionAt } from "./sections.ts";
import type { HullBody, Section, SectionPoint } from "./types.ts";

/** One side's curve, (half-breadth, height) from the bottom up, offset inward by t; null when nothing is left. */
function offsetSide(curve: [number, number][], t: number): [number, number][] | null {
  // a flat bottom: the curve starts at the centre line, so the bottom is offset upward too
  const c: [number, number][] = curve[0][0] > 1e-9 ? [[0, curve[0][1]], ...curve] : [...curve];
  const n = c.length;
  const normals: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    // the outward normal (towards larger half-breadth and down) of the segments either side, averaged
    const seg = (a: number, b: number): [number, number] => {
      const dh = c[b][0] - c[a][0];
      const dy = c[b][1] - c[a][1];
      const l = Math.hypot(dh, dy) || 1;
      return [dy / l, -dh / l];
    };
    const before = i > 0 ? seg(i - 1, i) : null;
    const after = i < n - 1 ? seg(i, i + 1) : null;
    let nh = (before?.[0] ?? 0) + (after?.[0] ?? 0);
    let ny = (before?.[1] ?? 0) + (after?.[1] ?? 0);
    const l = Math.hypot(nh, ny) || 1;
    nh /= l;
    ny /= l;
    // at a corner the offset point moves further, so both faces stay the thickness away (a mitre)
    const cos = before && after ? Math.max(0.3, before[0] * nh + before[1] * ny) : 1;
    normals.push([nh / cos, ny / cos]);
  }
  const inner: [number, number][] = c.map(([h, y], i) => [h - t * normals[i][0], y - t * normals[i][1]]);
  // the top stays at the sheer: the inner skin runs up to the deck
  inner[n - 1][1] = c[n - 1][1];
  // keep it a curve from the bottom up: drop points a concave corner has folded back below their neighbours
  const rising: [number, number][] = [];
  for (const p of inner) if (!rising.length || p[1] >= rising[rising.length - 1][1]) rising.push(p);
  // cut at the centre line: what crosses it is the bottom
  const out: [number, number][] = [];
  for (let i = 0; i < rising.length; i++) {
    const p = rising[i];
    if (p[0] >= 0) {
      if (!out.length && i > 0 && rising[i - 1][0] < 0) {
        const q = rising[i - 1];
        const f = q[0] / (q[0] - p[0]);
        out.push([0, q[1] + (p[1] - q[1]) * f]);
      }
      out.push(p);
    }
  }
  return out.length >= 2 ? out : null;
}

/** The hull body with its plating's thickness (m) taken off: the inside of the hull. */
export function innerBody(body: HullBody, thickness: number): HullBody {
  const t = thickness;
  const [x0, x1] = bodyRange(body);
  const xs = [x0 + t, ...body.sections.map((s) => s.x).filter((x) => x > x0 + t && x < x1 - t), x1 - t];
  const sections: Section[] = [];
  for (const x of xs) {
    const s = sectionAt(body, x);
    if (!s) continue;
    const port = offsetSide(s.points.map(([y, h]) => [h, y]), t);
    const sym = s.points.every((p) => p[2] === undefined);
    const starboard = sym ? port : offsetSide(s.points.map(([y, h, o]) => [o ?? h, y]), t);
    if (!port || !starboard) continue;
    if (sym) {
      sections.push({ x, points: port.map(([h, y]): SectionPoint => [y, Math.max(0, h)]) });
      continue;
    }
    // both sides on the same heights: every height either side has a point at. Where a side has two points at one
    // height (a flat bottom's edge), the first and the last are both kept
    const atY = (curve: [number, number][], y: number, last: boolean): number => {
      if (y < curve[0][1]) return curve[0][0];
      let found = -1;
      for (let i = 0; i < curve.length; i++) {
        if (Math.abs(curve[i][1] - y) < 1e-12) {
          found = i;
          if (!last) break;
        }
      }
      if (found >= 0) return curve[found][0];
      for (let i = 1; i < curve.length; i++) {
        if (y < curve[i][1]) {
          const f = (y - curve[i - 1][1]) / Math.max(1e-12, curve[i][1] - curve[i - 1][1]);
          return curve[i - 1][0] + (curve[i][0] - curve[i - 1][0]) * f;
        }
      }
      return curve[curve.length - 1][0];
    };
    const ys = [...new Set([...port, ...starboard].map(([, y]) => y))].sort((a, b) => a - b).filter((y) => y >= Math.max(port[0][1], starboard[0][1]));
    const points: SectionPoint[] = ys.flatMap((y): SectionPoint[] => {
      const first: SectionPoint = [y, Math.max(0, atY(port, y, false)), Math.max(0, atY(starboard, y, false))];
      const last: SectionPoint = [y, Math.max(0, atY(port, y, true)), Math.max(0, atY(starboard, y, true))];
      return first[1] === last[1] && first[2] === last[2] ? [first] : [first, last];
    });
    if (points.length >= 2) sections.push({ x, points });
  }
  return { center: body.center, sections };
}
