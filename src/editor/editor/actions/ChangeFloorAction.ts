import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';

export class ChangeFloorAction implements Action {
  private by: number;
  constructor(by: number) {
    this.by = by;
  }

  public execute() {
    useFloorPlanStore.getState().changeFloor(this.by);
  }
}
