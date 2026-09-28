export interface IFurnitureSerializable {
  id: number;
  texturePath: string;
  width: number;
  height: number;
  rotation: number;
  x: number;
  y: number;
  orientation: number;
  zIndex: number;
  attachedToLeft?: number;
  attachedToRight?: number;
  /** v2: how tall the item is, metres. For a door or window, the opening height. */
  heightM?: number;
  /** v2: height of the item's base above the floor, metres. For a window, the sill. */
  mountM?: number;
}
