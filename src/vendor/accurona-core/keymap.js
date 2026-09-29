// The shared keymap, as data plus the matching rules, so Axonometra and
// Reticulyne bind the same keys and list them the same way in their `?`
// dialogs. docs/keymap.md is the specification; these tables are it in code,
// and the two change together.
const k = (key, extra = {}) => ({ key, ...extra });
const c = (code, extra = {}) => ({ code, ...extra });
const mod = (key, extra = {}) => ({
    key,
    mod: true,
    ...extra
});
const modCode = (code, extra = {}) => ({
    code,
    mod: true,
    ...extra
});
const gesture = (action, label, keysLabel, editing = false) => ({ action, label, section: 'Pointer and touch', chords: [], editing, keysLabel });
const ARROWS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
// The shared set, both tools. Rows marked "where built" in the spec are here
// too; a tool that has not built the feature passes its action in `omit`, and
// the key stays unbound rather than going to anything else.
export const SHARED_BINDINGS = [
    { action: 'select', label: 'Select', section: 'Tools', chords: [k('v'), c('Digit1')], editing: false },
    { action: 'hand', label: 'Hand (pan)', section: 'Tools', chords: [k('h')], editing: false },
    { action: 'eraser', label: 'Eraser', section: 'Tools', chords: [k('e'), c('Digit0')], editing: true },
    { action: 'keep-tool', label: 'Keep the current tool after use', section: 'Tools', chords: [k('q')], editing: true },
    { action: 'zoom-in', label: 'Zoom in', section: 'View', chords: [mod('=', { shift: 'any' }), mod('+', { shift: 'any' })], editing: false },
    { action: 'zoom-out', label: 'Zoom out', section: 'View', chords: [mod('-', { shift: 'any' }), mod('_', { shift: 'any' })], editing: false },
    { action: 'zoom-reset', label: 'Reset zoom', section: 'View', chords: [modCode('Digit0')], editing: false },
    { action: 'fit-all', label: 'Fit everything', section: 'View', chords: [c('Digit1', { shift: true })], editing: false },
    { action: 'fit-selection', label: 'Fit the selection', section: 'View', chords: [c('Digit2', { shift: true })], editing: false },
    { action: 'toggle-theme', label: 'Toggle light / dark', section: 'View', chords: [c('KeyD', { alt: true, shift: true })], editing: false },
    { action: 'help', label: 'Show this list', section: 'View', chords: [k('?', { shift: 'any' })], editing: false },
    { action: 'undo', label: 'Undo', section: 'Edit', chords: [mod('z')], editing: true },
    { action: 'redo', label: 'Redo', section: 'Edit', chords: [mod('z', { shift: true }), k('y', { ctrl: true })], editing: true },
    { action: 'copy', label: 'Copy', section: 'Edit', chords: [mod('c')], editing: true },
    { action: 'cut', label: 'Cut', section: 'Edit', chords: [mod('x')], editing: true },
    { action: 'paste', label: 'Paste', section: 'Edit', chords: [mod('v')], editing: true },
    { action: 'duplicate', label: 'Duplicate', section: 'Edit', chords: [mod('d')], editing: true },
    { action: 'delete', label: 'Delete', section: 'Edit', chords: [k('Delete'), k('Backspace')], editing: true },
    { action: 'select-all', label: 'Select all', section: 'Edit', chords: [mod('a')], editing: false },
    { action: 'escape', label: 'Deselect, cancel, leave a group', section: 'Edit', chords: [k('Escape', { shift: 'any' })], editing: false },
    {
        action: 'nudge',
        label: 'Nudge',
        section: 'Edit',
        chords: ARROWS.map((key) => k(key, { shift: 'any' })),
        editing: true,
        keysLabel: 'Arrow keys; with Shift, a larger step'
    },
    { action: 'edit', label: "Edit the selected object's text or properties", section: 'Edit', chords: [k('Enter')], editing: true },
    { action: 'edit-geometry', label: "Edit the selected object's geometry", section: 'Edit', chords: [mod('Enter')], editing: true },
    { action: 'group', label: 'Group', section: 'Edit', chords: [modCode('KeyG')], editing: true },
    { action: 'ungroup', label: 'Ungroup', section: 'Edit', chords: [modCode('KeyG', { shift: true })], editing: true },
    { action: 'bring-forward', label: 'Bring forward', section: 'Edit', chords: [modCode('BracketRight')], editing: true },
    { action: 'send-backward', label: 'Send backward', section: 'Edit', chords: [modCode('BracketLeft')], editing: true },
    // Both the Windows and the macOS form, on every platform.
    {
        action: 'bring-to-front',
        label: 'Bring to front',
        section: 'Edit',
        chords: [modCode('BracketRight', { shift: true }), modCode('BracketRight', { alt: true })],
        editing: true
    },
    {
        action: 'send-to-back',
        label: 'Send to back',
        section: 'Edit',
        chords: [modCode('BracketLeft', { shift: true }), modCode('BracketLeft', { alt: true })],
        editing: true
    },
    { action: 'align-left', label: 'Align left', section: 'Edit', chords: [mod('ArrowLeft', { shift: true })], editing: true },
    { action: 'align-right', label: 'Align right', section: 'Edit', chords: [mod('ArrowRight', { shift: true })], editing: true },
    { action: 'align-top', label: 'Align top', section: 'Edit', chords: [mod('ArrowUp', { shift: true })], editing: true },
    { action: 'align-bottom', label: 'Align bottom', section: 'Edit', chords: [mod('ArrowDown', { shift: true })], editing: true },
    { action: 'lock', label: 'Lock or unlock the selection', section: 'Edit', chords: [modCode('KeyL', { shift: true })], editing: true },
    { action: 'find', label: 'Find', section: 'Edit', chords: [mod('f')], editing: false },
    gesture('click', 'Select', 'Click'),
    gesture('shift-click', 'Add to or remove from the selection', 'Shift + click'),
    gesture('marquee', 'Select an area', 'Drag on empty canvas'),
    gesture('space-pan', 'Pan', 'Space + drag, or the hand tool'),
    gesture('wheel-pan', 'Pan', 'Mouse wheel; Shift + wheel pans sideways'),
    gesture('wheel-zoom', 'Zoom', 'Ctrl/Cmd + wheel, trackpad pinch, touch pinch'),
    gesture('alt-drag', 'Drag a copy', 'Alt + drag', true),
    gesture('context-menu', 'Context menu', 'Right-click')
];
// Reticulyne's own tools. A row whose action is already shared adds its
// chords to the shared row as aliases.
export const RETICULYNE_BINDINGS = [
    { action: 'rectangle', label: 'Rectangle', section: 'Tools', chords: [k('r'), c('Digit2')], editing: true },
    { action: 'connector', label: 'Connector', section: 'Tools', chords: [k('a'), c('Digit5'), k('c')], editing: true },
    { action: 'text', label: 'Text', section: 'Tools', chords: [k('t'), c('Digit8')], editing: true },
    { action: 'add-item', label: 'Add item', section: 'Tools', chords: [k('i'), c('Digit9')], editing: true },
    { action: 'select', label: 'Select', section: 'Tools', chords: [k('s')], editing: false },
    { action: 'fit-all', label: 'Fit everything', section: 'View', chords: [k('f')], editing: false },
    { action: 'zoom-in', label: 'Zoom in', section: 'View', chords: [k('=', { shift: 'any' }), k('+', { shift: 'any' })], editing: false },
    { action: 'zoom-out', label: 'Zoom out', section: 'View', chords: [k('-', { shift: 'any' }), k('_', { shift: 'any' })], editing: false },
    { action: 'toggle-highlight', label: 'Toggle item highlighting', section: 'View', chords: [c('KeyI', { alt: true })], editing: false },
    gesture('add-on-tile', 'Add an item on an empty tile', 'Double-click', true),
    gesture('enter-group', 'Work inside a group', 'Double-click the group; Esc leaves it'),
    gesture('connect', 'Connect two items', 'Drag from a port', true)
];
export const AXONOMETRA_BINDINGS = [
    { action: 'wall', label: 'Wall', section: 'Tools', chords: [k('l'), c('Digit6')], editing: true },
    { action: 'window', label: 'Window', section: 'Tools', chords: [k('w')], editing: true },
    { action: 'door', label: 'Door', section: 'Tools', chords: [k('d')], editing: true },
    { action: 'measure', label: 'Measure', section: 'Tools', chords: [k('m')], editing: false },
    { action: 'save', label: 'Save', section: 'Edit', chords: [mod('s')], editing: true },
    gesture('edit-length', "Edit a wall's length", 'Double-click the wall', true)
];
// Walk mode in Axonometra's 3D view has its own keys, handled by the 3D view
// while it has focus; listed so the `?` dialog can show them.
export const AXONOMETRA_WALK_KEYS = [
    { keys: 'W A S D, arrow keys', label: 'Move' },
    { keys: 'Q, E', label: 'Turn' },
    { keys: 'Page Up, Page Down', label: 'Change storey' }
];
// Bindings each tool leaves out on purpose (deliberate divergences, not
// features waiting to be built).
const DIVERGENT = {
    reticulyne: ['eraser'],
    axonometra: []
};
const DIFFERENCES_SHARED = [
    { excalidraw: 'O, 4', action: 'ellipse', here: 'unbound', why: 'No free-form shapes.' },
    { excalidraw: 'P, 7', action: 'freedraw', here: 'unbound', why: 'No free-form shapes.' },
    { excalidraw: 'K', action: 'laser pointer', here: 'unbound', why: 'Presentation tool.' },
    { excalidraw: 'B', action: 'bucket fill', here: 'unbound', why: 'Colour is set in the properties panel.' },
    { excalidraw: 'N', action: 'sticky note', here: 'unbound', why: 'Whiteboarding.' },
    { excalidraw: 'Shift + F', action: 'font picker', here: 'unbound', why: 'No font picker on the canvas.' },
    {
        excalidraw: 'Shift + H, Shift + V',
        action: 'flip',
        here: 'unbound',
        why: 'Isometric items are not symmetric, and a floor plan object is rotated, not mirrored.'
    },
    { excalidraw: 'Tab, Shift + Tab', action: 'change shape type', here: 'unbound', why: 'No free-form shapes.' },
    { excalidraw: 'Ctrl/Cmd + arrow, Alt + arrow', action: 'create and walk a flowchart', here: 'unbound', why: 'Flowcharting.' },
    { excalidraw: 'Ctrl/Cmd + K', action: 'link', here: 'unbound', why: 'No links on the canvas yet.' },
    { excalidraw: 'Ctrl/Cmd + Alt + C / V', action: 'copy and paste styles', here: 'unbound', why: 'No style clipboard.' },
    {
        excalidraw: 'Alt + Z, Alt + R, Alt + S, Alt + /',
        action: 'zen mode, view mode, snapping, stats',
        here: 'unbound',
        why: 'View mode belongs to the host (a read-only embed); the others have no equivalent yet.'
    }
];
export const DIFFERENCES = {
    reticulyne: [
        { excalidraw: 'D, 3', action: 'diamond', here: 'unbound', why: 'No free-form shapes.' },
        ...DIFFERENCES_SHARED.slice(0, 2),
        { excalidraw: 'L, 6', action: 'line', here: 'unbound', why: 'Reticulyne draws connectors, not lines.' },
        { excalidraw: 'E, 0', action: 'eraser', here: 'unbound', why: 'Reticulyne deletes a selection instead.' },
        { excalidraw: 'F', action: 'frame', here: 'fit everything', why: 'No frames; F was already fit.' },
        { excalidraw: 'I', action: 'eye-dropper', here: 'add item', why: 'No colour picking from the canvas.' },
        { excalidraw: 'S, G', action: 'stroke, background colour', here: 'S selects; G unbound', why: 'Colour is set in the properties panel.' },
        ...DIFFERENCES_SHARED.slice(2)
    ],
    axonometra: [
        {
            excalidraw: 'D, 3',
            action: 'diamond',
            here: 'D is door; 3 unbound',
            why: 'No free-form shapes, so its letter goes to the object a floor planner reaches for most.'
        },
        ...DIFFERENCES_SHARED.slice(0, 2),
        { excalidraw: 'F', action: 'frame', here: 'unbound', why: 'No frames.' },
        { excalidraw: 'I', action: 'eye-dropper', here: 'unbound', why: 'No colour picking from the canvas.' },
        { excalidraw: 'S, G', action: 'stroke, background colour', here: 'unbound', why: 'Colour is set in the properties panel.' },
        ...DIFFERENCES_SHARED.slice(2),
        { excalidraw: 'Page Up / Page Down', action: 'scroll the canvas', here: 'walk mode: change storey', why: 'Only while walking in 3D.' }
    ]
};
// The full binding list for one tool: the shared set, less what the tool
// leaves out, with its own rows added. A tool row whose action is shared adds
// its chords to the shared row.
export const keymapFor = (tool, options = {}) => {
    const own = tool === 'reticulyne' ? RETICULYNE_BINDINGS : AXONOMETRA_BINDINGS;
    const skip = new Set([...DIVERGENT[tool], ...(options.omit ?? [])]);
    const result = SHARED_BINDINGS.filter((b) => !skip.has(b.action)).map((b) => ({
        ...b,
        chords: [...b.chords]
    }));
    for (const binding of own) {
        const shared = result.find((b) => b.action === binding.action);
        if (shared)
            shared.chords.push(...binding.chords);
        else
            result.push({ ...binding, chords: [...binding.chords] });
    }
    return result;
};
const isMacLike = () => {
    const nav = globalThis.navigator;
    const text = `${nav?.platform ?? ''} ${nav?.userAgent ?? ''}`;
    return /Mac|iPhone|iPad|iPod/.test(text);
};
// Whether a key press belongs to a field rather than the canvas: an input, a
// text area, editable text, or an open menu or list (whose arrow keys and
// letters are for the menu).
export const isTypingTarget = (target) => {
    const el = target;
    if (!el || typeof el.tagName !== 'string')
        return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
        return true;
    if (el.isContentEditable)
        return true;
    if (typeof el.closest === 'function' && el.closest('[role="menu"], [role="listbox"]'))
        return true;
    return false;
};
export const matchChord = (event, chord) => {
    const modDown = event.ctrlKey || event.metaKey;
    if (chord.ctrl) {
        if (!event.ctrlKey || event.metaKey)
            return false;
    }
    else if (chord.mod) {
        if (!modDown)
            return false;
    }
    else if (modDown) {
        return false;
    }
    if (Boolean(chord.alt) !== event.altKey)
        return false;
    if (chord.shift !== 'any' && Boolean(chord.shift) !== event.shiftKey)
        return false;
    if (chord.code !== undefined)
        return event.code === chord.code;
    if (chord.key !== undefined) {
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        return key === chord.key;
    }
    return false;
};
// The action a key press triggers, or null. Nothing fires while focus is in a
// field: the field keeps its own keys, including its own undo.
export const resolveAction = (event, bindings, options = {}) => {
    if (options.typingGuard !== false && isTypingTarget(event.target))
        return null;
    for (const binding of bindings) {
        if (options.readOnly && binding.editing)
            continue;
        if (binding.chords.some((chord) => matchChord(event, chord)))
            return binding.action;
    }
    return null;
};
const CODE_LABELS = {
    BracketRight: ']',
    BracketLeft: '[',
    Space: 'Space'
};
const KEY_LABELS = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'Esc',
    Delete: 'Delete',
    Backspace: 'Backspace',
    Enter: 'Enter'
};
const keyName = (chord) => {
    if (chord.code !== undefined) {
        if (chord.code.startsWith('Digit'))
            return chord.code.slice(5);
        if (chord.code.startsWith('Key'))
            return chord.code.slice(3);
        return CODE_LABELS[chord.code] ?? chord.code;
    }
    const key = chord.key ?? '';
    return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
};
// A chord as it reads in a menu or the `?` dialog: "Ctrl + Shift + Z", or
// "⌘ ⇧ Z" on macOS.
export const formatChord = (chord, platform = isMacLike() ? 'mac' : 'other') => {
    const mac = platform === 'mac';
    const parts = [];
    if (chord.ctrl)
        parts.push(mac ? '⌃' : 'Ctrl');
    if (chord.mod)
        parts.push(mac ? '⌘' : 'Ctrl');
    if (chord.alt)
        parts.push(mac ? '⌥' : 'Alt');
    if (chord.shift === true)
        parts.push(mac ? '⇧' : 'Shift');
    parts.push(keyName(chord));
    return parts.join(mac ? ' ' : ' + ');
};
// Every way to trigger a binding, for the `?` dialog.
export const formatBinding = (binding, platform) => {
    if (binding.keysLabel)
        return [binding.keysLabel];
    const seen = new Set();
    for (const chord of binding.chords) {
        // `_` and `+` are the shifted forms of `-` and `=`; listing both is noise.
        if (chord.key === '_' || chord.key === '+')
            continue;
        seen.add(formatChord(chord, platform));
    }
    return [...seen];
};
// The first key of an action, for a tooltip: "Select (V)".
export const shortcutHint = (bindings, action, platform) => {
    const binding = bindings.find((b) => b.action === action);
    const chord = binding?.chords[0];
    return chord ? formatChord(chord, platform) : undefined;
};
const SECTION_ORDER = ['Tools', 'View', 'Edit', 'Pointer and touch'];
// A tool's bindings grouped for the `?` dialog, in the spec's section order.
export const shortcutSections = (bindings, platform) => SECTION_ORDER.map((title) => ({
    title,
    rows: bindings
        .filter((b) => b.section === title)
        .map((b) => ({ label: b.label, keys: formatBinding(b, platform) }))
})).filter((section) => section.rows.length > 0);
