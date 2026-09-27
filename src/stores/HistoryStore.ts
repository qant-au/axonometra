/** undo/redo stacks for the floor plan — data only; see editor/history.ts */
import { create } from 'zustand';

/** A serialized plan plus the floor that was active when it was taken. */
export interface Snapshot {
  plan: string;
  currentFloor: number;
}

// Plans are small JSON documents, but an unbounded stack still grows for the
// life of a session. 100 steps is well past what anyone walks back through.
export const HISTORY_LIMIT = 100;

export interface HistoryStore {
  past: Snapshot[];
  future: Snapshot[];
  /** Record the state before an edit. A new edit invalidates the redo stack. */
  push: (before: Snapshot) => void;
  /** Move one step back: returns the snapshot to restore, or undefined. */
  takeUndo: (current: Snapshot) => Snapshot | undefined;
  /** Move one step forward: returns the snapshot to restore, or undefined. */
  takeRedo: (current: Snapshot) => Snapshot | undefined;
  clear: () => void;
}

export const useHistoryStore = create<HistoryStore>()((set, get) => ({
  past: [],
  future: [],

  push: (before: Snapshot) =>
    set((s) => ({
      past: [...s.past, before].slice(-HISTORY_LIMIT),
      future: []
    })),

  takeUndo: (current: Snapshot) => {
    const { past, future } = get();
    const previous = past[past.length - 1];
    if (!previous) return undefined;
    set({ past: past.slice(0, -1), future: [...future, current] });
    return previous;
  },

  takeRedo: (current: Snapshot) => {
    const { past, future } = get();
    const next = future[future.length - 1];
    if (!next) return undefined;
    set({ past: [...past, current], future: future.slice(0, -1) });
    return next;
  },

  clear: () => set({ past: [], future: [] })
}));
