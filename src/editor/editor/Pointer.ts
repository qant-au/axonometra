import { Container, Graphics, InteractionEvent } from 'pixi.js';
import { snap, viewportX, viewportY } from '../../helpers/ViewportCoordinates';
import { useStore } from '../../stores/EditorStore';

export class Pointer extends Container {
  private graphic: Graphics;
  constructor() {
    super();
    this.graphic = new Graphics();
    this.graphic.lineStyle(1).beginFill(0x0).drawCircle(0, 0, 2);
    this.addChild(this.graphic);
  }

  public update(ev: InteractionEvent) {
    let worldX = viewportX(ev.data.global.x);
    let worldY = viewportY(ev.data.global.y);
    if (useStore.getState().snap) {
      worldX = snap(worldX);
      worldY = snap(worldY);
    }

    this.position.set(worldX, worldY);
  }
}
