import { METER } from './constants';

/**
 * Below this zoom the grid's 10 cm lines fall under 5 px apart and run
 * together into dense bands, so only the metre lines are drawn.
 */
export const GRID_MINOR_MIN_ZOOM = 0.5;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The metre lines to draw over `view`, the part of the plan on screen,
 * kept inside `bounds`, where the grid is: their x and y in plan units.
 */
export function metreLines(
  view: Rect,
  bounds: Rect
): { xs: number[]; ys: number[] } {
  const along = (from: number, to: number, min: number, max: number) => {
    const lines: number[] = [];
    const start = Math.ceil(Math.max(from, min) / METER) * METER;
    const end = Math.min(to, max);
    for (let v = start; v <= end; v += METER) lines.push(v + 0); // not -0
    return lines;
  };
  return {
    xs: along(view.x, view.x + view.width, bounds.x, bounds.x + bounds.width),
    ys: along(view.y, view.y + view.height, bounds.y, bounds.y + bounds.height)
  };
}
