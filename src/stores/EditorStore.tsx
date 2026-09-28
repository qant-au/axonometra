/** handling current tool state, mainly */
import { create } from 'zustand';
import { AddWallManager } from '../editor/editor/actions/AddWallManager';
import { Tool } from '../editor/editor/constants';
import type { Wall } from '../editor/editor/objects/Walls/Wall';

export enum ToolMode {
  FurnitureMode,
  WallMode,
  ViewMode
}

export interface EditorStore {
  mode: ToolMode;
  activeTool: Tool;
  snap: boolean;
  /** The wall whose length is being typed in, if the dialog is open. */
  lengthEditWall: Wall | null;
  setMode: (mode: ToolMode) => void;
  setTool: (tool: Tool) => void;
  setSnap: (snap: boolean) => void;
  setLengthEditWall: (wall: Wall | null) => void;
}

export const useStore = create<EditorStore>()((set) => ({
  mode: ToolMode.FurnitureMode,
  activeTool: Tool.View,
  snap: true,
  lengthEditWall: null,
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
  },
  setLengthEditWall: (wall: Wall | null) => {
    set(() => ({ lengthEditWall: wall }));
  }
}));
