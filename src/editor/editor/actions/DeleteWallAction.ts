import type { EditorInstance } from '../../instance/EditorInstance';
import { Wall } from '../objects/Walls/Wall';
import { Action } from './Action';

export class DeleteWallAction implements Action {
  private wall: Wall;

  constructor(
    private readonly inst: EditorInstance,
    wall: Wall
  ) {
    this.wall = wall;
  }

  public execute(): void {
    this.inst.plan.getState().removeWall(this.wall);
  }
}
