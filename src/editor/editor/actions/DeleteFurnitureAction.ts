import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';

// Action for removing a furniture piece from the active floor.
export class DeleteFurnitureAction implements Action {
  private id: number;

  constructor(id: number) {
    this.id = id;
  }

  public execute() {
    useFloorPlanStore.getState().removeFurniture(this.id);
  }
}
