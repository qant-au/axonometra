import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

export class ToggleLabelAction implements Action {
  constructor(private readonly inst: EditorInstance) {}

  public execute() {
    this.inst.plan.getState().toggleLabels();
  }
}
