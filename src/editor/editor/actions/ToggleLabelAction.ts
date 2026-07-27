import { useFloorPlanStore } from '../../../stores/FloorPlanStore';
import { Action } from './Action';

export class ToggleLabelAction implements Action {
  public execute() {
    useFloorPlanStore.getState().toggleLabels();
  }
}
