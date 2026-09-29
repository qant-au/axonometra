import { describe, expect, it } from 'vitest';
import {
  describePoint,
  distanceToSegment,
  nodeAt,
  resizeAboutMidpoint,
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
  it('reads out the position in the display units', () => {
    expect(describePoint({ x: 250, y: 1240 }, 'm')).toBe(
      '2.5 m across, 12.4 m down'
    );
    expect(describePoint({ x: 250, y: 1240 }, 'mm')).toBe(
      '2500 mm across, 12400 mm down'
    );
    expect(describePoint({ x: 250, y: 1240 }, 'ft-in')).toBe(
      '8\'2-7/16" across, 40\'8-3/16" down'
    );
  });
});

describe('resizeAboutMidpoint', () => {
  it('stretches a segment about its midpoint', () => {
    expect(resizeAboutMidpoint(a, b, 200)).toEqual([
      { x: -50, y: 0 },
      { x: 150, y: 0 }
    ]);
  });

  it('keeps the direction of a diagonal segment', () => {
    const [p, q] = resizeAboutMidpoint({ x: 0, y: 0 }, { x: 30, y: 40 }, 100);
    expect(p.x).toBeCloseTo(-15);
    expect(p.y).toBeCloseTo(-20);
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(100);
  });

  it('leaves a zero-length segment alone', () => {
    expect(resizeAboutMidpoint(a, a, 50)).toEqual([a, a]);
  });
});
