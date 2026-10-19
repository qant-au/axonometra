// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  DIFFERENCES,
  SHARED_BINDINGS,
  formatBinding,
  formatDifferences,
  formatChord,
  isTypingTarget,
  keymapFor,
  matchChord,
  resolveAction,
  shortcutHint,
  shortcutSections
} from '../index';

const ev = (key, code = '', mods = {}) => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
});

const axonometra = keymapFor('axonometra');

test('tool letters and the number row', () => {
  assert.equal(resolveAction(ev('v', 'KeyV'), axonometra), 'select');
  assert.equal(resolveAction(ev('V', 'KeyV'), axonometra), 'select', 'caps lock');
  assert.equal(resolveAction(ev('1', 'Digit1'), axonometra), 'select');
  assert.equal(resolveAction(ev('l', 'KeyL'), axonometra), 'wall');
  assert.equal(resolveAction(ev('6', 'Digit6'), axonometra), 'wall');
  assert.equal(resolveAction(ev('d', 'KeyD'), axonometra), 'door');
  assert.equal(resolveAction(ev('e', 'KeyE'), axonometra), 'eraser');
  assert.equal(resolveAction(ev('0', 'Digit0'), axonometra), 'eraser');
  assert.equal(resolveAction(ev('w', 'KeyW'), axonometra), 'window');
  assert.equal(resolveAction(ev('m', 'KeyM'), axonometra), 'measure');
});

test('Excalidraw keys with no equivalent stay unbound', () => {
  assert.equal(resolveAction(ev('f', 'KeyF'), axonometra), null);
  assert.equal(resolveAction(ev('3', 'Digit3'), axonometra), null);
  assert.equal(resolveAction(ev('Tab', 'Tab'), axonometra), null);
});

test('omit leaves a where-built row unbound', () => {
  const map = keymapFor('axonometra', { omit: ['group', 'keep-tool'] });
  assert.equal(resolveAction(ev('g', 'KeyG', { ctrlKey: true }), map), null);
  assert.equal(resolveAction(ev('q', 'KeyQ'), map), null);
  assert.equal(resolveAction(ev('g', 'KeyG', { ctrlKey: true }), axonometra), 'group');
});

test('modifiers must match exactly', () => {
  assert.equal(resolveAction(ev('v', 'KeyV', { ctrlKey: true }), axonometra), 'paste');
  assert.equal(resolveAction(ev('v', 'KeyV', { metaKey: true }), axonometra), 'paste');
  assert.equal(resolveAction(ev('V', 'KeyV', { shiftKey: true }), axonometra), null, 'Shift+V is flip, unbound');
  assert.equal(resolveAction(ev('ArrowLeft', 'ArrowLeft'), axonometra), 'nudge');
  assert.equal(resolveAction(ev('ArrowLeft', 'ArrowLeft', { shiftKey: true }), axonometra), 'nudge');
  assert.equal(resolveAction(ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true }), axonometra), null, 'Ctrl+arrow is flowchart, unbound');
  assert.equal(
    resolveAction(ev('ArrowLeft', 'ArrowLeft', { ctrlKey: true, shiftKey: true }), axonometra),
    'align-left'
  );
});

test('undo, redo and Ctrl+Y (Ctrl only)', () => {
  assert.equal(resolveAction(ev('z', 'KeyZ', { metaKey: true }), axonometra), 'undo');
  assert.equal(resolveAction(ev('Z', 'KeyZ', { metaKey: true, shiftKey: true }), axonometra), 'redo');
  assert.equal(resolveAction(ev('y', 'KeyY', { ctrlKey: true }), axonometra), 'redo');
  assert.equal(resolveAction(ev('y', 'KeyY', { metaKey: true }), axonometra), null);
});

test('Alt chords match the physical key', () => {
  // On macOS, Option+Shift+D types a character, not "d".
  assert.equal(resolveAction(ev('Î', 'KeyD', { altKey: true, shiftKey: true }), axonometra), 'toggle-theme');
});

