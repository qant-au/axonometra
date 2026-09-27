// Geometry for the keyboard cursor: what lies under a world-space point.
// Pure functions over plain coordinates so they can be tested without Pixi.
import { Point } from '../../helpers/Point';

export interface NodeLike {
  x: number;
  y: number;
}

export interface WallLike {
  leftNode: NodeLike;
  rightNode: NodeLike;
  thickness: number;
}

/** The node closest to `p`, if any lies within `tolerance`. */
export function nodeAt<T extends NodeLike>(
  nodes: Iterable<T>,
  p: Point,
  tolerance: number
): T | undefined {
  let best: T | undefined;
  let bestDistance = tolerance;
  for (const node of nodes) {
    const d = Math.hypot(node.x - p.x, node.y - p.y);
    if (d <= bestDistance) {
      best = node;
      bestDistance = d;
    }
  }
  return best;
}

/** Distance from `p` to the segment a–b. */
export function distanceToSegment(p: Point, a: NodeLike, b: NodeLike): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared)
  );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The nearest wall whose drawn body (half its thickness) covers `p`. */
export function wallAt<T extends WallLike>(
  walls: Iterable<T>,
  p: Point
): T | undefined {
  let best: T | undefined;
  let bestDistance = Infinity;
  for (const wall of walls) {
    const d = distanceToSegment(p, wall.leftNode, wall.rightNode);
    if (d <= wall.thickness / 2 && d < bestDistance) {
      best = wall;
      bestDistance = d;
    }
  }
  return best;
}

/** Plan coordinates as a person reads them: metres, two decimals. */
export function describePoint(p: Point, meter: number): string {
  return `${(p.x / meter).toFixed(2)} m across, ${(p.y / meter).toFixed(2)} m down`;
}
