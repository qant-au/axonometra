// Selection-level edits on the serialised plan: select all, marquee hits,
// copy, paste, delete and move. They work on plain data (FloorSerializable),
// never on the Pixi objects, so they are testable on their own; the caller
// applies the result by rebuilding the plan, as undo does (history.ts).
import { INTERIOR_WALL_THICKNESS, METER, WALL_THICKNESS } from '../constants';
import type { FloorPlanSerializable } from '../persistence/FloorPlanSerializable';
import type { FloorSerializable } from '../persistence/FloorSerializable';
import type { IFurnitureSerializable } from '../persistence/IFurnitureSerializable';
import type { INodeSerializable } from '../persistence/INodeSerializable';

/** A wall is named by its two node ids, lower first, as the plan stores it. */
export type SelectionRef =
  | { kind: 'furniture'; id: number }
  | { kind: 'wall'; left: number; right: number };

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What Copy puts on the clipboard: walls with their nodes, and furniture. */
export interface Fragment {
  nodes: INodeSerializable[];
  walls: [number, number][];
  exterior: [number, number][];
  furniture: IFurnitureSerializable[];
}

export const refKey = (ref: SelectionRef): string =>
  ref.kind === 'furniture' ? `f:${ref.id}` : `w:${ref.left}-${ref.right}`;

export const wallRef = (a: number, b: number): SelectionRef => ({
  kind: 'wall',
  left: Math.min(a, b),
  right: Math.max(a, b)
});

export const sameRef = (a: SelectionRef, b: SelectionRef): boolean =>
  refKey(a) === refKey(b);

export function wallsOf(floor: FloorSerializable): [number, number][] {
  const walls: [number, number][] = [];
  for (const [left, rights] of floor.wallNodeLinks) {
    for (const right of rights) walls.push([left, right]);
  }
  return walls;
}

const isExterior = (floor: FloorSerializable, l: number, r: number) =>
  (floor.exteriorWalls ?? []).some(([a, b]) => a === l && b === r);

const nodeMap = (floor: FloorSerializable) =>
  new Map(floor.wallNodes.map((n) => [n.id, n]));

/** Every wall and piece of furniture on the floor. */
export function allRefs(floor: FloorSerializable): SelectionRef[] {
  return [
    ...wallsOf(floor).map(([l, r]) => wallRef(l, r)),
    ...floor.furnitureArray.map((f): SelectionRef => ({
      kind: 'furniture',
      id: f.id
    }))
  ];
}

/** Drops references to things no longer on the floor. */
export function existingRefs(
  floor: FloorSerializable,
  refs: SelectionRef[]
): SelectionRef[] {
  const keys = new Set(allRefs(floor).map(refKey));
  return refs.filter((ref) => keys.has(refKey(ref)));
}

// The wall's drawing origin and direction, as Wall.drawLine places it: from
// the leftmost node (the upper one when vertical), pivoted on its centre line.
function wallFrame(floor: FloorSerializable, left: number, right: number) {
  const nodes = nodeMap(floor);
  const a = nodes.get(left);
  const b = nodes.get(right);
  if (!a || !b) return undefined;
  const [p, q] = a.x < b.x || (a.x === b.x && a.y < b.y) ? [a, b] : [b, a];
  const theta = Math.atan2(q.y - p.y, q.x - p.x);
  const thickness = isExterior(floor, left, right)
    ? WALL_THICKNESS
    : INTERIOR_WALL_THICKNESS;
  return { origin: p, theta, thickness };
}

/** Corners of a piece of furniture in floor coordinates. */
export function furnitureCorners(
  floor: FloorSerializable,
  f: IFurnitureSerializable
): { x: number; y: number }[] {
  const w = f.width * METER;
  const h = f.height * METER;
  const local = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ];
  let theta = f.rotation;
  let origin = { x: f.x, y: f.y };
  if (f.attachedToLeft != null && f.attachedToRight != null) {
    const frame = wallFrame(floor, f.attachedToLeft, f.attachedToRight);
    if (frame) {
      // Local to the wall, whose pivot sits half a thickness down.
      const c = Math.cos(frame.theta);
      const s = Math.sin(frame.theta);
      const ly = f.y - frame.thickness / 2;
      origin = {
        x: frame.origin.x + f.x * c - ly * s,
        y: frame.origin.y + f.x * s + ly * c
      };
      theta = frame.theta + f.rotation;
    }
  }
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return local.map((p) => ({
    x: origin.x + p.x * c - p.y * s,
    y: origin.y + p.x * s + p.y * c
  }));
}

