// Keyboard access to the canvas. A cursor moves over the plan on the grid;
// Enter/Space does what a click would do with the active tool at that point,
// and Edit mode picks things up so the arrow keys can move them.
//
// Hit detection is geometric (keyboardHit.ts plus each object's local bounds)
// rather than going through Pixi's pointer hit testing, and each tool calls
// the same Action classes the pointer handlers use, so the result of a key
// press matches the result of a click.
import type { EditorInstance } from '../instance/EditorInstance';
import { Point } from '../../helpers/Point';
import { snap } from '../../helpers/ViewportCoordinates';
import { getDoorFitting, getWindowFitting } from '../../res/catalog';
import { METER, Tool } from './constants';
import { AddFurnitureAction } from './actions/AddFurnitureAction';
import { AddNodeAction } from './actions/AddNodeAction';
import { DeleteFurnitureAction } from './actions/DeleteFurnitureAction';
import { DeleteWallAction } from './actions/DeleteWallAction';
import { DeleteWallNodeAction } from './actions/DeleteWallNodeAction';
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
  // In use: the canvas was reached from the keyboard, or a key has moved the
  // cursor since the last mouse press. While it is not, the arrow keys and
  // Enter belong to the selection (nudge, edit) and Space to panning.
  private active = false;
  private grab: Grab | null = null;

  constructor(
    private readonly inst: EditorInstance,
    private announce: (message: string) => void,
    private readonly readonly: boolean
  ) {}

  /** Put the cursor in the middle of the view the first time it is used. */
  public focus() {
    if (!this.placed) {
      const center = this.inst.getMain().center;
      this.cursor = { x: snap(center.x), y: snap(center.y) };
      this.placed = true;
    }
    this.active = true;
    this.showCursor();
    this.announce(
      `Cursor at ${describePoint(this.cursor, this.inst.units.getState().units)}.`
    );
  }

  public blur() {
    if (this.grab) this.cancel();
    this.active = false;
  }

  /** A mouse press hands the canvas back to the pointer. */
  public pointerPressed() {
    if (!this.grab) this.active = false;
  }

  public get isActive() {
    return this.active;
  }

  /** Returns true when the key was handled and should not reach the page. */
  public handleKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!this.active) {
      const arrow = e.key.startsWith('Arrow');
      // With something selected, the arrows nudge it; with nothing, the
      // first arrow brings the cursor up, as it always has.
      if (!arrow || this.inst.selection.getState().refs.length > 0)
        return false;
      this.focus();
    }
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
    }
    return false;
  }

  /**
   * Ctrl/Cmd + Enter in Edit mode (the shared keymap's "edit geometry"):
   * open the length dialog for the wall under the cursor. False when the
   * cursor is not in use, so the selected wall is edited instead.
   */
  public editLength(): boolean {
    if (!this.active || this.readonly) return false;
    const state = this.inst.editor.getState();
    if (state.activeTool !== Tool.Edit || this.grab) return true;
    const wall = this.wallHere();
    if (!wall) {
      this.announce('No wall at the cursor.');
      return true;
    }
    state.setLengthEditWall(wall);
    return true;
  }

  private move(dx: number, dy: number) {
    this.cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
    if (this.grab) {
      for (const item of this.grab.items) {
        item.obj.x += dx;
        item.obj.y += dy;
      }
      this.inst.plan.getState().redrawWalls();
    }
    this.showCursor();
    const where = describePoint(this.cursor, this.inst.units.getState().units);
    this.announce(
      this.grab
        ? `Moving ${this.grab.label} to ${where}.`
        : `Cursor at ${where}.`
    );
  }

  private showCursor() {
    const main = this.inst.getMain();
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
    switch (this.inst.editor.getState().activeTool) {
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
    const chain = this.inst.addWallManager.previousNode !== undefined;
    if (this.inst.commands.endDrawing() && chain) {
      this.announce('Wall drawing ended.');
    }
  }

  // --- what is under the cursor -------------------------------------------

  private nodeHere(): WallNode | undefined {
    const nodes = this.inst.plan
      .getState()
      .getWallNodeSeq()
      .getWallNodes()
      .values();
    return nodeAt(nodes, this.cursor, NODE_REACH);
  }

  private wallHere(): Wall | undefined {
    return wallAt(
      this.inst.plan.getState().getWallNodeSeq().getWalls(),
      this.cursor
    );
  }

  private furnitureHere(): Furniture | undefined {
    const global = this.inst.getMain().toGlobal(this.cursor);
    let hit: Furniture | undefined;
    for (const furniture of this.inst.plan.getState().getFurniture().values()) {
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
    const seq = this.inst.plan.getState().getWallNodeSeq();
    const nodesBefore = seq.getWallNodes().size;
    const wallsBefore = seq.getWalls().length;
    const node = this.nodeHere();
    this.inst.edits.transact(() => {
      if (node) {
        this.inst.addWallManager.step(node);
        return;
      }
      const wall = this.wallHere();
      new AddNodeAction(this.inst, wall, { ...this.cursor }).execute();
    });
    const after = this.inst.plan.getState().getWallNodeSeq();
    const where = describePoint(this.cursor, this.inst.units.getState().units);
    if (after.getWalls().length > wallsBefore) {
      this.announce(`Wall added, ending at ${where}.`);
    } else if (after.getWallNodes().size > nodesBefore) {
      this.announce(
        `Wall started at ${where}. Move and press Enter to continue.`
      );
    } else if (node && !this.inst.addWallManager.previousNode) {
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
    const plan = () => this.inst.plan.getState();
    const node = this.nodeHere();
    if (node) {
      const id = node.getId();
      this.inst.edits.transact(() =>
        new DeleteWallNodeAction(this.inst, id).execute()
      );
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
      this.inst.edits.transact(() =>
        new DeleteFurnitureAction(this.inst, id).execute()
      );
      this.announce(
        plan().getFurniture().has(id)
          ? `${name} could not be deleted.`
          : `${name} deleted.`
      );
      return;
    }
    const wall = this.wallHere();
    if (wall) {
      this.inst.edits.transact(() =>
        new DeleteWallAction(this.inst, wall).execute()
      );
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
    this.inst.edits.beginGesture();
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
    this.inst.edits.endGesture();
    this.announce(
      `Put down ${label} at ${describePoint(this.cursor, this.inst.units.getState().units)}.`
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
    this.inst.plan.getState().redrawWalls();
    this.cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
    this.showCursor();
    this.grab = null;
    this.inst.edits.endGesture();
    this.announce(`Move cancelled. ${grab.label} is back where it was.`);
  }

  private addFitting(kind: 'door' | 'window') {
    const wall = this.wallHere();
    if (!wall) {
      this.announce(`Place the cursor on a wall to add a ${kind}.`);
      return;
    }
    const local = wall.toLocal(this.inst.getMain().toGlobal(this.cursor));
    new AddFurnitureAction(
      this.inst,
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
