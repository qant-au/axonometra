import type { EditorInstance } from '../../../instance/EditorInstance';
import { Container, Text, TextStyle } from 'pixi.js';
import {
  contains,
  findRooms,
  labelPoint,
  type GraphWall,
  type Point
} from '../../../scene3d/geometry';
import { LABEL_COLOR, LABEL_FONT, LABEL_FONT_SIZE } from '../../constants';
import type { Wall } from './Wall';
import type { WallNode } from './WallNode';

/** An axis-aligned box in plan coordinates. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

/**
 * Where a label of `size` goes in a room: centred on `at` unless an item
 * covers that, else the nearest spot inside the room that no item covers.
 * Returns the label's top-left corner. With nowhere clear it stays at `at`.
 */
export function clearSpot(
  polygon: Point[],
  at: Point,
  size: { width: number; height: number },
  items: Box[]
): Point {
  const box = (c: Point): Box => ({
    x: c.x - size.width / 2,
    y: c.y - size.height / 2,
    width: size.width,
    height: size.height
  });
  const fits = (c: Point) => {
    const b = box(c);
    const corners = [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y },
      { x: b.x, y: b.y + b.height },
      { x: b.x + b.width, y: b.y + b.height }
    ];
    return (
      corners.every((p) => contains(polygon, p)) &&
      !items.some((item) => overlaps(b, item))
    );
  };
  const corner = (c: Point) => ({
    x: c.x - size.width / 2,
    y: c.y - size.height / 2
  });
  if (!items.some((item) => overlaps(box(at), item))) return corner(at);

  const xs = polygon.map((p) => p.x);
  const ys = polygon.map((p) => p.y);
  const step = Math.max(size.height / 2, 1);
  const candidates: Point[] = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
      candidates.push({ x, y });
    }
  }
  const distance = (c: Point) => (c.x - at.x) ** 2 + (c.y - at.y) ** 2;
  candidates.sort((a, b) => distance(a) - distance(b));
  const found = candidates.find(fits);
  return corner(found ?? at);
}

// Each room's floor area, written in the middle of the room: the same rooms,
// traced along wall centre lines, that the 3D view lays its floor slabs on.
// The labels draw under the furniture, so each one moves off any item that
// would hide it.
export class RoomLabels extends Container {
  private readonly style = new TextStyle({
    fontFamily: LABEL_FONT,
    fontSize: LABEL_FONT_SIZE,
    fill: LABEL_COLOR,
    align: 'center'
  });

  private rooms: { polygon: Point[]; at: Point; text: Text }[] = [];
  /** The item boxes the labels were last placed against. */
  private placedFor = '';

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
    this.rooms = [];
    this.placedFor = '';
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
      this.rooms.push({ polygon: room.polygon, at, text });
    }
    this.place([]);
  }

  /**
   * Moves each label clear of the items (boxes in plan coordinates). Cheap
   * to call every frame: it does the work only when the boxes change.
   */
  public place(items: Box[]) {
    const key = JSON.stringify(items);
    if (key === this.placedFor) return;
    this.placedFor = key;
    for (const { polygon, at, text } of this.rooms) {
      const spot = clearSpot(
        polygon,
        at,
        { width: text.width, height: text.height },
        items
      );
      text.position.set(spot.x, spot.y);
    }
  }
}
