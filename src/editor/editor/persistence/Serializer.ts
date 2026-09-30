import {
  isLengthUnit,
  isSceneDocument,
  serializeScene,
  validateScene,
  type Scene
} from '@accurona/core';
import { DEFAULT_UNITS } from '../../../stores/UnitsStore';
import type { EditorInstance } from '../../instance/EditorInstance';
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

// Reads and writes one editor's floor plan model (its plan store). The
// editor's Pixi containers are not involved: `Floor.serialize()` produces the
// DTO, and `setPlan` rebuilds the floors from one.
//
// Files are Accurona scenes (sceneText, load). Plan v2, the format this
// editor used before, is read on load and never written. The in-memory plan
// text (serialize) is what undo, the 3D view and the glTF export work on.
export class Serializer {
  constructor(private readonly inst: EditorInstance) {}

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

  // --- lw-055: crossover with the network diagram -----------------------

  /** The scene the plan was opened from: diagram views and all. */
  public openedScene(): Scene {
    return this.context.opened;
  }

  /** The scene object a furniture item is, once it has one. */
  public objectIdOf(furnitureId: number): string | undefined {
    return this.context.objectIds.get(furnitureId);
  }

  /** Whether a scene object is already on this plan, as some item. */
  public isOnPlan(objectId: string): boolean {
    return [...this.context.objectIds.values()].includes(objectId);
  }

  /**
   * Makes a new furniture item the scene object it was placed as (a device
   * from the network diagram), so the plan and the diagram share one object.
   */
  public linkFurniture(furnitureId: number, objectId: string): void {
    this.context.objectIds.set(furnitureId, objectId);
  }

  /** Forgets any object a now-reissued furniture id was linked to. */
  public forgetFurniture(furnitureId: number): void {
    this.context.objectIds.delete(furnitureId);
  }

  /** The in-memory plan, not a file: see sceneText. */
  public serialize(): string {
    // Materialise the active floor so a never-touched plan still serialises
    // to a valid single-floor document.
    this.inst.plan.getState().getCurrentFloor();
    const { floors, furnitureId } = this.inst.plan.getState();

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
    const { units } = this.inst.units.getState();
    if (units !== DEFAULT_UNITS) floorPlanSerializable.units = units;
    return JSON.stringify(floorPlanSerializable);
  }

  /**
   * Opens a scene, or a plan v2 file (read only; it saves as a scene).
   * Returns true when it loaded; failures are toasted here.
   */
  public load(planText: string | null): boolean {
    if (planText == null || planText === '') {
      this.inst.notify({
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
      this.inst.notify({
        title: 'Load failed',
        message: 'Plan file is not valid JSON.',
        severity: 'error'
      });
      return false;
    }
    if (isSceneDocument(raw)) {
      const result = validateScene(raw);
      if (!result.ok) {
        this.inst.notify({
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
      this.inst.notify({
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
      this.inst.notify({
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
    this.inst.units
      .getState()
      .setUnits(isLengthUnit(plan.units) ? plan.units : DEFAULT_UNITS);
    this.inst.plan.getState().setPlan(plan);
    // A loaded plan is a different document; undo must not step back into
    // the one it replaced.
    this.inst.history.getState().clear();
  }
}
