// What a drawing tool says when it is picked, from the Add menu or by its
// key: one table, so a tool taken by its key explains itself as well.
import { Tool } from './editor/constants';
import type { EditorInstance } from './instance/EditorInstance';

type Hint = Parameters<EditorInstance['showToolHint']>[0];

export const TOOL_HINTS: Partial<Record<Tool, Hint>> = {
  [Tool.WallAdd]: {
    title: '✏️ Wall drawing mode',
    message: 'Click to draw walls. Double click on wall node to end sequence.',
    severity: 'info'
  },
  [Tool.FurnitureAddWindow]: {
    title: '🪟 Add window',
    message: 'Click on wall to add window',
    severity: 'info'
  },
  [Tool.FurnitureAddDoor]: {
    title: '🚪 Add door',
    message:
      'Click on wall to add door. Right-click a door and choose Turn to change its orientation',
    severity: 'info'
  }
};

/** Takes up a tool, with its hint when it has one. */
export function pickTool(inst: EditorInstance, tool: Tool) {
  inst.editor.getState().setTool(tool);
  const hint = TOOL_HINTS[tool];
  if (hint) inst.showToolHint(hint);
  else inst.notifier.clear();
}
