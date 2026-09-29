// What is selected on the plan, by id. Ids survive the plan being rebuilt
// (undo, paste, delete all rebuild it from data), where the Pixi objects do
// not, so nothing here holds a display object.
import { create } from 'zustand';
import { refKey, type SelectionRef } from './planOps';

export interface SelectionStore {
  refs: SelectionRef[];
  set: (refs: SelectionRef[]) => void;
  /** Shift + click: add it, or take it out if it is already in. */
  toggle: (ref: SelectionRef) => void;
  clear: () => void;
  has: (ref: SelectionRef) => boolean;
}

export const useSelectionStore = create<SelectionStore>()((set, get) => ({
  refs: [],
  set: (refs) => {
    const seen = new Set<string>();
    set({
      refs: refs.filter((ref) => {
        const key = refKey(ref);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    });
  },
  toggle: (ref) => {
    const key = refKey(ref);
    const { refs } = get();
    const without = refs.filter((r) => refKey(r) !== key);
    set({ refs: without.length === refs.length ? [...refs, ref] : without });
  },
  clear: () => {
    if (get().refs.length > 0) set({ refs: [] });
  },
  has: (ref) => {
    const key = refKey(ref);
    return get().refs.some((r) => refKey(r) === key);
  }
}));
