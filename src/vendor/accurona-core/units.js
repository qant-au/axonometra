// Length units. Every length in a scene is stored in millimetres (see
// docs/scene-format.md, Plan views); units only change how a length is shown
// and typed.
export const METRIC_UNITS = ['mm', 'cm', 'm'];
export const LENGTH_UNITS = [
    ...METRIC_UNITS,
    'in',
    'ft-in'
];
export function isLengthUnit(value) {
    return LENGTH_UNITS.includes(value);
}
const MM_PER_INCH = 25.4;
// 'ft-in' converts as inches: it is a way of writing inches, not a scale.
const MM_PER = {
    mm: 1,
    cm: 10,
    m: 1000,
    in: MM_PER_INCH,
    'ft-in': MM_PER_INCH
};
// The finest step each metric unit shows, as decimal places: 1 mm in each.
const DECIMALS = { mm: 0, cm: 1, m: 3 };
// Imperial lengths are shown to the nearest 1/16 inch (about 1.6 mm).
const INCH_DIVISIONS = 16;
/** A stored millimetre value expressed in `unit` ('ft-in' gives inches). */
export function fromMm(mm, unit) {
    return mm / MM_PER[unit];
}
/** A value in `unit` as whole millimetres, the form a scene stores. */
export function toMm(value, unit) {
    // + 0 turns -0 into 0.
    return Math.round(value * MM_PER[unit]) + 0;
}
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
// Whole inches plus a reduced binary fraction, a mixed number joined by a
// dash as in standard notation: 10, '10-5/16', '1/2'.
function inchText(sixteenths) {
    const whole = Math.floor(sixteenths / INCH_DIVISIONS);
    const rest = sixteenths % INCH_DIVISIONS;
    if (rest === 0)
        return String(whole);
    const d = gcd(rest, INCH_DIVISIONS);
    const fraction = `${rest / d}/${INCH_DIVISIONS / d}`;
    return whole === 0 ? fraction : `${whole}-${fraction}`;
}
function formatImperial(mm, unit, suffix) {
    const sixteenths = Math.round(fromMm(mm, unit) * INCH_DIVISIONS);
    const sign = sixteenths < 0 ? '-' : '';
    const size = Math.abs(sixteenths);
    if (unit === 'in')
        return `${sign}${inchText(size)}${suffix ? '"' : ''}`;
    // Feet and inches carry their own marks, so there is no bare form.
    const perFoot = 12 * INCH_DIVISIONS;
    const feet = Math.floor(size / perFoot);
    const inches = size % perFoot;
    if (feet === 0)
        return `${sign}${inchText(inches)}"`;
    if (inches === 0)
        return `${sign}${feet}'`;
    // Standard notation: no space between feet and inches.
    return `${sign}${feet}'${inchText(inches)}"`;
}
/**
 * Formats a stored millimetre value in `unit`: 2700 is '2.7 m', '270 cm',
 * '106-5/16"' or `8'10-5/16"`. Metric rounds to the nearest millimetre and
 * drops trailing zeros; imperial rounds to the nearest 1/16 inch, since a
 * finer fraction would claim more than the stored millimetre holds. `suffix:
 * false` leaves the unit off, for an input box that shows the unit beside it;
 * feet and inches always keep their marks.
 */
export function formatLength(mm, unit, { suffix = true } = {}) {
    if (unit === 'in' || unit === 'ft-in')
        return formatImperial(mm, unit, suffix);
    const text = String(Number(fromMm(mm, unit).toFixed(DECIMALS[unit])) + 0);
    return suffix ? `${text} ${unit}` : text;
}
const NUMBER = String.raw `(?:\d+\.?\d*|\.\d+)`;
// A number of inches, with an optional fraction: '10', '10.5', '10-1/2'
// (standard notation), '10 1/2', '1/2'.
const INCHES = String.raw `(?:\d+(?:\s*-\s*|\s+)\d+\/\d+|\d+\/\d+|${NUMBER})`;
const FOOT = String.raw `(?:'|ft|foot|feet)`;
const INCH = String.raw `(?:"|in|inch|inches)`;
const METRIC = new RegExp(String.raw `^(${NUMBER})\s*(mm|cm|m)?$`, 'i');
const BARE_INCHES = new RegExp(String.raw `^(${INCHES})\s*${INCH}?$`, 'i');
// 8', 8 ft, 8'10", 8'10-1/2", 8' 10", 8'-10 1/2", 8 ft 10 in, 8' 10 (a trailing number is inches).
const FEET_INCHES = new RegExp(String.raw `^(${NUMBER})\s*${FOOT}(?:\s*-?\s*(${INCHES})\s*${INCH}?)?$`, 'i');
const EXPLICIT_INCHES = new RegExp(String.raw `^(${INCHES})\s*${INCH}$`, 'i');
function inchesOf(text) {
    const parts = text.trim().split(/\s*-\s*|\s+/);
    let total = 0;
    for (const part of parts) {
        const [n, d] = part.split('/');
        total += d === undefined ? Number(n) : Number(n) / Number(d);
    }
    return total;
}
/**
 * Parses typed input back to whole millimetres, or null for anything that is
 * not one length. Any unit may be typed whatever the current one is: '2.7m',
 * '270 cm', '106.3"', '8 ft 10 in', `8'10-5/16"`. A bare number is read in
 * `unit`, the one the user is working in; with 'in' or 'ft-in' a bare number
 * is inches and may carry a fraction ('10-1/2').
 */
export function parseLength(text, unit) {
    let t = text.trim().replace(/[′’‘]/g, "'").replace(/[″“”]/g, '"');
    let sign = 1;
    if (/^[+-]/.test(t)) {
        if (t[0] === '-')
            sign = -1;
        t = t.slice(1).trimStart();
    }
    const imperial = unit === 'in' || unit === 'ft-in';
    let inches;
    let match = FEET_INCHES.exec(t);
    if (match) {
        inches = Number(match[1]) * 12 + (match[2] ? inchesOf(match[2]) : 0);
    }
    else if ((match = EXPLICIT_INCHES.exec(t))) {
        inches = inchesOf(match[1]);
    }
    else if (imperial && (match = BARE_INCHES.exec(t))) {
        inches = inchesOf(match[1]);
    }
    if (inches !== undefined) {
        return Number.isFinite(inches) ? toMm(sign * inches, 'in') : null;
    }
    match = METRIC.exec(t);
    if (!match)
        return null;
    const typed = match[2]?.toLowerCase() ?? unit;
    return toMm(sign * Number(match[1]), typed);
}
