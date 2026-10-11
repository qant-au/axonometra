// The plan's two layers: what stands on the floor, and what hangs from the
// ceiling. The plan can show both (ceiling items lighter, as a reflected
// ceiling plan draws them over a floor plan), the floor items only, or the
// ceiling items only (a reflected ceiling plan).
import type { MountFrom } from '@accurona/core';
import { getItemHeights } from '../res/catalog';
import { METER } from './editor/constants';
import { mountFromOf, resolveMount } from './mount';

export type PlanLayer = 'both' | 'floor' | 'ceiling';

/** How light a ceiling item is drawn over the floor items. */
export const CEILING_ALPHA = 0.5;

/** The fields of a placed item the layer depends on. */
export interface LayeredItem {
  resourcePath: string;
  /** a door or window, which sits in its wall */
  isAttached: boolean;
  mountM?: number;
  mountFrom?: MountFrom;
  heightM?: number;
}

/** Hung from the ceiling. A door or window never is. */
export function isCeilingItem(item: LayeredItem): boolean {
  if (item.isAttached) return false;
  return (
    mountFromOf(
      {
        mountFrom: item.mountFrom,
        offset: item.mountM != null ? item.mountM * METER : undefined
      },
      getItemHeights(item.resourcePath)
    ) === 'ceiling'
  );
}

export function shownOn(layer: PlanLayer, ceiling: boolean): boolean {
  return layer === 'both' || (layer === 'ceiling') === ceiling;
}

/** Its look on the plan: hidden, or drawn at this opacity. */
export function planStyle(
  layer: PlanLayer,
  ceiling: boolean
): { visible: boolean; alpha: number } {
  return {
    visible: shownOn(layer, ceiling),
    // Alone on a reflected ceiling plan they need not give way to anything.
    alpha: ceiling && layer === 'both' ? CEILING_ALPHA : 1
  };
}

/**
 * The height tag beside an item off the floor: 'C' for flush with the
 * ceiling (or recessed into it), 'C -300 mm' for hanging below it, '+1100 mm'
 * for the underside above the floor, an item standing on another included.
 * Nothing for an item on the floor.
 * `format` writes a length in plan units in the plan's display units, and
 * `supportTop` is the top of the item this one stands on, if it does.
 */
export function heightTag(
  item: LayeredItem,
  format: (length: number) => string,
  supportTop?: number
): string | null {
  if (item.isAttached) return null;
  const catalogue = getItemHeights(item.resourcePath);
  const offset = item.mountM != null ? item.mountM * METER : undefined;
  const from = mountFromOf({ mountFrom: item.mountFrom, offset }, catalogue);
  if (from === 'ceiling') {
    const gap = offset ?? catalogue?.mount ?? 0;
    return gap > 0 ? `C -${format(gap)}` : 'C';
  }
  const tall =
    item.heightM != null ? item.heightM * METER : (catalogue?.height ?? 0);
  // The wall height only matters for a ceiling item, handled above.
  const mount = resolveMount(
    { mountFrom: item.mountFrom, offset },
    catalogue,
    0,
    tall,
    supportTop
  );
  return mount > 0 ? `+${format(mount)}` : null;
}