const boundsOf = (points: { x: number; y: number }[]): Rect | undefined => {
  if (points.length === 0) return undefined;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};

const inside = (r: Rect, p: { x: number; y: number }) =>
  p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;

function refPoints(
  floor: FloorSerializable,
  ref: SelectionRef
): { x: number; y: number }[] {
  if (ref.kind === 'wall') {
    const nodes = nodeMap(floor);
    return [nodes.get(ref.left), nodes.get(ref.right)].filter(
      (n): n is INodeSerializable => n != null
    );
  }
  const f = floor.furnitureArray.find((item) => item.id === ref.id);
  return f ? furnitureCorners(floor, f) : [];
}

/** What a marquee selects: everything wholly inside it, as in Excalidraw. */
export function refsInRect(
  floor: FloorSerializable,
  rect: Rect
): SelectionRef[] {
  return allRefs(floor).filter((ref) => {
    const points = refPoints(floor, ref);
    return points.length > 0 && points.every((p) => inside(rect, p));
  });
}

/** The box around some objects, for Fit the selection. */
export function refsBounds(
  floor: FloorSerializable,
  refs: SelectionRef[]
): Rect | undefined {
  return boundsOf(refs.flatMap((ref) => refPoints(floor, ref)));
}

/** The box around the whole floor, for Fit everything. */
export function floorBounds(floor: FloorSerializable): Rect | undefined {
  return refsBounds(floor, allRefs(floor));
}

// The walls a selection names, and the furniture that goes with it: the
// pieces selected, plus the doors and windows of every selected wall.
function expand(floor: FloorSerializable, refs: SelectionRef[]) {
  const walls = new Set(
    refs.flatMap((r) => (r.kind === 'wall' ? [`${r.left}-${r.right}`] : []))
  );
  const onWall = (f: IFurnitureSerializable) =>
    f.attachedToLeft != null &&
    walls.has(`${f.attachedToLeft}-${f.attachedToRight}`);
  const ids = new Set(
    refs.flatMap((r) => (r.kind === 'furniture' ? [r.id] : []))
  );
  const furniture = floor.furnitureArray.filter(
    (f) => ids.has(f.id) || onWall(f)
  );
  return { walls, furniture };
}

/** Copies the selection. A door or window whose wall is not copied is left out. */
export function buildFragment(
  floor: FloorSerializable,
  refs: SelectionRef[]
): Fragment {
  const { walls, furniture } = expand(floor, refs);
  const wallList = wallsOf(floor).filter(([l, r]) => walls.has(`${l}-${r}`));
  const nodeIds = new Set(wallList.flat());
  return {
    nodes: floor.wallNodes
      .filter((n) => nodeIds.has(n.id))
      .map((n) => ({ ...n })),
    walls: wallList.map(([l, r]) => [l, r]),
    exterior: wallList
      .filter(([l, r]) => isExterior(floor, l, r))
      .map(([l, r]) => [l, r]),
    furniture: furniture
      .filter(
        (f) =>
          f.attachedToLeft == null ||
          walls.has(`${f.attachedToLeft}-${f.attachedToRight}`)
      )
      .map((f) => ({ ...f }))
  };
}

/**
 * The first step, from `start` on, at which a fragment pasted `step` times
 * that far down and right puts none of its wall points or free-standing
 * items exactly where one already is: a copy there hid what was under it,
 * as the sibling Reticulyne also refuses. Step 0 is where it was copied
 * from, free again after a Cut.
 */
export function freePasteStep(
  floor: FloorSerializable,
  fragment: Fragment,
  start: number,
  step: number
): number {
  const key = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  const standing = (f: IFurnitureSerializable) => f.attachedToLeft == null;
  const taken = new Set([
    ...floor.wallNodes.map((n) => key(n.x, n.y)),
    ...floor.furnitureArray.filter(standing).map((f) => key(f.x, f.y))
  ]);
  const points = [
    ...fragment.nodes,
    ...fragment.furniture.filter(standing)
  ].map((p) => ({ x: p.x, y: p.y }));
  for (let n = start; n < start + 200; n += 1) {
    const d = n * step;
    if (!points.some((p) => taken.has(key(p.x + d, p.y + d)))) return n;
  }
  return start;
}

