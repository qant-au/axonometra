import { Graphics, FederatedPointerEvent } from 'pixi.js';
import { isMobile } from '../../../../helpers/isMobile';
import { HANDLE_MOBILE_SCALE, WALL_THICKNESS } from '../../constants';
import { Point } from '../../../../helpers/Point';
import { viewportX, viewportY } from '../../../../helpers/ViewportCoordinates';
import { Furniture } from '../Furniture';
import { Wall } from '../Walls/Wall';
import { TransformLayer } from './TransformLayer';
import { useFloorPlanStore } from '../../../../stores/FloorPlanStore';

/** Smallest width or depth a resize can reach, in plan units (cm). */
const MIN_SIZE = 10;

export enum HandleType {
  Horizontal,
  Vertical,
  HorizontalVertical,
  Rotate,
  Move
}

export interface IHandleConfig {
  size?: number;
  color?: number;
  type: HandleType;
  target?: Furniture;
  pos?: Point;
}

export class Handle extends Graphics {
  private type: HandleType;
  // Set via setTarget before any handler runs. The constructor takes
  // an optional initial value but TransformLayer constructs handles
  // first and assigns the real target on selection.
  private target!: Furniture;
  private color: number = 0x000;
  private size: number = 10;

  private active: boolean = false;
  private mouseStartPoint: Point;
  private targetStartPoint: Point;
  private mouseEndPoint: Point;
  private startRotaton!: number;
  private targetStartCenterPoint: Point;
  private targetCentreLocal: Point = { x: 0, y: 0 };
  private startSize: Point = { x: 0, y: 0 };
  localCoords: { x: number; y: number };
  constructor(handleConfig: IHandleConfig) {
    super();
    this.eventMode = 'static';
    if (handleConfig.color) {
      this.color = handleConfig.color;
    }

    if (handleConfig.size) {
      this.size = handleConfig.size;
    }

    this.mouseStartPoint = { x: 0, y: 0 };
    this.targetStartPoint = { x: 0, y: 0 };

    this.targetStartCenterPoint = { x: 0, y: 0 };
    this.localCoords = { x: 0, y: 0 };
    this.mouseEndPoint = { x: 0, y: 0 };

    this.type = handleConfig.type;
    if (handleConfig.target) {
      this.target = handleConfig.target;
    }
    if (isMobile) {
      this.size = this.size * HANDLE_MOBILE_SCALE;
    }
    if (this.type == HandleType.Rotate) {
      this.circle(0, 0, this.size / 1.5)
        .fill(this.color)
        .stroke({ width: 1, color: this.color });
      this.pivot.set(this.size / 3, this.size / 3);
    } else {
      this.rect(0, 0, this.size, this.size)
        .fill(this.color)
        .stroke({ width: 1, color: this.color });
      this.pivot.set(0.5);
    }

    switch (this.type) {
      case HandleType.Move:
        this.cursor = 'move';
        break;
      case HandleType.Horizontal:
        this.cursor = 'ew-resize';
        break;
      case HandleType.Vertical:
        this.cursor = 'ns-resize';
        break;
      case HandleType.HorizontalVertical:
        this.cursor = 'nwse-resize';
        break;
      case HandleType.Rotate:
        this.cursor = 'grab';
        break;
    }
    if (handleConfig.pos) {
      this.position.set(handleConfig.pos.x, handleConfig.pos.y);
    }

    this.on('pointerdown', this.onMouseDown);
    this.on('pointerup', this.onMouseUp);
    this.on('pointerupoutside', this.onMouseUp);
    this.on('globalpointermove', this.onMouseMove);
    // The handles sit on top of their item (the move handle on its centre),
    // so a right-click there is meant for the item: it turns it.
    this.on('rightdown', (ev: FederatedPointerEvent) => {
      ev.stopPropagation();
      this.target?.emit('rightdown', ev);
    });
  }

  private onMouseDown(ev: FederatedPointerEvent) {
    if (TransformLayer.dragging) {
      return;
    }
    // Alt + drag: a copy stays where the item was, and this one moves on.
    if (this.type === HandleType.Move && ev.altKey) {
      useFloorPlanStore.getState().cloneFurniture(this.target);
    }
    this.mouseStartPoint.x = ev.global.x;
    this.mouseStartPoint.y = ev.global.y; // unde se afla target la mousedown
    this.targetStartPoint = this.target.getGlobalPosition();
    // The item's centre, on screen and in its own coordinates: rotation turns
    // about it (anchor and mirroring included, via its local bounds).
    const local = this.target.getLocalBounds();
    this.targetCentreLocal = {
      x: local.x + local.width / 2,
      y: local.y + local.height / 2
    };
    const centre = this.target.toGlobal(this.targetCentreLocal);
    this.targetStartCenterPoint.x = centre.x;
    this.targetStartCenterPoint.y = centre.y;
    this.startRotaton = this.target.rotation;
    this.startSize = { x: this.target.width, y: this.target.height };
    TransformLayer.dragging = true;
    this.active = true;
    // this.target.setSmartPivot(0);
    ev.stopPropagation();
  }

