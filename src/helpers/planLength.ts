// Plan lengths as a person reads and types them. The editor works in plan
// units (METER per metre); the scene format and @accurona/core work in
// millimetres, and the plan's display units say which unit to show.
import { METER } from '../editor/editor/constants';
import { useUnitsStore } from '../stores/UnitsStore';
import { formatLength, parseLength } from '../vendor/accurona-core';

const MM_PER_PLAN_UNIT = 1000 / METER;

export const planToMm = (length: number) => length * MM_PER_PLAN_UNIT;
export const mmToPlan = (mm: number) => mm / MM_PER_PLAN_UNIT;

/** A plan length in the plan's display units, e.g. '2.7 m'. */
export function formatPlanLength(
  length: number,
  options?: { suffix?: boolean }
): string {
  return formatLength(
    planToMm(length),
    useUnitsStore.getState().units,
    options
  );
}

/** Typed input in any unit (a bare number in the display units) as plan units, or null. */
export function parsePlanLength(text: string): number | null {
  const mm = parseLength(text, useUnitsStore.getState().units);
  return mm === null ? null : mmToPlan(mm);
}
