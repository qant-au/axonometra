// The 3D model of an element for consumers that build meshes (Axonometra's 3D
// view): its solids at real size in cm, each with its fill colour resolved, so
// a consumer needs neither the palette nor the renderers. Surface decals are
// left out; they are marks on a face, not geometry. Solids are as installed: an
// element facing down has them mirrored inside its height, and a dome that
// narrows downwards says so with `down: true`.
import { fillFor } from '../palette.mjs';
import { installedParts } from './geometry.mjs';

const r2 = (n) => Math.round(n * 100) / 100;

export function modelOf(el) {
  return installedParts(el).map((p) => {
    const z = r2(p.z ?? 0);
    const h = r2(p.h);
    const colour = fillFor(p.role ?? 'body');
    if (p.cyl) {
      const [cx, cy, rx, ry] = p.cyl;
      return { cyl: [cx, cy, rx, ry ?? rx].map(r2), z, h, colour };
    }
    if (p.dome)
      return {
        dome: p.dome.map(r2),
        z,
        h,
        ...(p.flipped ? { down: true } : {}),
        colour
      };
    if (p.poly)
      return { poly: p.poly.map(([x, y]) => [r2(x), r2(y)]), z, h, colour };
    return { box: [p.x, p.y, p.w, p.d].map(r2), z, h, colour };
  });
}