  private onMouseUp(ev: FederatedPointerEvent) {
    TransformLayer.dragging = false;
    this.active = false;
    ev.stopPropagation();
  }

  private onMouseMove(ev: FederatedPointerEvent) {
    if (!this.active || !TransformLayer.dragging) {
      return;
    }
    // unde se afla mouse-ul acum
    this.mouseEndPoint.x = ev.global.x;
    this.mouseEndPoint.y = ev.global.y;
    switch (this.type) {
      case HandleType.Rotate: {
        // Turn about the item's centre, by the angle the mouse has swept
        // round it. The item's position is its corner, so move the corner
        // to keep the centre where it was.
        const c = this.targetStartCenterPoint;
        const startAngle = Math.atan2(
          this.mouseStartPoint.y - c.y,
          this.mouseStartPoint.x - c.x
        );
        const endAngle = Math.atan2(
          this.mouseEndPoint.y - c.y,
          this.mouseEndPoint.x - c.x
        );
        this.target.rotation = this.startRotaton + endAngle - startAngle;
        const parent = this.target.parent;
        if (parent) {
          const want = parent.toLocal(c);
          const now = parent.toLocal(
            this.target.toGlobal(this.targetCentreLocal)
          );
          this.target.position.x += want.x - now.x;
          this.target.position.y += want.y - now.y;
        }
        break;
      }
      // Resizing moves the edge by as much as the mouse has moved along the
      // item's own axes. (Scaling by the ratio of the mouse's distances from
      // the corner moved an edge by a fraction of the drag.)
      case HandleType.Horizontal: {
        const d = this.dragAlongItem();
        this.target.width = Math.max(MIN_SIZE, this.startSize.x + d.x);
        break;
      }
      case HandleType.Vertical: {
        const d = this.dragAlongItem();
        this.target.height = Math.max(MIN_SIZE, this.startSize.y + d.y);
        break;
      }
      case HandleType.HorizontalVertical: {
        // The corner keeps the proportions.
        const d = this.dragAlongItem();
        const factor = Math.max(
          MIN_SIZE / Math.min(this.startSize.x, this.startSize.y),
          ((this.startSize.x + d.x) / this.startSize.x +
            (this.startSize.y + d.y) / this.startSize.y) /
            2
        );
        this.target.width = this.startSize.x * factor;
        this.target.height = this.startSize.y * factor;
        break;
      }
      case HandleType.Move: {
        // move delta: distanta intre click original si click in urma mutarii
        const delta = {
          x: this.mouseEndPoint.x - this.mouseStartPoint.x,
          y: this.mouseEndPoint.y - this.mouseStartPoint.y
        };
        if (!this.target.xLocked) {
          this.target.position.x = viewportX(this.targetStartPoint.x + delta.x);
          this.target.position.y = viewportY(this.targetStartPoint.y + delta.y);
        } else {
          const amount = (delta.x + delta.y) * 0.8;
          const parentWall = this.target.parent as unknown as Wall;

          //start of wall
          if (this.localCoords.x + amount <= WALL_THICKNESS * 0.5) {
            this.target.position.x = WALL_THICKNESS * 0.5;
          }
          //end of wall
          else if (
            this.localCoords.x + amount >=
            parentWall.length - this.target.width - WALL_THICKNESS * 0.5 //parent wall length
          ) {
            this.target.position.x =
              parentWall.length - this.target.width - WALL_THICKNESS * 0.5;
          }
          //meddle of wall
          else {
            this.target.position.x = this.localCoords.x + amount;
          }

          // this.target.position.x = viewportX(this.targetStartPoint.x) + delta.x;
        }

        break;
      }
    }
    // Redraw the box, handles and size labels round the item as it changes;
    // otherwise they only caught up when the mouse next crossed furniture.
    TransformLayer.Instance.update();
  }

  /** The mouse's movement since the press, in plan units, along the item's axes. */
  private dragAlongItem(): Point {
    const parent = this.target.parent;
    if (!parent) return { x: 0, y: 0 };
    const a = parent.toLocal(this.mouseStartPoint);
    const b = parent.toLocal(this.mouseEndPoint);
    const [dx, dy] = [b.x - a.x, b.y - a.y];
    const cos = Math.cos(this.target.rotation);
    const sin = Math.sin(this.target.rotation);
    return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
  }

  public setTarget(target: Furniture) {
    this.target = target;
  }

  /* sets scale and transform */
  public update(pos: Point) {
    this.position.set(pos.x, pos.y);
  }
}
