import {
  isLengthUnit,
  isSceneDocument,
  serializeScene,
  validateScene
} from '../../../vendor/accurona-core';
import { notify } from '../../../vendor/accurona-ui';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { useHistoryStore } from '../../../stores/HistoryStore';
import { DEFAULT_UNITS, useUnitsStore } from '../../../stores/UnitsStore';
import {
  CURRENT_PLAN_VERSION,
  FloorPlanSerializable,
  SUPPORTED_PLAN_VERSIONS,
  safeParsePlan,
  validatePlanShape
} from './FloorPlanSerializable';
import {
  newContext,
  planToScene,
  sceneToPlan,
  SceneContext
} from './sceneFile';

// Reads and writes the floor plan model held in useFloorPlanStore. The
// editor's Pixi containers are not involved: `Floor.serialize()` produces the
// DTO, and `setPlan` rebuilds the floors from one.
//
// Files are Accurona scenes (sceneText, load). Plan v2, the format this
// editor used before, is read on load and never written. The in-memory plan
// text (serialize) is what undo, the 3D view and the glTF export work on.
export class Serializer {
  // The scene the plan was opened from, so a save keeps what Axonometra does
  // not draw. A new or plan v2 document starts from an empty scene.
  private context: SceneContext = newContext();

  /** The file to save: the plan as an Accurona scene. */
  public sceneText(): string {
    const plan = JSON.parse(this.serialize()) as FloorPlanSerializable;
    return serializeScene(planToScene(plan, this.context));
  }

  /** Starts a new, unsaved document. */
  public reset(): void {
    this.context = newContext();
  }

  /** The in-memory plan, not a file: see sceneText. */
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
    // Written only when not the default, like the other optional v2 fields.
    const { units } = useUnitsStore.getState();
    if (units !== DEFAULT_UNITS) floorPlanSerializable.units = units;
    return JSON.stringify(floorPlanSerializable);
  }

  /**
   * Opens a scene, or a plan v2 file (read only; it saves as a scene).
   * Returns true when it loaded; failures are toasted here.
   */
  public load(planText: string | null): boolean {
    if (planText == null || planText === '') {
      notify({
        title: 'Load failed',
        message: 'No plan data to load.',
        severity: 'error'
      });
      return false;
    }
    let raw: unknown;
    try {
      raw = safeParsePlan(planText);
    } catch {
      notify({
        title: 'Load failed',
        message: 'Plan file is not valid JSON.',
        severity: 'error'
      });
      return false;
    }
    if (isSceneDocument(raw)) {
      const result = validateScene(raw);
      if (!result.ok) {
        notify({
          title: 'Load failed',
          message: `Not a valid scene: ${result.errors[0]}`,
          severity: 'error'
        });
        return false;
      }
      const { plan, ctx } = sceneToPlan(result.scene);
      this.apply(plan);
      this.context = ctx;
      return true;
    }
    const plan = validatePlanShape(raw);
    if (!plan) {
      notify({
        title: 'Load failed',
        message: 'Plan file is missing required fields.',
        severity: 'error'
      });
      return false;
    }
    // Every v2 field is optional, so a v1 plan loads as it is. A future
    // version that changes a field's meaning dispatches on version here.
    const version = (raw as { version?: number }).version ?? 1;
    if (!SUPPORTED_PLAN_VERSIONS.includes(version)) {
      notify({
        title: 'Load failed',
        message: `Unsupported plan version: ${version}.`,
        severity: 'error'
      });
      return false;
    }
    this.apply(plan);
    this.context = newContext();
    return true;
  }

  private apply(plan: FloorPlanSerializable) {
    // Before setPlan, so the wall labels it draws are in the plan's units.
    useUnitsStore
      .getState()
      .setUnits(isLengthUnit(plan.units) ? plan.units : DEFAULT_UNITS);
    useFloorPlanStore.getState().setPlan(plan);
    // A loaded plan is a different document; undo must not step back into
    // the one it replaced.
    useHistoryStore.getState().clear();
  }
}

export const serializer = new Serializer();
