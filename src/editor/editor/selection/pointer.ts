// Pointer glue for the selection: what a click does to it, and the
// right-click menu, which opens on release only if the mouse did not move
// (a right drag pans the plan, as it always has).
import type { FederatedPointerEvent } from 'pixi.js';
import { create } from 'zustand';
import { useSelectionStore } from './SelectionStore';
import { useStore } from '../../../stores/EditorStore';
import { embedConfig } from '../../../embed/embedConfig';
import { Tool } from '../constants';
import type { SelectionRef } from './planOps';

/** Click selects; Shift + click adds or takes out. */
export function pressSelect(ref: SelectionRef, shift: boolean) {
  const store = useSelectionStore.getState();
  if (shift) store.toggle(ref);
  else store.set([ref]);
}

export interface ContextMenuState {
  x: number;
  y: number;
  /** What was right-clicked; null for the empty plan. */
  ref: SelectionRef | null;
}

export const useContextMenuStore = create<{
  menu: ContextMenuState | null;
  open: (menu: ContextMenuState) => void;
  close: () => void;
}>()((set) => ({
  menu: null,
  open: (menu) => set({ menu }),
  close: () => set({ menu: null })
}));

// Further than this between press and release is a pan, not a click.
const CLICK_SLOP = 5;

let pending: ContextMenuState | null = null;

/** Called from a right press on the plan or on something on it. */
export function rightPressed(
  ref: SelectionRef | null,
  ev: FederatedPointerEvent
) {
  pending = { x: ev.client.x, y: ev.client.y, ref };
}

/** window pointerup: opens the menu if the right button came up where it went down. */
export function rightReleased(ev: PointerEvent) {
  if (ev.button !== 2 || !pending) return;
  const press = pending;
  pending = null;
  if (Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > CLICK_SLOP) {
    return;
  }
  // The menu acts on the selection, so what was right-clicked joins it, as
  // in Excalidraw, with the Select tool.
  if (press.ref && !embedConfig.readonly) {
    const store = useSelectionStore.getState();
    if (!store.has(press.ref)) {
      useStore.getState().setTool(Tool.Edit);
      store.set([press.ref]);
    }
  }
  useContextMenuStore
    .getState()
    .open({ ...press, x: ev.clientX, y: ev.clientY });
}
