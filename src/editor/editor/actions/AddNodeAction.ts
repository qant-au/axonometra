import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Wall } from '../objects/Walls/Wall';
import { WallNode } from '../objects/Walls/WallNode';
import { Action } from './Action';
import { AddWallManager } from './AddWallManager';
import { useStore } from '../../../stores/EditorStore';
import { snap } from '../../../helpers/ViewportCoordinates';
import { Point } from '../../../helpers/Point';
// Add node to the plan. if clicked on screen, just add it. otherwise, add it to the wall.
export class AddNodeAction implements Action {
  private wall!: Wall;
  private coords!: Point;

  constructor(wall?: Wall, coords?: Point) {
    if (wall) {
      this.wall = wall;
    }
    if (coords) {
      this.coords = coords;
    }
  }

  public execute() {
    let node: WallNode | undefined;
    const plan = useFloorPlanStore.getState();

    if (useStore.getState().snap == true) {
      this.coords.x = snap(this.coords.x);
      this.coords.y = snap(this.coords.y);
    }
    if (this.wall) {
      node = plan.addNodeToWall(this.wall, this.coords);
      if (node == null) {
        return;
      }
    } else {
      if (!AddWallManager.Instance.checkStep(this.coords)) {
        return;
      }
      node = plan.addNode(this.coords.x, this.coords.y);
    }
    if (!node) return;
    AddWallManager.Instance.step(node);
  }
}
