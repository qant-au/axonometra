// Keyboard access to the canvas. A cursor moves over the plan on the grid;
// Enter/Space does what a click would do with the active tool at that point,
// and Edit mode picks things up so the arrow keys can move them.
//
// Hit detection is geometric (keyboardHit.ts plus each object's local bounds)
// rather than going through Pixi's pointer hit testing, and each tool calls
// the same Action classes the pointer handlers use, so the result of a key
// press matches the result of a click.
import { getMain } from '../EditorRoot';
import { useStore } from '../../stores/EditorStore';
import { useFloorPlanStore } from '../../stores/FloorPlanStore';
import { useUnitsStore } from '../../stores/UnitsStore';
import { Point } from '../../helpers/Point';
import { snap } from '../../helpers/ViewportCoordinates';
import { getDoorFitting, getWindowFitting } from '../../res/catalog';
import { METER, Tool } from './constants';
import { AddFurnitureAction } from './actions/AddFurnitureAction';
import { AddNodeAction } from './actions/AddNodeAction';
import { AddWallManager } from './actions/AddWallManager';
import { DeleteFurnitureAction } from './actions/DeleteFurnitureAction';
import { DeleteWallAction } from './actions/DeleteWallAction';
import { DeleteWallNodeAction } from './actions/DeleteWallNodeAction';
import { beginGesture, endGesture, transact } from './history';
import { describePoint, nodeAt, wallAt } from './keyboardHit';
import { Furniture } from './objects/Furniture';
import { Wall } from './objects/Walls/Wall';
import { WallNode } from './objects/Walls/WallNode';

// One press moves one grid cell (10 cm); Shift moves a metre.
export const CURSOR_STEP = 10;
export const CURSOR_STEP_LARGE = METER;
// Nodes are drawn a little larger than a grid cell; this is the reach of
// "on a node".
const NODE_REACH = 15;
// Keep the cursor this far inside the visible area before panning.
const EDGE_MARGIN = 2 * METER;

interface Grab {
  label: string;
  items: { obj: { x: number; y: number }; x0: number; y0: number }[];
}

export class KeyboardCursor {
  private cursor: Point = { x: 0, y: 0 };
  private placed = false;
  private grab: Grab | null = null;

  constructor(
    private announce: (message: string) => void,
    private readonly readonly: boolean
  ) {}

  /** Put the cursor in the middle of the view the first time it is used. */
  public focus() {
    if (!this.placed) {
      const center = getMain().center;
      this.cursor = { x: snap(center.x), y: snap(center.y) };
      this.placed = true;
    }
    this.showCursor();
    this.announce(
      `Cursor at ${describePoint(this.cursor, useUnitsStore.getState().units)}.`
    );
  }

  public blur() {
    if (this.grab) this.cancel();
  }

