import type { EditorInstance } from '../../instance/EditorInstance';
import { Container } from 'pixi.js';
import { euclideanDistance } from '../../../helpers/EuclideanDistance';
import { Point } from '../../../helpers/Point';
import { getCorrespondingY } from '../../../helpers/Slope';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { MISCLICK_THRESHOLD } from '../constants';
import { FloorSerializable } from '../persistence/FloorSerializable';

import { Furniture } from './Furniture';
import { Wall } from './Walls/Wall';
import { WallNode } from './Walls/WallNode';
import { WallNodeSequence } from './Walls/WallNodeSequence';
import type { Box } from './Walls/RoomLabels';

export class Floor extends Container {
  public furnitureArray: Map<number, Furniture>;
  private wallNodeSequence: WallNodeSequence;
  /** Plan format v2; absent means the defaults. Kept so they survive a save. */
  public wallHeightM?: number;
  public elevationM?: number;
  constructor(
    private readonly inst: EditorInstance,
    floorData?: FloorSerializable,
    previousFloor?: Floor
  ) {
    super();

    this.furnitureArray = new Map<number, Furniture>();
    this.wallNodeSequence = new WallNodeSequence(this.inst);
    this.addChild(this.wallNodeSequence);
    this.wallNodeSequence.zIndex = 1002;
    // Room areas sit under the furniture, so an item in the middle of a room
    // is seen (and printed) over its area, not behind it.
    this.wallNodeSequence.roomLabels.zIndex = -1;
    this.addChild(this.wallNodeSequence.roomLabels);
    // ...and move off any item that would hide them.
    this.onRender = () =>
      this.wallNodeSequence.roomLabels.place(this.itemBoxes());
    this.sortableChildren = true;
    if (floorData) {
      const nodeLinks = new Map<number, number[]>(floorData.wallNodeLinks);

      this.wallNodeSequence.load(floorData.wallNodes, nodeLinks);
      for (const [left, right] of floorData.exteriorWalls ?? []) {
        this.wallNodeSequence.getWall(left, right)?.setIsExterior(true);
      }
      this.wallHeightM = floorData.wallHeightM;
      this.elevationM = floorData.elevationM;
      for (const fur of floorData.furnitureArray) {
        const furnitureData: FurnitureData = {
          width: fur.width,
          height: fur.height,
          imagePath: fur.texturePath
        };
        if (fur.zIndex) {
          furnitureData.zIndex = fur.zIndex;
        }
        if (fur.heightM != null) furnitureData.heightM = fur.heightM;
        if (fur.mountM != null) furnitureData.mountM = fur.mountM;
        const attachedTo =
          fur.attachedToLeft != null && fur.attachedToRight != null
            ? this.wallNodeSequence.getWall(
                fur.attachedToLeft,
                fur.attachedToRight
              )
            : null;
        const object = new Furniture(
          this.inst,
          furnitureData,
          fur.id,
          attachedTo ?? undefined,
          fur.attachedToLeft,
          fur.attachedToRight,
          fur.orientation
        );
        this.furnitureArray.set(fur.id, object);

        if (attachedTo != null) {
          attachedTo.addChild(object);
        } else {
          this.addChild(object);
        }
        object.position.set(fur.x, fur.y);
        object.rotation = fur.rotation;
      }
      return;
    }

    if (previousFloor) {
      const nodeCloneMap = new Map<number, number>();
      // first iteration, map previous node ids to new node ids as we're simply cloning them
      for (const wall of previousFloor.getExteriorWalls()) {
        [wall.leftNode, wall.rightNode].map((node) => {
          const oldId = node.getId();
          if (!nodeCloneMap.has(oldId)) {
            nodeCloneMap.set(oldId, this.wallNodeSequence.getNewNodeId());
            this.addNode(node.x, node.y, nodeCloneMap.get(oldId));
          }
        });
      }

      // now copy walls with respect to the node mapping
      previousFloor.getExteriorWalls().map((wall) => {
        const newLeftId = nodeCloneMap.get(wall.leftNode.getId());
        const newRightId = nodeCloneMap.get(wall.rightNode.getId());
        if (newLeftId == null || newRightId == null) return;
        const newWall = this.wallNodeSequence.addWall(newLeftId, newRightId);
        if (!newWall) return;
        newWall.setIsExterior(true);
      });
    }
  }