test('zoom keys and fit', () => {
  assert.equal(resolveAction(ev('=', 'Equal', { ctrlKey: true }), axonometra), 'zoom-in');
  assert.equal(resolveAction(ev('+', 'Equal', { ctrlKey: true, shiftKey: true }), axonometra), 'zoom-in');
  assert.equal(resolveAction(ev('-', 'Minus', { metaKey: true }), axonometra), 'zoom-out');
  assert.equal(resolveAction(ev('0', 'Digit0', { ctrlKey: true }), axonometra), 'zoom-reset');
  assert.equal(resolveAction(ev('=', 'Equal'), axonometra), null, 'zoom needs Ctrl/Cmd');
  assert.equal(resolveAction(ev('!', 'Digit1', { shiftKey: true }), axonometra), 'fit-all');
  assert.equal(resolveAction(ev('@', 'Digit2', { shiftKey: true }), axonometra), 'fit-selection');
  assert.equal(resolveAction(ev('?', 'Slash', { shiftKey: true }), axonometra), 'help');
});

test('both forms of the ordering keys', () => {
  const r = (mods) => resolveAction(ev(']', 'BracketRight', mods), axonometra);
  assert.equal(r({ ctrlKey: true }), 'bring-forward');
  assert.equal(r({ ctrlKey: true, shiftKey: true }), 'bring-to-front');
  assert.equal(r({ metaKey: true, altKey: true }), 'bring-to-front');
  assert.equal(resolveAction(ev('[', 'BracketLeft', { metaKey: true, altKey: true }), axonometra), 'send-to-back');
});

test('read-only drops editing bindings, keeps viewing ones', () => {
  const ro = { readOnly: true };
  assert.equal(resolveAction(ev('z', 'KeyZ', { ctrlKey: true }), axonometra, ro), null);
  assert.equal(resolveAction(ev('Delete', 'Delete'), axonometra, ro), null);
  assert.equal(resolveAction(ev('l', 'KeyL'), axonometra, ro), null);
  assert.equal(resolveAction(ev('h', 'KeyH'), axonometra, ro), 'hand');
  assert.equal(resolveAction(ev('v', 'KeyV'), axonometra, ro), 'select');
  assert.equal(resolveAction(ev('f', 'KeyF', { ctrlKey: true }), axonometra, ro), 'find');
  assert.equal(resolveAction(ev('?', 'Slash', { shiftKey: true }), axonometra, ro), 'help');
  assert.equal(resolveAction(ev('Î', 'KeyD', { altKey: true, shiftKey: true }), axonometra, ro), 'toggle-theme');
});

test('nothing fires while typing', () => {
  const input = { tagName: 'INPUT' };
  assert.equal(isTypingTarget(input), true);
  assert.equal(isTypingTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: 'LI', closest: () => ({}) }), true, 'open menu');
  assert.equal(isTypingTarget({ tagName: 'CANVAS', closest: () => null }), false);
  assert.equal(isTypingTarget(null), false);
  assert.equal(resolveAction(ev('z', 'KeyZ', { ctrlKey: true, target: input }), axonometra), null);
  assert.equal(
    resolveAction(ev('z', 'KeyZ', { ctrlKey: true, target: input }), axonometra, { typingGuard: false }),
    'undo'
  );
});

test('matchChord: a code chord ignores the character', () => {
  assert.equal(matchChord(ev('x', 'KeyG', { ctrlKey: true }), { code: 'KeyG', mod: true }), true);
});

test('no two bindings in a tool share a chord', () => {
  for (const [tool, map] of [['axonometra', axonometra]]) {
    const actions = map.map((b) => b.action);
    assert.equal(new Set(actions).size, actions.length, `${tool}: action ids are unique`);
    const seen = new Map();
    for (const b of map) {
      for (const chord of b.chords) {
        const id = JSON.stringify({ ...chord, shift: chord.shift ?? false });
        assert.ok(!seen.has(id), `${tool}: ${b.action} and ${seen.get(id)} share ${id}`);
        seen.set(id, b.action);
      }
    }
  }
});

test('formatting for menus and the ? dialog', () => {
  assert.equal(formatChord({ key: 'z', mod: true, shift: true }, 'other'), 'Ctrl + Shift + Z');
  assert.equal(formatChord({ key: 'z', mod: true, shift: true }, 'mac'), '⌘ + ⇧ + Z');
  assert.equal(formatChord({ code: 'KeyD', alt: true, shift: true }, 'other'), 'Alt + Shift + D');
  assert.equal(formatChord({ code: 'BracketRight', mod: true }, 'other'), 'Ctrl + ]');
  assert.equal(formatChord({ key: 'Escape' }, 'other'), 'Esc');
  const zoomIn = SHARED_BINDINGS.find((b) => b.action === 'zoom-in');
  assert.deepEqual(formatBinding(zoomIn, 'other'), ['Ctrl + =']);
  assert.equal(shortcutHint(axonometra, 'wall', 'other'), 'L');
  assert.equal(shortcutHint(axonometra, 'select', 'other'), 'V');
  // A hint reads as the dialog draws the chord, + between keys everywhere.
  assert.equal(shortcutHint(axonometra, 'group', 'mac'), '⌘ + G');
});

