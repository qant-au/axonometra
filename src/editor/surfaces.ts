// Items standing on other items (scene format version 2, mountFrom
// 'surface'): a monitor on a desk, a microwave on a bench. What carries
// things is the element library's word (an element's `surface`, the height of
// its top); what stands on one is an item the editor put over it.
//
// After every edit (history.ts), settleSurfaces looks again at what moved:
// an item dropped or moved over a support stands on it, and an item whose
// support was moved out from under it or deleted drops to the floor, and the
// plan says so. Nothing is carried along with a moved support.
import { getItemHeights, getItemName } from '../res/catalog';
import { METER, WALL_HEIGHT } from './editor/constants';
import type { FloorPlanSerializable } from './editor/persistence/FloorPlanSerializable';
import type { IFurnitureSerializable } from './editor/persistence/IFurnitureSerializable';
import type { EditorInstance } from './instance/EditorInstance';
import { type CatalogueHeights, resolveMount } from './mount';

type Lookup = (kind: string) => CatalogueHeights | undefined;

/** The fields of a placed item its height depends on. */
export interface MountedItem {
  id: number;
  kind: string;
  mountFrom?: IFurnitureSerializable['mountFrom'];
  mountM?: number;
  heightM?: number;
  mountOn?: number;
}

export const mountedOf = (data: IFurnitureSerializable): MountedItem => ({
  id: data.id,
  kind: data.texturePath,
  mountFrom: data.mountFrom,
  mountM: data.mountM,
  heightM: data.heightM,
  mountOn: data.mountOn
});

const tallOf = (item: MountedItem, catalogue: CatalogueHeights | undefined) =>
  item.heightM != null ? item.heightM * METER : (catalogue?.height ?? 0);

/**
 * The top of every support on a floor, above the floor, plan units. A
 * support's top is its underside plus the element's surface height, scaled
 * with the item when its height was changed (a sit-stand desk raised).
 */
export function surfaceTops(
  items: Iterable<MountedItem>,
  wallHeight: number,
  lookup: Lookup = getItemHeights
): Map<number, number> {
  const byId = new Map([...items].map((i) => [i.id, i]));
  const tops = new Map<number, number>();
  const visiting = new Set<number>();
  const top = (id: number): number | undefined => {
    if (tops.has(id)) return tops.get(id);
    const item = byId.get(id);
    const catalogue = item && lookup(item.kind);
    if (!item || catalogue?.surface == null || visiting.has(id)) return;
    visiting.add(id);
    const tall = tallOf(item, catalogue);
    const underside = resolveMount(
      {
        mountFrom: item.mountFrom,
        offset: item.mountM != null ? item.mountM * METER : undefined
      },
      catalogue,
      wallHeight,
      tall,
      item.mountOn != null ? top(item.mountOn) : undefined
    );
    visiting.delete(id);
    const scale = catalogue.height > 0 ? tall / catalogue.height : 1;
    const result = underside + catalogue.surface * scale;
    tops.set(id, result);
    return result;
  };
  for (const id of byId.keys()) top(id);
  return tops;
}

/** The support top an item stands on, if it stands on one. */
export const supportTopOf = (item: MountedItem, tops: Map<number, number>) =>
  item.mountOn != null ? tops.get(item.mountOn) : undefined;

const rotate = (x: number, y: number, a: number) => ({
  x: x * Math.cos(a) - y * Math.sin(a),
  y: x * Math.sin(a) + y * Math.cos(a)
});

/** The centre of an item's footprint, plan units. */
export function centreOf(item: IFurnitureSerializable) {
  const half = rotate(
    (item.width * METER) / 2,
    (item.height * METER) / 2,
    item.rotation
  );
  return { x: item.x + half.x, y: item.y + half.y };
}

/** Whether a point lies on an item's footprint. */
export function covers(
  item: IFurnitureSerializable,
  p: { x: number; y: number }
) {
  const local = rotate(p.x - item.x, p.y - item.y, -item.rotation);
  const eps = 1e-6;
  return (
    local.x >= -eps &&
    local.y >= -eps &&
    local.x <= item.width * METER + eps &&
    local.y <= item.height * METER + eps
  );
}

const isFitting = (item: IFurnitureSerializable) =>
  item.attachedToLeft != null && item.attachedToRight != null;

/**
 * Whether an item stands on a support it is moved over: one standing on
 * something already, and bench-top gear (an element that is mountFrom
 * 'surface') resting on the floor. Gear raised by hand stays where it was put.
 */
