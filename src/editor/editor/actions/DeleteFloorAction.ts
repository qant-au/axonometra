import { FloorPlan } from '../objects/FloorPlan';

import { Action } from './Action';

export class DeleteFloorAction implements Action {
  private receiver: FloorPlan;

  constructor() {
    this.receiver = FloorPlan.Instance;
  }

  public execute(): void {
    this.receiver.removeFloor();
  }
}
