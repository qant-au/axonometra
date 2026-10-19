// The shared look: one palette and one set of line weights for every view.

export const OUTLINE = '#2b2b2b';
export const DETAIL = '#8a857c';

/** Surface fills a part can use, by role. */
export const ROLES = {
  body: '#f7f5f1', // main surfaces
  soft: '#e4dfd6', // cushions, tops, trays, secondary panels
  dark: '#5b6770', // equipment bodies (racks, cameras, appliances with dark finish)
  metal: '#c9ced3', // steel and aluminium
  wood: '#d9c3a3', // timber
  glass: '#d6e8f5', // glass and water
  plant: '#a9c89a', // foliage
  ground: '#e9e4da' // paving, rugs, floor coverings
};

/** Accent colours for device status marks. Used sparingly, never a whole body. */
export const ACCENTS = {
  network: '#2f6fb0',
  power: '#d98a1f',
  cooling: '#2a9d8f',
  security: '#c0392b',
  fire: '#c0392b',
  av: '#7b5ea7',
  safe: '#2e8540' // first aid and evacuation: the green of safety signs
};

export const TAGS = Object.keys(ACCENTS);

/** Colour for a role, accent, or the line colours `outline` and `detail`. */
export function fillFor(name) {
  if (name === 'outline') return OUTLINE;
  if (name === 'detail') return DETAIL;
  const colour = ROLES[name] ?? ACCENTS[name];
  if (!colour) throw new Error(`unknown colour role ${name}`);
  return colour;
}

/** Plan line weights in cm: [outline, detail]. Small items get finer lines. */
export function planStrokes(w, d) {
  return Math.max(w, d) < 60 ? [1, 0.5] : [1.5, 0.75];
}

/** Plan footprint of a device symbol, in cm. */
export const SYMBOL_SIZE = 40;
