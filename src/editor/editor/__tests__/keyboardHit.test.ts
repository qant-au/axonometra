import { describe, expect, it } from 'vitest';
import {
  describePoint,
  distanceToSegment,
  nodeAt,
  wallAt
} from '../keyboardHit';

const a = { x: 0, y: 0 };
const b = { x: 100, y: 0 };

describe('nodeAt', () => {
  it('returns the closest node within tolerance', () => {
    const nodes = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 8, y: 0 }
    ];
    expect(nodeAt(nodes, { x: 6, y: 0 }, 10)?.id).toBe(2);
  });

  it('returns undefined when nothing is close enough', () => {
    expect(nodeAt([{ x: 0, y: 0 }], { x: 20, y: 0 }, 10)).toBeUndefined();
  });
});

describe('distanceToSegment', () => {
  it('measures perpendicular distance inside the segment', () => {
    expect(distanceToSegment({ x: 50, y: 7 }, a, b)).toBe(7);
  });

  it('measures to the nearest endpoint beyond the segment', () => {
    expect(distanceToSegment({ x: 103, y: 4 }, a, b)).toBe(5);
  });

  it('handles a zero-length segment', () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});

describe('wallAt', () => {
  const thin = { name: 'thin', leftNode: a, rightNode: b, thickness: 16 };
  const other = {
    name: 'other',
    leftNode: { x: 0, y: 10 },
    rightNode: { x: 100, y: 10 },
    thickness: 20
  };

  it('hits a wall within half its thickness', () => {
    expect(wallAt([thin], { x: 50, y: 8 })?.name).toBe('thin');
    expect(wallAt([thin], { x: 50, y: 9 })).toBeUndefined();
  });

  it('prefers the nearest wall when bodies overlap', () => {
    expect(wallAt([thin, other], { x: 50, y: 7 })?.name).toBe('other');
    expect(wallAt([thin, other], { x: 50, y: 3 })?.name).toBe('thin');
  });
});

describe('describePoint', () => {
  it('reads out metres to two decimals', () => {
    expect(describePoint({ x: 250, y: 1240 }, 100)).toBe(
      '2.50 m across, 12.40 m down'
    );
  });
});
