import type { EditorInstance } from '../../instance/EditorInstance';
import { Point } from '../../../helpers/Point';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { Wall } from '../objects/Walls/Wall';
import { Action } from './Action';

export class AddFurnitureAction implements Action {
  obj: FurnitureData;
  attachedTo?: Wall;
  coords?: Point;
  attachedToLeft?: number;
  attachedToRight?: number;

  constructor(
    private readonly inst: EditorInstance,
    obj: FurnitureData,
    attachedTo?: Wall,
    coords?: Point,
    attachedToLeft?: number,
    attachedToRight?: number
  ) {
    this.obj = obj;
    this.attachedTo = attachedTo;
    this.coords = coords;
    this.attachedToLeft = attachedToLeft;
    this.attachedToRight = attachedToRight;
  }

  // Doors and windows are added after an async catalog lookup, which can
  // resolve after the canvas gesture has closed, so this records itself.
  public execute() {
    this.inst.edits.transact(() =>
      this.inst.plan
        .getState()
        .addFurniture(
          this.obj,
          this.attachedTo,
          this.coords,
          this.attachedToLeft,
          this.attachedToRight
        )
    );
  }
}
