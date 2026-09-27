import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';
import { transact } from '../history';

export class ChangeFloorAction implements Action {
  private by: number;
  constructor(by: number) {
    this.by = by;
  }

  public execute() {
    // Going up past the top floor creates one, which is an edit.
    transact(() => useFloorPlanStore.getState().changeFloor(this.by));
  }
}
