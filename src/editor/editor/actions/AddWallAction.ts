import type { EditorInstance } from '../../instance/EditorInstance';
import { WallNode } from '../objects/Walls/WallNode';
import { Action } from './Action';

// Add wall between two nodes of the active floor
export class AddWallAction implements Action {
  private leftNode: number;
  private rightNode: number;

  constructor(
    private readonly inst: EditorInstance,
    left: WallNode,
    right: WallNode
  ) {
    this.leftNode = left.getId();
    this.rightNode = right.getId();
  }

  public execute() {
    return this.inst.plan
      .getState()
      .getWallNodeSeq()
      .addWall(this.leftNode, this.rightNode);
  }
}
