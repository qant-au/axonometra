import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { snap, viewportX, viewportY } from '../../helpers/ViewportCoordinates';
import { useStore } from '../../stores/EditorStore';

export class Pointer extends Container {
  private graphic: Graphics;
  constructor() {
    super();
    this.graphic = new Graphics();
    this.graphic
      .circle(0, 0, 2)
      .fill(0x000000)
      .stroke({ width: 1, color: 0x000000 });
    this.addChild(this.graphic);
  }

  public update(ev: FederatedPointerEvent) {
    let worldX = viewportX(ev.global.x);
    let worldY = viewportY(ev.global.y);
    if (useStore.getState().snap) {
      worldX = snap(worldX);
      worldY = snap(worldY);
    }

    this.position.set(worldX, worldY);
  }
}
