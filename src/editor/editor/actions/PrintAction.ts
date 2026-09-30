import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

// print() needs the live display object, so this is the one action that still
// reaches for the FloorPlan container rather than the store.
export class PrintAction implements Action {
  constructor(private readonly inst: EditorInstance) {}

  public execute() {
    this.inst.getFloorPlanView().print();
  }
}
