import { describe, expect, it } from 'vitest';
import type { Furniture } from '../editor/objects/Furniture';
import {
  applyMounting,
  commonMounting,
  defaultMounting,
  mountingError,
  mountingOf
} from '../mountEdit';

// Only the fields the dialog reads and writes; catalogue ids are real.
const item = (resourcePath: string, own: Partial<Furniture> = {}) =>
  ({ resourcePath, zIndex: 1, ...own }) as Furniture;

const keep = {
  mountFrom: null,
  offset: null,
  height: null,
  facing: null
} as const;

describe('mounting a placed item', () => {
  it("reads the element's mounting when the item has none of its own", () => {
    expect(mountingOf(item('smoke-detector'))).toEqual({
      mountFrom: 'ceiling',
      offset: 0,
      height: 5,
      facing: 'down'
    });
    expect(defaultMounting('pir-sensor')).toEqual({
      mountFrom: 'floor',
      offset: 240,
      height: 11,
      facing: 'up'
    });
  });

  it("prefers the item's own values, an offset alone being from the floor", () => {
    expect(mountingOf(item('smoke-detector', { mountM: 2.2 }))).toMatchObject({
      mountFrom: 'floor',
      offset: 220
    });
  });

  it('writes ceiling, flush, facing down and raises the draw order', () => {
    const pir = item('pir-sensor', { mountM: 2.4, heightM: 0.11 });
    pir.zIndex = 1;
    applyMounting(pir, {
      mountFrom: 'ceiling',
      offset: 0,
      height: null,
      facing: 'down'
    });
    expect(pir).toMatchObject({
      mountFrom: 'ceiling',
      mountM: 0,
      heightM: 0.11,
      facing: 'down',
      zIndex: 2
    });
  });

  it('puts an item back on the floor and lowers the draw order', () => {
    const smoke = item('smoke-detector', { zIndex: 2 });
    applyMounting(smoke, { ...keep, mountFrom: 'floor' });
    expect(smoke).toMatchObject({ mountFrom: 'floor', mountM: 0, zIndex: 1 });
  });

  it('leaves a field the items disagree on as each has it', () => {
    const items = [item('pir-sensor'), item('smoke-detector')];
    const common = commonMounting(items);
    expect(common).toEqual({
      mountFrom: null,
      offset: null,
      height: null,
      facing: null
    });
    for (const i of items) applyMounting(i, { ...common, facing: 'down' });
    expect(items.map((i) => [i.mountFrom, i.mountM, i.facing])).toEqual([
      ['floor', 2.4, 'down'],
      ['ceiling', 0, 'down']
    ]);
  });

  it('refuses a recess deeper than the item and a height below the floor', () => {
    const smoke = [item('smoke-detector')];
    expect(mountingError({ ...keep, offset: -5 }, smoke)).toBeNull();
    expect(mountingError({ ...keep, offset: -6 }, smoke)).toMatch(/recess/);
    expect(
      mountingError({ ...keep, mountFrom: 'floor', offset: -1 }, smoke)
    ).toMatch(/0 or more/);
    expect(mountingError({ ...keep, height: 0 }, smoke)).toMatch(/height/);
  });

  it('refuses a ceiling item that would reach below the floor', () => {
    const smoke = [item('smoke-detector')];
    const ceiling = 270;
    expect(
      mountingError({ ...keep, offset: 100, height: 170 }, smoke, ceiling)
    ).toBeNull();
    expect(
      mountingError({ ...keep, offset: 100, height: 300 }, smoke, ceiling)
    ).toMatch(/below the floor/);
    // A height alone is checked against the item's own gap.
    expect(mountingError({ ...keep, height: 300 }, smoke, ceiling)).toMatch(
      /below the floor/
    );
  });

  it('reads an item standing on nothing as on the floor, as a save writes it', () => {
    expect(
      mountingOf(item('table-lamp', { mountFrom: 'surface' })).mountFrom
    ).toBe('floor');
    expect(
      mountingOf(item('table-lamp', { mountFrom: 'surface', mountOn: 3 }))
        .mountFrom
    ).toBe('surface');
  });
});
