import type { EditorInstance } from '../../instance/EditorInstance';
import { FederatedPointerEvent } from 'pixi.js';
import { euclideanDistance } from '../../../helpers/EuclideanDistance';
import { Point } from '../../../helpers/Point';

import { SNAP_THRESHOLD } from '../constants';

import { WallNode } from '../objects/Walls/WallNode';
import { AddWallAction } from './AddWallAction';
import { Preview } from './MeasureToolManager';

// tracks current action data
export class AddWallManager {
  public previousNode: WallNode | undefined;

  public preview: Preview;

  constructor(private readonly inst: EditorInstance) {
    this.previousNode = undefined;
    this.preview = new Preview(this.inst);
  }

  // checks if step is valid
  public checkStep(coords: Point) {
    if (this.previousNode == undefined) {
      for (const [_id, node] of this.inst.plan
        .getState()
        .getWallNodeSeq()
        .getWallNodes()) {
        if (
          euclideanDistance(coords.x, node.x, coords.y, node.y) < SNAP_THRESHOLD
        ) {
          return false;
        }
      }
      return true;
    }

    if (
      euclideanDistance(
        coords.x,
        this.previousNode.x,
        coords.y,
        this.previousNode.y
      ) < SNAP_THRESHOLD
    ) {
      return false;
    }
    return true;
  }
  public step(node: WallNode) {
    // first click. set first node
    if (this.previousNode === undefined) {
      this.previousNode = node;
      this.preview.set(this.previousNode.position);
      return;
    }

    // double click. end chain
    if (this.previousNode.getId() === node.getId()) {
      this.unset();
      return;
    }

    //new node on screen
    const wallAction = new AddWallAction(this.inst, this.previousNode, node);
    wallAction.execute();
    this.preview.set(node.position);

    this.previousNode = node;
    this.preview.set(this.previousNode.position);
    // this.sizeLabel.visible = false;
  }

  public updatePreview(ev: FederatedPointerEvent) {
    this.preview.updatePreview(ev, true);
  }
  /** Ends the chain being drawn, and with it the drawing hint. */
  public unset() {
    const ending = this.previousNode !== undefined;
    this.previousNode = undefined;
    this.preview.set(undefined);
    if (ending) this.inst.dismissToolHint();
  }
  public resetTools() {
    this.inst.transformLayer.deselect();
    this.unset();
  }

  public dispose() {
    this.unset();
  }
}
