import { describe, expect, it } from 'vitest';
import { euclideanDistance } from '../EuclideanDistance';

describe('euclideanDistance', () => {
  it('is zero between coincident points', () => {
    expect(euclideanDistance(0, 0, 0, 0)).toBe(0);
    expect(euclideanDistance(5, 5, -3, -3)).toBe(0);
  });

  it('returns the absolute distance on a horizontal line', () => {
    expect(euclideanDistance(0, 3, 0, 0)).toBe(3);
    expect(euclideanDistance(3, 0, 0, 0)).toBe(3);
  });

  it('returns the absolute distance on a vertical line', () => {
    expect(euclideanDistance(0, 0, 0, 4)).toBe(4);
    expect(euclideanDistance(0, 0, 4, 0)).toBe(4);
  });

  it('computes the 3-4-5 triangle hypotenuse', () => {
    expect(euclideanDistance(0, 3, 0, 4)).toBe(5);
    expect(euclideanDistance(1, 4, 2, 6)).toBe(5);
  });

  it('is symmetric', () => {
    expect(euclideanDistance(1, 2, 3, 4)).toBe(euclideanDistance(2, 1, 4, 3));
  });

  it('is non-negative for every input', () => {
    const samples: [number, number, number, number][] = [
      [10, -5, 0, 0],
      [-100, 100, -100, 100],
      [0.5, -0.5, 0.25, -0.25]
    ];
    for (const [x1, x2, y1, y2] of samples) {
      expect(euclideanDistance(x1, x2, y1, y2)).toBeGreaterThanOrEqual(0);
    }
  });
});
