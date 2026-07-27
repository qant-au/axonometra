import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FloorSerializable } from '../../editor/editor/persistence/FloorSerializable';
import type { Floor } from '../../editor/editor/objects/Floor';

// Floors are Pixi containers; the store only ever calls a handful of their
// methods, so a plain fake stands in and no Pixi mock is needed.
const showNotification = vi.fn();
vi.mock('@mantine/notifications', () => ({
  notifications: { show: showNotification }
}));

interface FakeFloor {
  reset: ReturnType<typeof vi.fn>;
  setLabelVisibility: ReturnType<typeof vi.fn>;
  previousFloor: Floor | undefined;
  serialize: () => FloorSerializable;
  getWallNodeSequence: () => { setId: ReturnType<typeof vi.fn> };
}

const created: FakeFloor[] = [];
const setIds: number[] = [];

vi.mock('../../editor/editor/objects/Floor', () => ({
  Floor: class {
    reset = vi.fn();
    setLabelVisibility = vi.fn();
    previousFloor: Floor | undefined;
    constructor(_floorData?: FloorSerializable, previousFloor?: Floor) {
      this.previousFloor = previousFloor;
      created.push(this as unknown as FakeFloor);
    }
    serialize() {
      return new FloorSerializable();
    }
    getWallNodeSequence() {
      return {
        setId: vi.fn((id: number) => setIds.push(id))
      };
    }
  }
}));

const { useFloorPlanStore } = await import('../FloorPlanStore');

const initial = useFloorPlanStore.getState();

function state() {
  return useFloorPlanStore.getState();
}

describe('FloorPlanStore', () => {
  beforeEach(() => {
    useFloorPlanStore.setState(initial);
    useFloorPlanStore.setState({
      floors: [],
      currentFloor: 0,
      furnitureId: 0,
      visibleLabels: true
    });
    created.length = 0;
    setIds.length = 0;
    showNotification.mockClear();
  });

  it('starts empty on floor 0 with no furniture ids issued', () => {
    expect(state().floors).toEqual([]);
    expect(state().currentFloor).toBe(0);
    expect(state().furnitureId).toBe(0);
  });

  it('getCurrentFloor lazily creates the active floor exactly once', () => {
    const first = state().getCurrentFloor();
    const second = state().getCurrentFloor();
    expect(first).toBe(second);
    expect(created.length).toBe(1);
    expect(state().floors.length).toBe(1);
  });

  it('changeFloor(1) creates the next floor from the previous one', () => {
    const ground = state().getCurrentFloor();
    state().changeFloor(1);
    expect(state().currentFloor).toBe(1);
    expect(state().floors.length).toBe(2);
    expect((state().floors[1] as unknown as FakeFloor).previousFloor).toBe(
      ground
    );
  });

  it('changeFloor(-1) below the ground floor is refused', () => {
    state().getCurrentFloor();
    state().changeFloor(-1);
    expect(state().currentFloor).toBe(0);
    expect(state().floors.length).toBe(1);
  });

  it('changeFloor back down reuses the existing floor', () => {
    state().getCurrentFloor();
    state().changeFloor(1);
    const upper = state().floors[1];
    state().changeFloor(-1);
    expect(state().currentFloor).toBe(0);
    state().changeFloor(1);
    expect(state().floors[1]).toBe(upper);
    expect(state().floors.length).toBe(2);
  });

  it('removeFloor refuses to delete the only floor', () => {
    state().getCurrentFloor();
    state().removeFloor();
    expect(state().floors.length).toBe(1);
    expect(showNotification).toHaveBeenCalledOnce();
  });

  it('removeFloor drops the active floor and steps down', () => {
    state().getCurrentFloor();
    state().changeFloor(1);
    const removed = state().floors[1] as unknown as FakeFloor;
    state().removeFloor();
    expect(state().floors.length).toBe(1);
    expect(state().currentFloor).toBe(0);
    expect(removed.reset).toHaveBeenCalledOnce();
  });

  it('addFurniture issues monotonically increasing ids', () => {
    const floor = state().getCurrentFloor() as unknown as {
      addFurniture: ReturnType<typeof vi.fn>;
    };
    floor.addFurniture = vi.fn();
    const obj = { width: 1, height: 1, imagePath: 'x.png' };
    state().addFurniture(obj);
    state().addFurniture(obj);
    expect(state().furnitureId).toBe(2);
    expect(floor.addFurniture).toHaveBeenNthCalledWith(
      1,
      obj,
      1,
      undefined,
      undefined,
      undefined,
      undefined
    );
    expect(floor.addFurniture).toHaveBeenNthCalledWith(
      2,
      obj,
      2,
      undefined,
      undefined,
      undefined,
      undefined
    );
  });

  it('toggleLabels flips the flag and pushes it to the active floor', () => {
    const floor = state().getCurrentFloor() as unknown as FakeFloor;
    state().toggleLabels();
    expect(state().visibleLabels).toBe(false);
    expect(floor.setLabelVisibility).toHaveBeenCalledWith(false);
    state().toggleLabels();
    expect(state().visibleLabels).toBe(true);
  });

  it('reset drops every floor and zeroes the counters', () => {
    const ground = state().getCurrentFloor() as unknown as FakeFloor;
    state().changeFloor(1);
    const upper = state().floors[1] as unknown as FakeFloor;
    useFloorPlanStore.setState({ furnitureId: 7 });

    state().reset();

    expect(ground.reset).toHaveBeenCalledOnce();
    expect(upper.reset).toHaveBeenCalledOnce();
    expect(state().floors).toEqual([]);
    expect(state().currentFloor).toBe(0);
    expect(state().furnitureId).toBe(0);
  });

  it('setPlan resets first, then rebuilds the floors and restores the ids', () => {
    const stale = state().getCurrentFloor() as unknown as FakeFloor;

    const plan = {
      version: 1,
      floors: [new FloorSerializable(), new FloorSerializable()],
      furnitureId: 12,
      wallNodeId: 34
    };
    state().setPlan(plan);

    expect(stale.reset).toHaveBeenCalledOnce();
    expect(state().floors.length).toBe(2);
    expect(state().currentFloor).toBe(0);
    expect(state().furnitureId).toBe(12);
    expect(setIds).toEqual([34]);
  });

  it('setPlan tolerates a plan with no floors', () => {
    state().setPlan({
      version: 1,
      floors: [],
      furnitureId: 0,
      wallNodeId: 0
    });
    expect(state().floors).toEqual([]);
    // the next read materialises a fresh ground floor
    expect(state().getCurrentFloor()).toBeDefined();
  });
});