  public setLabelVisibility(value = true) {
    for (const wall of this.wallNodeSequence.getWalls()) {
      wall.lengthLabel.visible = value;
    }
    this.wallNodeSequence.roomLabels.visible = value;
  }
  public getFurniture() {
    return this.furnitureArray;
  }

  /** The free-standing items' footprints, in this floor's coordinates. */
  public itemBoxes(): Box[] {
    const boxes: Box[] = [];
    for (const item of this.furnitureArray.values()) {
      if (item.parent !== this) continue; // a door or window, in its wall
      const b = item.getBounds();
      const a = this.toLocal({ x: b.minX, y: b.minY });
      const c = this.toLocal({ x: b.maxX, y: b.maxY });
      boxes.push({
        x: Math.round(Math.min(a.x, c.x)),
        y: Math.round(Math.min(a.y, c.y)),
        width: Math.round(Math.abs(c.x - a.x)),
        height: Math.round(Math.abs(c.y - a.y))
      });
    }
    return boxes;
  }

  private getExteriorWalls() {
    return this.wallNodeSequence.getExteriorWalls();
  }

  public reset() {
    for (const id of this.furnitureArray.keys()) {
      this.removeFurniture(id);
    }
    this.wallNodeSequence.reset();
    this.furnitureArray = new Map<number, Furniture>();
  }
  public getWallNodeSequence() {
    return this.wallNodeSequence;
  }

  public addFurniture(
    obj: FurnitureData,
    id: number,
    attachedTo?: Wall,
    coords?: Point,
    attachedToLeft?: number,
    attachedToRight?: number
  ) {
    const object = new Furniture(
      this.inst,
      obj,
      id,
      attachedTo,
      attachedToLeft,
      attachedToRight
    );
    this.furnitureArray.set(id, object);

    if (attachedTo !== undefined && coords !== undefined) {
      attachedTo.addChild(object);
      object.position.set(coords.x, coords.y);
    } else if (coords !== undefined) {
      this.addChild(object);
      object.position.set(coords.x, coords.y);
    } else {
      // In the middle of what is on screen, so the person sees it arrive,
      // wherever they have panned or zoomed to.
      const main = this.inst.getMain();
      this.addChild(object);
      object.position.set(
        Math.round(main.center.x - object.width / 2),
        Math.round(main.center.y - object.height / 2)
      );
    }

    return id;
  }

  /**
   * A copy of a piece of furniture, in the same place, as Alt + drag leaves
   * behind: the original is what goes on being dragged. A door or window is
   * copied onto `onWall` (a copied wall) when given, else onto its own wall.
   */
  public cloneFurniture(source: Furniture, id: number, onWall?: Wall) {
    const data = source.serialize();
    const furnitureData: FurnitureData = {
      width: data.width,
      height: data.height,
      imagePath: data.texturePath,
      zIndex: data.zIndex
    };
    if (data.heightM != null) furnitureData.heightM = data.heightM;
    if (data.mountM != null) furnitureData.mountM = data.mountM;
    const wall = source.isAttached ? (onWall ?? (source.parent as Wall)) : null;
    const copy = new Furniture(
      this.inst,
      furnitureData,
      id,
      wall ?? undefined,
      wall ? wall.leftNode.getId() : undefined,
      wall ? wall.rightNode.getId() : undefined,
      data.orientation
    );
    this.furnitureArray.set(id, copy);
    (wall ?? this).addChild(copy);
    copy.position.set(data.x, data.y);
    copy.rotation = data.rotation;
    return copy;
  }

