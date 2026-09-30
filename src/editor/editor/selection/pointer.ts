// Pointer glue for the selection: what a click does to it, and the
// right-click menu, which opens on release only if the mouse did not move
// (a right drag pans the plan, as it always has).
import type { FederatedPointerEvent } from 'pixi.js';
import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { EditorInstance } from '../../instance/EditorInstance';
import { useInstance } from '../../instance/context';
import { Tool } from '../constants';
import type { SelectionRef } from './planOps';

export interface ContextMenuState {
  x: number;
  y: number;
  /** What was right-clicked; null for the empty plan. */
  ref: SelectionRef | null;
}

export interface ContextMenuStore {
  menu: ContextMenuState | null;
  open: (menu: ContextMenuState) => void;
  close: () => void;
}

export function createContextMenuStore(): StoreApi<ContextMenuStore> {
  return createStore<ContextMenuStore>()((set) => ({
    menu: null,
    open: (menu) => set({ menu }),
    close: () => set({ menu: null })
  }));
}

export function useContextMenuStore<T>(
  selector: (state: ContextMenuStore) => T
): T {
  return useZustand(useInstance().contextMenu, selector);
}

// Further than this between press and release is a pan, not a click.
const CLICK_SLOP = 5;

export interface PointerGlue {
  /** Click selects; Shift + click adds or takes out. */
  pressSelect(ref: SelectionRef, shift: boolean): void;
  /** Called from a right press on the plan or on something on it. */
  rightPressed(ref: SelectionRef | null, ev: FederatedPointerEvent): void;
  /** window pointerup: opens the menu if the right button came up where it went down. */
  rightReleased: (ev: PointerEvent) => void;
}

export function createPointerGlue(inst: EditorInstance): PointerGlue {
  let pending: ContextMenuState | null = null;
  return {
    pressSelect(ref, shift) {
      const store = inst.selection.getState();
      if (shift) store.toggle(ref);
      else store.set([ref]);
    },
    rightPressed(ref, ev) {
      pending = { x: ev.client.x, y: ev.client.y, ref };
    },
    rightReleased: (ev) => {
      if (ev.button !== 2 || !pending) return;
      const press = pending;
      pending = null;
      if (Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > CLICK_SLOP) {
        return;
      }
      // The menu acts on the selection, so what was right-clicked joins it,
      // as in Excalidraw, with the Select tool.
      if (press.ref && !inst.config.readOnly) {
        const store = inst.selection.getState();
        if (!store.has(press.ref)) {
          inst.editor.getState().setTool(Tool.Edit);
          store.set([press.ref]);
        }
      }
      inst.contextMenu
        .getState()
        .open({ ...press, x: ev.clientX, y: ev.clientY });
    }
  };
}
