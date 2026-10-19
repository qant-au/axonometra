// Top-down plan view (Axonometra). True scale: the viewBox is the footprint in
// cm, and the SVG's pixel size is 2 px per cm so Pixi rasterises it sharply.
import {
  DETAIL,
  OUTLINE,
  SYMBOL_SIZE,
  fillFor,
  planStrokes
} from '../palette.mjs';
import { bounds, ellipsePts, f, pts } from './geometry.mjs';

// A decal with `view: 'plan'` is drawn on the plan only; one without, everywhere.
const forPlan = (dc) => dc.view === undefined || dc.view === 'plan';

// A decal in face-local cm, offset to the part's top-left corner.
function decal(dc, ox, oy, sw) {
  const colour = dc.accent
    ? fillFor(dc.accent)
    : dc.stroke
      ? fillFor(dc.stroke)
      : DETAIL;
  const fill = dc.fill ? fillFor(dc.fill) : dc.accent ? colour : 'none';
  const stroke = dc.accent && !dc.stroke ? 'none' : colour;
  const width = dc.weight === 'outline' ? sw * 2 : sw;
  const dash = dc.dash ? ` stroke-dasharray="${dc.dash}"` : '';
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${f(width)}"${dash}`;
  const shift = (a) => a.map(([u, v]) => [ox + u, oy + v]);
  if (dc.line) {
    const tag = dc.closed ? 'polygon' : 'polyline';
    const lineFill = dc.closed ? fill : 'none';
    return `<${tag} points="${pts(shift(dc.line))}" fill="${lineFill}" stroke="${colour}" stroke-width="${f(width)}"${dash}/>`;
  }
  if (dc.rect) {
    const [u, v, w, h] = dc.rect;
    return `<rect x="${f(ox + u)}" y="${f(oy + v)}" width="${f(w)}" height="${f(h)}" rx="${dc.r ?? 0}" ${paint}/>`;
  }
  if (dc.circle) {
    const [u, v, r] = dc.circle;
    return `<circle cx="${f(ox + u)}" cy="${f(oy + v)}" r="${f(r)}" ${paint}/>`;
  }
  if (dc.ellipse) {
    const [u, v, rx, ry] = dc.ellipse;
    return `<ellipse cx="${f(ox + u)}" cy="${f(oy + v)}" rx="${f(rx)}" ry="${f(ry)}" ${paint}/>`;
  }
  if (dc.arc) {
    // [cx, cy, r, fromDeg, toDeg]: a circular arc, e.g. a door swing.
    const [cx, cy, r, a0, a1] = dc.arc;
    const a = ellipsePts(
      ox + cx,
      oy + cy,
      r,
      r,
      24,
      (a0 * Math.PI) / 180,
      (a1 * Math.PI) / 180
    );
    return `<polyline points="${pts(a)}" fill="none" stroke="${colour}" stroke-width="${f(width)}"${dash}/>`;
  }
  throw new Error(`unknown decal ${JSON.stringify(dc)}`);
}

function partShape(p, fill, stroke, sw, inset) {
  const dash = p.dash ? ` stroke-dasharray="${p.dash}"` : '';
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="${f(sw)}"${dash}`;
  const round = p.cyl ?? p.dome;
  if (round) {
    const [cx, cy, rx, ry] = round;
    return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx - inset)}" ry="${f((ry ?? rx) - inset)}" ${paint}/>`;
  }
  if (p.poly) return `<polygon points="${pts(p.poly)}" ${paint}/>`;
  return `<rect x="${f(p.x + inset)}" y="${f(p.y + inset)}" width="${f(p.w - 2 * inset)}" height="${f(p.d - 2 * inset)}" rx="${p.r ?? 0}" ${paint}/>`;
}

/** Plan footprint in cm: a symbol's fixed square, or the element's own size. */
export function footprint(el) {
  return el.symbol
    ? { w: SYMBOL_SIZE, d: SYMBOL_SIZE }
    : { w: el.size.w, d: el.size.d };
}

function svg(w, d, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${d}" width="${w * 2}" height="${d * 2}" preserveAspectRatio="none" stroke-linejoin="round" stroke-linecap="round">\n  ${body.join('\n  ')}\n</svg>\n`;
}

// Ceiling and wall devices: a 40 cm frame with a pictogram, so they read on a
// plan at any zoom. Pictogram coordinates are in the 40 × 40 symbol box.
export function symbolBody(el, { reflected = false } = {}) {
  const { frame = 'circle', glyph = [] } = el.symbol;
  const dash = reflected ? ' stroke-dasharray="4 3"' : '';
  const edge =
    frame === 'circle'
      ? `<circle cx="20" cy="20" r="19.5" fill="${fillFor('body')}" stroke="${OUTLINE}" stroke-width="1"${dash}/>`
      : `<rect x="0.5" y="0.5" width="39" height="39" rx="6" fill="${fillFor('body')}" stroke="${OUTLINE}" stroke-width="1"${dash}/>`;
  const marks = glyph
    .filter(forPlan)
    .map((dc) =>
      decal(
        { stroke: dc.accent || dc.fill ? undefined : 'outline', ...dc },
        0,
        0,
        1.5
      )
    );
  return [edge, ...marks];
}

function symbolSvg(el, opts) {
  return svg(SYMBOL_SIZE, SYMBOL_SIZE, symbolBody(el, opts));
}

/**
 * The top-down drawing of a modelled element, with strokes [outline, detail].
 * Parts are drawn as authored even when the element faces down: a ceiling item
 * on a plan is read as a reflected ceiling plan, looking up at its face, which
 * is the authored top seen from above. `reflected` dashes the heavy outline,
 * the reflected-ceiling-plan convention.
 */
export function planBody(el, [so, sd], { reflected = false } = {}) {
  // Lower parts first, so what is on top is drawn over what is beneath.
  const parts = el.parts
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.z ?? 0) + a.p.h - ((b.p.z ?? 0) + b.p.h) || a.i - b.i)
    .map(({ p }) => p);
  const body = [];
  for (const p of parts) {
    // The first part takes the heavy outline unless it opts out (outline: false).
    const heavy = p.outline ?? p === el.parts[0];
    const inset = p === el.parts[0] && !p.poly && !p.noInset ? so / 2 : 0;
    const dashed =
      reflected && heavy ? { ...p, dash: p.dash ?? `${f(so * 3)} ${f(so * 2)}` } : p;
    body.push(
      partShape(
        dashed,
        fillFor(p.role ?? 'body'),
        heavy ? OUTLINE : DETAIL,
        heavy ? so : sd,
        inset
      )
    );
    const b = bounds(p);
    for (const dc of (p.top ?? []).filter(forPlan))
      body.push(decal(dc, b.x, b.y, sd));
  }
  for (const dc of (el.plan ?? []).filter(forPlan))
    body.push(decal(dc, 0, 0, sd));
  return body;
}

/** The plan SVG; a ceiling-referenced element is drawn reflected (dashed) unless told otherwise. */
export function planSvg(el, { reflected = el.mountFrom === 'ceiling' } = {}) {
  if (el.symbol) return symbolSvg(el, { reflected });
  const { w, d } = el.size;
  return svg(w, d, planBody(el, planStrokes(w, d), { reflected }));
}
