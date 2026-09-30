// Plan lengths and millimetres. The editor works in plan units (METER per
// metre); the scene format and @accurona/core work in millimetres. Showing
// and typing a length in the display units is per editor:
// EditorInstance.formatLength / parseLength.
import type { LengthUnit } from '@accurona/core';
import { METER } from '../editor/editor/constants';

const MM_PER_PLAN_UNIT = 1000 / METER;

export const planToMm = (length: number) => length * MM_PER_PLAN_UNIT;
export const mmToPlan = (mm: number) => mm / MM_PER_PLAN_UNIT;

const MM2_PER_M2 = 1e6;
const M2_PER_FT2 = 0.09290304;

/**
 * A plan area (plan units²) as a room label reads it: square metres to one
 * decimal for any metric display unit, square feet to the nearest whole one
 * for imperial. Square millimetres or centimetres are not how rooms are read.
 */
export function formatArea(area: number, units: LengthUnit): string {
  const m2 = (planToMm(1) * planToMm(1) * area) / MM2_PER_M2;
  if (units === 'in' || units === 'ft-in') {
    return `${Math.round(m2 / M2_PER_FT2)} ft²`;
  }
  return `${Number(m2.toFixed(1))} m²`;
}
