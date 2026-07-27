import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { WallNode } from '../objects/Walls/WallNode';
import { Action } from './Action';

// Add wall between two nodes of the active floor
export class AddWallAction implements Action {
  private leftNode: number;
  private rightNode: number;

  constructor(left: WallNode, right: WallNode) {
    this.leftNode = left.getId();
    this.rightNode = right.getId();
  }

  public execute() {
    return useFloorPlanStore
      .getState()
      .getWallNodeSeq()
      .addWall(this.leftNode, this.rightNode);
  }
}
