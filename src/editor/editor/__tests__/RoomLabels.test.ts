import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});

const { clearSpot, RoomLabels } = await import('../objects/Walls/RoomLabels');
const { fakeInstance } = await import('../../../test/fakeInstance');

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

// Re-sweep 2026-09-30: a measurement's or a selected item's length, drawn
// over a room's area, left the tops of the area's glyphs showing round its
// white box.
describe('RoomLabels.hideUnder', () => {
  const node = (id: number, x: number, y: number) => ({
    x,
    y,
    getId: () => id
  });
  const nodes = [
    node(1, 0, 0),
    node(2, 400, 0),
    node(3, 400, 300),
    node(4, 0, 300)
  ];
  const walls = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ].map(([a, b]) => ({ leftNode: nodes[a], rightNode: nodes[b] }));

  function labels() {
    const l = new RoomLabels(fakeInstance());
    l.update(
      new Map(nodes.map((n) => [n.getId(), n])) as never,
      walls as never
    );
    return l;
  }
  const areaText = (l: InstanceType<typeof RoomLabels>) =>
    l.children[0] as unknown as {
      visible: boolean;
      position: { x: number; y: number };
    };

  it('hides a room area a read-out covers, even at its edge', () => {
    const l = labels();
    const text = areaText(l);
    // The pixi mock's text is 50 x 16; a read-out one pixel into its top.
    const { x, y } = text.position;
    l.hideUnder([{ x: x - 20, y: y - 15, width: 90, height: 16 }]);
    expect(text.visible).toBe(false);
  });

  it('shows it again when the read-out goes or lies clear', () => {
    const l = labels();
    const text = areaText(l);
    const { x, y } = text.position;
    l.hideUnder([{ x: x - 20, y: y - 15, width: 90, height: 16 }]);
    l.hideUnder([]);
    expect(text.visible).toBe(true);
    l.hideUnder([{ x: x, y: y + 40, width: 90, height: 16 }]);
    expect(text.visible).toBe(true);
  });
});
