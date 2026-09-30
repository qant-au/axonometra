import { describe, expect, it, vi } from 'vitest';

vi.mock('pixi.js', async () => {
  const { createPixiMock } = await import('../../../test/pixiMock');
  return createPixiMock();
});
vi.mock('../../../helpers/isMobile', () => ({ isMobile: false }));
vi.mock('../../../vendor/accurona-ui', () => ({
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
