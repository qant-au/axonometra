import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Wall } from '../objects/Walls/Wall';
import { Action } from './Action';

export class DeleteWallAction implements Action {
  private wall: Wall; //TODO: Add node data pt undo/redo

  constructor(wall: Wall) {
    this.wall = wall;
  }

  public execute(): void {
    useFloorPlanStore.getState().removeWall(this.wall);
  }
}
