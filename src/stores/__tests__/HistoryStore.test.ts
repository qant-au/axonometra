import { beforeEach, describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, createHistoryStore } from '../HistoryStore';

const useHistoryStore = createHistoryStore();

const snap = (plan: string, currentFloor = 0) => ({ plan, currentFloor });

describe('HistoryStore', () => {
  beforeEach(() => useHistoryStore.getState().clear());

  it('undo returns the last recorded state and moves the current one to redo', () => {
    const h = useHistoryStore.getState();
    h.push(snap('a'));
    h.push(snap('b'));

    expect(useHistoryStore.getState().takeUndo(snap('c'))).toEqual(snap('b'));
    expect(useHistoryStore.getState().past).toEqual([snap('a')]);
    expect(useHistoryStore.getState().future).toEqual([snap('c')]);

    expect(useHistoryStore.getState().takeRedo(snap('b'))).toEqual(snap('c'));
    expect(useHistoryStore.getState().past).toEqual([snap('a'), snap('b')]);
    expect(useHistoryStore.getState().future).toEqual([]);
  });

  it('returns undefined and changes nothing when a stack is empty', () => {
    expect(useHistoryStore.getState().takeUndo(snap('x'))).toBeUndefined();
    expect(useHistoryStore.getState().takeRedo(snap('x'))).toBeUndefined();
    expect(useHistoryStore.getState().past).toEqual([]);
    expect(useHistoryStore.getState().future).toEqual([]);
  });

  it('a new edit clears the redo stack', () => {
    const h = useHistoryStore.getState();
    h.push(snap('a'));
    useHistoryStore.getState().takeUndo(snap('b'));
    useHistoryStore.getState().push(snap('a2'));
    expect(useHistoryStore.getState().future).toEqual([]);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps, dropping the oldest`, () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      useHistoryStore.getState().push(snap(String(i)));
    }
    const { past } = useHistoryStore.getState();
    expect(past).toHaveLength(HISTORY_LIMIT);
    expect(past[0].plan).toBe('5');
  });
});
