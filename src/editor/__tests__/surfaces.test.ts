import { describe, expect, it, vi } from 'vitest';
import type { CatalogueHeights } from '../mount';
import { resolveMount } from '../mount';
import type { IFurnitureSerializable } from '../editor/persistence/IFurnitureSerializable';
import type { FloorPlanSerializable } from '../editor/persistence/FloorPlanSerializable';
import type { EditorInstance } from '../instance/EditorInstance';
import {
  canStandOnSurface,
  mountedOf,
  settleSurfaces,
  supportUnder,
  surfaceTops
} from '../surfaces';

// A small catalogue, cm: a desk carrying things at 73, a breakfast bar whose
// top is lower than its 105 cm (it has an upstand), a monitor and a lamp
// that stand on things, and a chair that does not.
const CATALOGUE: Record<string, CatalogueHeights> = {
  desk: { height: 73, mount: 0, surface: 73 },
  bar: { height: 105, mount: 0, surface: 90 },
  monitor: { height: 45, mount: 0, mountFrom: 'surface' },
  chair: { height: 90, mount: 0 },
  detector: { height: 5, mount: 0, mountFrom: 'ceiling' }
};
const lookup = (kind: string) => CATALOGUE[kind];

// Plan units are cm; width/height are metres, as the editor serialises them.
const item = (
  id: number,
  kind: string,
  x: number,
  y: number,
  w: number,
  d: number,
  over: Partial<IFurnitureSerializable> = {}
): IFurnitureSerializable => ({
  id,
  texturePath: kind,
  x,
  y,
  width: w / 100,
  height: d / 100,
  rotation: 0,
  orientation: 0,
  zIndex: 1,
  ...over
});

const desk = (over: Partial<IFurnitureSerializable> = {}) =>
  item(1, 'desk', 0, 0, 150, 75, over);
const monitor = (over: Partial<IFurnitureSerializable> = {}) =>
  item(2, 'monitor', 50, 20, 60, 20, { zIndex: 2, ...over });

describe('surfaceTops', () => {
  it("gives a support's top above the floor", () => {
    const tops = surfaceTops([desk(), monitor()].map(mountedOf), 270, lookup);
    expect(tops.get(1)).toBe(73);
    expect(tops.has(2)).toBe(false);
  });

  it('follows a support raised or made taller', () => {
    const tops = surfaceTops([mountedOf(desk({ heightM: 1.1 }))], 270, lookup);
    expect(tops.get(1)).toBeCloseTo(110);
    const bar = item(3, 'bar', 0, 0, 180, 50, { mountM: 0.1 });
    expect(surfaceTops([mountedOf(bar)], 270, lookup).get(3)).toBe(100);
  });

  it('stacks a support on a support, and survives a cycle', () => {
    const low = desk();
    const high = item(3, 'desk', 0, 0, 100, 50, {
      mountFrom: 'surface',
      mountOn: 1
    });
    expect(surfaceTops([low, high].map(mountedOf), 270, lookup).get(3)).toBe(
      146
    );
    const a = desk({ mountFrom: 'surface', mountOn: 3 });
    const b = item(3, 'desk', 0, 0, 100, 50, {
      mountFrom: 'surface',
      mountOn: 1
    });
    expect(() => surfaceTops([a, b].map(mountedOf), 270, lookup)).not.toThrow();
  });

  it('puts an item standing on a support on its top', () => {
    const tops = surfaceTops([mountedOf(desk())], 270, lookup);
    const on = monitor({ mountFrom: 'surface', mountOn: 1, mountM: 0.02 });
    expect(
      resolveMount(
        { mountFrom: on.mountFrom, offset: 2 },
        lookup('monitor'),
        270,
        45,
        tops.get(1)
      )
    ).toBe(75);
    // With no support it stands on the floor.
    expect(
      resolveMount({ mountFrom: 'surface' }, lookup('monitor'), 270, 45)
    ).toBe(0);
  });
});

