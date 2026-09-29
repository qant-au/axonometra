import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Serializer } from '../persistence/Serializer';
import { FloorSerializable } from '../persistence/FloorSerializable';
import {
  safeParsePlan,
  validatePlanShape
} from '../persistence/FloorPlanSerializable';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { useUnitsStore } from '../../../stores/UnitsStore';
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
    // Always the current version, whatever version was loaded.
    expect(parsed.version).toBe(2);
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

describe('Serializer.load versions', () => {
  const setPlan = vi.fn();
  beforeEach(() => {
    setPlan.mockClear();
    useFloorPlanStore.setState({ setPlan });
  });
  const plan = (version?: number) =>
    JSON.stringify({ version, floors: [], furnitureId: 0, wallNodeId: 0 });

  it('loads version 1 and version 2 plans', () => {
    expect(new Serializer().load(plan(1))).toBe(true);
    expect(new Serializer().load(plan(2))).toBe(true);
    expect(setPlan).toHaveBeenCalledTimes(2);
  });

  it('treats a plan with no version as version 1', () => {
    expect(new Serializer().load(plan())).toBe(true);
  });

  it('refuses a version it does not know', () => {
    expect(new Serializer().load(plan(3))).toBe(false);
    expect(setPlan).not.toHaveBeenCalled();
  });
});

describe('Serializer display units', () => {
  const setPlan = vi.fn();
  beforeEach(() => {
    useFloorPlanStore.setState({ setPlan, floors: [], currentFloor: 0 });
    useUnitsStore.setState({ units: 'mm' });
  });
  const plan = (units?: unknown) =>
    JSON.stringify({
      version: 2,
      units,
      floors: [],
      furnitureId: 0,
      wallNodeId: 0
    });

  it('writes units only when they are not the default', () => {
    seedPlan([makeFakeFloor({ wallNodeId: 0 })], 0);
    const saved = () =>
      (safeParsePlan(new Serializer().serialize()) as Record<string, unknown>)
        .units;
    expect(saved()).toBeUndefined();
    useUnitsStore.setState({ units: 'm' });
    expect(saved()).toBe('m');
  });

  it('restores the units on load, falling back to millimetres', () => {
    new Serializer().load(plan('cm'));
    expect(useUnitsStore.getState().units).toBe('cm');
    new Serializer().load(plan('ft-in'));
    expect(useUnitsStore.getState().units).toBe('ft-in');
    new Serializer().load(plan());
    expect(useUnitsStore.getState().units).toBe('mm');
    useUnitsStore.setState({ units: 'm' });
    new Serializer().load(plan('furlongs'));
    expect(useUnitsStore.getState().units).toBe('mm');
  });
});

describe('Serializer scene files', () => {
  const setPlan = vi.fn();
  beforeEach(() => {
    setPlan.mockClear();
    useFloorPlanStore.setState({ setPlan });
  });

  it('opens a scene and saves back the scene it opened', () => {
    const scene = {
      format: 'accurona-scene',
      version: 1,
      id: 'comms',
      title: 'Comms room',
      objects: [{ id: 'fw', element: 'firewall', props: { ip: '10.0.0.1' } }],
      views: [{ id: 'plan', kind: 'plan', name: 'Plan', floors: [{ id: 'g' }] }]
    };
    const serializer = new Serializer();
    expect(serializer.load(JSON.stringify(scene))).toBe(true);
    expect(setPlan).toHaveBeenCalledTimes(1);
    // The store is mocked, so save what setPlan received.
    const loaded = setPlan.mock.calls[0][0];
    seedPlan(
      loaded.floors.map((f: FloorSerializable) =>
        makeFakeFloor({ wallNodeId: 0, floorData: f })
      ),
      0
    );
    const saved = JSON.parse(serializer.sceneText());
    expect(saved.format).toBe('accurona-scene');
    expect(saved.id).toBe('comms');
    expect(saved.title).toBe('Comms room');
    expect(saved.objects).toEqual([
      { id: 'fw', element: 'firewall', props: { ip: '10.0.0.1' } }
    ]);
    expect(saved.$schema).toMatch(/scene-v1\.json$/);
  });

  it('refuses an invalid scene whole', () => {
    const bad = {
      format: 'accurona-scene',
      version: 1,
      id: 'x',
      objects: [{ id: 'a', colour: 'red' }]
    };
    expect(new Serializer().load(JSON.stringify(bad))).toBe(false);
    expect(setPlan).not.toHaveBeenCalled();
  });

  it('opens a plan v2 file and saves it as a scene', () => {
    const serializer = new Serializer();
    expect(
      serializer.load(
        JSON.stringify({
          version: 2,
          floors: [],
          furnitureId: 0,
          wallNodeId: 0
        })
      )
    ).toBe(true);
    seedPlan([makeFakeFloor({ wallNodeId: 0 })], 0);
    const saved = JSON.parse(serializer.sceneText());
    expect(saved.format).toBe('accurona-scene');
    expect(saved.views[0].kind).toBe('plan');
    expect(saved.floors).toBeUndefined();
  });
});
