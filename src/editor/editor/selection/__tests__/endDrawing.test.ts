import { describe, expect, it, vi } from 'vitest';
import { createSelectionCommands } from '../commands';
import { Tool } from '../../constants';
import type { EditorInstance } from '../../../instance/EditorInstance';

function editor(activeTool: Tool, chain = false) {
  const state = {
    activeTool,
    setTool: vi.fn((tool: Tool) => {
      state.activeTool = tool;
    })
  };
  const addWallManager = {
    previousNode: chain ? {} : undefined,
    unset: vi.fn(() => {
      addWallManager.previousNode = undefined;
    })
  };
  const inst = {
    editor: { getState: () => state },
    addWallManager,
    notifier: { clear: vi.fn() }
  } as unknown as EditorInstance;
  return { state, addWallManager, commands: createSelectionCommands(inst) };
}

// Re-sweep 2 2026-09-30: Esc left the window, door or wall tool on, so the
// Add button stayed lit until another tool was clicked.
describe('Esc ends drawing', () => {
  it.each([Tool.WallAdd, Tool.FurnitureAddWindow, Tool.FurnitureAddDoor])(
    'puts the Add menu tool %s down for the Select tool',
    (tool) => {
      const { state, commands } = editor(tool);
      expect(commands.endDrawing()).toBe(true);
      expect(state.activeTool).toBe(Tool.Edit);
    }
  );

  it('ends the wall chain being drawn as well', () => {
    const { state, addWallManager, commands } = editor(Tool.WallAdd, true);
    expect(commands.endDrawing()).toBe(true);
    expect(addWallManager.unset).toHaveBeenCalled();
    expect(state.activeTool).toBe(Tool.Edit);
  });

  // Re-sweep 3 2026-09-30: the Measure tool stayed pressed after Esc.
  it('puts the Measure tool down for the Select tool', () => {
    const { state, commands } = editor(Tool.Measure);
    expect(commands.endDrawing()).toBe(true);
    expect(state.activeTool).toBe(Tool.Edit);
  });

  it.each([Tool.View, Tool.Edit, Tool.Remove])(
    'leaves tool %s on, and says there was nothing to end',
    (tool) => {
      const { state, commands } = editor(tool);
      expect(commands.endDrawing()).toBe(false);
      expect(state.setTool).not.toHaveBeenCalled();
    }
  );
});
