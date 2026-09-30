import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

const { clearSpot } = await import('../objects/Walls/RoomLabels');

// Re-sweep 2026-09-30: room areas draw under the furniture, so a loaded
// plan with an item in the middle of its room showed no area at all.
describe('clearSpot', () => {
  const room = [
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 300 },
    { x: 0, y: 300 }
  ];
  const size = { width: 60, height: 20 };
  const at = { x: 200, y: 150 };

  it('centres the label on the room when nothing covers it', () => {
    expect(clearSpot(room, at, size, [])).toEqual({ x: 170, y: 140 });
    const aside = { x: 20, y: 20, width: 40, height: 40 };
    expect(clearSpot(room, at, size, [aside])).toEqual({ x: 170, y: 140 });
  });

  it('moves the label to the nearest clear spot off an item', () => {
    const item = { x: 180, y: 130, width: 40, height: 40 };
    const spot = clearSpot(room, at, size, [item]);
    const label = { ...spot, ...size };
    const overlaps =
      label.x < item.x + item.width &&
      item.x < label.x + label.width &&
      label.y < item.y + item.height &&
      item.y < label.y + label.height;
    expect(overlaps).toBe(false);
    // Inside the room, and just above or below the item.
    expect(label.x).toBeGreaterThanOrEqual(0);
    expect(label.x + label.width).toBeLessThanOrEqual(400);
    expect(Math.abs(spot.y + size.height / 2 - at.y)).toBeLessThanOrEqual(40);
  });

  it('stays in the middle when the whole room is covered', () => {
    const rug = { x: -10, y: -10, width: 420, height: 320 };
    expect(clearSpot(room, at, size, [rug])).toEqual({ x: 170, y: 140 });
  });
});
