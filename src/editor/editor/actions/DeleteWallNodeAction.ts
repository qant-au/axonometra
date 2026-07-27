import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';

export class DeleteWallNodeAction implements Action {
  private id: number;
  constructor(id: number) {
    this.id = id;
  }

  public execute(): void {
    useFloorPlanStore.getState().removeWallNode(this.id);
  }
}
