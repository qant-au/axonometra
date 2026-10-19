// Element names are Title Case: every word capitalised, both halves of a
// hyphenated compound too. Short joining words stay lower case inside a name
// ("Chest of Drawers", "Request-to-Exit") unless they end a compound
// ("Walk-In"), and units stay as written.
const SMALL = new Set(['a', 'an', 'and', 'of', 'or', 'to', 'in', 'on', 'for', 'with']);
const UNITS = new Set(['m', 'mm', 'cm', 'kg', 'kW', 'kVA']);

function word(w, first, last) {
  if (UNITS.has(w)) return w;
  if (!first && !last && SMALL.has(w)) return w;
  return w.replace(/^([^A-Za-z]*)([a-z])/, (_, pre, c) => pre + c.toUpperCase());
}

export function titleCase(name) {
  return name
    .split(' ')
    .map((w, i) => {
      const parts = w.split('-');
      return parts.map((part, j) => word(part, i === 0 && j === 0, j > 0 && j === parts.length - 1)).join('-');
    })
    .join(' ');
}
