import { describe, expect, it } from 'vitest';
import { metreLines } from '../grid';

// Re-sweep 2 2026-09-30: at the zoom that fits a 42 m row of items, the
// grid's 10 cm lines ran together into dense bands. Zoomed that far out,
// only the metre lines are drawn.
describe('metreLines', () => {
  const world = { x: -2500, y: -2500, width: 10000, height: 10000 };

  it('gives each metre line across the part of the plan on screen', () => {
    const { xs, ys } = metreLines(
      { x: 150, y: -40, width: 300, height: 200 },
      world
    );
    expect(xs).toEqual([200, 300, 400]);
    expect(ys).toEqual([0, 100]);
  });

  it('stops where the grid does', () => {
    const { xs, ys } = metreLines(
      { x: -3000, y: 7250, width: 700, height: 500 },
      world
    );
    expect(xs).toEqual([-2500, -2400, -2300]);
    expect(ys).toEqual([7300, 7400, 7500]);
  });
});
