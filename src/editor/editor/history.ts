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
import { useFloorPlanStore } from '../../stores/FloorPlanStore';
import { Snapshot, useHistoryStore } from '../../stores/HistoryStore';
import { AddWallManager } from './actions/AddWallManager';
import { FloorPlanSerializable } from './persistence/FloorPlanSerializable';
import { serializer } from './persistence/Serializer';

let depth = 0;
let before: Snapshot | undefined;
let gestureOpen = false;

export function snapshot(): Snapshot {
  return {
    plan: serializer.serialize(),
    currentFloor: useFloorPlanStore.getState().currentFloor
  };
}

function open() {
  if (depth++ === 0) before = snapshot();
}

function close() {
  if (depth === 0) return;
  if (--depth > 0) return;
  const start = before;
  before = undefined;
  if (start && start.plan !== serializer.serialize()) {
    useHistoryStore.getState().push(start);
  }
}

/** Run an edit as one undo step. Nested calls fold into the outermost. */
export function transact<T>(fn: () => T): T {
  open();
  try {
    return fn();
  } finally {
    close();
  }
}

// A lost pointerup (window blur mid-drag) must not leave a gesture half-open
// forever, so gestures use a flag rather than stacking on `depth`.
export function beginGesture() {
  if (gestureOpen) return;
  gestureOpen = true;
  open();
}

export function endGesture() {
  if (!gestureOpen) return;
  gestureOpen = false;
  close();
}

/**
 * Rebuilds the whole plan from data, keeping the active floor. Undo uses it,
 * and so do the selection edits (paste, delete, nudge), which change the
 * serialised plan and hand it back here.
 */
export function applyPlan(plan: FloorPlanSerializable, floor: number) {
  // Anything holding a reference into the old floors goes stale.
  AddWallManager.Instance.resetTools();
  useFloorPlanStore.getState().setPlan(plan);
  const { floors, visibleLabels } = useFloorPlanStore.getState();
  const currentFloor = Math.max(0, Math.min(floor, floors.length - 1));
  useFloorPlanStore.setState({ currentFloor });
  floors[currentFloor]?.setLabelVisibility(visibleLabels);
}

function restore(target: Snapshot) {
  applyPlan(
    JSON.parse(target.plan) as FloorPlanSerializable,
    target.currentFloor
  );
}

export function undo(): boolean {
  if (depth > 0) return false;
  const target = useHistoryStore.getState().takeUndo(snapshot());
  if (!target) return false;
  restore(target);
  return true;
}

export function redo(): boolean {
  if (depth > 0) return false;
  const target = useHistoryStore.getState().takeRedo(snapshot());
  if (!target) return false;
  restore(target);
  return true;
}

/** Forget all history, e.g. when a different plan is loaded. */
export function resetHistory() {
  depth = 0;
  before = undefined;
  gestureOpen = false;
  useHistoryStore.getState().clear();
}
