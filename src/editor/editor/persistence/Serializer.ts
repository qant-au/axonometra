import { notifications } from '@mantine/notifications';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import {
  FloorPlanSerializable,
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
    const { floors, furnitureId, version } = useFloorPlanStore.getState();

    const floorPlanSerializable = new FloorPlanSerializable();
    floorPlanSerializable.version = version;
    for (const floor of floors) {
      floorPlanSerializable.floors.push(floor.serialize());
    }
    floorPlanSerializable.furnitureId = furnitureId;
    floorPlanSerializable.wallNodeId = floors[0]
      .getWallNodeSequence()
      .getWallNodeId();
    return JSON.stringify(floorPlanSerializable);
  }

  public load(planText: string | null): void {
    if (planText == null || planText === '') {
      notifications.show({
        title: 'Load failed',
        message: 'No plan data to load.',
        color: 'red'
      });
      return;
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
      return;
    }
    const plan = validatePlanShape(raw);
    if (!plan) {
      notifications.show({
        title: 'Load failed',
        message: 'Plan file is missing required fields.',
        color: 'red'
      });
      return;
    }
    // Future schema migrations dispatch on plan.version here.
    const version = (raw as { version?: number }).version ?? 1;
    if (version !== 1) {
      notifications.show({
        title: 'Load failed',
        message: `Unsupported plan version: ${version}.`,
        color: 'red'
      });
      return;
    }
    useFloorPlanStore.getState().setPlan(plan);
  }
}

export const serializer = new Serializer();
