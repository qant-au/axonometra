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
  /** The `?` list of keyboard shortcuts. */
  shortcutsOpen: boolean;
  /** The Find box (Ctrl/Cmd + F). */
  findOpen: boolean;
  theme: ThemeMode;
  setMode: (mode: ToolMode) => void;
  setTool: (tool: Tool) => void;
  setSnap: (snap: boolean) => void;
  setLengthEditWall: (wall: Wall | null) => void;
  setShortcutsOpen: (open: boolean) => void;
  setFindOpen: (open: boolean) => void;
  /** Alt + Shift + D. Remembered on this device. */
  toggleTheme: () => void;
}

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'axonometra-theme';

function storedTheme(): ThemeMode {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export const useStore = create<EditorStore>()((set) => ({
  mode: ToolMode.FurnitureMode,
  activeTool: Tool.View,
  snap: true,
  lengthEditWall: null,
  shortcutsOpen: false,
  findOpen: false,
  theme: storedTheme(),
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
  },
  setShortcutsOpen: (open: boolean) => {
    set(() => ({ shortcutsOpen: open }));
  },
  setFindOpen: (open: boolean) => {
    set(() => ({ findOpen: open }));
  },
  toggleTheme: () => {
    set((state) => {
      const theme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Not stored here (a private window); it still switches.
      }
      return { theme };
    });
  }
}));
