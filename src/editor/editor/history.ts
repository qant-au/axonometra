// Undo/redo for the floor plan.
//
// The model lives inside live Pixi objects (Floor, WallNodeSequence, Wall,
// Furniture) that drag handlers mutate in place, so there is no per-operation
// inverse to replay. History works on whole-plan snapshots instead: the
// Serializer's JSON plus the active floor. An edit records the snapshot taken
// before it; undo rebuilds the plan from that snapshot via setPlan.
//
// An edit is either a canvas pointer gesture (pointerdown → pointerup, which
// covers every click tool and every drag) or a `transact()` block for edits
// that start outside the canvas (toolbar, furniture drawer, async catalog
// lookups). Nothing is recorded unless the plan actually changed.
//
// Each editor has its own history (EditorInstance.edits).
import type { Snapshot } from '../../stores/HistoryStore';
import type { EditorInstance } from '../instance/EditorInstance';
import type { FloorPlanSerializable } from './persistence/FloorPlanSerializable';

export interface EditHistory {
  snapshot(): Snapshot;
  /** Run an edit as one undo step. Nested calls fold into the outermost. */
  transact<T>(fn: () => T): T;
  /** Bound, so it can be an event listener. */
  beginGesture: () => void;
  /** Bound, so it can be an event listener. */
  endGesture: () => void;
  /**
   * Rebuilds the whole plan from data, keeping the active floor. Undo uses
   * it, and so do the selection edits (paste, delete, nudge), which change
   * the serialised plan and hand it back here.
   */
  applyPlan(plan: FloorPlanSerializable, floor: number): void;
  undo(): boolean;
  redo(): boolean;
  /** Forget all history, e.g. when a different plan is loaded. */
  reset(): void;
}

export function createEditHistory(inst: EditorInstance): EditHistory {
  let depth = 0;
  let before: Snapshot | undefined;
  let gestureOpen = false;

  const snapshot = (): Snapshot => ({
    plan: inst.serializer.serialize(),
    currentFloor: inst.plan.getState().currentFloor
  });

  const open = () => {
    if (depth++ === 0) before = snapshot();
  };

  const close = () => {
    if (depth === 0) return;
    if (--depth > 0) return;
    const start = before;
    before = undefined;
    if (start && start.plan !== inst.serializer.serialize()) {
      inst.history.getState().push(start);
    }
  };

  const applyPlan = (plan: FloorPlanSerializable, floor: number) => {
    // Anything holding a reference into the old floors goes stale.
    inst.addWallManager.resetTools();
    inst.plan.getState().setPlan(plan);
    const { floors, visibleLabels } = inst.plan.getState();
    const currentFloor = Math.max(0, Math.min(floor, floors.length - 1));
    inst.plan.setState({ currentFloor });
    floors[currentFloor]?.setLabelVisibility(visibleLabels);
  };

  const restore = (target: Snapshot) =>
    applyPlan(
      JSON.parse(target.plan) as FloorPlanSerializable,
      target.currentFloor
    );

  return {
    snapshot,
    transact<T>(fn: () => T): T {
      open();
      try {
        return fn();
      } finally {
        close();
      }
    },
    // A lost pointerup (window blur mid-drag) must not leave a gesture
    // half-open forever, so gestures use a flag rather than stacking on
    // `depth`.
    beginGesture: () => {
      if (gestureOpen) return;
      gestureOpen = true;
      open();
    },
    endGesture: () => {
      if (!gestureOpen) return;
      gestureOpen = false;
      close();
    },
    applyPlan,
    undo() {
      if (depth > 0) return false;
      const target = inst.history.getState().takeUndo(snapshot());
      if (!target) return false;
      restore(target);
      return true;
    },
    redo() {
      if (depth > 0) return false;
      const target = inst.history.getState().takeRedo(snapshot());
      if (!target) return false;
      restore(target);
      return true;
    },
    reset() {
      depth = 0;
      before = undefined;
      gestureOpen = false;
      inst.history.getState().clear();
    }
  };
}
