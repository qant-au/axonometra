import { describe, expect, it } from 'vitest';
import { Point } from 'pixi.js';
import { getCorrespondingY } from '../Slope';

const p = (x: number, y: number) => new Point(x, y);

describe('getCorrespondingY', () => {
  it('returns a.y when x equals a.x', () => {
    expect(getCorrespondingY(2, p(2, 7), p(8, 1))).toBe(7);
  });

  it('returns b.y when x equals b.x', () => {
    expect(getCorrespondingY(8, p(2, 7), p(8, 1))).toBe(1);
  });

  it('linearly interpolates along the line through a and b', () => {
    // line y = x, point (5, 5)
    expect(getCorrespondingY(5, p(0, 0), p(10, 10))).toBe(5);
    // line y = 2x, point (3, 6)
    expect(getCorrespondingY(3, p(0, 0), p(5, 10))).toBe(6);
  });

  it('handles negative slopes', () => {
    expect(getCorrespondingY(5, p(0, 10), p(10, 0))).toBe(5);
  });

  it('extrapolates outside the [a.x, b.x] range', () => {
    expect(getCorrespondingY(20, p(0, 0), p(10, 10))).toBe(20);
    expect(getCorrespondingY(-5, p(0, 0), p(10, 10))).toBe(-5);
  });
});
