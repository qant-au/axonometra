import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

export class ChangeFloorAction implements Action {
  private by: number;
  constructor(
    private readonly inst: EditorInstance,
    by: number
  ) {
    this.by = by;
  }

  public execute() {
    // Going up past the top floor creates one, which is an edit.
    this.inst.edits.transact(() =>
      this.inst.plan.getState().changeFloor(this.by)
    );
  }
}
