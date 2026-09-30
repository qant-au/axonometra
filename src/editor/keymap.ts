// Axonometra's keys: the shared keymap from @accurona/core (Accurona's
// docs/keymap.md), and what each action does here. The `?` dialog, the
// toolbar tooltips and this handler all read the same table.
import { createElement } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { keymapFor, resolveAction } from '../vendor/accurona-core';
import { clearNotifications } from '../vendor/accurona-ui';
import type { EditorInstance } from './instance/EditorInstance';
import { Tool } from './editor/constants';
import { NUDGE_STEP, NUDGE_STEP_LARGE } from './editor/selection/commands';

/**
 * Rows the spec marks "where built" that Axonometra has not built stay
 * unbound: keep tool (tools already stay on), grouping, draw order, align
 * and lock.
 */
export const KEYMAP = keymapFor('axonometra', {
  omit: [
    'keep-tool',
    'group',
    'ungroup',
    'bring-forward',
    'send-backward',
    'bring-to-front',
    'send-to-back',
    'align-left',
    'align-right',
    'align-top',
    'align-bottom',
    'lock'
  ]
});

export const TOOL_FOR_ACTION: Readonly<Record<string, Tool>> = {
  select: Tool.Edit,
  hand: Tool.View,
  eraser: Tool.Remove,
  wall: Tool.WallAdd,
  window: Tool.FurnitureAddWindow,
  door: Tool.FurnitureAddDoor,
  measure: Tool.Measure
};

const ZOOM_STEP = 1.25;

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
};

export interface KeymapContext {
  readonly: boolean;
  /** Ctrl/Cmd + Enter with the keyboard cursor in use: the wall under it. */
  editLengthAtCursor: () => boolean;
}

/** One editor's key handling. */
export function createKeymap(inst: EditorInstance) {
  function selectedWall() {
    const { refs } = inst.selection.getState();
    const only = refs.length === 1 ? refs[0] : undefined;
    if (only?.kind !== 'wall') return undefined;
    return inst.plan.getState().getWallNodeSeq().getWall(only.left, only.right);
  }

  function save() {
    localStorage.setItem('autosave', inst.serializer.sceneText());
    inst.notify({
      message: 'Saved to Local Storage!',
      severity: 'success',
      icon: createElement(IconDeviceFloppy)
    });
  }

  /** Runs an action. Returns true when it was used, so the key is consumed. */
  function runAction(
    action: string,
    e: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
    ctx: KeymapContext
  ): boolean {
    const editor = inst.editor.getState();
    const tool = TOOL_FOR_ACTION[action];
    if (tool !== undefined) {
      // A read-only embed has one tool, the hand; the Select tool would let
      // the plan be dragged about.
      if (ctx.readonly) return false;
      clearNotifications();
      editor.setTool(tool);
      return true;
    }
    switch (action) {
      case 'help':
        editor.setShortcutsOpen(!editor.shortcutsOpen);
        return true;
      case 'find':
        editor.setFindOpen(true);
        return true;
      case 'toggle-theme':
        editor.toggleTheme();
        return true;
      case 'zoom-in':
        inst.commands.zoomBy(ZOOM_STEP);
        return true;
      case 'zoom-out':
        inst.commands.zoomBy(1 / ZOOM_STEP);
        return true;
      case 'zoom-reset':
        inst.commands.resetZoom();
        return true;
      case 'fit-all':
        inst.commands.fitAll();
        return true;
      case 'fit-selection':
        inst.commands.fitSelection();
        return true;
      case 'escape': {
        inst.contextMenu.getState().close();
        if (inst.addWallManager.previousNode) {
          inst.addWallManager.unset();
          return true;
        }
        const had = inst.selection.getState().refs.length > 0;
        inst.selection.getState().clear();
        return had;
      }
      case 'undo':
        if (inst.edits.undo()) inst.commands.pruneSelection();
        return true;
      case 'redo':
        if (inst.edits.redo()) inst.commands.pruneSelection();
        return true;
      case 'save':
        save();
        return true;
      case 'select-all':
        if (ctx.readonly) return false;
        inst.commands.selectAll();
        return true;
      case 'delete':
        return inst.commands.deleteSelection();
      case 'copy':
        return inst.commands.copySelection();
      case 'cut':
        return inst.commands.cutSelection();
      case 'paste':
        return inst.commands.paste();
      case 'duplicate':
        // Taken from the browser (Ctrl+D bookmarks the page) even when nothing
        // is selected.
        inst.commands.duplicateSelection();
        return true;
      case 'nudge': {
        const [x, y] = ARROWS[e.key] ?? [0, 0];
        const step = e.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP;
        return inst.commands.nudgeSelection(x * step, y * step);
      }
      case 'edit':
      case 'edit-geometry': {
        // A wall's length is both its property and its geometry.
        if (action === 'edit-geometry' && ctx.editLengthAtCursor()) return true;
        const wall = selectedWall();
        if (!wall) return false;
        editor.setLengthEditWall(wall);
        return true;
      }
      default:
        return false;
    }
  }

  // A modal dialog or an open menu (MUI renders both as a Modal). The help
  // panel is not modal and does not count.
  const modalOpen = () => document.querySelector('.MuiModal-root') !== null;

  /** The document keydown handler. */
  function handleKeydown(e: KeyboardEvent, ctx: KeymapContext) {
    // The keyboard cursor, on the focused canvas, had the key first.
    if (e.defaultPrevented) return;
    const action = resolveAction(e, KEYMAP, { readOnly: ctx.readonly });
    if (action === null) return;
    // With a dialog or menu open the plan is behind it: only ? gets through.
    if (action !== 'help' && modalOpen()) return;
    if (runAction(action, e, ctx)) e.preventDefault();
  }

  return { runAction, handleKeydown };
}

export type Keymap = ReturnType<typeof createKeymap>;
