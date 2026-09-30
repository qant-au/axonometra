// Plan lengths and millimetres. The editor works in plan units (METER per
// metre); the scene format and @accurona/core work in millimetres. Showing
// and typing a length in the display units is per editor:
// EditorInstance.formatLength / parseLength.
import { METER } from '../editor/editor/constants';

const MM_PER_PLAN_UNIT = 1000 / METER;

export const planToMm = (length: number) => length * MM_PER_PLAN_UNIT;
export const mmToPlan = (mm: number) => mm / MM_PER_PLAN_UNIT;
