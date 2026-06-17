import { Container } from 'pixi.js';
import { euclideanDistance } from '../../../helpers/EuclideanDistance';
import { Point } from '../../../helpers/Point';
import { getCorrespondingY } from '../../../helpers/Slope';
import { FurnitureData } from '../../../stores/FurnitureStore';
import { getMain } from '../../EditorRoot';
import { MISCLICK_THRESHOLD } from '../constants';
import { FloorSerializable } from '../persistence/FloorSerializable';

import { Furniture } from './Furniture';
import { Wall } from './Walls/Wall';
import { WallNode } from './Walls/WallNode';
import { WallNodeSequence } from './Walls/WallNodeSequence';

export class Floor extends Container {
  public furnitureArray: Map<number, Furniture>;
  private wallNodeSequence: WallNodeSequence;
  constructor(floorData?: FloorSerializable, previousFloor?: Floor) {
    super();

    this.furnitureArray = new Map<number, Furniture>();
    this.wallNodeSequence = new WallNodeSequence();
    this.addChild(this.wallNodeSequence);
    this.wallNodeSequence.zIndex = 1002;
    this.sortableChildren = true;
    if (floorData) {
      const nodeLinks = new Map<number, number[]>(floorData.wallNodeLinks);

      this.wallNodeSequence.load(floorData.wallNodes, nodeLinks);
      for (const fur of floorData.furnitureArray) {
        const furnitureData: FurnitureData = {
          width: fur.width,
          height: fur.height,
          imagePath: fur.texturePath
        };
        if (fur.zIndex) {
          furnitureData.zIndex = fur.zIndex;
        }
        const attachedTo =
          fur.attachedToLeft != null && fur.attachedToRight != null
            ? this.wallNodeSequence.getWall(
                fur.attachedToLeft,
                fur.attachedToRight
              )
            : null;
        const object = new Furniture(
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
  }
  public getFurniture() {
    return this.furnitureArray;
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
    } else {
      const main = getMain();
      this.addChild(object);
      object.position.set(main.corner.x + 150, main.corner.y + 150);
    }

    return id;
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
