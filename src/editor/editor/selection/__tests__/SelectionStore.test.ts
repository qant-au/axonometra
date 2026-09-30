import { beforeEach, describe, expect, it } from 'vitest';
import { createSelectionStore } from '../SelectionStore';
import { wallRef } from '../planOps';

const useSelectionStore = createSelectionStore();

const desk = { kind: 'furniture' as const, id: 1 };

describe('useSelectionStore', () => {
  beforeEach(() => useSelectionStore.getState().clear());

  it('sets without duplicates', () => {
    useSelectionStore.getState().set([desk, desk, wallRef(2, 1)]);
    expect(useSelectionStore.getState().refs).toEqual([desk, wallRef(1, 2)]);
  });

  it('toggle adds, then removes', () => {
    const { toggle } = useSelectionStore.getState();
    toggle(desk);
    expect(useSelectionStore.getState().has(desk)).toBe(true);
    toggle(wallRef(1, 2));
    toggle(desk);
    expect(useSelectionStore.getState().refs).toEqual([wallRef(1, 2)]);
  });

  it('clear empties it', () => {
    useSelectionStore.getState().set([desk]);
    useSelectionStore.getState().clear();
    expect(useSelectionStore.getState().refs).toEqual([]);
  });
});
