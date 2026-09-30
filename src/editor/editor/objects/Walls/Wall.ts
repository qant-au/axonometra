import type { EditorInstance } from '../../../instance/EditorInstance';
import { Graphics, FederatedPointerEvent } from 'pixi.js';
import { getDoor, getWindow } from '../../../../api/api-client';
import { euclideanDistance } from '../../../../helpers/EuclideanDistance';
import { Point } from '../../../../helpers/Point';

import { AddFurnitureAction } from '../../actions/AddFurnitureAction';
import { AddNodeAction } from '../../actions/AddNodeAction';
import { DeleteWallAction } from '../../actions/DeleteWallAction';
import {
  INTERIOR_WALL_THICKNESS,
  Tool,
  WALL_COLOR,
  WALL_THICKNESS
} from '../../constants';
import { Label } from '../TransformControls/Label';
import { wallRef } from '../../selection/planOps';
import { WallNode } from './WallNode';

export class Wall extends Graphics {
  leftNode: WallNode;
  rightNode: WallNode;
  length!: number;
  // Not `label`: v8's Container has a built-in `label: string` property.
  lengthLabel: Label;

  x1!: number;
  x2!: number;
  y1!: number;
  y2!: number;
  thickness: number;
  isExteriorWall: boolean;

  dragging: boolean;
  mouseStartPoint: Point;
  startLeftNode: Point;
  startRightNode: Point;

  constructor(
    private readonly inst: EditorInstance,
    leftNode: WallNode,
    rightNode: WallNode
  ) {
    super();
    this.sortableChildren = true;

    this.eventMode = 'static';
    this.leftNode = leftNode;
    this.rightNode = rightNode;
    this.dragging = false;
    this.mouseStartPoint = { x: 0, y: 0 };
    this.startLeftNode = { x: 0, y: 0 };
    this.startRightNode = { x: 0, y: 0 };
    this.setLineCoords();
    this.lengthLabel = new Label(this.inst, 0);

    this.addChild(this.lengthLabel);
    this.thickness = INTERIOR_WALL_THICKNESS;
    this.pivot.set(0, INTERIOR_WALL_THICKNESS / 2);
    this.zIndex = 100;
    this.isExteriorWall = false;
    // this.drawLine();

    this.on('pointerdown', this.onMouseDown);
    this.on('rightdown', this.onRightDown);
    this.on('globalpointermove', this.onMouseMove);
    this.on('pointerup', this.onMouseUp);
    this.on('pointerupoutside', this.onMouseUp);
    this.on('click', this.onClick);
  }

  public setIsExterior(value: boolean) {
    this.isExteriorWall = value;
    if (value) {
      this.thickness = WALL_THICKNESS;
    } else {
      this.thickness = INTERIOR_WALL_THICKNESS;
    }
    this.pivot.set(0, this.thickness / 2);
    this.leftNode.setNodeSize(this.thickness);
    this.rightNode.setNodeSize(this.thickness);
    this.drawLine();
  }

  public getIsExterior() {
    return this.isExteriorWall;
  }
  public setLineCoords() {
    if (this.leftNode.x == this.rightNode.x) {
      if (this.leftNode.y < this.rightNode.y) {
        return [
          this.leftNode.x,
          this.leftNode.y,
          this.rightNode.x,
          this.rightNode.y
        ];
      } else {
        return [
          this.rightNode.x,
          this.rightNode.y,
          this.leftNode.x,
          this.leftNode.y
        ];
      }
    } else if (this.leftNode.x < this.rightNode.x) {
      return [
        this.leftNode.x,
        this.leftNode.y,
        this.rightNode.x,
        this.rightNode.y
      ];
    } else {
      return [
        this.rightNode.x,
        this.rightNode.y,
        this.leftNode.x,
        this.leftNode.y
      ];
    }
  }

  public drawLine() {
    this.clear();
    [this.x1, this.y1, this.x2, this.y2] = this.setLineCoords();

    let theta = Math.atan2(this.y2 - this.y1, this.x2 - this.x1); // aflu unghiul sa pot roti
    theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
    if (theta < 0) theta = 360 + theta; // range [0, 360)
    this.length = euclideanDistance(this.x1, this.x2, this.y1, this.y2);

    this.rect(0, 0, this.length, this.thickness)
      .fill(0x000000)
      .stroke({ width: 1, color: WALL_COLOR });
    this.position.set(this.x1, this.y1);
    this.angle = theta;

    this.leftNode.angle = theta;
    this.rightNode.angle = theta;

    this.lengthLabel.update(this.shownLength());
    this.lengthLabel.position.x = this.width / 2;
    this.lengthLabel.angle = 360 - theta;

    this.lengthLabel.position.y = 25;
    this.lengthLabel.zIndex = 998;
  }

