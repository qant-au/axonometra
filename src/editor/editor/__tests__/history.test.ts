import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistoryStore } from '../../../stores/HistoryStore';
import type { EditorInstance } from '../../instance/EditorInstance';
import { createEditHistory } from '../history';

const useHistoryStore = createHistoryStore();

// The plan is modelled as a string the Serializer "reads", and setPlan as a
// write-back into that string, so the tests exercise history.ts alone: no
// Pixi, no Floor containers.
const plan = vi.hoisted(() => ({
  current: 'A',
  currentFloor: 0,
  floorCount: 1,
  setPlan: vi.fn(),
  resetTools: vi.fn(),
  setLabelVisibility: vi.fn()
}));

// The editor the history belongs to, with the plan as that string.
const inst = {
  serializer: { serialize: () => plan.current },
  addWallManager: { resetTools: plan.resetTools },
  history: useHistoryStore,
  plan: {
    getState: () => ({
      currentFloor: plan.currentFloor,
      visibleLabels: true,
      floors: Array.from({ length: plan.floorCount }, () => ({
        setLabelVisibility: plan.setLabelVisibility
      })),
      setPlan: (p: { id: string; floors: number }) => {
        plan.setPlan(p);
        plan.current = JSON.stringify(p);
        plan.floorCount = p.floors;
        plan.currentFloor = 0;
      }
    }),
    setState: (s: { currentFloor: number }) => {
      plan.currentFloor = s.currentFloor;
    }
  }
} as unknown as EditorInstance;

const {
  beginGesture,
  endGesture,
  redo,
  reset: resetHistory,
  transact,
  undo
} = createEditHistory(inst);

// Plans in these tests are JSON so restore() can parse them back.
const doc = (id: string, floors = 1) => JSON.stringify({ id, floors });

describe('history', () => {
  beforeEach(() => {
    resetHistory();
    plan.current = doc('A');
    plan.currentFloor = 0;
    plan.floorCount = 1;
    vi.clearAllMocks();
  });

  it('records one step per transaction that changes the plan', () => {
    transact(() => {
      plan.current = doc('B');
    });
    expect(useHistoryStore.getState().past.map((s) => s.plan)).toEqual([
      doc('A')
    ]);
  });

  it('records nothing when the plan did not change', () => {
    transact(() => undefined);
    beginGesture();
    endGesture();
    expect(useHistoryStore.getState().past).toEqual([]);
  });

  it('folds nested transactions and a gesture into one step', () => {
    beginGesture();
    transact(() => {
      plan.current = doc('B');
      transact(() => {
        plan.current = doc('C');
      });
    });
    endGesture();
    expect(useHistoryStore.getState().past.map((s) => s.plan)).toEqual([
      doc('A')
    ]);
  });

  it('ignores a pointerup with no matching pointerdown, and a repeated pointerdown', () => {
    endGesture();
    beginGesture();
    beginGesture();
    plan.current = doc('B');
    endGesture();
    expect(useHistoryStore.getState().past).toHaveLength(1);
    // The gesture is closed, so a later transaction records on its own.
    transact(() => {
      plan.current = doc('C');
    });
    expect(useHistoryStore.getState().past).toHaveLength(2);
  });

  it('undo and redo restore the plan, the active floor, and reset the tools', () => {
    plan.current = doc('A', 2);
    plan.floorCount = 2;
    plan.currentFloor = 1;
    transact(() => {
      plan.current = doc('B', 2);
    });

    expect(undo()).toBe(true);
    expect(plan.current).toBe(doc('A', 2));
    expect(plan.currentFloor).toBe(1);
    expect(plan.resetTools).toHaveBeenCalled();
    expect(plan.setLabelVisibility).toHaveBeenCalledWith(true);

    expect(redo()).toBe(true);
    expect(plan.current).toBe(doc('B', 2));
    expect(undo()).toBe(true);
    expect(undo()).toBe(false);
  });

  it('clamps the restored floor to the floors that exist', () => {
    plan.currentFloor = 3;
    transact(() => {
      plan.current = doc('B');
    });
    undo();
    expect(plan.currentFloor).toBe(0);
  });

  it('does not undo in the middle of an open gesture', () => {
    transact(() => {
      plan.current = doc('B');
    });
    beginGesture();
    expect(undo()).toBe(false);
    endGesture();
    expect(undo()).toBe(true);
  });
});
