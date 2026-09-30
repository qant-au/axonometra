import { Tool } from '../../editor/editor/constants';

/**
 * The Add menu's drawing tools. Taken from the menu or by key (L, W, D), the
 * Add button shows one is on, as View, Edit and Erase show theirs.
 */
export const ADD_TOOLS: readonly Tool[] = [
  Tool.WallAdd,
  Tool.FurnitureAddWindow,
  Tool.FurnitureAddDoor
];

/** Every tool the tool bar shows as on: its own buttons, and the Add menu's. */
export const SHOWN_TOOLS: readonly Tool[] = [
  Tool.View,
  Tool.Edit,
  Tool.Remove,
  Tool.Measure,
  ...ADD_TOOLS
];