describe('supportUnder', () => {
  it('finds the support under the centre, and nothing beside it', () => {
    expect(supportUnder(monitor(), [desk(), monitor()], 270, lookup)?.id).toBe(
      1
    );
    const beside = monitor({ x: 300 });
    expect(supportUnder(beside, [desk(), beside], 270, lookup)).toBeUndefined();
  });

  it('follows a rotated support', () => {
    // The desk turned 90 degrees clockwise about its corner covers x -75..0.
    const turned = desk({ rotation: Math.PI / 2 });
    const over = item(2, 'monitor', -60, 60, 20, 10);
    expect(supportUnder(over, [turned, over], 270, lookup)?.id).toBe(1);
    const off = item(2, 'monitor', 60, 20, 20, 10);
    expect(supportUnder(off, [turned, off], 270, lookup)).toBeUndefined();
  });

  it('takes the highest of two supports, and never one standing on the item', () => {
    const bar = item(3, 'bar', 0, 0, 150, 75);
    expect(
      supportUnder(monitor(), [desk(), bar, monitor()], 270, lookup)?.id
    ).toBe(3);
    const onTop = desk({ mountFrom: 'surface', mountOn: 3 });
    expect(supportUnder(bar, [onTop, bar], 270, lookup)).toBeUndefined();
  });
});

describe('canStandOnSurface', () => {
  it('is bench-top gear on the floor, or anything already on a support', () => {
    expect(canStandOnSurface(monitor(), lookup)).toBe(true);
    expect(canStandOnSurface(monitor({ mountFrom: 'floor' }), lookup)).toBe(
      true
    );
    // Raised by hand onto a wall bracket: left where it was put.
    expect(
      canStandOnSurface(monitor({ mountFrom: 'floor', mountM: 1.2 }), lookup)
    ).toBe(false);
    expect(canStandOnSurface(item(4, 'chair', 0, 0, 50, 50), lookup)).toBe(
      false
    );
    expect(
      canStandOnSurface(
        item(4, 'chair', 0, 0, 50, 50, { mountFrom: 'surface' }),
        lookup
      )
    ).toBe(true);
    expect(
      canStandOnSurface(
        monitor({ attachedToLeft: 1, attachedToRight: 2 }),
        lookup
      )
    ).toBe(false);
  });
});

// Live items as settleSurfaces sees them: mutable fields and serialize().
function live(data: IFurnitureSerializable) {
  const self = {
    ...data,
    serialize: (): IFurnitureSerializable => {
      const { serialize: _, ...rest } = self;
      void _;
      return { ...rest };
    }
  };
  return self;
}

function editor(items: IFurnitureSerializable[]) {
  const furniture = new Map(items.map((i) => [i.id, live(i)]));
  const floor = { wallHeightM: 2.7, getFurniture: () => furniture };
  const notify = vi.fn();
  const inst = {
    plan: { getState: () => ({ floors: [floor] }) },
    notify
  } as unknown as EditorInstance;
  return { inst, furniture, notify };
}

const planOf = (items: IFurnitureSerializable[]) =>
  ({ floors: [{ furnitureArray: items }] }) as unknown as FloorPlanSerializable;

