import { describe, expect, it } from 'vitest';
import { Serializer } from '../persistence/Serializer';
import { FloorSerializable } from '../persistence/FloorSerializable';
import {
  safeParsePlan,
  validatePlanShape
} from '../persistence/FloorPlanSerializable';
import type { Floor } from '../objects/Floor';

// Serializer is pure JSON.stringify over what Floor.serialize() returns,
// so we hand it a fake Floor and assert the output shape. No Pixi mock
// is required — the Serializer never touches Floor's Pixi side.

function makeFakeFloor(opts: {
  wallNodeId: number;
  floorData?: Partial<FloorSerializable>;
}): Floor {
  const floorSerializable = new FloorSerializable();
  if (opts.floorData) {
    Object.assign(floorSerializable, opts.floorData);
  }
  return {
    serialize: () => floorSerializable,
    getWallNodeSequence: () => ({
      getWallNodeId: () => opts.wallNodeId
    })
  } as unknown as Floor;
}

describe('Serializer', () => {
  it('produces a JSON string with floors, furnitureId, wallNodeId, version', () => {
    const floor = makeFakeFloor({ wallNodeId: 4 });
    const out = new Serializer().serialize([floor], 9);
    const parsed = safeParsePlan(out) as Record<string, unknown>;
    expect(parsed.furnitureId).toBe(9);
    expect(parsed.wallNodeId).toBe(4);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.floors)).toBe(true);
    expect((parsed.floors as unknown[]).length).toBe(1);
  });

  it('round-trips through safeParsePlan + validatePlanShape', () => {
    const floor = makeFakeFloor({
      wallNodeId: 2,
      floorData: {
        wallNodes: [{ id: 1, x: 10, y: 20 }],
        wallNodeLinks: [[1, []]]
      }
    });
    const out = new Serializer().serialize([floor], 0);
    const validated = validatePlanShape(safeParsePlan(out));
    expect(validated).not.toBeNull();
    expect(validated?.furnitureId).toBe(0);
    expect(validated?.wallNodeId).toBe(2);
    expect(validated?.floors[0].wallNodes).toEqual([{ id: 1, x: 10, y: 20 }]);
  });

  it('includes every floor passed in', () => {
    const a = makeFakeFloor({ wallNodeId: 1 });
    const b = makeFakeFloor({ wallNodeId: 1 });
    const c = makeFakeFloor({ wallNodeId: 1 });
    const parsed = JSON.parse(new Serializer().serialize([a, b, c], 0));
    expect(parsed.floors.length).toBe(3);
  });
});
