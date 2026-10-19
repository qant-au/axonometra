// The keymap, as data plus the matching rules, so a tool binds its keys and
// lists them in its `?` dialog from one table. docs/keymap.md is the
// specification; these tables are it in code, and the two change together.

export type KeymapTool = 'axonometra';

export type KeymapSection = 'Tools' | 'View' | 'Edit' | 'Pointer and touch';

// One key combination. `mod` is Ctrl on Windows and Linux and Cmd on macOS,
// and accepts either on every platform. `ctrl` is the Ctrl key alone.
// `shift: 'any'` ignores Shift, for a key whose character already needs it
// (`?`, `+`) or a binding that reads Shift itself (nudge). A chord with
// `code` matches the physical key, which `alt` chords need: on macOS Option
// turns letters into other characters, so `event.key` misses them.
export interface Chord {
  key?: string;
  code?: string;
  mod?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean | 'any';
}

export interface Binding {
  action: string;
  label: string;
  section: KeymapSection;
  chords: Chord[];
  // Changes the drawing. Read-only embeds drop every editing binding.
  editing: boolean;
  // Shown instead of the formatted chords, for gestures and key groups.
  // Alternatives are separated by " | "; within one, keys are joined by
  // " + ", keys and pointer actions capitalised ("Click", "Drag", "Arrow
  // keys") and anything after them lowercase ("Drag on empty canvas"), so
  // the `?` dialog draws each key as a key. `{mod}`, `{shift}` and `{alt}`
  // read as the platform's keys: Ctrl, Shift, Alt, or ⌘ ⇧ ⌥ on macOS.
  keysLabel?: string;
}

export interface Difference {
  excalidraw: string;
  action: string;
  here: string;
  why: string;
}

// The subset of KeyboardEvent the matcher reads, so the core stays free of
// the DOM at run time.
export interface KeyLike {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  target?: unknown;
}

const k = (key: string, extra: Omit<Chord, 'key'> = {}): Chord => ({
  key,
  ...extra
});
const c = (code: string, extra: Omit<Chord, 'code'> = {}): Chord => ({
  code,
  ...extra
});
const mod = (key: string, extra: Omit<Chord, 'key' | 'mod'> = {}): Chord => ({
  key,
  mod: true,
  ...extra
});
const modCode = (
  code: string,
  extra: Omit<Chord, 'code' | 'mod'> = {}
): Chord => ({
  code,
  mod: true,
  ...extra
});
const gesture = (
  action: string,
  label: string,
  keysLabel: string,
  editing = false
): Binding => ({
  action,
  label,
  section: 'Pointer and touch',
  chords: [],
  editing,
  keysLabel
});

