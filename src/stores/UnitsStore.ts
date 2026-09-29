/** the plan's display units: how lengths are shown and typed, never how they are stored */
import { create } from 'zustand';
import type { LengthUnit } from '../vendor/accurona-core';

export const DEFAULT_UNITS: LengthUnit = 'mm';

export interface UnitsStore {
  units: LengthUnit;
  setUnits: (units: LengthUnit) => void;
}

export const useUnitsStore = create<UnitsStore>()((set) => ({
  units: DEFAULT_UNITS,
  setUnits: (units: LengthUnit) => set({ units })
}));
