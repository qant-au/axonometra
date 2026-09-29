import { describe, expect, it } from 'vitest';
import type { FloorPlanSerializable } from '../../persistence/FloorPlanSerializable';
import type { FloorSerializable } from '../../persistence/FloorSerializable';
import {
  allRefs,
  buildFragment,
  deleteRefs,
  existingRefs,
  floorBounds,
  moveRefs,
  pasteFragment,
  refsBounds,
  refsInRect,
  wallRef,
  wallsOf
} from '../planOps';

// A 4 m x 3 m room: nodes 1-4, walls 1-2, 2-3, 3-4, 1-4. Wall 1-2 is
// exterior and carries a door (id 2); a desk (id 1) stands in the room.
const room = (): FloorSerializable => ({
  wallNodes: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 400, y: 0 },
    { id: 3, x: 400, y: 300 },
    { id: 4, x: 0, y: 300 }
  ],
  wallNodeLinks: [
    [1, [2, 4]],
    [2, [3]],
    [3, [4]],
    [4, []]
  ],
  exteriorWalls: [[1, 2]],
  furnitureArray: [
    {
      id: 1,
      texturePath: 'desk',
      width: 1.2,
      height: 0.6,
      rotation: 0,
      x: 100,
      y: 100,
      orientation: 0,
      zIndex: 1
    },
    {
      id: 2,
      texturePath: 'door',
      width: 0.9,
      height: 0.9,
      rotation: 0,
      x: 150,
      y: 0,
      orientation: 0,
      zIndex: 1,
      attachedToLeft: 1,
      attachedToRight: 2
    }
  ]
});

const plan = (floor = room()): FloorPlanSerializable => ({
  version: 2,
  floors: [floor],
  furnitureId: 2,
  wallNodeId: 4
});

describe('allRefs / existingRefs', () => {
  it('names every wall and piece of furniture', () => {
    expect(allRefs(room())).toHaveLength(6);
  });

  it('drops refs to things that are gone', () => {
    const refs = [wallRef(1, 2), { kind: 'furniture' as const, id: 99 }];
    expect(existingRefs(room(), refs)).toEqual([wallRef(1, 2)]);
  });

  it('writes a wall with its lower node first', () => {
    expect(wallRef(4, 1)).toEqual({ kind: 'wall', left: 1, right: 4 });
  });
});

describe('refsInRect', () => {
  it('selects only what is wholly inside', () => {
    const refs = refsInRect(room(), { x: 50, y: 50, width: 200, height: 200 });
    expect(refs).toEqual([{ kind: 'furniture', id: 1 }]);
  });

  it('a band over the whole room selects everything', () => {
    const refs = refsInRect(room(), {
      x: -20,
      y: -20,
      width: 440,
      height: 340
    });
    expect(refs).toHaveLength(6);
  });

  it('finds a door where its wall puts it', () => {
    // The door sits along wall 1-2, 150 cm from node 1.
    const refs = refsInRect(room(), {
      x: 140,
      y: -20,
      width: 110,
      height: 110
    });
    expect(refs).toEqual([{ kind: 'furniture', id: 2 }]);
  });
});

describe('bounds', () => {
  it('fits the floor', () => {
    const b = floorBounds(room())!;
    expect(b.x).toBeCloseTo(0);
    expect(b.width).toBeCloseTo(400);
    expect(b.height).toBeGreaterThanOrEqual(300);
  });

  it('fits a selection', () => {
    expect(refsBounds(room(), [{ kind: 'furniture', id: 1 }])).toEqual({
      x: 100,
      y: 100,
      width: 120,
      height: 60
    });
    expect(refsBounds(room(), [])).toBeUndefined();
  });
});

