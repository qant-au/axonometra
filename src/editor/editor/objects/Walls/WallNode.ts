import type { EditorInstance } from '../../../instance/EditorInstance';
import { Graphics, FederatedPointerEvent } from 'pixi.js';
import { INTERIOR_WALL_THICKNESS, NODE_COLOR, Tool } from '../../constants';
import { DeleteWallNodeAction } from '../../actions/DeleteWallNodeAction';
import { INodeSerializable } from '../../persistence/INodeSerializable';
import { isMobile } from '../../../../helpers/isMobile';
export class WallNode extends Graphics {
  private dragging!: boolean;
  private id: number;

  constructor(
    private readonly inst: EditorInstance,
    x: number,
    y: number,
    nodeId: number
  ) {
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
    this.on('globalpointermove', this.onMouseMove);
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
    // In View the press belongs to the viewport, so a drag pans from anywhere;
    // with the Measure tool it starts a measurement there, wall or not.
    const tool = this.inst.editor.getState().activeTool;
    if (tool === Tool.View || tool === Tool.Measure) return;
    ev.stopPropagation();
    if (ev.button !== 0) return;
    switch (this.inst.editor.getState().activeTool) {
      case Tool.Edit:
        this.dragging = true;
        break;
      case Tool.Remove: {
        const action = new DeleteWallNodeAction(this.inst, this.id);
        action.execute();
        break;
      }
      case Tool.WallAdd:
        this.inst.addWallManager.step(this);
        break;
    }
  }
  private onMouseMove(ev: FederatedPointerEvent) {
    if (!this.dragging) {
      return;
    }
    const currentPoint = { x: ev.global.x, y: ev.global.y };

    this.x = this.inst.viewportX(currentPoint.x);
    this.y = this.inst.viewportY(currentPoint.y);

    this.inst.plan.getState().redrawWalls();
  }

  public setPosition(x: number, y: number) {
    this.x = this.inst.viewportX(x);
    this.y = this.inst.viewportY(y);
    this.inst.plan.getState().redrawWalls();
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
