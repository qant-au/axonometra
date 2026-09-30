import type { EditorInstance } from '../../../instance/EditorInstance';
import { Container, Text, TextStyle } from 'pixi.js';
import {
  findRooms,
  labelPoint,
  type GraphWall,
  type Point
} from '../../../scene3d/geometry';
import { LABEL_COLOR, LABEL_FONT, LABEL_FONT_SIZE } from '../../constants';
import type { Wall } from './Wall';
import type { WallNode } from './WallNode';

// Each room's floor area, written in the middle of the room: the same rooms,
// traced along wall centre lines, that the 3D view lays its floor slabs on.
export class RoomLabels extends Container {
  private readonly style = new TextStyle({
    fontFamily: LABEL_FONT,
    fontSize: LABEL_FONT_SIZE,
    fill: LABEL_COLOR,
    align: 'center'
  });

  constructor(private readonly inst: EditorInstance) {
    super();
    // Read-outs only: a press on a label reaches whatever lies beneath it.
    this.eventMode = 'none';
  }

  public update(wallNodes: Map<number, WallNode>, walls: Wall[]) {
    for (const child of [...this.children]) {
      this.removeChild(child);
      child.destroy();
    }
    const nodes = new Map<number, Point>();
    for (const [id, node] of wallNodes) nodes.set(id, { x: node.x, y: node.y });
    const graph: GraphWall[] = walls.map((wall) => ({
      id: `${wall.leftNode.getId()}-${wall.rightNode.getId()}`,
      a: wall.leftNode.getId(),
      b: wall.rightNode.getId(),
      thickness: 0
    }));
    for (const room of findRooms(nodes, graph)) {
      const at = labelPoint(room.polygon);
      const text = new Text({
        text: this.inst.formatArea(room.area),
        style: this.style
      });
      text.position.set(at.x - text.width / 2, at.y - text.height / 2);
      this.addChild(text);
    }
  }
}
