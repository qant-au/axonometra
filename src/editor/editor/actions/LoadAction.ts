import { serializer } from '../persistence/Serializer';
import { Action } from './Action';
import { useSelectionStore } from '../selection/SelectionStore';

export class LoadAction implements Action {
  private loadData: string;
  constructor(loadData: string) {
    this.loadData = loadData;
  }

  public execute() {
    useSelectionStore.getState().clear();
    serializer.load(this.loadData);
  }
}
