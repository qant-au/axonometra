import { describe, expect, it } from 'vitest';
import {
  GRID_MINOR_MIN_PX,
  GRID_MINOR_MIN_ZOOM,
  GRID_MINOR_STEP,
  gridLines,
  toPixelCentre
} from '../grid';

// Re-sweep 2 2026-09-30: at the zoom that fits a 42 m row of items, the
// grid's 10 cm lines ran together into dense bands. Zoomed that far out,
// only the metre lines are drawn.
describe('gridLines', () => {
  const world = { x: -2500, y: -2500, width: 10000, height: 10000 };

  it('gives each metre line across the part of the plan on screen', () => {
    const { xs, ys } = gridLines(
      { x: 150, y: -40, width: 300, height: 200 },
      world
    );
    expect(xs).toEqual([200, 300, 400]);
    expect(ys).toEqual([0, 100]);
  });

  it('stops where the grid does', () => {
    const { xs, ys } = gridLines(
      { x: -3000, y: 7250, width: 700, height: 500 },
      world
    );
    expect(xs).toEqual([-2500, -2400, -2300]);
    expect(ys).toEqual([7300, 7400, 7500]);
  });
});

// Re-sweep 3 2026-09-30: at 0.51x the 10 cm lines were 5 px apart with
// uneven 5/11/16 px gaps: the pattern texture, drawn small, drops lines.
describe('the zoomed-out grid', () => {
  it('drops the 10 cm lines before they come under 8 px apart', () => {
    expect(GRID_MINOR_MIN_PX).toBe(8);
    expect(GRID_MINOR_STEP * GRID_MINOR_MIN_ZOOM).toBe(GRID_MINOR_MIN_PX);
  });

  it('gives the 10 cm lines as well, at their step', () => {
    const { xs } = gridLines(
      { x: 75, y: 0, width: 40, height: 10 },
      { x: -2500, y: -2500, width: 10000, height: 10000 },
      GRID_MINOR_STEP
    );
    expect(xs).toEqual([80, 90, 100, 110]);
  });

  it('puts every line in the middle of a screen pixel, evenly', () => {
    // 0.83x: the 10 cm lines 8.3 px apart, from a view that starts mid-pixel.
    const zoom = 0.83;
    const origin = -3.7;
    const px = [0, 10, 20, 30, 40, 50, 60].map(
      (v) => (toPixelCentre(v, origin, zoom) - origin) * zoom
    );
    for (const p of px) expect(p % 1).toBeCloseTo(0.5, 6);
    const gaps = px.slice(1).map((p, i) => Math.round(p - px[i]));
    for (const gap of gaps) expect([8, 9]).toContain(gap);
  });

  it('keeps a line on a pixel edge in that pixel', () => {
    expect(toPixelCentre(10, 0, 0.8)).toBeCloseTo(8.5 / 0.8, 9);
  });
});
