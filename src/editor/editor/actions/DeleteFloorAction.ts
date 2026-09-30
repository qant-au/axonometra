import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

export class DeleteFloorAction implements Action {
  constructor(private readonly inst: EditorInstance) {}

  public execute(): void {
    this.inst.edits.transact(() => this.inst.plan.getState().removeFloor());
  }
}
