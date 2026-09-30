import type { EditorInstance } from '../../../instance/EditorInstance';
import { Container } from 'pixi.js';
import { INodeSerializable } from '../../persistence/INodeSerializable';
import { RoomLabels } from './RoomLabels';
import { Wall } from './Wall';
import { WallNode } from './WallNode';

export class WallNodeSequence extends Container {
  private wallNodes: Map<number, WallNode>;
  private wallNodeLinks: Map<number, number[]>;
  private walls: Wall[];
  public readonly roomLabels: RoomLabels;
  constructor(private readonly inst: EditorInstance) {
    super();
    this.sortableChildren = true;
    this.walls = [];
    this.roomLabels = new RoomLabels(this.inst);
    this.roomLabels.zIndex = 997;
    this.addChild(this.roomLabels);
    this.wallNodes = new Map<number, WallNode>();
    this.wallNodeLinks = new Map<number, number[]>();
    this.drawWalls();
  }

  public setId(id: number) {
    this.inst.wallNodeId = id;
  }

  public getExteriorWalls(): Wall[] {
    return this.walls.filter((wall) => wall.isExteriorWall);
  }

  public getWallNodeId() {
    return this.inst.wallNodeId;
  }
  public contains(id: number) {
    return this.wallNodes.has(id);
  }

  public getWalls() {
    return this.walls;
  }

  public getWallNodes() {
    return this.wallNodes;
  }

  public getWallNodeLinks() {
    return this.wallNodeLinks;
  }

  public load(nodes: INodeSerializable[], nodeLinks: Map<number, number[]>) {
    for (const node of nodes) {
      this.addNode(node.x, node.y, node.id);
    }
    for (const [src, dests] of nodeLinks) {
      for (const dest of dests) {
        this.addWall(src, dest);
      }
    }
  }

  // drop everything
  public reset() {
    for (const node of this.wallNodes.values()) {
      node.destroy(true);
    }
    this.wallNodes.clear();

    for (const wall of this.walls) {
      wall.destroy(true);
    }
    this.walls = [];

    this.wallNodeLinks.clear();
    this.inst.wallNodeId = 0;
  }
  public remove(id: number) {
    //TODO only remove if connected to 2 points.
    const ownLinks = this.wallNodeLinks.get(id);
    if (!ownLinks) return;
    let isolated = true;
    if (ownLinks.length > 0) {
      isolated = false;
    } else {
      for (const dests of this.wallNodeLinks.values()) {
        for (const dest of dests) {
          if (dest == id) {
            isolated = false;
          }
        }
      }
    }

    if (isolated) {
      // remove node
      const node = this.wallNodes.get(id);
      if (node) {
        node.destroy(true);
        this.wallNodes.delete(id);
      }

      // Undo restores whole-plan snapshots (editor/history.ts), so the
      // removed links need not be remembered here.
      // this.wallNodeLinks[id].length = 0;
    } else {
      this.inst.notify({
        title: 'Not permitted',
        severity: 'error',
        message:
          'Cannot delete node with walls attached. Please remove walls first.'
      });
    }
  }

  public getNewNodeId() {
    this.inst.wallNodeId += 1;
    return this.inst.wallNodeId;
  }

  public addNode(x: number, y: number, id?: number) {
    const nodeId = id ?? this.getNewNodeId();
    const node = new WallNode(this.inst, x, y, nodeId);
    this.wallNodes.set(nodeId, node);
    this.wallNodeLinks.set(nodeId, []);
    this.addChild(node);
    return node;
  }

  public addWall(leftNodeId: number, rightNodeId: number): Wall | undefined {
    //
    if (leftNodeId == rightNodeId) {
      return undefined;
    }
    if (leftNodeId > rightNodeId) {
      const aux = leftNodeId;
      leftNodeId = rightNodeId;
      rightNodeId = aux;
    }

    const links = this.wallNodeLinks.get(leftNodeId);
    if (!links) return undefined;
    if (links.includes(rightNodeId)) return undefined;
    const leftNode = this.wallNodes.get(leftNodeId);
    const rightNode = this.wallNodes.get(rightNodeId);
    if (!leftNode || !rightNode) return undefined;
    links.push(rightNodeId);
    const wall = new Wall(this.inst, leftNode, rightNode);
    this.walls.push(wall);
    this.addChild(wall);
    this.drawWalls();
    return wall;
  }

  public removeWall(leftNode: number, rightNode: number) {
    const links = this.wallNodeLinks.get(leftNode);
    if (!links) return;
    const index = links.indexOf(rightNode);

    if (index != -1) {
      links.splice(index, 1);
      this.drawWalls();
    }
    let toBeRemoved = -1;
    for (let i = 0; i < this.walls.length; i++) {
      const wall = this.walls[i];
      if (
        wall.leftNode.getId() == leftNode &&
        wall.rightNode.getId() == rightNode
      ) {
        toBeRemoved = i;
        break;
      }
    }
    if (toBeRemoved != -1) {
      this.removeChild(this.walls[toBeRemoved]);
      this.walls.splice(toBeRemoved, 1);
      this.roomLabels.update(this.wallNodes, this.walls);
    }
  }

  public getWall(leftNodeId: number, rightNodeId: number) {
    const links = this.wallNodeLinks.get(leftNodeId);
    if (!links || !links.includes(rightNodeId)) {
      return null;
    }

    for (const wall of this.walls) {
      if (
        wall.leftNode.getId() === leftNodeId &&
        wall.rightNode.getId() === rightNodeId
      ) {
        return wall;
      }
    }

    return null;
  }
  public drawWalls() {
    this.walls.forEach((wall) => {
      wall.drawLine();
    });
    this.roomLabels.update(this.wallNodes, this.walls);
  }
}
