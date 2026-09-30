import type { EditorInstance } from '../../instance/EditorInstance';
import type { LengthUnit } from '@accurona/core';
import { Action } from './Action';

// Display units change how lengths read, not the plan's geometry, so this is
// not an undo step. Every floor's wall labels are redrawn in the new units.
export class SetUnitsAction implements Action {
  private units: LengthUnit;
  constructor(
    private readonly inst: EditorInstance,
    units: LengthUnit
  ) {
    this.units = units;
  }

  public execute() {
    this.inst.units.getState().setUnits(this.units);
    for (const floor of this.inst.plan.getState().floors) {
      floor?.redrawWalls();
    }
  }
}
