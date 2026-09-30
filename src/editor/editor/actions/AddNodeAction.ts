import type { EditorInstance } from '../../instance/EditorInstance';
import { Wall } from '../objects/Walls/Wall';
import { WallNode } from '../objects/Walls/WallNode';
import { Action } from './Action';
import { snap } from '../../../helpers/ViewportCoordinates';
import { Point } from '../../../helpers/Point';
import { euclideanDistance } from '../../../helpers/EuclideanDistance';
import { SNAP_THRESHOLD } from '../constants';
// Add node to the plan. if clicked on screen, just add it. otherwise, add it to the wall.
export class AddNodeAction implements Action {
  private wall!: Wall;
  private coords!: Point;

  constructor(
    private readonly inst: EditorInstance,
    wall?: Wall,
    coords?: Point
  ) {
    if (wall) {
      this.wall = wall;
    }
    if (coords) {
      this.coords = coords;
    }
  }

  public execute() {
    let node: WallNode | undefined;
    const plan = this.inst.plan.getState();

    if (this.inst.editor.getState().snap == true) {
      this.coords.x = snap(this.coords.x);
      this.coords.y = snap(this.coords.y);
    }
    // A press on the chain's last node ends the chain: the second press of a
    // double click. That press can miss the node itself and land on the
    // wall just drawn, or (snapped off the pointer) on the plan.
    const last = this.inst.addWallManager.previousNode;
    if (
      last &&
      euclideanDistance(this.coords.x, last.x, this.coords.y, last.y) <
        SNAP_THRESHOLD
    ) {
      this.inst.addWallManager.step(last);
      return;
    }
    if (this.wall) {
      node = plan.addNodeToWall(this.wall, this.coords);
      if (node == null) {
        return;
      }
    } else {
      if (!this.inst.addWallManager.checkStep(this.coords)) {
        return;
      }
      node = plan.addNode(this.coords.x, this.coords.y);
    }
    if (!node) return;
    this.inst.addWallManager.step(node);
  }
}
