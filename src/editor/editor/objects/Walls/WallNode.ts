import { Graphics, FederatedPointerEvent } from 'pixi.js';
import { INTERIOR_WALL_THICKNESS, NODE_COLOR, Tool } from '../../constants';
import { useStore } from '../../../../stores/EditorStore';
import { AddWallManager } from '../../actions/AddWallManager';
import { DeleteWallNodeAction } from '../../actions/DeleteWallNodeAction';
import { INodeSerializable } from '../../persistence/INodeSerializable';
import { FloorPlan } from '../FloorPlan';
import { viewportX, viewportY } from '../../../../helpers/ViewportCoordinates';
import { isMobile } from '../../../../helpers/isMobile';
export class WallNode extends Graphics {
  private dragging!: boolean;
  private id: number;

  constructor(x: number, y: number, nodeId: number) {
    super();
    this.eventMode = 'static';
    this.id = nodeId;

    //  this.circle(0,0,INTERIOR_WALL_THICKNESS / 2)
    if (isMobile) {
      this.setNodeSize(INTERIOR_WALL_THICKNESS * 2);
    } else {
      this.setNodeSize(INTERIOR_WALL_THICKNESS);
    }

    this.position.set(x, y);
    this.zIndex = 999;
    this.on('pointerdown', this.onMouseDown);
    this.on('pointermove', this.onMouseMove);
    this.on('pointerup', this.onMouseUp);
    this.on('pointerupoutside', this.onMouseUp);
  }

  public getId() {
    return this.id;
  }

  // Not `setSize`: v8's Container has a built-in setSize(width, height).
  public setNodeSize(size: number) {
    this.clear();
    this.rect(0, 0, size, size).fill(NODE_COLOR);
    this.pivot.set(size / 2, size / 2);
  }
  private onMouseDown(ev: FederatedPointerEvent) {
    ev.stopPropagation();
    switch (useStore.getState().activeTool) {
      case Tool.Edit:
        this.dragging = true;
        break;
      case Tool.Remove: {
        const action = new DeleteWallNodeAction(this.id);
        action.execute();
        break;
      }
      case Tool.WallAdd:
        AddWallManager.Instance.step(this);
        break;
    }
  }
  private onMouseMove(ev: FederatedPointerEvent) {
    if (!this.dragging) {
      return;
    }
    const currentPoint = { x: ev.global.x, y: ev.global.y };

    this.x = viewportX(currentPoint.x);
    this.y = viewportY(currentPoint.y);

    FloorPlan.Instance.redrawWalls();
  }

  public setPosition(x: number, y: number) {
    this.x = viewportX(x);
    this.y = viewportY(y);
    FloorPlan.Instance.redrawWalls();
  }

  private onMouseUp() {
    this.dragging = false;
  }

  public serialize() {
    const res: INodeSerializable = {
      id: this.id,
      x: this.x,
      y: this.y
    };
    return res;
  }
}
