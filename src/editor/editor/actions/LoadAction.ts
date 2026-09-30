import type { EditorInstance } from '../../instance/EditorInstance';
import { Action } from './Action';

export class LoadAction implements Action {
  private loadData: string;
  constructor(
    private readonly inst: EditorInstance,
    loadData: string
  ) {
    this.loadData = loadData;
  }

  /** True when the plan loaded; a failure is toasted by the serializer. */
  public execute(): boolean {
    this.inst.selection.getState().clear();
    return this.inst.serializer.load(this.loadData);
  }
}
