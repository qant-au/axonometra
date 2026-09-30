import { describe, expect, it } from 'vitest';
import { counted, wallsAndFurniture } from '../counted';

// Re-sweep 2026-09-30: the 3D view read "1 pieces of furniture".
describe('counted', () => {
  it('uses the singular for one', () => {
    expect(counted(1, 'wall')).toBe('1 wall');
    expect(counted(0, 'wall')).toBe('0 walls');
    expect(counted(3, 'wall')).toBe('3 walls');
  });

  it('describes walls and furniture', () => {
    expect(wallsAndFurniture(1, 1)).toBe('1 wall and 1 piece of furniture');
    expect(wallsAndFurniture(4, 3)).toBe('4 walls and 3 pieces of furniture');
    expect(wallsAndFurniture(0, 0)).toBe('0 walls and 0 pieces of furniture');
  });
});
