// Foliage shapes for plans: irregular, leafy outlines instead of circles and
// stars. Every shape is seeded, so a build always draws the same tree.

const r1 = (n) => Math.round(n * 10) / 10;

/** A small deterministic random source (mulberry32): the same seed, the same numbers. */
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A leafy canopy outline round (cx, cy), inside radius r: `lobes` rounded bumps
 * of uneven width and height, so it reads as foliage, not a cog. Points run
 * clockwise on the plan (y down).
 */
export function cloud(cx, cy, r, { lobes = 9, jitter = 0.18, depth = 0.16, seed = 1, steps = 5 } = {}) {
  const rand = random(seed);
  const widths = Array.from({ length: lobes }, () => 0.6 + rand() * 0.8);
  const total = widths.reduce((a, b) => a + b, 0);
  const start = rand() * Math.PI * 2;
  const pts = [];
  let a = start;
  for (const wi of widths) {
    const span = (wi / total) * Math.PI * 2;
    const lobeR = r * (1 - jitter * rand());
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const rad = lobeR * (1 - depth + depth * Math.sin(Math.PI * t) ** 0.6);
      pts.push([r1(cx + rad * Math.cos(a + t * span)), r1(cy + rad * Math.sin(a + t * span))]);
    }
    a += span;
  }
  return pts;
}

/**
 * Points along a leaf's spine from its base (x, y): `len` long, leaving at
 * `deg` (0 = +x, 90 = towards the front) and turning `bend` degrees by the tip.
 * Each point carries its angle, so a width can be laid off square to it.
 */
export function spine(x, y, len, deg, bend = 0, n = 6) {
  const pts = [{ x, y, a: (deg * Math.PI) / 180 }];
  for (let i = 1; i <= n; i++) {
    const a = ((deg + (bend * (i - 0.5)) / n) * Math.PI) / 180;
    const p = pts[i - 1];
    pts.push({ x: p.x + (Math.cos(a) * len) / n, y: p.y + (Math.sin(a) * len) / n, a: ((deg + (bend * i) / n) * Math.PI) / 180 });
  }
  return pts;
}

/** A pointed leaf along `spine(...)`, `wid` at its widest: a closed outline. */
export function leaf(x, y, len, wid, deg, n = 5, bend = 0) {
  const sp = spine(x, y, len, deg, bend, n);
  const side = (k) =>
    sp.map(({ x: px, y: py, a }, i) => {
      const half = (wid / 2) * Math.sin((Math.PI * i) / n) ** 0.8 * k;
      return [r1(px - Math.sin(a) * half), r1(py + Math.cos(a) * half)];
    });
  return [...side(1), ...side(-1).slice(1, -1).reverse()];
}

/** The midrib of `leaf(...)`, from the base to 85% of the way to the tip. */
export function midrib(x, y, len, deg, bend = 0) {
  return spine(x, y, len * 0.85, deg, bend * 0.85, 3).map((p) => [r1(p.x), r1(p.y)]);
}