export function canStandOnSurface(
  item: IFurnitureSerializable,
  lookup: Lookup = getItemHeights
): boolean {
  if (isFitting(item)) return false;
  if (item.mountFrom === 'surface') return true;
  if (lookup(item.texturePath)?.mountFrom !== 'surface') return false;
  return (
    item.mountFrom == null ||
    (item.mountFrom === 'floor' && !((item.mountM ?? 0) > 0))
  );
}

/**
 * The support under an item's centre on the same floor, the highest when
 * there are several; never the item itself or anything standing on it.
 */
export function supportUnder(
  item: IFurnitureSerializable,
  floor: IFurnitureSerializable[],
  wallHeight: number,
  lookup: Lookup = getItemHeights
): IFurnitureSerializable | undefined {
  const byId = new Map(floor.map((i) => [i.id, i]));
  // Standing on something that stands on the item would be a cycle.
  const restsOn = (id: number, on: number) => {
    const seen = new Set<number>();
    for (let next = byId.get(id)?.mountOn; next != null;) {
      if (next === on) return true;
      if (seen.has(next)) return false;
      seen.add(next);
      next = byId.get(next)?.mountOn;
    }
    return false;
  };
  const tops = surfaceTops(floor.map(mountedOf), wallHeight, lookup);
  const centre = centreOf(item);
  let best: IFurnitureSerializable | undefined;
  for (const other of floor) {
    if (other.id === item.id || isFitting(other)) continue;
    if (!tops.has(other.id) || !covers(other, centre)) continue;
    if (restsOn(other.id, item.id)) continue;
    if (!best || tops.get(other.id)! > tops.get(best.id)!) best = other;
  }
  return best;
}

const moved = (a: IFurnitureSerializable, b: IFurnitureSerializable) =>
  a.x !== b.x ||
  a.y !== b.y ||
  a.rotation !== b.rotation ||
  a.width !== b.width ||
  a.height !== b.height;

/**
 * Re-seats what stands on what after an edit; `before` is the plan as the
 * edit found it. Items that moved (or are new) stand on the support under
 * them, if they can stand on one, and leave a support they moved off; an
 * item whose support was deleted, or moved out from under it, drops to the
 * floor and a notice names it. Changes the live items in place.
 */
export function settleSurfaces(
  inst: EditorInstance,
  before: FloorPlanSerializable,
  lookup: Lookup = getItemHeights
) {
  const was = new Map<number, IFurnitureSerializable>();
  for (const floor of before.floors ?? []) {
    for (const item of floor?.furnitureArray ?? []) was.set(item.id, item);
  }
  const dropped: { name: string; support: string }[] = [];
  for (const floor of inst.plan.getState().floors) {
    if (!floor) continue;
    const live = floor.getFurniture();
    const items = [...live.values()].map((f) => f.serialize());
    const byId = new Map(items.map((i) => [i.id, i]));
    const wallHeight =
      floor.wallHeightM != null ? floor.wallHeightM * METER : WALL_HEIGHT;
    for (const data of items) {
      const item = live.get(data.id)!;
      const old = was.get(data.id);
      if (!old || moved(old, data)) {
        if (!canStandOnSurface(data, lookup)) continue;
        const support = supportUnder(data, items, wallHeight, lookup);
        if (support?.id === item.mountOn) continue;
        if (support) {
          // Onto a different support keeps the gap above it; from the floor
          // it stands right on the top.
          if (item.mountOn == null || item.mountFrom !== 'surface') {
            item.mountM = undefined;
          }
          item.mountFrom = 'surface';
          item.mountOn = support.id;
          if (item.zIndex <= 1) item.zIndex = 2;
        } else if (item.mountOn != null) {
          item.mountOn = undefined;
          item.mountM = undefined;
        }
        data.mountOn = item.mountOn;
        continue;
      }
      if (item.mountOn == null) continue;
      const support = byId.get(item.mountOn);
      const supportBefore = was.get(item.mountOn);
      const gone = !support;
      const movedAway =
        support != null &&
        supportBefore != null &&
        moved(supportBefore, support) &&
        !covers(support, centreOf(data));
      if (!gone && !movedAway) continue;
      dropped.push({
        name: getItemName(data.texturePath),
        support: getItemName((support ?? supportBefore)?.texturePath ?? '')
      });
      item.mountOn = undefined;
      item.mountM = undefined;
      data.mountOn = undefined;
    }
  }
  if (dropped.length) inst.notify(droppedNotice(dropped));
}

function droppedNotice(dropped: { name: string; support: string }[]) {
  const first = dropped[0];
  return {
    title: 'Moved to the floor',
    message:
      dropped.length === 1
        ? `${first.name} now stands on the floor: the ${first.support.toLowerCase()} under it was moved or deleted.`
        : `${dropped.length} items now stand on the floor: what they stood on was moved or deleted.`,
    severity: 'info' as const
  };
}
