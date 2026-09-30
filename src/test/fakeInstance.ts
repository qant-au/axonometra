// A stand-in editor for unit tests of the Pixi-side classes, which take the
// editor they belong to in their constructor. It has just enough for them to
// construct: tools read as View with snap off, lengths and areas format as numbers,
// screen and plan coordinates are the same. Pass `parts` to override.
import { vi } from 'vitest';
import type { EditorInstance } from '../editor/instance/EditorInstance';

export function fakeInstance(
  parts: Record<string, unknown> = {}
): EditorInstance {
  return {
    config: { readOnly: false },
    editor: { getState: () => ({ activeTool: 0, snap: false }) },
    plan: { getState: () => ({ redrawWalls: vi.fn() }) },
    notify: vi.fn(),
    wallNodeId: 0,
    formatLength: (length: number) => String(Math.round(length)),
    formatArea: (area: number) => String(Math.round(area)),
    viewportX: (x: number) => x,
    viewportY: (y: number) => y,
    ...parts
  } as unknown as EditorInstance;
}
