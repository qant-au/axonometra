/** the floor plan model — floors, the active floor, and the furniture counter */
import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { EditorInstance } from '../editor/instance/EditorInstance';
import { useInstance } from '../editor/instance/context';
import { Floor } from '../editor/editor/objects/Floor';
import { Furniture } from '../editor/editor/objects/Furniture';
import { Wall } from '../editor/editor/objects/Walls/Wall';
import { WallNode } from '../editor/editor/objects/Walls/WallNode';
import { WallNodeSequence } from '../editor/editor/objects/Walls/WallNodeSequence';
import { FloorPlanSerializable } from '../editor/editor/persistence/FloorPlanSerializable';
import { Point } from '../helpers/Point';
import { FurnitureData } from './FurnitureStore';

export interface FloorPlanStore {
  /**
   * The Floor containers. They are Pixi objects, but they are the model:
   * wall topology and furniture live inside them and are mutated in place by
   * the drag handlers. The store owns the array; `FloorPlan` only renders it.
   */
  floors: Floor[];
  currentFloor: number;
  furnitureId: number;
  visibleLabels: boolean;

  getCurrentFloor: () => Floor;
  changeFloor: (by: number) => void;
  removeFloor: () => void;
  toggleLabels: () => void;
  setPlan: (plan: FloorPlanSerializable) => void;
  reset: () => void;

  // Operations on the active floor.
  addFurniture: (
    obj: FurnitureData,
    attachedTo?: Wall,
    coords?: Point,
    attachedToLeft?: number,
    attachedToRight?: number
  ) => void;
  setFurniturePosition: (
    id: number,
    x: number,
    y: number,
    angle?: number
  ) => void;
  removeFurniture: (id: number) => void;
  /** Alt + drag: leave a copy where the original was. */
  cloneFurniture: (source: Furniture) => Furniture;
  cloneWall: (source: Wall) => Wall | undefined;
  getObject: (id: number) => Furniture | undefined;
  redrawWalls: () => void;
  removeWallNode: (nodeId: number) => void;
  removeWall: (wall: Wall) => void;
  addNodeToWall: (wall: Wall, coords: Point) => WallNode | undefined;
  addNode: (x: number, y: number) => WallNode;
  getWallNodeSeq: () => WallNodeSequence;
  getFurniture: () => Map<number, Furniture>;
}

export function createFloorPlanStore(
  inst: EditorInstance
): StoreApi<FloorPlanStore> {
  return createStore<FloorPlanStore>()((set, get) => ({
    floors: [],
    currentFloor: 0,
    furnitureId: 0,
    visibleLabels: true,

    // Floors are created lazily rather than in the store initialiser: the
    // initialiser runs at import time, and `new Floor()` builds Pixi objects.
    getCurrentFloor: () => {
      const { floors, currentFloor } = get();
      const existing = floors[currentFloor];
      if (existing) return existing;
      const floor = new Floor(inst);
      const next = floors.slice();
      next[currentFloor] = floor;
      set({ floors: next });
      return floor;
    },

    changeFloor: (by: number) => {
      const previous = get().getCurrentFloor();
      const { floors, currentFloor, visibleLabels } = get();
      const target = currentFloor + by;
      // Floor 0 is the ground floor; there is no basement.
      if (target < 0) return;
      // The selection is on the floor being left.
      inst.selection.getState().clear();
      const next = floors.slice();
      if (next[target] == null) {
        next[target] = new Floor(inst, undefined, previous);
      }
      next[target].setLabelVisibility(visibleLabels);
      set({ floors: next, currentFloor: target });
    },

    // removes the current floor
    removeFloor: () => {
      const { floors, currentFloor, visibleLabels } = get();
      if (floors.length < 2) {
        inst.notify({
          title: 'Floor removal not permitted',
          message:
            'This floor is the only floor in the plan. You cannot have a plan with no floors. Create a new floor before deleting.',
          severity: 'error'
        });
        return;
      }
      inst.selection.getState().clear();
      floors[currentFloor]?.reset();
      const next = floors.slice();
      next.splice(currentFloor, 1);
      const target = Math.min(currentFloor, next.length - 1);
      next[target].setLabelVisibility(visibleLabels);
      set({ floors: next, currentFloor: target });
    },

    toggleLabels: () => {
      const visibleLabels = !get().visibleLabels;
      set({ visibleLabels });
      get().getCurrentFloor().setLabelVisibility(visibleLabels);
    },

    // Replaces the whole model from a validated plan. Resets first so the
    // WallNodeSequence id counter is zeroed before the new floors claim ids.
    setPlan: (plan: FloorPlanSerializable) => {
      get().reset();
      const floors = plan.floors.map((floorData) => new Floor(inst, floorData));
      floors[0]?.getWallNodeSequence().setId(plan.wallNodeId);
      set({
        floors,
        furnitureId: plan.furnitureId,
        currentFloor: 0
      });
    },

    // Drops every floor. Called on load and on editor unmount; Floor.reset()
    // also zeroes the wall point id counter.
    reset: () => {
      for (const floor of get().floors) {
        floor.reset();
      }
      set({ floors: [], currentFloor: 0, furnitureId: 0 });
    },

    addFurniture: (
      obj: FurnitureData,
      attachedTo?: Wall,
      coords?: Point,
      attachedToLeft?: number,
      attachedToRight?: number
    ) => {
      const furnitureId = get().furnitureId + 1;
      set({ furnitureId });
      get()
        .getCurrentFloor()
        .addFurniture(
          obj,
          furnitureId,
          attachedTo,
          coords,
          attachedToLeft,
          attachedToRight
        );
    },

    setFurniturePosition: (
      id: number,
      x: number,
      y: number,
      angle?: number
    ) => {
      get().getCurrentFloor().setFurniturePosition(id, x, y, angle);
    },

    cloneFurniture: (source: Furniture) => {
      const furnitureId = get().furnitureId + 1;
      set({ furnitureId });
      return get().getCurrentFloor().cloneFurniture(source, furnitureId);
    },

    cloneWall: (source: Wall) =>
      get()
        .getCurrentFloor()
        .cloneWall(source, () => {
          const furnitureId = get().furnitureId + 1;
          set({ furnitureId });
          return furnitureId;
        }),

    removeFurniture: (id: number) => {
      get().getCurrentFloor().removeFurniture(id);
    },

    getObject: (id: number) => get().getCurrentFloor().getObject(id),

    redrawWalls: () => {
      get().getCurrentFloor().redrawWalls();
    },

    removeWallNode: (nodeId: number) => {
      get().getCurrentFloor().removeWallNode(nodeId);
    },

    removeWall: (wall: Wall) => {
      get().getCurrentFloor().removeWall(wall);
    },

    addNodeToWall: (wall: Wall, coords: Point) =>
      get().getCurrentFloor().addNodeToWall(wall, coords),

    addNode: (x: number, y: number) => get().getCurrentFloor().addNode(x, y),

    getWallNodeSeq: () => get().getCurrentFloor().getWallNodeSequence(),

    getFurniture: () => get().getCurrentFloor().getFurniture()
  }));
}

export function useFloorPlanStore<T>(
  selector: (state: FloorPlanStore) => T
): T {
  return useZustand(useInstance().plan, selector);
}
