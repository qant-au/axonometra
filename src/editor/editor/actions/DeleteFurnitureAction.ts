import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

// Action for removing a furniture piece from the active floor.
export class DeleteFurnitureAction implements Action {
  private id: number;

  constructor(
    private readonly inst: EditorInstance,
    id: number
  ) {
    this.id = id;
  }

  public execute() {
    this.inst.plan.getState().removeFurniture(this.id);
  }
}
