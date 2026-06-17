import { Graphics, FederatedPointerEvent } from 'pixi.js';
import { euclideanDistance } from '../../../helpers/EuclideanDistance';
import { Point } from '../../../helpers/Point';
import { viewportX, viewportY } from '../../../helpers/ViewportCoordinates';

import { Label } from '../objects/TransformControls/Label';

export class Preview {
  public preview: Graphics;
  public startPoint: Point | undefined;
  private sizeLabel: Label;
  public constructor() {
    this.startPoint = undefined;
    this.preview = new Graphics();
    this.sizeLabel = new Label();
    this.sizeLabel.visible = false;
    this.preview.addChild(this.sizeLabel);
  }

  public set(value: Point | undefined) {
    this.startPoint = value;
    this.preview.clear();
    this.sizeLabel.visible = false;
  }

  public updatePreview(ev: FederatedPointerEvent, isWall = false) {
    if (this.startPoint === undefined) {
      return;
    }
    const newX = viewportX(ev.global.x);
    const newY = viewportY(ev.global.y);
    this.preview
      .clear()
      .moveTo(this.startPoint.x, this.startPoint.y)
      .lineTo(newX, newY)
      .stroke({ width: 2, color: 0x1f1f1f });

    let length = euclideanDistance(
      this.startPoint.x,
      newX,
      this.startPoint.y,
      newY
    );
    if (isWall) {
      length -= 20;
    }
    this.sizeLabel.update(length);
    this.sizeLabel.position.x = Math.abs(newX + this.startPoint.x) / 2;
    this.sizeLabel.position.y = Math.abs(newY + this.startPoint.y) / 2;
    this.sizeLabel.visible = true;
  }
  public getReference() {
    return this.preview;
  }
}
