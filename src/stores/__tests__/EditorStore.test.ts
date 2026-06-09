import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Tool } from '../../editor/editor/constants';

// setTool calls AddWallManager.Instance.resetTools() — stub that out so the
// store tests don't depend on the Pixi-side singleton.
const resetTools = vi.fn();
vi.mock('../../editor/editor/actions/AddWallManager', () => ({
  AddWallManager: { Instance: { resetTools } }
}));

const { useStore, ToolMode } = await import('../EditorStore');

const initial = useStore.getState();

describe('EditorStore', () => {
  beforeEach(() => {
    useStore.setState(initial);
    resetTools.mockClear();
  });

  it('starts in FurnitureMode on floor 0 with snap on and View tool', () => {
    const s = useStore.getState();
    expect(s.mode).toBe(ToolMode.FurnitureMode);
    expect(s.activeTool).toBe(Tool.View);
    expect(s.floor).toBe(0);
    expect(s.snap).toBe(true);
  });

  it('setMode updates the mode', () => {
    useStore.getState().setMode(ToolMode.WallMode);
    expect(useStore.getState().mode).toBe(ToolMode.WallMode);
  });

  it('setFloor updates the floor', () => {
    useStore.getState().setFloor(3);
    expect(useStore.getState().floor).toBe(3);
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
