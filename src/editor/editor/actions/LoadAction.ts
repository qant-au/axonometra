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

  public execute() {
    this.inst.selection.getState().clear();
    this.inst.serializer.load(this.loadData);
  }
}
