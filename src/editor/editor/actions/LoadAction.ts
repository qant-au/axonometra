import { serializer } from '../persistence/Serializer';
import { Action } from './Action';

export class LoadAction implements Action {
  private loadData: string;
  constructor(loadData: string) {
    this.loadData = loadData;
  }

  public execute() {
    serializer.load(this.loadData);
  }
}
