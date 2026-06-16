import { Graphics, InteractionEvent, Sprite, Texture } from 'pixi.js';
import { resolveCatalogImage } from '../../../api/api-client';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { useStore } from '../../../stores/EditorStore';
import { DeleteFurnitureAction } from '../actions/DeleteFurnitureAction';
import { EditFurnitureAction } from '../actions/EditFurnitureAction';
import { INTERIOR_WALL_THICKNESS, METER, Tool } from '../constants';
import { IFurnitureSerializable } from '../persistence/IFurnitureSerializable';
import { TransformLayer } from './TransformControls/TransformLayer';

export class Furniture extends Sprite {
  private id: number; // each furniture piece knows its own index in the plan. uuids?
  // private dragging: boolean;
  public isAttached: boolean;
  public attachedToLeft?: number;
  public attachedToRight?: number;
  public xLocked: boolean;
  public resourcePath: string;
  private orientation: number;
  public centerAngle: number;
  constructor(
    data: FurnitureData,
    id: number,
    attachedTo?: Graphics,
    attachedToLeft?: number,
    attachedToRight?: number,
    orientation = 0
  ) {
    const texture = Texture.from(resolveCatalogImage(data.imagePath));
    super(texture);
    this.resourcePath = data.imagePath;
    this.id = id;
    this.orientation = 0;
    this.cursor = 'pointer';
    if (attachedTo) {
      this.isAttached = true;
      this.attachedToLeft = attachedToLeft;
      this.attachedToRight = attachedToRight;
      this.xLocked = true;
    } else {
      this.xLocked = false;
      this.isAttached = false;
    }
    if (data.zIndex) {
      this.zIndex = data.zIndex;
    }
    this.interactive = true;
    // this.dragging = false;
    this.width = data.width * METER;
    this.height = data.height * METER;
    this.setOrientation(orientation);
    this.centerAngle = Math.atan2(-this.height, this.width);

    this.on('pointerdown', this.onMouseDown);
    this.on('pointermove', this.onMouseMove);
    this.on('rightdown', this.onRightDown);
  }

  public getId() {
    return this.id;
  }

  // Applies one orientation step (fromOrientation -> fromOrientation+1).
  // The door y-offset uses different dimensions depending on caller:
  // switchOrientation passes useWidthForDoorOffset=false (uses height);
  // setOrientation passes true (uses width). height/width discrepancy
  // preserved from upstream; see follow-up.
  private applyStep(fromOrientation: number, useWidthForDoorOffset: boolean) {
    const doorAxis = useWidthForDoorOffset ? this.width : this.height;
    switch (fromOrientation) {
      case 0:
        this.anchor.x = 1;
        this.scale.x = -1 * this.scale.x;
        this.anchor.y = 0;
        this.scale.y = 1 * this.scale.y;
        break;
      case 1:
        this.anchor.y = 1;
        this.scale.y = -1 * this.scale.y;
        if (this.resourcePath == 'door') {
          this.position.y -= doorAxis - INTERIOR_WALL_THICKNESS;
        }
        break;
      case 2:
        this.anchor.x = 0;
        this.scale.x = -this.scale.x;
        break;
      case 3:
        this.anchor.x = 0;
        this.scale.x = Math.abs(this.scale.x);
        this.anchor.y = 0;
        this.scale.y = Math.abs(this.scale.y);
        if (this.resourcePath == 'door') {
          this.position.y += doorAxis - INTERIOR_WALL_THICKNESS;
        }
        break;
    }
  }

  private switchOrientation() {
    this.applyStep(this.orientation, false);
    this.orientation = (this.orientation + 1) % 4;
  }

  private onRightDown(ev: InteractionEvent) {
    ev.stopPropagation();
    this.switchOrientation();

    return;
  }
  private setOrientation(number: number) {
    for (let i = 0; i < number; i++) {
      this.applyStep(i, true);
    }
    this.orientation = number;
  }
  private onMouseDown(ev: InteractionEvent) {
    ev.stopPropagation();
    if (ev.data.button == 1) {
      this.zIndex++;
    }
    switch (useStore.getState().activeTool) {
      case Tool.Edit: {
        const action = new EditFurnitureAction(this);
        action.execute();
        break;
      }

      case Tool.Remove: {
        const action = new DeleteFurnitureAction(this.id);
        action.execute();
        break;
      }
    }
  }

  private onMouseMove() {
    //todo update doar la mousedown=true
    TransformLayer.Instance.update();
  }

  public serialize() {
    const res: IFurnitureSerializable = {
      x: this.x,
      y: this.y,
      height: this.height / METER,
      width: this.width / METER,
      zIndex: this.zIndex,
      id: this.id,
      texturePath: this.resourcePath,
      rotation: this.rotation,
      orientation: this.orientation,

      attachedToLeft: this.attachedToLeft,
      attachedToRight: this.attachedToRight
    };
    return res;
  }
}
