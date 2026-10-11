// Where a placed item's underside sits above its floor, from what its height
// is measured from (scene format version 2, "Mounting and facing"): the
// floor, or the ceiling, where the offset is the gap down to the item's top.
// A ceiling item is resolved against the floor's wall height every time it is
// drawn, so it follows the ceiling when that changes.
import type { Facing, MountFrom } from '@accurona/core';

/** The catalogue's word on an element: its height and mount, plan units (cm). */
export interface CatalogueHeights {
  height: number;
  mount: number;
  mountFrom?: MountFrom;
  facing?: Facing;
}

/**
 * The underside above the floor, plan units. `offset` is the item's own
 * mount (plan units) and `mountFrom` its own reference, either absent to
 * follow the catalogue; an offset with no reference is floor-referenced, as
 * every item was before version 2.
 */
export function resolveMount(
  item: { mountFrom?: MountFrom; offset?: number },
  catalogue: CatalogueHeights | undefined,
  wallHeight: number,
  tall: number
): number {
  const from = mountFromOf(item, catalogue);
  const offset = item.offset ?? catalogue?.mount ?? 0;
  // 'surface' needs the support's top, which the editor does not track yet:
  // until it does, the offset is read from the floor.
  return from === 'ceiling' ? wallHeight - offset - tall : offset;
}

/** What an item's height is measured from: its own, else the catalogue's. */
export function mountFromOf(
  item: { mountFrom?: MountFrom; offset?: number },
  catalogue: CatalogueHeights | undefined
): MountFrom {
  return (
    item.mountFrom ??
    (item.offset != null ? 'floor' : (catalogue?.mountFrom ?? 'floor'))
  );
}

/** Which way an item is installed: its own, else the catalogue's, else up. */
export function facingOf(
  item: { facing?: Facing },
  catalogue: CatalogueHeights | undefined
): Facing {
  return item.facing ?? catalogue?.facing ?? 'up';
}

/** Facing down flips `facing` (the element's default) over; mirror.z in a file. */
export const flipFacing = (facing: Facing): Facing =>
  facing === 'down' ? 'up' : 'down';
