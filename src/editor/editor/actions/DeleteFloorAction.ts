import { useFloorPlanStore } from '../../../stores/FloorPlanStore';

import { Action } from './Action';

export class DeleteFloorAction implements Action {
  public execute(): void {
    useFloorPlanStore.getState().removeFloor();
  }
}
