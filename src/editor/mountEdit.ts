// What the Height and mounting dialog reads from and writes to a placed item:
// what its height is measured from, that height, the item's own height and
// which way it faces (scene format version 2, "Mounting and facing").
// Lengths are plan units (cm), as the length dialogs type them.
import type { Facing, MountFrom } from '../core';
import { getPlacementDefaults } from '../res/catalog';
import { METER } from './editor/constants';
import type { Furniture } from './editor/objects/Furniture';
import type { EditorInstance } from './instance/EditorInstance';

/**
 * The items a Height and mounting edit applies to: every selected item, or
 * the one right-clicked when it is not in the selection. Doors and windows
 * sit in their walls and are left out.
 */
export function mountTargets(inst: EditorInstance, clicked?: number): number[] {
  const plan = inst.plan.getState();
  const selected = inst.selection
    .getState()
    .refs.flatMap((ref) => (ref.kind === 'furniture' ? [ref.id] : []));
  const ids =
    clicked == null || selected.includes(clicked) ? selected : [clicked];
  return ids.filter((id) => {
    const item = plan.getObject(id);
    return item != null && !item.isAttached;
  });
}

export interface Mounting {
  mountFrom: MountFrom;
  /** Above the floor, or for 'ceiling' the gap down to the item's top. */
  offset: number;
  /** The item's own height. */
  height: number;
  facing: Facing;
}

/** An item with no catalogue height (a missing element) is this tall. */
const FALLBACK_HEIGHT = 0.7 * METER;

/** The element's own mounting, as a freshly placed item has it. */
export function defaultMounting(elementId: string): Mounting {
  const d = getPlacementDefaults(elementId);
  return {
    mountFrom: d?.mountFrom ?? 'floor',
    offset: d?.mount ?? 0,
    height: d?.h ?? FALLBACK_HEIGHT,
    facing: d?.facing ?? 'up'
  };
}

// Metres and plan units to a hundredth of a millimetre, so 2.2 m reads as
// 220 and two items at the same height agree.
const toPlan = (metres: number) => Math.round(metres * METER * 100) / 100;
const toMetres = (plan: number) => Math.round((plan / METER) * 1e5) / 1e5;

/**
 * A placed item's mounting: its own values where it has them, else the
 * element's. An offset with no reference is floor-referenced, as in
 * resolveMount.
 */
export function mountingOf(item: Furniture): Mounting {
  const d = defaultMounting(item.resourcePath);
  const from = item.mountFrom ?? (item.mountM != null ? 'floor' : d.mountFrom);
  return {
    // Standing on nothing, it stands on the floor, as a save writes it.
    mountFrom: from === 'surface' && item.mountOn == null ? 'floor' : from,
    offset: item.mountM != null ? toPlan(item.mountM) : d.offset,
    height: item.heightM != null ? toPlan(item.heightM) : d.height,
    facing: item.facing ?? d.facing
  };
}

/** A field the selected items disagree on is null, and left as each has it. */
export type MountingEdit = { [K in keyof Mounting]: Mounting[K] | null };

/** What every item agrees on; a field they differ on is null. */
export function commonMounting(items: Furniture[]): MountingEdit {
  const all = items.map(mountingOf);
  const agreed = <K extends keyof Mounting>(key: K) =>
    all.every((m) => m[key] === all[0][key]) ? all[0][key] : null;
  return {
    mountFrom: agreed('mountFrom'),
    offset: agreed('offset'),
    height: agreed('height'),
    facing: agreed('facing')
  };
}

/** Why a set of values cannot be applied, or null when it can. */
export function mountingError(
  edit: MountingEdit,
  items: Furniture[],
  /** The floor's wall height, plan units: a ceiling item stays above the floor. */
  ceiling?: number
): string | null {
  if (edit.height != null && !(edit.height > 0)) {
    return 'Enter a height greater than 0';
  }
  if (edit.offset == null && edit.height == null && edit.mountFrom == null) {
    return null;
  }
  for (const item of items) {
    const m = { ...mountingOf(item), ...defined(edit) };
    // A negative gap is a recess into the ceiling, at most the item's height.
    if (m.mountFrom === 'ceiling' && m.offset < -m.height) {
      return 'A recess into the ceiling cannot be deeper than the item';
    }
    if (
      m.mountFrom === 'ceiling' &&
      ceiling != null &&
      m.offset + m.height > ceiling
    ) {
      return 'Hung from the ceiling, the item would reach below the floor';
    }
    if (m.mountFrom !== 'ceiling' && m.offset < 0) {
      return 'Enter a height of 0 or more';
    }
  }
  return null;
}

const defined = (edit: MountingEdit): Partial<Mounting> =>
  Object.fromEntries(
    Object.entries(edit).filter(([, v]) => v != null)
  ) as Partial<Mounting>;

/**
 * Writes the values onto an item; a null field keeps the item's own. The
 * item then keeps every value explicitly, so a later catalogue change does
 * not move it.
 */
export function applyMounting(item: Furniture, edit: MountingEdit) {
  const m = { ...mountingOf(item), ...defined(edit) };
  item.mountFrom = m.mountFrom;
  item.mountM = toMetres(m.offset);
  item.heightM = toMetres(m.height);
  item.facing = m.facing;
  // Off its support it stands on nothing; the dialog names a new one.
  if (m.mountFrom !== 'surface') item.mountOn = undefined;
  // Raised gear draws over floor-standing furniture, as the catalogue
  // places it; a raise by hand otherwise left it under the table.
  const raised = m.mountFrom !== 'floor' || m.offset > 0;
  if (item.zIndex === 1 && raised) item.zIndex = 2;
  else if (item.zIndex === 2 && !raised) item.zIndex = 1;
}

/**
 * Why a floor cannot take a wall height (plan units), or null. Only the
 * floor's wall height changes: a ceiling item keeps its gap below the
 * ceiling, so a lower ceiling must still leave every one above the floor.
 */
export function wallHeightError(
  height: number,
  items: Iterable<Furniture>
): string | null {
  if (!(height > 0)) return 'Enter a height greater than 0';
  for (const item of items) {
    if (item.isAttached) continue; // a door or window, in its wall
    const m = mountingOf(item);
    if (m.mountFrom === 'ceiling' && m.offset + m.height > height) {
      return 'A ceiling item would hang below the floor';
    }
  }
  return null;
}
