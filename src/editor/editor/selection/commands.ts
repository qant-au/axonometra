// The selection commands behind the shared keymap and the context menu:
// select all, delete, nudge, copy, cut, paste, duplicate, and fitting the
// view. Each edit changes the serialised plan (planOps.ts) and rebuilds it,
// as undo does, inside one history step.
import { notify } from '../../../vendor/accurona-ui';
import { getMain } from '../../EditorRoot';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { useStore } from '../../../stores/EditorStore';
import { METER, Tool } from '../constants';
import { applyPlan, transact } from '../history';
import type { FloorPlanSerializable } from '../persistence/FloorPlanSerializable';
import type { FloorSerializable } from '../persistence/FloorSerializable';
import { serializer } from '../persistence/Serializer';
import { useSelectionStore } from './SelectionStore';
import {
  allRefs,
  buildFragment,
  deleteRefs,
  existingRefs,
  floorBounds,
  furnitureCorners,
  isEmptyFragment,
  moveRefs,
  pasteFragment,
  refsBounds,
  type Fragment,
  type Rect,
  type SelectionRef
} from './planOps';

/** Paste and Duplicate step a copy this far from what it came from. */
export const COPY_OFFSET = 0.5 * METER;
/** One arrow press moves the selection 10 cm; with Shift, a metre. */
export const NUDGE_STEP = 10;
export const NUDGE_STEP_LARGE = METER;

let clipboard: Fragment | null = null;

const readPlan = () =>
  JSON.parse(serializer.serialize()) as FloorPlanSerializable;

const currentFloorIndex = () => useFloorPlanStore.getState().currentFloor;

/** The active floor as data. */
export function currentFloorData(): FloorSerializable | undefined {
  return readPlan().floors[currentFloorIndex()];
}

const selected = (): SelectionRef[] => useSelectionStore.getState().refs;

// Changes the plan as data and rebuilds it, as one undo step.
function editPlan<T>(fn: (plan: FloorPlanSerializable, floor: number) => T): T {
  return transact(() => {
    const plan = readPlan();
    const floor = currentFloorIndex();
    const result = fn(plan, floor);
    applyPlan(plan, floor);
    return result;
  });
}

/** Selecting takes the Select tool, as in Excalidraw. */
function takeSelectTool() {
  const state = useStore.getState();
  if (state.activeTool !== Tool.Edit) state.setTool(Tool.Edit);
}

/** After undo, redo or a rebuild, forget what no longer exists. */
export function pruneSelection() {
  const floor = currentFloorData();
  const refs = selected();
  if (!floor || refs.length === 0) return;
  const kept = existingRefs(floor, refs);
  if (kept.length !== refs.length) useSelectionStore.getState().set(kept);
}

export function selectAll() {
  const floor = currentFloorData();
  if (!floor) return;
  takeSelectTool();
  useSelectionStore.getState().set(allRefs(floor));
}

export function selectRefs(refs: SelectionRef[], add = false) {
  const store = useSelectionStore.getState();
  store.set(add ? [...store.refs, ...refs] : refs);
}

export function deleteSelection(): boolean {
  const refs = selected();
  if (refs.length === 0) return false;
  useSelectionStore.getState().clear();
  editPlan((plan, floor) => deleteRefs(plan.floors[floor], refs));
  return true;
}

export function nudgeSelection(dx: number, dy: number): boolean {
  const refs = selected();
  if (refs.length === 0) return false;
  editPlan((plan, floor) => moveRefs(plan.floors[floor], refs, dx, dy));
  return true;
}

function writeSystemClipboard(fragment: Fragment) {
  // A courtesy, so a copy can be seen outside the editor. The copy in
  // memory is what Paste reads.
  try {
    void navigator.clipboard
      ?.writeText(JSON.stringify({ axonometra: 'fragment', ...fragment }))
      .catch(() => undefined);
  } catch {
    // Not allowed here; the copy in memory still works.
  }
}

export function copySelection(): boolean {
  const floor = currentFloorData();
  const refs = selected();
  if (!floor || refs.length === 0) return false;
  const fragment = buildFragment(floor, refs);
  if (isEmptyFragment(fragment)) {
    notify({
      message: 'A door or window is copied with its wall. Select the wall too.',
      severity: 'info'
    });
    return false;
  }
  clipboard = fragment;
  writeSystemClipboard(fragment);
  return true;
}

export function cutSelection(): boolean {
  if (!copySelection()) return false;
  return deleteSelection();
}

export const hasClipboard = () => clipboard !== null;

// The middle of a fragment, to put it under the pointer.
function fragmentCentre(fragment: Fragment) {
  const floor: FloorSerializable = {
    wallNodes: fragment.nodes,
    wallNodeLinks: [],
    furnitureArray: []
  };
  const points = [
    ...fragment.nodes,
    ...fragment.furniture
      .filter((f) => f.attachedToLeft == null)
      .flatMap((f) => furnitureCorners(floor, f))
  ];
  if (points.length === 0) return undefined;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2
  };
}

function pasteAt(fragment: Fragment, dx: number, dy: number) {
  const added = editPlan((plan, floor) =>
    pasteFragment(plan, floor, fragment, dx, dy)
  );
  takeSelectTool();
  useSelectionStore.getState().set(added);
}

/** Pastes under the pointer when it is over the plan, else beside the original. */
export function paste(): boolean {
  if (!clipboard) return false;
  const main = getMain();
  const pointer = main.pointer?.position;
  const centre = fragmentCentre(clipboard);
  const onScreen =
    pointer &&
    pointer.x > main.left &&
    pointer.x < main.right &&
    pointer.y > main.top &&
    pointer.y < main.bottom;
  if (centre && onScreen) {
    pasteAt(clipboard, pointer.x - centre.x, pointer.y - centre.y);
  } else {
    pasteAt(clipboard, COPY_OFFSET, COPY_OFFSET);
  }
  return true;
}

export function duplicateSelection(): boolean {
  const floor = currentFloorData();
  const refs = selected();
  if (!floor || refs.length === 0) return false;
  const fragment = buildFragment(floor, refs);
  if (isEmptyFragment(fragment)) return false;
  pasteAt(fragment, COPY_OFFSET, COPY_OFFSET);
  return true;
}

// --- the view ---------------------------------------------------------------

const clampZoom = () => {
  const main = getMain();
  (main.plugins.get('clamp-zoom') as { clamp?: () => void } | null)?.clamp?.();
};

export function zoomBy(factor: number) {
  const main = getMain();
  main.setZoom(main.scale.x * factor, true);
  clampZoom();
}

export function resetZoom() {
  getMain().setZoom(1, true);
  clampZoom();
}

function fitRect(box: Rect | undefined) {
  if (!box) return false;
  const main = getMain();
  const margin = 0.5 * METER;
  const width = Math.max(box.width, METER) + 2 * margin;
  const height = Math.max(box.height, METER) + 2 * margin;
  main.fit(false, width, height);
  clampZoom();
  main.moveCenter(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}

export function fitAll() {
  const floor = currentFloorData();
  return floor ? fitRect(floorBounds(floor)) : false;
}

export function fitSelection() {
  const floor = currentFloorData();
  const refs = selected();
  if (!floor || refs.length === 0) return false;
  return fitRect(refsBounds(floor, refs));
}