  /**
   * A copy of a wall, with its doors and windows, on new points in the same
   * place, for Alt + drag. `nextFurnitureId` hands out ids for the fittings.
   */
  public cloneWall(source: Wall, nextFurnitureId: () => number) {
    const left = this.addNode(source.leftNode.x, source.leftNode.y);
    const right = this.addNode(source.rightNode.x, source.rightNode.y);
    const wall = this.wallNodeSequence.addWall(left.getId(), right.getId());
    if (!wall) return undefined;
    if (source.isExteriorWall) wall.setIsExterior(true);
    for (const child of [...source.children]) {
      if (child instanceof Furniture) {
        this.cloneFurniture(child, nextFurnitureId(), wall);
      }
    }
    return wall;
  }

  public serialize(): FloorSerializable {
    const plan = new FloorSerializable();
    const wallNodes = this.wallNodeSequence.getWallNodes();
    for (const node of wallNodes.values()) {
      plan.wallNodes.push(node.serialize());
    }
    // wall node links
    plan.wallNodeLinks = Array.from(
      this.wallNodeSequence.getWallNodeLinks().entries()
    );
    // furniture
    const serializedFurniture = [];
    for (const furniture of this.furnitureArray.values()) {
      serializedFurniture.push(furniture.serialize());
    }
    plan.furnitureArray = serializedFurniture;
    const exterior = this.wallNodeSequence
      .getExteriorWalls()
      .map((wall): [number, number] => [
        wall.leftNode.getId(),
        wall.rightNode.getId()
      ]);
    if (exterior.length) plan.exteriorWalls = exterior;
    if (this.wallHeightM != null) plan.wallHeightM = this.wallHeightM;
    if (this.elevationM != null) plan.elevationM = this.elevationM;
    return plan;
  }
  public setFurniturePosition(
    id: number,
    x: number,
    y: number,
    angle?: number
  ) {
    const furniture = this.furnitureArray.get(id);
    if (!furniture) return;
    furniture.position.set(x, y);
    if (angle) {
      furniture.angle = angle;
    }
  }

  public removeFurniture(id: number) {
    const furniture = this.furnitureArray.get(id);
    if (!furniture) return;
    if (furniture.isAttached) {
      furniture.parent?.removeChild(furniture);
    } else {
      this.removeChild(furniture);
    }
    furniture.destroy({
      children: true,
      texture: false
    });
    this.furnitureArray.delete(id);
  }

  public getObject(id: number) {
    return this.furnitureArray.get(id);
  }

  public redrawWalls() {
    this.wallNodeSequence.drawWalls();
  }

  public removeWallNode(nodeId: number) {
    if (this.wallNodeSequence.contains(nodeId)) {
      this.wallNodeSequence.remove(nodeId);
    }
  }

  public removeWall(wall: Wall) {
    const leftNode = wall.leftNode.getId();
    const rightNode = wall.rightNode.getId();

    if (this.wallNodeSequence.contains(leftNode)) {
      this.wallNodeSequence.removeWall(leftNode, rightNode);
    }
  }

  public addNode(x: number, y: number, id?: number) {
    return this.wallNodeSequence.addNode(x, y, id);
  }

  public addNodeToWall(wall: Wall, coords: Point): WallNode | undefined {
    const leftNode = wall.leftNode.getId();
    const rightNode = wall.rightNode.getId();
    // ecuatia dreptei, obtine y echivalent lui x
    if (wall.angle != 90) {
      coords.y = getCorrespondingY(
        coords.x,
        wall.leftNode.position,
        wall.rightNode.position
      );
    }

    // prevent misclicks
    if (
      Math.abs(
        euclideanDistance(coords.x, wall.leftNode.x, coords.y, wall.leftNode.y)
      ) < MISCLICK_THRESHOLD
    ) {
      return undefined;
    }
    if (
      Math.abs(
        euclideanDistance(
          coords.x,
          wall.rightNode.x,
          coords.y,
          wall.rightNode.y
        )
      ) < MISCLICK_THRESHOLD
    ) {
      return undefined;
    }

    // delete wall between left and right node
    this.removeWall(wall);
    // add node and connect walls to it

    const newNode = this.wallNodeSequence.addNode(coords.x, coords.y);
    const newNodeId = newNode.getId();
    this.wallNodeSequence.addWall(leftNode, newNodeId);
    this.wallNodeSequence.addWall(newNodeId, rightNode);

    return newNode;
  }
}
