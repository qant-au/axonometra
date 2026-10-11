import { describe, expect, it } from 'vitest';
import { Box3, Mesh } from 'three';
import { FloorPlanSerializable } from '../../editor/persistence/FloorPlanSerializable';
import { FloorSerializable } from '../../editor/persistence/FloorSerializable';
import type { IFurnitureSerializable } from '../../editor/persistence/IFurnitureSerializable';
import { sceneModel } from '../sceneModel';
import { buildGroup } from '../threeScene';

// A 400 × 300 room with a door on its top wall.
function roomFloor(items: IFurnitureSerializable[] = []) {
  const floor = new FloorSerializable();
  floor.wallNodes = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 400, y: 0 },
    { id: 3, x: 400, y: 300 },
    { id: 4, x: 0, y: 300 }
  ];
  floor.wallNodeLinks = [
    [1, [2]],
    [2, [3]],
    [3, [4]],
    [4, [1]]
  ];
  floor.furnitureArray = items;
  return floor;
}

const item = (
  over: Partial<IFurnitureSerializable>
): IFurnitureSerializable => ({
  id: 1,
  texturePath: 'table',
  width: 1.5,
  height: 0.9,
  rotation: 0,
  x: 100,
  y: 100,
  orientation: 0,
  zIndex: 1,
  ...over
});

const door = item({
  id: 9,
  texturePath: 'door',
  width: 0.8,
  x: 150,
  y: 0,
  attachedToLeft: 1,
  attachedToRight: 2
});

function planOf(...floors: FloorSerializable[]) {
  const plan = new FloorPlanSerializable();
  plan.floors = floors;
  return plan;
}

const noCatalogue = () => undefined;
const whole = { allFloors: false, current: 0, cutaway: null };
const kinds = (m: ReturnType<typeof sceneModel>) =>
  m.prisms.map((p) => p.kind).sort();

