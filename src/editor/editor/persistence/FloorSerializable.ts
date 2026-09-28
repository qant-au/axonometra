import { IFurnitureSerializable } from './IFurnitureSerializable';
import { INodeSerializable } from './INodeSerializable';

export class FloorSerializable {
  public furnitureArray: IFurnitureSerializable[];
  public wallNodes: INodeSerializable[];
  public wallNodeLinks: [number, number[]][];
  /** v2: exterior walls as [leftNodeId, rightNodeId]; every other wall is interior. */
  public exteriorWalls?: [number, number][];
  /** v2: wall height in metres; absent means the default (2.7 m). */
  public wallHeightM?: number;
  /** v2: floor level above ground, metres; absent means stacked at 3.0 m per storey. */
  public elevationM?: number;

  public constructor() {
    this.furnitureArray = [];
    this.wallNodes = [];
    this.wallNodeLinks = [];
  }
}
