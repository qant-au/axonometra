import { describe, expect, it } from 'vitest';
import { getCorrespondingY } from '../Slope';

describe('getCorrespondingY', () => {
  it('returns a.y when x equals a.x', () => {
    expect(getCorrespondingY(2, { x: 2, y: 7 }, { x: 8, y: 1 })).toBe(7);
  });

  it('returns b.y when x equals b.x', () => {
    expect(getCorrespondingY(8, { x: 2, y: 7 }, { x: 8, y: 1 })).toBe(1);
  });

  it('linearly interpolates along the line through a and b', () => {
    // line y = x, point (5, 5)
    expect(getCorrespondingY(5, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(5);
    // line y = 2x, point (3, 6)
    expect(getCorrespondingY(3, { x: 0, y: 0 }, { x: 5, y: 10 })).toBe(6);
  });

  it('handles negative slopes', () => {
    expect(getCorrespondingY(5, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe(5);
  });

  it('extrapolates outside the [a.x, b.x] range', () => {
    expect(getCorrespondingY(20, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(20);
    expect(getCorrespondingY(-5, { x: 0, y: 0 }, { x: 10, y: 10 })).toBe(-5);
  });
});
