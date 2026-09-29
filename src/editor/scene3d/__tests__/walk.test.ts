import { describe, expect, it } from 'vitest';
import { FloorSerializable } from '../../editor/persistence/FloorSerializable';
import type { IFurnitureSerializable } from '../../editor/persistence/IFurnitureSerializable';
import { floorInput } from '../fromPlan';
import { floorGeometry } from '../geometry';
import {
  WALKER_RADIUS,
  arrival,
  canChangeFloor,
  canStand,
  move,
  obstacles,
  startPoint,
  stairsOn
} from '../walk';

const item = (
  over: Partial<IFurnitureSerializable>
): IFurnitureSerializable => ({
  id: 1,
  texturePath: 'table',
  width: 1,
  height: 1,
  rotation: 0,
  x: 0,
  y: 0,
  orientation: 0,
  zIndex: 1,
  ...over
});

// A 400 × 300 room; its top wall (1-2) carries whatever is attached.
function room(items: IFurnitureSerializable[] = []) {
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
  const input = floorInput(floor, 0);
  const geometry = floorGeometry(input);
  const blocks = obstacles(geometry.walls, input.elevation);
  return { floor, geometry, blocks };
}

const onTopWall = (texturePath: string) =>
  item({
    id: 9,
    texturePath,
    width: 1,
    x: 150,
    attachedToLeft: 1,
    attachedToRight: 2
  });

describe('walking', () => {
  it('stops at a wall instead of passing through it', () => {
    const { blocks } = room();
    const end = move({ x: 200, y: 150 }, { x: 0, y: -400 }, blocks);
    expect(end.y).toBeGreaterThan(0);
    expect(canStand(end, blocks)).toBe(true);
  });

  it('slides along a wall when walking into it at an angle', () => {
    const { blocks } = room();
    const end = move({ x: 100, y: 60 }, { x: 100, y: -100 }, blocks);
    expect(end.x).toBeGreaterThan(190);
    expect(end.y).toBeGreaterThan(0);
  });

  it('walks out through a doorway', () => {
    const { blocks } = room([onTopWall('door')]);
    const end = move({ x: 200, y: 150 }, { x: 0, y: -300 }, blocks);
    expect(end.y).toBeLessThan(-100);
  });

  it('is stopped by a window sill', () => {
    const { blocks } = room([onTopWall('window')]);
    const end = move({ x: 200, y: 150 }, { x: 0, y: -300 }, blocks);
    expect(end.y).toBeGreaterThan(0);
  });

  it('starts inside the room, clear of the walls', () => {
    const { geometry, blocks } = room();
    const p = startPoint(geometry, blocks);
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(150);
    expect(canStand(p, blocks, WALKER_RADIUS)).toBe(true);
  });
});

describe('changing floor', () => {
  const stairs = item({ texturePath: 'stairs-straight', x: 300, y: 50 });

  it('goes anywhere on a floor with no stairs, only at the stairs otherwise', () => {
    expect(canChangeFloor({ x: 50, y: 50 }, [])).toBe(true);
    const marked = stairsOn(room([stairs]).floor);
    expect(marked).toHaveLength(1);
    expect(canChangeFloor({ x: 50, y: 250 }, marked)).toBe(false);
    expect(canChangeFloor({ x: 340, y: 100 }, marked)).toBe(true);
  });

  it('arrives at the stairs on the new floor', () => {
    const { floor, geometry, blocks } = room([stairs]);
    const p = arrival({ x: 50, y: 250 }, stairsOn(floor), geometry, blocks);
    expect(Math.hypot(p.x - 350, p.y - 100)).toBeLessThan(60);
    expect(canStand(p, blocks)).toBe(true);
  });

  it('keeps its spot on a floor without stairs when there is room', () => {
    const { geometry, blocks } = room();
    expect(arrival({ x: 120, y: 80 }, [], geometry, blocks)).toEqual({
      x: 120,
      y: 80
    });
  });
});
