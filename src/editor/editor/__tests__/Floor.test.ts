import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});
vi.mock('../../../helpers/isMobile', () => ({ isMobile: false }));
vi.mock('@accurona/ui', () => ({
  notify: vi.fn()
}));
vi.mock('../../../api/api-client', () => ({
  getDoor: () => Promise.resolve([]),
  getWindow: () => Promise.resolve([]),
  resolveCatalogImage: (id: string) => `/${id}.svg`
}));

const { Floor } = await import('../objects/Floor');
const { fakeInstance } = await import('../../../test/fakeInstance');
const { FloorSerializable } = await import('../persistence/FloorSerializable');

// A square room: nodes 1-4, walls 1-2, 2-3, 3-4, 4-1. Two are exterior.
function room() {
  const data = new FloorSerializable();
  data.wallNodes = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 400, y: 0 },
    { id: 3, x: 400, y: 300 },
    { id: 4, x: 0, y: 300 }
  ];
  data.wallNodeLinks = [
    [1, [2, 4]],
    [2, [3]],
    [3, [4]],
    [4, []]
  ];
  return data;
}

describe('Floor plan format v2', () => {
  it('saves and restores which walls are exterior', () => {
    const data = room();
    data.exteriorWalls = [
      [1, 2],
      [2, 3]
    ];
    const floor = new Floor(fakeInstance(), data);
    const exterior = floor
      .getWallNodeSequence()
      .getExteriorWalls()
      .map((w) => [w.leftNode.getId(), w.rightNode.getId()]);
    expect(exterior).toEqual([
      [1, 2],
      [2, 3]
    ]);
    expect(
      new Floor(fakeInstance(), floor.serialize()).serialize().exteriorWalls
    ).toEqual([
      [1, 2],
      [2, 3]
    ]);
  });

  it('writes no v2 keys when there is nothing to record', () => {
    const json = JSON.parse(
      JSON.stringify(new Floor(fakeInstance(), room()).serialize())
    );
    expect(Object.keys(json).sort()).toEqual([
      'furnitureArray',
      'wallNodeLinks',
      'wallNodes'
    ]);
  });

  it('round-trips wall height, floor elevation and item heights', () => {
    const data = room();
    data.wallHeightM = 3.2;
    data.elevationM = 3.5;
    data.furnitureArray = [
      {
        id: 7,
        texturePath: 'rack-600x1200-42u',
        width: 0.6,
        height: 1.2,
        rotation: 0,
        x: 100,
        y: 100,
        orientation: 0,
        zIndex: 1,
        heightM: 2,
        mountM: 0
      }
    ];
    const saved = new Floor(fakeInstance(), data).serialize();
    expect(saved.wallHeightM).toBe(3.2);
    expect(saved.elevationM).toBe(3.5);
    expect(saved.furnitureArray[0]).toMatchObject({ heightM: 2, mountM: 0 });
  });
});

describe('Wall shown length', () => {
  it("is the centre line less the wall's own thickness", () => {
    // Wall 1-2 is 400 long. Interior walls are 16 thick, exterior 20; the
    // label took off 20 for both (sweep 2026-09-30).
    const wall = new Floor(fakeInstance(), room())
      .getWallNodeSequence()
      .getWall(1, 2)!;
    expect(wall.shownLength()).toBe(384);
    wall.setIsExterior(true);
    expect(wall.shownLength()).toBe(380);
  });
});

describe('Measure tool', () => {
  // A measurement dragged from a wall never started: the wall kept the
  // press from the plan, which is what starts one (sweep 2026-09-30).
  it('lets a press on a wall, a wall point or an item reach the plan', () => {
    const inst = fakeInstance({
      editor: { getState: () => ({ activeTool: 3, snap: false }) }
    });
    const floor = new Floor(inst, room());
    const wall = floor.getWallNodeSequence().getWall(1, 2)!;
    const targets = [wall, wall.leftNode];
    for (const target of targets) {
      const ev = {
        button: 0,
        stopPropagation: vi.fn(),
        global: { x: 0, y: 0 }
      };
      target.emit('pointerdown', ev as never);
      expect(ev.stopPropagation).not.toHaveBeenCalled();
    }
  });
});

describe('Floor room areas', () => {
  const labels = (floor: InstanceType<typeof Floor>) =>
    floor
      .getWallNodeSequence()
      .roomLabels.children.map((t) => (t as unknown as { text: string }).text);

  it("writes each room's area on the plan", () => {
    // fakeInstance formats an area as its plan-unit number.
    expect(labels(new Floor(fakeInstance(), room()))).toEqual(['120000']);
  });

  it('drops the label when a wall is removed and the room opens up', () => {
    const floor = new Floor(fakeInstance(), room());
    const wall = floor.getWallNodeSequence().getWall(1, 2)!;
    floor.removeWall(wall);
    expect(labels(floor)).toEqual([]);
  });

  it('takes no presses and draws under the furniture', () => {
    // An item in the middle of a room could not be clicked while its area
    // label lay over it (sweep 2026-09-30).
    const floor = new Floor(fakeInstance(), room());
    const labels = floor.getWallNodeSequence().roomLabels;
    expect(labels.eventMode).toBe('none');
    expect(labels.parent).toBe(floor);
    // Furniture draws at zIndex 0 and up; walls at 1002.
    expect(labels.zIndex).toBeLessThan(0);
  });

  it('hides room areas with the other labels', () => {
    const floor = new Floor(fakeInstance(), room());
    floor.setLabelVisibility(false);
    expect(floor.getWallNodeSequence().roomLabels.visible).toBe(false);
  });
});
