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
