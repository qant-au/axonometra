// Geometry for the keyboard cursor: what lies under a world-space point.
// Pure functions over plain coordinates so they can be tested without Pixi.
import { planToMm } from '../../helpers/planLength';
import { Point } from '../../helpers/Point';
import { formatLength, type LengthUnit } from '../../vendor/accurona-core';

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

/** Plan coordinates as a person reads them, in the plan's display units. */
export function describePoint(p: Point, units: LengthUnit): string {
  return `${formatLength(planToMm(p.x), units)} across, ${formatLength(planToMm(p.y), units)} down`;
}

/**
 * The segment a–b stretched or shrunk to `length`, about its midpoint and
 * along its current direction. A zero-length segment has no direction, so it
 * is returned unchanged.
 */
export function resizeAboutMidpoint(
  a: NodeLike,
  b: NodeLike,
  length: number
): [NodeLike, NodeLike] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const current = Math.hypot(dx, dy);
  if (current === 0)
    return [
      { x: a.x, y: a.y },
      { x: b.x, y: b.y }
    ];
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const ux = ((dx / current) * length) / 2;
  const uy = ((dy / current) * length) / 2;
  return [
    { x: mx - ux, y: my - uy },
    { x: mx + ux, y: my + uy }
  ];
}
