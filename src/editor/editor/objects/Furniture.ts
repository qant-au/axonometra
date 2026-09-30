import type { EditorInstance } from '../../instance/EditorInstance';
import { Graphics, FederatedPointerEvent, Sprite, Texture } from 'pixi.js';
import { loadedTexture, loadTexture } from '../textures';
import { resolveCatalogImage } from '../../../api/api-client';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { DeleteFurnitureAction } from '../actions/DeleteFurnitureAction';
import { INTERIOR_WALL_THICKNESS, METER, Tool } from '../constants';
import { IFurnitureSerializable } from '../persistence/IFurnitureSerializable';

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
  /** Real height and height above the floor, metres (plan format v2). */
  public heightM?: number;
  public mountM?: number;
  constructor(
    private readonly inst: EditorInstance,
    data: FurnitureData,
    id: number,
    attachedTo?: Graphics,
    attachedToLeft?: number,
    attachedToRight?: number,
    orientation = 0
  ) {
    // Catalogue images load on first use (a couple of hundred icons would be
    // ~40 MB of textures if all were preloaded). Until an icon arrives the
    // sprite is a blank of the right footprint; it keeps its size on the swap.
    // A failed load leaves a grey placeholder.
    const url = resolveCatalogImage(data.imagePath);
    const cached = loadedTexture(url);
    super(cached ?? Texture.WHITE);
    if (!cached) {
      loadTexture(url).then(
        (texture) => {
          if (this.destroyed) return;
          const { width, height } = this;
          this.texture = texture;
          this.width = width;
          this.height = height;
        },
        () => {
          if (!this.destroyed) this.tint = 0xcccccc;
        }
      );
    }
    this.resourcePath = data.imagePath;
    this.heightM = data.heightM;
    this.mountM = data.mountM;
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
    this.eventMode = 'static';
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

  /** Turns the item one step; the context menu's Turn. */
  public switchOrientation() {
    this.applyStep(this.orientation, false);
    this.orientation = (this.orientation + 1) % 4;
    this.inst.transformLayer.update();
  }

  // Right-click opens the context menu (Turn is in it); a right drag still
  // pans, so the menu waits for the release (selection/pointer.ts).
  private onRightDown(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    this.inst.pointer.rightPressed({ kind: 'furniture', id: this.id }, ev);
  }
  private setOrientation(number: number) {
    for (let i = 0; i < number; i++) {
      this.applyStep(i, true);
    }
    this.orientation = number;
  }
  private onMouseDown(ev: FederatedPointerEvent) {
    // In View the press belongs to the viewport, so a drag pans from anywhere;
    // with the Measure tool it starts a measurement there, wall or not.
    const tool = this.inst.editor.getState().activeTool;
    if (tool === Tool.View || tool === Tool.Measure) return;
    ev.stopPropagation();
    if (ev.button == 1) {
      this.zIndex++;
    }
    // Right-click turns the item (onRightDown); it must not also erase it.
    if (ev.button === 2) return;
    switch (this.inst.editor.getState().activeTool) {
      case Tool.Edit:
        this.inst.pointer.pressSelect(
          { kind: 'furniture', id: this.id },
          ev.shiftKey
        );
        // Press and drag moves it, as in Excalidraw: selecting it put the
        // handles on it, and the drag is the move handle's. Shift + click
        // only changes the selection.
        if (!ev.shiftKey) this.inst.transformLayer.beginMove(ev);
        break;

      case Tool.Remove: {
        const action = new DeleteFurnitureAction(this.inst, this.id);
        action.execute();
        break;
      }
    }
  }

  private onMouseMove() {
    //todo update doar la mousedown=true
    this.inst.transformLayer.update();
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
    if (this.heightM != null) res.heightM = this.heightM;
    if (this.mountM != null) res.mountM = this.mountM;
    return res;
  }
}