describe('copy and paste', () => {
  it('a copied wall brings its nodes and its door', () => {
    const fragment = buildFragment(room(), [wallRef(1, 2)]);
    expect(fragment.walls).toEqual([[1, 2]]);
    expect(fragment.nodes.map((n) => n.id)).toEqual([1, 2]);
    expect(fragment.exterior).toEqual([[1, 2]]);
    expect(fragment.furniture.map((f) => f.id)).toEqual([2]);
  });

  it('a door copied without its wall is left out', () => {
    const fragment = buildFragment(room(), [{ kind: 'furniture', id: 2 }]);
    expect(fragment.furniture).toEqual([]);
  });

  it('paste mints new ids, offsets, and keeps the door on the new wall', () => {
    const p = plan();
    const fragment = buildFragment(p.floors[0], [
      wallRef(1, 2),
      { kind: 'furniture', id: 1 }
    ]);
    const added = pasteFragment(p, 0, fragment, 50, 60);
    expect(p.wallNodeId).toBe(6);
    expect(p.furnitureId).toBe(4);
    expect(added).toEqual([
      wallRef(5, 6),
      { kind: 'furniture', id: 3 },
      { kind: 'furniture', id: 4 }
    ]);
    const floor = p.floors[0];
    expect(floor.wallNodes.slice(-2)).toEqual([
      { id: 5, x: 50, y: 60 },
      { id: 6, x: 450, y: 60 }
    ]);
    expect(wallsOf(floor)).toContainEqual([5, 6]);
    expect(floor.exteriorWalls).toContainEqual([5, 6]);
    const desk = floor.furnitureArray.find((f) => f.id === 3)!;
    expect([desk.x, desk.y]).toEqual([150, 160]);
    const door = floor.furnitureArray.find((f) => f.id === 4)!;
    expect([door.attachedToLeft, door.attachedToRight]).toEqual([5, 6]);
    // Along its wall, not offset: the wall moved instead.
    expect([door.x, door.y]).toEqual([150, 0]);
    // The source is untouched.
    expect(fragment.nodes[0]).toEqual({ id: 1, x: 0, y: 0 });
  });
});

describe('deleteRefs', () => {
  it('a deleted wall takes its door, and leaves shared nodes', () => {
    const floor = room();
    deleteRefs(floor, [wallRef(1, 2)]);
    expect(wallsOf(floor)).not.toContainEqual([1, 2]);
    expect(floor.furnitureArray.map((f) => f.id)).toEqual([1]);
    expect(floor.exteriorWalls).toBeUndefined();
    // Both nodes still have another wall.
    expect(floor.wallNodes).toHaveLength(4);
  });

  it('a node left with no wall goes too', () => {
    const floor = room();
    deleteRefs(floor, [wallRef(1, 2), wallRef(1, 4)]);
    expect(floor.wallNodes.map((n) => n.id)).toEqual([2, 3, 4]);
    expect(floor.wallNodeLinks.map(([l]) => l)).toEqual([2, 3, 4]);
  });

  it('deletes furniture', () => {
    const floor = room();
    deleteRefs(floor, [{ kind: 'furniture', id: 1 }]);
    expect(floor.furnitureArray.map((f) => f.id)).toEqual([2]);
  });
});

describe('moveRefs', () => {
  it('moves a wall by both its points, and free furniture', () => {
    const floor = room();
    moveRefs(floor, [wallRef(1, 2), { kind: 'furniture', id: 1 }], 10, 20);
    expect(floor.wallNodes[0]).toEqual({ id: 1, x: 10, y: 20 });
    expect(floor.wallNodes[1]).toEqual({ id: 2, x: 410, y: 20 });
    expect(floor.wallNodes[2]).toEqual({ id: 3, x: 400, y: 300 });
    expect(floor.furnitureArray[0]).toMatchObject({ x: 110, y: 120 });
  });

  it('a door on its own stays on its wall', () => {
    const floor = room();
    moveRefs(floor, [{ kind: 'furniture', id: 2 }], 10, 20);
    expect(floor.furnitureArray[1]).toMatchObject({ x: 150, y: 0 });
  });
});
