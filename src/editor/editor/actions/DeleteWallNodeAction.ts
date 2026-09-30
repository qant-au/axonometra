import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

export class DeleteWallNodeAction implements Action {
  private id: number;
  constructor(
    private readonly inst: EditorInstance,
    id: number
  ) {
    this.id = id;
  }

  public execute(): void {
    this.inst.plan.getState().removeWallNode(this.id);
  }
}