export const isEmptyFragment = (fragment: Fragment) =>
  fragment.walls.length === 0 && fragment.furniture.length === 0;

/**
 * Adds a fragment to a floor of the plan, offset by (dx, dy), with fresh ids.
 * Mutates `plan` and returns what was added, to select it.
 */
export function pasteFragment(
  plan: FloorPlanSerializable,
  floorIndex: number,
  fragment: Fragment,
  dx: number,
  dy: number
): SelectionRef[] {
  const floor = plan.floors[floorIndex];
  if (!floor) return [];
  const nodeIds = new Map<number, number>();
  for (const node of fragment.nodes) {
    plan.wallNodeId += 1;
    nodeIds.set(node.id, plan.wallNodeId);
    floor.wallNodes.push({
      id: plan.wallNodeId,
      x: node.x + dx,
      y: node.y + dy
    });
    floor.wallNodeLinks.push([plan.wallNodeId, []]);
  }
  const links = new Map(floor.wallNodeLinks);
  const added: SelectionRef[] = [];
  const mapWall = (l: number, r: number): [number, number] | undefined => {
    const a = nodeIds.get(l);
    const b = nodeIds.get(r);
    if (a == null || b == null) return undefined;
    return [Math.min(a, b), Math.max(a, b)];
  };
  for (const [l, r] of fragment.walls) {
    const wall = mapWall(l, r);
    if (!wall) continue;
    links.get(wall[0])?.push(wall[1]);
    added.push(wallRef(wall[0], wall[1]));
  }
  for (const [l, r] of fragment.exterior) {
    const wall = mapWall(l, r);
    if (wall) floor.exteriorWalls = [...(floor.exteriorWalls ?? []), wall];
  }
  for (const f of fragment.furniture) {
    plan.furnitureId += 1;
    const copy: IFurnitureSerializable = { ...f, id: plan.furnitureId };
    if (f.attachedToLeft != null && f.attachedToRight != null) {
      const wall = mapWall(f.attachedToLeft, f.attachedToRight);
      if (!wall) continue;
      // Position is along its wall, which moved with it.
      [copy.attachedToLeft, copy.attachedToRight] = wall;
    } else {
      copy.x += dx;
      copy.y += dy;
    }
    floor.furnitureArray.push(copy);
    added.push({ kind: 'furniture', id: copy.id });
  }
  return added;
}

/** Deletes the selection: its furniture, its walls and their doors and windows, and any wall point left unused. */
export function deleteRefs(floor: FloorSerializable, refs: SelectionRef[]) {
  const { walls, furniture } = expand(floor, refs);
  const gone = new Set(furniture.map((f) => f.id));
  floor.furnitureArray = floor.furnitureArray.filter((f) => !gone.has(f.id));
  const touched = new Set<number>();
  floor.wallNodeLinks = floor.wallNodeLinks.map(([l, rights]) => [
    l,
    rights.filter((r) => {
      const drop = walls.has(`${l}-${r}`);
      if (drop) touched.add(l).add(r);
      return !drop;
    })
  ]);
  floor.exteriorWalls = (floor.exteriorWalls ?? []).filter(
    ([l, r]) => !walls.has(`${l}-${r}`)
  );
  if (floor.exteriorWalls.length === 0) delete floor.exteriorWalls;
  const used = new Set(wallsOf(floor).flat());
  const unused = (id: number) => touched.has(id) && !used.has(id);
  floor.wallNodes = floor.wallNodes.filter((n) => !unused(n.id));
  floor.wallNodeLinks = floor.wallNodeLinks.filter(([l]) => !unused(l));
}

/** Moves the selection by (dx, dy). A wall moves both its points; doors and windows ride on their walls. */
export function moveRefs(
  floor: FloorSerializable,
  refs: SelectionRef[],
  dx: number,
  dy: number
) {
  const nodeIds = new Set(
    refs.flatMap((r) => (r.kind === 'wall' ? [r.left, r.right] : []))
  );
  for (const node of floor.wallNodes) {
    if (!nodeIds.has(node.id)) continue;
    node.x += dx;
    node.y += dy;
  }
  const ids = new Set(
    refs.flatMap((r) => (r.kind === 'furniture' ? [r.id] : []))
  );
  for (const f of floor.furnitureArray) {
    // A door or window is placed along its wall; it moves with the wall.
    if (!ids.has(f.id) || f.attachedToLeft != null) continue;
    f.x += dx;
    f.y += dy;
  }
}