describe('settleSurfaces', () => {
  it('stands an item dropped on a support on it', () => {
    const { inst, furniture, notify } = editor([desk(), monitor()]);
    settleSurfaces(inst, planOf([desk()]), lookup);
    expect(furniture.get(2)).toMatchObject({
      mountFrom: 'surface',
      mountOn: 1
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it('stands an item moved onto a support on it, over the support', () => {
    const before = monitor({ x: 400, zIndex: 1, mountFrom: 'floor' });
    const { inst, furniture } = editor([
      desk(),
      monitor({ zIndex: 1, mountFrom: 'floor' })
    ]);
    settleSurfaces(inst, planOf([desk(), before]), lookup);
    expect(furniture.get(2)).toMatchObject({
      mountFrom: 'surface',
      mountOn: 1,
      zIndex: 2
    });
  });

  it('lets an item moved off its support down onto the floor, quietly', () => {
    const on = { mountFrom: 'surface' as const, mountOn: 1 };
    const { inst, furniture, notify } = editor([
      desk(),
      monitor({ ...on, x: 400 })
    ]);
    settleSurfaces(inst, planOf([desk(), monitor(on)]), lookup);
    expect(furniture.get(2)!.mountOn).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it('keeps the gap when an item moves from one support to another', () => {
    const on = { mountFrom: 'surface' as const, mountOn: 1, mountM: 0.05 };
    const other = item(3, 'desk', 500, 0, 150, 75);
    const { inst, furniture } = editor([
      desk(),
      other,
      monitor({ ...on, x: 550 })
    ]);
    settleSurfaces(inst, planOf([desk(), other, monitor(on)]), lookup);
    expect(furniture.get(2)).toMatchObject({ mountOn: 3, mountM: 0.05 });
  });

  it('drops an item to the floor when its support is deleted, and says so', () => {
    const on = { mountFrom: 'surface' as const, mountOn: 1 };
    const { inst, furniture, notify } = editor([monitor(on)]);
    settleSurfaces(inst, planOf([desk(), monitor(on)]), lookup);
    expect(furniture.get(2)!.mountOn).toBeUndefined();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Moved to the floor' })
    );
  });

  it('drops an item when its support is moved out from under it, not when it is nudged under it', () => {
    const on = { mountFrom: 'surface' as const, mountOn: 1 };
    const away = editor([desk({ x: 400 }), monitor(on)]);
    settleSurfaces(away.inst, planOf([desk(), monitor(on)]), lookup);
    expect(away.furniture.get(2)!.mountOn).toBeUndefined();
    expect(away.notify).toHaveBeenCalledOnce();

    const nudged = editor([desk({ x: 10 }), monitor(on)]);
    settleSurfaces(nudged.inst, planOf([desk(), monitor(on)]), lookup);
    expect(nudged.furniture.get(2)!.mountOn).toBe(1);
    expect(nudged.notify).not.toHaveBeenCalled();
  });

  it('keeps an item on its support when both move together', () => {
    const on = { mountFrom: 'surface' as const, mountOn: 1 };
    const { inst, furniture, notify } = editor([
      desk({ x: 400 }),
      monitor({ ...on, x: 450 })
    ]);
    settleSurfaces(inst, planOf([desk(), monitor(on)]), lookup);
    expect(furniture.get(2)!.mountOn).toBe(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('leaves a chair pushed under a table on the floor', () => {
    const chair = item(4, 'chair', 50, 20, 50, 50);
    const { inst, furniture } = editor([desk(), chair]);
    settleSurfaces(inst, planOf([desk(), { ...chair, x: 400 }]), lookup);
    expect(furniture.get(4)!.mountOn).toBeUndefined();
    expect(furniture.get(4)!.mountFrom).toBeUndefined();
  });
});

// The real element library: every bench-top item that used to sit on the
// floor stands on a desk or a bench it is placed over.
describe('the element library', () => {
  const GEAR = [
    'monitor-24',
    'monitor',
    'monitor-34-ultrawide',
    'monitor-38-ultrawide',
    'monitor-49-ultrawide',
    'monitor-arm-dual',
    'laptop',
    'ip-phone',
    'router',
    'network-switch',
    'nas',
    'microwave'
  ];
  const SUPPORTS: [string, number][] = [
    ['desk', 73],
    ['base-cabinet-900', 90],
    ['island-bench', 90]
  ];
  for (const kind of GEAR) {
    it(`${kind} stands on a desk and a bench`, () => {
      const gear = item(2, kind, 0, 0, 10, 10, { x: 40, y: 20 });
      expect(canStandOnSurface(gear)).toBe(true);
      for (const [support, top] of SUPPORTS) {
        const under = item(1, support, 0, 0, 240, 100);
        expect(supportUnder(gear, [under, gear], 270)?.id).toBe(1);
        expect(surfaceTops([mountedOf(under)], 270).get(1)).toBe(top);
      }
    });
  }
});