test('{mod} in a key label reads as the platform modifier', () => {
  const zoom = axonometra.find((b) => b.action === 'wheel-zoom');
  assert.deepEqual(formatBinding(zoom, 'other'), ['Ctrl + Wheel', 'Pinch']);
  assert.deepEqual(formatBinding(zoom, 'mac'), ['⌘ + Wheel', 'Pinch']);
});

// Sweep 2026-09-30: the pointer rows mixed glyphs and words ("Shift + click"
// beside "⌘ + wheel") and ran alternatives together in one phrase.
test('a gesture lists its alternatives, with the platform key names', () => {
  const row = (action) => axonometra.find((b) => b.action === action);
  assert.deepEqual(formatBinding(row('shift-click'), 'mac'), ['⇧ + Click']);
  assert.deepEqual(formatBinding(row('shift-click'), 'other'), ['Shift + Click']);
  assert.deepEqual(formatBinding(row('alt-drag'), 'mac'), ['⌥ + Drag']);
  assert.deepEqual(formatBinding(row('space-pan'), 'other'), ['Space + Drag', 'the hand tool']);
  assert.deepEqual(formatBinding(row('wheel-zoom'), 'mac'), ['⌘ + Wheel', 'Pinch']);
});

// Sweep 2026-09-30 (round 3): two pointer rows were both labelled "Pan", and
// an alternative was a phrase rather than keys.
test('every pointer row has its own label', () => {
  const row = (action) => axonometra.find((b) => b.action === action);
  assert.equal(row('space-pan').label, 'Pan by dragging');
  assert.equal(row('wheel-pan').label, 'Pan with the wheel');
  for (const tool of ['axonometra']) {
    const labels = keymapFor(tool)
      .filter((b) => b.section === 'Pointer and touch')
      .map((b) => b.label);
    assert.equal(new Set(labels).size, labels.length, tool + ': ' + labels.join(', '));
  }
});

test('the right-click row is the shared context menu', () => {
  const shared = axonometra.find((b) => b.action === 'context-menu');
  assert.equal(shared.label, 'Context menu');
  assert.deepEqual(formatBinding(shared, 'other'), ['Right-click']);
});

test('the differences use the row names and the platform key names', () => {
  const mac = formatDifferences(DIFFERENCES.axonometra, 'mac');
  const other = formatDifferences(DIFFERENCES.axonometra, 'other');
  assert.equal(mac.find((d) => d.action === 'diamond').here, 'D is door; 3 unbound');
  const flow = (list) => list.find((d) => d.action === 'create and walk a flowchart');
  assert.equal(flow(mac).excalidraw, '⌘ + Arrow keys, ⌥ + Arrow keys');
  assert.equal(flow(other).excalidraw, 'Ctrl + Arrow keys, Alt + Arrow keys');
  for (const d of [...mac, ...other]) {
    assert.doesNotMatch(d.excalidraw + d.here, /\{|Ctrl\/Cmd/);
  }
});

test('shared rows keep their labels when the tool does not rename them', () => {
  const label = (bindings, action) => bindings.find((b) => b.action === action).label;
  assert.equal(label(axonometra, 'hand'), 'Hand (pan)');
  assert.equal(label(axonometra, 'fit-all'), 'Fit everything');
});

test('each tool has a differences list', () => {
  assert.deepEqual(Object.keys(DIFFERENCES), ['axonometra']);
  assert.ok(DIFFERENCES.axonometra.some((d) => d.here.includes('door')));
});

test('shortcutSections groups a tool in the spec order', () => {
  const sections = shortcutSections(axonometra, 'other');
  assert.deepEqual(sections.map((s) => s.title), ['Tools', 'View', 'Edit', 'Pointer and touch']);
  const wall = sections[0].rows.find((r) => r.label === 'Wall');
  assert.deepEqual(wall.keys, ['L', '6']);
});
