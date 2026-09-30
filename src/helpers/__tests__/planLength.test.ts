import { describe, expect, it } from 'vitest';
import { formatArea } from '../planLength';

// Plan units are centimetres, so a 400 × 300 room is 120 000 plan units².
const ROOM = 400 * 300;

describe('formatArea', () => {
  it('reads square metres for every metric display unit', () => {
    expect(formatArea(ROOM, 'mm')).toBe('12 m²');
    expect(formatArea(ROOM, 'cm')).toBe('12 m²');
    expect(formatArea(ROOM, 'm')).toBe('12 m²');
  });

  it('rounds square metres to one decimal', () => {
    expect(formatArea(345 * 287, 'm')).toBe('9.9 m²');
  });

  it('reads whole square feet for imperial display units', () => {
    expect(formatArea(ROOM, 'in')).toBe('129 ft²');
    expect(formatArea(ROOM, 'ft-in')).toBe('129 ft²');
  });
});
