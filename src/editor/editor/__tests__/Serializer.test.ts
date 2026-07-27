import { beforeEach, describe, expect, it } from 'vitest';
import { Serializer } from '../persistence/Serializer';
import { FloorSerializable } from '../persistence/FloorSerializable';
import {
  safeParsePlan,
  validatePlanShape
} from '../persistence/FloorPlanSerializable';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import type { Floor } from '../objects/Floor';

// Serializer is pure JSON.stringify over what Floor.serialize() returns, so we
// seed the store with fake Floors and assert the output shape. No Pixi mock is
// required — the Serializer never touches Floor's Pixi side.

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

function seedPlan(floors: Floor[], furnitureId: number) {
  useFloorPlanStore.setState({ floors, furnitureId, currentFloor: 0 });
}

describe('Serializer', () => {
  beforeEach(() => {
    useFloorPlanStore.setState({ floors: [], furnitureId: 0, currentFloor: 0 });
  });

  it('produces a JSON string with floors, furnitureId, wallNodeId, version', () => {
    seedPlan([makeFakeFloor({ wallNodeId: 4 })], 9);
    const out = new Serializer().serialize();
    const parsed = safeParsePlan(out) as Record<string, unknown>;
    expect(parsed.furnitureId).toBe(9);
    expect(parsed.wallNodeId).toBe(4);
    expect(parsed.version).toBe(1);
    expect(Array.isArray(parsed.floors)).toBe(true);
    expect((parsed.floors as unknown[]).length).toBe(1);
  });

  it('round-trips through safeParsePlan + validatePlanShape', () => {
    seedPlan(
      [
        makeFakeFloor({
          wallNodeId: 2,
          floorData: {
            wallNodes: [{ id: 1, x: 10, y: 20 }],
            wallNodeLinks: [[1, []]]
          }
        })
      ],
      0
    );
    const out = new Serializer().serialize();
    const validated = validatePlanShape(safeParsePlan(out));
    expect(validated).not.toBeNull();
    expect(validated?.furnitureId).toBe(0);
    expect(validated?.wallNodeId).toBe(2);
    expect(validated?.floors[0].wallNodes).toEqual([{ id: 1, x: 10, y: 20 }]);
  });

  it('includes every floor in the store', () => {
    seedPlan(
      [
        makeFakeFloor({ wallNodeId: 1 }),
        makeFakeFloor({ wallNodeId: 1 }),
        makeFakeFloor({ wallNodeId: 1 })
      ],
      0
    );
    const parsed = JSON.parse(new Serializer().serialize());
    expect(parsed.floors.length).toBe(3);
  });
});
