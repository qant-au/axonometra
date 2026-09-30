/** the plan's display units: how lengths are shown and typed, never how they are stored */
import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useInstance } from '../editor/instance/context';
import type { LengthUnit } from '../vendor/accurona-core';

export const DEFAULT_UNITS: LengthUnit = 'mm';

export interface UnitsStore {
  units: LengthUnit;
  setUnits: (units: LengthUnit) => void;
}

export function createUnitsStore(): StoreApi<UnitsStore> {
  return createStore<UnitsStore>()((set) => ({
    units: DEFAULT_UNITS,
    setUnits: (units: LengthUnit) => set({ units })
  }));
}

export function useUnitsStore<T>(selector: (state: UnitsStore) => T): T {
  return useZustand(useInstance().units, selector);
}
