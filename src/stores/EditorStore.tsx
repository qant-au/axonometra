/** handling current tool state, mainly */
import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type {
  EditorInstance,
  ThemeMode
} from '../editor/instance/EditorInstance';
import { useInstance } from '../editor/instance/context';
import { Tool } from '../editor/editor/constants';
import type { Wall } from '../editor/editor/objects/Walls/Wall';
import { isCeilingItem, shownOn, type PlanLayer } from '../editor/planLayers';

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
  /** The items whose height and mounting are being set, if that dialog is open. */
  mountEditIds: number[] | null;
  /** The `?` list of keyboard shortcuts. */
  shortcutsOpen: boolean;
  /** The Find box (Ctrl/Cmd + F). */
  findOpen: boolean;
  /** The welcome dialog, which shows the notifications while it is open. */
  welcomeOpen: boolean;
  theme: ThemeMode;
  /** Which items the plan shows: floor, ceiling, or both. */
  planLayer: PlanLayer;
  /** Height tags beside items off the floor ('C', '+1100 mm'). */
  heightTags: boolean;
  setMode: (mode: ToolMode) => void;
  setTool: (tool: Tool) => void;
  setSnap: (snap: boolean) => void;
  setLengthEditWall: (wall: Wall | null) => void;
  setMountEditIds: (ids: number[] | null) => void;
  setShortcutsOpen: (open: boolean) => void;
  setFindOpen: (open: boolean) => void;
  setWelcomeOpen: (open: boolean) => void;
  /** Also lets go of any selected item the new layer hides. */
  setPlanLayer: (layer: PlanLayer) => void;
  setHeightTags: (on: boolean) => void;
  /** Alt + Shift + D. The host can remember it (onThemeModeChange). */
  toggleTheme: () => void;
}

export type { ThemeMode } from '../editor/instance/EditorInstance';

export function createEditorStore(inst: EditorInstance): StoreApi<EditorStore> {
  return createStore<EditorStore>()((set) => ({
    mode: ToolMode.FurnitureMode,
    activeTool: Tool.View,
    snap: true,
    lengthEditWall: null,
    mountEditIds: null,
    shortcutsOpen: false,
    findOpen: false,
    welcomeOpen: false,
    theme: inst.config.themeMode,
    planLayer: 'both',
    heightTags: false,
    setMode: (mode: ToolMode) => {
      set(() => ({
        mode: mode
      }));
    },
    setTool: (tool: Tool) => {
      set(() => ({
        activeTool: tool
      }));
      inst.addWallManager.resetTools();
    },
    setSnap: (snap: boolean) => {
      set(() => ({
        snap: snap
      }));
    },
    setLengthEditWall: (wall: Wall | null) => {
      set(() => ({ lengthEditWall: wall }));
    },
    setMountEditIds: (ids: number[] | null) => {
      set(() => ({ mountEditIds: ids }));
    },
    setShortcutsOpen: (open: boolean) => {
      set(() => ({ shortcutsOpen: open }));
    },
    setFindOpen: (open: boolean) => {
      set(() => ({ findOpen: open }));
    },
    setWelcomeOpen: (open: boolean) => {
      set(() => ({ welcomeOpen: open }));
    },
    setPlanLayer: (layer: PlanLayer) => {
      set(() => ({ planLayer: layer }));
      const selection = inst.selection.getState();
      const plan = inst.plan.getState();
      const kept = selection.refs.filter((ref) => {
        if (ref.kind !== 'furniture') return true;
        const item = plan.getObject(ref.id);
        return !item || shownOn(layer, isCeilingItem(item));
      });
      if (kept.length !== selection.refs.length) selection.set(kept);
    },
    setHeightTags: (on: boolean) => {
      set(() => ({ heightTags: on }));
    },
    toggleTheme: () => {
      set((state) => {
        const theme: ThemeMode = state.theme === 'dark' ? 'light' : 'dark';
        inst.config.onThemeModeChange?.(theme);
        return { theme };
      });
    }
  }));
}

/** The editor's tool state, read in a component. */
export function useStore<T>(selector: (state: EditorStore) => T): T {
  return useZustand(useInstance().editor, selector);
}