describe('sceneModel', () => {
  it('draws walls, a door lintel, a floor and a ceiling', () => {
    const m = sceneModel(planOf(roomFloor([door])), whole, noCatalogue);
    expect(m.wallCount).toBe(4);
    expect(kinds(m)).toEqual(
      [
        'ceiling',
        'floor',
        'lintel',
        'wall',
        'wall',
        'wall',
        'wall',
        'wall'
      ].sort()
    );
  });

  it('cuts walls off above the cut-away height and leaves off ceilings and lintels', () => {
    const m = sceneModel(
      planOf(roomFloor([door])),
      { ...whole, cutaway: 120 },
      noCatalogue
    );
    expect(kinds(m)).not.toContain('ceiling');
    expect(kinds(m)).not.toContain('lintel'); // the lintel starts at 210
    for (const p of m.prisms.filter((q) => q.kind === 'wall')) {
      expect(p.z1).toBe(120);
    }
  });

  it('draws furniture at its saved height, else the catalogue, else 70 cm', () => {
    const saved = sceneModel(
      planOf(roomFloor([item({ heightM: 0.75 })])),
      whole,
      noCatalogue
    );
    const catalogue = sceneModel(planOf(roomFloor([item({})])), whole, () => ({
      height: 74,
      mount: 0
    }));
    const fallback = sceneModel(
      planOf(roomFloor([item({})])),
      whole,
      noCatalogue
    );
    const top = (m: ReturnType<typeof sceneModel>) =>
      m.prisms.find((p) => p.kind === 'furniture')!.z1;
    expect(top(saved)).toBe(75);
    expect(top(catalogue)).toBe(74);
    expect(top(fallback)).toBe(70);
  });

  it('hangs mounted items at their height and drops them above the cut', () => {
    const ac = item({
      texturePath: 'split-ac-indoor',
      heightM: 0.3,
      mountM: 2.1
    });
    const m = sceneModel(planOf(roomFloor([ac])), whole, noCatalogue);
    const box = m.prisms.find((p) => p.kind === 'furniture')!;
    expect([box.z0, box.z1]).toEqual([210, 240]);
    const cut = sceneModel(
      planOf(roomFloor([ac])),
      { ...whole, cutaway: 120 },
      noCatalogue
    );
    expect(cut.furnitureCount).toBe(0);
    expect(cut.hiddenCount).toBe(1);
    expect(cut.prisms.some((p) => p.kind === 'furniture')).toBe(false);
  });

  it('draws items above the cut as outlines at their true height', () => {
    const ac = item({ heightM: 0.3, mountM: 2.1 });
    const tv = item({ id: 2, heightM: 0.6, mountM: 1.1 });
    const m = sceneModel(
      planOf(roomFloor([ac, tv])),
      { ...whole, cutaway: 120, above: true },
      noCatalogue
    );
    expect(m.furnitureCount).toBe(1);
    expect(m.hiddenCount).toBe(1);
    const furniture = m.prisms
      .filter((p) => p.kind === 'furniture')
      .map((p) => [Math.round(p.z0), Math.round(p.z1), !!p.ghost]);
    // The AC whole as an outline; the TV solid to the cut, outline above.
    expect(furniture).toEqual([
      [210, 240, true],
      [110, 120, false],
      [120, 170, true]
    ]);
    // Outlines are their own mesh, so the solid furniture stays opaque.
    const { group, dispose } = buildGroup(m.prisms);
    const names = group.children
      .filter((c): c is Mesh => c instanceof Mesh)
      .map((c) => c.name);
    expect(names).toContain('furniture');
    expect(names).toContain('furniture-above');
    dispose();
  });

  it('turns an item over when it faces the other way from its element', () => {
    const model = {
      size: { w: 10, d: 10, h: 10 },
      symbol: false,
      parts: [
        {
          box: [0, 0, 10, 10] as [number, number, number, number],
          z: 0,
          h: 2,
          colour: '#000000'
        }
      ]
    };
    const z = (facing?: 'up' | 'down') =>
      sceneModel(
        planOf(
          roomFloor([
            item({ texturePath: 'x', heightM: 0.1, mountM: 1, facing })
          ])
        ),
        whole,
        () => ({ height: 10, mount: 0, facing: 'up' }),
        () => model
      ).prisms.find((p) => p.kind === 'furniture')!.z0;
    expect(z()).toBe(100);
    expect(z('up')).toBe(100);
    expect(z('down')).toBe(108);
  });

  it('hangs a ceiling item from its floor’s ceiling, and follows it', () => {
    const ap = item({
      texturePath: 'wifi-ap',
      heightM: 0.04,
      mountFrom: 'ceiling',
      mountM: 0.1
    });
    const z = (wallHeightM?: number) => {
      const floor = roomFloor([ap]);
      if (wallHeightM != null) floor.wallHeightM = wallHeightM;
      const box = sceneModel(planOf(floor), whole, noCatalogue).prisms.find(
        (p) => p.kind === 'furniture'
      )!;
      return [box.z0, box.z1].map((v) => Math.round(v * 1e6) / 1e6);
    };
    // Its top 10 cm below the ceiling.
    expect(z(2.4)).toEqual([226, 230]);
    expect(z(2.55)).toEqual([241, 245]);
    expect(z()).toEqual([256, 260]);
    // A catalogue ceiling item with nothing stored follows its element.
    const flush = sceneModel(
      planOf(roomFloor([item({ texturePath: 'smoke-detector' })])),
      whole,
      () => ({ height: 5, mount: 0, mountFrom: 'ceiling', facing: 'down' })
    ).prisms.find((p) => p.kind === 'furniture')!;
    expect([flush.z0, flush.z1]).toEqual([265, 270]);
  });

  it('stands an item on the top of the item under it, and follows that top', () => {
    const catalogue = (id: string) =>
      id === 'desk'
        ? { height: 73, mount: 0, surface: 73 }
        : { height: 45, mount: 0, mountFrom: 'surface' as const };
    const z = (deskHeightM?: number) => {
      const desk = item({ id: 1, texturePath: 'desk', heightM: deskHeightM });
      const monitor = item({
        id: 2,
        texturePath: 'monitor',
        mountFrom: 'surface',
        mountOn: 1,
        width: 0.6,
        height: 0.2
      });
      const box = sceneModel(
        planOf(roomFloor([desk, monitor])),
        whole,
        catalogue
      ).prisms.filter((p) => p.kind === 'furniture')[1];
      return [box.z0, box.z1].map((v) => Math.round(v * 1e6) / 1e6);
    };
    expect(z()).toEqual([73, 118]);
    // A sit-stand desk raised to 110: the monitor goes up with it.
    expect(z(1.1)).toEqual([110, 155]);
  });

  it('does not draw doors and windows as furniture', () => {
    const m = sceneModel(planOf(roomFloor([door])), whole, noCatalogue);
    expect(m.furnitureCount).toBe(0);
  });

  it('shows one floor, or stacks them all with a ceiling only on top', () => {
    const plan = planOf(roomFloor(), roomFloor());
    const second = sceneModel(plan, { ...whole, current: 1 }, noCatalogue);
    expect(second.bounds.min[2]).toBe(290); // floor 1 sits at 300, slab under it
    const all = sceneModel(plan, { ...whole, allFloors: true }, noCatalogue);
    expect(all.wallCount).toBe(8);
    expect(all.prisms.filter((p) => p.kind === 'ceiling')).toHaveLength(1);
  });

  it('is empty for a plan with no walls', () => {
    const m = sceneModel(planOf(new FloorSerializable()), whole, noCatalogue);
    expect(m.prisms).toEqual([]);
  });
});

describe('buildGroup', () => {
  it('builds one mesh per kind, with height as y and the plan y as z', () => {
    const m = sceneModel(planOf(roomFloor([item({})])), whole, noCatalogue);
    const { group, dispose } = buildGroup(m.prisms);
    const meshes = group.children.filter((c): c is Mesh => c instanceof Mesh);
    expect(meshes.map((c) => c.name).sort()).toEqual(
      ['ceiling', 'floor', 'furniture', 'wall'].sort()
    );
    const table = new Box3().setFromObject(
      meshes.find((c) => c.name === 'furniture')!
    );
    // The 150 × 90 table at (100, 100): x 100–250, plan y 100–190 → z, 70 tall.
    expect(table.min.x).toBeCloseTo(100);
    expect(table.max.x).toBeCloseTo(250);
    expect(table.min.z).toBeCloseTo(100);
    expect(table.max.z).toBeCloseTo(190);
    expect(table.min.y).toBeCloseTo(0);
    expect(table.max.y).toBeCloseTo(70);
    dispose();
  });
});
