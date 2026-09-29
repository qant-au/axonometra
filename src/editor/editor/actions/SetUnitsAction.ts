import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { useUnitsStore } from '../../../stores/UnitsStore';
import type { LengthUnit } from '../../../vendor/accurona-core';
import { Action } from './Action';

// Display units change how lengths read, not the plan's geometry, so this is
// not an undo step. Every floor's wall labels are redrawn in the new units.
export class SetUnitsAction implements Action {
  private units: LengthUnit;
  constructor(units: LengthUnit) {
    this.units = units;
  }

  public execute() {
    useUnitsStore.getState().setUnits(this.units);
    for (const floor of useFloorPlanStore.getState().floors) {
      floor?.redrawWalls();
    }
  }
}
