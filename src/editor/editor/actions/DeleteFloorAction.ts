import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';
import { transact } from '../history';

export class DeleteFloorAction implements Action {
  public execute(): void {
    transact(() => useFloorPlanStore.getState().removeFloor());
  }
}
