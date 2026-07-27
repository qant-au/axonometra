/** handling current tool state, mainly */
import { create } from 'zustand';
import { AddWallManager } from '../editor/editor/actions/AddWallManager';
import { Tool } from '../editor/editor/constants';

export enum ToolMode {
  FurnitureMode,
  WallMode,
  ViewMode
}

export interface EditorStore {
  mode: ToolMode;
  activeTool: Tool;
  snap: boolean;
  setMode: (mode: ToolMode) => void;
  setTool: (tool: Tool) => void;
  setSnap: (snap: boolean) => void;
}

export const useStore = create<EditorStore>()((set) => ({
  mode: ToolMode.FurnitureMode,
  activeTool: Tool.View,
  snap: true,
  setMode: (mode: ToolMode) => {
    set(() => ({
      mode: mode
    }));
  },
  setTool: (tool: Tool) => {
    set(() => ({
      activeTool: tool
    }));
    AddWallManager.Instance.resetTools();
  },
  setSnap: (snap: boolean) => {
    set(() => ({
      snap: snap
    }));
  }
}));
