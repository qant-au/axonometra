export type MetricUnit = 'mm' | 'cm' | 'm';
export type ImperialUnit = 'in' | 'ft-in';
/** The scene format's `units` values. */
export type LengthUnit = MetricUnit | ImperialUnit;
export declare const METRIC_UNITS: readonly MetricUnit[];
export declare const LENGTH_UNITS: readonly LengthUnit[];
export declare function isLengthUnit(value: unknown): value is LengthUnit;
/** A stored millimetre value expressed in `unit` ('ft-in' gives inches). */
export declare function fromMm(mm: number, unit: LengthUnit): number;
/** A value in `unit` as whole millimetres, the form a scene stores. */
export declare function toMm(value: number, unit: LengthUnit): number;
/**
 * Formats a stored millimetre value in `unit`: 2700 is '2.7 m', '270 cm',
 * '106-5/16"' or `8'10-5/16"`. Metric rounds to the nearest millimetre and
 * drops trailing zeros; imperial rounds to the nearest 1/16 inch, since a
 * finer fraction would claim more than the stored millimetre holds. `suffix:
 * false` leaves the unit off, for an input box that shows the unit beside it;
 * feet and inches always keep their marks.
 */
export declare function formatLength(mm: number, unit: LengthUnit, { suffix }?: {
    suffix?: boolean;
}): string;
/**
 * Parses typed input back to whole millimetres, or null for anything that is
 * not one length. Any unit may be typed whatever the current one is: '2.7m',
 * '270 cm', '106.3"', '8 ft 10 in', `8'10-5/16"`. A bare number is read in
 * `unit`, the one the user is working in; with 'in' or 'ft-in' a bare number
 * is inches and may carry a fraction ('10-1/2').
 */
export declare function parseLength(text: string, unit: LengthUnit): number | null;