const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// The shared set, for every tool. Rows marked "where built" in the spec are
// here too; a tool that has not built the feature passes its action in `omit`, and
// the key stays unbound rather than going to anything else.
export const SHARED_BINDINGS: readonly Binding[] = [
  {
    action: 'select',
    label: 'Select',
    section: 'Tools',
    chords: [k('v'), c('Digit1')],
    editing: false
  },
  {
    action: 'hand',
    label: 'Hand (pan)',
    section: 'Tools',
    chords: [k('h')],
    editing: false
  },
  {
    action: 'eraser',
    label: 'Eraser',
    section: 'Tools',
    chords: [k('e'), c('Digit0')],
    editing: true
  },
  {
    action: 'keep-tool',
    label: 'Keep the current tool after use',
    section: 'Tools',
    chords: [k('q')],
    editing: true
  },

  {
    action: 'zoom-in',
    label: 'Zoom in',
    section: 'View',
    chords: [mod('=', { shift: 'any' }), mod('+', { shift: 'any' })],
    editing: false
  },
  {
    action: 'zoom-out',
    label: 'Zoom out',
    section: 'View',
    chords: [mod('-', { shift: 'any' }), mod('_', { shift: 'any' })],
    editing: false
  },
  {
    action: 'zoom-reset',
    label: 'Reset zoom',
    section: 'View',
    chords: [modCode('Digit0')],
    editing: false
  },
  {
    action: 'fit-all',
    label: 'Fit everything',
    section: 'View',
    chords: [c('Digit1', { shift: true })],
    editing: false
  },
  {
    action: 'fit-selection',
    label: 'Fit the selection',
    section: 'View',
    chords: [c('Digit2', { shift: true })],
    editing: false
  },
  {
    action: 'toggle-theme',
    label: 'Toggle light / dark',
    section: 'View',
    chords: [c('KeyD', { alt: true, shift: true })],
    editing: false
  },
  {
    action: 'help',
    label: 'Show this list',
    section: 'View',
    chords: [k('?', { shift: 'any' })],
    editing: false
  },

  {
    action: 'undo',
    label: 'Undo',
    section: 'Edit',
    chords: [mod('z')],
    editing: true
  },
  {
    action: 'redo',
    label: 'Redo',
    section: 'Edit',
    chords: [mod('z', { shift: true }), k('y', { ctrl: true })],
    editing: true
  },
  {
    action: 'copy',
    label: 'Copy',
    section: 'Edit',
    chords: [mod('c')],
    editing: true
  },
  {
    action: 'cut',
    label: 'Cut',
    section: 'Edit',
    chords: [mod('x')],
    editing: true
  },
  {
    action: 'paste',
    label: 'Paste',
    section: 'Edit',
    chords: [mod('v')],
    editing: true
  },
  {
    action: 'duplicate',
    label: 'Duplicate',
    section: 'Edit',
    chords: [mod('d')],
    editing: true
  },
  {
    action: 'delete',
    label: 'Delete',
    section: 'Edit',
    chords: [k('Delete'), k('Backspace')],
    editing: true
  },
  {
    action: 'select-all',
    label: 'Select all',
    section: 'Edit',
    chords: [mod('a')],
    editing: false
  },
  {
    action: 'escape',
    label: 'Deselect, cancel, leave a group',
    section: 'Edit',
    chords: [k('Escape', { shift: 'any' })],
    editing: false
  },
  {
    action: 'nudge',
    label: 'Nudge',
    section: 'Edit',
    chords: ARROWS.map((key) => k(key, { shift: 'any' })),
    editing: true,
    keysLabel: 'Arrow keys | {shift} + Arrow keys for a larger step'
  },
  {
    action: 'edit',
    label: "Edit the selected object's text or properties",
    section: 'Edit',
    chords: [k('Enter')],
    editing: true
  },
  {
    action: 'edit-geometry',
    label: "Edit the selected object's geometry",
    section: 'Edit',
    chords: [mod('Enter')],
    editing: true
  },
  {
    action: 'group',
    label: 'Group',
    section: 'Edit',
    chords: [modCode('KeyG')],
    editing: true
  },
  {
    action: 'ungroup',
    label: 'Ungroup',
    section: 'Edit',
    chords: [modCode('KeyG', { shift: true })],
    editing: true
  },
  {
    action: 'bring-forward',
    label: 'Bring forward',
    section: 'Edit',
    chords: [modCode('BracketRight')],
    editing: true
  },
  {
    action: 'send-backward',
    label: 'Send backward',
    section: 'Edit',
    chords: [modCode('BracketLeft')],
    editing: true
  },
  // Both the Windows and the macOS form, on every platform.
  {
    action: 'bring-to-front',
    label: 'Bring to front',
    section: 'Edit',
    chords: [
      modCode('BracketRight', { shift: true }),
      modCode('BracketRight', { alt: true })
    ],
    editing: true
  },
  {
    action: 'send-to-back',
    label: 'Send to back',
    section: 'Edit',
    chords: [
      modCode('BracketLeft', { shift: true }),
      modCode('BracketLeft', { alt: true })
    ],
    editing: true
  },
  {
    action: 'align-left',
    label: 'Align left',
    section: 'Edit',
    chords: [mod('ArrowLeft', { shift: true })],
    editing: true
  },
  {
    action: 'align-right',
    label: 'Align right',
    section: 'Edit',
    chords: [mod('ArrowRight', { shift: true })],
    editing: true
  },
  {
    action: 'align-top',
    label: 'Align top',
    section: 'Edit',
    chords: [mod('ArrowUp', { shift: true })],
    editing: true
  },
  {
    action: 'align-bottom',
    label: 'Align bottom',
    section: 'Edit',
    chords: [mod('ArrowDown', { shift: true })],
    editing: true
  },
  {
    action: 'lock',
    label: 'Lock or unlock the selection',
    section: 'Edit',
    chords: [modCode('KeyL', { shift: true })],
    editing: true
  },
  {
    action: 'find',
    label: 'Find',
    section: 'Edit',
    chords: [mod('f')],
    editing: false
  },

  gesture('click', 'Select', 'Click'),
  gesture(
    'shift-click',
    'Add to or remove from the selection',
    '{shift} + Click'
  ),
  gesture('marquee', 'Select an area', 'Drag on empty canvas'),
  gesture('space-pan', 'Pan by dragging', 'Space + Drag | the hand tool'),
  gesture(
    'wheel-pan',
    'Pan with the wheel',
    'Wheel | {shift} + Wheel sideways'
  ),
  gesture('wheel-zoom', 'Zoom', '{mod} + Wheel | Pinch'),
  gesture('alt-drag', 'Drag a copy', '{alt} + Drag', true),
  gesture('context-menu', 'Context menu', 'Right-click')
];

