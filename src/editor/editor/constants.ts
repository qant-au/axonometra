// how many pixels is a meter
export const METER = 100;
export const WALL_THICKNESS = 0.2 * METER;
export const INTERIOR_WALL_THICKNESS = 0.16 * METER;

export const LABEL_OFFSET = 10;

// AddWallManager rejects new nodes within this distance of an existing node
// or the previous node in the current chain.
export const SNAP_THRESHOLD = 0.3 * METER;
// Floor.addNodeToWall rejects mid-wall splits this close to an endpoint.
export const MISCLICK_THRESHOLD = 0.2 * METER;

export const WALL_COLOR = 0x1a1a1a;
export const NODE_COLOR = 0x222222;
export const HANDLE_MOBILE_SCALE = 2.5;
export const LABEL_FONT = 'Arial';
export const LABEL_FONT_SIZE = 16;
export const LABEL_COLOR = 0x000000;

export enum Modes {
  Idle,
  Dragging,
  Editing
}

export enum Coord {
  NE,
  E,
  SE,
  S,
  C,
  Horizontal,
  Vertical
}

export enum LabelAxis {
  Horizontal,
  Vertical
}

export enum Tool {
  WallAdd,
  Edit,
  Remove,
  Measure,
  FurnitureAddWindow,
  FurnitureAddDoor,
  View
}
