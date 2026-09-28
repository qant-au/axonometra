import { Container, Graphics, FederatedPointerEvent } from 'pixi.js';
import { snap, viewportX, viewportY } from '../../helpers/ViewportCoordinates';
import { useStore } from '../../stores/EditorStore';

export class Pointer extends Container {
  private graphic: Graphics;
  // Drawn around the dot while the keyboard cursor is in use, so it can be
  // found on the plan; the mouse brings back the bare dot.
  private ring: Graphics;
  constructor() {
    super();
    // The cursor sits exactly under the mouse, so if it could be hit it would
    // take every press meant for what is beneath it: wall points and
    // furniture handles could never be dragged. It is drawn, never hit.
    this.eventMode = 'none';
    this.graphic = new Graphics();
    this.graphic
      .circle(0, 0, 2)
      .fill(0x000000)
      .stroke({ width: 1, color: 0x000000 });
    this.addChild(this.graphic);
    this.ring = new Graphics();
    this.ring
      .circle(0, 0, 12)
      .stroke({ width: 2, color: 0x1c7ed6 })
      .moveTo(-18, 0)
      .lineTo(-8, 0)
      .moveTo(8, 0)
      .lineTo(18, 0)
      .moveTo(0, -18)
      .lineTo(0, -8)
      .moveTo(0, 8)
      .lineTo(0, 18)
      .stroke({ width: 2, color: 0x1c7ed6 });
    this.ring.visible = false;
    this.addChild(this.ring);
  }

  public showKeyboardRing(show: boolean) {
    this.ring.visible = show;
  }

  public update(ev: FederatedPointerEvent) {
    this.ring.visible = false;
    let worldX = viewportX(ev.global.x);
    let worldY = viewportY(ev.global.y);
    if (useStore.getState().snap) {
      worldX = snap(worldX);
      worldY = snap(worldY);
    }

    this.position.set(worldX, worldY);
  }
}