export const AXONOMETRA_BINDINGS: readonly Binding[] = [
  {
    action: 'wall',
    label: 'Wall',
    section: 'Tools',
    chords: [k('l'), c('Digit6')],
    editing: true
  },
  {
    action: 'window',
    label: 'Window',
    section: 'Tools',
    chords: [k('w')],
    editing: true
  },
  {
    action: 'door',
    label: 'Door',
    section: 'Tools',
    chords: [k('d')],
    editing: true
  },
  {
    action: 'measure',
    label: 'Measure',
    section: 'Tools',
    chords: [k('m')],
    editing: false
  },
  {
    action: 'save',
    label: 'Save',
    section: 'Edit',
    chords: [mod('s')],
    editing: true
  },
  gesture('edit-length', "Edit a wall's length", 'Double-click the wall', true)
];

// Walk mode in Axonometra's 3D view has its own keys, handled by the 3D view
// while it has focus; listed so the `?` dialog can show them.
export const AXONOMETRA_WALK_KEYS: readonly { keys: string; label: string }[] =
  [
    { keys: 'W A S D, arrow keys', label: 'Move' },
    { keys: 'Q, E', label: 'Turn' },
    { keys: 'Page Up, Page Down', label: 'Change storey' }
  ];

// Bindings each tool leaves out on purpose (deliberate divergences, not
// features waiting to be built).
const DIVERGENT: Record<KeymapTool, readonly string[]> = {
  axonometra: []
};

const DIFFERENCES_SHARED: readonly Difference[] = [
  {
    excalidraw: 'O, 4',
    action: 'ellipse',
    here: 'unbound',
    why: 'No free-form shapes.'
  },
  {
    excalidraw: 'P, 7',
    action: 'freedraw',
    here: 'unbound',
    why: 'No free-form shapes.'
  },
  {
    excalidraw: 'K',
    action: 'laser pointer',
    here: 'unbound',
    why: 'Presentation tool.'
  },
  {
    excalidraw: 'B',
    action: 'bucket fill',
    here: 'unbound',
    why: 'Colour is set in the properties panel.'
  },
  {
    excalidraw: 'N',
    action: 'sticky note',
    here: 'unbound',
    why: 'Whiteboarding.'
  },
  {
    excalidraw: '{shift} + F',
    action: 'font picker',
    here: 'unbound',
    why: 'No font picker on the canvas.'
  },
  {
    excalidraw: '{shift} + H, {shift} + V',
    action: 'flip',
    here: 'unbound',
    why: 'A floor plan object is rotated, not mirrored.'
  },
  {
    excalidraw: 'Tab, {shift} + Tab',
    action: 'change shape type',
    here: 'unbound',
    why: 'No free-form shapes.'
  },
  {
    excalidraw: '{mod} + Arrow keys, {alt} + Arrow keys',
    action: 'create and walk a flowchart',
    here: 'unbound',
    why: 'Flowcharting.'
  },
  {
    excalidraw: '{mod} + K',
    action: 'link',
    here: 'unbound',
    why: 'No links on the canvas yet.'
  },
  {
    excalidraw: '{mod} + {alt} + C / V',
    action: 'copy and paste styles',
    here: 'unbound',
    why: 'No style clipboard.'
  },
  {
    excalidraw: '{alt} + Z, {alt} + R, {alt} + S, {alt} + /',
    action: 'zen mode, view mode, snapping, stats',
    here: 'unbound',
    why: 'View mode belongs to the host (a read-only embed); the others have no equivalent yet.'
  }
];

