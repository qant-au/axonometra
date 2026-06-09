import { Container, Graphics } from 'pixi.js';
import { Point } from '../../../../helpers/Point';
import { viewportX, viewportY } from '../../../../helpers/ViewportCoordinates';
import { useStore } from '../../../../stores/EditorStore';
import { Coord, LabelAxis, LABEL_OFFSET, Tool } from '../../constants';
import { Furniture } from '../Furniture';
import { Handle, HandleType } from './Handle';
import { Label } from './Label';

// handles moving, resizing and rotating of objects.
// can only work if its state is active.
export class TransformLayer extends Container {
  private target: Furniture | null;
  private points: Point[];
  private handles: Handle[];
  private labels: Label[];
  private border: Graphics;
  private borderOffset: number;
  public static dragging: boolean;
  private static instance: TransformLayer | undefined;

  // private dragging:boolean;
  // private dragStartCoord:Point;
  private constructor() {
    super();
    this.points = [];
    this.handles = [];
    this.labels = [];
    this.visible = false;
    this.target = null;
    this.border = new Graphics();
    this.borderOffset = 2;
    // this.dragging = false;

    this.addChild(this.border);

    // handles
    this.addHandle(HandleType.Rotate);
    this.addHandle(HandleType.Horizontal);
    this.addHandle(HandleType.HorizontalVertical);
    this.addHandle(HandleType.Vertical);
    this.addHandle(HandleType.Move);

    for (let i = 0; i < 7; i++) {
      this.points[i] = {
        x: 0,
        y: 0
      };
    }

    this.addLabel(LabelAxis.Horizontal);
    this.addLabel(LabelAxis.Vertical);
  }

  public static get Instance() {
    return this.instance || (this.instance = new this()); // TODO obfuscate
  }

  private computePoints() {
    const target = this.target;
    if (!target) return;
    [this.points[Coord.NE].x, this.points[Coord.NE].y] = [target.width + 5, 5];
    [this.points[Coord.E].x, this.points[Coord.E].y] = [
      target.width,
      target.height / 2
    ];
    [this.points[Coord.SE].x, this.points[Coord.SE].y] = [
      target.width,
      target.height
    ];
    [this.points[Coord.S].x, this.points[Coord.S].y] = [
      target.width / 2,
      target.height
    ];
    [this.points[Coord.C].x, this.points[Coord.C].y] = [
      target.width / 2,
      target.height / 2
    ];

    this.points[Coord.Vertical].x = target.width + LABEL_OFFSET;
    this.points[Coord.Vertical].y =
      target.height / 2 - this.labels[LabelAxis.Vertical].height / 2;

    this.points[Coord.Horizontal].x =
      target.width / 2 - this.labels[LabelAxis.Horizontal].width / 2;
    this.points[Coord.Horizontal].y = target.height + LABEL_OFFSET;
  }

  private addHandle(type: HandleType) {
    const handle = new Handle({
      type: type,
      pos: { x: 0, y: 0 }
    });
    this.border.addChild(handle);
    this.handles.push(handle);
  }

  private addLabel(axis: LabelAxis) {
    this.labels[axis] = new Label();
    this.border.addChild(this.labels[axis]);
  }

  public select(t: Furniture) {
    // guards preventing selection unless edit mode is enabled
    if (useStore.getState().activeTool != Tool.Edit) {
      return;
    }
    if (this.target != null) {
      this.deselect();
      return;
    }

    // sets target, computes handle coordinates, and draws on screen at right coordinates
    this.target = t;
    this.computePoints();
    this.draw();

    this.visible = true;
    this.interactive = true;
  }

  private draw() {
    const target = this.target;
    if (!target) return;
    this.drawBorder();

    for (let i = 0; i < this.handles.length; i++) {
      this.handles[i].setTarget(target);

      this.handles[i].update(this.points[i]);
    }

    // deactivate Horizontal handle on x-locked furniture
    if (target.resourcePath == 'door') {
      this.handles[HandleType.Rotate].visible = false;
      this.handles[HandleType.Vertical].visible = true;
      this.handles[HandleType.Horizontal].visible = true;
      this.handles[HandleType.HorizontalVertical].visible = true;
    } else if (target.resourcePath == 'window') {
      this.handles[HandleType.Horizontal].visible = false;
      this.handles[HandleType.Rotate].visible = false;
      this.handles[HandleType.HorizontalVertical].visible = false;
    } else {
      this.handles[HandleType.Rotate].visible = true;
      this.handles[HandleType.Vertical].visible = true;
      this.handles[HandleType.Horizontal].visible = true;
      this.handles[HandleType.HorizontalVertical].visible = true;
    }

    // set labels
    this.labels[LabelAxis.Horizontal].updatePos(
      this.points[Coord.Horizontal],
      target.width
    );
    this.labels[LabelAxis.Vertical].updatePos(
      this.points[Coord.Vertical],
      target.height
    );
  }

  private drawBorder() {
    const target = this.target;
    if (!target) return;
    this.border.clear();
    const globals = target.getGlobalPosition();
    const x = viewportX(globals.x - this.borderOffset, false);
    const y = viewportY(globals.y - this.borderOffset, false);
    const w = target.width + 2 * this.borderOffset;
    const h = target.height + 2 * this.borderOffset;
    this.border.lineStyle(3, 0, 1, 0, true).drawRect(0, 0, w, h);

    this.border.position.x = x;
    this.border.position.y = y;
    this.border.rotation = this.computeTargetRotation();
  }

  private computeTargetRotation() {
    const target = this.target;
    if (!target) return 0;
    if (!target.isAttached) {
      return target.rotation;
    }
    return target.parent.rotation;
  }

  public deselect() {
    this.target = null;
    this.visible = false;
    this.interactive = false;
  }

  public dispose() {
    this.deselect();
    this.points = [];
    this.handles = [];
    this.labels = [];
    TransformLayer.instance = undefined;
  }

  /**
   *
   * Updates externally. Is called by object that is to be moved in order to update the position of the controls grid
   */
  public update() {
    const target = this.target;
    if (!target) return;

    this.computePoints();
    this.drawBorder();

    for (let i = 0; i < this.handles.length; i++) {
      this.handles[i].update(this.points[i]);
    }

    this.labels[LabelAxis.Horizontal].updatePos(
      this.points[Coord.Horizontal],
      target.width
    );
    this.labels[LabelAxis.Horizontal].angle = 360 - target.angle;
    this.labels[LabelAxis.Vertical].updatePos(
      this.points[Coord.Vertical],
      target.height
    );
    this.labels[LabelAxis.Vertical].angle = 360 - target.angle;
  }
}
