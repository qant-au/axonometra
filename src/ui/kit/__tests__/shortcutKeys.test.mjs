// @vitest-environment node
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keyNames, shortcutKeys } from '../shortcutKeys';

test('a chord splits into its keys, on either platform', () => {
  assert.deepEqual(shortcutKeys('Ctrl + Shift + Z'), { kind: 'chord', keys: ['Ctrl', 'Shift', 'Z'] });
  assert.deepEqual(shortcutKeys('⌘ ⇧ Z'), { kind: 'chord', keys: ['⌘', '⇧', 'Z'] });
  assert.deepEqual(shortcutKeys('Ctrl + -'), { kind: 'chord', keys: ['Ctrl', '-'] });
  assert.deepEqual(shortcutKeys('V'), { kind: 'chord', keys: ['V'] });
  assert.deepEqual(shortcutKeys('Delete'), { kind: 'chord', keys: ['Delete'] });
  assert.deepEqual(shortcutKeys('Right-click'), { kind: 'chord', keys: ['Right-click'] });
});

// Sweep 2026-09-30: pointer rows were a mix of chips and plain text.
test('a gesture draws its keys and pointer actions as keys', () => {
  assert.deepEqual(shortcutKeys('⇧ + Click'), { kind: 'chord', keys: ['⇧', 'Click'] });
  assert.deepEqual(shortcutKeys('⌘ + Arrow keys'), { kind: 'chord', keys: ['⌘', 'Arrow keys'] });
  assert.deepEqual(shortcutKeys('Arrow keys'), { kind: 'chord', keys: ['Arrow keys'] });
  assert.deepEqual(shortcutKeys('Drag on empty canvas'), {
    kind: 'gesture',
    parts: [[{ key: 'Drag' }, { text: 'on empty canvas' }]]
  });
  assert.deepEqual(shortcutKeys('Shift + Arrow keys for a larger step'), {
    kind: 'gesture',
    parts: [[{ key: 'Shift' }], [{ key: 'Arrow keys' }, { text: 'for a larger step' }]]
  });
  assert.deepEqual(shortcutKeys('Shift + click'), {
    kind: 'gesture',
    parts: [[{ key: 'Shift' }], [{ text: 'click' }]]
  });
});

// Sweep 2026-09-30 (round 3): "the add-item tool, then Enter" was plain text.
test('keys between words are keys', () => {
  assert.deepEqual(shortcutKeys('I then Enter'), {
    kind: 'gesture',
    parts: [[{ key: 'I' }, { text: 'then' }, { key: 'Enter' }]]
  });
  assert.deepEqual(shortcutKeys('Double-click an empty tile'), {
    kind: 'gesture',
    parts: [[{ key: 'Double-click' }, { text: 'an empty tile' }]]
  });
});

test('words alone, and a phrase with punctuation, stay text', () => {
  for (const phrase of ['the hand tool', 'Space + drag, or the hand tool', "Connect to, in the item's menu"]) {
    assert.deepEqual(shortcutKeys(phrase), { kind: 'text', text: phrase });
  }
});

test('key names in a difference read as the platform names them', () => {
  assert.equal(keyNames('{mod} + {alt} + C', true), '⌘ + ⌥ + C');
  assert.equal(keyNames('{shift} + F', false), 'Shift + F');
});