export const DIFFERENCES: Record<KeymapTool, readonly Difference[]> = {
  axonometra: [
    {
      excalidraw: 'D, 3',
      action: 'diamond',
      here: 'D is door; 3 unbound',
      why: 'No free-form shapes, so its letter goes to the object a floor planner reaches for most.'
    },
    ...DIFFERENCES_SHARED.slice(0, 2),
    { excalidraw: 'F', action: 'frame', here: 'unbound', why: 'No frames.' },
    {
      excalidraw: 'I',
      action: 'eye-dropper',
      here: 'unbound',
      why: 'No colour picking from the canvas.'
    },
    {
      excalidraw: 'S, G',
      action: 'stroke, background colour',
      here: 'unbound',
      why: 'Colour is set in the properties panel.'
    },
    ...DIFFERENCES_SHARED.slice(2),
    {
      excalidraw: 'Page Up / Page Down',
      action: 'scroll the canvas',
      here: 'walk mode: change storey',
      why: 'Only while walking in 3D.'
    }
  ]
};

export interface KeymapOptions {
  // Shared actions the tool has not built yet ("where built" rows).
  omit?: readonly string[];
}

// The full binding list for one tool: the shared set, less what the tool
// leaves out, with its own rows added. A tool row whose action is shared adds
// its chords to the shared row, and its label replaces the shared one, so the
// `?` dialog uses the names on that tool's own toolbar.
export const keymapFor = (
  tool: KeymapTool,
  options: KeymapOptions = {}
): Binding[] => {
  const own = { axonometra: AXONOMETRA_BINDINGS }[tool];
  const skip = new Set([...DIVERGENT[tool], ...(options.omit ?? [])]);
  const result: Binding[] = SHARED_BINDINGS.filter(
    (b) => !skip.has(b.action)
  ).map((b) => ({
    ...b,
    chords: [...b.chords]
  }));
  for (const binding of own) {
    const shared = result.find((b) => b.action === binding.action);
    if (shared) {
      shared.chords.push(...binding.chords);
      shared.label = binding.label;
      if (binding.keysLabel) shared.keysLabel = binding.keysLabel;
    } else result.push({ ...binding, chords: [...binding.chords] });
  }
  return result;
};

const isMacLike = (): boolean => {
  const nav = (
    globalThis as { navigator?: { platform?: string; userAgent?: string } }
  ).navigator;
  const text = `${nav?.platform ?? ''} ${nav?.userAgent ?? ''}`;
  return /Mac|iPhone|iPad|iPod/.test(text);
};

// Whether a key press belongs to a field rather than the canvas: an input, a
// text area, editable text, or an open menu or list (whose arrow keys and
// letters are for the menu).
export const isTypingTarget = (target: unknown): boolean => {
  const el = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => unknown;
  } | null;
  if (!el || typeof el.tagName !== 'string') return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (
    typeof el.closest === 'function' &&
    el.closest('[role="menu"], [role="listbox"]')
  )
    return true;
  return false;
};

export const matchChord = (event: KeyLike, chord: Chord): boolean => {
  const modDown = event.ctrlKey || event.metaKey;
  if (chord.ctrl) {
    if (!event.ctrlKey || event.metaKey) return false;
  } else if (chord.mod) {
    if (!modDown) return false;
  } else if (modDown) {
    return false;
  }
  if (Boolean(chord.alt) !== event.altKey) return false;
  if (chord.shift !== 'any' && Boolean(chord.shift) !== event.shiftKey)
    return false;
  if (chord.code !== undefined) return event.code === chord.code;
  if (chord.key !== undefined) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    return key === chord.key;
  }
  return false;
};

export interface ResolveOptions {
  // Read-only embeds drop every editing binding.
  readOnly?: boolean;
  // Set false when the caller has already checked the focus itself.
  typingGuard?: boolean;
}

// The action a key press triggers, or null. Nothing fires while focus is in a
// field: the field keeps its own keys, including its own undo.
export const resolveAction = (
  event: KeyLike,
  bindings: readonly Binding[],
  options: ResolveOptions = {}
): string | null => {
  if (options.typingGuard !== false && isTypingTarget(event.target))
    return null;
  for (const binding of bindings) {
    if (options.readOnly && binding.editing) continue;
    if (binding.chords.some((chord) => matchChord(event, chord)))
      return binding.action;
  }
  return null;
};