  /**
   * The length a person reads on the label and types in the length box:
   * the centre line less this wall's own thickness (half at each end).
   */
  public shownLength() {
    return this.length - this.thickness;
  }

  /** The context menu's Make exterior / Make interior. */
  public toggleExterior() {
    this.setIsExterior(!this.isExteriorWall);
  }

  // Right-click opens the context menu (the exterior toggle is in it); a
  // right drag still pans, so the menu waits for the release.
  private onRightDown(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    this.inst.pointer.rightPressed(this.ref(), ev);
  }

  public ref() {
    return wallRef(this.leftNode.getId(), this.rightNode.getId());
  }

  private onMouseMove(ev: FederatedPointerEvent) {
    if (!this.dragging) {
      return;
    }
    // Both points in plan coordinates, so the wall follows the mouse at any
    // zoom (mixing screen and plan units only worked at 100%).
    const delta = {
      x: this.inst.viewportX(ev.global.x) - this.mouseStartPoint.x,
      y: this.inst.viewportY(ev.global.y) - this.mouseStartPoint.y
    };
    this.leftNode.x = this.startLeftNode.x + delta.x;
    this.leftNode.y = this.startLeftNode.y + delta.y;
    this.rightNode.x = this.startRightNode.x + delta.x;
    this.rightNode.y = this.startRightNode.y + delta.y;
    this.inst.plan.getState().redrawWalls();
  }

  // Double-click in Edit mode opens the dialog for typing the wall's length.
  private onClick(ev: FederatedPointerEvent) {
    const state = this.inst.editor.getState();
    if (ev.detail !== 2 || state.activeTool !== Tool.Edit) return;
    ev.stopPropagation();
    state.setLengthEditWall(this);
  }

  private onMouseUp(_ev: FederatedPointerEvent) {
    this.dragging = false;
    return;
  }

  private onMouseDown(ev: FederatedPointerEvent) {
    // In View the press belongs to the viewport, so a drag pans from anywhere.
    if (this.inst.editor.getState().activeTool === Tool.View) return;
    ev.stopPropagation();
    // Right-click is onRightDown's (exterior toggle); a right press must not
    // also split the wall, erase it or start a drag.
    if (ev.button !== 0) return;

    const coords = {
      x: this.inst.viewportX(ev.global.x),
      y: this.inst.viewportY(ev.global.y)
    };
    const localCoords = ev.getLocalPosition(this);

    const state = this.inst.editor.getState();

    if (state.activeTool == Tool.Remove) {
      const action = new DeleteWallAction(this.inst, this);
      action.execute();
    }

    if (state.activeTool == Tool.WallAdd) {
      const addNode = new AddNodeAction(this.inst, this, coords);
      addNode.execute();
    }
    if (state.activeTool == Tool.FurnitureAddWindow) {
      getWindow().then((res) => {
        const action = new AddFurnitureAction(
          this.inst,
          res[0],
          this,
          { x: localCoords.x, y: 0 },
          this.leftNode.getId(),
          this.rightNode.getId()
        );
        action.execute();
      });
    }

    if (state.activeTool == Tool.FurnitureAddDoor) {
      getDoor().then((res) => {
        const action = new AddFurnitureAction(
          this.inst,
          res[0],
          this,
          { x: localCoords.x, y: 0 },
          this.leftNode.getId(),
          this.rightNode.getId()
        );
        action.execute();
      });
    }

    if (state.activeTool == Tool.Edit && !this.dragging) {
      this.inst.pointer.pressSelect(this.ref(), ev.shiftKey);
      // Alt + drag: a copy stays where the wall was, and this one moves on.
      if (ev.altKey) this.inst.plan.getState().cloneWall(this);
      this.dragging = true;
      this.mouseStartPoint.x = this.inst.viewportX(ev.global.x);
      this.mouseStartPoint.y = this.inst.viewportY(ev.global.y);
      this.startLeftNode.x = this.leftNode.position.x;
      this.startLeftNode.y = this.leftNode.position.y;

      this.startRightNode.x = this.rightNode.position.x;
      this.startRightNode.y = this.rightNode.position.y;

      return;
    }
  }
}
