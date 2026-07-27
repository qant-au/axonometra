import { Point } from '../../../helpers/Point';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Wall } from '../objects/Walls/Wall';
import { Action } from './Action';

export class AddFurnitureAction implements Action {
  obj: FurnitureData;
  attachedTo?: Wall;
  coords?: Point;
  attachedToLeft?: number;
  attachedToRight?: number;

  constructor(
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

  public execute() {
    useFloorPlanStore
      .getState()
      .addFurniture(
        this.obj,
        this.attachedTo,
        this.coords,
        this.attachedToLeft,
        this.attachedToRight
      );
  }
}