const CODE_LABELS: Record<string, string> = {
  BracketRight: ']',
  BracketLeft: '[',
  Space: 'Space'
};

const KEY_LABELS: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Escape: 'Esc',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Enter: 'Enter',
  Tab: 'Tab',
  ContextMenu: 'Menu'
};

const keyName = (chord: Chord): string => {
  if (chord.code !== undefined) {
    if (chord.code.startsWith('Digit')) return chord.code.slice(5);
    if (chord.code.startsWith('Key')) return chord.code.slice(3);
    return CODE_LABELS[chord.code] ?? chord.code;
  }
  const key = chord.key ?? '';
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
};

// A chord as it reads in a menu, a hint or the `?` dialog: "Ctrl + Shift +
// Z", or "⌘ + ⇧ + Z" on macOS. Joined by + on every platform, as the dialog
// draws it: hints read "⌘ G" while the dialog read "⌘ + G" (sweep
// 2026-09-30, round 4).
export const formatChord = (
  chord: Chord,
  platform: 'mac' | 'other' = isMacLike() ? 'mac' : 'other'
): string => {
  const mac = platform === 'mac';
  const parts: string[] = [];
  if (chord.ctrl) parts.push(mac ? '⌃' : 'Ctrl');
  if (chord.mod) parts.push(mac ? '⌘' : 'Ctrl');
  if (chord.alt) parts.push(mac ? '⌥' : 'Alt');
  if (chord.shift === true) parts.push(mac ? '⇧' : 'Shift');
  parts.push(keyName(chord));
  return parts.join(' + ');
};

// `{mod}`, `{shift}` and `{alt}` in a label or a difference, as the
// platform names them, so text reads as the chords beside it do.
export const formatKeyNames = (
  text: string,
  platform: 'mac' | 'other' = isMacLike() ? 'mac' : 'other'
): string => {
  const mac = platform === 'mac';
  return text
    .split('{mod}')
    .join(mac ? '⌘' : 'Ctrl')
    .split('{shift}')
    .join(mac ? '⇧' : 'Shift')
    .split('{alt}')
    .join(mac ? '⌥' : 'Alt');
};

// A tool's differences from Excalidraw with their key names formatted.
export const formatDifferences = (
  differences: readonly Difference[],
  platform: 'mac' | 'other' = isMacLike() ? 'mac' : 'other'
): Difference[] =>
  differences.map((d) => ({
    ...d,
    excalidraw: formatKeyNames(d.excalidraw, platform),
    here: formatKeyNames(d.here, platform)
  }));

// Every way to trigger a binding, for the `?` dialog.
export const formatBinding = (
  binding: Binding,
  platform: 'mac' | 'other' = isMacLike() ? 'mac' : 'other'
): string[] => {
  if (binding.keysLabel) {
    return binding.keysLabel
      .split(' | ')
      .map((entry) => formatKeyNames(entry, platform));
  }
  const seen = new Set<string>();
  for (const chord of binding.chords) {
    // `_` and `+` are the shifted forms of `-` and `=`; listing both is noise.
    if (chord.key === '_' || chord.key === '+') continue;
    seen.add(formatChord(chord, platform));
  }
  return [...seen];
};

// The first key of an action, for a tooltip: "Select (V)".
export const shortcutHint = (
  bindings: readonly Binding[],
  action: string,
  platform?: 'mac' | 'other'
): string | undefined => {
  const binding = bindings.find((b) => b.action === action);
  const chord = binding?.chords[0];
  return chord ? formatChord(chord, platform) : undefined;
};

export interface ShortcutRow {
  label: string;
  keys: string[];
}

export interface ShortcutSection {
  title: string;
  rows: ShortcutRow[];
}

const SECTION_ORDER: readonly KeymapSection[] = [
  'Tools',
  'View',
  'Edit',
  'Pointer and touch'
];

// A tool's bindings grouped for the `?` dialog, in the spec's section order.
export const shortcutSections = (
  bindings: readonly Binding[],
  platform?: 'mac' | 'other'
): ShortcutSection[] =>
  SECTION_ORDER.map((title) => ({
    title,
    rows: bindings
      .filter((b) => b.section === title)
      .map((b) => ({ label: b.label, keys: formatBinding(b, platform) }))
  })).filter((section) => section.rows.length > 0);