  /** Returns true when the key was handled and should not reach the page. */
  public handleKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!this.placed) this.focus();
    const step = e.shiftKey ? CURSOR_STEP_LARGE : CURSOR_STEP;
    switch (e.key) {
      case 'ArrowLeft':
        this.move(-step, 0);
        return true;
      case 'ArrowRight':
        this.move(step, 0);
        return true;
      case 'ArrowUp':
        this.move(0, -step);
        return true;
      case 'ArrowDown':
        this.move(0, step);
        return true;
      case 'Enter':
      case ' ':
        if (!this.readonly) this.activate();
        return true;
      case 'Escape':
        this.escape();
        return true;
      case 'l':
      case 'L':
        if (!this.readonly) this.editLength();
        return true;
    }
    return false;
  }

  /** In Edit mode, open the length dialog for the wall under the cursor. */
  private editLength() {
    const state = useStore.getState();
    if (state.activeTool !== Tool.Edit || this.grab) return;
    const wall = this.wallHere();
    if (!wall) {
      this.announce('No wall at the cursor.');
      return;
    }
    state.setLengthEditWall(wall);
  }

  private move(dx: number, dy: number) {
    this.cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
    if (this.grab) {
      for (const item of this.grab.items) {
        item.obj.x += dx;
        item.obj.y += dy;
      }
      useFloorPlanStore.getState().redrawWalls();
    }
    this.showCursor();
    const where = describePoint(this.cursor, useUnitsStore.getState().units);
    this.announce(
      this.grab
        ? `Moving ${this.grab.label} to ${where}.`
        : `Cursor at ${where}.`
    );
  }

  private showCursor() {
    const main = getMain();
    main.pointer?.position.set(this.cursor.x, this.cursor.y);
    main.pointer?.showKeyboardRing(true);
    const { x, y } = this.cursor;
    if (
      x < main.left + EDGE_MARGIN ||
      x > main.right - EDGE_MARGIN ||
      y < main.top + EDGE_MARGIN ||
      y > main.bottom - EDGE_MARGIN
    ) {
      main.moveCenter(x, y);
    }
  }

  private activate() {
    if (this.grab) {
      this.drop();
      return;
    }
    switch (useStore.getState().activeTool) {
      case Tool.WallAdd:
        this.addWall();
        break;
      case Tool.Remove:
        this.remove();
        break;
      case Tool.Edit:
        this.pickUp();
        break;
      case Tool.FurnitureAddDoor:
        this.addFitting('door');
        break;
      case Tool.FurnitureAddWindow:
        this.addFitting('window');
        break;
      default:
        this.announce(
          'The current tool does not change the plan. Choose a tool from the toolbar.'
        );
    }
  }

  private escape() {
    if (this.grab) {
      this.cancel();
      return;
    }
    if (AddWallManager.Instance.previousNode) {
      AddWallManager.Instance.unset();
      this.announce('Wall drawing ended.');
    }
  }

  // --- what is under the cursor -------------------------------------------

  private nodeHere(): WallNode | undefined {
    const nodes = useFloorPlanStore
      .getState()
      .getWallNodeSeq()
      .getWallNodes()
      .values();
    return nodeAt(nodes, this.cursor, NODE_REACH);
  }

  private wallHere(): Wall | undefined {
    return wallAt(
      useFloorPlanStore.getState().getWallNodeSeq().getWalls(),
      this.cursor
    );
  }

  private furnitureHere(): Furniture | undefined {
    const global = getMain().toGlobal(this.cursor);
    let hit: Furniture | undefined;
    for (const furniture of useFloorPlanStore
      .getState()
      .getFurniture()
      .values()) {
      const local = furniture.toLocal(global);
      if (furniture.getLocalBounds().rectangle.contains(local.x, local.y)) {
        // Later furniture draws on top, so the last hit is the visible one.
        hit = furniture;
      }
    }
    return hit;
  }

  // --- tools ---------------------------------------------------------------

  private addWall() {
    const seq = useFloorPlanStore.getState().getWallNodeSeq();
    const nodesBefore = seq.getWallNodes().size;
    const wallsBefore = seq.getWalls().length;
    const node = this.nodeHere();
    transact(() => {
      if (node) {
        AddWallManager.Instance.step(node);
        return;
      }
      const wall = this.wallHere();
      new AddNodeAction(wall, { ...this.cursor }).execute();
    });
    const after = useFloorPlanStore.getState().getWallNodeSeq();
    const where = describePoint(this.cursor, useUnitsStore.getState().units);
    if (after.getWalls().length > wallsBefore) {
      this.announce(`Wall added, ending at ${where}.`);
    } else if (after.getWallNodes().size > nodesBefore) {
      this.announce(
        `Wall started at ${where}. Move and press Enter to continue.`
      );
    } else if (node && !AddWallManager.Instance.previousNode) {
      this.announce('Wall drawing ended.');
    } else if (node) {
      this.announce(`Wall continues from ${where}.`);
    } else {
      this.announce('Too close to an existing point. Move further away.');
    }
  }

  // Each branch reports what actually happened: the plan can refuse a
  // delete (a wall point with walls attached), and says so with a toast.
  private remove() {
    const plan = () => useFloorPlanStore.getState();
    const node = this.nodeHere();
    if (node) {
      const id = node.getId();
      transact(() => new DeleteWallNodeAction(id).execute());
      this.announce(
        plan().getWallNodeSeq().getWallNodes().has(id)
          ? 'This wall point still has walls attached. Delete the walls first.'
          : 'Wall point deleted.'
      );
      return;
    }
    const furniture = this.furnitureHere();
    if (furniture) {
      const id = furniture.getId();
      const name = this.furnitureName(furniture);
      transact(() => new DeleteFurnitureAction(id).execute());
      this.announce(
        plan().getFurniture().has(id)
          ? `${name} could not be deleted.`
          : `${name} deleted.`
      );
      return;
    }
    const wall = this.wallHere();
    if (wall) {
      transact(() => new DeleteWallAction(wall).execute());
      this.announce(
        plan().getWallNodeSeq().getWalls().includes(wall)
          ? 'This wall could not be deleted.'
          : 'Wall deleted.'
      );
      return;
    }
    this.announce('Nothing to delete here.');
  }

  private pickUp() {
    const node = this.nodeHere();
    if (node) {
      this.startGrab('wall point', [node]);
      return;
    }
    const furniture = this.furnitureHere();
    if (furniture) {
      if (furniture.isAttached) {
        this.announce(
          `${this.furnitureName(furniture)} is fixed to its wall. Move the wall instead.`
        );
        return;
      }
      this.startGrab(this.furnitureName(furniture), [furniture]);
      return;
    }
    const wall = this.wallHere();
    if (wall) {
      this.startGrab('wall', [wall.leftNode, wall.rightNode]);
      return;
    }
    this.announce('Nothing to pick up here.');
  }

  private startGrab(label: string, objs: { x: number; y: number }[]) {
    beginGesture();
    this.grab = {
      label,
      items: objs.map((obj) => ({ obj, x0: obj.x, y0: obj.y }))
    };
    this.announce(
      `Picked up ${label}. Use the arrow keys to move it, Enter to put it down, Escape to cancel.`
    );
  }

  private drop() {
    const label = this.grab?.label;
    this.grab = null;
    endGesture();
    this.announce(
      `Put down ${label} at ${describePoint(this.cursor, useUnitsStore.getState().units)}.`
    );
  }

  private cancel() {
    const grab = this.grab;
    if (!grab) return;
    const first = grab.items[0];
    const dx = first.x0 - first.obj.x;
    const dy = first.y0 - first.obj.y;
    for (const item of grab.items) {
      item.obj.x = item.x0;
      item.obj.y = item.y0;
    }
    useFloorPlanStore.getState().redrawWalls();
    this.cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
    this.showCursor();
    this.grab = null;
    endGesture();
    this.announce(`Move cancelled. ${grab.label} is back where it was.`);
  }

  private addFitting(kind: 'door' | 'window') {
    const wall = this.wallHere();
    if (!wall) {
      this.announce(`Place the cursor on a wall to add a ${kind}.`);
      return;
    }
    const local = wall.toLocal(getMain().toGlobal(this.cursor));
    new AddFurnitureAction(
      kind === 'door' ? getDoorFitting() : getWindowFitting(),
      wall,
      { x: local.x, y: 0 },
      wall.leftNode.getId(),
      wall.rightNode.getId()
    ).execute();
    this.announce(`${kind === 'door' ? 'Door' : 'Window'} added to the wall.`);
  }

  private furnitureName(furniture: Furniture): string {
    const name = furniture.resourcePath || 'furniture';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
