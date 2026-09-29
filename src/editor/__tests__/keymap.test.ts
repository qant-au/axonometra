import { describe, expect, it } from 'vitest';
import { resolveAction } from '../../vendor/accurona-core';
import { KEYMAP, TOOL_FOR_ACTION } from '../keymap';
import { Tool } from '../editor/constants';

const key = (k: string, code = '', mods: Partial<KeyboardEvent> = {}) => ({
  key: k,
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods
});

describe('Axonometra keymap', () => {
  it.each([
    ['v', 'KeyV', Tool.Edit],
    ['1', 'Digit1', Tool.Edit],
    ['h', 'KeyH', Tool.View],
    ['e', 'KeyE', Tool.Remove],
    ['0', 'Digit0', Tool.Remove],
    ['l', 'KeyL', Tool.WallAdd],
    ['6', 'Digit6', Tool.WallAdd],
    ['w', 'KeyW', Tool.FurnitureAddWindow],
    ['d', 'KeyD', Tool.FurnitureAddDoor],
    ['m', 'KeyM', Tool.Measure]
  ])('%s picks its tool', (k, code, tool) => {
    const action = resolveAction(key(k, code), KEYMAP);
    expect(action && TOOL_FOR_ACTION[action]).toBe(tool);
  });

  it('bare L is the wall tool; the length box is Ctrl/Cmd + Enter', () => {
    expect(resolveAction(key('l', 'KeyL'), KEYMAP)).toBe('wall');
    expect(
      resolveAction(key('Enter', 'Enter', { metaKey: true }), KEYMAP)
    ).toBe('edit-geometry');
  });

  it('Ctrl/Cmd + S saves, and not in a read-only embed', () => {
    expect(resolveAction(key('s', 'KeyS', { ctrlKey: true }), KEYMAP)).toBe(
      'save'
    );
    expect(
      resolveAction(key('s', 'KeyS', { ctrlKey: true }), KEYMAP, {
        readOnly: true
      })
    ).toBeNull();
  });

  it('Cmd + Y does not redo; Ctrl + Y does', () => {
    expect(
      resolveAction(key('y', 'KeyY', { metaKey: true }), KEYMAP)
    ).toBeNull();
    expect(resolveAction(key('y', 'KeyY', { ctrlKey: true }), KEYMAP)).toBe(
      'redo'
    );
  });

  it('leaves unbuilt rows unbound', () => {
    expect(resolveAction(key('q', 'KeyQ'), KEYMAP)).toBeNull();
    expect(
      resolveAction(key('g', 'KeyG', { ctrlKey: true }), KEYMAP)
    ).toBeNull();
    expect(
      resolveAction(key(']', 'BracketRight', { ctrlKey: true }), KEYMAP)
    ).toBeNull();
  });

  it('every tool action in the table maps to a tool', () => {
    for (const action of Object.keys(TOOL_FOR_ACTION)) {
      expect(KEYMAP.some((b) => b.action === action)).toBe(true);
    }
  });
});
