import { METER } from './constants';

/** The grid's minor lines are 10 cm apart, in plan units. */
export const GRID_MINOR_STEP = 10;
/**
 * Closer than this on screen, in pixels, the minor lines run together into
 * dense bands, so only the metre lines are drawn.
 */
export const GRID_MINOR_MIN_PX = 8;
/** Below this zoom the minor lines would be under GRID_MINOR_MIN_PX apart. */
export const GRID_MINOR_MIN_ZOOM = GRID_MINOR_MIN_PX / GRID_MINOR_STEP;
/**
 * Below this zoom the grid pattern's texture is drawn smaller than it is,
 * and drops some of its thin lines, leaving uneven gaps; the lines are drawn
 * one by one instead.
 */
export const GRID_PATTERN_MIN_ZOOM = 1;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The grid lines `step` apart to draw over `view`, the part of the plan on
 * screen, kept inside `bounds`, where the grid is: their x and y in plan
 * units.
 */
export function gridLines(
  view: Rect,
  bounds: Rect,
  step = METER
): { xs: number[]; ys: number[] } {
  const along = (from: number, to: number, min: number, max: number) => {
    const lines: number[] = [];
    const start = Math.ceil(Math.max(from, min) / step) * step;
    const end = Math.min(to, max);
    for (let v = start; v <= end; v += step) lines.push(v + 0); // not -0
    return lines;
  };
  return {
    xs: along(view.x, view.x + view.width, bounds.x, bounds.x + bounds.width),
    ys: along(view.y, view.y + view.height, bounds.y, bounds.y + bounds.height)
  };
}

/**
 * `v`, in plan units, moved to the middle of the screen pixel it falls in,
 * where `origin` is the plan coordinate at the screen's edge: a line a pixel
 * wide drawn there is crisp, not smeared over two.
 */
export function toPixelCentre(v: number, origin: number, zoom: number) {
  // A hair over, so a line on a pixel's edge does not fall back a pixel on
  // a rounding error.
  return origin + (Math.floor((v - origin) * zoom + 1e-6) + 0.5) / zoom;
}
