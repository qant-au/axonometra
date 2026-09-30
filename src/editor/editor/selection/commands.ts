// The selection commands behind the shared keymap and the context menu:
// select all, delete, nudge, copy, cut, paste, duplicate, and fitting the
// view. Each edit changes the serialised plan (planOps.ts) and rebuilds it,
// as undo does, inside one history step.
import type { EditorInstance } from '../../instance/EditorInstance';
import { METER, TOOLBAR_WIDTH, Tool } from '../constants';
import type { FloorPlanSerializable } from '../persistence/FloorPlanSerializable';
import type { FloorSerializable } from '../persistence/FloorSerializable';
import {
  allRefs,
  buildFragment,
  deleteRefs,
  existingRefs,
  floorBounds,
  freePasteStep,
  freePlaceStep,
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

/**
 * How to show a box of the plan on a screen whose left `left` pixels are
 * covered (the tool bar): the zoom that fits it, with a margin, in what is
 * left, and how many screen pixels right of the screen's centre it goes.
 */
export function fitView(
  box: Rect,
  screen: { width: number; height: number; left: number }
): { scale: number; shift: number } {
  const margin = 0.5 * METER;
  const width = Math.max(box.width, METER) + 2 * margin;
  const height = Math.max(box.height, METER) + 2 * margin;
  const free = Math.max(screen.width - screen.left, 1);
  const scale = Math.min(free / width, screen.height / height);
  return { scale, shift: screen.left / 2 };
}

/** The selection commands of one editor. */
export function createSelectionCommands(inst: EditorInstance) {
  const readPlan = () =>
    JSON.parse(inst.serializer.serialize()) as FloorPlanSerializable;

  const currentFloorIndex = () => inst.plan.getState().currentFloor;

  /** The active floor as data. */
  function currentFloorData(): FloorSerializable | undefined {
    return readPlan().floors[currentFloorIndex()];
  }

  const selected = (): SelectionRef[] => inst.selection.getState().refs;

  // Changes the plan as data and rebuilds it, as one undo step.
  function editPlan<T>(
    fn: (plan: FloorPlanSerializable, floor: number) => T
  ): T {
    return inst.edits.transact(() => {
      const plan = readPlan();
      const floor = currentFloorIndex();
      const result = fn(plan, floor);
      inst.edits.applyPlan(plan, floor);
      return result;
    });
  }

  /** Selecting takes the Select tool, as in Excalidraw. */
  function takeSelectTool() {
    const state = inst.editor.getState();
    if (state.activeTool !== Tool.Edit) state.setTool(Tool.Edit);
  }

  /** After undo, redo or a rebuild, forget what no longer exists. */
  function pruneSelection() {
    const floor = currentFloorData();
    const refs = selected();
    if (!floor || refs.length === 0) return;
    const kept = existingRefs(floor, refs);
    if (kept.length !== refs.length) inst.selection.getState().set(kept);
  }

  function selectAll() {
    const floor = currentFloorData();
    if (!floor) return;
    takeSelectTool();
    inst.selection.getState().set(allRefs(floor));
  }

  function selectRefs(refs: SelectionRef[], add = false) {
    const store = inst.selection.getState();
    store.set(add ? [...store.refs, ...refs] : refs);
  }

  function deleteSelection(): boolean {
    const refs = selected();
    if (refs.length === 0) return false;
    inst.selection.getState().clear();
    editPlan((plan, floor) => deleteRefs(plan.floors[floor], refs));
    return true;
  }

  function nudgeSelection(dx: number, dy: number): boolean {
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

  function copySelection(): boolean {
    const floor = currentFloorData();
    const refs = selected();
    if (!floor || refs.length === 0) return false;
    const fragment = buildFragment(floor, refs);
    if (isEmptyFragment(fragment)) {
      inst.notify({
        message:
          'A door or window is copied with its wall. Select the wall too.',
        severity: 'info'
      });
      return false;
    }
    inst.clipboard = fragment;
    writeSystemClipboard(fragment);
    return true;
  }

  function cutSelection(): boolean {
    if (!copySelection()) return false;
    return deleteSelection();
  }

  const hasClipboard = () => inst.clipboard !== null;

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
    inst.selection.getState().set(added);
  }

  // How many steps the last paste of this clipboard went, so each paste of
  // one copy lands a step further on: three pastes, three visible copies.
  let pastes: { clip: Fragment | null; step: number } = {
    clip: null,
    step: -1
  };

  /**
   * Pastes where it was copied from if that is free (after a Cut), else
   * the first free step down and right of it; in the middle of the view if
   * that is off screen.
   */
  function paste(): boolean {
    const clip = inst.clipboard;
    const floor = currentFloorData();
    if (!clip || !floor) return false;
    if (pastes.clip !== clip) pastes = { clip, step: -1 };
    pastes.step = freePasteStep(floor, clip, pastes.step + 1, COPY_OFFSET);
    let dx = pastes.step * COPY_OFFSET;
    let dy = dx;
    const centre = fragmentCentre(clip);
    const main = inst.main;
    if (centre && main) {
      const x = centre.x + dx;
      const y = centre.y + dy;
      const inView =
        x > main.left && x < main.right && y > main.top && y < main.bottom;
      if (!inView) {
        dx = main.center.x - centre.x;
        dy = main.center.y - centre.y;
      }
    }
    pasteAt(clip, dx, dy);
    return true;
  }

  function duplicateSelection(): boolean {
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
    const main = inst.getMain();
    (
      main.plugins.get('clamp-zoom') as { clamp?: () => void } | null
    )?.clamp?.();
  };

  function zoomBy(factor: number) {
    const main = inst.getMain();
    main.setZoom(main.scale.x * factor, true);
    clampZoom();
  }

  function resetZoom() {
    inst.getMain().setZoom(1, true);
    clampZoom();
  }

  function fitRect(box: Rect | undefined) {
    if (!box) return false;
    const main = inst.getMain();
    const view = fitView(box, {
      width: main.screenWidth,
      height: main.screenHeight,
      left: inst.config.readOnly ? 0 : TOOLBAR_WIDTH
    });
    main.setZoom(view.scale, true);
    clampZoom();
    // The zoom may have been clamped: centre with the scale it ended at.
    const offset = view.shift / main.scale.x;
    main.moveCenter(box.x + box.width / 2 - offset, box.y + box.height / 2);
    return true;
  }

  function fitAll() {
    const floor = currentFloorData();
    return floor ? fitRect(floorBounds(floor)) : false;
  }

  function fitSelection() {
    const floor = currentFloorData();
    const refs = selected();
    if (!floor || refs.length === 0) return false;
    return fitRect(refsBounds(floor, refs));
  }

  /**
   * Where a new item of this size (plan units) goes: the middle of the view,
   * or the first step down and right of it that covers no other item.
   * Returns its top-left corner.
   */
  function freeSpot(width: number, height: number) {
    const main = inst.getMain();
    const box = {
      x: Math.round(main.center.x - width / 2),
      y: Math.round(main.center.y - height / 2),
      width,
      height
    };
    const floor = currentFloorData();
    const d = floor ? freePlaceStep(floor, box, COPY_OFFSET) * COPY_OFFSET : 0;
    return { x: box.x + d, y: box.y + d };
  }

  return {
    currentFloorData,
    freeSpot,
    pruneSelection,
    selectAll,
    selectRefs,
    deleteSelection,
    nudgeSelection,
    copySelection,
    cutSelection,
    paste,
    duplicateSelection,
    zoomBy,
    resetZoom,
    fitAll,
    fitSelection,
    hasClipboard
  };
}

export type SelectionCommands = ReturnType<typeof createSelectionCommands>;
