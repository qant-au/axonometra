import saveAs from 'file-saver';
import { serializer } from '../persistence/Serializer';
import { Action } from './Action';

export function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}`
  );
}

export class SaveAction implements Action {
  public execute() {
    // An Accurona scene: the one file format of Axonometra and Reticulyne.
    const data = serializer.sceneText();
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `axonometra-plan-${timestamp()}.json`);
  }
}
