/** the plan's display units: how lengths are shown and typed, never how they are stored */
import { create } from 'zustand';
import { METRIC_UNITS, type MetricUnit } from '../vendor/accurona-core';

export const DEFAULT_UNITS: MetricUnit = 'mm';

export interface UnitsStore {
  units: MetricUnit;
  setUnits: (units: MetricUnit) => void;
}

export const useUnitsStore = create<UnitsStore>()((set) => ({
  units: DEFAULT_UNITS,
  setUnits: (units: MetricUnit) => set({ units })
}));

export function isMetricUnit(value: unknown): value is MetricUnit {
  return METRIC_UNITS.includes(value as MetricUnit);
}
