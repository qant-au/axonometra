import { notifications } from '@mantine/notifications';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { useHistoryStore } from '../../../stores/HistoryStore';
import {
  CURRENT_PLAN_VERSION,
  FloorPlanSerializable,
  SUPPORTED_PLAN_VERSIONS,
  safeParsePlan,
  validatePlanShape
} from './FloorPlanSerializable';

// Reads and writes the floor plan model held in useFloorPlanStore. The
// editor's Pixi containers are not involved: `Floor.serialize()` produces the
// DTO, and `setPlan` rebuilds the floors from one.
export class Serializer {
  public serialize(): string {
    // Materialise the active floor so a never-touched plan still serialises
    // to a valid single-floor document.
    useFloorPlanStore.getState().getCurrentFloor();
    const { floors, furnitureId } = useFloorPlanStore.getState();

    const floorPlanSerializable = new FloorPlanSerializable();
    // Always the current version: a v1 plan re-saves as v2, with its v2
    // fields filled in from the editor.
    floorPlanSerializable.version = CURRENT_PLAN_VERSION;
    for (const floor of floors) {
      floorPlanSerializable.floors.push(floor.serialize());
    }
    floorPlanSerializable.furnitureId = furnitureId;
    floorPlanSerializable.wallNodeId = floors[0]
      .getWallNodeSequence()
      .getWallNodeId();
    return JSON.stringify(floorPlanSerializable);
  }

  /** Returns true when the plan was loaded; failures are toasted here. */
  public load(planText: string | null): boolean {
    if (planText == null || planText === '') {
      notifications.show({
        title: 'Load failed',
        message: 'No plan data to load.',
        color: 'red'
      });
      return false;
    }
    let raw: unknown;
    try {
      raw = safeParsePlan(planText);
    } catch {
      notifications.show({
        title: 'Load failed',
        message: 'Plan file is not valid JSON.',
        color: 'red'
      });
      return false;
    }
    const plan = validatePlanShape(raw);
    if (!plan) {
      notifications.show({
        title: 'Load failed',
        message: 'Plan file is missing required fields.',
        color: 'red'
      });
      return false;
    }
    // Every v2 field is optional, so a v1 plan loads as it is. A future
    // version that changes a field's meaning dispatches on version here.
    const version = (raw as { version?: number }).version ?? 1;
    if (!SUPPORTED_PLAN_VERSIONS.includes(version)) {
      notifications.show({
        title: 'Load failed',
        message: `Unsupported plan version: ${version}.`,
        color: 'red'
      });
      return false;
    }
    useFloorPlanStore.getState().setPlan(plan);
    // A loaded plan is a different document; undo must not step back into
    // the one it replaced.
    useHistoryStore.getState().clear();
    return true;
  }
}

export const serializer = new Serializer();
