import { describe, expect, it } from 'vitest';
import type { IFurnitureSerializable } from '../../editor/persistence/IFurnitureSerializable';
import { getItemModel, type ItemModel } from '../../../res/catalog/models';
import { placeModel } from '../placeModel';

const item = (
  over: Partial<IFurnitureSerializable>
): IFurnitureSerializable => ({
  id: 1,
  texturePath: 'test',
  width: 2,
  height: 1,
  rotation: 0,
  x: 0,
  y: 0,
  orientation: 0,
  zIndex: 1,
  ...over
});

// A 100 × 50 × 80 model: a block on the left half, the full depth.
const block: ItemModel = {
  size: { w: 100, d: 50, h: 80 },
  symbol: false,
  parts: [{ box: [0, 0, 50, 50], z: 0, h: 80, colour: '#123456' }]
};
const xs = (p: { footprint: { x: number }[] }) => p.footprint.map((q) => q.x);
const ys = (p: { footprint: { y: number }[] }) => p.footprint.map((q) => q.y);

describe('placeModel', () => {
  it('scales the model to the footprint and height, and keeps its colour', () => {
    const [p] = placeModel(item({}), block, 0, 160, null);
    expect(Math.min(...xs(p))).toBeCloseTo(0);
    expect(Math.max(...xs(p))).toBeCloseTo(100); // half of the 200 cm width
    expect(Math.max(...ys(p))).toBeCloseTo(100);
    expect([p.z0, p.z1]).toEqual([0, 160]);
    expect(p.colour).toBe('#123456');
  });

  it('mirrors across for orientations 1 and 2, down for 2 and 3', () => {
    const across = placeModel(item({ orientation: 1 }), block, 0, 80, null)[0];
    expect(Math.min(...xs(across))).toBeCloseTo(100);
    expect(Math.max(...xs(across))).toBeCloseTo(200);
    const down = placeModel(item({ orientation: 3 }), block, 0, 80, null)[0];
    expect(Math.min(...xs(down))).toBeCloseTo(0);
  });

  it('turns the model with the item', () => {
    const [p] = placeModel(item({ rotation: Math.PI / 2 }), block, 0, 80, null);
    // Turned a quarter about the item's corner: x becomes y.
    expect(Math.max(...ys(p))).toBeCloseTo(100);
    expect(Math.min(...xs(p))).toBeCloseTo(-100);
  });

  it('centres a symbol device at its real size', () => {
    const device: ItemModel = {
      size: { w: 14, d: 14, h: 10 },
      symbol: true,
      parts: [{ box: [0, 0, 14, 14], z: 0, h: 10, colour: '#000000' }]
    };
    const [p] = placeModel(
      item({ width: 0.4, height: 0.4 }),
      device,
      270,
      10,
      null
    );
    expect(Math.min(...xs(p))).toBeCloseTo(13);
    expect(Math.max(...xs(p))).toBeCloseTo(27);
    expect([p.z0, p.z1]).toEqual([270, 280]);
  });

  it('draws a dome as stepped discs', () => {
    const dome: ItemModel = {
      size: { w: 10, d: 10, h: 6 },
      symbol: false,
      parts: [{ dome: [5, 5, 5], z: 0, h: 6, colour: '#000000' }]
    };
    const parts = placeModel(
      item({ width: 0.1, height: 0.1 }),
      dome,
      0,
      6,
      null
    );
    expect(parts.map((p) => [p.z0, p.z1])).toEqual([
      [0, 2],
      [2, 4],
      [4, 6]
    ]);
  });

  it('cuts parts off at the cut-away height and drops those above it', () => {
    const two: ItemModel = {
      size: { w: 100, d: 50, h: 200 },
      symbol: false,
      parts: [
        { box: [0, 0, 100, 50], z: 0, h: 100, colour: '#000000' },
        { box: [0, 0, 100, 50], z: 150, h: 50, colour: '#000000' }
      ]
    };
    const parts = placeModel(item({}), two, 0, 200, 120);
    expect(parts.map((p) => [p.z0, p.z1])).toEqual([[0, 100]]);
  });
});

describe('vendored models', () => {
  it('has a model for catalogue items, with symbols flagged', () => {
    expect(getItemModel('rack-600x1200-42u')?.parts.length).toBeGreaterThan(0);
    expect(getItemModel('cctv-dome')?.symbol).toBe(true);
    expect(getItemModel('door')).toBeUndefined();
  });
});
