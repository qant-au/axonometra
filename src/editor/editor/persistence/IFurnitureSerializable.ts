import type { Facing, MountFrom } from '../../../core';

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
  /** What mountM is measured from ('ceiling': the gap above the item's top); absent is the floor. */
  mountFrom?: MountFrom;
  /** Which way the item is installed; absent is the element's way. */
  facing?: Facing;
  /** 'surface': the id of the item this one stands on, on the same floor. */
  mountOn?: number;
}
