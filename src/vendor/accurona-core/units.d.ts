export type MetricUnit = 'mm' | 'cm' | 'm';
export declare const METRIC_UNITS: readonly MetricUnit[];
/** A stored millimetre value expressed in `unit`. */
export declare function fromMm(mm: number, unit: MetricUnit): number;
/** A value in `unit` as whole millimetres, the form a scene stores. */
export declare function toMm(value: number, unit: MetricUnit): number;
/**
 * Formats a stored millimetre value in `unit`, e.g. 2700 → '2.7 m'. Rounds to
 * the nearest millimetre and drops trailing zeros. `suffix: false` leaves the
 * unit off, for an input box that shows the unit beside it.
 */
export declare function formatLength(mm: number, unit: MetricUnit, { suffix }?: {
    suffix?: boolean;
}): string;
/**
 * Parses typed input in mm, cm or m back to whole millimetres: '2.7m',
 * '270 cm' and '2700' (in `unit`) are all 2700. A bare number is read in
 * `unit`, the one the user is working in. Returns null for anything else,
 * so the caller can keep the old value.
 */
export declare function parseLength(text: string, unit: MetricUnit): number | null;
