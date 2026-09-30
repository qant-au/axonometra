import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Tool } from '../../editor/editor/constants';

import type { EditorInstance } from '../../editor/instance/EditorInstance';
import { createEditorStore, ToolMode } from '../EditorStore';

// setTool calls the editor's AddWallManager.resetTools() — a stub stands in
// so the store tests don't depend on the Pixi side.
const resetTools = vi.fn();
const useStore = createEditorStore({
  addWallManager: { resetTools }
} as unknown as EditorInstance);

const initial = useStore.getState();

describe('EditorStore', () => {
  beforeEach(() => {
    useStore.setState(initial);
    resetTools.mockClear();
  });

  it('starts in FurnitureMode with snap on and View tool', () => {
    const s = useStore.getState();
    expect(s.mode).toBe(ToolMode.FurnitureMode);
    expect(s.activeTool).toBe(Tool.View);
    expect(s.snap).toBe(true);
  });

  it('setMode updates the mode', () => {
    useStore.getState().setMode(ToolMode.WallMode);
    expect(useStore.getState().mode).toBe(ToolMode.WallMode);
  });

  it('setTool updates activeTool and resets AddWallManager', () => {
    useStore.getState().setTool(Tool.Edit);
    expect(useStore.getState().activeTool).toBe(Tool.Edit);
    expect(resetTools).toHaveBeenCalledOnce();
  });

  it('setSnap toggles snap', () => {
    useStore.getState().setSnap(false);
    expect(useStore.getState().snap).toBe(false);
    useStore.getState().setSnap(true);
    expect(useStore.getState().snap).toBe(true);
  });

  it('repeated setMode is idempotent', () => {
    useStore.getState().setMode(ToolMode.ViewMode);
    useStore.getState().setMode(ToolMode.ViewMode);
    expect(useStore.getState().mode).toBe(ToolMode.ViewMode);
  });
});
